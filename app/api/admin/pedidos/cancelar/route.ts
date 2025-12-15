import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type EstadoNoPagado = "pendiente" | "cancelado" | "en_proceso";

type Body = {
    pedidoId: number;
    nuevoEstado: EstadoNoPagado;
};

const allowed: EstadoNoPagado[] = ["pendiente", "cancelado", "en_proceso"];

export async function POST(req: Request) {
    try {
        const body = (await req.json()) as Partial<Body>;

        const pedidoId = Number(body.pedidoId);
        const nuevoEstado = String(body.nuevoEstado ?? "").toLowerCase() as EstadoNoPagado;

        if (!pedidoId || Number.isNaN(pedidoId)) {
            return NextResponse.json({ ok: false, error: "Falta pedidoId válido" }, { status: 400 });
        }

        if (!allowed.includes(nuevoEstado)) {
            return NextResponse.json(
                { ok: false, error: "nuevoEstado inválido (usa pendiente, en_proceso o cancelado)" },
                { status: 400 }
            );
        }

        // 1) Leer pedido actual (para rollback si algo falla)
        const { data: pedido, error: pedidoErr } = await supabaseAdmin
            .from("pedidos")
            .select("id, estado")
            .eq("id", pedidoId)
            .single();

        if (pedidoErr || !pedido) {
            return NextResponse.json({ ok: false, error: "Pedido no encontrado" }, { status: 404 });
        }

        const estadoAnterior = String(pedido.estado ?? "pendiente").toLowerCase();

        // 2) Actualizar estado (primero)
        const { error: upErr } = await supabaseAdmin
            .from("pedidos")
            .update({ estado: nuevoEstado })
            .eq("id", pedidoId);

        if (upErr) {
            return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });
        }

        // 3) Liberar números (BORRAR filas del pedido)
        //    (retornamos cuántos liberó)
        const { data: borrados, error: delErr } = await supabaseAdmin
            .from("numeros_asignados")
            .delete()
            .eq("pedido_id", pedidoId)
            .select("id");

        if (delErr) {
            // rollback del estado si falló liberar
            await supabaseAdmin.from("pedidos").update({ estado: estadoAnterior }).eq("id", pedidoId);

            return NextResponse.json(
                { ok: false, error: `No se pudieron liberar números: ${delErr.message}` },
                { status: 500 }
            );
        }

        return NextResponse.json({
            ok: true,
            pedidoId,
            nuevoEstado,
            liberados: borrados?.length ?? 0,
        });
    } catch (e: any) {
        return NextResponse.json(
            { ok: false, error: e?.message ?? "Error inesperado" },
            { status: 500 }
        );
    }
}
