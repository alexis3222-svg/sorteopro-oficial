import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    const search = req.nextUrl.searchParams;

    const payphoneId = search.get("id");
    const clientTxId = search.get("clientTransactionId");

    if (!payphoneId || !clientTxId) {
        return NextResponse.json({ ok: false }, { status: 200 });
    }

    // 1️⃣ Marcar pedido como pagado
    await supabaseAdmin
        .from("pedidos")
        .update({
            estado: "pagado",
            payphone_id: Number(payphoneId),
            aprobado_at: new Date().toISOString(),
        })
        .eq("payphone_client_transaction_id", clientTxId);

    // 2️⃣ (Opcional luego) asignar números aquí

    return NextResponse.json({ ok: true });
}
