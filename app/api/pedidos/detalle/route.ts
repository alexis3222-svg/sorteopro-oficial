import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
    try {
        const { tx } = await req.json();

        if (!tx) {
            return NextResponse.json(
                { ok: false, error: "Falta el código de transacción (tx)" },
                { status: 400 }
            );
        }

        const { data: pedido, error: pedidoError } = await supabaseAdmin
            .from("pedidos")
            .select(
                "id, created_at, nombre, telefono, actividad_numero, cantidad_numeros, total, estado"
            )
            .eq("client_transaction_id", tx) // <-- cámbialo si tu columna es otra
            .maybeSingle();

        if (pedidoError) {
            console.error("Error obteniendo pedido:", pedidoError);
            return NextResponse.json(
                { ok: false, error: "Error buscando el pedido" },
                { status: 500 }
            );
        }

        if (!pedido) {
            return NextResponse.json(
                { ok: false, error: "No se encontró pedido para este código" },
                { status: 404 }
            );
        }

        const { data: numsData, error: numsError } = await supabaseAdmin
            .from("numeros")
            .select("numero")
            .eq("pedido_id", pedido.id)
            .order("numero", { ascending: true });

        if (numsError) {
            console.error("Error leyendo números:", numsError);
            return NextResponse.json(
                { ok: false, error: "Error leyendo los números del pedido" },
                { status: 500 }
            );
        }

        const numeros = (numsData || []).map((n: any) => n.numero);

        return NextResponse.json({
            ok: true,
            pedido,
            numeros,
        });
    } catch (e: any) {
        console.error("Error inesperado en /api/pedidos/detalle:", e);
        return NextResponse.json(
            { ok: false, error: e?.message || "Error inesperado" },
            { status: 500 }
        );
    }
}
