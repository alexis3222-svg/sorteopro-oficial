// app/api/payphone/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { asignarNumerosPorPedidoId } from "@/lib/asignarNumeros";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PayPhone primero hace GET (verificación)
export async function GET() {
    return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const payphoneId = Number(body?.id);
        const clientTxId = String(body?.clientTransactionId || "").trim();
        const status = String(body?.status || "").toLowerCase();

        if (!payphoneId || !clientTxId) {
            return NextResponse.json({ ok: false, error: "Datos incompletos" }, { status: 400 });
        }

        // Buscar pedido
        const { data: pedido, error } = await supabaseAdmin
            .from("pedidos")
            .select("id, estado")
            .eq("payphone_client_transaction_id", clientTxId)
            .single();

        if (error || !pedido) {
            return NextResponse.json({ ok: false, error: "Pedido no encontrado" }, { status: 404 });
        }

        // Solo aprobados
        if (status !== "approved" && status !== "success" && status !== "2") {
            return NextResponse.json({ ok: true, ignored: true });
        }

        // Marcar pagado
        if (pedido.estado !== "pagado") {
            await supabaseAdmin
                .from("pedidos")
                .update({
                    estado: "pagado",
                    payphone_id: payphoneId,
                })
                .eq("id", pedido.id);
        }

        // Asignar números (idempotente)
        await asignarNumerosPorPedidoId(pedido.id);

        return NextResponse.json({ ok: true });
    } catch (e: any) {
        console.error("payphone webhook error:", e);
        return NextResponse.json({ ok: false }, { status: 500 });
    }
}
