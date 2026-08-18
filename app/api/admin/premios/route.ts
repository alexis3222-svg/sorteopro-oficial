// app/api/admin/premios/route.ts

import {
    NextRequest,
    NextResponse,
} from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_STATES = [
    "pending_claim",
    "verified",
    "scheduled",
    "delivered",
    "cancelled",
] as const;

type ClaimStatus =
    (typeof ALLOWED_STATES)[number];

function normalizeEmail(
    value: unknown
) {
    return String(value ?? "")
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
        return {
            ok: false as const,
            status: 401,
            error:
                "La sesión administrativa ha expirado",
        };
    }

    /*
     * Administrador autorizado.
     */
    const adminUserId =
        String(
            process.env.ADMIN_UUID ??
            process.env
                .SUPABASE_ADMIN_USER_ID ??
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
 * CONSULTAR TODOS LOS PREMIOS
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

        /*
         * =====================================================
         * PREMIOS INSTANTÁNEOS
         * =====================================================
         */

        const {
            data:
            instantClaimsData,
            error:
            instantClaimsError,
        } =
            await supabaseAdmin
                .from(
                    "prize_claims"
                )
                .select("*")
                .order(
                    "created_at",
                    {
                        ascending:
                            false,
                    }
                );

        if (
            instantClaimsError
        ) {
            console.error(
                "Error leyendo prize_claims:",
                instantClaimsError
            );

            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "No se pudieron consultar los premios instantáneos",
                },
                {
                    status: 500,
                }
            );
        }

        const instantClaims =
            instantClaimsData ??
            [];

        const instantPrizeIds =
            [
                ...new Set(
                    instantClaims
                        .map(
                            (
                                claim: any
                            ) =>
                                claim.prize_id
                        )
                        .filter(
                            Boolean
                        )
                ),
            ];

        let prizeCatalog:
            any[] = [];

        if (
            instantPrizeIds.length >
            0
        ) {
            const {
                data:
                catalogData,
                error:
                catalogError,
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
                        instantPrizeIds
                    );

            if (
                catalogError
            ) {
                console.error(
                    "Error leyendo card_prizes:",
                    catalogError
                );
            } else {
                prizeCatalog =
                    catalogData ??
                    [];
            }
        }

        const prizeById =
            new Map<
                string,
                any
            >();

        for (
            const prize
            of prizeCatalog
        ) {
            prizeById.set(
                prize.id,
                prize
            );
        }

        const instantPrizes =
            instantClaims.map(
                (
                    claim: any
                ) => {
                    const prize =
                        claim.prize_id
                            ? prizeById.get(
                                claim.prize_id
                            ) ??
                            null
                            : null;

                    return {
                        kind:
                            "instant",

                        id:
                            claim.id,

                        cardId:
                            claim.card_id ??
                            null,

                        prizeId:
                            claim.prize_id ??
                            null,

                        ownerUserId:
                            claim.owner_user_id ??
                            null,

                        ownerEmail:
                            claim.owner_email ??
                            null,

                        ownerName:
                            claim.owner_name ??
                            null,

                        status:
                            claim.estado ??
                            "pending_claim",

                        automaticDelivery:
                            claim.entrega_automatica ??
                            false,

                        deliveryOrderId:
                            claim.pedido_entrega_id ??
                            null,

                        createdAt:
                            claim.created_at ??
                            null,

                        verifiedAt:
                            claim.verified_at ??
                            null,

                        scheduledAt:
                            claim.scheduled_at ??
                            null,

                        deliveredAt:
                            claim.delivered_at ??
                            null,

                        notes:
                            claim.notas ??
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

                                    cardQuantity:
                                        prize.cantidad_cards,

                                    referenceValue:
                                        prize.valor_referencial,

                                    imageUrl:
                                        prize.imagen_url,
                                }
                                : null,
                    };
                }
            );

        /*
         * =====================================================
         * PREMIOS POR COLECCIÓN
         * =====================================================
         */

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
                .select("*")
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
                "Error leyendo collection_reward_claims:",
                collectionClaimsError
            );

            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "No se pudieron consultar los premios de colección",
                },
                {
                    status: 500,
                }
            );
        }

        const collectionClaims =
            collectionClaimsData ??
            [];

        /*
* =====================================================
* ESFERAS UTILIZADAS EN CADA RECLAMO
* =====================================================
*/

        const collectionClaimIds =
            collectionClaims
                .map(
                    (
                        claim: any
                    ) =>
                        claim.id
                )
                .filter(
                    Boolean
                );


        let claimSphereRows:
            any[] =
            [];


        if (
            collectionClaimIds.length >
            0
        ) {

            const {
                data:
                claimSpheresData,

                error:
                claimSpheresError,
            } =
                await supabaseAdmin
                    .from(
                        "collection_reward_claim_spheres"
                    )
                    .select(`
                claim_id,
                sphere_instance_id,
                sphere_id
            `)
                    .in(
                        "claim_id",
                        collectionClaimIds
                    );


            if (
                claimSpheresError
            ) {

                console.error(
                    "Error leyendo collection_reward_claim_spheres:",
                    claimSpheresError
                );

            } else {

                claimSphereRows =
                    claimSpheresData ??
                    [];
            }
        }


        /*
         * IDs de las F1 Spheres que participaron
         * en algún reclamo.
         */

        const usedSphereIds =
            [
                ...new Set(
                    claimSphereRows
                        .map(
                            (
                                row: any
                            ) =>
                                row.sphere_id
                        )
                        .filter(
                            Boolean
                        )
                ),
            ];


        let usedSphereCatalog:
            any[] =
            [];


        if (
            usedSphereIds.length >
            0
        ) {

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
                team_name,
                team_slug,
                collection_key,
                season
            `)
                    .in(
                        "id",
                        usedSphereIds
                    );


            if (
                spheresError
            ) {

                console.error(
                    "Error leyendo catálogo de esferas reclamadas:",
                    spheresError
                );

            } else {

                usedSphereCatalog =
                    spheresData ??
                    [];
            }
        }


        const usedSphereById =
            new Map<
                string,
                any
            >();


        for (
            const sphere
            of usedSphereCatalog
        ) {

            usedSphereById.set(
                sphere.id,
                sphere
            );
        }


        /*
         * Agrupar las 11 utilizadas
         * por claim_id.
         */

        const usedSpheresByClaim =
            new Map<
                string,
                any[]
            >();


        for (
            const row
            of claimSphereRows
        ) {

            const sphere =
                usedSphereById.get(
                    row.sphere_id
                ) ??
                null;


            const current =
                usedSpheresByClaim.get(
                    row.claim_id
                ) ??
                [];


            current.push({

                sphereInstanceId:
                    row.sphere_instance_id,

                sphereId:
                    row.sphere_id,

                number:
                    sphere
                        ? Number(
                            sphere.numero
                        )
                        : null,

                name:
                    sphere?.nombre ??
                    null,

                teamName:
                    sphere?.team_name ??
                    null,

                teamSlug:
                    sphere?.team_slug ??
                    null,

                collectionKey:
                    sphere?.collection_key ??
                    null,

                season:
                    sphere?.season ??
                    null,
            });


            usedSpheresByClaim.set(
                row.claim_id,
                current
            );
        }


        /*
         * Ordenar Audi → Ferrari.
         */

        for (
            const [
                claimId,
                items,
            ]
            of usedSpheresByClaim
        ) {

            items.sort(
                (
                    a,
                    b
                ) =>
                    Number(
                        a.number ??
                        999
                    ) -
                    Number(
                        b.number ??
                        999
                    )
            );


            usedSpheresByClaim.set(
                claimId,
                items
            );
        }

        /*
 * =====================================================
 * NÚMERO DE PREMIO POR USUARIO
 * =====================================================
 */

        const claimsGroupedByUserReward =
            new Map<
                string,
                any[]
            >();


        for (
            const claim
            of collectionClaims
        ) {

            const key =
                `${claim.owner_user_id}:${claim.reward_id}`;


            const current =
                claimsGroupedByUserReward.get(
                    key
                ) ??
                [];


            current.push(
                claim
            );


            claimsGroupedByUserReward.set(
                key,
                current
            );
        }


        const claimNumberById =
            new Map<
                string,
                number
            >();


        const totalClaimsByUserReward =
            new Map<
                string,
                number
            >();


        for (
            const [
                key,
                claims,
            ]
            of claimsGroupedByUserReward
        ) {

            const ordered =
                [
                    ...claims,
                ].sort(
                    (
                        a,
                        b
                    ) => {

                        const dateA =
                            new Date(
                                a.completed_at ??
                                a.created_at ??
                                0
                            ).getTime();


                        const dateB =
                            new Date(
                                b.completed_at ??
                                b.created_at ??
                                0
                            ).getTime();


                        return (
                            dateA -
                            dateB
                        );
                    }
                );


            totalClaimsByUserReward.set(
                key,
                ordered.length
            );


            ordered.forEach(
                (
                    claim,
                    index
                ) => {

                    claimNumberById.set(
                        claim.id,
                        index + 1
                    );
                }
            );
        }

        const rewardIds =
            [
                ...new Set(
                    collectionClaims
                        .map(
                            (
                                claim: any
                            ) =>
                                claim.reward_id
                        )
                        .filter(
                            Boolean
                        )
                ),
            ];

        let rewardCatalog:
            any[] = [];

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
                    .select("*")
                    .in(
                        "id",
                        rewardIds
                    );

            if (
                rewardsError
            ) {
                console.error(
                    "Error leyendo collection_rewards:",
                    rewardsError
                );
            } else {
                rewardCatalog =
                    rewardsData ??
                    [];
            }
        }

        const rewardById =
            new Map<
                string,
                any
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

        const collectionPrizes =
            collectionClaims.map(
                (
                    claim: any
                ) => {
                    const reward =
                        rewardById.get(
                            claim.reward_id
                        ) ??
                        null;

                    return {
                        kind:
                            "collection",

                        id:
                            claim.id,

                        claimNumber:
                            claimNumberById.get(
                                claim.id
                            ) ??
                            1,

                        totalUserClaims:
                            totalClaimsByUserReward.get(
                                `${claim.owner_user_id}:${claim.reward_id}`
                            ) ??
                            1,

                        usedSpheres:
                            usedSpheresByClaim.get(
                                claim.id
                            ) ??
                            [],

                        ownerUserId:
                            claim.owner_user_id,

                        ownerEmail:
                            claim.owner_email ??
                            null,

                        status:
                            claim.estado ??
                            "pending_claim",

                        uniqueSpheres:
                            Number(
                                claim.unique_spheres_at_claim ??
                                0
                            ),

                        completedAt:
                            claim.completed_at ??
                            null,

                        createdAt:
                            claim.created_at ??
                            null,

                        verifiedAt:
                            claim.verified_at ??
                            null,

                        scheduledAt:
                            claim.scheduled_at ??
                            null,

                        deliveredAt:
                            claim.delivered_at ??
                            null,

                        notes:
                            claim.notas ??
                            null,

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
                                        Number(
                                            reward.required_unique_spheres ??
                                            7
                                        ),
                                }
                                : null,
                    };
                }
            );

        /*
         * =====================================================
         * RESUMEN
         * =====================================================
         */

        const allClaims = [
            ...instantPrizes,
            ...collectionPrizes,
        ];

        const summary = {
            total:
                allClaims.length,

            pending:
                allClaims.filter(
                    (
                        item: any
                    ) =>
                        item.status ===
                        "pending_claim" ||
                        item.status ===
                        "verified"
                ).length,

            scheduled:
                allClaims.filter(
                    (
                        item: any
                    ) =>
                        item.status ===
                        "scheduled"
                ).length,

            delivered:
                allClaims.filter(
                    (
                        item: any
                    ) =>
                        item.status ===
                        "delivered"
                ).length,
        };

        return NextResponse.json({
            ok: true,

            summary,

            instantPrizes,

            collectionPrizes,
        });
    } catch (
    error: unknown
    ) {
        console.error(
            "api/admin/premios GET:",
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

/*
 * =========================================================
 * PATCH
 *
 * CAMBIAR ESTADO / GUARDAR OBSERVACIONES
 * =========================================================
 */

export async function PATCH(
    req: NextRequest
) {
    try {
        /*
         * =====================================================
         * 1. VALIDAR ADMINISTRADOR
         * =====================================================
         */

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

        /*
         * =====================================================
         * 2. LEER BODY
         * =====================================================
         */

        const body =
            await req.json().catch(
                () => null
            );

        const kind =
            String(
                body?.kind ?? ""
            ).trim();

        const claimId =
            String(
                body?.claimId ?? ""
            ).trim();

        const statusRaw =
            String(
                body?.status ?? ""
            ).trim();

        const hasStatus =
            Boolean(
                statusRaw
            );

        const status =
            statusRaw as
            ClaimStatus;

        /*
         * Detectamos si realmente se envió
         * la propiedad "notes".
         *
         * Esto nos permite guardar solamente
         * observaciones sin obligar a cambiar
         * el estado.
         */
        const notesProvided =
            Object.prototype.hasOwnProperty.call(
                body ?? {},
                "notes"
            );

        const notes =
            notesProvided
                ? String(
                    body?.notes ??
                    ""
                ).trim()
                : null;

        /*
         * =====================================================
         * 3. VALIDACIONES
         * =====================================================
         */

        if (
            kind !== "instant" &&
            kind !== "collection"
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Tipo de premio inválido",
                },
                {
                    status: 400,
                }
            );
        }

        if (!claimId) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Falta claimId",
                },
                {
                    status: 400,
                }
            );
        }

        if (
            hasStatus &&
            !ALLOWED_STATES.includes(
                status
            )
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Estado de premio inválido",
                },
                {
                    status: 400,
                }
            );
        }

        if (
            !hasStatus &&
            !notesProvided
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "No existen cambios para guardar",
                },
                {
                    status: 400,
                }
            );
        }

        /*
         * =====================================================
         * 4. TABLA A ACTUALIZAR
         * =====================================================
         */

        const table =
            kind ===
                "collection"
                ? "collection_reward_claims"
                : "prize_claims";

        /*
         * =====================================================
         * 5. PREPARAR CAMBIOS
         * =====================================================
         */

        const now =
            new Date().toISOString();

        const updateData: {
            estado?: ClaimStatus;

            updated_at: string;

            verified_at?: string;

            scheduled_at?: string;

            delivered_at?: string;

            notas?:
            | string
            | null;
        } = {
            updated_at:
                now,
        };

        /*
         * Cambio de estado.
         */

        if (hasStatus) {
            updateData.estado =
                status;
        }

        /*
         * Observaciones.
         */

        if (
            notesProvided
        ) {
            updateData.notas =
                notes ||
                null;
        }

        /*
         * =====================================================
         * 6. HISTORIAL DE FECHAS
         * =====================================================
         */

        if (
            status ===
            "verified"
        ) {
            updateData.verified_at =
                now;
        }

        if (
            status ===
            "scheduled"
        ) {
            updateData.scheduled_at =
                now;
        }

        if (
            status ===
            "delivered"
        ) {
            updateData.delivered_at =
                now;
        }

        /*
         * =====================================================
         * 7. ACTUALIZAR SUPABASE
         * =====================================================
         */

        const {
            data: updated,
            error: updateError,
        } =
            await supabaseAdmin
                .from(
                    table
                )
                .update(
                    updateData
                )
                .eq(
                    "id",
                    claimId
                )
                .select(`
                    id,
                    estado,
                    verified_at,
                    scheduled_at,
                    delivered_at,
                    notas
                `)
                .maybeSingle();

        if (
            updateError
        ) {
            console.error(
                "Error actualizando premio:",
                updateError
            );

            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "No se pudo actualizar el premio",
                },
                {
                    status: 500,
                }
            );
        }

        if (!updated) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "No se encontró el reclamo",
                },
                {
                    status: 404,
                }
            );
        }

        /*
         * =====================================================
         * 8. RESPUESTA
         * =====================================================
         */

        return NextResponse.json({
            ok: true,

            claim: {
                id:
                    updated.id,

                status:
                    updated.estado,

                verifiedAt:
                    updated.verified_at ??
                    null,

                scheduledAt:
                    updated.scheduled_at ??
                    null,

                deliveredAt:
                    updated.delivered_at ??
                    null,

                notes:
                    updated.notas ??
                    null,
            },
        });
    } catch (
    error: unknown
    ) {
        console.error(
            "api/admin/premios PATCH:",
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