// app/api/admin/shop/orders/route.ts

import {
    NextResponse,
} from "next/server";

import {
    supabaseAdmin,
} from "@/lib/supabaseAdmin";

import {
    requireAdminSession,
} from "@/lib/requireAdminSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const autorizado =
            await requireAdminSession();

        if (!autorizado) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "No autorizado.",
                },
                {
                    status: 401,
                }
            );
        }

        /* =====================================================
           PEDIDOS
        ===================================================== */

        const {
            data: pedidos,
            error: pedidosError,
        } = await supabaseAdmin
            .from("store_orders")
            .select(`
                id,
                order_number,
                cliente_nombre,
                cliente_email,
                cliente_telefono,
                identificacion,
                tipo_entrega,
                provincia,
                ciudad,
                direccion,
                referencia,
                subtotal,
                costo_envio,
                descuento,
                total,
                metodo_pago,
                estado_pago,
                estado,
                notas_cliente,
                notas_admin,
                pagado_at,
                confirmado_at,
                enviado_at,
                entregado_at,
                created_at,
                updated_at
            `)
            .order(
                "created_at",
                {
                    ascending: false,
                }
            )
            .limit(200);

        if (pedidosError) {
            throw pedidosError;
        }

        const ids =
            (pedidos ?? []).map(
                (pedido) =>
                    pedido.id
            );

        /* =====================================================
           ITEMS
        ===================================================== */

        let items: any[] = [];

        if (ids.length > 0) {
            const {
                data,
                error,
            } = await supabaseAdmin
                .from(
                    "store_order_items"
                )
                .select(`
                    id,
                    order_id,
                    producto_nombre,
                    producto_sku,
                    producto_imagen,
                    precio_unitario,
                    cantidad,
                    total_linea
                `)
                .in(
                    "order_id",
                    ids
                )
                .order(
                    "created_at",
                    {
                        ascending: true,
                    }
                );

            if (error) {
                throw error;
            }

            items =
                data ?? [];
        }

        /* =====================================================
           AGRUPAR ITEMS
        ===================================================== */

        const itemsPorPedido =
            new Map<
                string,
                any[]
            >();

        for (
            const item of items
        ) {
            const actuales =
                itemsPorPedido.get(
                    item.order_id
                ) ?? [];

            actuales.push({
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
            });

            itemsPorPedido.set(
                item.order_id,
                actuales
            );
        }

        const resultado =
            (pedidos ?? []).map(
                (pedido) => ({
                    id:
                        pedido.id,

                    numero:
                        pedido.order_number,

                    cliente: {
                        nombre:
                            pedido.cliente_nombre,

                        email:
                            pedido.cliente_email,

                        telefono:
                            pedido.cliente_telefono,

                        identificacion:
                            pedido.identificacion,
                    },

                    entrega: {
                        tipo:
                            pedido.tipo_entrega,

                        provincia:
                            pedido.provincia,

                        ciudad:
                            pedido.ciudad,

                        direccion:
                            pedido.direccion,

                        referencia:
                            pedido.referencia,
                    },

                    subtotal:
                        Number(
                            pedido.subtotal ??
                            0
                        ),

                    costoEnvio:
                        Number(
                            pedido.costo_envio ??
                            0
                        ),

                    descuento:
                        Number(
                            pedido.descuento ??
                            0
                        ),

                    total:
                        Number(
                            pedido.total ??
                            0
                        ),

                    metodoPago:
                        pedido.metodo_pago,

                    estadoPago:
                        pedido.estado_pago,

                    estado:
                        pedido.estado,

                    notasCliente:
                        pedido.notas_cliente,

                    notasAdmin:
                        pedido.notas_admin,

                    pagadoAt:
                        pedido.pagado_at,

                    confirmadoAt:
                        pedido.confirmado_at,

                    enviadoAt:
                        pedido.enviado_at,

                    entregadoAt:
                        pedido.entregado_at,

                    createdAt:
                        pedido.created_at,

                    updatedAt:
                        pedido.updated_at,

                    items:
                        itemsPorPedido.get(
                            pedido.id
                        ) ?? [],
                })
            );

        return NextResponse.json({
            ok: true,
            pedidos:
                resultado,
        });
    } catch (error) {
        console.error(
            "Error cargando pedidos Baruk Shop:",
            error
        );

        return NextResponse.json(
            {
                ok: false,
                error:
                    "No se pudieron cargar los pedidos.",
            },
            {
                status: 500,
            }
        );
    }
}