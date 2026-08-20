// app/api/cards/reveal/route.ts

import {
    NextRequest,
    NextResponse,
} from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeEmail(
    value: unknown
): string {
    return String(value ?? "")
        .trim()
        .toLowerCase();
}

export async function POST(
    req: NextRequest
) {
    try {
        /*
         * =====================================================
         * 1. LEER BODY
         * =====================================================
         */

        const body =
            await req.json().catch(
                () => null
            );

        const cardId =
            String(
                body?.cardId ?? ""
            ).trim();

        const fallbackEmail =
            normalizeEmail(
                body?.email
            );

        if (!cardId) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Falta cardId",
                },
                {
                    status: 400,
                }
            );
        }

        /*
         * =====================================================
         * 2. DETECTAR SESIÓN AUTENTICADA
         * =====================================================
         *
         * Si llega:
         *
         * Authorization: Bearer <token>
         *
         * validamos la identidad directamente
         * con Supabase Auth.
         */

        const authorization =
            req.headers.get(
                "authorization"
            );

        let authenticatedUser:
            | {
                id: string;
                email: string;
            }
            | null = null;

        if (
            authorization?.startsWith(
                "Bearer "
            )
        ) {
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
                data: userData,
                error: userError,
            } =
                await supabaseAdmin.auth.getUser(
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

            authenticatedUser = {
                id:
                    userData.user.id,

                email:
                    normalizeEmail(
                        userData.user.email
                    ),
            };
        }

        /*
         * =====================================================
         * 3. LEER TARJETA
         * =====================================================
         */

        const {
            data: card,
            error: cardError,
        } =
            await supabaseAdmin
                .from("baruk_cards")
                .select(`
                    id,
                    pedido_id,
                    owner_user_id,
                    owner_email,
                    owner_type,
                    estado,
                    revealed,
                    revealed_at,
                    extra_type,
                    sphere_id,
                    prize_id,
                    numero_asignado_id,
                    numeros_asignados!inner(
                        numero
                    )
                `)
                .eq(
                    "id",
                    cardId
                )
                .maybeSingle();

        if (
            cardError ||
            !card
        ) {
            if (cardError) {
                console.error(
                    "Error leyendo Baruk Card:",
                    cardError
                );
            }

            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Tarjeta no encontrada",
                },
                {
                    status: 404,
                }
            );
        }

        /*
         * =====================================================
         * 4. VALIDAR PROPIETARIO
         * =====================================================
         *
         * MODO A:
         * usuario autenticado -> owner_user_id
         *
         * MODO B:
         * flujo temporal /mi-compra -> owner_email
         */

        const storedEmail =
            normalizeEmail(
                card.owner_email
            );

        if (authenticatedUser) {
            /*
             * ---------------------------------------------
             * USUARIO AUTENTICADO
             * ---------------------------------------------
             */

            if (
                card.owner_user_id
            ) {
                /*
                 * Si ya existe owner_user_id,
                 * debe coincidir exactamente con
                 * el usuario autenticado.
                 */

                if (
                    card.owner_user_id !==
                    authenticatedUser.id
                ) {
                    return NextResponse.json(
                        {
                            ok: false,
                            error:
                                "No tienes autorización para revelar esta tarjeta",
                        },
                        {
                            status: 403,
                        }
                    );
                }
            } else {
                /*
                 * La tarjeta puede ser histórica y
                 * todavía no tener owner_user_id.
                 *
                 * Como el usuario YA está autenticado,
                 * podemos verificar el correo y
                 * vincularla automáticamente.
                 */

                if (
                    !storedEmail ||
                    !authenticatedUser.email ||
                    storedEmail !==
                    authenticatedUser.email
                ) {
                    return NextResponse.json(
                        {
                            ok: false,
                            error:
                                "Esta tarjeta no pertenece a tu cuenta",
                        },
                        {
                            status: 403,
                        }
                    );
                }

                const {
                    error:
                    linkCardError,
                } =
                    await supabaseAdmin
                        .from(
                            "baruk_cards"
                        )
                        .update({
                            owner_user_id:
                                authenticatedUser.id,

                            updated_at:
                                new Date().toISOString(),
                        })
                        .eq(
                            "id",
                            card.id
                        )
                        .is(
                            "owner_user_id",
                            null
                        );

                if (
                    linkCardError
                ) {
                    console.error(
                        "Error vinculando tarjeta durante reveal:",
                        linkCardError
                    );

                    return NextResponse.json(
                        {
                            ok: false,
                            error:
                                "No se pudo vincular la tarjeta a tu cuenta",
                        },
                        {
                            status: 500,
                        }
                    );
                }
            }
        } else {
            /*
             * ---------------------------------------------
             * COMPATIBILIDAD TEMPORAL CON /MI-COMPRA
             * ---------------------------------------------
             *
             * Todavía acepta correo porque /mi-compra
             * no ha sido migrado completamente a una
             * sesión autenticada.
             */

            if (!fallbackEmail) {
                return NextResponse.json(
                    {
                        ok: false,
                        error:
                            "Debes iniciar sesión para revelar esta tarjeta",
                    },
                    {
                        status: 401,
                    }
                );
            }

            if (
                !storedEmail ||
                storedEmail !==
                fallbackEmail
            ) {
                return NextResponse.json(
                    {
                        ok: false,
                        error:
                            "No tienes autorización para revelar esta tarjeta",
                    },
                    {
                        status: 403,
                    }
                );
            }
        }

        /*
         * =====================================================
         * 5. COMPROBAR ESTADO
         * =====================================================
         */

        if (
            card.estado ===
            "cancelled"
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Esta tarjeta se encuentra cancelada",
                },
                {
                    status: 409,
                }
            );
        }

        /*
         * =====================================================
         * 6. OBTENER NÚMERO DE PARTICIPACIÓN
         * =====================================================
         */

        const relation =
            card.numeros_asignados as
            | {
                numero: number;
            }
            | {
                numero: number;
            }[]
            | null;

        const numero =
            Array.isArray(
                relation
            )
                ? Number(
                    relation[0]
                        ?.numero
                )
                : Number(
                    relation?.numero
                );

        if (
            !Number.isFinite(
                numero
            )
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "No se pudo obtener el número de participación",
                },
                {
                    status: 500,
                }
            );
        }

        /*
         * =====================================================
         * 7. CARGAR ESFERA O PREMIO
         * =====================================================
         */

        let sphere = null;
        let prize = null;

        if (
            card.extra_type ===
            "sphere" &&
            card.sphere_id
        ) {
            const {
                data:
                sphereData,
                error:
                sphereError,
            } =
                await supabaseAdmin
                    .from(
                        "spheres"
                    )
                    .select(`
                        id,
                        numero,
                        nombre,
                        descripcion,
                        imagen_url
                    `)
                    .eq(
                        "id",
                        card.sphere_id
                    )
                    .maybeSingle();

            if (
                sphereError
            ) {
                console.error(
                    "Error leyendo esfera:",
                    sphereError
                );
            }

            sphere =
                sphereData ??
                null;
        }

        if (
            card.extra_type ===
            "prize" &&
            card.prize_id
        ) {
            const {
                data:
                prizeData,
                error:
                prizeError,
            } =
                await supabaseAdmin
                    .from(
                        "card_prizes"
                    )
                    .select(`
                        id,
                        nombre,
                        descripcion,
                        tipo,
                        imagen_url,
                        cantidad_cards,
                        valor_referencial
                    `)
                    .eq(
                        "id",
                        card.prize_id
                    )
                    .maybeSingle();

            if (
                prizeError
            ) {
                console.error(
                    "Error leyendo premio:",
                    prizeError
                );
            }

            prize =
                prizeData ??
                null;
        }

        /*
         * =====================================================
         * 8. REVELAR + FINALIZAR PREMIO
         * =====================================================
         *
         * Esta operación ahora ocurre de forma ATÓMICA
         * dentro de Supabase.
         *
         * Puede:
         *
         * - revelar la Experience Pass;
         * - actualizar premio programado;
         * - garantizar prize_claim;
         * - acreditar premio CASH;
         * - actualizar Billetera Baruk593;
         * - evitar doble acreditación.
         */

        const {
            data: revealResult,
            error: revealRpcError,
        } =
            await (
                supabaseAdmin as any
            ).rpc(
                "reveal_baruk_card_and_finalize",
                {
                    p_card_id:
                        card.id,

                    p_revealed_by:
                        authenticatedUser
                            ?.id ??
                        null,
                }
            );


        if (
            revealRpcError
        ) {
            console.error(
                "Error en reveal_baruk_card_and_finalize:",
                revealRpcError
            );


            const message =
                String(
                    revealRpcError.message ??
                    ""
                );


            if (
                message.includes(
                    "CARD_CANCELLED"
                )
            ) {
                return NextResponse.json(
                    {
                        ok: false,
                        error:
                            "Esta tarjeta se encuentra cancelada",
                    },
                    {
                        status: 409,
                    }
                );
            }


            if (
                message.includes(
                    "PRIZE_NOT_FOUND"
                )
            ) {
                return NextResponse.json(
                    {
                        ok: false,
                        error:
                            "No se pudo encontrar el premio asociado a esta tarjeta",
                    },
                    {
                        status: 500,
                    }
                );
            }


            if (
                message.includes(
                    "CASH_PRIZE_WITHOUT_VALUE"
                )
            ) {
                return NextResponse.json(
                    {
                        ok: false,
                        error:
                            "El premio en efectivo no tiene un valor configurado",
                    },
                    {
                        status: 500,
                    }
                );
            }


            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "No se pudo completar el revelado de la Experience Pass",
                },
                {
                    status: 500,
                }
            );
        }


        /*
         * =====================================================
         * 9. NORMALIZAR RESPUESTA DEL RPC
         * =====================================================
         */

        const result =
            revealResult ??
            {};


        const alreadyRevealed =
            Boolean(
                result
                    ?.alreadyRevealed
            );


        const finalRevealedAt =
            result
                ?.revealedAt ??
            card.revealed_at ??
            new Date().toISOString();


        const cashPrize =
            Boolean(
                result
                    ?.cashPrize
            );


        const cashCredited =
            Boolean(
                result
                    ?.cashCredited
            );


        const cashPendingAccount =
            Boolean(
                result
                    ?.cashPendingAccount
            );


        const cashAmount =
            result
                ?.cashAmount !=
                null
                ? Number(
                    result.cashAmount
                )
                : null;


        const walletBalance =
            result
                ?.walletBalance !=
                null
                ? Number(
                    result.walletBalance
                )
                : null;


        /*
         * =====================================================
         * 10. RESPUESTA
         * =====================================================
         */

        return NextResponse.json({
            ok: true,

            alreadyRevealed,

            card: {
                id:
                    card.id,

                numero,

                extraType:
                    card.extra_type,

                sphere,

                prize,

                revealedAt:
                    finalRevealedAt,
            },


            /*
             * Información adicional para premios CASH.
             *
             * El frontend puede usar estos valores
             * para mostrar:
             *
             * "Ganaste $50"
             *
             * "Acreditados en tu Billetera Baruk593"
             */

            cashPrize,

            cashAmount,

            cashCredited,

            cashPendingAccount,

            walletBalance,
        });

    } catch (
    error: unknown
    ) {
        console.error(
            "cards/reveal error:",
            error
        );

        return NextResponse.json(
            {
                ok: false,

                error:
                    error instanceof
                        Error
                        ? error.message
                        : "Error interno",
            },
            {
                status: 500,
            }
        );
    }
}