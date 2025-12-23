import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => null);
        const pedidoId = Number(body?.pedidoId);

        if (!pedidoId || Number.isNaN(pedidoId)) {
            return NextResponse.json(
                { ok: false, error: "Falta pedidoId válido" },
                { status: 400 }
            );
        }

        // 1) Leer pedido para modo
        const { data: pedido, error: pedidoErr } = await supabaseAdmin
            .from("pedidos")
            .select("id, metodo_pago")
            .eq("id", pedidoId)
            .single();

        if (pedidoErr || !pedido) {
            return NextResponse.json(
                { ok: false, error: "Pedido no encontrado" },
                { status: 404 }
            );
        }

        // 2) adminId: usa el que ya tienes (sin secretos nuevos)
        //    Si luego quieres, lo cambiamos a auth real.
        const adminId = "1510ca81-fd6a-4d3a-a4c9-ef286ed58145";

        // 3) modo según método
        const metodo = (pedido.metodo_pago || "").toLowerCase();
        const modo = metodo === "transferencia" ? "transferencia_admin" : "manual_admin";

        // 4) RPC ÚNICA
        const { data, error: rpcErr } = await supabaseAdmin.rpc(
            "admin_aprobar_pedido_y_asignar",
            {
                p_pedido_id: pedidoId,
                p_admin_id: adminId,
                p_modo: modo,
            }
        );

        if (rpcErr) {
            console.error("RPC admin_aprobar_pedido_y_asignar error:", rpcErr);
            return NextResponse.json(
                { ok: false, error: rpcErr.message || "Error en RPC" },
                { status: 500 }
            );
        }

        const row = Array.isArray(data) ? data[0] : data;

        if (!row?.ok) {
            return NextResponse.json(
                { ok: false, error: "No se pudo aprobar y asignar" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            ok: true,
            pedidoId,
            alreadyAssigned: !!row.already_assigned,
            numeros: row.numeros || [],
            modo,
        });
    } catch (e: any) {
        console.error("marcar-pagado error:", e);
        return NextResponse.json(
            { ok: false, error: String(e?.message || e) || "Error interno" },
            { status: 500 }
        );
    }
}
