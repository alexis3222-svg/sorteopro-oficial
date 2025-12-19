import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { asignarNumerosPorPedido } from "@/lib/asignarNumerosPorPedido";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
);

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => null);
        const pedidoId = body?.pedidoId;

        if (!pedidoId) {
            return NextResponse.json(
                { ok: false, error: "Falta pedidoId" },
                { status: 400 }
            );
        }

        // 1) Obtener pedido
        const { data: pedido, error: pedidoErr } = await supabaseAdmin
            .from("pedidos")
            .select("id, estado, sorteo_id")
            .eq("id", pedidoId)
            .single();

        if (pedidoErr || !pedido) {
            return NextResponse.json(
                { ok: false, error: "Pedido no encontrado" },
                { status: 404 }
            );
        }

        // 2) Si ya está pagado, no hacemos nada (idempotente)
        if (pedido.estado === "pagado") {
            return NextResponse.json({
                ok: true,
                alreadyPaid: true,
            });
        }

        // 3) Marcar pedido como pagado
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

        // 4) Asignar números (lógica central)
        const result = await asignarNumerosPorPedido(pedidoId);

        if (!result.ok) {
            return NextResponse.json(
                { ok: false, error: result.error },
                { status: 500 }
            );
        }

        return NextResponse.json({
            ok: true,
            numeros: result.numeros,
        });
    } catch (e: any) {
        console.error("ADMIN marcar-pagado error:", e);
        return NextResponse.json(
            { ok: false, error: e?.message || "Error interno" },
            { status: 500 }
        );
    }
}
