// app/api/marketplace/spheres/cancel/route.ts

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
           CANCELAR
        ===================================================== */

        const {
            data:
            cancelled,

            error:
            cancelError,
        } =
            await supabaseAdmin
                .rpc(
                    "admin_cancel_sphere_marketplace_listing",
                    {
                        p_user_id:
                            user.id,

                        p_listing_id:
                            listingId,
                    }
                );


        if (cancelError) {

            console.error(
                "Error retirando publicación:",
                cancelError
            );


            const message =
                cancelError.message ??
                "";


            if (
                message.includes(
                    "NOT_LISTING_OWNER"
                )
            ) {

                return NextResponse.json(
                    {
                        ok: false,
                        error:
                            "Esta publicación no te pertenece",
                    },
                    {
                        status: 403,
                    }
                );
            }


            if (
                message.includes(
                    "LISTING_NOT_ACTIVE"
                )
            ) {

                return NextResponse.json(
                    {
                        ok: false,
                        error:
                            "La publicación ya no está activa",
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
                        "No se pudo retirar la publicación",
                },
                {
                    status: 500,
                }
            );
        }


        return NextResponse.json({

            ok:
                Boolean(
                    cancelled
                ),

            message:
                "F1 Sphere retirada del Marketplace",
        });


    } catch (
    error:
        unknown
    ) {

        console.error(
            "marketplace cancel error:",
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