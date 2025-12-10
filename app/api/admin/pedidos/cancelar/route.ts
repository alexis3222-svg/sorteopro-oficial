// app/api/admin/pedidos/cancelar/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
    try {
        const { pedidoId, nuevoEstado } = await req.json();

        if (!pedidoId) {
            return NextResponse.json(
                { ok: false, error: "Falta el pedidoId" },
                { status: 400 }
            );
        }

        if (nuevoEstado !== "pendiente" && nuevoEstado !== "cancelado") {
            return NextResponse.json(
                { ok: false, error: "Estado no permitido" },
                { status: 400 }
            );
        }

        // 1) verificar que el pedido existe
        const { data: pedido, error: pedidoError } = await supabaseAdmin
            .from("pedidos")
            .select("id")
            .eq("id", pedidoId)
            .maybeSingle();

        if (pedidoError) {
            console.error("Error obteniendo pedido:", pedidoError);
            return NextResponse.json(
                { ok: false, error: "Error obteniendo pedido" },
                { status: 500 }
            );
        }

        if (!pedido) {
            return NextResponse.json(
                { ok: false, error: "Pedido no encontrado" },
                { status: 404 }
            );
        }

        // 2) liberar números (si tiene)
        const { data: liberados, error: rpcError } = await supabaseAdmin.rpc(
            "liberar_numeros_pedido",
            { p_pedido_id: pedido.id }
        );

        if (rpcError) {
            console.error("Error RPC liberar_numeros_pedido:", rpcError);

            // 🔥 ahora devolvemos el mensaje REAL del RPC
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "RPC liberar_numeros_pedido: " +
                        (rpcError.message || "Error interno en la función"),
                },
                { status: 500 }
            );
        }

        // 3) actualizar estado del pedido (pendiente o cancelado)
        const { error: updateError } = await supabaseAdmin
            .from("pedidos")
            .update({ estado: nuevoEstado })
            .eq("id", pedido.id);

        if (updateError) {
            console.error("Error actualizando pedido:", updateError);
            return NextResponse.json(
                { ok: false, error: "No se pudo actualizar el estado del pedido" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            ok: true,
            liberados: liberados ?? 0,
        });
    } catch (e: any) {
        console.error("Error inesperado en cancelar:", e);
        return NextResponse.json(
            { ok: false, error: e?.message || "Error inesperado en cancelar" },
            { status: 500 }
        );
    }
}
