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


const BUCKET =
    "baruk-shop";

const MAX_IMAGE_SIZE =
    5 * 1024 * 1024;

const IMAGE_TYPES =
    new Set([
        "image/webp",
        "image/png",
        "image/jpeg",
    ]);

const ALLOWED_TYPES = [
    "physical",
    "experience",
    "cash",
    "digital",
    "digital_cards",
] as const;


/* ============================================================
   HELPERS
============================================================ */

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


function parseBoolean(
    value: unknown,
    fallback = false
) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return fallback;
    }

    return String(
        value
    ) === "true";
}


function slugify(
    value: string
) {

    return value
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .toLowerCase()
        .trim()
        .replace(
            /[^a-z0-9]+/g,
            "-"
        )
        .replace(
            /^-+|-+$/g,
            ""
        );
}


function getExtension(
    file: File
): string | null {

    switch (
    file.type
    ) {

        case "image/webp":
            return "webp";

        case "image/png":
            return "png";

        case "image/jpeg":
            return "jpg";

        default:
            return null;
    }
}


function getPublicImageUrl(
    path: string
) {

    const {
        data,
    } =
        supabaseAdmin
            .storage
            .from(
                BUCKET
            )
            .getPublicUrl(
                path
            );

    return data.publicUrl;
}


function getManagedStoragePath(
    value:
        | string
        | null
        | undefined
): string | null {

    const imageUrl =
        normalizeText(
            value
        );

    if (
        !imageUrl
    ) {

        return null;
    }


    if (
        imageUrl.startsWith(
            "premios/"
        )
    ) {

        return imageUrl;
    }


    const marker =
        `/storage/v1/object/public/${BUCKET}/`;

    const markerIndex =
        imageUrl.indexOf(
            marker
        );


    if (
        markerIndex <
        0
    ) {

        return null;
    }


    const encodedPath =
        imageUrl
            .slice(
                markerIndex +
                marker.length
            )
            .split(
                "?"
            )[0];


    try {

        return decodeURIComponent(
            encodedPath
        );

    } catch {

        return encodedPath;
    }
}


async function removeManagedImage(
    imageUrl:
        | string
        | null
        | undefined
) {

    const path =
        getManagedStoragePath(
            imageUrl
        );


    if (
        !path
    ) {

        return;
    }


    const {
        error,
    } =
        await supabaseAdmin
            .storage
            .from(
                BUCKET
            )
            .remove([
                path,
            ]);


    if (
        error
    ) {

        console.error(
            "No se pudo eliminar la imagen administrada del premio:",
            error
        );
    }
}


async function uploadPrizeImage(
    file: File,
    path: string
) {

    if (
        !IMAGE_TYPES.has(
            file.type
        )
    ) {

        return {
            ok: false as const,
            status: 400,
            error:
                "La imagen debe ser WEBP, PNG o JPG.",
        };
    }


    if (
        file.size >
        MAX_IMAGE_SIZE
    ) {

        return {
            ok: false as const,
            status: 400,
            error:
                "La imagen no puede superar los 5 MB.",
        };
    }


    const extension =
        getExtension(
            file
        );


    if (
        !extension
    ) {

        return {
            ok: false as const,
            status: 400,
            error:
                "Formato de imagen no permitido.",
        };
    }


    const finalPath =
        `${path}.${extension}`;


    const buffer =
        Buffer.from(
            await file.arrayBuffer()
        );


    const {
        error:
        uploadError,
    } =
        await supabaseAdmin
            .storage
            .from(
                BUCKET
            )
            .upload(
                finalPath,
                buffer,
                {
                    contentType:
                        file.type,

                    cacheControl:
                        "3600",

                    upsert:
                        false,
                }
            );


    if (
        uploadError
    ) {

        console.error(
            "Error subiendo imagen del premio:",
            uploadError
        );

        return {
            ok: false as const,
            status: 500,
            error:
                "No se pudo subir la imagen del premio.",
        };
    }


    return {
        ok: true as const,
        path:
            finalPath,

        publicUrl:
            getPublicImageUrl(
                finalPath
            ),
    };
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


    if (
        !accessToken
    ) {

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


    if (
        !adminUserId
    ) {

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


        if (
            !admin.ok
        ) {

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
                .select(
                    "*"
                )
                .order(
                    "created_at",
                    {
                        ascending:
                            false,
                    }
                );


        if (
            sorteosError
        ) {

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
                                activityNumber >
                                    0
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


        if (
            prizesError
        ) {

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

    let uploadedImagePath:
        | string
        | null =
        null;


    try {

        const admin =
            await getAdminUser(
                req
            );


        if (
            !admin.ok
        ) {

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


        const formData =
            await req.formData();


        const sorteoId =
            normalizeText(
                formData.get(
                    "sorteoId"
                )
            );

        const name =
            normalizeText(
                formData.get(
                    "name"
                )
            );

        const description =
            normalizeText(
                formData.get(
                    "description"
                )
            );

        const type =
            String(
                formData.get(
                    "type"
                ) ??
                ""
            )
                .trim()
                .toLowerCase();

        const cardQuantity =
            parseInteger(
                formData.get(
                    "cardQuantity"
                ),
                0
            );

        const referenceValue =
            parseNumber(
                formData.get(
                    "referenceValue"
                ),
                0
            );

        const weight =
            parseNumber(
                formData.get(
                    "weight"
                ),
                1
            );

        const stockTotal =
            parseInteger(
                formData.get(
                    "stockTotal"
                ),
                0
            );

        const claimInstructions =
            normalizeText(
                formData.get(
                    "claimInstructions"
                )
            );

        const active =
            parseBoolean(
                formData.get(
                    "active"
                ),
                true
            );

        const image =
            formData.get(
                "image"
            );


        if (
            !sorteoId
        ) {

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


        if (
            !name
        ) {

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
                        "Indica cuántas Tarjetas entrega este premio",
                },
                {
                    status: 400,
                }
            );
        }


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


        let imageUrl:
            | string
            | null =
            null;


        if (
            image instanceof
            File &&
            image.size >
            0
        ) {

            const prizeSlug =
                slugify(
                    name
                ) ||
                "premio";


            const upload =
                await uploadPrizeImage(
                    image,
                    `premios/${sorteoId}/${prizeSlug}-${Date.now()}`
                );


            if (
                !upload.ok
            ) {

                return NextResponse.json(
                    {
                        ok: false,
                        error:
                            upload.error,
                    },
                    {
                        status:
                            upload.status,
                    }
                );
            }


            uploadedImagePath =
                upload.path;

            imageUrl =
                upload.publicUrl;
        }


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
                .select(
                    "*"
                )
                .single();


        if (
            createError ||
            !created
        ) {

            console.error(
                "Error creando card_prize:",
                createError
            );


            if (
                uploadedImagePath
            ) {

                await supabaseAdmin
                    .storage
                    .from(
                        BUCKET
                    )
                    .remove([
                        uploadedImagePath,
                    ]);
            }


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


        if (
            uploadedImagePath
        ) {

            try {

                await supabaseAdmin
                    .storage
                    .from(
                        BUCKET
                    )
                    .remove([
                        uploadedImagePath,
                    ]);

            } catch {
                // Conservar el error original.
            }
        }


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

    let newImagePath:
        | string
        | null =
        null;


    try {

        const admin =
            await getAdminUser(
                req
            );


        if (
            !admin.ok
        ) {

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


        const formData =
            await req.formData();


        const prizeId =
            normalizeText(
                formData.get(
                    "prizeId"
                )
            );


        if (
            !prizeId
        ) {

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
                formData.get(
                    "name"
                )
            );

        const description =
            normalizeText(
                formData.get(
                    "description"
                )
            );

        const type =
            String(
                formData.get(
                    "type"
                ) ??
                current.tipo
            )
                .trim()
                .toLowerCase();

        const cardQuantity =
            parseInteger(
                formData.get(
                    "cardQuantity"
                ),
                Number(
                    current
                        .cantidad_cards ??
                    0
                )
            );

        const referenceValue =
            parseNumber(
                formData.get(
                    "referenceValue"
                ),
                Number(
                    current
                        .valor_referencial ??
                    0
                )
            );

        const weight =
            parseNumber(
                formData.get(
                    "weight"
                ),
                Number(
                    current
                        .peso_asignacion ??
                    0
                )
            );

        const stockTotal =
            parseInteger(
                formData.get(
                    "stockTotal"
                ),
                Number(
                    current
                        .stock_total ??
                    0
                )
            );

        const claimInstructions =
            normalizeText(
                formData.get(
                    "claimInstructions"
                )
            );

        const active =
            parseBoolean(
                formData.get(
                    "active"
                ),
                Boolean(
                    current.activo
                )
            );

        const removeImage =
            parseBoolean(
                formData.get(
                    "removeImage"
                ),
                false
            );

        const image =
            formData.get(
                "image"
            );


        if (
            !name
        ) {

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
                        "Indica cuántas Tarjetas entrega este premio",
                },
                {
                    status: 400,
                }
            );
        }


        const oldImageUrl =
            normalizeText(
                current.imagen_url
            );


        let finalImageUrl:
            | string
            | null =
            oldImageUrl;


        const hasNewImage =
            image instanceof
            File &&
            image.size >
            0;


        if (
            hasNewImage
        ) {

            const upload =
                await uploadPrizeImage(
                    image,
                    `premios/${prizeId}/principal-${Date.now()}`
                );


            if (
                !upload.ok
            ) {

                return NextResponse.json(
                    {
                        ok: false,
                        error:
                            upload.error,
                    },
                    {
                        status:
                            upload.status,
                    }
                );
            }


            newImagePath =
                upload.path;

            finalImageUrl =
                upload.publicUrl;

        } else if (
            removeImage
        ) {

            finalImageUrl =
                null;
        }


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
                        finalImageUrl,

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


        if (
            updateError
        ) {

            console.error(
                "Error actualizando card_prize:",
                updateError
            );


            if (
                newImagePath
            ) {

                await supabaseAdmin
                    .storage
                    .from(
                        BUCKET
                    )
                    .remove([
                        newImagePath,
                    ]);
            }


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


        if (
            oldImageUrl &&
            oldImageUrl !==
            finalImageUrl &&
            (
                hasNewImage ||
                removeImage
            )
        ) {

            await removeManagedImage(
                oldImageUrl
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


        if (
            newImagePath
        ) {

            try {

                await supabaseAdmin
                    .storage
                    .from(
                        BUCKET
                    )
                    .remove([
                        newImagePath,
                    ]);

            } catch {
                // Conservar el error original.
            }
        }


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
   DELETE
   ELIMINAR PREMIO SIN HISTORIAL
============================================================ */

export async function DELETE(
    req: NextRequest
) {

    try {

        const admin =
            await getAdminUser(
                req
            );


        if (
            !admin.ok
        ) {

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


        if (
            !prizeId
        ) {

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
                    imagen_url,
                    stock_asignado,
                    stock_programado
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


        if (
            stockAssigned >
            0 ||
            stockScheduled >
            0
        ) {

            return NextResponse.json(
                {
                    ok: false,
                    error:
                        `No se puede eliminar "${current.nombre}" porque ya tiene ${stockAssigned} unidad(es) asignada(s) y ${stockScheduled} programada(s). Desactívalo para conservar el historial.`,
                },
                {
                    status: 409,
                }
            );
        }


        const {
            error:
            deleteError,
        } =
            await supabaseAdmin
                .from(
                    "card_prizes"
                )
                .delete()
                .eq(
                    "id",
                    prizeId
                );


        if (
            deleteError
        ) {

            console.error(
                "Error eliminando card_prize:",
                deleteError
            );

            return NextResponse.json(
                {
                    ok: false,
                    error:
                        deleteError.message ??
                        "No se pudo eliminar el premio",
                },
                {
                    status: 500,
                }
            );
        }


        await removeManagedImage(
            current.imagen_url
        );


        return NextResponse.json({
            ok: true,
            prizeId,
        });

    } catch (
    error:
        unknown
    ) {

        console.error(
            "admin premios catalogo DELETE:",
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