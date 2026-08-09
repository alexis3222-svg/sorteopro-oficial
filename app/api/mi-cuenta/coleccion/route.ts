// app/api/mi-cuenta/coleccion/route.ts

import {
    NextRequest,
    NextResponse,
} from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
 * Campaña actual Baruk593.
 *
 * Más adelante podemos hacer que esto sea
 * completamente dinámico desde el panel admin.
 */
const CURRENT_SORTEO_ID =
    "cedb391c-65e1-4684-801c-827200c66ded";

type BarukCardRow = {
    id: string;

    extra_type:
    | string
    | null;

    sphere_id:
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

type SphereRow = {
    id: string;
    numero: number;
    nombre: string;
    descripcion: string | null;
    imagen_url: string | null;
};

type RewardRow = {
    id: string;
    sorteo_id: string;
    nombre: string;
    descripcion: string | null;
    tipo: string;
    required_unique_spheres: number;
    activo: boolean;
};

type RewardClaimRow = {
    id: string;
    reward_id: string;
    sorteo_id: string;
    owner_user_id: string;
    owner_email: string | null;
    estado: string;
    unique_spheres_at_claim: number;
    completed_at: string;
    verified_at: string | null;
    scheduled_at: string | null;
    delivered_at: string | null;
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

        /*
         * =====================================================
         * 2. CARGAR PREMIO DE LA COLECCIÓN
         * =====================================================
         */

        const {
            data: rewardData,
            error: rewardError,
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
                    activo
                `)
                .eq(
                    "sorteo_id",
                    CURRENT_SORTEO_ID
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
         * =====================================================
         * 3. CARGAR LAS 7 ESFERAS DE LA CAMPAÑA
         * =====================================================
         */

        const {
            data: spheresData,
            error: spheresError,
        } =
            await supabaseAdmin
                .from("spheres")
                .select(`
                    id,
                    numero,
                    nombre,
                    descripcion,
                    imagen_url
                `)
                .eq(
                    "sorteo_id",
                    CURRENT_SORTEO_ID
                )
                .eq(
                    "activo",
                    true
                )
                .order(
                    "numero",
                    {
                        ascending: true,
                    }
                );

        if (spheresError) {
            console.error(
                "Error consultando spheres:",
                spheresError
            );

            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "No se pudo cargar la colección de esferas",
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

        /*
         * =====================================================
         * 4. CARGAR BARUK CARDS DEL USUARIO
         * =====================================================
         */

        const {
            data: cardsData,
            error: cardsError,
        } =
            await supabaseAdmin
                .from(
                    "baruk_cards"
                )
                .select(`
                    id,
                    extra_type,
                    sphere_id,
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
                "Error consultando Baruk Cards:",
                cardsError
            );

            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "No se pudieron consultar tus Baruk Cards",
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

        /*
         * No contamos tarjetas canceladas.
         */

        const validCards =
            cards.filter(
                (card) =>
                    card.estado !==
                    "cancelled"
            );

        /*
         * =====================================================
         * 5. SOLO RESULTADOS YA REVELADOS
         * =====================================================
         */

        const revealedCards =
            validCards.filter(
                (card) =>
                    card.revealed ===
                    true
            );

        /*
         * IDs de las esferas que pertenecen
         * específicamente a esta campaña.
         */

        const validSphereIds =
            new Set(
                spheres.map(
                    (sphere) =>
                        sphere.id
                )
            );

        const revealedSphereCards =
            revealedCards.filter(
                (card) =>
                    card.extra_type ===
                    "sphere" &&
                    Boolean(
                        card.sphere_id
                    ) &&
                    validSphereIds.has(
                        String(
                            card.sphere_id
                        )
                    )
            );

        const revealedPrizeCards =
            revealedCards.filter(
                (card) =>
                    card.extra_type ===
                    "prize" &&
                    Boolean(
                        card.prize_id
                    )
            );

        /*
         * =====================================================
         * 6. CONTAR DUPLICADOS
         * =====================================================
         */

        const ownedSphereCounts =
            new Map<
                string,
                number
            >();

        for (
            const card
            of revealedSphereCards
        ) {
            if (
                !card.sphere_id
            ) {
                continue;
            }

            const current =
                ownedSphereCounts.get(
                    card.sphere_id
                ) ?? 0;

            ownedSphereCounts.set(
                card.sphere_id,
                current + 1
            );
        }

        /*
         * =====================================================
         * 7. CREAR COLECCIÓN VISUAL
         * =====================================================
         */

        const collection =
            spheres.map(
                (sphere) => {
                    const ownedCount =
                        ownedSphereCounts.get(
                            sphere.id
                        ) ?? 0;

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

                        imageUrl:
                            sphere.imagen_url,

                        obtained:
                            ownedCount >
                            0,

                        ownedCount,
                    };
                }
            );

        const uniqueSpheres =
            collection.filter(
                (sphere) =>
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

        /*
         * El objetivo lo obtenemos del premio
         * configurado en collection_rewards.
         *
         * Si no existe configuración, usamos 7.
         */
        const sphereGoal =
            Number(
                reward
                    ?.required_unique_spheres ??
                7
            );

        const collectionCompleted =
            uniqueSpheres >=
            sphereGoal;

        /*
         * =====================================================
         * 8. SI COMPLETÓ LA COLECCIÓN, CREAR RECLAMO
         * =====================================================
         *
         * La función SQL es idempotente:
         *
         * si ya existe el reclamo,
         * NO crea otro.
         */

        if (
            reward &&
            collectionCompleted
        ) {
            const {
                error:
                ensureClaimError,
            } =
                await supabaseAdmin
                    .rpc(
                        "ensure_collection_reward_claim",
                        {
                            p_user_id:
                                user.id,

                            p_sorteo_id:
                                CURRENT_SORTEO_ID,

                            p_owner_email:
                                user.email ??
                                null,
                        }
                    );

            if (
                ensureClaimError
            ) {
                console.error(
                    "Error creando reclamo de colección:",
                    ensureClaimError
                );

                /*
                 * No impedimos que el usuario vea
                 * su colección si existe un problema
                 * administrativo con el reclamo.
                 */
            }
        }

        /*
         * =====================================================
         * 9. CONSULTAR EL RECLAMO ACTUAL
         * =====================================================
         */

        let rewardClaim:
            RewardClaimRow | null =
            null;

        if (reward) {
            const {
                data:
                claimData,
                error:
                claimError,
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
                        "sorteo_id",
                        CURRENT_SORTEO_ID
                    )
                    .maybeSingle();

            if (
                claimError
            ) {
                console.error(
                    "Error consultando reclamo de colección:",
                    claimError
                );
            } else {
                rewardClaim =
                    claimData as
                    | RewardClaimRow
                    | null;
            }
        }

        /*
         * =====================================================
         * 10. RESPUESTA
         * =====================================================
         */

        return NextResponse.json({
            ok: true,

            sorteoId:
                CURRENT_SORTEO_ID,

            summary: {
                totalCards:
                    validCards.length,

                revealedCards:
                    revealedCards.length,

                uniqueSpheres,

                totalSphereCopies,

                sphereGoal,

                totalPrizes:
                    revealedPrizeCards.length,

                collectionCompleted,
            },

            spheres:
                collection,

            /*
             * Información del premio especial.
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
                            reward.required_unique_spheres,

                        completed:
                            collectionCompleted,

                        claim:
                            rewardClaim
                                ? {
                                    id:
                                        rewardClaim.id,

                                    status:
                                        rewardClaim.estado,

                                    completedAt:
                                        rewardClaim.completed_at,

                                    verifiedAt:
                                        rewardClaim.verified_at,

                                    scheduledAt:
                                        rewardClaim.scheduled_at,

                                    deliveredAt:
                                        rewardClaim.delivered_at,
                                }
                                : null,
                    }
                    : null,
        });
    } catch (
    error: unknown
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