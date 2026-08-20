// app/api/affiliate/wallet/route.ts

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LEGACY_COOKIE_NAMES = [
    "affiliate_session",
    "affiliate_token",
    "affiliate",
];


/* ============================================================
   RESPUESTAS
============================================================ */

function unauthorized(message = "UNAUTHORIZED") {
    return NextResponse.json(
        {
            ok: false,
            error: message,
        },
        {
            status: 401,
        }
    );
}


/* ============================================================
   1. USUARIO DESDE MI CUENTA
   Bearer token de Supabase
============================================================ */

async function getUserIdFromBarukAccount(
    req: NextRequest
): Promise<string | null> {

    const authorization =
        req.headers.get("authorization");

    if (
        !authorization ||
        !authorization.startsWith("Bearer ")
    ) {
        return null;
    }

    const accessToken =
        authorization
            .replace("Bearer ", "")
            .trim();

    if (!accessToken) {
        return null;
    }

    const {
        data,
        error,
    } = await supabaseAdmin.auth.getUser(
        accessToken
    );

    if (
        error ||
        !data.user
    ) {
        throw new Error("SESSION_EXPIRED");
    }

    return data.user.id;
}


/* ============================================================
   2. USUARIO DESDE SESIÓN ANTIGUA DE AFILIADO

   Compatibilidad temporal con /afiliado
============================================================ */

async function getUserIdFromLegacyAffiliate():
    Promise<string | null> {

    const cookieStore =
        await cookies();

    let token = "";

    for (
        const cookieName
        of LEGACY_COOKIE_NAMES
    ) {

        const value =
            cookieStore
                .get(cookieName)
                ?.value;

        if (value) {
            token = value;
            break;
        }
    }

    if (!token) {
        return null;
    }


    /* --------------------------------------------------------
       Validar sesión antigua
    -------------------------------------------------------- */

    const {
        data: session,
        error: sessionError,
    } = await supabaseAdmin
        .from("affiliate_sessions")
        .select(`
            affiliate_id,
            expires_at,
            revoked_at
        `)
        .eq("token", token)
        .order(
            "created_at",
            {
                ascending: false,
            }
        )
        .limit(1)
        .maybeSingle();


    if (
        sessionError ||
        !session?.affiliate_id
    ) {
        return null;
    }


    if (
        session.revoked_at !== null
    ) {
        return null;
    }


    if (session.expires_at) {

        const expiresAt =
            new Date(
                session.expires_at
            ).getTime();

        if (
            !Number.isFinite(expiresAt) ||
            expiresAt <= Date.now()
        ) {
            return null;
        }
    }


    /* --------------------------------------------------------
       El afiliado antiguo debe estar vinculado
       a auth.users mediante user_id
    -------------------------------------------------------- */

    const {
        data: affiliate,
        error: affiliateError,
    } = await supabaseAdmin
        .from("affiliates")
        .select(`
            user_id,
            is_active,
            status
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
        affiliate.is_active === false ||
        affiliate.status === "suspended"
    ) {
        return null;
    }


    /*
     * Los perfiles antiguos que aún no tengan
     * user_id deberán activarse desde Mi Cuenta.
     */

    return affiliate.user_id ?? null;
}


/* ============================================================
   3. RESOLVER USUARIO
============================================================ */

async function resolveUserId(
    req: NextRequest
): Promise<string | null> {

    /*
     * Primero intentamos la nueva
     * sesión de Mi Cuenta.
     */

    const barukUserId =
        await getUserIdFromBarukAccount(
            req
        );

    if (barukUserId) {
        return barukUserId;
    }


    /*
     * Si no vino Bearer token,
     * intentamos la sesión antigua.
     */

    return await getUserIdFromLegacyAffiliate();
}


/* ============================================================
   4. ASEGURAR BILLETERA
============================================================ */

async function ensureWallet(
    userId: string
) {

    const {
        data: existingWallet,
        error: readError,
    } = await supabaseAdmin
        .from("marketplace_wallets")
        .select(`
            user_id,
            available_balance,
            pending_balance,
            updated_at
        `)
        .eq(
            "user_id",
            userId
        )
        .maybeSingle();


    if (readError) {
        throw readError;
    }


    if (existingWallet) {
        return existingWallet;
    }


    /* --------------------------------------------------------
       Crear billetera en cero
    -------------------------------------------------------- */

    const {
        error: insertError,
    } = await supabaseAdmin
        .from("marketplace_wallets")
        .insert({
            user_id: userId,
            available_balance: 0,
            pending_balance: 0,
            updated_at:
                new Date().toISOString(),
        });


    /*
     * 23505:
     * otro request pudo crearla simultáneamente.
     */

    if (
        insertError &&
        insertError.code !== "23505"
    ) {
        throw insertError;
    }


    /* --------------------------------------------------------
       Leer nuevamente
    -------------------------------------------------------- */

    const {
        data: createdWallet,
        error: createdReadError,
    } = await supabaseAdmin
        .from("marketplace_wallets")
        .select(`
            user_id,
            available_balance,
            pending_balance,
            updated_at
        `)
        .eq(
            "user_id",
            userId
        )
        .single();


    if (
        createdReadError ||
        !createdWallet
    ) {
        throw (
            createdReadError ??
            new Error(
                "No se pudo crear la billetera"
            )
        );
    }


    return createdWallet;
}


/* ============================================================
   GET
============================================================ */

export async function GET(
    req: NextRequest
) {

    try {

        /* ====================================================
           IDENTIFICAR USUARIO
        ==================================================== */

        const userId =
            await resolveUserId(
                req
            );


        if (!userId) {

            return unauthorized(
                "Debes iniciar sesión en Mi Cuenta"
            );
        }


        /* ====================================================
           BILLETERA ÚNICA BARUK593
        ==================================================== */

        const wallet =
            await ensureWallet(
                userId
            );


        const availableBalance =
            Number(
                wallet.available_balance ??
                0
            );


        const pendingBalance =
            Number(
                wallet.pending_balance ??
                0
            );


        /*
         * Durante la migración devolvemos
         * DOS nomenclaturas:
         *
         * NUEVA:
         * available_balance
         * pending_balance
         *
         * ANTIGUA:
         * balance_available
         * balance_pending
         *
         * Así la página /afiliado no se rompe todavía.
         */

        return NextResponse.json({

            ok: true,

            wallet: {

                /* NUEVO SISTEMA */

                available_balance:
                    availableBalance,

                pending_balance:
                    pendingBalance,

                updated_at:
                    wallet.updated_at,


                /* COMPATIBILIDAD ANTIGUA */

                balance_available:
                    availableBalance,

                balance_pending:
                    pendingBalance,

                balance_withdrawn:
                    0,

                balance:
                    availableBalance +
                    pendingBalance,
            },
        });


    } catch (
    error: unknown
    ) {

        console.error(
            "affiliate/wallet error:",
            error
        );


        if (
            error instanceof Error &&
            error.message ===
            "SESSION_EXPIRED"
        ) {

            return unauthorized(
                "Tu sesión ha expirado"
            );
        }


        return NextResponse.json(
            {
                ok: false,

                error:
                    error instanceof Error
                        ? error.message
                        : "Error interno",
            },
            {
                status: 500,
            }
        );
    }
}