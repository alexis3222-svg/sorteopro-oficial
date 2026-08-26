// app/api/affiliate/movements/route.ts

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
   OBTENER AFILIADO DESDE MI CUENTA
   SUPABASE AUTH
============================================================ */

async function getAffiliateFromSession(
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

        return {
            affiliateId:
                null,

            error:
                "Debes iniciar sesión en Mi Cuenta",
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
            affiliateId:
                null,

            error:
                "La sesión no es válida",
        };
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

        return {
            affiliateId:
                null,

            error:
                "Tu sesión ha expirado",
        };
    }


    const {
        data:
        affiliate,

        error:
        affiliateError,
    } =
        await supabaseAdmin
            .from(
                "affiliates"
            )
            .select(`
                id,
                status,
                is_active
            `)
            .eq(
                "user_id",
                userData.user.id
            )
            .maybeSingle();


    if (
        affiliateError
    ) {

        throw affiliateError;
    }


    if (
        !affiliate
    ) {

        return {
            affiliateId:
                null,

            error:
                "Tu cuenta todavía no es afiliada",
        };
    }


    if (
        affiliate.status !==
        "active" ||
        affiliate.is_active ===
        false
    ) {

        return {
            affiliateId:
                null,

            error:
                "Tu perfil de afiliado no está activo",
        };
    }


    return {
        affiliateId:
            affiliate.id,

        error:
            null,
    };
}


/* ============================================================
   GET
   HISTORIAL DE COMISIONES
============================================================ */

export async function GET(
    req: NextRequest
) {

    try {

        const {
            affiliateId,
            error:
            authError,
        } =
            await getAffiliateFromSession(
                req
            );


        if (
            !affiliateId
        ) {

            return NextResponse.json(
                {
                    ok:
                        false,

                    error:
                        authError ??
                        "No autorizado",
                },
                {
                    status:
                        401,
                }
            );
        }


        const {
            data,
            error,
        } =
            await supabaseAdmin
                .from(
                    "affiliate_commissions"
                )
                .select(`
                    id,
                    pedido_id,
                    base_total,
                    amount,
                    created_at
                `)
                .eq(
                    "affiliate_id",
                    affiliateId
                )
                .order(
                    "created_at",
                    {
                        ascending:
                            false,
                    }
                )
                .limit(
                    20
                );


        if (
            error
        ) {

            console.error(
                "Error cargando movimientos de afiliado:",
                error
            );


            return NextResponse.json(
                {
                    ok:
                        false,

                    error:
                        error.message,
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

            moves:
                data ??
                [],
        });


    } catch (
    error:
        unknown
    ) {

        console.error(
            "affiliate/movements:",
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