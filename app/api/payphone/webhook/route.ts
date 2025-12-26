import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function pickParam(sp: URLSearchParams, keys: string[]) {
    for (const k of keys) {
        const v = sp.get(k);
        if (v && v.trim()) return v.trim();
    }
    return null;
}

export async function GET(req: NextRequest) {
    const sp = req.nextUrl.searchParams;

    const payphoneId = pickParam(sp, ["id", "transactionId", "payphoneId"]);
    const clientTxId = pickParam(sp, ["clientTransactionId", "clientTxId", "client_tx_id", "tx"]);

    console.log("[payphone/webhook] hit", {
        payphoneId,
        clientTxId,
        all: Object.fromEntries(sp.entries()),
    });

    // Siempre 200 para que PayPhone no reintente por error técnico
    if (!clientTxId) return NextResponse.json({ ok: true, reason: "missing clientTxId" });

    const { data: pedido, error: findErr } = await supabaseAdmin
        .from("pedidos")
        .select("id, estado, payphone_id")
        .eq("payphone_client_transaction_id", clientTxId)
        .single();

    if (findErr || !pedido) {
        console.log("[payphone/webhook] pedido not found for tx:", clientTxId);
        return NextResponse.json({ ok: true, reason: "pedido not found" });
    }

    if (pedido.estado !== "pagado") {
        const { error: updErr } = await supabaseAdmin
            .from("pedidos")
            .update({
                estado: "pagado",
                payphone_id: payphoneId ? Number(payphoneId) : pedido.payphone_id,
                aprobado_at: new Date().toISOString(),
            })
            .eq("id", pedido.id);

        if (updErr) {
            console.log("[payphone/webhook] update error:", updErr.message);
            return NextResponse.json({ ok: true, reason: "update failed" });
        }
    }

    console.log("[payphone/webhook] pedido pagado:", pedido.id);
    return NextResponse.json({ ok: true });
}
