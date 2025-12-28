import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
);

async function getAffiliateIdFromCookie(req: NextRequest): Promise<string | null> {
    const cookie = req.cookies.get("affiliate_session")?.value;
    if (!cookie) return null;

    const { data } = await supabaseAdmin
        .from("affiliate_sessions")
        .select("affiliate_id")
        .eq("token", cookie)
        .maybeSingle();

    return (data?.affiliate_id as string) ?? null;
}

export async function GET(req: NextRequest) {
    try {
        const affiliateId = await getAffiliateIdFromCookie(req);
        if (!affiliateId) {
            return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
        }

        const { data, error } = await supabaseAdmin
            .from("affiliate_withdrawals")
            .select("id, amount, status, destination, notes, created_at, reviewed_at, review_note")
            .eq("affiliate_id", affiliateId)
            .order("created_at", { ascending: false })
            .limit(20);

        if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
        return NextResponse.json({ ok: true, withdrawals: data ?? [] });
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: e?.message || "Error interno" }, { status: 500 });
    }
}
