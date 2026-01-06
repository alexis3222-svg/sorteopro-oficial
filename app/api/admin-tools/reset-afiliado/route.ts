import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeIdentifier(v: string) {
    return v.trim().toLowerCase();
}

function genTempPassword() {
    const a = Math.random().toString(36).slice(2, 6).toUpperCase();
    const b = Math.floor(1000 + Math.random() * 9000);
    return `CB-${a}${b}`;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => null);

        const pin = String(body?.pin || "").trim();
        const identifierRaw = String(body?.identifier || "");
        const tempPasswordRequested = String(body?.tempPassword || "").trim();

        const expectedPin = process.env.ADMIN_TOOLS_PIN || "";
        if (!expectedPin) {
            return NextResponse.json({ ok: false, error: "Falta ADMIN_TOOLS_PIN" }, { status: 500 });
        }
        if (pin !== expectedPin) {
            return NextResponse.json({ ok: false, error: "PIN inválido" }, { status: 401 });
        }

        const identifier = normalizeIdentifier(identifierRaw);
        if (!identifier) {
            return NextResponse.json({ ok: false, error: "Falta username o email" }, { status: 400 });
        }

        const { data: affiliate } = await supabaseAdmin
            .from("affiliates")
            .select("id, username, is_active")
            .or(`username.eq.${identifier},email.eq.${identifier}`)
            .maybeSingle();

        if (!affiliate?.id) {
            return NextResponse.json({ ok: false, error: "Afiliado no encontrado" }, { status: 404 });
        }
        if (affiliate.is_active === false) {
            return NextResponse.json({ ok: false, error: "Afiliado inactivo" }, { status: 400 });
        }

        const tempPassword = tempPasswordRequested || genTempPassword();
        const passwordHash = await bcrypt.hash(tempPassword, 10);

        const { error } = await supabaseAdmin
            .from("affiliates")
            .update({ password_hash: passwordHash })
            .eq("id", affiliate.id);

        if (error) {
            return NextResponse.json({ ok: false, error: "No se pudo actualizar contraseña" }, { status: 500 });
        }

        await supabaseAdmin
            .from("affiliate_password_resets")
            .update({ status: "used" })
            .eq("affiliate_id", affiliate.id)
            .eq("status", "requested");

        return NextResponse.json({
            ok: true,
            username: affiliate.username,
            tempPassword,
        });
    } catch {
        return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 });
    }
}
