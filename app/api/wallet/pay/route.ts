import {
    NextRequest,
    NextResponse,
} from "next/server";

import {
    supabaseAdmin,
} from "@/lib/supabaseAdmin";

import {
    procesarPedidoPagado,
} from "@/lib/procesarPedidoPagado";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";


/* ============================================================
   USUARIO AUTENTICADO
============================================================ */

async function getAuthenticatedUser(
    req: NextRequest
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
        return null;
    }


    const accessToken =
        authorization
            .replace(
                "Bearer ",
                ""
            )
            .trim();


    if (!accessToken) {
        return null;
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
        return null;
    }


    return data.user;
}


/* ============================================================
   MENSAJES RPC
============================================================ */

function getFriendlyRpcError(
    rawMessage: string
) {
    const message =
        String(
            rawMessage ?? ""
        );


    if (
        message.includes(
            "INSUFFICIENT_BALANCE"
        )
    ) {
        return {
            status: 400,
            error:
                "No tienes saldo suficiente en tu Billetera Baruk593.",
            code:
                "INSUFFICIENT_BALANCE",
        };
    }


    if (
        message.includes(
            "ORDER_NOT_FOUND"
        )
    ) {
        return {
            status: 404,
            error:
                "No encontramos el pedido.",
            code:
                "ORDER_NOT_FOUND",
        };
    }


    if (
        message.includes(
            "ORDER_NOT_OWNED_BY_USER"
        )
    ) {
        return {
            status: 403,
            error:
                "Este pedido no pertenece a tu cuenta.",
            code:
                "ORDER_NOT_OWNED_BY_USER",
        };
    }


    if (
        message.includes(
            "ORDER_ALREADY_PAID_OTHER_METHOD"
        )
    ) {
        return {
            status: 409,
            error:
                "Este pedido ya fue pagado con otro método.",
            code:
                "ORDER_ALREADY_PAID",
        };
    }


    if (
        message.includes(
            "ORDER_NOT_PENDING"
        )
    ) {
        return {
            status: 409,
            error:
                "Este pedido ya no está disponible para pago.",
            code:
                "ORDER_NOT_PENDING",
        };
    }


    if (
        message.includes(
            "INVALID_DATABASE_PRICE"
        ) ||
        message.includes(
            "INVALID_CARD_QUANTITY"
        ) ||
        message.includes(
            "INVALID_ORDER_TOTAL"
        )
    ) {
        return {
            status: 400,
            error:
                "No se pudo validar el valor de la compra.",
            code:
                "INVALID_ORDER",
        };
    }


    return {
        status: 500,
        error:
            "No se pudo procesar el pago con tu saldo.",
        code:
            "WALLET_PAYMENT_ERROR",
    };
}


/* ============================================================
   POST
============================================================ */

export async function POST(
    req: NextRequest
) {
    try {

        /* =====================================================
           1. AUTENTICAR USUARIO
        ===================================================== */

        const user =
            await getAuthenticatedUser(
                req
            );


        if (!user) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Tu sesión no es válida.",
                    code:
                        "UNAUTHORIZED",
                },
                {
                    status: 401,
                }
            );
        }


        const userEmail =
            String(
                user.email ?? ""
            )
                .trim()
                .toLowerCase();


        if (!userEmail) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Tu cuenta no tiene un correo válido.",
                    code:
                        "EMAIL_REQUIRED",
                },
                {
                    status: 400,
                }
            );
        }


        /* =====================================================
           2. LEER PEDIDO
        ===================================================== */

        const body =
            await req.json()
                .catch(
                    () => null
                );


        const pedidoId =
            Number(
                body?.pedidoId
            );


        if (
            !Number.isInteger(
                pedidoId
            ) ||
            pedidoId <= 0
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "pedidoId inválido.",
                    code:
                        "INVALID_ORDER_ID",
                },
                {
                    status: 400,
                }
            );
        }


        /* =====================================================
           3. PAGAR DESDE BILLETERA

           IMPORTANTE:
           - el monto se calcula en PostgreSQL;
           - el saldo se bloquea;
           - el débito es atómico;
           - la referencia evita doble cobro.
        ===================================================== */

        const {
            data:
            paymentResult,

            error:
            paymentError,
        } =
            await supabaseAdmin
                .rpc(
                    "pay_cards_order_with_wallet",
                    {
                        p_order_id:
                            pedidoId,

                        p_user_id:
                            user.id,

                        p_user_email:
                            userEmail,
                    }
                );


        if (
            paymentError
        ) {

            console.error(
                "[wallet-cards] RPC error:",
                paymentError
            );


            const friendly =
                getFriendlyRpcError(
                    paymentError.message
                );


            return NextResponse.json(
                {
                    ok: false,
                    error:
                        friendly.error,
                    code:
                        friendly.code,
                },
                {
                    status:
                        friendly.status,
                }
            );
        }


        const payment =
            (
                paymentResult ??
                {}
            ) as {
                ok?: boolean;
                alreadyPaid?: boolean;
                pedidoId?: number;
                amount?: number;
                previousBalance?: number;
                newBalance?: number;
                transactionId?: string;
            };


        if (
            !payment.ok
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "No se pudo confirmar el pago con saldo.",
                    code:
                        "PAYMENT_NOT_CONFIRMED",
                },
                {
                    status: 500,
                }
            );
        }


        /* =====================================================
           4. PROCESAR EXPERIENCE PASS

           Reutilizamos exactamente el motor que ya utiliza
           PayPhone después de confirmar un pago.
        ===================================================== */

        const processing =
            await procesarPedidoPagado(
                pedidoId
            );


        /*
         * Importante:
         *
         * El dinero YA quedó correctamente cobrado.
         * Si por algún motivo falla la creación de tarjetas,
         * NO hacemos otro débito.
         *
         * El endpoint puede volver a ejecutarse:
         * la RPC detectará la referencia existente y
         * procesarPedidoPagado es idempotente.
         */

        if (
            !processing.ok
        ) {

            console.error(
                "[wallet-cards] procesamiento pendiente:",
                {
                    pedidoId,
                    processing,
                }
            );


            return NextResponse.json(
                {
                    ok: false,

                    paymentConfirmed:
                        true,

                    processingPending:
                        true,

                    pedidoId,

                    payment,

                    error:
                        "El pago fue confirmado, pero las Experience Pass todavía están terminando de procesarse.",

                    code:
                        "CARDS_PROCESSING_PENDING",
                },
                {
                    status: 202,
                }
            );
        }


        /* =====================================================
           5. RESPUESTA EXITOSA
        ===================================================== */

        return NextResponse.json(
            {
                ok: true,

                paymentConfirmed:
                    true,

                processingPending:
                    false,

                pedidoId,

                alreadyPaid:
                    Boolean(
                        payment.alreadyPaid
                    ),

                amount:
                    Number(
                        payment.amount ?? 0
                    ),

                previousBalance:
                    payment.previousBalance != null
                        ? Number(
                            payment.previousBalance
                        )
                        : null,

                newBalance:
                    payment.newBalance != null
                        ? Number(
                            payment.newBalance
                        )
                        : null,

                transactionId:
                    payment.transactionId ??
                    null,

                processing,
            },
            {
                status: 200,
            }
        );

    } catch (
    error: unknown
    ) {

        console.error(
            "[wallet-cards] error:",
            error
        );


        return NextResponse.json(
            {
                ok: false,

                error:
                    error instanceof Error
                        ? error.message
                        : "Error interno al procesar el pago.",

                code:
                    "INTERNAL_ERROR",
            },
            {
                status: 500,
            }
        );
    }
}