// app/api/shop/orders/[id]/payment/route.ts

import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
    params: Promise<{
        id: string;
    }>;
};

/* ============================================================
   GET
   CARGAR PEDIDO + PREPARAR clientTransactionId PAYPHONE
============================================================ */

export async function GET(
    _req: NextRequest,
    context: RouteContext
) {
    try {
        const { id } = await context.params;

        if (!id) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Pedido inválido.",
                },
                {
                    status: 400,
                }
            );
        }

        /* =====================================================
           PEDIDO
        ===================================================== */

        const {
            data: pedido,
            error: pedidoError,
        } = await supabaseAdmin
            .from("store_orders")
            .select(`
                id,
                order_number,
                subtotal,
                costo_envio,
                descuento,
                total,
                metodo_pago,
                estado,
                estado_pago,
                payphone_client_transaction_id
            `)
            .eq("id", id)
            .maybeSingle();

        if (pedidoError) {
            console.error(
                "Error consultando store_order:",
                pedidoError
            );

            throw pedidoError;
        }

        if (!pedido) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Pedido no encontrado.",
                },
                {
                    status: 404,
                }
            );
        }

        /* =====================================================
           ITEMS
        ===================================================== */

        const {
            data: items,
            error: itemsError,
        } = await supabaseAdmin
            .from("store_order_items")
            .select(`
                id,
                producto_nombre,
                producto_sku,
                producto_imagen,
                precio_unitario,
                cantidad,
                total_linea
            `)
            .eq("order_id", pedido.id)
            .order("created_at", {
                ascending: true,
            });

        if (itemsError) {
            console.error(
                "Error consultando items:",
                itemsError
            );

            throw itemsError;
        }

        /* =====================================================
           CLIENT TRANSACTION ID PAYPHONE
        ===================================================== */

        let clientTransactionId =
            pedido.payphone_client_transaction_id;

        if (
            !clientTransactionId &&
            pedido.estado_pago !== "pagado" &&
            pedido.estado !== "cancelado"
        ) {
            const randomPart = randomUUID()
                .replace(/-/g, "")
                .slice(0, 10);

            clientTransactionId =
                `SHOP-${pedido.order_number}-${randomPart}`;

            const {
                error: updateError,
            } = await supabaseAdmin
                .from("store_orders")
                .update({
                    payphone_client_transaction_id:
                        clientTransactionId,
                })
                .eq("id", pedido.id);

            if (updateError) {
                console.error(
                    "Error guardando clientTransactionId:",
                    updateError
                );

                throw updateError;
            }
        }

        return NextResponse.json({
            ok: true,

            pedido: {
                id: pedido.id,

                numero:
                    pedido.order_number,

                subtotal:
                    Number(
                        pedido.subtotal ?? 0
                    ),

                costoEnvio:
                    Number(
                        pedido.costo_envio ?? 0
                    ),

                descuento:
                    Number(
                        pedido.descuento ?? 0
                    ),

                total:
                    Number(
                        pedido.total ?? 0
                    ),

                metodoPago:
                    pedido.metodo_pago,

                estado:
                    pedido.estado,

                estadoPago:
                    pedido.estado_pago,

                clientTransactionId,
            },

            items:
                (items ?? []).map(
                    (item) => ({
                        id:
                            item.id,

                        nombre:
                            item.producto_nombre,

                        sku:
                            item.producto_sku,

                        imagen:
                            item.producto_imagen,

                        precio:
                            Number(
                                item.precio_unitario ??
                                0
                            ),

                        cantidad:
                            Number(
                                item.cantidad ??
                                0
                            ),

                        total:
                            Number(
                                item.total_linea ??
                                0
                            ),
                    })
                ),
        });
    } catch (error) {
        console.error(
            "Error cargando pago Baruk Shop:",
            error
        );

        return NextResponse.json(
            {
                ok: false,
                error:
                    "No se pudo cargar el pedido.",
            },
            {
                status: 500,
            }
        );
    }
}

/* ============================================================
   POST
   SELECCIONAR TRANSFERENCIA
============================================================ */

export async function POST(
    req: NextRequest,
    context: RouteContext
) {
    try {
        const { id } =
            await context.params;

        const body =
            await req
                .json()
                .catch(() => null);

        const metodo =
            String(
                body?.metodo ?? ""
            )
                .trim()
                .toLowerCase();

        if (!id) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Pedido inválido.",
                },
                {
                    status: 400,
                }
            );
        }

        if (
            metodo !==
            "transferencia"
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Método de pago no permitido.",
                },
                {
                    status: 400,
                }
            );
        }

        const {
            data: pedido,
            error:
            pedidoError,
        } = await supabaseAdmin
            .from(
                "store_orders"
            )
            .select(`
                id,
                estado,
                estado_pago
            `)
            .eq(
                "id",
                id
            )
            .maybeSingle();

        if (
            pedidoError ||
            !pedido
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Pedido no encontrado.",
                },
                {
                    status: 404,
                }
            );
        }

        if (
            pedido.estado_pago ===
            "pagado"
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Este pedido ya está pagado.",
                },
                {
                    status: 409,
                }
            );
        }

        if (
            pedido.estado ===
            "cancelado"
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Este pedido está cancelado.",
                },
                {
                    status: 409,
                }
            );
        }

        const {
            error: updateError,
        } = await supabaseAdmin
            .from(
                "store_orders"
            )
            .update({
                metodo_pago:
                    "transferencia",

                estado_pago:
                    "pendiente",
            })
            .eq(
                "id",
                pedido.id
            );

        if (updateError) {
            throw updateError;
        }

        return NextResponse.json({
            ok: true,
            metodoPago:
                "transferencia",
            estadoPago:
                "pendiente",
        });
    } catch (error) {
        console.error(
            "Error seleccionando transferencia:",
            error
        );

        return NextResponse.json(
            {
                ok: false,
                error:
                    "No se pudo seleccionar la transferencia.",
            },
            {
                status: 500,
            }
        );
    }
}