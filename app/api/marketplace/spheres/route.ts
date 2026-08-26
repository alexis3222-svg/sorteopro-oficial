// app/api/marketplace/spheres/route.ts

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


const CURRENT_COLLECTION_KEY =
    "f1-2026";

const CURRENT_COLLECTION_SEASON =
    2026;


/* ============================================================
   USUARIO QUE ESTÁ VIENDO EL MARKETPLACE
   LA SESIÓN ES OPCIONAL
============================================================ */

async function getViewerUserId(
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
        return null;
    }


    const accessToken =
        authorization
            .replace(
                "Bearer ",
                ""
            )
            .trim();


    if (!accessToken) {
        return null;
    }


    const {
        data,
        error,
    } =
        await supabaseAdmin
            .auth
            .getUser(
                accessToken
            );


    if (
        error ||
        !data.user
    ) {
        return null;
    }


    return data.user.id;
}


/* ============================================================
   NOMBRE PÚBLICO DEL VENDEDOR

   No mostramos:
   - correo
   - teléfono
   - UUID
   - datos bancarios

   Solamente el primer nombre disponible.
============================================================ */

function getPublicSellerName(
    user:
        | {
            user_metadata?: Record<
                string,
                unknown
            >;
        }
        | null
        | undefined
) {

    if (!user) {
        return "Coleccionista";
    }


    const metadata =
        user.user_metadata ??
        {};


    const possibleName =
        String(
            metadata.full_name ??
            metadata.name ??
            metadata.display_name ??
            metadata.first_name ??
            ""
        )
            .trim();


    if (!possibleName) {
        return "Coleccionista";
    }


    /*
     * Mostramos solamente el
     * primer nombre públicamente.
     */
    return (
        possibleName
            .split(
                /\s+/
            )[0] ??
        "Coleccionista"
    );
}


/* ============================================================
   GET
   MARKETPLACE PÚBLICO DE F1 SPHERES
============================================================ */

export async function GET(
    req: NextRequest
) {

    try {

        /*
         * Si existe sesión podremos
         * identificar publicaciones propias.
         *
         * El Marketplace continúa siendo
         * público para usuarios sin sesión.
         */

        const viewerUserId =
            await getViewerUserId(
                req
            );


        /* =====================================================
           LIBERAR RESERVAS VENCIDAS
        ===================================================== */

        const {
            error:
            cleanupError,
        } =
            await supabaseAdmin
                .rpc(
                    "release_expired_sphere_marketplace_reservations"
                );


        if (cleanupError) {

            console.error(
                "Error liberando reservas Marketplace:",
                cleanupError
            );
        }


        /* =====================================================
           PUBLICACIONES ACTIVAS
        ===================================================== */

        const {
            data:
            listingsData,

            error:
            listingsError,
        } =
            await supabaseAdmin
                .from(
                    "sphere_marketplace_listings"
                )
                .select(`
                    id,
                    sphere_instance_id,
                    seller_user_id,
                    price,
                    currency,
                    status,
                    created_at
                `)
                .eq(
                    "status",
                    "active"
                )
                .order(
                    "created_at",
                    {
                        ascending:
                            false,
                    }
                );


        if (listingsError) {

            console.error(
                "Error consultando marketplace:",
                listingsError
            );


            return NextResponse.json(
                {
                    ok:
                        false,

                    error:
                        "No se pudo cargar el Marketplace",
                },
                {
                    status:
                        500,
                }
            );
        }


        const listings =
            listingsData ??
            [];


        if (
            listings.length ===
            0
        ) {

            return NextResponse.json({
                ok:
                    true,

                collectionKey:
                    CURRENT_COLLECTION_KEY,

                season:
                    CURRENT_COLLECTION_SEASON,

                total:
                    0,

                listings:
                    [],
            });
        }


        /* =====================================================
           INSTANCIAS PUBLICADAS
        ===================================================== */

        const instanceIds =
            listings.map(
                (
                    listing
                ) =>
                    String(
                        listing
                            .sphere_instance_id
                    )
            );


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
                    owner_user_id,
                    status,
                    created_at
                `)
                .in(
                    "id",
                    instanceIds
                )
                .eq(
                    "status",
                    "listed"
                );


        if (instancesError) {

            console.error(
                "Error consultando sphere_instances:",
                instancesError
            );


            return NextResponse.json(
                {
                    ok:
                        false,

                    error:
                        "No se pudieron cargar las F1 Spheres publicadas",
                },
                {
                    status:
                        500,
                }
            );
        }


        const instances =
            instancesData ??
            [];


        const instancesById =
            new Map(
                instances.map(
                    (
                        instance
                    ) => [
                            String(
                                instance.id
                            ),
                            instance,
                        ]
                )
            );


        /* =====================================================
           CATÁLOGO DE ESFERAS
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


        if (
            sphereIds.length ===
            0
        ) {

            return NextResponse.json({
                ok:
                    true,

                collectionKey:
                    CURRENT_COLLECTION_KEY,

                season:
                    CURRENT_COLLECTION_SEASON,

                total:
                    0,

                listings:
                    [],
            });
        }


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
                "Error consultando catálogo F1:",
                spheresError
            );


            return NextResponse.json(
                {
                    ok:
                        false,

                    error:
                        "No se pudo cargar el catálogo F1",
                },
                {
                    status:
                        500,
                }
            );
        }


        const spheres =
            spheresData ??
            [];


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
           VENDEDORES ÚNICOS
        ===================================================== */

        const sellerUserIds =
            Array.from(
                new Set(
                    listings
                        .map(
                            (
                                listing
                            ) =>
                                String(
                                    listing
                                        .seller_user_id ??
                                    ""
                                )
                                    .trim()
                        )
                        .filter(
                            Boolean
                        )
                )
            );


        /*
         * Solamente obtenemos metadatos
         * públicos para formar el nombre.
         *
         * No enviamos el correo ni el UUID
         * al navegador.
         */

        const sellerNameEntries =
            await Promise.all(
                sellerUserIds.map(
                    async (
                        sellerUserId
                    ) => {

                        try {

                            const {
                                data,
                                error,
                            } =
                                await supabaseAdmin
                                    .auth
                                    .admin
                                    .getUserById(
                                        sellerUserId
                                    );


                            if (
                                error ||
                                !data.user
                            ) {

                                return [
                                    sellerUserId,
                                    "Coleccionista",
                                ] as const;
                            }


                            return [
                                sellerUserId,

                                getPublicSellerName(
                                    data.user
                                ),
                            ] as const;


                        } catch (
                        error
                        ) {

                            console.error(
                                "No se pudo obtener nombre público del vendedor:",
                                sellerUserId,
                                error
                            );


                            return [
                                sellerUserId,
                                "Coleccionista",
                            ] as const;
                        }
                    }
                )
            );


        const sellerNamesById =
            new Map(
                sellerNameEntries
            );


        /* =====================================================
           ARMAR MARKETPLACE
        ===================================================== */

        const marketplaceListings =
            listings
                .map(
                    (
                        listing
                    ) => {

                        const instance =
                            instancesById.get(
                                String(
                                    listing
                                        .sphere_instance_id
                                )
                            );


                        if (!instance) {
                            return null;
                        }


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


                        const sellerUserId =
                            String(
                                listing
                                    .seller_user_id ??
                                ""
                            );


                        const isMine =
                            Boolean(
                                viewerUserId &&
                                sellerUserId ===
                                viewerUserId
                            );


                        const sellerDisplayName =
                            isMine
                                ? "Tu esfera"
                                : (
                                    sellerNamesById.get(
                                        sellerUserId
                                    ) ??
                                    "Coleccionista"
                                );


                        return {

                            listingId:
                                listing.id,

                            instanceId:
                                instance.id,


                            seller: {

                                displayName:
                                    sellerDisplayName,

                                isMine,
                            },


                            price:
                                Number(
                                    listing
                                        .price
                                ),

                            currency:
                                listing
                                    .currency,

                            listedAt:
                                listing
                                    .created_at,


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

                                collectionKey:
                                    sphere
                                        .collection_key,
                            },
                        };
                    }
                )
                .filter(
                    Boolean
                );


        return NextResponse.json({

            ok:
                true,

            collectionKey:
                CURRENT_COLLECTION_KEY,

            season:
                CURRENT_COLLECTION_SEASON,

            total:
                marketplaceListings.length,

            listings:
                marketplaceListings,
        });


    } catch (
    error:
        unknown
    ) {

        console.error(
            "marketplace/spheres GET error:",
            error
        );


        return NextResponse.json(
            {
                ok:
                    false,

                error:
                    error instanceof Error
                        ? error.message
                        : "Error interno del Marketplace",
            },
            {
                status:
                    500,
            }
        );
    }
}