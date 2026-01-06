// app/api/affiliate/login/route.ts
import { NextResponse, type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE_NAME = "affiliate_session";
const SESSION_DAYS = 7;

function jsonError(message = "Credenciales inválidas", status = 401) {
    // Mensaje genérico: no revela si existe el usuario
    return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => null);
        const username = (body?.username ?? "").toString().trim();
        const password = (body?.password ?? "").toString();

        if (!username || !password) {
            return jsonError("Credenciales inválidas", 401);
        }

        // 1) Buscar affiliate por username
        const { data: affiliate, error: findErr } = await supabaseAdmin
            .from("affiliates")
            .select("id, username, password_hash, is_active, must_change_password")
            .eq("username", username)
            .maybeSingle();

        // Respuesta genérica SIEMPRE
        if (findErr || !affiliate) return jsonError();

        // 2) Validar activo
        if (affiliate.is_active === false) return jsonError();

        // 3) Verificar password
        const okPass = await bcrypt.compare(password, affiliate.password_hash);
        if (!okPass) return jsonError();

        // 4) Crear sesión server-side
        const token = randomUUID();
        const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

        const ip =
            req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
            req.headers.get("x-real-ip") ??
            null;

        const userAgent = req.headers.get("user-agent");

        const { error: insErr } = await supabaseAdmin.from("affiliate_sessions").insert({
            affiliate_id: affiliate.id,
            token,
            expires_at: expiresAt.toISOString(),
            ip,
            user_agent: userAgent,
        });

        if (insErr) {
            return NextResponse.json(
                { ok: false, error: "No se pudo iniciar sesión. Intenta de nuevo." },
                { status: 500 }
            );
        }

        // 5) Set cookie httpOnly
        if (process.env.NODE_ENV !== "production") {
            console.log("[affiliate-login] user:", affiliate.username, "must_change_password:", affiliate.must_change_password);
        }

        const redirectTo = affiliate.must_change_password ? "/afiliado/cambiar-clave" : "/afiliado";
        const res = NextResponse.json({ ok: true, redirect: redirectTo });


        res.cookies.set({
            name: COOKIE_NAME,
            value: token,
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: SESSION_DAYS * 24 * 60 * 60,
        });

        return res;
    } catch (e) {
        return NextResponse.json(
            { ok: false, error: "Error interno. Intenta de nuevo." },
            { status: 500 }
        );
    }
}
