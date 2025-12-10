// app/api/pedidos/asignar/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
    try {
        const { tx } = await req.json();

        if (!tx) {
            return NextResponse.json(
                { ok: false, error: "Falta el identificador de transacción (tx)" },
                { status: 400 }
            );
        }

        // 👇 Ajusta el nombre de la columna según tu tabla de pedidos
        // asumo que guardas algo como client_transaction_id
        const { data: pedido, error: pedidoError } = await supabaseAdmin
            .from("pedidos")
            .select("id, estado")
            .eq("client_transaction_id", tx) // <-- cambia si tu columna se llama distinto
            .maybeSingle();

        if (pedidoError) {
            console.error("Error buscando pedido por tx:", pedidoError);
            return NextResponse.json(
                { ok: false, error: "Error buscando el pedido por tx" },
                { status: 500 }
            );
        }

        if (!pedido) {
            return NextResponse.json(
                { ok: false, error: "No se encontró pedido para esta transacción" },
                { status: 404 }
            );
        }

        // 1) Asegurar que el pedido esté marcado como pagado
        if (pedido.estado !== "pagado") {
            const { error: updateError } = await supabaseAdmin
                .from("pedidos")
                .update({ estado: "pagado" })
                .eq("id", pedido.id);

            if (updateError) {
                console.error("Error marcando pedido como pagado:", updateError);
                return NextResponse.json(
                    { ok: false, error: "No se pudo marcar el pedido como pagado" },
                    { status: 500 }
                );
            }
        }

        // 2) Asignar números en la BD (idempotente)
        const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc(
            "asignar_numeros_pedido",
            { p_pedido_id: pedido.id }
        );

        if (rpcError) {
            console.error("Error RPC asignar_numeros_pedido:", rpcError);
            const msg = rpcError.message || "";

            if (msg.includes("SIN_NUMEROS_DISPONIBLES")) {
                return NextResponse.json(
                    { ok: false, error: "No hay números disponibles" },
                    { status: 400 }
                );
            }

            if (msg.includes("PEDIDO_NO_PAGADO")) {
                return NextResponse.json(
                    { ok: false, error: "El pedido aún no está pagado en BD" },
                    { status: 400 }
                );
            }

            return NextResponse.json(
                { ok: false, error: "Error asignando números" },
                { status: 500 }
            );
        }

        const numeros: number[] =
            (rpcData && rpcData[0]?.numeros_asignados) || [];

        return NextResponse.json({ ok: true, numeros });
    } catch (e: any) {
        console.error("Error inesperado en /api/pedidos/asignar:", e);
        return NextResponse.json(
            { ok: false, error: e?.message || "Error inesperado" },
            { status: 500 }
        );
    }
}
