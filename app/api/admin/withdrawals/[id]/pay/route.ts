import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const withdrawalId = params.id;

        const body = await req.json().catch(() => ({}));
        const reference = body?.reference ?? null;

        const { error } = await supabaseAdmin.rpc("admin_withdrawal_pay", {
            p_withdrawal_id: withdrawalId,
            p_admin_id: null,
            p_reference: reference,
        });

        if (error) {
            console.error(error);
            return NextResponse.json(
                { ok: false, error: error.message },
                { status: 400 }
            );
        }

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error(err);
        return NextResponse.json(
            { ok: false, error: "Error interno" },
            { status: 500 }
        );
    }
}
