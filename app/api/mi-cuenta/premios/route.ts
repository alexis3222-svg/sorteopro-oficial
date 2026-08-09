// app/api/mi-cuenta/premios/route.ts

import {
    NextRequest,
    NextResponse,
} from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PrizeCardRow = {
    id: string;
    prize_id: string | null;
    revealed_at: string | null;
};

type PrizeClaimRow = {
    id: string;
    card_id: string;
    prize_id: string;
    estado: string;
    entrega_automatica: boolean | null;
    pedido_entrega_id: number | null;
    created_at: string;
};

type PrizeRow = {
    id: string;
    nombre: string;
    descripcion: string | null;
    tipo: string;
    imagen_url: string | null;
    cantidad_cards: number | null;
    valor_referencial: number | null;
};

export async function GET(
    req: NextRequest
) {
    try {
        /*
         * =====================================================
         * 1. VALIDAR SESIÓN
         * =====================================================
         */

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

        const user =
            userData.user;

        /*
         * =====================================================
         * 2. BUSCAR SOLO CARDS CON PREMIO YA REVELADAS
         * =====================================================
         *
         * Esto evita adelantar resultados de tarjetas
         * que el usuario todavía no abrió.
         */

        const {
            data: prizeCardsData,
            error: prizeCardsError,
        } =
            await supabaseAdmin
                .from("baruk_cards")
                .select(`
                    id,
                    prize_id,
                    revealed_at
                `)
                .eq(
                    "owner_user_id",
                    user.id
                )
                .eq(
                    "revealed",
                    true
                )
                .eq(
                    "extra_type",
                    "prize"
                )
                .neq(
                    "estado",
                    "cancelled"
                )
                .order(
                    "revealed_at",
                    {
                        ascending: false,
                    }
                );

        if (prizeCardsError) {
            console.error(
                "Error consultando cards premiadas:",
                prizeCardsError
            );

            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "No se pudieron consultar tus premios",
                },
                {
                    status: 500,
                }
            );
        }

        const prizeCards =
            (
                prizeCardsData ??
                []
            ) as PrizeCardRow[];

        /*
         * El usuario todavía no tiene
         * premios revelados.
         */

        if (
            prizeCards.length ===
            0
        ) {
            return NextResponse.json({
                ok: true,

                summary: {
                    total: 0,
                    pending: 0,
                    scheduled: 0,
                    delivered: 0,
                },

                prizes: [],
            });
        }

        const cardIds =
            prizeCards.map(
                (card) =>
                    card.id
            );

        const prizeIds =
            [
                ...new Set(
                    prizeCards
                        .map(
                            (card) =>
                                card.prize_id
                        )
                        .filter(
                            (
                                value
                            ): value is string =>
                                Boolean(
                                    value
                                )
                        )
                ),
            ];

        /*
         * =====================================================
         * 3. CONSULTAR RECLAMOS
         * =====================================================
         */

        const {
            data: claimsData,
            error: claimsError,
        } =
            await supabaseAdmin
                .from(
                    "prize_claims"
                )
                .select(`
                    id,
                    card_id,
                    prize_id,
                    estado,
                    entrega_automatica,
                    pedido_entrega_id,
                    created_at
                `)
                .in(
                    "card_id",
                    cardIds
                );

        if (claimsError) {
            console.error(
                "Error consultando prize_claims:",
                claimsError
            );

            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "No se pudo consultar el estado de tus premios",
                },
                {
                    status: 500,
                }
            );
        }

        const claims =
            (
                claimsData ??
                []
            ) as PrizeClaimRow[];

        /*
         * =====================================================
         * 4. CONSULTAR INFORMACIÓN DE LOS PREMIOS
         * =====================================================
         */

        let prizesCatalog:
            PrizeRow[] = [];

        if (
            prizeIds.length >
            0
        ) {
            const {
                data:
                prizesData,
                error:
                prizesError,
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
                    .in(
                        "id",
                        prizeIds
                    );

            if (
                prizesError
            ) {
                console.error(
                    "Error consultando catálogo de premios:",
                    prizesError
                );

                return NextResponse.json(
                    {
                        ok: false,
                        error:
                            "No se pudo cargar la información de tus premios",
                    },
                    {
                        status: 500,
                    }
                );
            }

            prizesCatalog =
                (
                    prizesData ??
                    []
                ) as PrizeRow[];
        }

        /*
         * =====================================================
         * 5. MAPAS PARA RELACIONAR DATOS
         * =====================================================
         */

        const claimByCardId =
            new Map<
                string,
                PrizeClaimRow
            >();

        for (
            const claim
            of claims
        ) {
            claimByCardId.set(
                claim.card_id,
                claim
            );
        }

        const prizeById =
            new Map<
                string,
                PrizeRow
            >();

        for (
            const prize
            of prizesCatalog
        ) {
            prizeById.set(
                prize.id,
                prize
            );
        }

        /*
         * =====================================================
         * 6. CREAR RESPUESTA
         * =====================================================
         */

        const prizes =
            prizeCards.map(
                (card) => {
                    const claim =
                        claimByCardId.get(
                            card.id
                        ) ??
                        null;

                    const prize =
                        card.prize_id
                            ? prizeById.get(
                                card.prize_id
                            ) ??
                            null
                            : null;

                    /*
                     * Si por alguna razón una Card
                     * premiada todavía no tiene claim,
                     * se muestra como pendiente.
                     */
                    const status =
                        claim?.estado ??
                        "pending_claim";

                    return {
                        cardId:
                            card.id,

                        claimId:
                            claim?.id ??
                            null,

                        revealedAt:
                            card.revealed_at,

                        status,

                        automaticDelivery:
                            claim
                                ?.entrega_automatica ??
                            false,

                        deliveryOrderId:
                            claim
                                ?.pedido_entrega_id ??
                            null,

                        prize:
                            prize
                                ? {
                                    id:
                                        prize.id,

                                    name:
                                        prize.nombre,

                                    description:
                                        prize.descripcion,

                                    type:
                                        prize.tipo,

                                    imageUrl:
                                        prize.imagen_url,

                                    cardQuantity:
                                        prize.cantidad_cards,

                                    referenceValue:
                                        prize.valor_referencial,
                                }
                                : null,
                    };
                }
            );

        /*
         * =====================================================
         * 7. RESUMEN
         * =====================================================
         */

        const delivered =
            prizes.filter(
                (item) =>
                    item.status ===
                    "delivered"
            ).length;

        const scheduled =
            prizes.filter(
                (item) =>
                    item.status ===
                    "scheduled"
            ).length;

        const pending =
            prizes.filter(
                (item) =>
                    item.status ===
                    "pending_claim" ||
                    item.status ===
                    "verified"
            ).length;

        return NextResponse.json({
            ok: true,

            summary: {
                total:
                    prizes.length,

                pending,

                scheduled,

                delivered,
            },

            prizes,
        });
    } catch (
    error: unknown
    ) {
        console.error(
            "mi-cuenta/premios error:",
            error
        );

        return NextResponse.json(
            {
                ok: false,

                error:
                    error instanceof
                        Error
                        ? error.message
                        : "Error interno al consultar tus premios",
            },
            {
                status: 500,
            }
        );
    }
}