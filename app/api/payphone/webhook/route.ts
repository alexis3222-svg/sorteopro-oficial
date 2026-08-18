// app/api/payphone/webhook/route.ts

import {
    NextRequest,
    NextResponse,
} from "next/server";

import axios from "axios";

import {
    supabaseAdmin,
} from "@/lib/supabaseAdmin";

import {
    procesarPedidoPagado,
} from "@/lib/procesarPedidoPagado";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";


/* ============================================================
   PAYPHONE
============================================================ */

/*
 * IMPORTANTE:
 *
 * Conservamos el mismo endpoint que ya utiliza
 * actualmente Baruk593.
 *
 * No estamos migrando tu integración PayPhone.
 */

const PAYPHONE_CONFIRM_URL =
    "https://pay.payphonetodoesposible.com/api/button/V2/Confirm";

const PAYPHONE_REVERSE_URL =
    "https://pay.payphonetodoesposible.com/api/Reverse";


/* ============================================================
   TOKEN SERVER-ONLY
============================================================ */

function getPayphoneTokenWebServerOnly() {
    return (
        process.env.PAYPHONE_TOKEN_LIVE ||
        process.env.PAYPHONE_TOKEN ||
        ""
    )
        .replace(/^"+|"+$/g, "")
        .trim();
}


/* ============================================================
   PARSERS
============================================================ */

function parseId(
    value: unknown
) {
    const number =
        Number(
            String(
                value ?? ""
            ).trim()
        );

    return !number ||
        Number.isNaN(number)
        ? null
        : number;
}


function parseTx(
    value: unknown
) {
    const text =
        String(
            value ?? ""
        ).trim();

    return text || null;
}


/* ============================================================
   APROBACIÓN PAYPHONE
============================================================ */

function isApproved(
    confirmJson: any
) {
    const status =
        String(
            confirmJson?.transactionStatus ??
            ""
        ).toLowerCase();

    const code =
        Number(
            confirmJson?.statusCode
        );

    return (
        status === "approved" ||
        code === 3
    );
}


/* ============================================================
   REDIRECCIÓN CON HTTP 200
============================================================ */

function html200Redirect(
    to: string
) {
    const safeTarget =
        JSON.stringify(to);

    return new NextResponse(
        `
<!doctype html>
<html lang="es">
<head>
    <meta charset="utf-8" />
    <meta
        http-equiv="refresh"
        content="0;url=${to}"
    />
    <title>Procesando pago...</title>
</head>

<body>
    <p>Procesando pago...</p>

    <script>
        window.location.replace(${safeTarget});
    </script>
</body>
</html>
        `,
        {
            status: 200,

            headers: {
                "Content-Type":
                    "text/html; charset=utf-8",

                "Cache-Control":
                    "no-store",
            },
        }
    );
}


/* ============================================================
   CONFIRM PAYPHONE
============================================================ */

async function confirmWithPayPhone(
    id: number,
    clientTxId: string
) {
    const token =
        getPayphoneTokenWebServerOnly();

    if (!token) {
        return {
            ok: false as const,
            http: 0,
            data: null,
            raw: "NO_TOKEN",
        };
    }


    const response =
        await axios.post(
            PAYPHONE_CONFIRM_URL,

            {
                id,
                clientTxId,
            },

            {
                headers: {
                    Authorization:
                        `Bearer ${token}`,

                    "Content-Type":
                        "application/json",

                    Accept:
                        "application/json",
                },

                timeout:
                    15000,

                validateStatus:
                    () => true,
            }
        );


    const data =
        response.data ??
        null;


    const raw =
        typeof data === "string"
            ? data.slice(
                0,
                800
            )
            : JSON.stringify(
                data
            ).slice(
                0,
                800
            );


    if (
        response.status !==
        200
    ) {
        return {
            ok: false as const,

            http:
                response.status,

            data,

            raw,
        };
    }


    return {
        ok: true as const,

        http:
            response.status,

        data,

        raw,
    };
}


/* ============================================================
   REVERSE PAYPHONE
============================================================ */

async function reverseWithPayPhone(
    transactionId: number
) {
    const token =
        getPayphoneTokenWebServerOnly();

    if (!token) {
        return false;
    }


    const response =
        await axios.post(
            PAYPHONE_REVERSE_URL,

            {
                id:
                    transactionId,
            },

            {
                headers: {
                    Authorization:
                        `Bearer ${token}`,

                    "Content-Type":
                        "application/json",

                    Accept:
                        "application/json",
                },

                timeout:
                    15000,

                validateStatus:
                    () => true,
            }
        );


    return (
        response.status >= 200 &&
        response.status < 300
    );
}


/* ============================================================
   BARUK CARDS
   FLUJO EXISTENTE
============================================================ */

async function processCardsPayment(
    id: number,
    clientTxId: string
) {

    /* ========================================================
       1. BUSCAR PEDIDO
    ======================================================== */

    const {
        data:
        pedido,

        error:
        pedidoErr,
    } =
        await supabaseAdmin
            .from(
                "pedidos"
            )
            .select(`
                id,
                estado,
                total,
                payphone_id
            `)
            .eq(
                "payphone_client_transaction_id",
                clientTxId
            )
            .single();


    if (
        pedidoErr ||
        !pedido
    ) {

        return {
            ok:
                false as const,

            code:
                "pedido_not_found" as const,

            tipo:
                "cards" as const,
        };
    }


    /* ========================================================
       2. CONFIRMAR DIRECTAMENTE CON PAYPHONE
    ======================================================== */

    const confirm =
        await confirmWithPayPhone(
            id,
            clientTxId
        );


    if (!confirm.ok) {

        console.log(
            "[payphone-confirm] cards failed",
            {
                http:
                    confirm.http,

                raw:
                    confirm.raw,

                pedidoId:
                    pedido.id,
            }
        );


        return {
            ok:
                true as const,

            pending:
                true as const,

            approved:
                false as const,

            tipo:
                "cards" as const,

            pedidoId:
                pedido.id,
        };
    }


    /* ========================================================
       3. VALIDAR CLIENT TRANSACTION ID
    ======================================================== */

    const confirmedTx =
        String(
            confirm.data
                ?.clientTransactionId ??
            ""
        )
            .trim();


    if (
        !confirmedTx ||
        confirmedTx !==
        clientTxId
    ) {

        console.error(
            "[payphone-confirm] CARDS TX mismatch",
            {
                pedidoId:
                    pedido.id,

                expected:
                    clientTxId,

                received:
                    confirmedTx,
            }
        );


        return {
            ok:
                true as const,

            pending:
                true as const,

            approved:
                false as const,

            tipo:
                "cards" as const,

            pedidoId:
                pedido.id,
        };
    }


    /* ========================================================
       4. VALIDAR APROBACIÓN
    ======================================================== */

    const approved =
        isApproved(
            confirm.data
        );


    if (!approved) {

        console.log(
            "[payphone-confirm] cards not approved",
            {
                pedidoId:
                    pedido.id,

                raw:
                    confirm.raw,
            }
        );


        return {
            ok:
                true as const,

            pending:
                true as const,

            approved:
                false as const,

            tipo:
                "cards" as const,

            pedidoId:
                pedido.id,
        };
    }


    /* ========================================================
       5. VALIDAR MONTO Y MONEDA
       PAYPHONE TRABAJA LOS MONTOS EN CENTAVOS
    ======================================================== */

    const expectedAmount =
        Math.round(
            Number(
                pedido.total
            ) *
            100
        );


    const paidAmount =
        Number(
            confirm.data
                ?.amount
        );


    const paidCurrency =
        String(
            confirm.data
                ?.currency ??
            ""
        )
            .trim()
            .toUpperCase();


    const transactionId =
        Number(
            confirm.data
                ?.transactionId ??
            id
        );


    if (
        !Number.isFinite(
            expectedAmount
        ) ||
        expectedAmount <= 0 ||
        !Number.isFinite(
            paidAmount
        ) ||
        paidAmount !==
        expectedAmount ||
        paidCurrency !==
        "USD"
    ) {

        console.error(
            "[payphone-confirm] CARDS amount/currency mismatch",
            {
                pedidoId:
                    pedido.id,

                expectedAmount,

                paidAmount,

                expectedCurrency:
                    "USD",

                paidCurrency,
            }
        );


        /*
         * PayPhone aprobó un cobro que no coincide
         * con el pedido Baruk593.
         *
         * No generamos números ni tarjetas.
         * Intentamos devolver el dinero.
         */

        const reversed =
            await reverseWithPayPhone(
                transactionId
            );


        console.error(
            reversed
                ? `[payphone-confirm] Pedido ${pedido.id}: pago reversado por diferencia de datos.`
                : `[payphone-confirm] Pedido ${pedido.id}: REVISIÓN MANUAL. El reverso automático falló.`
        );


        return {
            ok:
                true as const,

            pending:
                false as const,

            approved:
                false as const,

            reversed,

            tipo:
                "cards" as const,

            pedidoId:
                pedido.id,
        };
    }


    /* ========================================================
       6. MARCAR PEDIDO COMO PAGADO
    ======================================================== */

    if (
        pedido.estado !==
        "pagado"
    ) {

        const {
            error:
            paymentUpdateError,
        } =
            await supabaseAdmin
                .from(
                    "pedidos"
                )
                .update({

                    estado:
                        "pagado",

                    payphone_id:
                        pedido.payphone_id ??
                        transactionId,

                    aprobado_at:
                        new Date()
                            .toISOString(),
                })
                .eq(
                    "id",
                    pedido.id
                );


        if (
            paymentUpdateError
        ) {

            console.error(
                "No se pudo marcar pedido como pagado:",
                paymentUpdateError
            );


            return {
                ok:
                    true as const,

                pending:
                    true as const,

                approved:
                    false as const,

                tipo:
                    "cards" as const,

                pedidoId:
                    pedido.id,
            };
        }

    } else if (
        !pedido.payphone_id
    ) {

        await supabaseAdmin
            .from(
                "pedidos"
            )
            .update({
                payphone_id:
                    transactionId,
            })
            .eq(
                "id",
                pedido.id
            );
    }


    /* ========================================================
       7. PROCESAR EXPERIENCE PASS
    ======================================================== */

    const processing =
        await procesarPedidoPagado(
            pedido.id
        );


    return {

        ok:
            true as const,

        pending:
            false as const,

        approved:
            true as const,

        tipo:
            "cards" as const,

        pedidoId:
            pedido.id,

        processing,
    };
}


/* ============================================================
   BARUK SHOP
============================================================ */

async function processShopPayment(
    id: number,
    clientTxId: string
) {
    /* ========================================================
       1. BUSCAR STORE ORDER
    ======================================================== */

    const {
        data: pedido,
        error: pedidoError,
    } =
        await supabaseAdmin
            .from(
                "store_orders"
            )
            .select(`
                id,
                order_number,
                total,
                estado,
                estado_pago,
                payphone_transaction_id
            `)
            .eq(
                "payphone_client_transaction_id",
                clientTxId
            )
            .maybeSingle();


    if (
        pedidoError ||
        !pedido
    ) {
        return {
            ok: false as const,

            code:
                "pedido_not_found" as const,

            tipo:
                "shop" as const,
        };
    }


    /* ========================================================
       IDEMPOTENCIA
    ======================================================== */

    if (
        pedido.estado_pago ===
        "pagado"
    ) {
        return {
            ok: true as const,

            pending: false as const,

            approved: true as const,

            tipo:
                "shop" as const,

            pedidoId:
                pedido.id,
        };
    }


    /* ========================================================
       2. CONFIRM PAYPHONE
    ======================================================== */

    const confirm =
        await confirmWithPayPhone(
            id,
            clientTxId
        );


    if (!confirm.ok) {
        console.log(
            "[payphone-confirm] shop failed",
            {
                http:
                    confirm.http,

                raw:
                    confirm.raw,

                pedidoId:
                    pedido.id,
            }
        );


        return {
            ok: true as const,

            pending: true as const,

            approved: false as const,

            tipo:
                "shop" as const,

            pedidoId:
                pedido.id,
        };
    }


    /* ========================================================
       VALIDAR TX
    ======================================================== */

    const confirmedTx =
        String(
            confirm.data
                ?.clientTransactionId ??
            ""
        ).trim();


    if (
        !confirmedTx ||
        confirmedTx !==
        clientTxId
    ) {
        console.error(
            "[payphone-confirm] TX mismatch",
            {
                expected:
                    clientTxId,

                received:
                    confirmedTx,
            }
        );


        return {
            ok: true as const,

            pending: true as const,

            approved: false as const,

            tipo:
                "shop" as const,

            pedidoId:
                pedido.id,
        };
    }


    /* ========================================================
       APROBACIÓN
    ======================================================== */

    const approved =
        isApproved(
            confirm.data
        );


    if (!approved) {
        await supabaseAdmin
            .from(
                "store_orders"
            )
            .update({
                estado_pago:
                    "fallido",
            })
            .eq(
                "id",
                pedido.id
            );


        return {
            ok: true as const,

            pending: false as const,

            approved: false as const,

            tipo:
                "shop" as const,

            pedidoId:
                pedido.id,
        };
    }


    /* ========================================================
       3. VALIDAR MONTO
       PAYPHONE DEVUELVE CENTAVOS
    ======================================================== */

    const expectedAmount =
        Math.round(
            Number(
                pedido.total
            ) * 100
        );


    const paidAmount =
        Number(
            confirm.data?.amount
        );


    const transactionId =
        Number(
            confirm.data
                ?.transactionId ??
            id
        );


    const paidCurrency =
        String(
            confirm.data
                ?.currency ??
            ""
        )
            .trim()
            .toUpperCase();


    if (
        !Number.isFinite(
            expectedAmount
        ) ||
        expectedAmount <= 0 ||
        !Number.isFinite(
            paidAmount
        ) ||
        paidAmount !==
        expectedAmount ||
        paidCurrency !==
        "USD"
    ) {
        console.error(
            "[payphone-confirm] SHOP amount/currency mismatch",
            {
                pedidoId:
                    pedido.id,

                expectedAmount,

                paidAmount,

                expectedCurrency:
                    "USD",

                paidCurrency,
            }
        );


        const reversed =
            await reverseWithPayPhone(
                transactionId
            );


        await supabaseAdmin
            .from(
                "store_orders"
            )
            .update({
                estado_pago:
                    reversed
                        ? "reembolsado"
                        : "procesando",

                estado:
                    reversed
                        ? "cancelado"
                        : pedido.estado,

                notas_admin:
                    reversed
                        ? "Pago PayPhone reversado por diferencia de monto."
                        : "REVISIÓN MANUAL: PayPhone aprobado con diferencia de monto y el reverso automático falló.",
            })
            .eq(
                "id",
                pedido.id
            );


        return {
            ok: true as const,

            pending:
                !reversed,

            approved:
                false as const,

            reversed,

            tipo:
                "shop" as const,

            pedidoId:
                pedido.id,
        };
    }


    /* ========================================================
       4. FINALIZAR + DESCONTAR STOCK
    ======================================================== */

    const {
        error:
        finalError,
    } =
        await supabaseAdmin.rpc(
            "finalizar_store_order_pagado",
            {
                p_order_id:
                    pedido.id,

                p_metodo_pago:
                    "payphone",

                p_payphone_transaction_id:
                    String(
                        transactionId
                    ),
            }
        );


    /* ========================================================
       SI FALLA STOCK, REVERSAR
    ======================================================== */

    if (finalError) {
        console.error(
            "[shop-finalize] failed",
            {
                pedidoId:
                    pedido.id,

                error:
                    finalError,
            }
        );


        const reversed =
            await reverseWithPayPhone(
                transactionId
            );


        await supabaseAdmin
            .from(
                "store_orders"
            )
            .update({
                estado_pago:
                    reversed
                        ? "reembolsado"
                        : "procesando",

                estado:
                    reversed
                        ? "cancelado"
                        : pedido.estado,

                notas_admin:
                    reversed
                        ? "Pago PayPhone reversado porque no fue posible confirmar stock."
                        : "REVISIÓN MANUAL: pago PayPhone aprobado, pero falló la reserva de stock y también falló el reverso.",
            })
            .eq(
                "id",
                pedido.id
            );


        return {
            ok: true as const,

            pending:
                !reversed,

            approved:
                false as const,

            reversed,

            tipo:
                "shop" as const,

            pedidoId:
                pedido.id,
        };
    }


    /* ========================================================
       ÉXITO
    ======================================================== */

    return {
        ok: true as const,

        pending: false as const,

        approved: true as const,

        tipo:
            "shop" as const,

        pedidoId:
            pedido.id,
    };
}

/* ============================================================
   F1 SPHERE MARKETPLACE
============================================================ */

async function processMarketplacePayment(
    id: number,
    clientTxId: string
) {

    /* ========================================================
       1. BUSCAR ORDEN
    ======================================================== */

    const {
        data:
        order,

        error:
        orderError,
    } =
        await supabaseAdmin
            .from(
                "sphere_marketplace_orders"
            )
            .select(`
                id,
                listing_id,
                sphere_instance_id,
                buyer_user_id,
                seller_user_id,
                price,
                commission_amount,
                seller_amount,
                currency,
                status,
                payphone_client_transaction_id,
                payphone_transaction_id
            `)
            .eq(
                "payphone_client_transaction_id",
                clientTxId
            )
            .maybeSingle();


    if (
        orderError ||
        !order
    ) {

        console.error(
            "[marketplace-payphone] order not found",
            {
                clientTxId,
                error:
                    orderError,
            }
        );

        return {
            ok:
                false as const,

            code:
                "marketplace_order_not_found" as const,

            tipo:
                "marketplace" as const,
        };
    }


    /* ========================================================
       IDEMPOTENCIA
    ======================================================== */

    if (
        order.status ===
        "completed"
    ) {

        return {
            ok:
                true as const,

            pending:
                false as const,

            approved:
                true as const,

            tipo:
                "marketplace" as const,

            orderId:
                order.id,
        };
    }


    /* ========================================================
       2. CONFIRMAR CON PAYPHONE
    ======================================================== */

    const confirm =
        await confirmWithPayPhone(
            id,
            clientTxId
        );


    if (!confirm.ok) {

        console.error(
            "[marketplace-payphone] confirm failed",
            {
                http:
                    confirm.http,

                raw:
                    confirm.raw,

                orderId:
                    order.id,
            }
        );


        return {
            ok:
                true as const,

            pending:
                true as const,

            approved:
                false as const,

            tipo:
                "marketplace" as const,

            orderId:
                order.id,
        };
    }


    /* ========================================================
       3. VALIDAR CLIENT TRANSACTION ID
    ======================================================== */

    const confirmedTx =
        String(
            confirm.data
                ?.clientTransactionId ??
            ""
        ).trim();


    if (
        confirmedTx &&
        confirmedTx !==
        clientTxId
    ) {

        console.error(
            "[marketplace-payphone] TX mismatch",
            {
                expected:
                    clientTxId,

                received:
                    confirmedTx,

                orderId:
                    order.id,
            }
        );


        return {
            ok:
                true as const,

            pending:
                true as const,

            approved:
                false as const,

            tipo:
                "marketplace" as const,

            orderId:
                order.id,
        };
    }


    /* ========================================================
       4. APROBACIÓN
    ======================================================== */

    const approved =
        isApproved(
            confirm.data
        );


    if (!approved) {

        return {
            ok:
                true as const,

            pending:
                false as const,

            approved:
                false as const,

            tipo:
                "marketplace" as const,

            orderId:
                order.id,
        };
    }


    /* ========================================================
       5. VALIDAR MONTO
    ======================================================== */

    const expectedAmount =
        Math.round(
            Number(
                order.price
            ) *
            100
        );


    const paidAmount =
        Number(
            confirm.data
                ?.amount
        );


    const transactionId =
        Number(
            confirm.data
                ?.transactionId ??
            id
        );


    const expectedCurrency =
        String(
            order.currency ??
            "USD"
        )
            .trim()
            .toUpperCase();


    const paidCurrency =
        String(
            confirm.data
                ?.currency ??
            ""
        )
            .trim()
            .toUpperCase();


    if (
        !Number.isFinite(
            paidAmount
        ) ||
        paidAmount !==
        expectedAmount ||
        !paidCurrency ||
        paidCurrency !==
        expectedCurrency
    ) {

        console.error(
            "[marketplace-payphone] amount/currency mismatch",
            {
                orderId:
                    order.id,

                expectedAmount,

                paidAmount,

                expectedCurrency,

                paidCurrency,
            }
        );


        const reversed =
            await reverseWithPayPhone(
                transactionId
            );


        await supabaseAdmin
            .from(
                "sphere_marketplace_orders"
            )
            .update({

                status:
                    reversed
                        ? "failed"
                        : "paid",

                payment_method:
                    "payphone",

                payment_transaction_id:
                    String(
                        transactionId
                    ),

                payphone_transaction_id:
                    String(
                        transactionId
                    ),

                updated_at:
                    new Date()
                        .toISOString(),
            })
            .eq(
                "id",
                order.id
            );


        return {
            ok:
                true as const,

            pending:
                !reversed,

            approved:
                false as const,

            reversed,

            tipo:
                "marketplace" as const,

            orderId:
                order.id,
        };
    }


    /* ========================================================
       6. FINALIZAR VENTA
    ======================================================== */

    const {
        error:
        finalError,
    } =
        await supabaseAdmin
            .rpc(
                "finalize_sphere_marketplace_order_paid",
                {
                    p_order_id:
                        order.id,

                    p_payphone_transaction_id:
                        String(
                            transactionId
                        ),
                }
            );


    /* ========================================================
       SI NO PODEMOS TRANSFERIR LA ESFERA,
       REVERSAMOS EL PAGO
    ======================================================== */

    if (finalError) {

        console.error(
            "[marketplace-finalize] failed",
            {
                orderId:
                    order.id,

                error:
                    finalError,
            }
        );


        const reversed =
            await reverseWithPayPhone(
                transactionId
            );


        await supabaseAdmin
            .from(
                "sphere_marketplace_orders"
            )
            .update({

                status:
                    reversed
                        ? "failed"
                        : "paid",

                payment_method:
                    "payphone",

                payment_transaction_id:
                    String(
                        transactionId
                    ),

                payphone_transaction_id:
                    String(
                        transactionId
                    ),

                updated_at:
                    new Date()
                        .toISOString(),
            })
            .eq(
                "id",
                order.id
            );


        return {
            ok:
                true as const,

            pending:
                !reversed,

            approved:
                false as const,

            reversed,

            tipo:
                "marketplace" as const,

            orderId:
                order.id,
        };
    }


    /* ========================================================
       ÉXITO
    ======================================================== */

    return {
        ok:
            true as const,

        pending:
            false as const,

        approved:
            true as const,

        tipo:
            "marketplace" as const,

        orderId:
            order.id,
    };
}

/* ============================================================
   ROUTER DE PAGOS
============================================================ */

async function processPayment(
    id: number,
    clientTxId: string
) {
    /*
     * Baruk Shop utilizará:
     *
     * SHOP-BS-2026-001001
     *
     * Las transacciones antiguas siguen
     * entrando al flujo de Baruk Cards.
     */

    /*
 * MARKETPLACE F1 SPHERES
 */
    if (
        clientTxId.startsWith(
            "MKT-"
        )
    ) {
        return processMarketplacePayment(
            id,
            clientTxId
        );
    }


    /*
     * BARUK SHOP
     */
    if (
        clientTxId.startsWith(
            "SHOP-"
        )
    ) {
        return processShopPayment(
            id,
            clientTxId
        );
    }


    /*
     * EXPERIENCE PASS / BARUK CARDS
     */
    return processCardsPayment(
        id,
        clientTxId
    );
}


/* ============================================================
   GET
============================================================ */

export async function GET(
    req: NextRequest
) {
    const id =
        parseId(
            req.nextUrl.searchParams.get(
                "id"
            )
        );


    const tx =
        parseTx(
            req.nextUrl.searchParams.get(
                "clientTransactionId"
            )
        );


    /* ========================================================
       FALTAN PARÁMETROS
    ======================================================== */

    if (
        !id ||
        !tx
    ) {
        return html200Redirect(
            "/pago-fallido?reason=missing_params"
        );
    }


    const result =
        await processPayment(
            id,
            tx
        );


    /* ========================================================
       PEDIDO NO ENCONTRADO
    ======================================================== */

    if (!result.ok) {
        if (
            tx.startsWith(
                "SHOP-"
            )
        ) {
            return html200Redirect(
                `/tienda?payphone=pedido_no_encontrado`
            );
        }


        return html200Redirect(
            `/pago-fallido?tx=${encodeURIComponent(
                tx
            )}&reason=pedido_not_found`
        );
    }

    /* ========================================================
   F1 SPHERE MARKETPLACE
======================================================== */

    if (
        result.tipo ===
        "marketplace"
    ) {

        let status =
            "pendiente";


        if (
            result.approved
        ) {

            status =
                "pagado";

        } else if (
            "reversed" in result &&
            result.reversed
        ) {

            status =
                "reversado";

        } else if (
            !result.pending
        ) {

            status =
                "fallido";
        }


        return html200Redirect(
            `/marketplace/pago/${result.orderId}?status=${status}`
        );
    }

    /* ========================================================
       BARUK SHOP
    ======================================================== */

    if (
        result.tipo ===
        "shop"
    ) {
        let status =
            "pendiente";


        if (
            result.approved
        ) {
            status =
                "pagado";

        } else if (
            "reversed" in result &&
            result.reversed
        ) {
            status =
                "reversado";

        } else if (
            !result.pending
        ) {
            status =
                "fallido";
        }


        return html200Redirect(
            `/tienda/pago/${result.pedidoId}?status=${status}`
        );
    }


    /* ========================================================
   EXPERIENCE PASS / BARUK CARDS
======================================================== */

    if (
        result.approved
    ) {

        return html200Redirect(
            `/pago-exitoso?tx=${encodeURIComponent(
                tx
            )}&status=approved`
        );
    }


    if (
        result.pending
    ) {

        return html200Redirect(
            `/pago-exitoso?tx=${encodeURIComponent(
                tx
            )}&status=pending`
        );
    }


    /*
     * Si PayPhone no fue aprobado,
     * hubo diferencia de monto/moneda
     * o el pago fue reversado,
     * nunca mostramos pago exitoso.
     */

    return html200Redirect(
        `/pago-fallido?tx=${encodeURIComponent(
            tx
        )}&reason=payment_validation_failed`
    );
}


/* ============================================================
   POST OPCIONAL
============================================================ */

export async function POST(
    req: NextRequest
) {
    const body =
        await req
            .json()
            .catch(
                () => ({})
            );


    const id =
        parseId(
            body?.id ??
            body?.payphoneId
        );


    const tx =
        parseTx(
            body?.clientTransactionId ??
            body?.clientTxId
        );


    if (
        !id ||
        !tx
    ) {
        return NextResponse.json(
            {
                ok: false,
                error:
                    "missing_params",
            },
            {
                status: 200,
            }
        );
    }


    const result =
        await processPayment(
            id,
            tx
        );


    return NextResponse.json(
        result,
        {
            status: 200,
        }
    );
}