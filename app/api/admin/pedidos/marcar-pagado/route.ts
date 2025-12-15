import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const norm = (v: any) => String(v ?? "").trim().toLowerCase();

export async function POST(req: Request) {
    try {
        const { pedidoId } = await req.json();

        const id = Number(pedidoId);
        if (!id || Number.isNaN(id)) {
            return NextResponse.json({ ok: false, error: "Falta el pedidoId" }, { status: 400 });
        }

        // 1) Leer el pedido (y guardar estado anterior para rollback)
        const { data: pedido, error: pedidoError } = await supabaseAdmin
            .from("pedidos")
            .select("id, estado")
            .eq("id", id)
            .maybeSingle();

        if (pedidoError) {
            console.error("Error obteniendo pedido:", pedidoError);
            return NextResponse.json({ ok: false, error: "Error obteniendo el pedido" }, { status: 500 });
        }

        if (!pedido) {
            return NextResponse.json({ ok: false, error: "Pedido no encontrado" }, { status: 404 });
        }

        const estadoAnterior = norm(pedido.estado || "pendiente");

        // 2) Marcar como pagado (si no lo está ya)
        if (estadoAnterior !== "pagado") {
            const { error: updateError } = await supabaseAdmin
                .from("pedidos")
                .update({ estado: "pagado" })
                .eq("id", pedido.id);

            if (updateError) {
                console.error("Error actualizando pedido:", updateError);
                return NextResponse.json({ ok: false, error: "No se pudo marcar como pagado" }, { status: 500 });
            }
        }

        // 3) Asignar números usando la función PRO (idempotente)
        const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc(
            "asignar_numeros_pedido",
            { p_pedido_id: pedido.id }
        );

        if (rpcError) {
            console.error("Error RPC asignar_numeros_pedido:", rpcError);
            const msg = rpcError.message || "";

            // 🔁 Rollback: si el pedido NO era pagado antes y el RPC falló, devolvemos el estado anterior
            // (evita "pagado" sin números asignados)
            if (estadoAnterior !== "pagado") {
                await supabaseAdmin.from("pedidos").update({ estado: estadoAnterior }).eq("id", pedido.id);
            }

            if (msg.includes("SIN_NUMEROS_DISPONIBLES")) {
                return NextResponse.json({ ok: false, error: "No hay números disponibles" }, { status: 400 });
            }

            if (msg.includes("PEDIDO_NO_PAGADO")) {
                return NextResponse.json({ ok: false, error: "El pedido aún no está pagado en BD" }, { status: 400 });
            }

            return NextResponse.json({ ok: false, error: `RPC: ${msg}` }, { status: 500 });
        }

        const numeros: number[] = rpcData || [];
        return NextResponse.json({ ok: true, numeros });
    } catch (e: any) {
        console.error("Error inesperado en marcar-pagado:", e);
        return NextResponse.json({ ok: false, error: e?.message || "Error inesperado" }, { status: 500 });
    }
}
