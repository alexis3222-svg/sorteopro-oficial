import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { asignarNumerosPorPedidoId } from "@/lib/asignarNumeros";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function assertAdmin(req: NextRequest) {
    // ✅ Simple y estable: header + secret
    // En tu frontend admin, manda este header.
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

        if (!pedidoId || Number.isNaN(pedidoId)) {
            return NextResponse.json(
                { ok: false, error: "Falta pedidoId válido" },
                { status: 400 }
            );
        }

        // 1) Obtener pedido
        const { data: pedido, error: pedidoErr } = await supabaseAdmin
            .from("pedidos")
            .select("id, estado")
            .eq("id", pedidoId)
            .single();

        if (pedidoErr || !pedido) {
            return NextResponse.json(
                { ok: false, error: "Pedido no encontrado" },
                { status: 404 }
            );
        }

        // 2) Marcar como pagado (si ya lo está, seguimos igual para devolver números)
        if (pedido.estado !== "pagado") {
            const { error: updErr } = await supabaseAdmin
                .from("pedidos")
                .update({ estado: "pagado" })
                .eq("id", pedidoId);

            if (updErr) {
                return NextResponse.json(
                    { ok: false, error: updErr.message },
                    { status: 500 }
                );
            }
        }

        // 3) Asignar números (idempotente)
        const result = await asignarNumerosPorPedidoId(pedidoId);

        if (!result.ok) {
            return NextResponse.json(
                { ok: false, code: result.code, error: result.error },
                { status: 500 }
            );
        }

        return NextResponse.json({
            ok: true,
            pedidoId,
            alreadyPaid: pedido.estado === "pagado",
            alreadyAssigned: result.alreadyAssigned,
            numeros: result.numeros,
        });
    } catch (e: any) {
        const msg = String(e?.message || e);

        if (msg === "UNAUTHORIZED") {
            return NextResponse.json(
                { ok: false, error: "No autorizado" },
                { status: 401 }
            );
        }

        console.error("ADMIN marcar-pagado error:", e);
        return NextResponse.json(
            { ok: false, error: msg || "Error interno" },
            { status: 500 }
        );
    }
}
