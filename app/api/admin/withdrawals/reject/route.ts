import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
);

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => null);
        const withdrawalId = (body?.withdrawal_id ?? "").toString();
        const adminId = (body?.admin_id ?? "").toString();
        const note = (body?.note ?? "").toString().trim() || null;

        if (!withdrawalId) return NextResponse.json({ ok: false, error: "Falta withdrawal_id" }, { status: 400 });
        if (!adminId) return NextResponse.json({ ok: false, error: "Falta admin_id" }, { status: 400 });

        const { error } = await supabaseAdmin.rpc("admin_reject_withdrawal", {
            p_withdrawal_id: withdrawalId,
            p_admin_id: adminId,
            p_note: note,
        });

        if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
        return NextResponse.json({ ok: true });
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: e?.message || "Error interno" }, { status: 500 });
    }
}
