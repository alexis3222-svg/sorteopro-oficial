import { NextResponse, type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE_NAME = "affiliate_session";
const SESSION_DAYS = 7;

function jsonError(message = "Credenciales inválidas", status = 401) {
    return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => null);

        const identifier = (body?.identifier ?? body?.username ?? "")
            .toString()
            .trim()
            .toLowerCase();

        const password = (body?.password ?? "").toString();

        if (!identifier || !password) return jsonError();

        // 1️⃣ Buscar por username o email
        const { data: affiliate } = await supabaseAdmin
            .from("affiliates")
            .select("id, password_hash, is_active")
            .or(`username.eq.${identifier},email.eq.${identifier}`)
            .maybeSingle();

        if (!affiliate || affiliate.is_active === false) return jsonError();

        // 2️⃣ Verificar contraseña (incluye temporal)
        const okPass = await bcrypt.compare(password, affiliate.password_hash);
        if (!okPass) return jsonError();

        // 3️⃣ Crear sesión
        const token = randomUUID();
        const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000);

        const { error } = await supabaseAdmin.from("affiliate_sessions").insert({
            affiliate_id: affiliate.id,
            token,
            expires_at: expiresAt.toISOString(),
            ip:
                req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
                req.headers.get("x-real-ip") ??
                null,
            user_agent: req.headers.get("user-agent"),
        });

        if (error) {
            return NextResponse.json(
                { ok: false, error: "No se pudo iniciar sesión." },
                { status: 500 }
            );
        }

        // 4️⃣ Cookie de sesión
        const res = NextResponse.json({ ok: true, redirect: "/afiliado" });

        res.cookies.set({
            name: COOKIE_NAME,
            value: token,
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: SESSION_DAYS * 86400,
        });

        // 5️⃣ Limpieza legacy
        res.cookies.set({
            name: "affiliate_must_change",
            value: "",
            path: "/",
            maxAge: 0,
        });

        return res;
    } catch {
        return NextResponse.json(
            { ok: false, error: "Error interno." },
            { status: 500 }
        );
    }
}