// app/api/payphone/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { asignarNumerosPorPedidoId } from "@/lib/asignarNumeros";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// No necesitas token aquí, eliminamos cualquier referencia a Confirm

async function handleWebhook(idRaw: string | null, clientTransactionIdRaw: string | null) {
    const id = Number(String(idRaw || "").trim());
    const clientTransactionId = String(clientTransactionIdRaw || "").trim();

    if (!id || Number.isNaN(id) || !clientTransactionId) {
        return NextResponse.json(
            { ok: false, error: "Faltan parámetros: id y/o clientTransactionId" },
            { status: 400 }
        );
    }

    // 1) Buscar pedido por clientTransactionId
    const { data: pedido, error: pedidoErr } = await supabaseAdmin
        .from("pedidos")
        .select("id, estado, payphone_id, payphone_client_transaction_id")
        .eq("payphone_client_transaction_id", clientTransactionId)
        .single();

    if (pedidoErr || !pedido) {
        // Si no encuentras el pedido, responde 200 para que PayPhone no reintente
        return NextResponse.json({ ok: true, ignored: true, reason: "pedido_not_found" }, { status: 200 });
    }

    // 2) Marcar pagado directamente al recibir la redirección
    if (pedido.estado !== "pagado") {
        await supabaseAdmin
            .from("pedidos")
            .update({
                estado: "pagado",
                payphone_id: id,
                aprobado_at: new Date().toISOString(),
            })
            .eq("id", pedido.id);
    }

    // 3) Asignar números (si aplica en tu flujo)
    const assigned = await asignarNumerosPorPedidoId(pedido.id);

    return NextResponse.json(
        {
            ok: true,
            status: assigned.ok
                ? assigned.alreadyAssigned
                    ? "APPROVED_ALREADY_ASSIGNED"
                    : "APPROVED_ASSIGNED"
                : "APPROVED_BUT_ASSIGN_FAILED",
            pedidoId: pedido.id,
            numeros: assigned.ok ? assigned.numeros : [],
        },
        { status: 200 }
    );
}

// PayPhone llega por GET
export async function GET(req: NextRequest) {
    const id = req.nextUrl.searchParams.get("id");
    const clientTransactionId = req.nextUrl.searchParams.get("clientTransactionId");
    return handleWebhook(id, clientTransactionId);
}

// Opcionalmente soporta POST también si lo necesitas
export async function POST(req: NextRequest) {
    const body = await req.json().catch(() => ({} as any));
    const id = String(body?.id ?? body?.payphoneId ?? "");
    const clientTransactionId = String(body?.clientTransactionId ?? body?.clientTxId ?? "");
    return handleWebhook(id, clientTransactionId);
}
