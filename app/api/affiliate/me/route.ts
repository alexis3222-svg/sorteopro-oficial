// app/api/affiliate/me/route.ts

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
   SITE URL
============================================================ */

function getSiteUrl(
    req: NextRequest
) {

    return (
        process.env
            .NEXT_PUBLIC_SITE_URL ||
        req.nextUrl.origin ||
        "https://www.baruk593.com"
    )
        .replace(
            /\/+$/,
            ""
        );
}


/* ============================================================
   BILLETERA
============================================================ */

async function getWallet(
    userId: string
) {

    const {
        data,
        error,
    } =
        await supabaseAdmin
            .from(
                "marketplace_wallets"
            )
            .select(`
                available_balance,
                pending_balance,
                updated_at
            `)
            .eq(
                "user_id",
                userId
            )
            .maybeSingle();


    if (
        error
    ) {

        console.error(
            "Error leyendo billetera:",
            error
        );

        return {
            availableBalance:
                0,

            pendingBalance:
                0,

            updatedAt:
                null,
        };
    }


    return {

        availableBalance:
            Number(
                data
                    ?.available_balance ??
                0
            ),

        pendingBalance:
            Number(
                data
                    ?.pending_balance ??
                0
            ),

        updatedAt:
            data
                ?.updated_at ??
            null,
    };
}


/* ============================================================
   RESUMEN DE VENTAS DE AFILIADO
============================================================ */

async function getAffiliateSalesSummary(
    affiliateId: string
) {

    const {
        data,
        error,
    } =
        await supabaseAdmin
            .from(
                "affiliate_sales"
            )
            .select(`
                id,
                monto_pedido,
                comision,
                status
            `)
            .eq(
                "affiliate_id",
                affiliateId
            );


    if (
        error
    ) {

        console.error(
            "Error leyendo ventas de afiliado:",
            error
        );

        return {
            totalSales:
                0,

            totalGenerated:
                0,

            totalCommission:
                0,
        };
    }


    const rows =
        data ??
        [];


    const totalGenerated =
        rows.reduce(
            (
                total,
                row
            ) =>
                total +
                Number(
                    row
                        .monto_pedido ??
                    0
                ),

            0
        );


    const totalCommission =
        rows.reduce(
            (
                total,
                row
            ) =>
                total +
                Number(
                    row
                        .comision ??
                    0
                ),

            0
        );


    return {

        totalSales:
            rows.length,

        totalGenerated,

        totalCommission,
    };
}


/* ============================================================
   RESPUESTA DEL PERFIL
============================================================ */

async function buildAffiliateResponse(
    req: NextRequest,
    affiliate: {
        id: string;
        user_id: string | null;
        display_name: string | null;
        code: string;
        whatsapp: string | null;
        email: string | null;
        status: string;
        is_active: boolean | null;
        commission_rate: number | string | null;
        created_at: string | null;
    },
    userId: string
) {

    const siteUrl =
        getSiteUrl(
            req
        );


    const referralUrl =
        `${siteUrl}/?ref=${encodeURIComponent(
            affiliate.code
        )}`;


    const sales =
        await getAffiliateSalesSummary(
            affiliate.id
        );


    const wallet =
        await getWallet(
            userId
        );


    return NextResponse.json({

        ok:
            true,

        active:
            true,

        suspended:
            false,

        affiliate: {

            id:
                affiliate.id,

            userId:
                affiliate.user_id ??
                userId,

            displayName:
                affiliate.display_name,

            code:
                affiliate.code,

            whatsapp:
                affiliate.whatsapp,

            email:
                affiliate.email,

            status:
                affiliate.status,

            isActive:
                affiliate.is_active !==
                false,

            commissionRate:
                Number(
                    affiliate
                        .commission_rate ??
                    0.10
                ),

            createdAt:
                affiliate.created_at,
        },


        referralUrl,


        sales,


        wallet,
    });
}


/* ============================================================
   OBTENER USUARIO AUTENTICADO
   SUPABASE AUTH / MI CUENTA
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

        return {
            user:
                null,

            error:
                NextResponse.json(
                    {
                        ok:
                            false,

                        error:
                            "Debes iniciar sesión en Mi Cuenta",
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

            error:
                NextResponse.json(
                    {
                        ok:
                            false,

                        error:
                            "La sesión no es válida",
                    },
                    {
                        status:
                            401,
                    }
                ),
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
            user:
                null,

            error:
                NextResponse.json(
                    {
                        ok:
                            false,

                        error:
                            "Tu sesión ha expirado",
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
            userData.user,

        error:
            null,
    };
}


/* ============================================================
   GET
   SISTEMA ÚNICO:
   SUPABASE AUTH + MI CUENTA
============================================================ */

export async function GET(
    req: NextRequest
) {

    try {

        /* =====================================================
           1. VALIDAR SESIÓN
        ===================================================== */

        const {
            user,
            error:
            authError,
        } =
            await getAuthenticatedUser(
                req
            );


        if (
            authError
        ) {

            return authError;
        }


        if (
            !user
        ) {

            return NextResponse.json(
                {
                    ok:
                        false,

                    error:
                        "No existe una sesión válida",
                },
                {
                    status:
                        401,
                }
            );
        }


        /* =====================================================
           2. BUSCAR AFILIADO POR user_id
        ===================================================== */

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
                    user_id,
                    display_name,
                    code,
                    whatsapp,
                    email,
                    status,
                    is_active,
                    commission_rate,
                    created_at
                `)
                .eq(
                    "user_id",
                    user.id
                )
                .maybeSingle();


        if (
            affiliateError
        ) {

            console.error(
                "Error consultando afiliado por user_id:",
                affiliateError
            );


            return NextResponse.json(
                {
                    ok:
                        false,

                    error:
                        "No se pudo consultar tu perfil de afiliado",
                },
                {
                    status:
                        500,
                }
            );
        }


        /* =====================================================
           3. TODAVÍA NO ES AFILIADO

           No es un error.
           La página mostrará "Activa tu perfil".
        ===================================================== */

        if (
            !affiliate
        ) {

            const wallet =
                await getWallet(
                    user.id
                );


            return NextResponse.json({

                ok:
                    true,

                active:
                    false,

                suspended:
                    false,

                affiliate:
                    null,

                referralUrl:
                    null,

                sales: {

                    totalSales:
                        0,

                    totalGenerated:
                        0,

                    totalCommission:
                        0,
                },

                wallet,
            });
        }


        /* =====================================================
           4. AFILIADO SUSPENDIDO / INACTIVO
        ===================================================== */

        if (
            affiliate.is_active ===
            false ||
            affiliate.status !==
            "active"
        ) {

            const wallet =
                await getWallet(
                    user.id
                );


            return NextResponse.json({

                ok:
                    true,

                active:
                    false,

                suspended:
                    true,

                affiliate: {

                    id:
                        affiliate.id,

                    userId:
                        affiliate.user_id,

                    displayName:
                        affiliate.display_name,

                    code:
                        affiliate.code,

                    whatsapp:
                        affiliate.whatsapp,

                    email:
                        affiliate.email,

                    status:
                        affiliate.status,

                    isActive:
                        affiliate.is_active !==
                        false,

                    commissionRate:
                        Number(
                            affiliate
                                .commission_rate ??
                            0.10
                        ),

                    createdAt:
                        affiliate.created_at,
                },

                referralUrl:
                    null,

                sales: {

                    totalSales:
                        0,

                    totalGenerated:
                        0,

                    totalCommission:
                        0,
                },

                wallet,
            });
        }


        /* =====================================================
           5. AFILIADO ACTIVO
        ===================================================== */

        return await buildAffiliateResponse(
            req,
            affiliate,
            user.id
        );


    } catch (
    error:
        unknown
    ) {

        console.error(
            "affiliate/me error:",
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