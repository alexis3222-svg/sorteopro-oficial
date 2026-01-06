import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function unauthorized() {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
}

function getAuthKey(req: NextRequest) {
    // Permitimos header o query para facilidad en herramientas internas.
    return req.headers.get("x-admin-key") || new URL(req.url).searchParams.get("key") || "";
}

function hashPassword(pw: string) {
    // ⚠️ Esto depende de tu implementación actual de /api/affiliate/login.
    // Si tu login compara con bcrypt, aquí debes usar bcrypt.
    // Como no vamos a meter librerías, lo dejo en SHA256 SOLO si tu sistema ya usa eso.
    // ✅ Si tu login ya usa bcrypt, dime y te lo dejo con bcryptjs (es una librería pequeña).
    return crypto.createHash("sha256").update(pw).digest("hex");
}

function genTempPassword() {
    // temporal: fácil de dictar por WhatsApp pero con suficiente entropía
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

        const identifier = String(body?.identifier || "").trim().toLowerCase();
        const tempPasswordRequested = String(body?.tempPassword || "").trim(); // opcional

        if (!identifier) {
            return NextResponse.json({ ok: false, error: "Falta identifier" }, { status: 400 });
        }

        // 1) encontrar afiliado
        const { data: affiliate } = await supabaseAdmin
            .from("affiliates")
            .select("id, username, email")
            .or(`username.eq.${identifier},email.eq.${identifier}`)
            .maybeSingle();

        // Respuesta constante (anti-enumeración)
        if (!affiliate?.id) {
            return NextResponse.json({ ok: true });
        }

        // 2) generar clave temporal
        const tempPassword = tempPasswordRequested || genTempPassword();

        // 3) guardar en affiliates
        // 👇 AJUSTA estos nombres según tu tabla real:
        // - password_hash (o password)
        // - must_change_password (si existe)
        const { error: upErr } = await supabaseAdmin
            .from("affiliates")
            .update({
                password_hash: hashPassword(tempPassword),

            })
            .eq("id", affiliate.id);

        if (upErr) {
            // no filtramos detalles
            return NextResponse.json({ ok: false, error: "No se pudo actualizar" }, { status: 500 });
        }

        // 4) marcar resets como "used" para higiene (opcional)
        await supabaseAdmin
            .from("affiliate_password_resets")
            .update({ status: "used" })
            .eq("affiliate_id", affiliate.id)
            .eq("status", "requested");

        // 5) devolver la clave temporal al admin
        return NextResponse.json({
            ok: true,
            username: affiliate.username,
            tempPassword,
        });
    } catch {
        return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 });
    }
}
