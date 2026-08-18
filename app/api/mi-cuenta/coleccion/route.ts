// app/api/mi-cuenta/coleccion/route.ts

import {
    NextRequest,
    NextResponse,
} from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   CAMPAÑA / COLECCIÓN ACTUAL
============================================================ */

const CURRENT_SORTEO_ID =
    "cedb391c-65e1-4684-801c-827200c66ded";

const CURRENT_COLLECTION_KEY =
    "f1-2026";

const CURRENT_COLLECTION_NAME =
    "F1 Sphere Collection";

const CURRENT_COLLECTION_SEASON =
    2026;

const CURRENT_SPHERE_GOAL =
    11;

/* ============================================================
   TIPOS
============================================================ */

type BarukCardRow = {
    id: string;

    extra_type:
    | string
    | null;

    prize_id:
    | string
    | null;

    revealed:
    | boolean
    | null;

    estado:
    | string
    | null;
};

type OriginCardRow = {
    id: string;

    revealed:
    | boolean
    | null;

    estado:
    | string
    | null;
};

type SphereRow = {
    id: string;

    numero: number;

    nombre: string;

    descripcion:
    | string
    | null;

    imagen_url:
    | string
    | null;

    collection_key:
    | string
    | null;

    team_name:
    | string
    | null;

    team_slug:
    | string
    | null;

    season:
    | number
    | null;

    rarity:
    | "common"
    | "rare"
    | "epic"
    | "legendary"
    | null;

    primary_color:
    | string
    | null;

    secondary_color:
    | string
    | null;

    accent_color:
    | string
    | null;

    car_image_url:
    | string
    | null;

    activa:
    boolean;

    marketplace_enabled:
    boolean;

    stock_total:
    | number
    | null;

    stock_asignado:
    number;
};

type SphereInstanceRow = {
    id: string;

    sphere_id: string;

    origin_card_id: string;

    owner_user_id: string;

    status:
    | "available"
    | "listed"
    | "redeemed";
};

type RewardRow = {
    id: string;

    sorteo_id: string;

    nombre: string;

    descripcion:
    | string
    | null;

    tipo: string;

    required_unique_spheres:
    number;

    activo: boolean;

    collection_key:
    | string
    | null;
};

type RewardClaimRow = {
    id: string;

    reward_id:
    string;

    sorteo_id:
    string;

    owner_user_id:
    string;

    owner_email:
    | string
    | null;

    estado:
    string;

    unique_spheres_at_claim:
    number;

    completed_at:
    string;

    verified_at:
    | string
    | null;

    scheduled_at:
    | string
    | null;

    delivered_at:
    | string
    | null;
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
           2. PREMIO DE LA COLECCIÓN F1
        ===================================================== */

        const {
            data:
            rewardData,

            error:
            rewardError,
        } =
            await supabaseAdmin
                .from(
                    "collection_rewards"
                )
                .select(`
                    id,
                    sorteo_id,
                    nombre,
                    descripcion,
                    tipo,
                    required_unique_spheres,
                    activo,
                    collection_key
                `)
                .eq(
                    "sorteo_id",
                    CURRENT_SORTEO_ID
                )
                .eq(
                    "collection_key",
                    CURRENT_COLLECTION_KEY
                )
                .eq(
                    "activo",
                    true
                )
                .maybeSingle();

        if (rewardError) {

            console.error(
                "Error consultando collection_rewards:",
                rewardError
            );

            return NextResponse.json(
                {
                    ok: false,

                    error:
                        "No se pudo consultar el premio de la colección",
                },
                {
                    status: 500,
                }
            );
        }

        const reward =
            rewardData as
            | RewardRow
            | null;

        /*
         * Seguridad:
         *
         * La colección F1 SIEMPRE necesita
         * 11 escuderías diferentes.
         *
         * Aunque exista por error un reward antiguo
         * configurado para 7, esta API seguirá
         * considerando 11 como objetivo.
         */
        const sphereGoal =
            CURRENT_SPHERE_GOAL;

        if (
            reward &&
            Number(
                reward.required_unique_spheres
            ) !== CURRENT_SPHERE_GOAL
        ) {
            console.warn(
                "Reward F1 tiene required_unique_spheres distinto de 11:",
                reward.required_unique_spheres
            );
        }

        /* =====================================================
           3. CARGAR CATÁLOGO DE LAS 11 F1 SPHERES
        ===================================================== */

        /*
         * spheres representa el CATÁLOGO:
         *
         * Audi
         * Cadillac
         * Alpine
         * ...
         * Ferrari
         *
         * NO representa las copias propiedad
         * de cada usuario.
         */

        const {
            data:
            spheresData,

            error:
            spheresError,
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
                    imagen_url,
                    collection_key,
                    team_name,
                    team_slug,
                    season,
                    rarity,
                    primary_color,
                    secondary_color,
                    accent_color,
                    car_image_url,
                    activa,
                    marketplace_enabled,
                    stock_total,
                    stock_asignado
                `)
                .eq(
                    "sorteo_id",
                    CURRENT_SORTEO_ID
                )
                .eq(
                    "collection_key",
                    CURRENT_COLLECTION_KEY
                )
                .eq(
                    "season",
                    CURRENT_COLLECTION_SEASON
                )
                .order(
                    "numero",
                    {
                        ascending:
                            true,
                    }
                );

        if (spheresError) {

            console.error(
                "Error consultando F1 spheres:",
                spheresError
            );

            return NextResponse.json(
                {
                    ok: false,

                    error:
                        "No se pudo cargar la colección F1",
                },
                {
                    status: 500,
                }
            );
        }

        const spheres =
            (
                spheresData ??
                []
            ) as SphereRow[];

        /* =====================================================
           4. VALIDAR COLECCIÓN
        ===================================================== */

        if (
            spheres.length ===
            0
        ) {
            return NextResponse.json(
                {
                    ok: false,

                    error:
                        "La colección F1 todavía no está configurada",
                },
                {
                    status: 500,
                }
            );
        }

        if (
            spheres.length !==
            CURRENT_SPHERE_GOAL
        ) {
            console.warn(
                `F1 Sphere Collection tiene ${spheres.length} esferas; se esperaban ${CURRENT_SPHERE_GOAL}.`
            );
        }

        /*
         * IDs pertenecientes exclusivamente
         * a f1-2026.
         */
        const validSphereIds =
            new Set(
                spheres.map(
                    (
                        sphere
                    ) =>
                        sphere.id
                )
            );

        /* =====================================================
           5. CARGAR EXPERIENCE PASS DEL USUARIO
        ===================================================== */

        /*
         * Seguimos cargándolas para:
         *
         * - total de Experience Pass
         * - total reveladas
         * - premios instantáneos
         *
         * Ya NO usamos baruk_cards.sphere_id
         * para decidir propiedad de F1 Spheres.
         */

        const {
            data:
            cardsData,

            error:
            cardsError,
        } =
            await supabaseAdmin
                .from(
                    "baruk_cards"
                )
                .select(`
                    id,
                    extra_type,
                    prize_id,
                    revealed,
                    estado
                `)
                .eq(
                    "owner_user_id",
                    user.id
                );

        if (cardsError) {

            console.error(
                "Error consultando Experience Pass:",
                cardsError
            );

            return NextResponse.json(
                {
                    ok: false,

                    error:
                        "No se pudieron consultar tus Experience Pass",
                },
                {
                    status: 500,
                }
            );
        }

        const cards =
            (
                cardsData ??
                []
            ) as BarukCardRow[];

        /* =====================================================
           6. EXPERIENCE PASS VÁLIDAS
        ===================================================== */

        const validCards =
            cards.filter(
                (
                    card
                ) =>
                    card.estado !==
                    "cancelled"
            );

        const revealedCards =
            validCards.filter(
                (
                    card
                ) =>
                    card.revealed ===
                    true
            );

        /* =====================================================
           7. PREMIOS INSTANTÁNEOS
        ===================================================== */

        const revealedPrizeCards =
            revealedCards.filter(
                (
                    card
                ) =>
                    card.extra_type ===
                    "prize" &&

                    Boolean(
                        card.prize_id
                    )
            );

        /* =====================================================
           8. CARGAR ESFERAS QUE ACTUALMENTE PERTENECEN
              AL USUARIO
        ===================================================== */

        /*
         * AQUÍ ESTÁ EL CAMBIO PRINCIPAL.
         *
         * La propiedad oficial ya NO sale de:
         *
         * baruk_cards.sphere_id
         *
         * Ahora sale de:
         *
         * sphere_instances.owner_user_id
         *
         * Estados que cuentan para colección:
         *
         * available
         * listed
         *
         * redeemed NO cuenta porque esa esfera
         * ya fue utilizada en una colección premiada.
         */

        const {
            data:
            instancesData,

            error:
            instancesError,
        } =
            await supabaseAdmin
                .from(
                    "sphere_instances"
                )
                .select(`
    id,
    sphere_id,
    origin_card_id,
    owner_user_id,
    status
`)
                .eq(
                    "owner_user_id",
                    user.id
                )
                .in(
                    "status",
                    [
                        "available",
                        "listed",
                    ]
                );

        if (instancesError) {

            console.error(
                "Error consultando sphere_instances:",
                instancesError
            );

            return NextResponse.json(
                {
                    ok: false,

                    error:
                        "No se pudieron consultar tus F1 Spheres",
                },
                {
                    status: 500,
                }
            );
        }

        const sphereInstances =
            (
                instancesData ??
                []
            ) as SphereInstanceRow[];

        /* =====================================================
           9. OBTENER EXPERIENCE PASS DE ORIGEN
        ===================================================== */

        /*
         * Una F1 Sphere se crea cuando se asigna
         * el extra, pero NO debemos mostrarla
         * antes de que el usuario revele
         * la Experience Pass.
         *
         * Por eso comprobamos revealed = true
         * en la tarjeta que originó la esfera.
         *
         * Esto también funciona cuando posteriormente
         * la esfera se vende:
         *
         * origin_card_id permanece igual,
         * owner_user_id de sphere_instances cambia.
         */

        const originCardIds =
            Array.from(
                new Set(
                    sphereInstances
                        .map(
                            (
                                instance
                            ) =>
                                instance.origin_card_id
                        )
                        .filter(
                            Boolean
                        )
                )
            );

        let originCards:
            OriginCardRow[] =
            [];

        if (
            originCardIds.length >
            0
        ) {

            const {
                data:
                originCardsData,

                error:
                originCardsError,
            } =
                await supabaseAdmin
                    .from(
                        "baruk_cards"
                    )
                    .select(`
                        id,
                        revealed,
                        estado
                    `)
                    .in(
                        "id",
                        originCardIds
                    );

            if (
                originCardsError
            ) {

                console.error(
                    "Error consultando Experience Pass de origen:",
                    originCardsError
                );

                return NextResponse.json(
                    {
                        ok: false,

                        error:
                            "No se pudo validar el origen de tus F1 Spheres",
                    },
                    {
                        status: 500,
                    }
                );
            }

            originCards =
                (
                    originCardsData ??
                    []
                ) as OriginCardRow[];
        }

        const originCardsById =
            new Map<
                string,
                OriginCardRow
            >();

        for (
            const card
            of originCards
        ) {
            originCardsById.set(
                card.id,
                card
            );
        }

        /* =====================================================
           10. INSTANCIAS VÁLIDAS PARA LA COLECCIÓN
        ===================================================== */

        const ownedF1Instances =
            sphereInstances.filter(
                (
                    instance
                ) => {

                    /*
                     * Evita contar cualquier esfera
                     * legacy que pudiera existir
                     * en sphere_instances.
                     */
                    if (
                        !validSphereIds.has(
                            instance.sphere_id
                        )
                    ) {
                        return false;
                    }

                    const originCard =
                        originCardsById.get(
                            instance.origin_card_id
                        );

                    /*
                     * No mostramos la esfera
                     * hasta revelar su Experience Pass.
                     */
                    if (
                        !originCard ||
                        originCard.revealed !==
                        true
                    ) {
                        return false;
                    }

                    /*
                     * Seguridad adicional.
                     */
                    if (
                        originCard.estado ===
                        "cancelled"
                    ) {
                        return false;
                    }

                    return true;
                }
            );

        /* =====================================================
           11. CONTAR COPIAS / DUPLICADOS
        ===================================================== */

        const ownedSphereCounts =
            new Map<
                string,
                number
            >();

        const availableSphereCounts =
            new Map<
                string,
                number
            >();

        const listedSphereCounts =
            new Map<
                string,
                number
            >();

        for (
            const instance
            of ownedF1Instances
        ) {

            const currentOwned =
                ownedSphereCounts.get(
                    instance.sphere_id
                ) ??
                0;

            ownedSphereCounts.set(
                instance.sphere_id,
                currentOwned + 1
            );


            if (
                instance.status ===
                "available"
            ) {

                const currentAvailable =
                    availableSphereCounts.get(
                        instance.sphere_id
                    ) ??
                    0;

                availableSphereCounts.set(
                    instance.sphere_id,
                    currentAvailable + 1
                );
            }


            if (
                instance.status ===
                "listed"
            ) {

                const currentListed =
                    listedSphereCounts.get(
                        instance.sphere_id
                    ) ??
                    0;

                listedSphereCounts.set(
                    instance.sphere_id,
                    currentListed + 1
                );
            }
        }

        /* =====================================================
           12. CREAR COLECCIÓN VISUAL
        ===================================================== */

        const collection =
            spheres.map(
                (
                    sphere
                ) => {

                    const ownedCount =
                        ownedSphereCounts.get(
                            sphere.id
                        ) ??
                        0;

                    const availableCount =
                        availableSphereCounts.get(
                            sphere.id
                        ) ??
                        0;

                    const listedCount =
                        listedSphereCounts.get(
                            sphere.id
                        ) ??
                        0;

                    return {

                        id:
                            sphere.id,

                        number:
                            Number(
                                sphere.numero
                            ),

                        name:
                            sphere.nombre,

                        description:
                            sphere.descripcion,

                        collectionKey:
                            sphere.collection_key,

                        teamName:
                            sphere.team_name,

                        teamSlug:
                            sphere.team_slug,

                        season:
                            sphere.season,

                        rarity:
                            sphere.rarity,

                        primaryColor:
                            sphere.primary_color,

                        secondaryColor:
                            sphere.secondary_color,

                        accentColor:
                            sphere.accent_color,

                        imageUrl:
                            sphere.imagen_url,

                        carImageUrl:
                            sphere.car_image_url,

                        active:
                            sphere.activa,

                        marketplaceEnabled:
                            sphere.marketplace_enabled,

                        stockTotal:
                            sphere.stock_total,

                        stockAssigned:
                            Number(
                                sphere.stock_asignado ??
                                0
                            ),

                        /*
                         * PROPIEDAD REAL.
                         */
                        obtained:
                            ownedCount >
                            0,

                        ownedCount,

                        /*
                         * Preparado para Marketplace.
                         */
                        availableCount,

                        listedCount,
                    };
                }
            );

        /* =====================================================
           13. RESUMEN DE COLECCIÓN
        ===================================================== */

        const uniqueSpheres =
            collection.filter(
                (
                    sphere
                ) =>
                    sphere.obtained
            ).length;

        const totalSphereCopies =
            collection.reduce(
                (
                    total,
                    sphere
                ) =>
                    total +
                    sphere.ownedCount,
                0
            );

        const totalAvailableSphereCopies =
            collection.reduce(
                (
                    total,
                    sphere
                ) =>
                    total +
                    sphere.availableCount,
                0
            );

        const totalListedSphereCopies =
            collection.reduce(
                (
                    total,
                    sphere
                ) =>
                    total +
                    sphere.listedCount,
                0
            );


        const uniqueAvailableSpheres =
            collection.filter(
                (
                    sphere
                ) =>
                    sphere.availableCount >
                    0
            ).length;


        const collectionCompleted =
            uniqueSpheres >=
            sphereGoal;

        /* =====================================================
           14. CONSULTAR RECLAMO EXISTENTE
        ===================================================== */

        /*
         * IMPORTANTE:
         *
         * ESTA API GET YA NO CREA RECLAMOS.
         *
         * Completar 11/11 solamente habilitará
         * el botón "Reclamar premio".
         *
         * Posteriormente crearemos un endpoint/RPC
         * específico que:
         *
         * 1. Verifique las 11 esferas.
         * 2. Tome exactamente una de cada escudería.
         * 3. Las marque como redeemed.
         * 4. Cree el reclamo.
         *
         * Todo dentro de una sola transacción.
         */

        /* =====================================================
   14. CONSULTAR HISTORIAL DE RECLAMOS
===================================================== */

        let rewardClaims:
            RewardClaimRow[] =
            [];


        if (reward) {

            const {
                data:
                claimsData,

                error:
                claimsError,
            } =
                await supabaseAdmin
                    .from(
                        "collection_reward_claims"
                    )
                    .select(`
                id,
                reward_id,
                sorteo_id,
                owner_user_id,
                owner_email,
                estado,
                unique_spheres_at_claim,
                completed_at,
                verified_at,
                scheduled_at,
                delivered_at
            `)
                    .eq(
                        "owner_user_id",
                        user.id
                    )
                    .eq(
                        "reward_id",
                        reward.id
                    )
                    .order(
                        "completed_at",
                        {
                            ascending:
                                false,
                        }
                    );


            if (
                claimsError
            ) {

                console.error(
                    "Error consultando reclamos F1:",
                    claimsError
                );

            } else {

                rewardClaims =
                    (
                        claimsData ??
                        []
                    ) as RewardClaimRow[];
            }
        }


        /*
         * El más reciente se mantiene también
         * como "claim" para no romper la interfaz
         * existente de Mi cuenta.
         */

        const latestRewardClaim =
            rewardClaims.length >
                0
                ? rewardClaims[0]
                : null;


        const totalRewardClaims =
            rewardClaims.length;


        /*
         * IMPORTANTE:
         *
         * Ya NO comprobamos si existe un reclamo anterior.
         *
         * Un usuario puede volver a reunir las 11 esferas
         * y reclamar nuevamente.
         */

        const canClaimReward =
            Boolean(
                reward
            ) &&
            collectionCompleted &&
            uniqueAvailableSpheres >=
            sphereGoal;



        return NextResponse.json({

            ok: true,

            sorteoId:
                CURRENT_SORTEO_ID,

            /*
             * IDENTIDAD DE LA COLECCIÓN
             */

            collection: {

                key:
                    CURRENT_COLLECTION_KEY,

                name:
                    CURRENT_COLLECTION_NAME,

                season:
                    CURRENT_COLLECTION_SEASON,

                totalSpheres:
                    spheres.length,
            },

            /*
             * RESUMEN DEL USUARIO
             */

            summary: {

                totalCards:
                    validCards.length,

                revealedCards:
                    revealedCards.length,

                uniqueSpheres,

                totalSphereCopies,

                totalAvailableSphereCopies,

                totalListedSphereCopies,

                sphereGoal,

                totalPrizes:
                    revealedPrizeCards.length,

                collectionCompleted,

                /*
                 * El botón solo deberá habilitarse
                 * cuando exista un reward F1
                 * y el usuario tenga 11/11.
                 */
                canClaimReward,
            },

            /*
             * LAS 11 F1 SPHERES
             */

            spheres:
                collection,

            /*
             * PREMIO ESPECIAL
             */

            reward:
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

                        requiredSpheres:
                            sphereGoal,

                        completed:
                            collectionCompleted,

                        canClaim:
                            canClaimReward,

                        totalClaims:
                            totalRewardClaims,

                        claim:
                            latestRewardClaim
                                ? {

                                    id:
                                        latestRewardClaim.id,

                                    status:
                                        latestRewardClaim.estado,

                                    completedAt:
                                        latestRewardClaim.completed_at,

                                    verifiedAt:
                                        latestRewardClaim.verified_at,

                                    scheduledAt:
                                        latestRewardClaim.scheduled_at,

                                    deliveredAt:
                                        latestRewardClaim.delivered_at,
                                }
                                : null,

                        claims:
                            rewardClaims.map(
                                (
                                    claim
                                ) => ({

                                    id:
                                        claim.id,

                                    status:
                                        claim.estado,

                                    completedAt:
                                        claim.completed_at,

                                    verifiedAt:
                                        claim.verified_at,

                                    scheduledAt:
                                        claim.scheduled_at,

                                    deliveredAt:
                                        claim.delivered_at,
                                })
                            ),
                    }
                    : null,
        });

    } catch (
    error:
        unknown
    ) {

        console.error(
            "mi-cuenta/coleccion error:",
            error
        );

        return NextResponse.json(
            {
                ok: false,

                error:
                    error instanceof
                        Error
                        ? error.message
                        : "Error interno al consultar la colección",
            },
            {
                status: 500,
            }
        );
    }
}