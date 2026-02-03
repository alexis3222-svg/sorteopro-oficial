"use server";

import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function normalizeIdentifier(v: string) {
    return v.trim().toLowerCase();
}

function genTempPassword() {
    const a = Math.random().toString(36).slice(2, 6).toUpperCase();
    const b = Math.floor(1000 + Math.random() * 9000);
    return `CB-${a}${b}`;
}

export async function resetAfiliadoAction(formData: FormData) {
    const pin = String(formData.get("pin") || "").trim();
    const identifierRaw = String(formData.get("identifier") || "");
    const tempPasswordRequested = String(formData.get("tempPassword") || "").trim();

    const expectedPin = process.env.ADMIN_TOOLS_PIN || "";
    if (!expectedPin) {
        return { ok: false, error: "Falta ADMIN_TOOLS_PIN" };
    }
    if (pin !== expectedPin) {
        return { ok: false, error: "PIN inválido" };
    }

    const identifier = normalizeIdentifier(identifierRaw);
    if (!identifier) {
        return { ok: false, error: "Falta username o email" };
    }

    const { data: affiliate } = await supabaseAdmin
        .from("affiliates")
        .select("id, username, is_active")
        .or(`username.eq.${identifier},email.eq.${identifier}`)
        .maybeSingle();

    if (!affiliate?.id) {
        return { ok: false, error: "Afiliado no encontrado" };
    }
    if (affiliate.is_active === false) {
        return { ok: false, error: "Afiliado inactivo" };
    }

    const tempPassword = tempPasswordRequested || genTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const { error } = await supabaseAdmin
        .from("affiliates")
        .update({
            password_hash: passwordHash,
            must_change_password: true, // ✅ CLAVE: obliga cambio al entrar
        })
        .eq("id", affiliate.id);

    if (error) {
        return { ok: false, error: "No se pudo actualizar contraseña" };
    }

    await supabaseAdmin
        .from("affiliate_password_resets")
        .update({ status: "used" })
        .eq("affiliate_id", affiliate.id)
        .eq("status", "requested");

    return {
        ok: true,
        username: affiliate.username,
        tempPassword,
    };
}
