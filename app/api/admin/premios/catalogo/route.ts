// app/api/admin/premios/catalogo/route.ts

import {
    NextRequest,
    NextResponse,
} from "next/server";

import {
    supabaseAdmin,
} from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";


const ALLOWED_TYPES = [
    "physical",
    "experience",
    "cash",
    "digital",
    "digital_cards",
] as const;


function normalizeText(
    value: unknown
) {
    const text =
        String(
            value ?? ""
        ).trim();

    return text || null;
}


function normalizeEmail(
    value: unknown
) {
    return String(
        value ?? ""
    )
        .trim()
        .toLowerCase();
}


function parseInteger(
    value: unknown,
    fallback = 0
) {

    const number =
        Number(
            value
        );

    if (
        !Number.isInteger(
            number
        )
    ) {
        return fallback;
    }

    return number;
}


function parseNumber(
    value: unknown,
    fallback = 0
) {

    const number =
        Number(
            value
        );

    return Number.isFinite(
        number
    )
        ? number
        : fallback;
}


/* ============================================================
   VALIDAR ADMIN
============================================================ */

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
            ok: false as const,

            status: 401,

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
                    userData
                        .user
                        .email
                ),
        },
    };
}


/* ============================================================
   GET
   ACTIVIDADES + CATÁLOGO DE PREMIOS
============================================================ */

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
                    error: admin.error,
                },
                {
                    status: admin.status,
                }
            );
        }


        /* =====================================================
           ACTIVIDADES
        ===================================================== */

        const {
            data:
            sorteosData,

            error:
            sorteosError,
        } =
            await supabaseAdmin
                .from(
                    "sorteos"
                )
                .select("*")
                .order(
                    "created_at",
                    {
                        ascending:
                            false,
                    }
                );


        if (sorteosError) {

            console.error(
                "Error consultando sorteos:",
                sorteosError
            );

            return NextResponse.json(
                {
                    ok: false,

                    error:
                        "No se pudieron consultar las actividades",
                },
                {
                    status: 500,
                }
            );
        }


        const sorteos =
            (
                sorteosData ??
                []
            ).map(
                (
                    item:
                        Record<
                            string,
                            any
                        >
                ) => {

                    const activityNumber =
                        Number(
                            item
                                .actividad_numero ??
                            0
                        );


                    const possibleName =
                        normalizeText(
                            item.nombre ??
                            item.titulo ??
                            item.premio ??
                            item.premio_principal ??
                            item.actividad_nombre
                        );


                    return {

                        id:
                            item.id,

                        activityNumber,

                        name:
                            possibleName ??
                            (
                                activityNumber > 0
                                    ? `Actividad #${activityNumber}`
                                    : "Actividad Baruk593"
                            ),

                        status:
                            item.estado ??
                            null,

                        totalNumbers:
                            Number(
                                item
                                    .total_numeros ??
                                0
                            ),

                        createdAt:
                            item.created_at ??
                            null,
                    };
                }
            );


        /* =====================================================
           PREMIOS
        ===================================================== */

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
                    sorteo_id,
                    nombre,
                    descripcion,
                    tipo,
                    imagen_url,
                    cantidad_cards,
                    valor_referencial,
                    peso_asignacion,
                    stock_total,
                    stock_asignado,
                    stock_programado,
                    instrucciones_reclamo,
                    activo,
                    fecha_inicio,
                    fecha_fin,
                    created_at,
                    updated_at
                `)
                .order(
                    "created_at",
                    {
                        ascending:
                            false,
                    }
                );


        if (prizesError) {

            console.error(
                "Error consultando card_prizes:",
                prizesError
            );

            return NextResponse.json(
                {
                    ok: false,

                    error:
                        "No se pudo consultar el catálogo de premios",
                },
                {
                    status: 500,
                }
            );
        }


        const prizes =
            (
                prizesData ??
                []
            ).map(
                (
                    prize
                ) => {

                    const stockTotal =
                        Number(
                            prize.stock_total ??
                            0
                        );


                    const stockAssigned =
                        Number(
                            prize.stock_asignado ??
                            0
                        );


                    const stockScheduled =
                        Number(
                            prize.stock_programado ??
                            0
                        );


                    return {

                        id:
                            prize.id,

                        sorteoId:
                            prize.sorteo_id,

                        name:
                            prize.nombre,

                        description:
                            prize.descripcion ??
                            "",

                        type:
                            prize.tipo,

                        imageUrl:
                            prize.imagen_url ??
                            "",

                        cardQuantity:
                            Number(
                                prize.cantidad_cards ??
                                0
                            ),

                        referenceValue:
                            Number(
                                prize.valor_referencial ??
                                0
                            ),

                        weight:
                            Number(
                                prize.peso_asignacion ??
                                0
                            ),

                        stockTotal,

                        stockAssigned,

                        stockScheduled,

                        stockRemaining:
                            Math.max(
                                0,

                                stockTotal -
                                stockAssigned -
                                stockScheduled
                            ),

                        claimInstructions:
                            prize
                                .instrucciones_reclamo ??
                            "",

                        active:
                            Boolean(
                                prize.activo
                            ),

                        startAt:
                            prize.fecha_inicio ??
                            null,

                        endAt:
                            prize.fecha_fin ??
                            null,

                        createdAt:
                            prize.created_at ??
                            null,

                        updatedAt:
                            prize.updated_at ??
                            null,
                    };
                }
            );


        return NextResponse.json({

            ok: true,

            sorteos,

            prizes,
        });

    } catch (
    error:
        unknown
    ) {

        console.error(
            "admin premios catalogo GET:",
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


/* ============================================================
   POST
   CREAR PREMIO
============================================================ */

export async function POST(
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
                    error: admin.error,
                },
                {
                    status: admin.status,
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


        if (!body) {

            return NextResponse.json(
                {
                    ok: false,

                    error:
                        "Datos inválidos",
                },
                {
                    status: 400,
                }
            );
        }


        const sorteoId =
            normalizeText(
                body.sorteoId
            );


        const name =
            normalizeText(
                body.name
            );


        const description =
            normalizeText(
                body.description
            );


        const type =
            String(
                body.type ??
                ""
            )
                .trim()
                .toLowerCase();


        const imageUrl =
            normalizeText(
                body.imageUrl
            );


        const cardQuantity =
            parseInteger(
                body.cardQuantity,
                0
            );


        const referenceValue =
            parseNumber(
                body.referenceValue,
                0
            );


        const weight =
            parseNumber(
                body.weight,
                1
            );


        const stockTotal =
            parseInteger(
                body.stockTotal,
                0
            );


        const claimInstructions =
            normalizeText(
                body.claimInstructions
            );


        const active =
            body.active !==
            false;


        /* =====================================================
           VALIDACIONES
        ===================================================== */

        if (!sorteoId) {

            return NextResponse.json(
                {
                    ok: false,

                    error:
                        "Selecciona una actividad",
                },
                {
                    status: 400,
                }
            );
        }


        if (!name) {

            return NextResponse.json(
                {
                    ok: false,

                    error:
                        "Ingresa el nombre del premio",
                },
                {
                    status: 400,
                }
            );
        }


        if (
            !ALLOWED_TYPES.includes(
                type as
                typeof ALLOWED_TYPES[number]
            )
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


        if (
            stockTotal <
            0
        ) {

            return NextResponse.json(
                {
                    ok: false,

                    error:
                        "El stock no puede ser negativo",
                },
                {
                    status: 400,
                }
            );
        }


        if (
            referenceValue <
            0
        ) {

            return NextResponse.json(
                {
                    ok: false,

                    error:
                        "El valor del premio no puede ser negativo",
                },
                {
                    status: 400,
                }
            );
        }


        if (
            weight <
            0
        ) {

            return NextResponse.json(
                {
                    ok: false,

                    error:
                        "El peso de asignación no puede ser negativo",
                },
                {
                    status: 400,
                }
            );
        }


        if (
            type ===
            "cash" &&
            referenceValue <=
            0
        ) {

            return NextResponse.json(
                {
                    ok: false,

                    error:
                        "Un premio en efectivo debe tener un valor mayor a $0",
                },
                {
                    status: 400,
                }
            );
        }


        if (
            type ===
            "digital_cards" &&
            cardQuantity <=
            0
        ) {

            return NextResponse.json(
                {
                    ok: false,

                    error:
                        "Indica cuántas Experience Pass entrega este premio",
                },
                {
                    status: 400,
                }
            );
        }


        /* =====================================================
           COMPROBAR ACTIVIDAD
        ===================================================== */

        const {
            data:
            sorteo,

            error:
            sorteoError,
        } =
            await supabaseAdmin
                .from(
                    "sorteos"
                )
                .select(
                    "id"
                )
                .eq(
                    "id",
                    sorteoId
                )
                .maybeSingle();


        if (
            sorteoError ||
            !sorteo
        ) {

            return NextResponse.json(
                {
                    ok: false,

                    error:
                        "La actividad seleccionada no existe",
                },
                {
                    status: 404,
                }
            );
        }


        /* =====================================================
           CREAR
        ===================================================== */

        const {
            data:
            created,

            error:
            createError,
        } =
            await supabaseAdmin
                .from(
                    "card_prizes"
                )
                .insert({

                    sorteo_id:
                        sorteoId,

                    nombre:
                        name,

                    descripcion:
                        description,

                    tipo:
                        type,

                    imagen_url:
                        imageUrl,

                    cantidad_cards:
                        type ===
                            "digital_cards"
                            ? cardQuantity
                            : null,

                    valor_referencial:
                        referenceValue,

                    peso_asignacion:
                        weight,

                    stock_total:
                        stockTotal,

                    stock_asignado:
                        0,

                    stock_programado:
                        0,

                    instrucciones_reclamo:
                        claimInstructions,

                    activo:
                        active,
                })
                .select("*")
                .single();


        if (
            createError ||
            !created
        ) {

            console.error(
                "Error creando card_prize:",
                createError
            );

            return NextResponse.json(
                {
                    ok: false,

                    error:
                        createError
                            ?.message ??
                        "No se pudo crear el premio",
                },
                {
                    status: 500,
                }
            );
        }


        return NextResponse.json({

            ok: true,

            prizeId:
                created.id,

        });

    } catch (
    error:
        unknown
    ) {

        console.error(
            "admin premios catalogo POST:",
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


/* ============================================================
   PATCH
   EDITAR PREMIO
============================================================ */

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
                    ok: false,
                    error: admin.error,
                },
                {
                    status: admin.status,
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


        const prizeId =
            normalizeText(
                body?.prizeId
            );


        if (!prizeId) {

            return NextResponse.json(
                {
                    ok: false,

                    error:
                        "Falta identificar el premio",
                },
                {
                    status: 400,
                }
            );
        }


        /* =====================================================
           LEER PREMIO ACTUAL
        ===================================================== */

        const {
            data:
            current,

            error:
            currentError,
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
                    valor_referencial,
                    peso_asignacion,
                    stock_total,
                    stock_asignado,
                    stock_programado,
                    instrucciones_reclamo,
                    activo
                `)
                .eq(
                    "id",
                    prizeId
                )
                .maybeSingle();


        if (
            currentError ||
            !current
        ) {

            return NextResponse.json(
                {
                    ok: false,

                    error:
                        "El premio no existe",
                },
                {
                    status: 404,
                }
            );
        }


        const stockAssigned =
            Number(
                current
                    .stock_asignado ??
                0
            );


        const stockScheduled =
            Number(
                current
                    .stock_programado ??
                0
            );


        const committedStock =
            stockAssigned +
            stockScheduled;


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
                current.tipo
            )
                .trim()
                .toLowerCase();


        const imageUrl =
            normalizeText(
                body?.imageUrl
            );


        const cardQuantity =
            parseInteger(
                body?.cardQuantity,
                Number(
                    current
                        .cantidad_cards ??
                    0
                )
            );


        const referenceValue =
            parseNumber(
                body?.referenceValue,
                Number(
                    current
                        .valor_referencial ??
                    0
                )
            );


        const weight =
            parseNumber(
                body?.weight,
                Number(
                    current
                        .peso_asignacion ??
                    0
                )
            );


        const stockTotal =
            parseInteger(
                body?.stockTotal,
                Number(
                    current
                        .stock_total ??
                    0
                )
            );


        const claimInstructions =
            normalizeText(
                body
                    ?.claimInstructions
            );


        const active =
            Boolean(
                body?.active
            );


        if (!name) {

            return NextResponse.json(
                {
                    ok: false,

                    error:
                        "Ingresa el nombre del premio",
                },
                {
                    status: 400,
                }
            );
        }


        if (
            !ALLOWED_TYPES.includes(
                type as
                typeof ALLOWED_TYPES[number]
            )
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


        /*
         * Nunca reducir stock por debajo
         * de lo ya asignado/programado.
         */
        if (
            stockTotal <
            committedStock
        ) {

            return NextResponse.json(
                {
                    ok: false,

                    error:
                        `No puedes reducir el stock a ${stockTotal}. Ya existen ${committedStock} unidades asignadas o programadas.`,
                },
                {
                    status: 400,
                }
            );
        }


        if (
            weight <
            0 ||
            referenceValue <
            0
        ) {

            return NextResponse.json(
                {
                    ok: false,

                    error:
                        "Los valores ingresados no son válidos",
                },
                {
                    status: 400,
                }
            );
        }


        /*
         * Una vez comprometido un premio,
         * evitamos cambiar su naturaleza.
         */
        if (
            committedStock >
            0 &&
            type !==
            current.tipo
        ) {

            return NextResponse.json(
                {
                    ok: false,

                    error:
                        "No puedes cambiar el tipo de un premio que ya tiene unidades asignadas o programadas.",
                },
                {
                    status: 400,
                }
            );
        }


        if (
            committedStock >
            0 &&
            Number(
                referenceValue
            ) !==
            Number(
                current
                    .valor_referencial ??
                0
            )
        ) {

            return NextResponse.json(
                {
                    ok: false,

                    error:
                        "No puedes cambiar el valor económico de un premio que ya fue asignado o programado.",
                },
                {
                    status: 400,
                }
            );
        }


        if (
            type ===
            "cash" &&
            referenceValue <=
            0
        ) {

            return NextResponse.json(
                {
                    ok: false,

                    error:
                        "Un premio en efectivo debe tener un valor mayor a $0",
                },
                {
                    status: 400,
                }
            );
        }


        /* =====================================================
           ACTUALIZAR
        ===================================================== */

        const {
            error:
            updateError,
        } =
            await supabaseAdmin
                .from(
                    "card_prizes"
                )
                .update({

                    nombre:
                        name,

                    descripcion:
                        description,

                    tipo:
                        type,

                    imagen_url:
                        imageUrl,

                    cantidad_cards:
                        type ===
                            "digital_cards"
                            ? cardQuantity
                            : null,

                    valor_referencial:
                        referenceValue,

                    peso_asignacion:
                        weight,

                    stock_total:
                        stockTotal,

                    instrucciones_reclamo:
                        claimInstructions,

                    activo:
                        active,

                    updated_at:
                        new Date()
                            .toISOString(),
                })
                .eq(
                    "id",
                    prizeId
                );


        if (updateError) {

            console.error(
                "Error actualizando card_prize:",
                updateError
            );

            return NextResponse.json(
                {
                    ok: false,

                    error:
                        updateError.message,
                },
                {
                    status: 500,
                }
            );
        }


        return NextResponse.json({

            ok: true,

            prizeId,
        });

    } catch (
    error:
        unknown
    ) {

        console.error(
            "admin premios catalogo PATCH:",
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