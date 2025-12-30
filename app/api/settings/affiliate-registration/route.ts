// app/api/settings/affiliate-registration/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
);

export async function GET() {
    try {
        const { data, error } = await supabase
            .from("app_settings")
            .select("value")
            .eq("key", "affiliate_registration")
            .maybeSingle();

        if (error) {
            return NextResponse.json(
                { ok: false, error: error.message },
                { status: 500 }
            );
        }

        const open = Boolean((data?.value as any)?.open ?? true);

        return NextResponse.json({
            ok: true,
            open,
            value: data?.value ?? { open: true },
        });
    } catch {
        return NextResponse.json(
            { ok: false, error: "Error leyendo configuración" },
            { status: 500 }
        );
    }
}
