// app/api/mi-cuenta/compras/route.ts

import {
    NextRequest,
    NextResponse,
} from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
    req: NextRequest
) {
    try {
        /*
         * =====================================================
         * 1. VALIDAR SESIÓN
         * =====================================================
         */

        const authorization =
            req.headers.get(
                "authorization"
            );

        if (
            !authorization ||
            !authorization.startsWith(
                "Bearer "
            )
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "No existe una sesión válida",
                },
                {
                    status: 401,
                }
            );
        }

        const accessToken =
            authorization
                .replace(
                    "Bearer ",
                    ""
                )
                .trim();

        if (!accessToken) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Token de sesión inválido",
                },
                {
                    status: 401,
                }
            );
        }

        const {
            data: userData,
            error: userError,
        } =
            await supabaseAdmin
                .auth
                .getUser(
                    accessToken
                );

        if (
            userError ||
            !userData.user
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "La sesión no es válida o ha expirado",
                },
                {
                    status: 401,
                }
            );
        }

        const user =
            userData.user;

        /*
         * =====================================================
         * 2. CONSULTAR PEDIDOS DEL COMPRADOR
         * =====================================================
         */

        const {
            data: ordersData,
            error: ordersError,
        } =
            await supabaseAdmin
                .from("pedidos")
                .select(`
                    id,
                    created_at,
                    nombre,
                    correo,
                    telefono,
                    cantidad_numeros,
                    precio_unitario,
                    total,
                    metodo_pago,
                    estado,
                    tipo_compra,
                    cards_processing_status,
                    payphone_client_transaction_id,
                    es_pedido_premio,
                    prize_generation_depth
                `)
                .eq(
                    "buyer_user_id",
                    user.id
                )
                .eq(
                    "es_pedido_premio",
                    false
                )
                .order(
                    "created_at",
                    {
                        ascending: false,
                    }
                );

        if (ordersError) {
            console.error(
                "Error consultando compras:",
                ordersError
            );

            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "No se pudieron consultar tus compras",
                },
                {
                    status: 500,
                }
            );
        }

        const orders =
            ordersData ?? [];

        /*
         * =====================================================
         * 3. CONTAR CARDS GENERADAS POR PEDIDO
         * =====================================================
         */

        const orderIds =
            orders.map(
                (order) =>
                    order.id
            );

        const cardsByOrder =
            new Map<
                number,
                {
                    total: number;
                    revealed: number;
                }
            >();

        if (
            orderIds.length >
            0
        ) {
            const {
                data: cardsData,
                error: cardsError,
            } =
                await supabaseAdmin
                    .from(
                        "baruk_cards"
                    )
                    .select(`
                        pedido_id,
                        revealed,
                        estado
                    `)
                    .in(
                        "pedido_id",
                        orderIds
                    );

            if (cardsError) {
                console.error(
                    "Error contando Cards por pedido:",
                    cardsError
                );
            } else {
                for (
                    const card
                    of cardsData ??
                    []
                ) {
                    if (
                        card.estado ===
                        "cancelled"
                    ) {
                        continue;
                    }

                    const pedidoId =
                        Number(
                            card.pedido_id
                        );

                    if (
                        !Number.isFinite(
                            pedidoId
                        )
                    ) {
                        continue;
                    }

                    const current =
                        cardsByOrder.get(
                            pedidoId
                        ) ?? {
                            total: 0,
                            revealed: 0,
                        };

                    current.total +=
                        1;

                    if (
                        card.revealed ===
                        true
                    ) {
                        current.revealed +=
                            1;
                    }

                    cardsByOrder.set(
                        pedidoId,
                        current
                    );
                }
            }
        }

        /*
         * =====================================================
         * 4. RESPUESTA SEGURA
         * =====================================================
         */

        const purchases =
            orders.map(
                (order) => {
                    const cardStats =
                        cardsByOrder.get(
                            order.id
                        ) ?? {
                            total: 0,
                            revealed: 0,
                        };

                    /*
                     * Determinar si la compra fue
                     * para el propio comprador o regalo.
                     */
                    const purchaseType =
                        order.tipo_compra ??
                        "self";

                    const isGift =
                        purchaseType ===
                        "gift";

                    return {
                        id:
                            order.id,

                        createdAt:
                            order.created_at,

                        quantity:
                            Number(
                                order.cantidad_numeros ??
                                0
                            ),

                        unitPrice:
                            Number(
                                order.precio_unitario ??
                                0
                            ),

                        total:
                            Number(
                                order.total ??
                                0
                            ),

                        paymentMethod:
                            order.metodo_pago,

                        status:
                            order.estado,

                        purchaseType,

                        cardsProcessingStatus:
                            order.cards_processing_status,

                        cards: {
                            total:
                                cardStats.total,

                            /*
                             * Si la compra fue un regalo,
                             * el comprador no puede consultar
                             * si el destinatario reveló
                             * sus tarjetas.
                             */
                            revealed:
                                isGift
                                    ? null
                                    : cardStats.revealed,

                            pending:
                                isGift
                                    ? null
                                    : Math.max(
                                        0,
                                        cardStats.total -
                                        cardStats.revealed
                                    ),
                        },

                        /*
                         * Solo lo utilizamos para mantener
                         * compatibilidad temporal con
                         * /mi-compra.
                         */
                        transactionId:
                            order.payphone_client_transaction_id ??
                            null,
                    };
                }
            );
        /*
         * =====================================================
         * 5. RESUMEN
         * =====================================================
         */

        const paid =
            purchases.filter(
                (purchase) =>
                    purchase.status ===
                    "pagado" ||
                    purchase.status ===
                    "confirmado"
            );

        const summary = {
            totalPurchases:
                purchases.length,

            paidPurchases:
                paid.length,

            totalInvested:
                paid.reduce(
                    (
                        total,
                        purchase
                    ) =>
                        total +
                        purchase.total,
                    0
                ),

            totalCardsPurchased:
                paid.reduce(
                    (
                        total,
                        purchase
                    ) =>
                        total +
                        purchase.quantity,
                    0
                ),
        };

        return NextResponse.json({
            ok: true,

            summary,

            purchases,
        });
    } catch (
    error: unknown
    ) {
        console.error(
            "mi-cuenta/compras error:",
            error
        );

        return NextResponse.json(
            {
                ok: false,

                error:
                    error instanceof
                        Error
                        ? error.message
                        : "Error interno al consultar tus compras",
            },
            {
                status: 500,
            }
        );
    }
}