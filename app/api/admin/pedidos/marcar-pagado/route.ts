// app/api/admin/pedidos/marcar-pagado/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
    try {
        const { pedidoId } = await req.json();
        console.log("[marcar-pagado] llamado con pedidoId =", pedidoId);

        if (!pedidoId) {
            console.error("[marcar-pagado] Falta pedidoId");
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

        console.log("[marcar-pagado] pedido cargado =", pedido);

        if (pedidoError || !pedido) {
            console.error("[marcar-pagado] Pedido no encontrado:", pedidoError);
            return NextResponse.json(
                { ok: false, error: "Pedido no encontrado" },
                { status: 400 }
            );
        }

        if (pedido.estado === "pagado") {
            console.warn(
                "[marcar-pagado] Pedido ya estaba pagado, no se asignan números"
            );
            return NextResponse.json(
                { ok: false, error: "El pedido ya está pagado" },
                { status: 400 }
            );
        }

        if (!pedido.sorteo_id || !pedido.cantidad_numeros) {
            console.error("[marcar-pagado] Pedido inválido para asignar números");
            return NextResponse.json(
                {
                    ok: false,
                    error: "El pedido no tiene sorteo_id o cantidad_numeros",
                },
                { status: 400 }
            );
        }

        // 2) Verificar si YA tiene números asignados este pedido
        const { data: existentes, error: existentesError } = await supabaseAdmin
            .from("numeros_asignados")
            .select("numero")
            .eq("pedido_id", pedido.id);

        console.log(
            "[marcar-pagado] numeros existentes para pedido",
            pedido.id,
            "=>",
            existentes
        );

        if (existentesError) {
            console.error(
                "[marcar-pagado] Error consultando numeros_asignados:",
                existentesError
            );
            return NextResponse.json(
                { ok: false, error: "Error consultando números asignados" },
                { status: 500 }
            );
        }

        const yaTieneNumeros = (existentes?.length ?? 0) > 0;
        let asignados = existentes ?? [];

        // 3) Si NO tiene números todavía → llamamos al RPC para asignarlos
        if (!yaTieneNumeros) {
            console.log(
                "[marcar-pagado] NO tenía números, llamando RPC asignar_numeros_sorteo"
            );
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
                console.error(
                    "[marcar-pagado] Error asignando números (RPC):",
                    rpcError
                );
                return NextResponse.json(
                    { ok: false, error: rpcError.message },
                    { status: 400 }
                );
            }

            console.log(
                "[marcar-pagado] RPC respondió con asignados =>",
                rpcData
            );
            asignados = rpcData || [];
        } else {
            console.log(
                "[marcar-pagado] Ya tenía números, NO se llama al RPC"
            );
        }

        // 4) Actualizar estado del pedido a 'pagado'
        const { error: updateError } = await supabaseAdmin
            .from("pedidos")
            .update({ estado: "pagado" })
            .eq("id", pedido.id);

        if (updateError) {
            console.error("[marcar-pagado] Error actualizando pedido:", updateError);
            return NextResponse.json(
                { ok: false, error: updateError.message },
                { status: 500 }
            );
        }

        console.log(
            "[marcar-pagado] FIN OK para pedido",
            pedido.id,
            "asignados =>",
            asignados
        );
        return NextResponse.json({ ok: true, asignados });
    } catch (e: any) {
        console.error("Error inesperado en marcar-pagado:", e);
        return NextResponse.json(
            { ok: false, error: e?.message || "Error inesperado" },
            { status: 500 }
        );
    }
}
