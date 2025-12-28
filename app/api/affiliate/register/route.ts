// app/api/affiliate/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
);

function bad(msg: string) {
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => null);

        const nombre = (body?.nombre ?? body?.nombres ?? "").toString().trim();
        const apellido = (body?.apellido ?? body?.apellidos ?? "").toString().trim();

        const email = (body?.email ?? body?.correo ?? "").toString().trim().toLowerCase();
        const username = (body?.username ?? body?.usuario ?? "").toString().trim();

        const password = (body?.password ?? "").toString();

        const whatsapp = (body?.whatsapp ?? body?.telefono ?? "").toString().trim();
        if (!whatsapp) return bad("Falta whatsapp");
        if (!/^09\d{8}$/.test(whatsapp)) return bad("WhatsApp inválido");
        if (!nombre) return bad("Falta nombre");
        if (!apellido) return bad("Falta apellido");
        if (!email) return bad("Falta email");
        if (!username) return bad("Falta username");
        if (!password) return bad("Falta password");
        if (password.length < 6) return bad("Password debe tener al menos 6 caracteres");

        const correoValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        if (!correoValido) return bad("Email inválido");

        // ✅ evitar duplicados (username o email)
        const { data: existsUser } = await supabaseAdmin
            .from("affiliates")
            .select("id")
            .eq("username", username)
            .maybeSingle();

        if (existsUser?.id) return bad("Ese usuario ya existe");

        const { data: existsEmail } = await supabaseAdmin
            .from("affiliates")
            .select("id")
            .eq("email", email)
            .maybeSingle();

        if (existsEmail?.id) return bad("Ese email ya está registrado");

        const password_hash = await bcrypt.hash(password, 10);

        // display_name: nombre + apellido
        const display_name = `${nombre} ${apellido}`.trim();

        // code: si ya tienes lógica, déjalo; aquí uno simple y estable
        const code = username; // ✅ para pruebas: ref = username

        const { data, error } = await supabaseAdmin
            .from("affiliates")
            .insert({
                username,
                display_name,
                code,
                password_hash,
                is_active: true,
                email,
            })
            .select("id, username, code")
            .single();

        if (error || !data) {
            // error de constraint u otro
            return NextResponse.json(
                { ok: false, error: error?.message || "No se pudo crear afiliado" },
                { status: 500 }
            );
        }

        return NextResponse.json({ ok: true, affiliate: data });
    } catch (e: any) {
        console.error("affiliate/register error:", e);
        return NextResponse.json(
            { ok: false, error: e?.message || "Error interno" },
            { status: 500 }
        );
    }
}
