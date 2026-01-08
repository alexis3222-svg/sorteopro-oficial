import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE_NAME = "affiliate_session";
const FORCE_COOKIE = "affiliate_must_change";
const SESSION_DAYS = 30;

// Si ya tienes una función igual en tu proyecto, usa la tuya.
// Esta es estable y no depende de NextAuth.
function hashToken(token: string) {
    return crypto.createHash("sha256").update(token).digest("hex");
}

export async function POST(req: NextRequest) {
    try {
        // 1) Leer cookie de sesión
        const token = req.cookies.get(COOKIE_NAME)?.value || "";
        if (!token) {
            return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
        }

        // 2) Body
        const body = await req.json().catch(() => ({}));
        const currentPassword = String(body?.currentPassword || "");
        const newPassword = String(body?.newPassword || "");
        const confirmPassword = String(body?.confirmPassword || "");

        if (!currentPassword) {
            return NextResponse.json({ ok: false, error: "Falta contraseña actual" }, { status: 400 });
        }
        if (!newPassword || newPassword.length < 8) {
            return NextResponse.json({ ok: false, error: "La nueva contraseña debe tener mínimo 8 caracteres" }, { status: 400 });
        }
        if (newPassword !== confirmPassword) {
            return NextResponse.json({ ok: false, error: "Las contraseñas no coinciden" }, { status: 400 });
        }

        // 3) Buscar sesión en DB
        const tokenHash = hashToken(token);

        const { data: session, error: sessErr } = await supabaseAdmin
            .from("affiliate_sessions")
            .select("id, affiliate_id")
            .eq("token_hash", tokenHash)
            .maybeSingle();

        if (sessErr || !session?.affiliate_id) {
            return NextResponse.json({ ok: false, error: "Sesión inválida" }, { status: 401 });
        }

        // 4) Traer afiliado
        const { data: affiliate, error: affErr } = await supabaseAdmin
            .from("affiliates")
            .select("id, password_hash, must_change_password, is_active")
            .eq("id", session.affiliate_id)
            .maybeSingle();

        if (affErr || !affiliate?.id) {
            return NextResponse.json({ ok: false, error: "Afiliado no encontrado" }, { status: 404 });
        }
        if (affiliate.is_active === false) {
            return NextResponse.json({ ok: false, error: "Afiliado inactivo" }, { status: 403 });
        }

        // 5) Validar contraseña actual
        const ok = await bcrypt.compare(currentPassword, String(affiliate.password_hash || ""));
        if (!ok) {
            return NextResponse.json({ ok: false, error: "Contraseña actual incorrecta" }, { status: 401 });
        }

        // 6) Guardar nueva contraseña + quitar obligación
        const newHash = await bcrypt.hash(newPassword, 10);

        const { error: updErr } = await supabaseAdmin
            .from("affiliates")
            .update({ password_hash: newHash, must_change_password: false })
            .eq("id", affiliate.id);

        if (updErr) {
            return NextResponse.json({ ok: false, error: "No se pudo actualizar la contraseña" }, { status: 500 });
        }

        // 7) Responder + bajar cookie de obligación (CLAVE para Vercel)
        const res = NextResponse.json({ ok: true, redirect: "/afiliado" });

        // Dejarla en 0 (o borrarla). Yo prefiero 0 para evitar edge-cases.
        res.cookies.set({
            name: FORCE_COOKIE,
            value: "0",
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: SESSION_DAYS * 24 * 60 * 60,
        });

        return res;
    } catch {
        return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 });
    }
}
