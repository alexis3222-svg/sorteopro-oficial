// app/api/marketplace/wallet/withdraw/route.ts

import {
    NextRequest,
    NextResponse,
} from "next/server";

import {
    supabaseAdmin,
} from "@/lib/supabaseAdmin";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";


export async function POST(
    req: NextRequest
) {
    try {

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
                        "Tu sesión ha expirado",
                },
                {
                    status: 401,
                }
            );
        }


        const body =
            await req
                .json()
                .catch(
                    () => ({})
                );


        const payoutAccountId =
            String(
                body?.payoutAccountId ??
                ""
            ).trim();


        const amount =
            Number(
                body?.amount
            );


        if (!payoutAccountId) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Configura una cuenta bancaria antes de solicitar el retiro",
                },
                {
                    status: 400,
                }
            );
        }


        if (
            !Number.isFinite(
                amount
            ) ||
            amount <= 0
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Ingresa un monto válido",
                },
                {
                    status: 400,
                }
            );
        }


        const {
            data:
            withdrawalId,

            error:
            withdrawalError,
        } =
            await supabaseAdmin
                .rpc(
                    "create_marketplace_withdrawal",
                    {
                        p_user_id:
                            userData.user.id,

                        p_payout_account_id:
                            payoutAccountId,

                        p_amount:
                            Math.round(
                                amount *
                                100
                            ) /
                            100,
                    }
                );


        if (
            withdrawalError
        ) {

            const message =
                withdrawalError
                    .message ??
                "";


            if (
                message.includes(
                    "INSUFFICIENT_BALANCE"
                )
            ) {
                return NextResponse.json(
                    {
                        ok: false,
                        error:
                            "No tienes saldo suficiente para realizar este retiro",
                    },
                    {
                        status: 409,
                    }
                );
            }


            if (
                message.includes(
                    "MIN_WITHDRAWAL_AMOUNT"
                )
            ) {
                return NextResponse.json(
                    {
                        ok: false,
                        error:
                            "El monto es inferior al mínimo permitido para retiros",
                    },
                    {
                        status: 400,
                    }
                );
            }


            if (
                message.includes(
                    "PAYOUT_ACCOUNT_NOT_FOUND"
                )
            ) {
                return NextResponse.json(
                    {
                        ok: false,
                        error:
                            "La cuenta bancaria seleccionada no es válida",
                    },
                    {
                        status: 400,
                    }
                );
            }


            throw withdrawalError;
        }


        return NextResponse.json({

            ok: true,

            withdrawalId,

            message:
                "Solicitud de retiro registrada correctamente",
        });


    } catch (
    error:
        unknown
    ) {

        console.error(
            "marketplace withdrawal POST:",
            error
        );


        return NextResponse.json(
            {
                ok: false,

                error:
                    error instanceof
                        Error
                        ? error.message
                        : "No se pudo solicitar el retiro",
            },
            {
                status: 500,
            }
        );
    }
}