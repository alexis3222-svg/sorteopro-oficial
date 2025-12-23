// app/api/admin/pedidos/cancelar/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function assertAdmin(req: NextRequest) {
    const secret = req.headers.get("x-admin-secret");
    if (!secret || secret !== process.env.ADMIN_SECRET) {
        throw new Error("UNAUTHORIZED");
    }
}

export async function POST(req: NextRequest) {
    try {
        assertAdmin(req);

        const body = await req.json().catch(() => null);
        const pedidoId = Number(body?.pedidoId);
        const nuevoEstado = String(body?.nuevoEstado || "").toLowerCase();

        if (!pedidoId || Number.isNaN(pedidoId)) {
            return NextResponse.json({ ok: false, error: "Falta el pedidoId" }, { status: 400 });
        }

        if (nuevoEstado !== "pendiente" && nuevoEstado !== "cancelado") {
            return NextResponse.json({ ok: false, error: "Estado no permitido" }, { status: 400 });
        }

        // 1) verificar que el pedido existe
        const { data: pedido, error: pedidoError } = await supabaseAdmin
            .from("pedidos")
            .select("id")
            .eq("id", pedidoId)
            .maybeSingle();

        if (pedidoError) {
            console.error("Error obteniendo pedido:", pedidoError);
            return NextResponse.json({ ok: false, error: "Error obteniendo pedido" }, { status: 500 });
        }

        if (!pedido) {
            return NextResponse.json({ ok: false, error: "Pedido no encontrado" }, { status: 404 });
        }

        // 2) liberar números (si tiene)
        const { data: liberados, error: rpcError } = await supabaseAdmin.rpc(
            "liberar_numeros_pedido",
            { p_pedido_id: pedido.id }
        );

        if (rpcError) {
            console.error("Error RPC liberar_numeros_pedido:", rpcError);
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

        // ✅ liberados puede venir como:
        // - number (cantidad liberada)
        // - array (lista de números liberados)
        // - null
        return NextResponse.json({
            ok: true,
            liberados: liberados ?? 0,
        });
    } catch (e: any) {
        const msg = String(e?.message || e);

        if (msg === "UNAUTHORIZED") {
            return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
        }

        console.error("ADMIN cancelar error:", e);
        return NextResponse.json(
            { ok: false, error: msg || "Error interno" },
            { status: 500 }
        );
    }
}
