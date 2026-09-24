// app/api/mi-cuenta/facturas/route.ts

import {
    NextRequest,
    NextResponse,
} from "next/server";

import {
    FactuplanError,
} from "factuplan";

import {
    getFactuplanClient,
} from "@/lib/factuplan";

import {
    supabaseAdmin,
} from "@/lib/supabaseAdmin";


export const runtime =
    "nodejs";

export const dynamic =
    "force-dynamic";


function normalizeEmail(
    value:
        | string
        | null
        | undefined
) {
    return String(
        value ??
        ""
    )
        .trim()
        .toLowerCase();
}


async function getAuthenticatedUser(
    req:
        NextRequest
) {
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
        return {
            user:
                null,

            response:
                NextResponse.json(
                    {
                        ok:
                            false,

                        error:
                            "Debes iniciar sesión en Mi Cuenta.",
                    },
                    {
                        status:
                            401,
                    }
                ),
        };
    }


    const accessToken =
        authorization
            .replace(
                "Bearer ",
                ""
            )
            .trim();


    if (
        !accessToken
    ) {
        return {
            user:
                null,

            response:
                NextResponse.json(
                    {
                        ok:
                            false,

                        error:
                            "La sesión no es válida.",
                    },
                    {
                        status:
                            401,
                    }
                ),
        };
    }


    const {
        data,
        error,
    } =
        await supabaseAdmin
            .auth
            .getUser(
                accessToken
            );


    if (
        error ||
        !data.user
    ) {
        return {
            user:
                null,

            response:
                NextResponse.json(
                    {
                        ok:
                            false,

                        error:
                            "Tu sesión ha expirado.",
                    },
                    {
                        status:
                            401,
                    }
                ),
        };
    }


    return {
        user:
            data.user,

        response:
            null,
    };
}


function serializeInvoice(
    row:
        any
) {
    return {
        pedidoId:
            Number(
                row.pedido_id
            ),

        provider:
            String(
                row.provider ??
                "factuplan"
            ),

        environment:
            String(
                row.environment ??
                "test"
            ),

        receiptId:
            row.factuplan_receipt_id
                ? String(
                    row.factuplan_receipt_id
                )
                : null,

        sequential:
            row.sequential
                ? String(
                    row.sequential
                )
                : null,

        authorizationNumber:
            row.authorization_number
                ? String(
                    row.authorization_number
                )
                : null,

        status:
            String(
                row.status ??
                "pending"
            ),

        total:
            row.total ===
                null ||
                row.total ===
                undefined
                ? null
                : Number(
                    row.total
                ),

        createdAt:
            row.created_at ??
            null,

        authorizedAt:
            row.authorized_at ??
            null,
    };
}


export async function GET(
    req:
        NextRequest
) {
    try {

        const {
            user,
            response:
            authResponse,
        } =
            await getAuthenticatedUser(
                req
            );


        if (
            authResponse
        ) {
            return authResponse;
        }


        if (
            !user
        ) {
            return NextResponse.json(
                {
                    ok:
                        false,

                    error:
                        "No existe una sesión válida.",
                },
                {
                    status:
                        401,
                }
            );
        }


        const userEmail =
            normalizeEmail(
                user.email
            );


        if (
            !userEmail
        ) {
            return NextResponse.json(
                {
                    ok:
                        false,

                    error:
                        "Tu cuenta no tiene un correo válido.",
                },
                {
                    status:
                        400,
                }
            );
        }


        const pedidoParam =
            req.nextUrl
                .searchParams
                .get(
                    "pedidoId"
                )
                ?.trim() ??
            "";


        const file =
            req.nextUrl
                .searchParams
                .get(
                    "file"
                )
                ?.trim()
                .toLowerCase() ??
            "";


        /* =====================================================
           ARCHIVO / FACTURA DE UN PEDIDO CONCRETO
        ===================================================== */

        if (
            pedidoParam
        ) {

            const pedidoId =
                Number(
                    pedidoParam
                );


            if (
                !Number.isInteger(
                    pedidoId
                ) ||
                pedidoId <=
                0
            ) {
                return NextResponse.json(
                    {
                        ok:
                            false,

                        error:
                            "pedidoId inválido.",
                    },
                    {
                        status:
                            400,
                    }
                );
            }


            /*
             * Primero comprobamos que el pedido pertenece al
             * comprador autenticado. La factura de un regalo
             * pertenece al comprador que hizo el pago.
             */
            const {
                data:
                pedido,

                error:
                pedidoError,
            } =
                await supabaseAdmin
                    .from(
                        "pedidos"
                    )
                    .select(`
                        id,
                        correo
                    `)
                    .eq(
                        "id",
                        pedidoId
                    )
                    .maybeSingle();


            if (
                pedidoError
            ) {
                console.error(
                    "mi-cuenta/facturas pedido error:",
                    pedidoError
                );


                return NextResponse.json(
                    {
                        ok:
                            false,

                        error:
                            "No se pudo verificar el pedido.",
                    },
                    {
                        status:
                            500,
                    }
                );
            }


            if (
                !pedido
            ) {
                return NextResponse.json(
                    {
                        ok:
                            false,

                        error:
                            "Pedido no encontrado.",
                    },
                    {
                        status:
                            404,
                    }
                );
            }


            if (
                normalizeEmail(
                    pedido.correo
                ) !==
                userEmail
            ) {
                return NextResponse.json(
                    {
                        ok:
                            false,

                        error:
                            "Este pedido no pertenece a tu cuenta.",
                    },
                    {
                        status:
                            403,
                    }
                );
            }


            const {
                data:
                invoice,

                error:
                invoiceError,
            } =
                await supabaseAdmin
                    .from(
                        "facturas"
                    )
                    .select(`
                        pedido_id,
                        provider,
                        environment,
                        factuplan_receipt_id,
                        sequential,
                        authorization_number,
                        status,
                        total,
                        created_at,
                        authorized_at
                    `)
                    .eq(
                        "pedido_id",
                        pedidoId
                    )
                    .maybeSingle();


            if (
                invoiceError
            ) {
                console.error(
                    "mi-cuenta/facturas factura error:",
                    invoiceError
                );


                return NextResponse.json(
                    {
                        ok:
                            false,

                        error:
                            "No se pudo consultar la factura.",
                    },
                    {
                        status:
                            500,
                    }
                );
            }


            if (
                !invoice
            ) {
                return NextResponse.json(
                    {
                        ok:
                            false,

                        error:
                            "Este pedido todavía no tiene una factura registrada.",
                    },
                    {
                        status:
                            404,
                    }
                );
            }


            if (
                !file
            ) {
                return NextResponse.json({
                    ok:
                        true,

                    invoice:
                        serializeInvoice(
                            invoice
                        ),
                });
            }


            if (
                file !==
                "pdf" &&
                file !==
                "xml"
            ) {
                return NextResponse.json(
                    {
                        ok:
                            false,

                        error:
                            "Tipo de archivo inválido.",
                    },
                    {
                        status:
                            400,
                    }
                );
            }


            const receiptId =
                String(
                    invoice
                        .factuplan_receipt_id ??
                    ""
                )
                    .trim();


            if (
                !receiptId
            ) {
                return NextResponse.json(
                    {
                        ok:
                            false,

                        error:
                            "La factura todavía no tiene un comprobante disponible.",
                    },
                    {
                        status:
                            409,
                    }
                );
            }


            const factuplan =
                getFactuplanClient();


            if (
                file ===
                "pdf"
            ) {
                const result =
                    await factuplan
                        .invoices
                        .downloadPdf(
                            receiptId
                        );


                return NextResponse.json({
                    ok:
                        true,

                    file:
                        "pdf",

                    url:
                        result.url ??
                        null,

                    previewUrl:
                        result.previewUrl ??
                        null,
                });
            }


            const result =
                await factuplan
                    .invoices
                    .downloadXml(
                        receiptId
                    );


            return NextResponse.json({
                ok:
                    true,

                file:
                    "xml",

                url:
                    result.url ??
                    null,

                previewUrl:
                    result.previewUrl ??
                    null,
            });
        }


        /* =====================================================
           RESUMEN DE FACTURAS DEL USUARIO
        ===================================================== */

        const {
            data:
            orders,

            error:
            ordersError,
        } =
            await supabaseAdmin
                .from(
                    "pedidos"
                )
                .select(
                    "id"
                )
                .eq(
                    "correo",
                    userEmail
                );


        if (
            ordersError
        ) {
            console.error(
                "mi-cuenta/facturas pedidos error:",
                ordersError
            );


            return NextResponse.json(
                {
                    ok:
                        false,

                    error:
                        "No se pudieron consultar tus pedidos.",
                },
                {
                    status:
                        500,
                }
            );
        }


        const orderIds =
            (
                orders ??
                []
            )
                .map(
                    order =>
                        Number(
                            order.id
                        )
                )
                .filter(
                    id =>
                        Number.isInteger(
                            id
                        ) &&
                        id >
                        0
                );


        if (
            orderIds.length ===
            0
        ) {
            return NextResponse.json({
                ok:
                    true,

                invoices:
                    [],
            });
        }


        const {
            data:
            invoices,

            error:
            invoicesError,
        } =
            await supabaseAdmin
                .from(
                    "facturas"
                )
                .select(`
                    pedido_id,
                    provider,
                    environment,
                    factuplan_receipt_id,
                    sequential,
                    authorization_number,
                    status,
                    total,
                    created_at,
                    authorized_at
                `)
                .in(
                    "pedido_id",
                    orderIds
                )
                .order(
                    "created_at",
                    {
                        ascending:
                            false,
                    }
                );


        if (
            invoicesError
        ) {
            console.error(
                "mi-cuenta/facturas listado error:",
                invoicesError
            );


            return NextResponse.json(
                {
                    ok:
                        false,

                    error:
                        "No se pudieron consultar tus facturas.",
                },
                {
                    status:
                        500,
                }
            );
        }


        return NextResponse.json({
            ok:
                true,

            invoices:
                (
                    invoices ??
                    []
                )
                    .map(
                        serializeInvoice
                    ),
        });


    } catch (
    error:
        unknown
    ) {

        console.error(
            "api/mi-cuenta/facturas error:",
            error
        );


        if (
            error instanceof
            FactuplanError
        ) {
            return NextResponse.json(
                {
                    ok:
                        false,

                    error:
                        error.message,

                    code:
                        error.code ??
                        null,

                    details:
                        error.details ??
                        null,
                },
                {
                    status:
                        error.statusCode &&
                            error.statusCode >=
                            400 &&
                            error.statusCode <=
                            599
                            ? error.statusCode
                            : 500,
                }
            );
        }


        return NextResponse.json(
            {
                ok:
                    false,

                error:
                    error instanceof
                        Error
                        ? error.message
                        : "Error interno consultando facturas.",
            },
            {
                status:
                    500,
            }
        );
    }
}
