// app/api/mi-cuenta/premios/route.ts

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


/* ============================================================
   TIPOS
============================================================ */

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

    entrega_automatica:
    boolean | null;

    pedido_entrega_id:
    number | null;

    created_at:
    string | null;

    verified_at:
    string | null;

    scheduled_at:
    string | null;

    delivered_at:
    string | null;
};


type PrizeRow = {
    id: string;
    nombre: string;
    descripcion: string | null;
    tipo: string;
    imagen_url: string | null;

    cantidad_cards:
    number | null;

    valor_referencial:
    number | null;
};


type CollectionClaimRow = {
    id: string;
    reward_id: string;

    owner_user_id:
    string;

    owner_email:
    string | null;

    estado:
    string;

    unique_spheres_at_claim:
    number | null;

    completed_at:
    string | null;

    created_at:
    string | null;

    verified_at:
    string | null;

    scheduled_at:
    string | null;

    delivered_at:
    string | null;

    notas:
    string | null;
};


type CollectionRewardRow = {
    id: string;
    nombre: string;

    descripcion:
    string | null;

    tipo:
    string;

    required_unique_spheres:
    number | null;
};


/* ============================================================
   GET
============================================================ */

export async function GET(
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
                    ok:
                        false,

                    error:
                        "No existe una sesión válida",
                },
                {
                    status:
                        401,
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


        if (
            !accessToken
        ) {

            return NextResponse.json(
                {
                    ok:
                        false,

                    error:
                        "Token de sesión inválido",
                },
                {
                    status:
                        401,
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
                    ok:
                        false,

                    error:
                        "La sesión no es válida o ha expirado",
                },
                {
                    status:
                        401,
                }
            );
        }


        const user =
            userData.user;


        /* =====================================================
           2. PREMIOS INSTANTÁNEOS
           SOLO TARJETAS YA REVELADAS
        ===================================================== */

        const {
            data:
            prizeCardsData,

            error:
            prizeCardsError,
        } =
            await supabaseAdmin
                .from(
                    "baruk_cards"
                )
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
                        ascending:
                            false,
                    }
                );


        if (
            prizeCardsError
        ) {

            console.error(
                "Error consultando cards premiadas:",
                prizeCardsError
            );


            return NextResponse.json(
                {
                    ok:
                        false,

                    error:
                        "No se pudieron consultar tus premios",
                },
                {
                    status:
                        500,
                }
            );
        }


        const prizeCards =
            (
                prizeCardsData ??
                []
            ) as
            PrizeCardRow[];


        const cardIds =
            prizeCards.map(
                (
                    card
                ) =>
                    card.id
            );


        const prizeIds =
            [
                ...new Set(
                    prizeCards
                        .map(
                            (
                                card
                            ) =>
                                card.prize_id
                        )
                        .filter(
                            (
                                value
                            ):
                                value is string =>
                                Boolean(
                                    value
                                )
                        )
                ),
            ];


        /* =====================================================
           3. RECLAMOS DE PREMIOS INSTANTÁNEOS
        ===================================================== */

        let claims:
            PrizeClaimRow[] =
            [];


        if (
            cardIds.length >
            0
        ) {

            const {
                data:
                claimsData,

                error:
                claimsError,
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
                        created_at,
                        verified_at,
                        scheduled_at,
                        delivered_at
                    `)
                    .in(
                        "card_id",
                        cardIds
                    );


            if (
                claimsError
            ) {

                console.error(
                    "Error consultando prize_claims:",
                    claimsError
                );


                return NextResponse.json(
                    {
                        ok:
                            false,

                        error:
                            "No se pudo consultar el estado de tus premios",
                    },
                    {
                        status:
                            500,
                    }
                );
            }


            claims =
                (
                    claimsData ??
                    []
                ) as
                PrizeClaimRow[];
        }


        /* =====================================================
           4. CATÁLOGO PREMIOS INSTANTÁNEOS
        ===================================================== */

        let prizesCatalog:
            PrizeRow[] =
            [];


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
                    "Error consultando catálogo:",
                    prizesError
                );


                return NextResponse.json(
                    {
                        ok:
                            false,

                        error:
                            "No se pudo cargar la información de tus premios",
                    },
                    {
                        status:
                            500,
                    }
                );
            }


            prizesCatalog =
                (
                    prizesData ??
                    []
                ) as
                PrizeRow[];
        }


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


        /* =====================================================
           5. CONSTRUIR PREMIOS INSTANTÁNEOS
        ===================================================== */

        const instantPrizes =
            prizeCards.map(
                (
                    card
                ) => {

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


                    return {

                        kind:
                            "instant" as const,


                        /*
                         * cardId sigue siendo la llave
                         * visual utilizada en Mi Cuenta.
                         */
                        cardId:
                            card.id,


                        claimId:
                            claim?.id ??
                            null,


                        revealedAt:
                            card.revealed_at,


                        status:
                            claim?.estado ??
                            "pending_claim",


                        automaticDelivery:
                            claim
                                ?.entrega_automatica ??
                            false,


                        deliveryOrderId:
                            claim
                                ?.pedido_entrega_id ??
                            null,


                        createdAt:
                            claim
                                ?.created_at ??
                            card.revealed_at,


                        verifiedAt:
                            claim
                                ?.verified_at ??
                            null,


                        scheduledAt:
                            claim
                                ?.scheduled_at ??
                            null,


                        deliveredAt:
                            claim
                                ?.delivered_at ??
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


        /* =====================================================
           6. PREMIOS DE F1 SPHERE COLLECTION
        ===================================================== */

        const {
            data:
            collectionClaimsData,

            error:
            collectionClaimsError,
        } =
            await supabaseAdmin
                .from(
                    "collection_reward_claims"
                )
                .select(`
                    id,
                    reward_id,
                    owner_user_id,
                    owner_email,
                    estado,
                    unique_spheres_at_claim,
                    completed_at,
                    created_at,
                    verified_at,
                    scheduled_at,
                    delivered_at,
                    notas
                `)
                .eq(
                    "owner_user_id",
                    user.id
                )
                .order(
                    "created_at",
                    {
                        ascending:
                            false,
                    }
                );


        if (
            collectionClaimsError
        ) {

            console.error(
                "Error consultando premios de colección:",
                collectionClaimsError
            );


            return NextResponse.json(
                {
                    ok:
                        false,

                    error:
                        "No se pudieron consultar tus premios de colección",
                },
                {
                    status:
                        500,
                }
            );
        }


        const collectionClaims =
            (
                collectionClaimsData ??
                []
            ) as
            CollectionClaimRow[];


        const rewardIds =
            [
                ...new Set(
                    collectionClaims
                        .map(
                            (
                                claim
                            ) =>
                                claim.reward_id
                        )
                        .filter(
                            Boolean
                        )
                ),
            ];


        /* =====================================================
           7. CATÁLOGO PREMIOS DE COLECCIÓN
        ===================================================== */

        let rewardCatalog:
            CollectionRewardRow[] =
            [];


        if (
            rewardIds.length >
            0
        ) {

            const {
                data:
                rewardsData,

                error:
                rewardsError,
            } =
                await supabaseAdmin
                    .from(
                        "collection_rewards"
                    )
                    .select(`
                        id,
                        nombre,
                        descripcion,
                        tipo,
                        required_unique_spheres
                    `)
                    .in(
                        "id",
                        rewardIds
                    );


            if (
                rewardsError
            ) {

                console.error(
                    "Error consultando collection_rewards:",
                    rewardsError
                );


                return NextResponse.json(
                    {
                        ok:
                            false,

                        error:
                            "No se pudo cargar la información del premio de colección",
                    },
                    {
                        status:
                            500,
                    }
                );
            }


            rewardCatalog =
                (
                    rewardsData ??
                    []
                ) as
                CollectionRewardRow[];
        }


        const rewardById =
            new Map<
                string,
                CollectionRewardRow
            >();


        for (
            const reward
            of rewardCatalog
        ) {

            rewardById.set(
                reward.id,
                reward
            );
        }


        /* =====================================================
           8. CONVERTIR PREMIO DE COLECCIÓN
              AL MISMO FORMATO DE "MIS PREMIOS"
        ===================================================== */

        const collectionPrizes =
            collectionClaims.map(
                (
                    claim
                ) => {

                    const reward =
                        rewardById.get(
                            claim.reward_id
                        ) ??
                        null;


                    return {

                        kind:
                            "collection" as const,


                        /*
                         * No existe baruk_card asociada.
                         *
                         * Creamos una llave visual única
                         * para React.
                         */
                        cardId:
                            `collection-${claim.id}`,


                        claimId:
                            claim.id,


                        revealedAt:
                            claim.completed_at ??
                            claim.created_at,


                        status:
                            claim.estado ??
                            "pending_claim",


                        automaticDelivery:
                            false,


                        deliveryOrderId:
                            null,


                        createdAt:
                            claim.created_at,


                        verifiedAt:
                            claim.verified_at,


                        scheduledAt:
                            claim.scheduled_at,


                        deliveredAt:
                            claim.delivered_at,


                        /*
                         * Información adicional
                         * exclusiva de colección.
                         */
                        collection:
                        {

                            uniqueSpheres:
                                Number(
                                    claim
                                        .unique_spheres_at_claim ??
                                    0
                                ),

                            requiredSpheres:
                                Number(
                                    reward
                                        ?.required_unique_spheres ??
                                    11
                                ),
                        },


                        prize:
                            reward
                                ? {

                                    id:
                                        reward.id,

                                    name:
                                        reward.nombre,

                                    description:
                                        reward.descripcion,

                                    type:
                                        reward.tipo,

                                    imageUrl:
                                        null,

                                    cardQuantity:
                                        null,

                                    referenceValue:
                                        null,
                                }

                                : null,
                    };
                }
            );


        /* =====================================================
           9. UNIR TODOS LOS PREMIOS
        ===================================================== */

        const allPrizes =
            [
                ...instantPrizes,
                ...collectionPrizes,
            ]
                .sort(
                    (
                        a,
                        b
                    ) => {

                        const dateA =
                            new Date(
                                a.createdAt ??
                                a.revealedAt ??
                                0
                            ).getTime();


                        const dateB =
                            new Date(
                                b.createdAt ??
                                b.revealedAt ??
                                0
                            ).getTime();


                        return (
                            dateB -
                            dateA
                        );
                    }
                );


        /* =====================================================
           10. RESUMEN GENERAL
        ===================================================== */

        const delivered =
            allPrizes.filter(
                (
                    item
                ) =>
                    item.status ===
                    "delivered"
            ).length;


        const scheduled =
            allPrizes.filter(
                (
                    item
                ) =>
                    item.status ===
                    "scheduled"
            ).length;


        const pending =
            allPrizes.filter(
                (
                    item
                ) =>
                    item.status ===
                    "pending_claim" ||
                    item.status ===
                    "verified"
            ).length;


        /* =====================================================
           11. RESPUESTA
        ===================================================== */

        return NextResponse.json({

            ok:
                true,


            summary:
            {

                total:
                    allPrizes.length,

                pending,

                scheduled,

                delivered,
            },


            prizes:
                allPrizes,
        });


    } catch (
    error:
        unknown
    ) {

        console.error(
            "mi-cuenta/premios error:",
            error
        );


        return NextResponse.json(
            {
                ok:
                    false,

                error:
                    error instanceof
                        Error
                        ? error.message

                        : "Error interno al consultar tus premios",
            },
            {
                status:
                    500,
            }
        );
    }
}