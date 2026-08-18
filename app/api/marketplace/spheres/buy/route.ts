// app/api/marketplace/spheres/buy/route.ts

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


export async function POST(
    req: NextRequest
) {
    try {

        /* =====================================================
           SESIÓN
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
                        "Debes iniciar sesión para comprar una F1 Sphere",
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
           BODY
        ===================================================== */

        const body =
            await req
                .json()
                .catch(
                    () => ({})
                );


        const listingId =
            String(
                body
                    ?.listingId ??
                ""
            ).trim();


        if (!listingId) {
            return NextResponse.json(
                {
                    ok: false,

                    error:
                        "La publicación no es válida",
                },
                {
                    status: 400,
                }
            );
        }


        /* =====================================================
           CREAR ORDEN
        ===================================================== */

        const {
            data:
            orderData,

            error:
            orderError,
        } =
            await supabaseAdmin
                .rpc(
                    "create_sphere_marketplace_order",
                    {
                        p_buyer_user_id:
                            user.id,

                        p_listing_id:
                            listingId,
                    }
                );


        if (orderError) {

            console.error(
                "create marketplace order:",
                orderError
            );


            const message =
                orderError.message ??
                "";


            if (
                message.includes(
                    "SELF_PURCHASE_NOT_ALLOWED"
                )
            ) {
                return NextResponse.json(
                    {
                        ok: false,

                        error:
                            "No puedes comprar tu propia F1 Sphere",
                    },
                    {
                        status: 409,
                    }
                );
            }


            if (
                message.includes(
                    "LISTING_NOT_AVAILABLE"
                )
            ) {
                return NextResponse.json(
                    {
                        ok: false,

                        error:
                            "Esta F1 Sphere ya no está disponible",
                    },
                    {
                        status: 409,
                    }
                );
            }


            return NextResponse.json(
                {
                    ok: false,

                    error:
                        "No se pudo iniciar la compra",
                },
                {
                    status: 500,
                }
            );
        }


        const order =
            Array.isArray(
                orderData
            )
                ? orderData[0]
                : orderData;


        if (!order) {
            return NextResponse.json(
                {
                    ok: false,

                    error:
                        "No se pudo crear la orden",
                },
                {
                    status: 500,
                }
            );
        }


        /* =====================================================
           OBTENER TX PAYPHONE GENERADA EN BD
        ===================================================== */

        const {
            data:
            storedOrder,

            error:
            storedOrderError,
        } =
            await supabaseAdmin
                .from(
                    "sphere_marketplace_orders"
                )
                .select(`
                    id,
                    payphone_client_transaction_id
                `)
                .eq(
                    "id",
                    order.order_id
                )
                .single();


        if (
            storedOrderError ||
            !storedOrder
        ) {

            console.error(
                "No se pudo recuperar marketplace order:",
                storedOrderError
            );

            return NextResponse.json(
                {
                    ok: false,

                    error:
                        "La orden fue creada, pero no se pudo preparar PayPhone",
                },
                {
                    status: 500,
                }
            );
        }


        return NextResponse.json({

            ok: true,

            order: {

                id:
                    order.order_id,

                listingId:
                    order.listing_id,

                sphereInstanceId:
                    order.sphere_instance_id,

                price:
                    Number(
                        order.price
                    ),

                currency:
                    order.currency,

                reservedUntil:
                    order.reserved_until,

                clientTransactionId:
                    storedOrder
                        .payphone_client_transaction_id,
            },

            paymentUrl:
                `/payphone/marketplace/${order.order_id}`,
        });


    } catch (
    error:
        unknown
    ) {

        console.error(
            "marketplace buy error:",
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