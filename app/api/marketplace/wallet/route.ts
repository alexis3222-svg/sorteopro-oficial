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


/* ============================================================
   AUTH
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


/* ============================================================
   GET
============================================================ */

export async function GET(
    req: NextRequest
) {

    try {

        /* =====================================================
           1. USUARIO
        ===================================================== */

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
           2. ASEGURAR BILLETERA
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
           3. BILLETERA
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

            throw (
                walletError ??
                new Error(
                    "No se pudo cargar la billetera"
                )
            );
        }


        /* =====================================================
           4. CONFIGURACIÓN GENERAL
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
           5. CUENTA BANCARIA PREDETERMINADA
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
           6. VENTAS DE F1 SPHERES
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


        if (
            salesError
        ) {

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


        const totalMarketplaceEarned =
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


        const totalMarketplaceCommission =
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
           7. MOVIMIENTOS DE LA BILLETERA BARUK593
        ===================================================== */

        const {
            data:
            transactionsData,

            error:
            transactionsError,
        } =
            await supabaseAdmin
                .from(
                    "marketplace_wallet_transactions"
                )
                .select(`
                    transaction_type,
                    amount,
                    reference,
                    description,
                    metadata,
                    created_at
                `)
                .eq(
                    "user_id",
                    user.id
                )
                .order(
                    "created_at",
                    {
                        ascending:
                            false,
                    }
                )
                .limit(
                    100
                );


        if (
            transactionsError
        ) {

            throw transactionsError;
        }


        const transactions =
            transactionsData ??
            [];


        /* =====================================================
           8. DESGLOSE DE INGRESOS
        ===================================================== */

        const affiliateCommissions =
            transactions
                .filter(
                    item =>
                        item.transaction_type ===
                        "affiliate_commission"
                )
                .reduce(
                    (
                        total,
                        item
                    ) =>
                        total +
                        Math.max(
                            Number(
                                item.amount ??
                                0
                            ),
                            0
                        ),

                    0
                );


        const marketplaceSales =
            transactions
                .filter(
                    item =>
                        item.transaction_type ===
                        "sale_credit"
                )
                .reduce(
                    (
                        total,
                        item
                    ) =>
                        total +
                        Math.max(
                            Number(
                                item.amount ??
                                0
                            ),
                            0
                        ),

                    0
                );


        const cashPrizes =
            transactions
                .filter(
                    item =>
                        item.transaction_type ===
                        "cash_prize"
                )
                .reduce(
                    (
                        total,
                        item
                    ) =>
                        total +
                        Math.max(
                            Number(
                                item.amount ??
                                0
                            ),
                            0
                        ),

                    0
                );


        const positiveAdjustments =
            transactions
                .filter(
                    item =>
                        item.transaction_type ===
                        "adjustment" &&
                        Number(
                            item.amount ??
                            0
                        ) > 0
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


        const negativeAdjustments =
            Math.abs(
                transactions
                    .filter(
                        item =>
                            item.transaction_type ===
                            "adjustment" &&
                            Number(
                                item.amount ??
                                0
                            ) < 0
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
                    )
            );


        const totalIncome =
            affiliateCommissions +
            marketplaceSales +
            cashPrizes +
            positiveAdjustments;


        /* =====================================================
           9. RETIROS
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


        const totalPendingWithdrawal =
            withdrawals
                .filter(
                    item =>
                        item.status ===
                        "pending" ||
                        item.status ===
                        "processing"
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
           10. MAPEAR MOVIMIENTOS
        ===================================================== */

        const movements =
            transactions.map(
                item => {

                    const amount =
                        Number(
                            item.amount ??
                            0
                        );


                    let label =
                        "Movimiento";


                    switch (
                    item.transaction_type
                    ) {

                        case "sale_credit":

                            label =
                                "Venta de F1 Sphere";

                            break;


                        case "affiliate_commission":

                            label =
                                "Comisión de afiliado";

                            break;


                        case "cash_prize":

                            label =
                                "Premio en efectivo";

                            break;


                        case "withdrawal":

                            label =
                                "Solicitud de retiro";

                            break;


                        case "adjustment":

                            label =
                                amount >= 0

                                    ? "Ajuste a favor"

                                    : "Ajuste";

                            break;
                    }


                    return {

                        type:
                            item.transaction_type,

                        label,

                        amount,

                        direction:
                            amount >= 0
                                ? "credit"
                                : "debit",

                        reference:
                            item.reference,

                        description:
                            item.description,

                        metadata:
                            item.metadata,

                        createdAt:
                            item.created_at,
                    };
                }
            );


        /* =====================================================
           11. RESPUESTA
        ===================================================== */

        return NextResponse.json({

            ok: true,


            /* =================================================
               SALDO
            ================================================= */

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

                totalBalance:
                    Number(
                        wallet
                            .available_balance ??
                        0
                    )
                    +
                    Number(
                        wallet
                            .pending_balance ??
                        0
                    ),

                updatedAt:
                    wallet.updated_at,
            },


            /* =================================================
               CONFIGURACIÓN
            ================================================= */

            settings: {

                marketplaceCommissionRate:
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


            /* =================================================
               RESUMEN GENERAL
            ================================================= */

            summary: {

                totalIncome,

                totalWithdrawn,

                totalPendingWithdrawal,

                positiveAdjustments,

                negativeAdjustments,


                /* ---------------------------------------------
                   Marketplace
                --------------------------------------------- */

                marketplace: {

                    completedSales:
                        sales.length,

                    totalSold,

                    totalEarned:
                        totalMarketplaceEarned,

                    platformCommission:
                        totalMarketplaceCommission,
                },


                /* ---------------------------------------------
                   Afiliados
                --------------------------------------------- */

                affiliate: {

                    commissionsEarned:
                        affiliateCommissions,
                },


                /* ---------------------------------------------
                   Premios
                --------------------------------------------- */

                prizes: {

                    cashEarned:
                        cashPrizes,
                },
            },


            /* =================================================
               DESGLOSE RÁPIDO PARA LA UI
            ================================================= */

            incomeBreakdown: {

                marketplaceSales,

                affiliateCommissions,

                cashPrizes,

                adjustments:
                    positiveAdjustments,
            },


            /* =================================================
               CUENTA BANCARIA
            ================================================= */

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


            /* =================================================
               HISTORIALES
            ================================================= */

            movements,

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
            "Baruk593 wallet GET:",
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