// app/api/admin/pedidos/marcar-pagado/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
    try {
        const { pedidoId } = await req.json();
        console.log("[marcar-pagado] llamado con pedidoId =", pedidoId);

        if (!pedidoId) {
            return NextResponse.json(
                { ok: false, error: "Falta el pedidoId" },
                { status: 400 }
            );
        }

        // 1) Traer el pedido
        const { data: pedido, error: pedidoError } = await supabaseAdmin
            .from("pedidos")
            .select("id, sorteo_id, cantidad_numeros, estado")
            .eq("id", pedidoId)
            .single();

        if (pedidoError || !pedido) {
            console.error("[marcar-pagado] Pedido no encontrado:", pedidoError);
            return NextResponse.json(
                { ok: false, error: "Pedido no encontrado" },
                { status: 400 }
            );
        }

        if (pedido.estado === "pagado") {
            // Si ya estaba pagado, no reasignamos nada
            return NextResponse.json(
                { ok: false, error: "El pedido ya está pagado" },
                { status: 400 }
            );
        }

        if (!pedido.sorteo_id || !pedido.cantidad_numeros) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "El pedido no tiene sorteo_id o cantidad_numeros",
                },
                { status: 400 }
            );
        }

        // 2) Traer el sorteo para saber hasta qué número se ha asignado
        const { data: sorteo, error: sorteoError } = await supabaseAdmin
            .from("sorteos")
            .select("id, total_numeros, ultimo_numero_asignado")
            .eq("id", pedido.sorteo_id)
            .single();

        if (sorteoError || !sorteo) {
            console.error("[marcar-pagado] Sorteo no encontrado:", sorteoError);
            return NextResponse.json(
                { ok: false, error: "Sorteo no encontrado" },
                { status: 400 }
            );
        }

        const totalNumeros: number = sorteo.total_numeros;
        const ultimo = (sorteo.ultimo_numero_asignado as number) || 0;
        const cantidad = pedido.cantidad_numeros as number;

        const inicio = ultimo + 1;
        const fin = inicio + cantidad - 1;

        // 3) Validar stock
        if (fin > totalNumeros) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "No hay suficientes números disponibles para completar este pedido.",
                },
                { status: 400 }
            );
        }

        // 4) Construir el bloque de números a asignar
        const nuevosNumeros = [];
        for (let n = inicio; n <= fin; n++) {
            nuevosNumeros.push({
                sorteo_id: pedido.sorteo_id,
                pedido_id: pedido.id,
                numero: n,
                estado: "pagado", // directo pagado
            });
        }

        // 5) BORRAR cualquier número previo de este pedido (reservado, duplicado, etc.)
        const { error: deleteError } = await supabaseAdmin
            .from("numeros_asignados")
            .delete()
            .eq("pedido_id", pedido.id);

        if (deleteError) {
            console.error(
                "[marcar-pagado] Error borrando numeros previos del pedido:",
                deleteError
            );
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        deleteError.message ||
                        "Error borrando números previos del pedido.",
                },
                { status: 500 }
            );
        }

        // 6) Insertar los nuevos números
        const { data: insertData, error: insertError } = await supabaseAdmin
            .from("numeros_asignados")
            .insert(nuevosNumeros)
            .select("numero");

        if (insertError) {
            console.error(
                "[marcar-pagado] Error insertando nuevos numeros:",
                insertError
            );
            return NextResponse.json(
                {
                    ok: false,
                    error: insertError.message || "Error asignando nuevos números.",
                },
                { status: 500 }
            );
        }

        // 7) Actualizar el sorteo con el último número asignado
        const { error: updateSorteoError } = await supabaseAdmin
            .from("sorteos")
            .update({ ultimo_numero_asignado: fin })
            .eq("id", sorteo.id);

        if (updateSorteoError) {
            console.error(
                "[marcar-pagado] Error actualizando sorteo:",
                updateSorteoError
            );
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        updateSorteoError.message ||
                        "Error actualizando datos del sorteo.",
                },
                { status: 500 }
            );
        }

        // 8) Marcar el pedido como pagado
        const { error: updatePedidoError } = await supabaseAdmin
            .from("pedidos")
            .update({ estado: "pagado" })
            .eq("id", pedido.id);

        if (updatePedidoError) {
            console.error(
                "[marcar-pagado] Error actualizando pedido:",
                updatePedidoError
            );
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        updatePedidoError.message ||
                        "Error actualizando estado del pedido.",
                },
                { status: 500 }
            );
        }

        console.log(
            "[marcar-pagado] FIN OK pedido",
            pedido.id,
            "nuevos numeros =>",
            insertData
        );

        return NextResponse.json({
            ok: true,
            asignados: insertData || [],
        });
    } catch (e: any) {
        console.error("Error inesperado en marcar-pagado:", e);
        return NextResponse.json(
            { ok: false, error: e?.message || "Error inesperado" },
            { status: 500 }
        );
    }
}
