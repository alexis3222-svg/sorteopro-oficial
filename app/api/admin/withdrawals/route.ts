import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
);

export async function GET(req: NextRequest) {
    try {
        const status = req.nextUrl.searchParams.get("status") || "pending";

        const { data, error } = await supabaseAdmin
            .from("affiliate_withdrawals")
            .select("id, affiliate_id, amount, status, destination, notes, created_at")
            .eq("status", status)
            .order("created_at", { ascending: false })
            .limit(100);

        if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
        return NextResponse.json({ ok: true, withdrawals: data ?? [] });
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: e?.message || "Error interno" }, { status: 500 });
    }
}
