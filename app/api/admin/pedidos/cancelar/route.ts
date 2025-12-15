import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Body = { pedidoId: number };

export async function POST(req: Request) {
    try {
        const body = (await req.json()) as Partial<Body>;
        const pedidoId = Number(body.pedidoId);

        if (!pedidoId || Number.isNaN(pedidoId)) {
            return NextResponse.json({ ok: false, error: "Falta pedidoId válido" }, { status: 400 });
        }

        // 1) Validar pedido
        const { data: pedido, error: pedidoErr } = await supabaseAdmin
            .from("pedidos")
            .select("id, estado")
            .eq("id", pedidoId)
            .single();

        if (pedidoErr || !pedido) {
            return NextResponse.json({ ok: false, error: "Pedido no encontrado" }, { status: 404 });
        }

        // 2) Marcar cancelado
        const { error: upErr } = await supabaseAdmin
            .from("pedidos")
            .update({ estado: "cancelado" })
            .eq("id", pedidoId);

        if (upErr) {
            return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });
        }

        // 3) Liberar números (BORRAR filas del pedido)
        const { error: delErr } = await supabaseAdmin
            .from("numeros_asignados")
            .delete()
            .eq("pedido_id", pedidoId);

        if (delErr) {
            return NextResponse.json({ ok: false, error: delErr.message }, { status: 500 });
        }

        return NextResponse.json({ ok: true, pedidoId });
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: e?.message ?? "Error inesperado" }, { status: 500 });
    }
}
