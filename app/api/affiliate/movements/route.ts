// app/api/affiliate/movements/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
);

async function getAffiliateIdFromSession() {
    const cookieStore = await cookies();

    // Ajusta aquí si tu cookie se llama diferente
    const token =
        cookieStore.get("affiliate_session")?.value ||
        cookieStore.get("affiliate_token")?.value ||
        cookieStore.get("affiliate")?.value ||
        "";

    if (!token) return null;

    const { data, error } = await supabaseAdmin
        .from("affiliate_sessions")
        .select("affiliate_id, expires_at, revoked_at")
        .eq("token", token)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error || !data?.affiliate_id) return null;

    // Si tienes expires_at / revoked_at, validamos
    const revoked = !!data.revoked_at;
    const expired = data.expires_at ? new Date(data.expires_at) <= new Date() : false;
    if (revoked || expired) return null;

    return data.affiliate_id as string;
}

export async function GET() {
    try {
        const affiliateId = await getAffiliateIdFromSession();
        if (!affiliateId) {
            return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
        }

        const { data, error } = await supabaseAdmin
            .from("affiliate_commissions")
            .select("id, pedido_id, base_total, amount, created_at")
            .eq("affiliate_id", affiliateId)
            .order("created_at", { ascending: false })
            .limit(20);

        if (error) {
            return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ ok: true, moves: data ?? [] });
    } catch (e: any) {
        return NextResponse.json(
            { ok: false, error: e?.message || "Error interno" },
            { status: 500 }
        );
    }
}
