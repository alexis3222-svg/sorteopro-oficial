// app/api/admin/pedidos/marcar-pagado/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    try {
        const body = await req.json().catch(() => null);
        const pedidoId = Number(body?.pedidoId);

        if (!pedidoId || Number.isNaN(pedidoId)) {
            return NextResponse.json(
                { ok: false, error: "Falta el pedidoId válido" },
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

        // 2) Si ya tiene números asignados, respondemos idempotente
        const { data: existentes, error: exErr } = await supabaseAdmin
            .from("numeros_asignados")
            .select("numero")
            .eq("pedido_id", pedido.id)
            .order("numero", { ascending: true });

        if (exErr) {
            console.error("Error consultando numeros_asignados:", exErr);
            return NextResponse.json(
                { ok: false, error: "Error consultando números existentes" },
                { status: 500 }
            );
        }

        if (existentes && existentes.length > 0) {
            return NextResponse.json({
                ok: true,
                alreadyAssigned: true,
                numeros: existentes.map((n: any) => n.numero as number),
            });
        }

        // 3) Marcar como pagado (si no lo está ya)
        if (pedido.estado !== "pagado") {
            const { error: updateError } = await supabaseAdmin
                .from("pedidos")
                .update({ estado: "pagado" })
                .eq("id", pedido.id);

            if (updateError) {
                console.error("Error actualizando pedido:", updateError);
                return NextResponse.json(
                    { ok: false, error: "No se pudo marcar como pagado" },
                    { status: 500 }
                );
            }
        }

        // 4) Asignar números usando la función PRO (idempotente)
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

            return NextResponse.json({ ok: false, error: `RPC: ${msg}` }, { status: 500 });
        }

        const numeros: number[] = (rpcData as number[]) || [];

        return NextResponse.json({
            ok: true,
            alreadyAssigned: false,
            numeros,
        });
    } catch (e: any) {
        console.error("Error inesperado en marcar-pagado:", e);
        return NextResponse.json(
            { ok: false, error: e?.message || "Error inesperado" },
            { status: 500 }
        );
    }
}
