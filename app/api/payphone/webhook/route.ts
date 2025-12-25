import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { asignarNumerosPorPedidoId } from "@/lib/asignarNumeros";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PayPhone/PaymentBox suele pegarle por GET con query params
export async function GET(req: NextRequest) {
    const id = req.nextUrl.searchParams.get("id");
    const clientTransactionId = req.nextUrl.searchParams.get("clientTransactionId");

    if (!clientTransactionId) {
        return NextResponse.json({ ok: false, error: "Falta clientTransactionId" }, { status: 400 });
    }

    // 1) Buscar pedido por clientTransactionId
    const { data: pedido, error: pedErr } = await supabaseAdmin
        .from("pedidos")
        .select("id, estado, payphone_id")
        .eq("payphone_client_transaction_id", clientTransactionId)
        .single();

    if (pedErr || !pedido) {
        return NextResponse.json({ ok: false, error: "Pedido no encontrado" }, { status: 404 });
    }

    // 2) Guardar payphone_id si vino y está vacío en BD
    const payphoneIdNum = id ? Number(id) : null;
    if (!pedido.payphone_id && payphoneIdNum && !Number.isNaN(payphoneIdNum)) {
        await supabaseAdmin.from("pedidos").update({ payphone_id: payphoneIdNum }).eq("id", pedido.id);
    }

    // 3) Marcar como pagado si aún no lo está
    if (pedido.estado !== "pagado") {
        const { error: updErr } = await supabaseAdmin
            .from("pedidos")
            .update({ estado: "pagado" })
            .eq("id", pedido.id);

        if (updErr) {
            return NextResponse.json({ ok: false, error: "No se pudo marcar como pagado" }, { status: 500 });
        }
    }

    // 4) Asignar números (idempotente si ya asignó)
    const assigned = await asignarNumerosPorPedidoId(pedido.id);

    if (!assigned.ok) {
        return NextResponse.json({ ok: false, error: assigned.error }, { status: 500 });
    }

    return NextResponse.json({ ok: true, pedidoId: pedido.id, numeros: assigned.numeros });
}

// Si PayPhone algún día manda POST, también lo aceptamos
export async function POST(req: NextRequest) {
    const body = await req.json().catch(() => ({}));
    const id = body?.id;
    const clientTransactionId = body?.clientTransactionId;

    // Reusamos la misma lógica por GET usando la URL construida
    const url = new URL(req.url);
    if (id) url.searchParams.set("id", String(id));
    if (clientTransactionId) url.searchParams.set("clientTransactionId", String(clientTransactionId));

    return GET(new NextRequest(url));
}
