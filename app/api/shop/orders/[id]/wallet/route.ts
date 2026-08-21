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


/* ============================================================
   AUTENTICAR USUARIO
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
   VALIDAR UUID
============================================================ */

function isValidUuid(
    value: string
) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value
    );
}


/* ============================================================
   ERRORES AMIGABLES
============================================================ */

function getFriendlyError(
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
            code:
                "INSUFFICIENT_BALANCE",
            error:
                "No tienes saldo suficiente en tu Billetera Baruk593.",
        };
    }


    if (
        message.includes(
            "ORDER_NOT_FOUND"
        )
    ) {
        return {
            status: 404,
            code:
                "ORDER_NOT_FOUND",
            error:
                "No encontramos este pedido de Baruk Shop.",
        };
    }


    if (
        message.includes(
            "ORDER_NOT_OWNED_BY_USER"
        )
    ) {
        return {
            status: 403,
            code:
                "ORDER_NOT_OWNED_BY_USER",
            error:
                "Este pedido no pertenece a tu cuenta Baruk593.",
        };
    }


    if (
        message.includes(
            "ORDER_ALREADY_PAID_OTHER_METHOD"
        )
    ) {
        return {
            status: 409,
            code:
                "ORDER_ALREADY_PAID",
            error:
                "Este pedido ya fue pagado con otro método.",
        };
    }


    if (
        message.includes(
            "ORDER_CANCELLED"
        ) ||
        message
            .toLowerCase()
            .includes(
                "pedido está cancelado"
            )
    ) {
        return {
            status: 409,
            code:
                "ORDER_CANCELLED",
            error:
                "Este pedido fue cancelado.",
        };
    }


    if (
        message.includes(
            "INVALID_ORDER_TOTAL"
        )
    ) {
        return {
            status: 400,
            code:
                "INVALID_ORDER_TOTAL",
            error:
                "No se pudo validar el valor del pedido.",
        };
    }


    if (
        message
            .toLowerCase()
            .includes(
                "stock insuficiente"
            )
    ) {
        return {
            status: 409,
            code:
                "INSUFFICIENT_STOCK",
            error:
                "Uno de los productos ya no tiene stock suficiente.",
        };
    }


    if (
        message
            .toLowerCase()
            .includes(
                "producto no disponible"
            ) ||
        message
            .toLowerCase()
            .includes(
                "productos ya no está disponible"
            )
    ) {
        return {
            status: 409,
            code:
                "PRODUCT_UNAVAILABLE",
            error:
                "Uno de los productos ya no está disponible.",
        };
    }


    if (
        message
            .toLowerCase()
            .includes(
                "pedido no contiene productos"
            )
    ) {
        return {
            status: 400,
            code:
                "EMPTY_ORDER",
            error:
                "Este pedido no contiene productos.",
        };
    }


    return {
        status: 500,
        code:
            "WALLET_PAYMENT_ERROR",
        error:
            "No se pudo procesar el pago con tu saldo.",
    };
}


/* ============================================================
   POST
   PAGAR BARUK SHOP CON SALDO BARUK593
============================================================ */

export async function POST(
    req: NextRequest,

    context: {
        params:
        Promise<{
            id: string;
        }>;
    }
) {
    try {

        /* =====================================================
           1. AUTENTICAR
        ===================================================== */

        const user =
            await getAuthenticatedUser(
                req
            );


        if (!user) {
            return NextResponse.json(
                {
                    ok: false,

                    code:
                        "UNAUTHORIZED",

                    error:
                        "Tu sesión no es válida o ha expirado.",
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

                    code:
                        "EMAIL_REQUIRED",

                    error:
                        "Tu cuenta Baruk593 no tiene un correo válido.",
                },
                {
                    status: 400,
                }
            );
        }


        /* =====================================================
           2. ID DEL PEDIDO
        ===================================================== */

        const {
            id:
            rawOrderId,
        } =
            await context.params;


        const orderId =
            String(
                rawOrderId ?? ""
            ).trim();


        if (
            !orderId ||
            !isValidUuid(
                orderId
            )
        ) {
            return NextResponse.json(
                {
                    ok: false,

                    code:
                        "INVALID_ORDER_ID",

                    error:
                        "El pedido de Baruk Shop no es válido.",
                },
                {
                    status: 400,
                }
            );
        }


        /* =====================================================
           3. PAGAR DESDE BILLETERA

           PostgreSQL hace todo de forma transaccional:
           - verifica pedido;
           - verifica correo;
           - lee total real;
           - bloquea billetera;
           - descuenta saldo;
           - registra movimiento;
           - valida stock;
           - descuenta stock;
           - confirma pedido.
        ===================================================== */

        const {
            data:
            paymentResult,

            error:
            paymentError,
        } =
            await supabaseAdmin
                .rpc(
                    "pay_store_order_with_wallet",
                    {
                        p_order_id:
                            orderId,

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
                "[shop-wallet] RPC error:",
                {
                    orderId,

                    userId:
                        user.id,

                    error:
                        paymentError,
                }
            );


            const friendly =
                getFriendlyError(
                    paymentError.message
                );


            return NextResponse.json(
                {
                    ok: false,

                    code:
                        friendly.code,

                    error:
                        friendly.error,
                },
                {
                    status:
                        friendly.status,
                }
            );
        }


        /* =====================================================
           4. RESPUESTA
        ===================================================== */

        const payment =
            (
                paymentResult ??
                {}
            ) as {
                ok?: boolean;

                alreadyPaid?: boolean;

                orderId?: string;

                orderNumber?: string;

                amount?: number;

                previousBalance?: number;

                newBalance?: number;

                transactionId?: string;

                finalization?: unknown;
            };


        if (!payment.ok) {
            return NextResponse.json(
                {
                    ok: false,

                    code:
                        "PAYMENT_NOT_CONFIRMED",

                    error:
                        "El pago no pudo ser confirmado.",
                },
                {
                    status: 500,
                }
            );
        }


        return NextResponse.json(
            {
                ok: true,

                paymentConfirmed:
                    true,

                paymentMethod:
                    "wallet",

                alreadyPaid:
                    Boolean(
                        payment
                            .alreadyPaid
                    ),

                orderId:
                    payment
                        .orderId ??
                    orderId,

                orderNumber:
                    payment
                        .orderNumber ??
                    null,

                amount:
                    Number(
                        payment
                            .amount ??
                        0
                    ),

                previousBalance:
                    payment
                        .previousBalance !=
                        null
                        ? Number(
                            payment
                                .previousBalance
                        )
                        : null,

                newBalance:
                    payment
                        .newBalance !=
                        null
                        ? Number(
                            payment
                                .newBalance
                        )
                        : null,

                transactionId:
                    payment
                        .transactionId ??
                    null,
            },
            {
                status: 200,
            }
        );


    } catch (
    error:
        unknown
    ) {

        console.error(
            "[shop-wallet] error:",
            error
        );


        return NextResponse.json(
            {
                ok: false,

                code:
                    "INTERNAL_ERROR",

                error:
                    error instanceof
                        Error
                        ? error.message
                        : "Error interno al procesar el pago.",
            },
            {
                status: 500,
            }
        );
    }
}