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

        const body = await req.json();
        const motivo = body?.motivo;

        if (!motivo || String(motivo).trim().length < 3) {
            return NextResponse.json(
                { ok: false, error: "Motivo requerido" },
                { status: 400 }
            );
        }

        const { error } = await supabaseAdmin.rpc("admin_withdrawal_reject", {
            p_withdrawal_id: withdrawalId,
            p_admin_id: null,
            p_reason: motivo,
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
