// app/api/affiliate/qr/route.ts

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
   QR
============================================================ */

function buildQrUrl(
    text: string,
    size = 420
) {

    const data =
        encodeURIComponent(
            text
        );


    return (
        `https://api.qrserver.com/v1/create-qr-code/` +
        `?size=${size}x${size}` +
        `&data=${data}`
    );
}


/* ============================================================
   URL OFICIAL BARUK593
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
   OBTENER AFFILIATE DESDE MI CUENTA
============================================================ */

async function getAffiliateFromBarukAccount(
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

        throw new Error(
            "SESSION_EXPIRED"
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
                code,
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

        console.error(
            "Error consultando afiliado desde Mi Cuenta:",
            affiliateError
        );


        throw new Error(
            "AFFILIATE_READ_ERROR"
        );
    }


    if (
        !affiliate
    ) {

        throw new Error(
            "AFFILIATE_NOT_ACTIVE"
        );
    }


    if (
        affiliate.is_active ===
        false ||
        affiliate.status !==
        "active"
    ) {

        throw new Error(
            "AFFILIATE_NOT_ACTIVE"
        );
    }


    return affiliate;
}


/* ============================================================
   OBTENER AFFILIATE DESDE SISTEMA ANTIGUO
============================================================ */

async function getAffiliateFromLegacySession() {

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

        return null;
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

        return null;
    }


    if (
        session.revoked_at !==
        null
    ) {

        return null;
    }


    const expiresAt =
        new Date(
            session.expires_at
        ).getTime();


    if (
        !Number.isFinite(
            expiresAt
        ) ||
        expiresAt <=
        Date.now()
    ) {

        return null;
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
                code,
                username,
                status,
                is_active
            `)
            .eq(
                "id",
                session.affiliate_id
            )
            .maybeSingle();


    if (
        affiliateError ||
        !affiliate
    ) {

        return null;
    }


    if (
        affiliate.is_active ===
        false
    ) {

        return null;
    }


    return affiliate;
}


/* ============================================================
   GET
============================================================ */

export async function GET(
    req: NextRequest
) {

    try {

        /* =====================================================
           1. INTENTAR NUEVA SESIÓN DE MI CUENTA
        ===================================================== */

        let affiliate:
            any =
            null;


        const authorization =
            req.headers.get(
                "authorization"
            );


        if (
            authorization?.startsWith(
                "Bearer "
            )
        ) {

            affiliate =
                await getAffiliateFromBarukAccount(
                    req
                );

        } else {

            /* =================================================
               2. COMPATIBILIDAD CON SISTEMA ANTIGUO
            ================================================= */

            affiliate =
                await getAffiliateFromLegacySession();
        }


        if (
            !affiliate
        ) {

            return NextResponse.json(
                {
                    ok:
                        false,

                    error:
                        "No existe un perfil de afiliado activo",
                },
                {
                    status:
                        401,
                }
            );
        }


        /* =====================================================
           3. CÓDIGO
        ===================================================== */

        const code =
            String(
                affiliate.code ??
                affiliate.username ??
                ""
            )
                .trim();


        if (
            !code
        ) {

            return NextResponse.json(
                {
                    ok:
                        false,

                    error:
                        "Tu perfil de afiliado todavía no tiene un código válido",
                },
                {
                    status:
                        400,
                }
            );
        }


        /* =====================================================
           4. ENLACE DE REFERIDO
        ===================================================== */

        const siteUrl =
            getSiteUrl(
                req
            );


        const referralUrl =
            `${siteUrl}/?ref=${encodeURIComponent(
                code
            )}`;


        /* =====================================================
           5. QR
        ===================================================== */

        const qrUrl =
            buildQrUrl(
                referralUrl,
                420
            );


        /*
         * Conservamos el comportamiento actual:
         *
         * /api/affiliate/qr
         *
         * devuelve directamente la imagen PNG.
         */

        return NextResponse.redirect(
            qrUrl
        );


    } catch (
    error:
        unknown
    ) {

        console.error(
            "affiliate/qr error:",
            error
        );


        const message =
            error instanceof
                Error
                ? error.message
                : "";


        if (
            message ===
            "SESSION_EXPIRED"
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


        if (
            message ===
            "AFFILIATE_NOT_ACTIVE"
        ) {

            return NextResponse.json(
                {
                    ok:
                        false,

                    error:
                        "Primero activa tu perfil de afiliado desde Mi Cuenta",
                },
                {
                    status:
                        403,
                }
            );
        }


        return NextResponse.json(
            {
                ok:
                    false,

                error:
                    "No se pudo generar el QR",
            },
            {
                status:
                    500,
            }
        );
    }
}