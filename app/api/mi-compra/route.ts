// app/api/mi-compra/route.ts

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);

        const tx = String(
            searchParams.get("tx") ?? ""
        ).trim();

        if (!tx) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Falta el identificador de compra",
                },
                { status: 400 }
            );
        }

        /*
         * 1. Buscar el pedido utilizando el
         * clientTransactionId de PayPhone.
         */
        const { data: pedido, error: pedidoError } =
            await supabaseAdmin
                .from("pedidos")
                .select(`
                    id,
                    nombre,
                    telefono,
                    correo,
                    cantidad_numeros,
                    precio_unitario,
                    total,
                    metodo_pago,
                    estado,
                    created_at,
                    actividad_numero,
                    sorteo_id,
                    payphone_client_transaction_id,
                    tipo_compra,
                    cards_processing_status
                `)
                .eq(
                    "payphone_client_transaction_id",
                    tx
                )
                .maybeSingle();

        if (pedidoError) {
            console.error(
                "mi-compra pedido error:",
                pedidoError
            );

            return NextResponse.json(
                {
                    ok: false,
                    error: "No se pudo consultar la compra",
                },
                { status: 500 }
            );
        }

        if (!pedido) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "No se encontró una compra para este identificador",
                },
                { status: 404 }
            );
        }

        /*
         * 2. Consultar las Baruk Cards creadas
         * para ese pedido.
         *
         * IMPORTANTE:
         *
         * No enviamos:
         * - numero
         * - extra_type
         * - sphere_id
         * - prize_id
         *
         * porque el usuario todavía no debe saber
         * el resultado.
         */
        const { data: cards, error: cardsError } =
            await supabaseAdmin
                .from("baruk_cards")
                .select(`
                    id,
                    revealed,
                    revealed_at,
                    estado,
                    created_at
                `)
                .eq("pedido_id", pedido.id)
                .order("created_at", {
                    ascending: true,
                });

        if (cardsError) {
            console.error(
                "mi-compra cards error:",
                cardsError
            );

            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "No se pudieron consultar las Baruk Cards",
                },
                { status: 500 }
            );
        }

        /*
         * 3. Respuesta para MiCompraClient.
         */
        return NextResponse.json({
            ok: true,

            pedido,

            cards: cards ?? [],
        });
    } catch (error: unknown) {
        console.error(
            "api/mi-compra error:",
            error
        );

        return NextResponse.json(
            {
                ok: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Error interno al consultar la compra",
            },
            { status: 500 }
        );
    }
}