// app/api/mi-cuenta/coleccion/reclamar/route.ts

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


function isValidUuid(
    value: string
) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        .test(value);
}


export async function POST(
    req: NextRequest
) {
    try {

        /* =====================================================
           1. VALIDAR SESIÓN
        ===================================================== */

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


        if (!accessToken) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Token de sesión inválido",
                },
                {
                    status: 401,
                }
            );
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
                    ok: false,
                    error:
                        "La sesión no es válida o ha expirado",
                },
                {
                    status: 401,
                }
            );
        }


        const user =
            userData.user;


        /* =====================================================
           2. LEER IDENTIFICADOR DE ESTE RECLAMO
        ===================================================== */

        const body =
            await req
                .json()
                .catch(
                    () => null
                );


        const claimRequestId =
            String(
                body?.claimRequestId ??
                ""
            )
                .trim()
                .toLowerCase();


        if (
            !claimRequestId ||
            !isValidUuid(
                claimRequestId
            )
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Identificador de reclamo inválido",
                },
                {
                    status: 400,
                }
            );
        }


        /* =====================================================
           3. EJECUTAR RPC ATÓMICO
        ===================================================== */

        const {
            data:
            claimResult,

            error:
            claimError,
        } =
            await supabaseAdmin
                .rpc(
                    "claim_f1_collection_reward",
                    {
                        p_user_id:
                            user.id,

                        p_owner_email:
                            user.email ??
                            null,

                        p_claim_request_id:
                            claimRequestId,
                    }
                );


        if (
            claimError
        ) {
            console.error(
                "claim_f1_collection_reward:",
                claimError
            );


            const message =
                String(
                    claimError.message ??
                    ""
                );


            if (
                message.includes(
                    "COLLECTION_NOT_AVAILABLE"
                )
            ) {
                return NextResponse.json(
                    {
                        ok: false,

                        error:
                            "Necesitas tener disponibles las 11 F1 Spheres para reclamar el premio. Si alguna está publicada en Marketplace, retírala primero.",
                    },
                    {
                        status: 409,
                    }
                );
            }


            if (
                message.includes(
                    "REWARD_NOT_CONFIGURED"
                )
            ) {
                return NextResponse.json(
                    {
                        ok: false,

                        error:
                            "El premio de la colección no está configurado.",
                    },
                    {
                        status: 409,
                    }
                );
            }


            if (
                message.includes(
                    "INVALID_F1_CATALOG"
                )
            ) {
                return NextResponse.json(
                    {
                        ok: false,

                        error:
                            "La colección F1 no está configurada correctamente.",
                    },
                    {
                        status: 409,
                    }
                );
            }


            if (
                message.includes(
                    "CLAIM_REQUEST_ID_CONFLICT"
                )
            ) {
                return NextResponse.json(
                    {
                        ok: false,

                        error:
                            "No se pudo validar esta solicitud de premio.",
                    },
                    {
                        status: 409,
                    }
                );
            }


            return NextResponse.json(
                {
                    ok: false,

                    error:
                        "No se pudo reclamar el premio de la colección.",
                },
                {
                    status: 500,
                }
            );
        }


        if (
            !claimResult ||
            claimResult.ok !==
            true
        ) {
            return NextResponse.json(
                {
                    ok: false,

                    error:
                        "No se pudo completar el reclamo del premio.",
                },
                {
                    status: 500,
                }
            );
        }


        /* =====================================================
           4. RESPUESTA
        ===================================================== */

        return NextResponse.json({
            ok: true,

            alreadyProcessed:
                Boolean(
                    claimResult
                        .alreadyProcessed
                ),

            claimId:
                claimResult
                    .claimId ??
                null,

            rewardId:
                claimResult
                    .rewardId ??
                null,

            redeemedSpheres:
                Number(
                    claimResult
                        .redeemedSpheres ??
                    0
                ),
        });

    } catch (
    error: unknown
    ) {

        console.error(
            "mi-cuenta/coleccion/reclamar:",
            error
        );


        return NextResponse.json(
            {
                ok: false,

                error:
                    error instanceof Error
                        ? error.message
                        : "Error interno al reclamar el premio",
            },
            {
                status: 500,
            }
        );
    }
}