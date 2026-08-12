// app/api/admin/shop/orders/[id]/route.ts

import {
    NextRequest,
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

type RouteContext = {
    params: Promise<{
        id: string;
    }>;
};

type Accion =
    | "confirmar_transferencia"
    | "preparando"
    | "enviado"
    | "entregado"
    | "cancelar";

export async function PATCH(
    req: NextRequest,
    context: RouteContext
) {
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

        const {
            id,
        } =
            await context.params;

        const body =
            await req
                .json()
                .catch(
                    () => null
                );

        const accion =
            String(
                body?.accion ?? ""
            ).trim() as Accion;

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
            ![
                "confirmar_transferencia",
                "preparando",
                "enviado",
                "entregado",
                "cancelar",
            ].includes(
                accion
            )
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Acción no permitida.",
                },
                {
                    status: 400,
                }
            );
        }

        /* =====================================================
           PEDIDO ACTUAL
        ===================================================== */

        const {
            data: pedido,
            error: pedidoError,
        } = await supabaseAdmin
            .from("store_orders")
            .select(`
                id,
                order_number,
                metodo_pago,
                estado_pago,
                estado
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

        /* =====================================================
           CONFIRMAR TRANSFERENCIA
        ===================================================== */

        if (
            accion ===
            "confirmar_transferencia"
        ) {
            if (
                pedido.metodo_pago !==
                "transferencia"
            ) {
                return NextResponse.json(
                    {
                        ok: false,
                        error:
                            "Este pedido no utiliza transferencia.",
                    },
                    {
                        status: 409,
                    }
                );
            }

            if (
                pedido.estado_pago ===
                "pagado"
            ) {
                return NextResponse.json({
                    ok: true,
                    message:
                        "El pedido ya estaba pagado.",
                });
            }

            if (
                pedido.estado ===
                "cancelado"
            ) {
                return NextResponse.json(
                    {
                        ok: false,
                        error:
                            "No puedes confirmar un pedido cancelado.",
                    },
                    {
                        status: 409,
                    }
                );
            }

            /*
             * Esta función:
             *
             * - verifica stock
             * - descuenta stock
             * - estado_pago = pagado
             * - estado = confirmado
             */

            const {
                data,
                error,
            } =
                await supabaseAdmin.rpc(
                    "finalizar_store_order_pagado",
                    {
                        p_order_id:
                            pedido.id,

                        p_metodo_pago:
                            "transferencia",

                        p_payphone_transaction_id:
                            null,
                    }
                );

            if (error) {
                console.error(
                    "Error confirmando transferencia:",
                    error
                );

                return NextResponse.json(
                    {
                        ok: false,
                        error:
                            error.message ||
                            "No se pudo confirmar el pago.",
                    },
                    {
                        status: 409,
                    }
                );
            }

            return NextResponse.json({
                ok: true,

                message:
                    "Transferencia confirmada.",

                result:
                    data,
            });
        }

        /* =====================================================
           CANCELAR
        ===================================================== */

        if (
            accion ===
            "cancelar"
        ) {
            /*
             * Para evitar devoluciones
             * complejas en el MVP,
             * no permitimos cancelar
             * desde aquí un pedido pagado.
             */

            if (
                pedido.estado_pago ===
                "pagado"
            ) {
                return NextResponse.json(
                    {
                        ok: false,
                        error:
                            "Un pedido pagado no puede cancelarse desde esta pantalla.",
                    },
                    {
                        status: 409,
                    }
                );
            }

            const {
                error,
            } =
                await supabaseAdmin
                    .from(
                        "store_orders"
                    )
                    .update({
                        estado:
                            "cancelado",

                        estado_pago:
                            "cancelado",
                    })
                    .eq(
                        "id",
                        pedido.id
                    );

            if (error) {
                throw error;
            }

            return NextResponse.json({
                ok: true,
                message:
                    "Pedido cancelado.",
            });
        }

        /* =====================================================
           LOS SIGUIENTES ESTADOS
           EXIGEN PAGO CONFIRMADO
        ===================================================== */

        if (
            pedido.estado_pago !==
            "pagado"
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Primero debes confirmar el pago del pedido.",
                },
                {
                    status: 409,
                }
            );
        }

        /* =====================================================
           PREPARANDO
        ===================================================== */

        if (
            accion ===
            "preparando"
        ) {
            const {
                error,
            } =
                await supabaseAdmin
                    .from(
                        "store_orders"
                    )
                    .update({
                        estado:
                            "preparando",
                    })
                    .eq(
                        "id",
                        pedido.id
                    );

            if (error) {
                throw error;
            }

            return NextResponse.json({
                ok: true,
                message:
                    "Pedido en preparación.",
            });
        }

        /* =====================================================
           ENVIADO
        ===================================================== */

        if (
            accion ===
            "enviado"
        ) {
            const {
                error,
            } =
                await supabaseAdmin
                    .from(
                        "store_orders"
                    )
                    .update({
                        estado:
                            "enviado",

                        enviado_at:
                            new Date()
                                .toISOString(),
                    })
                    .eq(
                        "id",
                        pedido.id
                    );

            if (error) {
                throw error;
            }

            return NextResponse.json({
                ok: true,
                message:
                    "Pedido marcado como enviado.",
            });
        }

        /* =====================================================
           ENTREGADO
        ===================================================== */

        if (
            accion ===
            "entregado"
        ) {
            const {
                error,
            } =
                await supabaseAdmin
                    .from(
                        "store_orders"
                    )
                    .update({
                        estado:
                            "entregado",

                        entregado_at:
                            new Date()
                                .toISOString(),
                    })
                    .eq(
                        "id",
                        pedido.id
                    );

            if (error) {
                throw error;
            }

            return NextResponse.json({
                ok: true,
                message:
                    "Pedido entregado.",
            });
        }

        return NextResponse.json(
            {
                ok: false,
                error:
                    "Acción no procesada.",
            },
            {
                status: 400,
            }
        );
    } catch (error) {
        console.error(
            "Error actualizando pedido Baruk Shop:",
            error
        );

        return NextResponse.json(
            {
                ok: false,
                error:
                    "No se pudo actualizar el pedido.",
            },
            {
                status: 500,
            }
        );
    }
}