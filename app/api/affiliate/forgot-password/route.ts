import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function normalizeIdentifier(v: string) {
    return v.trim().toLowerCase();
}

function generateCode() {
    // Código corto humano (WhatsApp-friendly)
    const n = Math.floor(100000 + Math.random() * 900000); // 6 dígitos
    return `CB-${n}`;
}

function hashCode(code: string) {
    return crypto.createHash("sha256").update(code).digest("hex");
}

export async function POST(req: NextRequest) {
    try {
        const { identifier } = await req.json();
        const id = typeof identifier === "string" ? normalizeIdentifier(identifier) : "";

        if (!id) {
            return NextResponse.json({
                ok: true,
                message: "Si el usuario existe, te enviaremos instrucciones.",
                code: null,
            });
        }

        // 1) Buscar afiliado por username o email
        const { data: affiliate } = await supabaseAdmin
            .from("affiliates")
            .select("id, username, email")
            .or(`username.eq.${id},email.eq.${id}`)
            .maybeSingle();

        // 2) Generar código solo si existe
        let plainCode: string | null = null;
        let codeHash: string | null = null;
        let expiresAt: string | null = null;

        if (affiliate?.id) {
            plainCode = generateCode();
            codeHash = hashCode(plainCode);

            const exp = new Date(Date.now() + 15 * 60 * 1000);
            expiresAt = exp.toISOString();
        }

        // 3) Registrar intento (exista o no)
        await supabaseAdmin.from("affiliate_password_resets").insert({
            affiliate_id: affiliate?.id ?? null,
            identifier: id,
            code_hash: codeHash,
            expires_at: expiresAt,
            ip: req.headers.get("x-forwarded-for"),
            user_agent: req.headers.get("user-agent"),
            status: "requested",
        });

        // ✅ Respuesta genérica SIEMPRE (anti-enumeración)
        return NextResponse.json({
            ok: true,
            message: "Si el usuario existe, te enviaremos instrucciones.",
            code: plainCode, // null si no existe
        });
    } catch {
        // Nunca filtrar errores
        return NextResponse.json({
            ok: true,
            message: "Si el usuario existe, te enviaremos instrucciones.",
            code: null,
        });
    }
}
