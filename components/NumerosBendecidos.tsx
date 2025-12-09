// app/api/admin/pedidos/marcar-pagado/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
    try {
        const { pedidoId } = await req.json();

        if (!pedidoId) {
            return NextResponse.json(
                { ok: false, error: "Falta el pedidoId" },
                { status: 400 }
            );
        }

        // 1) Obtener el pedido
        const { data: pedido, error: pedidoError } = await supabaseAdmin
            .from("pedidos")
            .select("id, sorteo_id, cantidad_numeros, estado")
            .eq("id", pedidoId)
            .single();

        if (pedidoError || !pedido) {
            console.error("Error obteniendo pedido:", pedidoError);
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

        if (!pedido.sorteo_id || !pedido.cantidad_numeros) {
            return NextResponse.json(
                { ok: false, error: "El pedido no tiene sorteo_id o cantidad_numeros" },
                { status: 400 }
            );
        }

        // 2) Verificar si YA tiene números asignados este pedido
        const { data: existentes, error: existentesError } = await supabaseAdmin
            .from("numeros_asignados")
            .select("numero")
            .eq("pedido_id", pedido.id);

        if (existentesError) {
            console.error("Error consultando numeros_asignados:", existentesError);
            return NextResponse.json(
                { ok: false, error: "Error consultando números asignados" },
                { status: 500 }
            );
        }

        const yaTieneNumeros = (existentes?.length ?? 0) > 0;
        let asignados = existentes ?? [];

        // 3) Si NO tiene números todavía → llamamos al RPC para asignarlos
        if (!yaTieneNumeros) {
            const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc(
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

            asignados = rpcData || [];
        }

        // 4) Actualizar estado del pedido a 'pagado'
        const { error: updateError } = await supabaseAdmin
            .from("pedidos")
            .update({ estado: "pagado" })
            .eq("id", pedido.id);

        if (updateError) {
            console.error("Error actualizando pedido:", updateError);
            return NextResponse.json(
                { ok: false, error: updateError.message },
                { status: 500 }
            );
        }

        return NextResponse.json({ ok: true, asignados });
    } catch (e: any) {
        console.error("Error inesperado en marcar-pagado:", e);
        return NextResponse.json(
            { ok: false, error: e?.message || "Error inesperado" },
            { status: 500 }
        );
    }
}
