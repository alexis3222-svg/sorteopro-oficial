// app/api/affiliate/me/route.ts

import {
    NextRequest,
    NextResponse,
} from "next/server";

import {
    cookies,
} from "next/headers";

import {
    supabaseAdmin,
} from "@/lib/supabaseAdmin";


export const runtime =
    "nodejs";

export const dynamic =
    "force-dynamic";


const LEGACY_COOKIE_NAME =
    "affiliate_session";


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
    affiliate: any,
    userId:
        string | null
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
        userId
            ? await getWallet(
                userId
            )

            : {
                availableBalance:
                    0,

                pendingBalance:
                    0,

                updatedAt:
                    null,
            };


    return NextResponse.json({

        ok:
            true,

        active:
            true,

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
   NUEVO SISTEMA
   SUPABASE AUTH / MI CUENTA
============================================================ */

async function getFromBarukAccount(
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


    if (
        !accessToken
    ) {

        return null;
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
                ok:
                    false,

                error:
                    "Tu sesión ha expirado",
            },
            {
                status:
                    401,
            }
        );
    }


    const user =
        userData.user;


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


    /*
     * MUY IMPORTANTE:
     *
     * No ser afiliado NO es un error.
     *
     * Mi Cuenta utilizará esta respuesta
     * para mostrar:
     *
     * "Activar mi perfil de afiliado".
     */

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


    if (
        affiliate.is_active ===
        false ||
        affiliate.status !==
        "active"
    ) {

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

                displayName:
                    affiliate.display_name,

                code:
                    affiliate.code,

                status:
                    affiliate.status,
            },
        });
    }


    return buildAffiliateResponse(
        req,
        affiliate,
        user.id
    );
}


/* ============================================================
   SISTEMA ANTIGUO
   COOKIE affiliate_session
============================================================ */

async function getFromLegacyAffiliateSession(
    req: NextRequest
) {

    const cookieStore =
        await cookies();


    const token =
        cookieStore
            .get(
                LEGACY_COOKIE_NAME
            )
            ?.value;


    if (
        !token
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


    const {
        data:
        session,

        error:
        sessionError,
    } =
        await supabaseAdmin
            .from(
                "affiliate_sessions"
            )
            .select(`
                affiliate_id,
                expires_at,
                revoked_at
            `)
            .eq(
                "token",
                token
            )
            .maybeSingle();


    if (
        sessionError ||
        !session
    ) {

        return NextResponse.json(
            {
                ok:
                    false,
            },
            {
                status:
                    401,
            }
        );
    }


    const expiresAt =
        new Date(
            session.expires_at
        ).getTime();


    if (
        session.revoked_at !==
        null ||
        !Number.isFinite(
            expiresAt
        ) ||
        expiresAt <=
        Date.now()
    ) {

        return NextResponse.json(
            {
                ok:
                    false,
            },
            {
                status:
                    401,
            }
        );
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
                user_id,
                username,
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
                "id",
                session.affiliate_id
            )
            .maybeSingle();


    if (
        affiliateError ||
        !affiliate ||
        affiliate.is_active ===
        false
    ) {

        return NextResponse.json(
            {
                ok:
                    false,
            },
            {
                status:
                    401,
            }
        );
    }


    /*
     * Conservamos temporalmente
     * username para la página antigua.
     */

    const response =
        await buildAffiliateResponse(
            req,
            affiliate,
            affiliate.user_id ??
            null
        );


    return response;
}


/* ============================================================
   GET
============================================================ */

export async function GET(
    req: NextRequest
) {

    try {

        /* =====================================================
           1. NUEVA MI CUENTA
        ===================================================== */

        const newAccountResponse =
            await getFromBarukAccount(
                req
            );


        if (
            newAccountResponse
        ) {

            return newAccountResponse;
        }


        /* =====================================================
           2. COMPATIBILIDAD CON /afiliado
        ===================================================== */

        return await getFromLegacyAffiliateSession(
            req
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