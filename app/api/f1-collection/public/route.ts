import {
    NextResponse,
} from "next/server";

import {
    supabaseAdmin,
} from "@/lib/supabaseAdmin";


export const runtime =
    "nodejs";

export const dynamic =
    "force-dynamic";


const COLLECTION_KEY =
    "f1-2026";

const COLLECTION_SEASON =
    2026;


/* ============================================================
   GET
   CATÁLOGO PÚBLICO F1 SPHERE COLLECTION

   IMPORTANTE:
   No exponemos:
   - stock
   - probabilidades
   - propietarios
   - cantidades asignadas
============================================================ */

export async function GET() {

    try {

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
                    imagen_url,
                    primary_color,
                    secondary_color,
                    accent_color
                `)
                .eq(
                    "collection_key",
                    COLLECTION_KEY
                )
                .eq(
                    "season",
                    COLLECTION_SEASON
                )
                .eq(
                    "activa",
                    true
                )
                .order(
                    "numero",
                    {
                        ascending:
                            true,
                    }
                );


        if (
            spheresError
        ) {

            console.error(
                "F1 Home spheres:",
                spheresError
            );


            return NextResponse.json(
                {
                    ok: false,

                    error:
                        "No se pudo cargar la colección.",
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
            ).map(
                (
                    sphere
                ) => ({
                    id:
                        sphere.id,

                    number:
                        Number(
                            sphere.numero
                        ),

                    name:
                        sphere.nombre,

                    teamName:
                        sphere.team_name ??
                        sphere.nombre,

                    teamSlug:
                        sphere.team_slug,

                    imageUrl:
                        sphere.imagen_url,

                    primaryColor:
                        sphere.primary_color,

                    secondaryColor:
                        sphere.secondary_color,

                    accentColor:
                        sphere.accent_color,
                })
            );


        /* ====================================================
           PREMIO ACTUAL

           Si por algún motivo no puede leerse,
           usamos el premio actual como fallback.
        ==================================================== */

        let reward = {
            name:
                "iPhone 17 Pro Max 256 GB",

            description:
                "Completa las 11 F1 Spheres diferentes y reclama el premio de la colección.",

            requiredSpheres:
                11,
        };


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
                    nombre,
                    descripcion,
                    required_unique_spheres
                `)
                .eq(
                    "collection_key",
                    COLLECTION_KEY
                )
                .eq(
                    "activo",
                    true
                )
                .limit(
                    1
                )
                .maybeSingle();


        if (
            !rewardError &&
            rewardData
        ) {

            reward = {
                name:
                    rewardData.nombre ??
                    reward.name,

                description:
                    rewardData.descripcion ??
                    reward.description,

                requiredSpheres:
                    Number(
                        rewardData
                            .required_unique_spheres ??
                        11
                    ),
            };
        }


        return NextResponse.json({
            ok: true,

            collectionKey:
                COLLECTION_KEY,

            season:
                COLLECTION_SEASON,

            spheres,

            reward,
        });


    } catch (
    error:
        unknown
    ) {

        console.error(
            "F1 Home collection:",
            error
        );


        return NextResponse.json(
            {
                ok: false,

                error:
                    "Error interno cargando la colección.",
            },
            {
                status: 500,
            }
        );
    }
}