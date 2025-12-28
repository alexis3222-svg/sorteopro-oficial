// app/api/affiliate/wallet/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE_NAME = "affiliate_session";

async function getAffiliateIdFromSession(): Promise<string | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const { data: session } = await supabaseAdmin
        .from("affiliate_sessions")
        .select("affiliate_id, expires_at, revoked_at")
        .eq("token", token)
        .maybeSingle();

    if (!session || session.revoked_at !== null) return null;

    const exp = new Date(session.expires_at).getTime();
    if (!exp || exp <= Date.now()) return null;

    return session.affiliate_id as string;
}

export async function GET(_req: NextRequest) {
    const affiliateId = await getAffiliateIdFromSession();
    if (!affiliateId) return NextResponse.json({ ok: false }, { status: 401 });

    // wallet
    const { data: wallet, error: wErr } = await supabaseAdmin
        .from("affiliate_wallets")
        .select("balance, updated_at")
        .eq("affiliate_id", affiliateId)
        .maybeSingle();

    if (wErr) {
        return NextResponse.json({ ok: false, error: wErr.message }, { status: 500 });
    }

    // últimos movimientos (ledger)
    const { data: moves, error: mErr } = await supabaseAdmin
        .from("affiliate_commissions")
        .select("id, pedido_id, base_total, rate, amount, created_at")
        .eq("affiliate_id", affiliateId)
        .order("created_at", { ascending: false })
        .limit(20);

    if (mErr) {
        return NextResponse.json({ ok: false, error: mErr.message }, { status: 500 });
    }

    return NextResponse.json({
        ok: true,
        wallet: {
            balance: Number(wallet?.balance ?? 0),
            updated_at: wallet?.updated_at ?? null,
        },
        movements: moves ?? [],
    });
}
