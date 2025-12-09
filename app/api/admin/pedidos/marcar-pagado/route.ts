// app/api/admin/pedidos/marcar-pagado/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { asignarNumerosPorTx } from "@/lib/asignarNumeros";

export async function POST(req: Request) {
    try {
        const { pedidoId } = await req.json();

        if (!pedidoId) {
            return NextResponse.json(
                { ok: false, error: "Falta pedidoId" },
                { status: 400 }
            );
        }

        // 1️⃣ Obtener el pedido
        const { data: pedido, error: pedidoError } = await supabaseAdmin
            .from("pedidos")
            .select("*")
            .eq("id", pedidoId)
            .single();

        if (pedidoError || !pedido) {
            return NextResponse.json(
                { ok: false, error: "Pedido no encontrado" },
                { status: 404 }
            );
        }

        // 2️⃣ PAYPHONE → asignar por tx (usa tu helper)
        if (pedido.metodo_pago === "payphone") {
            if (!pedido.payphone_client_transaction_id) {
                return NextResponse.json(
                    { ok: false, error: "El pedido PayPhone no tiene TX asociado" },
                    { status: 400 }
                );
            }

            const result = await asignarNumerosPorTx(
                pedido.payphone_client_transaction_id
            );

            if (!result.ok) {
                return NextResponse.json(
                    { ok: false, error: result.error },
                    { status: 400 }
                );
            }

            return NextResponse.json({
                ok: true,
                asignados: result.numeros,
            });
        }

        // 3️⃣ TRANSFERENCIA → asignar usando RPC directamente
        if (pedido.metodo_pago === "transferencia") {
            // Verificar si ya tiene números
            const { data: existentes, error: existErr } = await supabaseAdmin
                .from("numeros_asignados")
                .select("numero")
                .eq("pedido_id", pedido.id);

            if (existErr) {
                return NextResponse.json(
                    { ok: false, error: "Error verificando números existentes" },
                    { status: 500 }
                );
            }

            if (existentes && existentes.length > 0) {
                // Ya tenía números → solo marcar pagado
                await supabaseAdmin
                    .from("pedidos")
                    .update({ estado: "pagado" })
                    .eq("id", pedido.id);

                return NextResponse.json({
                    ok: true,
                    asignados: existentes.map((n: any) => n.numero),
                });
            }

            // Asignar por RPC
            const { data: asignados, error: rpcError } = await supabaseAdmin.rpc(
                "asignar_numeros_sorteo",
                {
                    p_sorteo_id: pedido.sorteo_id,
                    p_pedido_id: pedido.id,
                    p_cantidad: pedido.cantidad_numeros,
                    p_estado: "pagado",
                }
            );

            if (rpcError) {
                return NextResponse.json(
                    { ok: false, error: rpcError.message },
                    { status: 400 }
                );
            }

            // Marcar pedido como pagado
            await supabaseAdmin
                .from("pedidos")
                .update({ estado: "pagado" })
                .eq("id", pedido.id);

            return NextResponse.json({
                ok: true,
                asignados: asignados?.map((n: any) => n.numero) ?? [],
            });
        }

        return NextResponse.json(
            { ok: false, error: "Método de pago no soportado" },
            { status: 400 }
        );
    } catch (e: any) {
        console.error(e);
        return NextResponse.json(
            { ok: false, error: e?.message || "Error inesperado" },
            { status: 500 }
        );
    }
}
