import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unauthorized() {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
}

function getAuthKey(req: NextRequest) {
    return (
        req.headers.get("x-admin-key") ||
        new URL(req.url).searchParams.get("key") ||
        ""
    );
}

function normalizeIdentifier(v: string) {
    return v.trim().toLowerCase();
}

function genTempPassword() {
    // fácil de dictar, pero suficientemente fuerte
    const a = Math.random().toString(36).slice(2, 6).toUpperCase();
    const b = Math.floor(1000 + Math.random() * 9000);
    return `CB-${a}${b}`; // ej: CB-Q7KD4821
}

export async function POST(req: NextRequest) {
    const adminKey = process.env.ADMIN_API_KEY || "";
    const provided = getAuthKey(req);

    if (!adminKey || provided !== adminKey) return unauthorized();

    try {
        const body = await req.json().catch(() => null);

        const identifierRaw = String(body?.identifier || "");
        const identifier = normalizeIdentifier(identifierRaw);

        // opcional: permitir que el admin fije una clave temporal específica
        const tempPasswordRequested = String(body?.tempPassword || "").trim();

        if (!identifier) {
            return NextResponse.json({ ok: false, error: "Falta identifier" }, { status: 400 });
        }

        // 1) Buscar afiliado (por username o email)
        const { data: affiliate } = await supabaseAdmin
            .from("affiliates")
            .select("id, username, email, is_active")
            .or(`username.eq.${identifier},email.eq.${identifier}`)
            .maybeSingle();

        // Anti-enumeración: si no existe, responder ok true igual
        if (!affiliate?.id) {
            return NextResponse.json({ ok: true });
        }

        // (Opcional) si quieres respetar is_active
        if (affiliate.is_active === false) {
            // No revelamos nada específico
            return NextResponse.json({ ok: true });
        }

        // 2) Generar password temporal + bcrypt hash
        const tempPassword = tempPasswordRequested || genTempPassword();
        const passwordHash = await bcrypt.hash(tempPassword, 10);

        // 3) Actualizar password_hash
        // Si NO tienes columna must_change_password, deja solo password_hash.
        const { error: upErr } = await supabaseAdmin
            .from("affiliates")
            .update({
                password_hash: passwordHash,
                // must_change_password: true, // ✅ solo si existe en tu tabla
            })
            .eq("id", affiliate.id);

        if (upErr) {
            return NextResponse.json({ ok: false, error: "No se pudo actualizar" }, { status: 500 });
        }

        // 4) (Opcional) Marcar requests previos como used para higiene
        await supabaseAdmin
            .from("affiliate_password_resets")
            .update({ status: "used" })
            .eq("affiliate_id", affiliate.id)
            .eq("status", "requested");

        // 5) Devolver la clave temporal AL ADMIN (no al usuario)
        return NextResponse.json({
            ok: true,
            username: affiliate.username,
            tempPassword,
        });
    } catch {
        return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 });
    }
}
