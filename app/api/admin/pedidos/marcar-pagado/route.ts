// app/api/admin/pedidos/marcar-pagado/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: Request) {
    try {
        const { pedidoId } = await req.json();

        // 1) Obtener el pedido
        const { data: pedido, error: pedidoError } = await supabase
            .from("pedidos")
            .select("id, sorteo_id, cantidad_numeros, estado")
            .eq("id", pedidoId)
            .single();

        if (pedidoError || !pedido) {
            return NextResponse.json(
                { ok: false, error: "Pedido no encontrado" },
                { status: 400 }
            );
        }

        if (pedido.estado === "pagado") {
            return NextResponse.json(
                { ok: false, error: "El pedido ya está pagado" },
                { status: 400 }
            );
        }

        // 2) Llamar al RPC para asignar números con estado 'pagado'
        const { data: asignados, error: rpcError } = await supabase.rpc(
            "asignar_numeros_sorteo",
            {
                p_sorteo_id: pedido.sorteo_id,
                p_pedido_id: pedido.id,
                p_cantidad: pedido.cantidad_numeros,
                p_estado: "pagado",
            }
        );

        if (rpcError) {
            console.error("Error asignando números:", rpcError);
            return NextResponse.json(
                { ok: false, error: rpcError.message },
                { status: 400 }
            );
        }

        // 3) Actualizar estado del pedido a 'pagado'
        const { error: updateError } = await supabase
            .from("pedidos")
            .update({ estado: "pagado" })
            .eq("id", pedido.id);

        if (updateError) {
            console.error("Error actualizando pedido:", updateError);
            return NextResponse.json(
                { ok: false, error: updateError.message },
                { status: 400 }
            );
        }

        return NextResponse.json({ ok: true, asignados });
    } catch (e: any) {
        console.error(e);
        return NextResponse.json(
            { ok: false, error: e?.message || "Error inesperado" },
            { status: 500 }
        );
    }
}
