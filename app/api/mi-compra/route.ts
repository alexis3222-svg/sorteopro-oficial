// app/api/mi-compra/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // SERVICE ROLE, solo servidor

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const tx = searchParams.get("tx");

    if (!tx) {
        return NextResponse.json(
            { error: "Falta el parámetro tx" },
            { status: 400 }
        );
    }

    try {
        // 1) Buscar el pedido por el tx que viene de PayPhone
        const { data: pedido, error: pedidoError } = await supabase
            .from("pedidos")
            .select(
                "id, nombre, telefono, correo, estado, metodo_pago, total, created_at, payphone_client_transaction_id"
            )
            .eq("payphone_client_transaction_id", tx)
            .single();

        if (pedidoError || !pedido) {
            // <- ESTE 404 ES JSON, NO ES LA PÁGINA BLANCA DE NEXT
            return NextResponse.json(
                { error: "No se encontró la compra para este tx" },
                { status: 404 }
            );
        }

        // 2) Más adelante podemos leer los boletos desde otra tabla (tickets, numeros_asignados, etc.)
        const boletos: string[] = [];

        // 3) Respuesta para el frontend
        return NextResponse.json({
            tx,
            nombre: pedido.nombre,
            telefono: pedido.telefono,
            email: pedido.correo,
            estado: pedido.estado || "pagado",
            metodoPago: pedido.metodo_pago || "payphone",
            total: Number(pedido.total) || 0,
            fecha: pedido.created_at,
            boletos,
        });
    } catch (err: any) {
        console.error(err);
        return NextResponse.json(
            { error: "Error interno al consultar la compra" },
            { status: 500 }
        );
    }
}
