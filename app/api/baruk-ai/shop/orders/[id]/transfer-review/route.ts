/* ============================================================
   DESTINO EN EL PROYECTO:
   C:\Users\Alexis3222\Documents\sorteopro-rediseño\
   app\api\baruk-ai\shop\orders\[id]\transfer-review\route.ts

   PROYECTO:
   sorteopro-rediseño / baruk593.com

   FUNCIÓN:
   - Endpoint privado usado por Baruk AI Sales Inbox.
   - Aprobar manualmente una transferencia bancaria.
   - Marcar "pago no encontrado" sin cancelar el pedido.
   - Reutilizar la RPC existente finalizar_store_order_pagado
     para mantener la lógica de stock y cierre del pedido.
============================================================ */

import {
    NextRequest,
    NextResponse,
} from "next/server";

import {
    supabaseAdmin,
} from "@/lib/supabaseAdmin";


export const runtime =
    "nodejs";

export const dynamic =
    "force-dynamic";


type RouteContext = {
    params:
    Promise<{
        id:
        string;
    }>;
};


// =========================================================
// AUTORIZACIÓN INTERNA
// =========================================================

function isAuthorized(
    request:
        NextRequest
): boolean {

    const expectedSecret =
        process.env
            .BARUK_AI_INTERNAL_SECRET;


    if (
        !expectedSecret
    ) {

        throw new Error(
            "BARUK_AI_INTERNAL_SECRET no está configurada"
        );
    }


    const authorization =
        request.headers.get(
            "authorization"
        );


    return authorization ===
        `Bearer ${expectedSecret}`;
}


// =========================================================
// NOTA ADMINISTRATIVA
// =========================================================

function appendAdminNote(
    current:
        | string
        | null
        | undefined,
    note:
        string
): string {

    const cleanCurrent =
        typeof current ===
            "string"
            ? current.trim()
            : "";


    if (
        !cleanCurrent
    ) {

        return note;
    }


    return `${cleanCurrent}\n${note}`;
}


// =========================================================
// POST
// =========================================================

export async function POST(
    request:
        NextRequest,
    context:
        RouteContext
) {

    try {

        if (
            !isAuthorized(
                request
            )
        ) {

            return NextResponse.json(
                {
                    ok:
                        false,

                    error:
                        "Unauthorized",
                },
                {
                    status:
                        401,
                }
            );
        }


        const {
            id,
        } =
            await context.params;


        if (
            !id
        ) {

            return NextResponse.json(
                {
                    ok:
                        false,

                    error:
                        "Pedido inválido",
                },
                {
                    status:
                        400,
                }
            );
        }


        const body =
            await request
                .json()
                .catch(
                    () => null
                );


        const action =
            typeof body?.action ===
                "string"
                ? body.action
                    .trim()
                    .toLowerCase()
                : "";


        if (
            action !==
            "approve" &&
            action !==
            "not_found"
        ) {

            return NextResponse.json(
                {
                    ok:
                        false,

                    error:
                        "Acción inválida",
                },
                {
                    status:
                        400,
                }
            );
        }


        // =====================================================
        // CARGAR PEDIDO REAL
        // =====================================================

        const {
            data:
            pedido,

            error:
            pedidoError,

        } =
            await supabaseAdmin
                .from(
                    "store_orders"
                )
                .select(`
                    id,
                    order_number,
                    total,
                    metodo_pago,
                    estado,
                    estado_pago,
                    notas_admin
                `)
                .eq(
                    "id",
                    id
                )
                .maybeSingle();


        if (
            pedidoError
        ) {

            throw pedidoError;
        }


        if (
            !pedido
        ) {

            return NextResponse.json(
                {
                    ok:
                        false,

                    error:
                        "Pedido no encontrado",
                },
                {
                    status:
                        404,
                }
            );
        }


        // =====================================================
        // IDEMPOTENCIA
        // =====================================================

        if (
            pedido.estado_pago ===
            "pagado"
        ) {

            return NextResponse.json({
                ok:
                    true,

                already_paid:
                    true,

                action:
                    "approve",

                pedido: {
                    id:
                        pedido.id,

                    numero:
                        pedido.order_number,

                    total:
                        Number(
                            pedido.total
                        ),

                    estado:
                        pedido.estado,

                    estado_pago:
                        pedido.estado_pago,

                    metodo_pago:
                        pedido.metodo_pago,
                },
            });
        }


        if (
            pedido.estado ===
            "cancelado"
        ) {

            return NextResponse.json(
                {
                    ok:
                        false,

                    error:
                        "El pedido está cancelado",
                },
                {
                    status:
                        409,
                }
            );
        }


        // =====================================================
        // PAGO NO ENCONTRADO
        // =====================================================

        if (
            action ===
            "not_found"
        ) {

            const now =
                new Date()
                    .toISOString();


            const note =
                `[${now}] Baruk Sales Inbox: comprobante revisado; transferencia no encontrada. Pedido permanece pendiente.`;


            const {
                error:
                updateError,

            } =
                await supabaseAdmin
                    .from(
                        "store_orders"
                    )
                    .update({
                        estado_pago:
                            "pendiente",

                        notas_admin:
                            appendAdminNote(
                                pedido
                                    .notas_admin,
                                note
                            ),
                    })
                    .eq(
                        "id",
                        pedido.id
                    );


            if (
                updateError
            ) {

                throw updateError;
            }


            return NextResponse.json({
                ok:
                    true,

                action:
                    "not_found",

                pedido: {
                    id:
                        pedido.id,

                    numero:
                        pedido.order_number,

                    total:
                        Number(
                            pedido.total
                        ),

                    estado:
                        pedido.estado,

                    estado_pago:
                        "pendiente",

                    metodo_pago:
                        pedido.metodo_pago,
                },
            });
        }


        // =====================================================
        // APROBAR TRANSFERENCIA
        // =====================================================

        const metodoActual =
            typeof pedido
                .metodo_pago ===
                "string"
                ? pedido
                    .metodo_pago
                    .toLowerCase()
                : "";


        if (
            metodoActual &&
            metodoActual !==
            "transferencia"
        ) {

            return NextResponse.json(
                {
                    ok:
                        false,

                    error:
                        `El pedido está configurado con método de pago ${pedido.metodo_pago}`,
                },
                {
                    status:
                        409,
                }
            );
        }


        // Si el cliente todavía no había pulsado "Transferencia"
        // en la página de pago, lo normalizamos antes de finalizar.
        if (
            !metodoActual
        ) {

            const {
                error:
                methodError,

            } =
                await supabaseAdmin
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


            if (
                methodError
            ) {

                throw methodError;
            }
        }


        // IMPORTANTE:
        // Esta RPC ya es la fuente de verdad usada por Baruk Shop
        // para finalizar una venta y descontar/reservar stock.
        const {
            error:
            finalError,

        } =
            await supabaseAdmin
                .rpc(
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


        if (
            finalError
        ) {

            console.error(
                "Error finalizando transferencia Baruk Shop:",
                finalError
            );


            return NextResponse.json(
                {
                    ok:
                        false,

                    error:
                        finalError.message ||
                        "No se pudo finalizar el pedido",
                },
                {
                    status:
                        500,
                }
            );
        }


        const now =
            new Date()
                .toISOString();


        const approvalNote =
            `[${now}] Baruk Sales Inbox: transferencia verificada manualmente y aprobada.`;


        // La RPC ya finalizó el pedido.
        // Aquí solamente dejamos trazabilidad administrativa.
        const {
            error:
            noteError,

        } =
            await supabaseAdmin
                .from(
                    "store_orders"
                )
                .update({
                    notas_admin:
                        appendAdminNote(
                            pedido
                                .notas_admin,
                            approvalNote
                        ),
                })
                .eq(
                    "id",
                    pedido.id
                );


        if (
            noteError
        ) {

            console.error(
                "Pedido aprobado, pero no se pudo guardar nota administrativa:",
                noteError
            );
        }


        const {
            data:
            finalizedOrder,

            error:
            finalizedError,

        } =
            await supabaseAdmin
                .from(
                    "store_orders"
                )
                .select(`
                    id,
                    order_number,
                    total,
                    metodo_pago,
                    estado,
                    estado_pago
                `)
                .eq(
                    "id",
                    pedido.id
                )
                .maybeSingle();


        if (
            finalizedError
        ) {

            throw finalizedError;
        }


        return NextResponse.json({
            ok:
                true,

            action:
                "approve",

            already_paid:
                false,

            pedido:
                finalizedOrder
                    ? {
                        id:
                            finalizedOrder.id,

                        numero:
                            finalizedOrder
                                .order_number,

                        total:
                            Number(
                                finalizedOrder
                                    .total
                            ),

                        metodo_pago:
                            finalizedOrder
                                .metodo_pago,

                        estado:
                            finalizedOrder
                                .estado,

                        estado_pago:
                            finalizedOrder
                                .estado_pago,
                    }
                    : {
                        id:
                            pedido.id,

                        numero:
                            pedido
                                .order_number,

                        total:
                            Number(
                                pedido.total
                            ),

                        metodo_pago:
                            "transferencia",

                        estado:
                            "confirmado",

                        estado_pago:
                            "pagado",
                    },
        });


    } catch (
    error
    ) {

        console.error(
            "Baruk AI transfer-review error:",
            error
        );


        return NextResponse.json(
            {
                ok:
                    false,

                error:
                    error instanceof
                        Error
                        ? error.message
                        : "Error interno",
            },
            {
                status:
                    500,
            }
        );
    }
}