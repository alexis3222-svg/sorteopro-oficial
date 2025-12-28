import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
);

// Reusa tu misma lógica de sesión (cookie affiliate_session)
async function getAffiliateIdFromCookie(req: NextRequest): Promise<string | null> {
    const cookie = req.cookies.get("affiliate_session")?.value;
    if (!cookie) return null;

    const { data, error } = await supabaseAdmin
        .from("affiliate_sessions")
        .select("affiliate_id")
        .eq("token", cookie)
        .maybeSingle();

    if (error || !data?.affiliate_id) return null;
    return data.affiliate_id as string;
}

export async function POST(req: NextRequest) {
    try {
        const affiliateId = await getAffiliateIdFromCookie(req);
        if (!affiliateId) {
            return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
        }

        const body = await req.json().catch(() => null);
        const amount = Number(body?.amount ?? 0);
        const destination = (body?.destination ?? "").toString().trim() || null;
        const notes = (body?.notes ?? "").toString().trim() || null;

        if (!amount || amount <= 0) {
            return NextResponse.json({ ok: false, error: "Monto inválido" }, { status: 400 });
        }

        // Llama función atómica
        const { data, error } = await supabaseAdmin.rpc("affiliate_request_withdrawal", {
            p_affiliate_id: affiliateId,
            p_amount: amount,
            p_destination: destination,
            p_notes: notes,
        });

        if (error) {
            return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
        }

        return NextResponse.json({ ok: true, withdrawal_id: data });
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: e?.message || "Error interno" }, { status: 500 });
    }
}
