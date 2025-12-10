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

        // 1) Leer el pedido
        const { data: pedido, error: pedidoError } = await supabaseAdmin
            .from("pedidos")
            .select("id, estado")
            .eq("id", pedidoId)
            .maybeSingle();

        if (pedidoError) {
            console.error("Error obteniendo pedido:", pedidoError);
            return NextResponse.json(
                { ok: false, error: "Error obteniendo el pedido" },
                { status: 500 }
            );
        }

        if (!pedido) {
            return NextResponse.json(
                { ok: false, error: "Pedido no encontrado" },
                { status: 404 }
            );
        }

        // 2) Asignar números usando la función de BD ALEATORIA
        const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc(
            "asignar_numeros_para_pedido",
            { p_pedido_id: pedido.id }
        );

        if (rpcError) {
            console.error("Error RPC asignar_numeros_para_pedido:", rpcError);
            const msg = rpcError.message || "";

            if (msg.includes("SIN_NUMEROS_DISPONIBLES")) {
                return NextResponse.json(
                    { ok: false, error: "No hay números disponibles" },
                    { status: 400 }
                );
            }

            if (msg.includes("PEDIDO_SIN_ACTIVIDAD")) {
                return NextResponse.json(
                    { ok: false, error: "El pedido no tiene actividad asociada" },
                    { status: 400 }
                );
            }

            if (msg.includes("CANTIDAD_INVALIDA")) {
                return NextResponse.json(
                    { ok: false, error: "La cantidad de números es inválida" },
                    { status: 400 }
                );
            }

            return NextResponse.json(
                { ok: false, error: `RPC: ${msg}` },
                { status: 500 }
            );
        }

        // Normalizar y tipar la respuesta
        const numerosSource = (rpcData ?? []) as any[];

        const numeros: number[] = numerosSource
            .map((n: any) => {
                if (typeof n === "number") return n;
                if (typeof n?.numero === "number") return n.numero;
                if (typeof n?.numero_asignado === "number") return n.numero_asignado;
                return NaN;
            })
            .filter((x: number) => !Number.isNaN(x));

        if (!numeros.length) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "La función de asignación no devolvió números. Verifica la lógica en la BD.",
                },
                { status: 500 }
            );
        }

        // 3) Marcar pedido como pagado (si no lo está ya)
        if (pedido.estado !== "pagado") {
            const { error: updateError } = await supabaseAdmin
                .from("pedidos")
                .update({ estado: "pagado" })
                .eq("id", pedido.id);

            if (updateError) {
                console.error("Error actualizando pedido:", updateError);
                // No rompemos la respuesta (ya tiene números), sólo avisamos
            }
        }

        return NextResponse.json({ ok: true, numeros });
    } catch (e: any) {
        console.error("Error inesperado en marcar-pagado:", e);
        return NextResponse.json(
            { ok: false, error: e?.message || "Error inesperado" },
            { status: 500 }
        );
    }
}
