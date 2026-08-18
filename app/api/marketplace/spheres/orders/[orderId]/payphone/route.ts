// app/api/marketplace/spheres/orders/[orderId]/payphone/route.ts

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


const PAYPHONE_GRACE_MINUTES =
    5;


/* ============================================================
   GET
============================================================ */

export async function GET(
    req: NextRequest,
    context: {
        params:
        Promise<{
            orderId: string;
        }>;
    }
) {

    try {

        const {
            orderId,
        } =
            await context.params;


        if (!orderId) {

            return NextResponse.json(
                {
                    ok: false,

                    error:
                        "La orden no es válida",
                },
                {
                    status: 400,
                }
            );
        }


        /* =====================================================
           1. SESIÓN
        ===================================================== */

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
                        "Debes iniciar sesión",
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
                        "La sesión no es válida",
                },
                {
                    status: 401,
                }
            );
        }


        const {
            data:
            userData,

            error:
            userError,
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
                        "Tu sesión ha expirado",
                },
                {
                    status: 401,
                }
            );
        }


        const user =
            userData.user;


        /* =====================================================
           2. LIMPIAR RESERVAS VENCIDAS
        ===================================================== */

        const {
            error:
            cleanupError,
        } =
            await supabaseAdmin
                .rpc(
                    "release_expired_sphere_marketplace_reservations"
                );


        if (
            cleanupError
        ) {

            /*
             * No detenemos inmediatamente la consulta.
             *
             * Más abajo validamos también
             * reserved_until directamente.
             */

            console.error(
                "No se pudieron limpiar reservas Marketplace:",
                cleanupError
            );
        }


        /* =====================================================
           3. OBTENER ORDEN
        ===================================================== */

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
                    currency,
                    status,
                    payphone_client_transaction_id,
                    created_at
                `)
                .eq(
                    "id",
                    orderId
                )
                .maybeSingle();


        if (
            orderError ||
            !order
        ) {

            return NextResponse.json(
                {
                    ok: false,

                    error:
                        "La orden no existe",
                },
                {
                    status: 404,
                }
            );
        }


        /* =====================================================
           4. VALIDAR PROPIETARIO DE LA ORDEN
        ===================================================== */

        if (
            order.buyer_user_id !==
            user.id
        ) {

            return NextResponse.json(
                {
                    ok: false,

                    error:
                        "Esta orden no te pertenece",
                },
                {
                    status: 403,
                }
            );
        }


        /* =====================================================
           5. VALIDAR ESTADO
        ===================================================== */

        if (
            order.status !==
            "pending"
        ) {

            return NextResponse.json(
                {
                    ok: false,

                    error:
                        order.status ===
                            "expired"

                            ? "La reserva de esta esfera ha expirado"

                            : order.status ===
                                "completed"

                                ? "Esta compra ya fue completada"

                                : "Esta orden ya no está disponible para pagar",
                },
                {
                    status: 409,
                }
            );
        }


        /* =====================================================
           6. VALIDAR CLIENT TRANSACTION ID
        ===================================================== */

        const clientTransactionId =
            String(
                order
                    .payphone_client_transaction_id ??
                ""
            ).trim();


        if (
            !clientTransactionId
        ) {

            console.error(
                "Marketplace order sin PayPhone client transaction:",
                order.id
            );


            return NextResponse.json(
                {
                    ok: false,

                    error:
                        "La orden no está preparada correctamente para PayPhone",
                },
                {
                    status: 500,
                }
            );
        }


        /* =====================================================
           7. LISTING / RESERVA
        ===================================================== */

        const {
            data:
            listing,

            error:
            listingError,
        } =
            await supabaseAdmin
                .from(
                    "sphere_marketplace_listings"
                )
                .select(`
                    id,
                    status,
                    reserved_by_user_id,
                    reserved_order_id,
                    reserved_until
                `)
                .eq(
                    "id",
                    order.listing_id
                )
                .maybeSingle();


        if (
            listingError ||
            !listing
        ) {

            return NextResponse.json(
                {
                    ok: false,

                    error:
                        "La reserva ya no está disponible",
                },
                {
                    status: 409,
                }
            );
        }


        /* =====================================================
           8. VALIDAR QUE LA RESERVA SEA DE ESTA ORDEN
        ===================================================== */

        if (
            listing.status !==
            "reserved" ||
            listing.reserved_order_id !==
            order.id ||
            listing.reserved_by_user_id !==
            user.id
        ) {

            return NextResponse.json(
                {
                    ok: false,

                    error:
                        "La reserva ya no está disponible",
                },
                {
                    status: 409,
                }
            );
        }


        /* =====================================================
           9. VALIDAR VENCIMIENTO DIRECTAMENTE
        ===================================================== */

        if (
            !listing.reserved_until
        ) {

            return NextResponse.json(
                {
                    ok: false,

                    error:
                        "La reserva no tiene una fecha de vencimiento válida",
                },
                {
                    status: 409,
                }
            );
        }


        const reservedUntilMs =
            new Date(
                listing.reserved_until
            ).getTime();


        const graceMs =
            PAYPHONE_GRACE_MINUTES *
            60 *
            1000;


        if (
            !Number.isFinite(
                reservedUntilMs
            ) ||
            Date.now() >=
            reservedUntilMs +
            graceMs
        ) {

            return NextResponse.json(
                {
                    ok: false,

                    error:
                        "La reserva de esta esfera ha expirado",
                },
                {
                    status: 409,
                }
            );
        }


        /* =====================================================
           10. PRECIO
        ===================================================== */

        const price =
            Number(
                order.price
            );


        if (
            !Number.isFinite(
                price
            ) ||
            price <= 0
        ) {

            console.error(
                "Marketplace order con precio inválido:",
                {
                    orderId:
                        order.id,

                    price:
                        order.price,
                }
            );


            return NextResponse.json(
                {
                    ok: false,

                    error:
                        "El precio de esta orden no es válido",
                },
                {
                    status: 500,
                }
            );
        }


        /* =====================================================
           11. MONEDA
        ===================================================== */

        const currency =
            String(
                order.currency ??
                "USD"
            )
                .trim()
                .toUpperCase();


        /* =====================================================
           12. RESPUESTA SEGURA
        ===================================================== */

        return NextResponse.json({

            ok: true,

            order: {

                id:
                    order.id,

                price,

                amountInCents:
                    Math.round(
                        price *
                        100
                    ),

                currency,

                clientTransactionId,

                /*
                 * Seguimos devolviendo el límite
                 * normal de 15 minutos.
                 *
                 * Los 5 minutos extra son solamente
                 * una protección interna.
                 */
                reservedUntil:
                    listing
                        .reserved_until,
            },
        });


    } catch (
    error:
        unknown
    ) {

        console.error(
            "marketplace payphone order error:",
            error
        );


        return NextResponse.json(
            {
                ok: false,

                error:
                    error instanceof
                        Error

                        ? error.message

                        : "Error interno",
            },
            {
                status: 500,
            }
        );
    }
}