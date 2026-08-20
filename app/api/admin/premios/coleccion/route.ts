// app/api/admin/premios/coleccion/route.ts

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


const CURRENT_SORTEO_ID =
    "cedb391c-65e1-4684-801c-827200c66ded";

const CURRENT_COLLECTION_KEY =
    "f1-2026";


function normalizeEmail(
    value: unknown
) {
    return String(
        value ?? ""
    )
        .trim()
        .toLowerCase();
}


function normalizeText(
    value: unknown
) {
    const text =
        String(
            value ?? ""
        ).trim();

    return text || null;
}


/*
 * =========================================================
 * VALIDAR ADMIN
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
            ok:
                false as const,

            status:
                401,

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
            ok:
                false as const,

            status:
                401,

            error:
                "Token administrativo inválido",
        };
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

        return {
            ok:
                false as const,

            status:
                401,

            error:
                "La sesión administrativa ha expirado",
        };
    }


    const adminUserId =
        String(
            process.env
                .ADMIN_UUID ??
            process.env
                .SUPABASE_ADMIN_USER_ID ??
            ""
        ).trim();


    if (!adminUserId) {

        console.error(
            "Falta ADMIN_UUID / SUPABASE_ADMIN_USER_ID"
        );

        return {
            ok:
                false as const,

            status:
                500,

            error:
                "No está configurado el administrador del sistema",
        };
    }


    if (
        userData.user.id !==
        adminUserId
    ) {

        return {
            ok:
                false as const,

            status:
                403,

            error:
                "No tienes permisos de administrador",
        };
    }


    return {
        ok:
            true as const,

        user: {

            id:
                userData.user.id,

            email:
                normalizeEmail(
                    userData
                        .user
                        .email
                ),
        },
    };
}


/*
 * =========================================================
 * GET
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
                    ok:
                        false,

                    error:
                        admin.error,
                },
                {
                    status:
                        admin.status,
                }
            );
        }


        const {
            data:
            reward,

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
                    stock_total,
                    stock_claimed,
                    activo,
                    collection_key,
                    created_at,
                    updated_at
                `)
                .eq(
                    "sorteo_id",
                    CURRENT_SORTEO_ID
                )
                .eq(
                    "collection_key",
                    CURRENT_COLLECTION_KEY
                )
                .maybeSingle();


        if (rewardError) {

            console.error(
                "Error leyendo collection_rewards:",
                rewardError
            );

            return NextResponse.json(
                {
                    ok:
                        false,

                    error:
                        "No se pudo consultar la configuración de la colección",
                },
                {
                    status:
                        500,
                }
            );
        }


        if (!reward) {

            return NextResponse.json(
                {
                    ok:
                        false,

                    error:
                        "No existe un premio configurado para F1 Sphere Collection",
                },
                {
                    status:
                        404,
                }
            );
        }


        const stockTotal =
            Number(
                reward
                    .stock_total ??
                0
            );


        const stockClaimed =
            Number(
                reward
                    .stock_claimed ??
                0
            );


        return NextResponse.json({

            ok:
                true,

            reward: {

                id:
                    reward.id,

                sorteoId:
                    reward.sorteo_id,

                collectionKey:
                    reward.collection_key,

                name:
                    reward.nombre,

                description:
                    reward.descripcion ??
                    "",

                type:
                    reward.tipo,

                requiredSpheres:
                    Number(
                        reward
                            .required_unique_spheres ??
                        11
                    ),

                stockTotal,

                stockClaimed,

                stockRemaining:
                    Math.max(
                        0,

                        stockTotal -
                        stockClaimed
                    ),

                active:
                    Boolean(
                        reward.activo
                    ),

                createdAt:
                    reward.created_at ??
                    null,

                updatedAt:
                    reward.updated_at ??
                    null,
            },
        });

    } catch (
    error: unknown
    ) {

        console.error(
            "api/admin/premios/coleccion GET:",
            error
        );


        return NextResponse.json(
            {
                ok:
                    false,

                error:
                    error instanceof Error
                        ? error.message
                        : "Error interno",
            },
            {
                status:
                    500,
            }
        );
    }
}


/*
 * =========================================================
 * PATCH
 *
 * ACTUALIZAR CONFIGURACIÓN
 * =========================================================
 */

export async function PATCH(
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
                    ok:
                        false,

                    error:
                        admin.error,
                },
                {
                    status:
                        admin.status,
                }
            );
        }


        const body =
            await req
                .json()
                .catch(
                    () =>
                        null
                );


        const name =
            normalizeText(
                body?.name
            );


        const description =
            normalizeText(
                body?.description
            );


        const type =
            String(
                body?.type ??
                ""
            )
                .trim()
                .toLowerCase();


        const requiredSpheres =
            Number(
                body
                    ?.requiredSpheres
            );


        const stockTotal =
            Number(
                body
                    ?.stockTotal
            );


        const active =
            Boolean(
                body?.active
            );


        /*
         * =====================================================
         * VALIDACIONES
         * =====================================================
         */

        if (!name) {

            return NextResponse.json(
                {
                    ok:
                        false,

                    error:
                        "Ingresa el nombre del premio",
                },
                {
                    status:
                        400,
                }
            );
        }


        const allowedTypes =
            [
                "physical",
                "experience",
                "cash",
                "digital",
            ];


        if (
            !allowedTypes.includes(
                type
            )
        ) {

            return NextResponse.json(
                {
                    ok:
                        false,

                    error:
                        "Tipo de premio inválido",
                },
                {
                    status:
                        400,
                }
            );
        }


        /*
         * Para F1 2026 mantenemos la regla
         * de las 11 escuderías.
         */

        if (
            requiredSpheres !==
            11
        ) {

            return NextResponse.json(
                {
                    ok:
                        false,

                    error:
                        "F1 Sphere Collection 2026 requiere exactamente 11 esferas diferentes",
                },
                {
                    status:
                        400,
                }
            );
        }


        if (
            !Number.isInteger(
                stockTotal
            ) ||
            stockTotal <
            0
        ) {

            return NextResponse.json(
                {
                    ok:
                        false,

                    error:
                        "La cantidad de premios debe ser un número entero válido",
                },
                {
                    status:
                        400,
                }
            );
        }


        /*
         * =====================================================
         * LEER ESTADO ACTUAL
         * =====================================================
         */

        const {
            data:
            current,

            error:
            currentError,
        } =
            await supabaseAdmin
                .from(
                    "collection_rewards"
                )
                .select(`
                    id,
                    stock_total,
                    stock_claimed
                `)
                .eq(
                    "sorteo_id",
                    CURRENT_SORTEO_ID
                )
                .eq(
                    "collection_key",
                    CURRENT_COLLECTION_KEY
                )
                .maybeSingle();


        if (
            currentError ||
            !current
        ) {

            return NextResponse.json(
                {
                    ok:
                        false,

                    error:
                        "No se encontró la configuración de la colección",
                },
                {
                    status:
                        404,
                }
            );
        }


        const stockClaimed =
            Number(
                current
                    .stock_claimed ??
                0
            );


        /*
         * Nunca podemos reducir stock_total
         * por debajo de los premios ya reclamados.
         */

        if (
            stockTotal <
            stockClaimed
        ) {

            return NextResponse.json(
                {
                    ok:
                        false,

                    error:
                        `No puedes establecer ${stockTotal} premios porque ya existen ${stockClaimed} reclamados.`,
                },
                {
                    status:
                        400,
                }
            );
        }


        /*
         * =====================================================
         * ACTUALIZAR
         * =====================================================
         */

        const now =
            new Date()
                .toISOString();


        const {
            data:
            updated,

            error:
            updateError,
        } =
            await supabaseAdmin
                .from(
                    "collection_rewards"
                )
                .update({

                    nombre:
                        name,

                    descripcion:
                        description,

                    tipo:
                        type,

                    required_unique_spheres:
                        requiredSpheres,

                    stock_total:
                        stockTotal,

                    activo:
                        active,

                    updated_at:
                        now,
                })
                .eq(
                    "id",
                    current.id
                )
                .select(`
                    id,
                    sorteo_id,
                    nombre,
                    descripcion,
                    tipo,
                    required_unique_spheres,
                    stock_total,
                    stock_claimed,
                    activo,
                    collection_key,
                    updated_at
                `)
                .maybeSingle();


        if (
            updateError ||
            !updated
        ) {

            console.error(
                "Error actualizando collection_rewards:",
                updateError
            );

            return NextResponse.json(
                {
                    ok:
                        false,

                    error:
                        "No se pudo guardar la configuración",
                },
                {
                    status:
                        500,
                }
            );
        }


        const updatedStockTotal =
            Number(
                updated
                    .stock_total ??
                0
            );


        const updatedStockClaimed =
            Number(
                updated
                    .stock_claimed ??
                0
            );


        return NextResponse.json({

            ok:
                true,

            reward: {

                id:
                    updated.id,

                name:
                    updated.nombre,

                description:
                    updated.descripcion ??
                    "",

                type:
                    updated.tipo,

                requiredSpheres:
                    Number(
                        updated
                            .required_unique_spheres
                    ),

                stockTotal:
                    updatedStockTotal,

                stockClaimed:
                    updatedStockClaimed,

                stockRemaining:
                    Math.max(
                        0,

                        updatedStockTotal -
                        updatedStockClaimed
                    ),

                active:
                    Boolean(
                        updated.activo
                    ),

                updatedAt:
                    updated.updated_at,
            },
        });

    } catch (
    error: unknown
    ) {

        console.error(
            "api/admin/premios/coleccion PATCH:",
            error
        );


        return NextResponse.json(
            {
                ok:
                    false,

                error:
                    error instanceof Error
                        ? error.message
                        : "Error interno",
            },
            {
                status:
                    500,
            }
        );
    }
}