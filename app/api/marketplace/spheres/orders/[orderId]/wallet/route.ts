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
   UUID
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
    message: string
) {
    const raw =
        String(
            message ??
            ""
        );


    if (
        raw.includes(
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
        raw.includes(
            "ORDER_NOT_FOUND"
        )
    ) {
        return {
            status: 404,

            code:
                "ORDER_NOT_FOUND",

            error:
                "No encontramos esta compra del Marketplace.",
        };
    }


    if (
        raw.includes(
            "ORDER_NOT_OWNED_BY_USER"
        )
    ) {
        return {
            status: 403,

            code:
                "ORDER_NOT_OWNED_BY_USER",

            error:
                "Esta orden no pertenece a tu cuenta.",
        };
    }


    if (
        raw.includes(
            "ORDER_ALREADY_COMPLETED"
        )
    ) {
        return {
            status: 409,

            code:
                "ORDER_ALREADY_COMPLETED",

            error:
                "Esta F1 Sphere ya fue comprada.",
        };
    }


    if (
        raw.includes(
            "INVALID_ORDER_AMOUNT"
        )
    ) {
        return {
            status: 400,

            code:
                "INVALID_ORDER_AMOUNT",

            error:
                "No se pudo validar el precio de esta F1 Sphere.",
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
   PAGAR F1 SPHERE CON SALDO BARUK593
============================================================ */

export async function POST(
    req: NextRequest,

    context: {
        params:
        Promise<{
            orderId: string;
        }>;
    }
) {
    try {

        /* =====================================================
           1. SESIÓN
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


        /* =====================================================
           2. ORDER ID
        ===================================================== */

        const {
            orderId:
            rawOrderId,
        } =
            await context.params;


        const orderId =
            String(
                rawOrderId ??
                ""
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
                        "La orden del Marketplace no es válida.",
                },

                {
                    status: 400,
                }
            );
        }


        /* =====================================================
           3. EJECUTAR PAGO TRANSACCIONAL

           PostgreSQL:
           - valida comprador;
           - valida precio;
           - bloquea wallet;
           - verifica saldo;
           - descuenta;
           - transfiere la Sphere;
           - acredita vendedor;
           - registra comisión;
           - evita doble cobro.
        ===================================================== */

        const {
            data:
            paymentResult,

            error:
            paymentError,
        } =
            await supabaseAdmin
                .rpc(
                    "pay_sphere_marketplace_order_with_wallet",
                    {
                        p_order_id:
                            orderId,

                        p_buyer_user_id:
                            user.id,
                    }
                );


        if (
            paymentError
        ) {
            console.error(
                "[marketplace-wallet] RPC error:",
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

                amount?: number;

                previousBalance?: number;

                newBalance?: number;

                transactionId?: string;
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
                    payment.orderId ??
                    orderId,

                amount:
                    Number(
                        payment.amount ??
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
            "[marketplace-wallet] error:",
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