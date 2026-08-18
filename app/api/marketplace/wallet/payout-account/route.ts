// app/api/marketplace/wallet/payout-account/route.ts

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


        const bankName =
            String(
                body?.bankName ??
                ""
            ).trim();


        const accountType =
            String(
                body?.accountType ??
                ""
            ).trim();


        const accountNumber =
            String(
                body?.accountNumber ??
                ""
            )
                .replace(
                    /\s+/g,
                    ""
                )
                .trim();


        const accountHolder =
            String(
                body?.accountHolder ??
                ""
            ).trim();


        const identification =
            String(
                body?.identification ??
                ""
            )
                .replace(
                    /\s+/g,
                    ""
                )
                .trim();


        if (
            !bankName ||
            !accountNumber ||
            !accountHolder ||
            !identification
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Completa todos los datos bancarios",
                },
                {
                    status: 400,
                }
            );
        }


        if (
            ![
                "savings",
                "checking",
            ].includes(
                accountType
            )
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Selecciona un tipo de cuenta válido",
                },
                {
                    status: 400,
                }
            );
        }


        /*
         * Quitamos la predeterminada anterior.
         */
        await supabaseAdmin
            .from(
                "marketplace_payout_accounts"
            )
            .update({
                is_default:
                    false,

                updated_at:
                    new Date()
                        .toISOString(),
            })
            .eq(
                "user_id",
                userData.user.id
            );


        /*
         * Creamos la nueva.
         */
        const {
            data:
            account,

            error:
            accountError,
        } =
            await supabaseAdmin
                .from(
                    "marketplace_payout_accounts"
                )
                .insert({

                    user_id:
                        userData.user.id,

                    bank_name:
                        bankName,

                    account_type:
                        accountType,

                    account_number:
                        accountNumber,

                    account_holder:
                        accountHolder,

                    identification,

                    is_default:
                        true,
                })
                .select(`
                    id
                `)
                .single();


        if (
            accountError ||
            !account
        ) {
            throw accountError ??
            new Error(
                "No se pudo guardar la cuenta bancaria"
            );
        }


        return NextResponse.json({

            ok: true,

            accountId:
                account.id,

            message:
                "Cuenta bancaria guardada correctamente",
        });


    } catch (
    error:
        unknown
    ) {

        console.error(
            "payout-account POST:",
            error
        );


        return NextResponse.json(
            {
                ok: false,

                error:
                    error instanceof
                        Error
                        ? error.message
                        : "No se pudo guardar la cuenta bancaria",
            },
            {
                status: 500,
            }
        );
    }
}