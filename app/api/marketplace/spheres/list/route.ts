// app/api/marketplace/spheres/list/route.ts

import {
    NextRequest,
    NextResponse,
} from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";


export async function POST(
    req: NextRequest
) {
    try {

        /* =====================================================
           VALIDAR SESIÓN
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
                        "No existe una sesión válida",
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
                        "La sesión no es válida o ha expirado",
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
            await req.json();


        const sphereInstanceId =
            String(
                body
                    ?.sphereInstanceId ??
                ""
            ).trim();


        const price =
            Number(
                body
                    ?.price
            );


        if (!sphereInstanceId) {

            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Debes seleccionar una F1 Sphere",
                },
                {
                    status: 400,
                }
            );
        }


        if (
            !Number.isFinite(
                price
            ) ||
            price <= 0
        ) {

            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "El precio no es válido",
                },
                {
                    status: 400,
                }
            );
        }


        /*
         * Dos decimales máximo.
         */
        const normalizedPrice =
            Math.round(
                price *
                100
            ) /
            100;


        /* =====================================================
           EJECUTAR FUNCIÓN SEGURA
        ===================================================== */

        const {
            data:
            listingId,

            error:
            listingError,
        } =
            await supabaseAdmin
                .rpc(
                    "admin_create_sphere_marketplace_listing",
                    {
                        p_user_id:
                            user.id,

                        p_sphere_instance_id:
                            sphereInstanceId,

                        p_price:
                            normalizedPrice,
                    }
                );


        if (listingError) {

            console.error(
                "Error publicando F1 Sphere:",
                listingError
            );


            const message =
                listingError.message ??
                "";


            if (
                message.includes(
                    "NOT_SPHERE_OWNER"
                )
            ) {
                return NextResponse.json(
                    {
                        ok: false,
                        error:
                            "Esta F1 Sphere no te pertenece",
                    },
                    {
                        status: 403,
                    }
                );
            }


            if (
                message.includes(
                    "SPHERE_NOT_AVAILABLE"
                )
            ) {
                return NextResponse.json(
                    {
                        ok: false,
                        error:
                            "Esta F1 Sphere no está disponible para vender",
                    },
                    {
                        status: 409,
                    }
                );
            }


            if (
                message.includes(
                    "INVALID_PRICE"
                )
            ) {
                return NextResponse.json(
                    {
                        ok: false,
                        error:
                            "El precio no es válido",
                    },
                    {
                        status: 400,
                    }
                );
            }


            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "No se pudo publicar la F1 Sphere",
                },
                {
                    status: 500,
                }
            );
        }


        return NextResponse.json({

            ok: true,

            listingId,

            price:
                normalizedPrice,

            message:
                "F1 Sphere publicada correctamente",
        });


    } catch (
    error:
        unknown
    ) {

        console.error(
            "marketplace list error:",
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