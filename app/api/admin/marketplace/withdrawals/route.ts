// app/api/admin/marketplace/withdrawals/route.ts

import {
    NextRequest,
    NextResponse,
} from "next/server";

import {
    supabaseAdmin,
} from "@/lib/supabaseAdmin";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";


function normalizeEmail(
    value: unknown
) {
    return String(
        value ?? ""
    )
        .trim()
        .toLowerCase();
}


/*
 * =========================================================
 * VALIDAR ADMINISTRADOR
 * =========================================================
 */

async function getAdminUser(
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
            ok: false as const,

            status: 401,

            error:
                "No existe una sesión administrativa válida",
        };
    }


    const accessToken =
        authorization
            .replace(
                "Bearer ",
                ""
            )
            .trim();


    if (!accessToken) {

        return {
            ok: false as const,

            status: 401,

            error:
                "Token administrativo inválido",
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
            ok: false as const,

            status: 401,

            error:
                "La sesión administrativa ha expirado",
        };
    }


    const adminUserId =
        String(
            process.env.ADMIN_UUID ??
            process.env.SUPABASE_ADMIN_USER_ID ??
            ""
        ).trim();


    if (!adminUserId) {

        console.error(
            "Falta ADMIN_UUID / SUPABASE_ADMIN_USER_ID"
        );


        return {
            ok: false as const,

            status: 500,

            error:
                "No está configurado el administrador del sistema",
        };
    }


    if (
        userData.user.id !==
        adminUserId
    ) {

        return {
            ok: false as const,

            status: 403,

            error:
                "No tienes permisos de administrador",
        };
    }


    return {
        ok: true as const,

        user: {
            id:
                userData.user.id,

            email:
                normalizeEmail(
                    userData.user.email
                ),
        },
    };
}


/*
 * =========================================================
 * GET
 *
 * CONSULTAR RETIROS
 * =========================================================
 */

export async function GET(
    req: NextRequest
) {

    try {

        const admin =
            await getAdminUser(
                req
            );


        if (!admin.ok) {

            return NextResponse.json(
                {
                    ok: false,

                    error:
                        admin.error,
                },
                {
                    status:
                        admin.status,
                }
            );
        }


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
                    user_id,
                    payout_account_id,
                    amount,
                    status,
                    bank_name,
                    account_type,
                    account_number,
                    account_holder,
                    identification,
                    admin_notes,
                    requested_at,
                    processing_at,
                    paid_at,
                    rejected_at,
                    cancelled_at,
                    created_at,
                    updated_at
                `)
                .order(
                    "requested_at",
                    {
                        ascending:
                            false,
                    }
                );


        if (
            withdrawalsError
        ) {

            console.error(
                "Error leyendo marketplace_withdrawals:",
                withdrawalsError
            );


            return NextResponse.json(
                {
                    ok: false,

                    error:
                        "No se pudieron consultar los retiros",
                },
                {
                    status: 500,
                }
            );
        }


        const withdrawals =
            (
                withdrawalsData ??
                []
            ).map(
                item => ({

                    id:
                        item.id,

                    userId:
                        item.user_id,

                    payoutAccountId:
                        item.payout_account_id,

                    amount:
                        Number(
                            item.amount ??
                            0
                        ),

                    status:
                        item.status,

                    bankName:
                        item.bank_name,

                    accountType:
                        item.account_type,

                    accountNumber:
                        item.account_number,

                    accountHolder:
                        item.account_holder,

                    identification:
                        item.identification,

                    adminNotes:
                        item.admin_notes,

                    requestedAt:
                        item.requested_at,

                    processingAt:
                        item.processing_at,

                    paidAt:
                        item.paid_at,

                    rejectedAt:
                        item.rejected_at,

                    cancelledAt:
                        item.cancelled_at,

                    createdAt:
                        item.created_at,

                    updatedAt:
                        item.updated_at,
                })
            );


        const summary = {

            total:
                withdrawals.length,

            pending:
                withdrawals.filter(
                    item =>
                        item.status ===
                        "pending"
                ).length,

            processing:
                withdrawals.filter(
                    item =>
                        item.status ===
                        "processing"
                ).length,

            paid:
                withdrawals.filter(
                    item =>
                        item.status ===
                        "paid"
                ).length,

            rejected:
                withdrawals.filter(
                    item =>
                        item.status ===
                        "rejected"
                ).length,

            pendingAmount:
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
                            item.amount,
                        0
                    ),

            paidAmount:
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
                            item.amount,
                        0
                    ),
        };


        return NextResponse.json({

            ok: true,

            summary,

            withdrawals,
        });


    } catch (
    error: unknown
    ) {

        console.error(
            "api/admin/marketplace/withdrawals GET:",
            error
        );


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


/*
 * =========================================================
 * PATCH
 *
 * CAMBIAR ESTADO DEL RETIRO
 *
 * action:
 * processing
 * paid
 * rejected
 * =========================================================
 */

export async function PATCH(
    req: NextRequest
) {

    try {

        const admin =
            await getAdminUser(
                req
            );


        if (!admin.ok) {

            return NextResponse.json(
                {
                    ok: false,

                    error:
                        admin.error,
                },
                {
                    status:
                        admin.status,
                }
            );
        }


        const body =
            await req
                .json()
                .catch(
                    () => null
                );


        const withdrawalId =
            String(
                body?.withdrawalId ??
                ""
            ).trim();


        const action =
            String(
                body?.action ??
                ""
            ).trim();


        const notes =
            String(
                body?.notes ??
                ""
            ).trim();


        if (!withdrawalId) {

            return NextResponse.json(
                {
                    ok: false,

                    error:
                        "Falta withdrawalId",
                },
                {
                    status: 400,
                }
            );
        }


        if (
            action !==
            "processing" &&
            action !==
            "paid" &&
            action !==
            "rejected"
        ) {

            return NextResponse.json(
                {
                    ok: false,

                    error:
                        "Acción administrativa inválida",
                },
                {
                    status: 400,
                }
            );
        }


        /*
         * =====================================================
         * MARCAR EN PROCESO
         * =====================================================
         */

        if (
            action ===
            "processing"
        ) {

            const {
                data:
                updated,

                error:
                updateError,
            } =
                await supabaseAdmin
                    .from(
                        "marketplace_withdrawals"
                    )
                    .update({

                        status:
                            "processing",

                        processing_at:
                            new Date()
                                .toISOString(),

                        admin_notes:
                            notes ||
                            null,

                        updated_at:
                            new Date()
                                .toISOString(),
                    })
                    .eq(
                        "id",
                        withdrawalId
                    )
                    .eq(
                        "status",
                        "pending"
                    )
                    .select(`
                        id,
                        status
                    `)
                    .maybeSingle();


            if (
                updateError
            ) {

                throw updateError;
            }


            if (!updated) {

                return NextResponse.json(
                    {
                        ok: false,

                        error:
                            "El retiro ya no está pendiente",
                    },
                    {
                        status: 409,
                    }
                );
            }


            return NextResponse.json({

                ok: true,

                withdrawalId,

                status:
                    "processing",
            });
        }


        /*
         * =====================================================
         * MARCAR PAGADO
         * =====================================================
         */

        if (
            action ===
            "paid"
        ) {

            const {
                data:
                result,

                error:
                rpcError,
            } =
                await supabaseAdmin
                    .rpc(
                        "admin_mark_marketplace_withdrawal_paid",
                        {
                            p_withdrawal_id:
                                withdrawalId,

                            p_admin_notes:
                                notes ||
                                null,
                        }
                    );


            if (
                rpcError
            ) {

                throw rpcError;
            }


            if (
                result !==
                true
            ) {

                throw new Error(
                    "No se pudo marcar el retiro como pagado"
                );
            }


            return NextResponse.json({

                ok: true,

                withdrawalId,

                status:
                    "paid",
            });
        }


        /*
         * =====================================================
         * RECHAZAR
         * =====================================================
         */

        if (
            action ===
            "rejected"
        ) {

            if (!notes) {

                return NextResponse.json(
                    {
                        ok: false,

                        error:
                            "Debes indicar el motivo del rechazo",
                    },
                    {
                        status: 400,
                    }
                );
            }


            const {
                data:
                result,

                error:
                rpcError,
            } =
                await supabaseAdmin
                    .rpc(
                        "admin_reject_marketplace_withdrawal",
                        {
                            p_withdrawal_id:
                                withdrawalId,

                            p_admin_notes:
                                notes,
                        }
                    );


            if (
                rpcError
            ) {

                throw rpcError;
            }


            if (
                result !==
                true
            ) {

                throw new Error(
                    "No se pudo rechazar el retiro"
                );
            }


            return NextResponse.json({

                ok: true,

                withdrawalId,

                status:
                    "rejected",
            });
        }


        return NextResponse.json(
            {
                ok: false,

                error:
                    "Acción no soportada",
            },
            {
                status: 400,
            }
        );


    } catch (
    error: unknown
    ) {

        console.error(
            "api/admin/marketplace/withdrawals PATCH:",
            error
        );


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