// app/api/marketplace/wallet/route.ts

import {
    NextRequest,
    NextResponse,
} from "next/server";

import {
    supabaseAdmin,
} from "@/lib/supabaseAdmin";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";


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
        return null;
    }

    const accessToken =
        authorization
            .replace(
                "Bearer ",
                ""
            )
            .trim();

    if (!accessToken) {
        return null;
    }

    const {
        data,
        error,
    } =
        await supabaseAdmin
            .auth
            .getUser(
                accessToken
            );

    if (
        error ||
        !data.user
    ) {
        return null;
    }

    return data.user;
}


export async function GET(
    req: NextRequest
) {
    try {

        const user =
            await getAuthenticatedUser(
                req
            );


        if (!user) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Tu sesión no es válida",
                },
                {
                    status: 401,
                }
            );
        }


        /* =====================================================
           ASEGURAR BILLETERA
        ===================================================== */

        const {
            error:
            walletCreateError,
        } =
            await supabaseAdmin
                .from(
                    "marketplace_wallets"
                )
                .upsert(
                    {
                        user_id:
                            user.id,
                    },
                    {
                        onConflict:
                            "user_id",

                        ignoreDuplicates:
                            true,
                    }
                );


        if (
            walletCreateError
        ) {
            throw walletCreateError;
        }


        /* =====================================================
           BILLETERA
        ===================================================== */

        const {
            data:
            wallet,

            error:
            walletError,
        } =
            await supabaseAdmin
                .from(
                    "marketplace_wallets"
                )
                .select(`
                    user_id,
                    available_balance,
                    pending_balance,
                    updated_at
                `)
                .eq(
                    "user_id",
                    user.id
                )
                .single();


        if (
            walletError ||
            !wallet
        ) {
            throw walletError ??
            new Error(
                "No se pudo cargar la billetera"
            );
        }


        /* =====================================================
           CONFIGURACIÓN
        ===================================================== */

        const {
            data:
            settings,
        } =
            await supabaseAdmin
                .from(
                    "marketplace_settings"
                )
                .select(`
                    commission_rate,
                    min_withdrawal_amount
                `)
                .eq(
                    "setting_key",
                    "sphere_marketplace"
                )
                .maybeSingle();


        /* =====================================================
           CUENTA BANCARIA PREDETERMINADA
        ===================================================== */

        const {
            data:
            payoutAccount,
        } =
            await supabaseAdmin
                .from(
                    "marketplace_payout_accounts"
                )
                .select(`
                    id,
                    bank_name,
                    account_type,
                    account_number,
                    account_holder,
                    identification,
                    is_default,
                    updated_at
                `)
                .eq(
                    "user_id",
                    user.id
                )
                .eq(
                    "is_default",
                    true
                )
                .maybeSingle();


        /* =====================================================
           VENTAS COMPLETADAS
        ===================================================== */

        const {
            data:
            salesData,

            error:
            salesError,
        } =
            await supabaseAdmin
                .from(
                    "sphere_marketplace_orders"
                )
                .select(`
                    id,
                    price,
                    commission_amount,
                    seller_amount,
                    completed_at
                `)
                .eq(
                    "seller_user_id",
                    user.id
                )
                .eq(
                    "status",
                    "completed"
                )
                .order(
                    "completed_at",
                    {
                        ascending:
                            false,
                    }
                );


        if (salesError) {
            throw salesError;
        }


        const sales =
            salesData ??
            [];


        const totalSold =
            sales.reduce(
                (
                    total,
                    sale
                ) =>
                    total +
                    Number(
                        sale.price ??
                        0
                    ),
                0
            );


        const totalEarned =
            sales.reduce(
                (
                    total,
                    sale
                ) =>
                    total +
                    Number(
                        sale.seller_amount ??
                        0
                    ),
                0
            );


        const totalCommission =
            sales.reduce(
                (
                    total,
                    sale
                ) =>
                    total +
                    Number(
                        sale.commission_amount ??
                        0
                    ),
                0
            );


        /* =====================================================
           RETIROS
        ===================================================== */

        const {
            data:
            withdrawalsData,

            error:
            withdrawalsError,
        } =
            await supabaseAdmin
                .from(
                    "marketplace_withdrawals"
                )
                .select(`
                    id,
                    amount,
                    status,
                    bank_name,
                    account_type,
                    account_number,
                    requested_at,
                    paid_at,
                    rejected_at,
                    admin_notes
                `)
                .eq(
                    "user_id",
                    user.id
                )
                .order(
                    "requested_at",
                    {
                        ascending:
                            false,
                    }
                )
                .limit(
                    20
                );


        if (
            withdrawalsError
        ) {
            throw withdrawalsError;
        }


        const withdrawals =
            withdrawalsData ??
            [];


        const totalWithdrawn =
            withdrawals
                .filter(
                    item =>
                        item.status ===
                        "paid"
                )
                .reduce(
                    (
                        total,
                        item
                    ) =>
                        total +
                        Number(
                            item.amount ??
                            0
                        ),
                    0
                );


        /* =====================================================
           RESPUESTA
        ===================================================== */

        return NextResponse.json({

            ok: true,

            wallet: {

                availableBalance:
                    Number(
                        wallet
                            .available_balance ??
                        0
                    ),

                pendingBalance:
                    Number(
                        wallet
                            .pending_balance ??
                        0
                    ),

                updatedAt:
                    wallet.updated_at,
            },

            settings: {

                commissionRate:
                    Number(
                        settings
                            ?.commission_rate ??
                        0.10
                    ),

                minWithdrawalAmount:
                    Number(
                        settings
                            ?.min_withdrawal_amount ??
                        10
                    ),
            },

            summary: {

                completedSales:
                    sales.length,

                totalSold,

                totalEarned,

                totalCommission,

                totalWithdrawn,
            },

            payoutAccount:
                payoutAccount
                    ? {

                        id:
                            payoutAccount.id,

                        bankName:
                            payoutAccount
                                .bank_name,

                        accountType:
                            payoutAccount
                                .account_type,

                        /*
                         * No mandamos el número completo
                         * para mostrarlo en pantalla.
                         */
                        accountNumberMasked:
                            payoutAccount
                                .account_number
                                .length >
                                4
                                ? `•••• ${payoutAccount.account_number.slice(
                                    -4
                                )}`
                                : payoutAccount
                                    .account_number,

                        accountHolder:
                            payoutAccount
                                .account_holder,

                        identification:
                            payoutAccount
                                .identification,

                        isDefault:
                            payoutAccount
                                .is_default,
                    }
                    : null,

            sales,

            withdrawals:
                withdrawals.map(
                    item => ({

                        id:
                            item.id,

                        amount:
                            Number(
                                item.amount
                            ),

                        status:
                            item.status,

                        bankName:
                            item.bank_name,

                        accountType:
                            item.account_type,

                        accountNumberMasked:
                            item
                                .account_number
                                .length >
                                4
                                ? `•••• ${item.account_number.slice(
                                    -4
                                )}`
                                : item
                                    .account_number,

                        requestedAt:
                            item
                                .requested_at,

                        paidAt:
                            item
                                .paid_at,

                        rejectedAt:
                            item
                                .rejected_at,

                        adminNotes:
                            item
                                .admin_notes,
                    })
                ),
        });


    } catch (
    error:
        unknown
    ) {

        console.error(
            "marketplace wallet GET:",
            error
        );


        return NextResponse.json(
            {
                ok: false,

                error:
                    error instanceof
                        Error
                        ? error.message
                        : "No se pudo cargar la billetera",
            },
            {
                status: 500,
            }
        );
    }
}