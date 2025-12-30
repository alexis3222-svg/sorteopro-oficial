import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
);

// 🔓 ENDPOINT PÚBLICO (SOLO LECTURA)
export async function GET() {
    // 1️⃣ Buscar setting
    const { data, error } = await supabaseAdmin
        .from("app_settings")
        .select("value")
        .eq("key", "affiliate_registration")
        .single();

    // 2️⃣ Si no existe → registro ABIERTO por defecto
    if (error || !data?.value) {
        return NextResponse.json({
            ok: true,
            open: true,
        });
    }

    // 3️⃣ Valor real
    return NextResponse.json({
        ok: true,
        open: Boolean(data.value.open),
    });
}
