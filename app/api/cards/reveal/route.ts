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
         * 8. SI YA FUE REVELADA
         * =====================================================
         *
         * Nunca se vuelve a sortear.
         * Se devuelve exactamente el resultado almacenado.
         */

        if (
            card.revealed
        ) {
            return NextResponse.json({
                ok: true,

                alreadyRevealed:
                    true,

                card: {
                    id:
                        card.id,

                    numero,

                    extraType:
                        card.extra_type,

                    sphere,

                    prize,

                    revealedAt:
                        card.revealed_at,
                },
            });
        }

        /*
         * =====================================================
         * 9. REGISTRAR REVELADO
         * =====================================================
         */

        const revealedAt =
            new Date().toISOString();

        const {
            data: revealedRow,
            error: revealError,
        } =
            await supabaseAdmin
                .from(
                    "baruk_cards"
                )
                .update({
                    revealed:
                        true,

                    revealed_at:
                        revealedAt,

                    estado:
                        "revealed",

                    updated_at:
                        revealedAt,
                })
                .eq(
                    "id",
                    card.id
                )
                .eq(
                    "revealed",
                    false
                )
                .select(`
                    id,
                    revealed_at
                `)
                .maybeSingle();

        if (
            revealError
        ) {
            console.error(
                "Error revelando Baruk Card:",
                revealError
            );

            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "No se pudo revelar la tarjeta",
                },
                {
                    status: 500,
                }
            );
        }

        /*
         * Puede ocurrir que dos solicitudes intenten
         * revelar la misma tarjeta casi simultáneamente.
         *
         * Si la segunda no actualizó ninguna fila,
         * simplemente recuperamos la fecha real
         * almacenada.
         */

        if (
            !revealedRow
        ) {
            const {
                data:
                currentCard,
                error:
                currentCardError,
            } =
                await supabaseAdmin
                    .from(
                        "baruk_cards"
                    )
                    .select(`
                        revealed,
                        revealed_at
                    `)
                    .eq(
                        "id",
                        card.id
                    )
                    .maybeSingle();

            if (
                currentCardError
            ) {
                console.error(
                    "Error verificando revelado concurrente:",
                    currentCardError
                );
            }

            return NextResponse.json({
                ok: true,

                alreadyRevealed:
                    true,

                card: {
                    id:
                        card.id,

                    numero,

                    extraType:
                        card.extra_type,

                    sphere,

                    prize,

                    revealedAt:
                        currentCard
                            ?.revealed_at ??
                        revealedAt,
                },
            });
        }

        /*
         * =====================================================
         * 10. RESPUESTA
         * =====================================================
         */

        return NextResponse.json({
            ok: true,

            alreadyRevealed:
                false,

            card: {
                id:
                    card.id,

                numero,

                extraType:
                    card.extra_type,

                sphere,

                prize,

                revealedAt:
                    revealedRow.revealed_at ??
                    revealedAt,
            },
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