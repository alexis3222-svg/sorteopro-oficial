// app/api/marketplace/spheres/my-inventory/route.ts

import {
    NextRequest,
    NextResponse,
} from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CURRENT_COLLECTION_KEY =
    "f1-2026";

const CURRENT_COLLECTION_SEASON =
    2026;


/* ============================================================
   GET
   INVENTARIO PERSONAL DE F1 SPHERES
============================================================ */

export async function GET(
    req: NextRequest
) {
    try {

        /* =====================================================
           VALIDAR USUARIO
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
           CARGAR INSTANCIAS DEL USUARIO
        ===================================================== */

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
                    status,
                    created_at,
                    listed_at
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
                )
                .order(
                    "created_at",
                    {
                        ascending: false,
                    }
                );


        if (instancesError) {

            console.error(
                "Error consultando inventario:",
                instancesError
            );

            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "No se pudo cargar tu inventario de F1 Spheres",
                },
                {
                    status: 500,
                }
            );
        }


        const instances =
            instancesData ?? [];


        if (instances.length === 0) {

            return NextResponse.json({
                ok: true,
                total:
                    0,
                instances:
                    [],
            });
        }


        /* =====================================================
           CATÁLOGO
        ===================================================== */

        const sphereIds =
            Array.from(
                new Set(
                    instances.map(
                        (
                            instance
                        ) =>
                            String(
                                instance
                                    .sphere_id
                            )
                    )
                )
            );


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
                    season,
                    rarity,
                    primary_color,
                    secondary_color,
                    accent_color,
                    imagen_url,
                    car_image_url,
                    collection_key
                `)
                .in(
                    "id",
                    sphereIds
                )
                .eq(
                    "collection_key",
                    CURRENT_COLLECTION_KEY
                )
                .eq(
                    "season",
                    CURRENT_COLLECTION_SEASON
                );


        if (spheresError) {

            console.error(
                "Error consultando catálogo:",
                spheresError
            );

            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "No se pudo cargar el catálogo F1",
                },
                {
                    status: 500,
                }
            );
        }


        const spheres =
            spheresData ?? [];


        const spheresById =
            new Map(
                spheres.map(
                    (
                        sphere
                    ) => [
                            String(
                                sphere.id
                            ),
                            sphere,
                        ]
                )
            );


        /* =====================================================
           PUBLICACIONES ACTIVAS DEL USUARIO
        ===================================================== */

        const instanceIds =
            instances.map(
                (
                    instance
                ) =>
                    String(
                        instance.id
                    )
            );


        const {
            data:
            listingsData,
        } =
            await supabaseAdmin
                .from(
                    "sphere_marketplace_listings"
                )
                .select(`
                    id,
                    sphere_instance_id,
                    price,
                    currency,
                    status,
                    created_at
                `)
                .in(
                    "sphere_instance_id",
                    instanceIds
                )
                .eq(
                    "status",
                    "active"
                );


        const listings =
            listingsData ?? [];


        const listingByInstanceId =
            new Map(
                listings.map(
                    (
                        listing
                    ) => [
                            String(
                                listing
                                    .sphere_instance_id
                            ),
                            listing,
                        ]
                )
            );


        /* =====================================================
           RESPUESTA
        ===================================================== */

        const inventory =
            instances
                .map(
                    (
                        instance
                    ) => {

                        const sphere =
                            spheresById.get(
                                String(
                                    instance
                                        .sphere_id
                                )
                            );

                        if (!sphere) {
                            return null;
                        }


                        const listing =
                            listingByInstanceId.get(
                                String(
                                    instance.id
                                )
                            );


                        return {

                            instanceId:
                                instance.id,

                            originCardId:
                                instance
                                    .origin_card_id,

                            status:
                                instance
                                    .status,

                            createdAt:
                                instance
                                    .created_at,

                            listedAt:
                                instance
                                    .listed_at,

                            canSell:
                                instance.status ===
                                "available",

                            listing:
                                listing
                                    ? {
                                        id:
                                            listing.id,

                                        price:
                                            Number(
                                                listing
                                                    .price
                                            ),

                                        currency:
                                            listing
                                                .currency,

                                        createdAt:
                                            listing
                                                .created_at,
                                    }
                                    : null,


                            sphere: {

                                id:
                                    sphere.id,

                                number:
                                    Number(
                                        sphere
                                            .numero
                                    ),

                                name:
                                    sphere
                                        .nombre,

                                teamName:
                                    sphere
                                        .team_name,

                                teamSlug:
                                    sphere
                                        .team_slug,

                                season:
                                    sphere
                                        .season,

                                rarity:
                                    sphere
                                        .rarity,

                                primaryColor:
                                    sphere
                                        .primary_color,

                                secondaryColor:
                                    sphere
                                        .secondary_color,

                                accentColor:
                                    sphere
                                        .accent_color,

                                imageUrl:
                                    sphere
                                        .imagen_url,

                                carImageUrl:
                                    sphere
                                        .car_image_url,
                            },
                        };
                    }
                )
                .filter(
                    Boolean
                );


        return NextResponse.json({

            ok: true,

            total:
                inventory.length,

            instances:
                inventory,
        });


    } catch (
    error:
        unknown
    ) {

        console.error(
            "my-inventory error:",
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