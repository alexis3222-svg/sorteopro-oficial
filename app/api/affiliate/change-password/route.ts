import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE_NAME = "affiliate_session";

function jsonError(message = "No se pudo cambiar la contraseña", status = 400) {
    return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(req: NextRequest) {
    try {
        const token = req.cookies.get(COOKIE_NAME)?.value || "";
        if (!token) return jsonError("No autorizado", 401);

        const body = await req.json().catch(() => null);
        const currentPassword = (body?.currentPassword ?? "").toString();
        const newPassword = (body?.newPassword ?? "").toString();

        if (!currentPassword || !newPassword) {
            return jsonError("Completa todos los campos", 400);
        }

        if (newPassword.length < 8) {
            return jsonError("La nueva contraseña debe tener al menos 8 caracteres", 400);
        }

        // 1) Validar sesión
        const nowIso = new Date().toISOString();

        const { data: session } = await supabaseAdmin
            .from("affiliate_sessions")
            .select("affiliate_id, expires_at")
            .eq("token", token)
            .maybeSingle();

        if (!session?.affiliate_id) return jsonError("No autorizado", 401);
        if (session.expires_at && session.expires_at <= nowIso) return jsonError("Sesión expirada", 401);

        // 2) Obtener afiliado
        const { data: affiliate } = await supabaseAdmin
            .from("affiliates")
            .select("id, password_hash, is_active")
            .eq("id", session.affiliate_id)
            .maybeSingle();

        if (!affiliate?.id) return jsonError("No autorizado", 401);
        if (affiliate.is_active === false) return jsonError("No autorizado", 401);

        // 3) Verificar current password
        const okPass = await bcrypt.compare(currentPassword, affiliate.password_hash);
        if (!okPass) return jsonError("Contraseña actual incorrecta", 400);

        // 4) Actualizar password + quitar flag
        const newHash = await bcrypt.hash(newPassword, 10);

        const { error: upErr } = await supabaseAdmin
            .from("affiliates")
            .update({
                password_hash: newHash,
                must_change_password: false,
            })
            .eq("id", affiliate.id);

        if (upErr) return jsonError("No se pudo actualizar. Intenta de nuevo.", 500);

        return NextResponse.json({ ok: true, redirect: "/afiliado" });
    } catch {
        return jsonError("Error interno. Intenta de nuevo.", 500);
    }
}
