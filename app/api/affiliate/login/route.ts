// app/api/affiliate/login/route.ts
import { NextResponse, type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { randomUUID, createHash } from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE_NAME = "affiliate_session";
const SESSION_DAYS = 7;

function jsonError(message = "Credenciales inválidas", status = 401) {
    // Mensaje genérico: no revela si existe el usuario
    return NextResponse.json({ ok: false, error: message }, { status });
}

function hashToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => null);

        // ✅ Acepta username o identifier (compatibilidad)
        const identifier = (body?.identifier ?? body?.username ?? "")
            .toString()
            .trim()
            .toLowerCase();

        const password = (body?.password ?? "").toString();

        if (!identifier || !password) {
            return jsonError("Credenciales inválidas", 401);
        }

        // 1) Buscar affiliate por username O email
        const { data: affiliate, error: findErr } = await supabaseAdmin
            .from("affiliates")
            .select("id, username, email, password_hash, is_active")
            .or(`username.eq.${identifier},email.eq.${identifier}`)
            .maybeSingle();

        if (findErr || !affiliate) return jsonError();
        if (affiliate.is_active === false) return jsonError();

        // 2) Verificar password
        const okPass = await bcrypt.compare(password, String(affiliate.password_hash || ""));
        if (!okPass) return jsonError();

        // 3) Crear sesión server-side
        const token = randomUUID();
        const tokenHash = hashToken(token);

        const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

        const ip =
            req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
            req.headers.get("x-real-ip") ??
            null;

        const userAgent = req.headers.get("user-agent") ?? null;

        // ✅ Guardar sesión con token_hash (consistente con layout/change-password/logout)
        const { error: insErr } = await supabaseAdmin.from("affiliate_sessions").insert({
            affiliate_id: affiliate.id,
            token_hash: tokenHash,
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

        // 4) Respuesta + cookies
        const res = NextResponse.json({ ok: true, redirect: "/afiliado" });

        // ✅ Cookie de sesión (NECESARIA)
        res.cookies.set({
            name: COOKIE_NAME, // affiliate_session
            value: token,
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: SESSION_DAYS * 24 * 60 * 60,
        });

        // ✅ Limpieza de cookie vieja (si existía)
        res.cookies.set({
            name: "affiliate_must_change",
            value: "",
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 0,
        });

        return res;
    } catch {
        return NextResponse.json(
            { ok: false, error: "Error interno. Intenta de nuevo." },
            { status: 500 }
        );
    }
}