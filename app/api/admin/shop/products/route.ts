// app/api/admin/shop/products/route.ts

import {
    NextRequest,
    NextResponse,
} from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdminSession } from "@/lib/requireAdminSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "baruk-shop";

const MAX_IMAGE_SIZE =
    5 * 1024 * 1024; // 5 MB

const IMAGE_TYPES = new Set([
    "image/webp",
    "image/png",
    "image/jpeg",
]);

/* ============================================================
   HELPERS
============================================================ */

function slugify(value: string): string {
    return value
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function cleanString(
    value: FormDataEntryValue | null
): string {
    if (typeof value !== "string") {
        return "";
    }

    return value.trim();
}

function parseBoolean(
    value: FormDataEntryValue | null
): boolean {
    return String(value) === "true";
}

function getExtension(
    file: File
): string | null {
    switch (file.type) {
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

/* ============================================================
   POST
============================================================ */

export async function POST(
    req: NextRequest
) {
    let uploadedImagePath:
        | string
        | null = null;

    try {
        /* ========================================================
           1. VALIDAR ADMIN
        ======================================================== */

        const autorizado =
            await requireAdminSession();

        if (!autorizado) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "No autorizado.",
                },
                {
                    status: 401,
                }
            );
        }

        /* ========================================================
           2. LEER FORMULARIO
        ======================================================== */

        const formData =
            await req.formData();

        const nombre =
            cleanString(
                formData.get("nombre")
            );

        const slugSolicitado =
            cleanString(
                formData.get("slug")
            );

        const descripcion =
            cleanString(
                formData.get(
                    "descripcion"
                )
            );

        const descripcionCorta =
            cleanString(
                formData.get(
                    "descripcion_corta"
                )
            );

        const precioRaw =
            cleanString(
                formData.get("precio")
            );

        const precioAnteriorRaw =
            cleanString(
                formData.get(
                    "precio_anterior"
                )
            );

        const stockRaw =
            cleanString(
                formData.get("stock")
            );

        const sku =
            cleanString(
                formData.get("sku")
            );

        const categoryId =
            cleanString(
                formData.get(
                    "category_id"
                )
            );

        const etiqueta =
            cleanString(
                formData.get(
                    "etiqueta"
                )
            );

        const ordenRaw =
            cleanString(
                formData.get("orden")
            );

        const activo =
            parseBoolean(
                formData.get("activo")
            );

        const destacado =
            parseBoolean(
                formData.get(
                    "destacado"
                )
            );

        const tendencia =
            parseBoolean(
                formData.get(
                    "tendencia"
                )
            );

        const nuevo =
            parseBoolean(
                formData.get("nuevo")
            );

        const imagen =
            formData.get(
                "imagen"
            );

        /* ========================================================
           3. VALIDACIÓN
        ======================================================== */

        if (!nombre) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "El nombre del producto es obligatorio.",
                },
                {
                    status: 400,
                }
            );
        }

        const slug =
            slugify(
                slugSolicitado ||
                nombre
            );

        if (!slug) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "No se pudo generar un slug válido.",
                },
                {
                    status: 400,
                }
            );
        }

        const precio =
            Number(precioRaw);

        if (
            !Number.isFinite(precio) ||
            precio < 0
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "El precio no es válido.",
                },
                {
                    status: 400,
                }
            );
        }

        let precioAnterior:
            | number
            | null = null;

        if (precioAnteriorRaw) {
            precioAnterior =
                Number(
                    precioAnteriorRaw
                );

            if (
                !Number.isFinite(
                    precioAnterior
                ) ||
                precioAnterior < 0
            ) {
                return NextResponse.json(
                    {
                        ok: false,
                        error:
                            "El precio anterior no es válido.",
                    },
                    {
                        status: 400,
                    }
                );
            }
        }

        const stock =
            Number(stockRaw || 0);

        if (
            !Number.isInteger(stock) ||
            stock < 0
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "El stock debe ser un número entero igual o mayor a 0.",
                },
                {
                    status: 400,
                }
            );
        }

        const orden =
            Number(
                ordenRaw || 0
            );

        if (
            !Number.isInteger(orden) ||
            orden < 0
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "El orden no es válido.",
                },
                {
                    status: 400,
                }
            );
        }

        /* ========================================================
           4. VALIDAR CATEGORÍA
        ======================================================== */

        if (categoryId) {
            const {
                data: categoria,
                error: categoriaError,
            } =
                await supabaseAdmin
                    .from(
                        "store_categories"
                    )
                    .select("id")
                    .eq(
                        "id",
                        categoryId
                    )
                    .eq(
                        "activo",
                        true
                    )
                    .maybeSingle();

            if (
                categoriaError ||
                !categoria
            ) {
                return NextResponse.json(
                    {
                        ok: false,
                        error:
                            "La categoría seleccionada no es válida.",
                    },
                    {
                        status: 400,
                    }
                );
            }
        }

        /* ========================================================
           5. COMPROBAR SLUG
        ======================================================== */

        const {
            data: existingSlug,
            error: slugError,
        } =
            await supabaseAdmin
                .from(
                    "store_products"
                )
                .select("id")
                .eq("slug", slug)
                .maybeSingle();

        if (slugError) {
            throw slugError;
        }

        if (existingSlug) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Ya existe un producto con ese slug.",
                },
                {
                    status: 409,
                }
            );
        }

        /* ========================================================
           6. COMPROBAR SKU
        ======================================================== */

        if (sku) {
            const {
                data: existingSku,
                error: skuError,
            } =
                await supabaseAdmin
                    .from(
                        "store_products"
                    )
                    .select("id")
                    .eq("sku", sku)
                    .maybeSingle();

            if (skuError) {
                throw skuError;
            }

            if (existingSku) {
                return NextResponse.json(
                    {
                        ok: false,
                        error:
                            "Ya existe un producto con ese SKU.",
                    },
                    {
                        status: 409,
                    }
                );
            }
        }

        /* ========================================================
           7. IMAGEN PRINCIPAL
        ======================================================== */

        if (
            imagen instanceof File &&
            imagen.size > 0
        ) {
            if (
                !IMAGE_TYPES.has(
                    imagen.type
                )
            ) {
                return NextResponse.json(
                    {
                        ok: false,
                        error:
                            "La imagen debe ser WEBP, PNG o JPG.",
                    },
                    {
                        status: 400,
                    }
                );
            }

            if (
                imagen.size >
                MAX_IMAGE_SIZE
            ) {
                return NextResponse.json(
                    {
                        ok: false,
                        error:
                            "La imagen no puede superar los 5 MB.",
                    },
                    {
                        status: 400,
                    }
                );
            }

            const extension =
                getExtension(imagen);

            if (!extension) {
                return NextResponse.json(
                    {
                        ok: false,
                        error:
                            "Formato de imagen no permitido.",
                    },
                    {
                        status: 400,
                    }
                );
            }

            uploadedImagePath =
                `productos/${slug}/principal.${extension}`;

            const buffer =
                Buffer.from(
                    await imagen.arrayBuffer()
                );

            const {
                error: uploadError,
            } =
                await supabaseAdmin.storage
                    .from(BUCKET)
                    .upload(
                        uploadedImagePath,
                        buffer,
                        {
                            contentType:
                                imagen.type,

                            cacheControl:
                                "3600",

                            upsert: false,
                        }
                    );

            if (uploadError) {
                console.error(
                    "Error Storage:",
                    uploadError
                );

                return NextResponse.json(
                    {
                        ok: false,
                        error:
                            "No se pudo subir la imagen del producto.",
                    },
                    {
                        status: 500,
                    }
                );
            }
        }

        /* ========================================================
           8. CREAR PRODUCTO
        ======================================================== */

        const {
            data: producto,
            error: insertError,
        } =
            await supabaseAdmin
                .from(
                    "store_products"
                )
                .insert({
                    category_id:
                        categoryId ||
                        null,

                    nombre,

                    slug,

                    descripcion:
                        descripcion ||
                        null,

                    descripcion_corta:
                        descripcionCorta ||
                        null,

                    precio,

                    precio_anterior:
                        precioAnterior,

                    stock,

                    sku:
                        sku || null,

                    imagen_principal:
                        uploadedImagePath,

                    activo,

                    destacado,

                    tendencia,

                    nuevo,

                    etiqueta:
                        etiqueta ||
                        null,

                    orden,
                })
                .select(`
                    id,
                    nombre,
                    slug
                `)
                .single();

        /* ========================================================
           9. ROLLBACK DE STORAGE
        ======================================================== */

        if (insertError) {
            console.error(
                "Error insertando producto:",
                insertError
            );

            if (
                uploadedImagePath
            ) {
                await supabaseAdmin.storage
                    .from(BUCKET)
                    .remove([
                        uploadedImagePath,
                    ]);
            }

            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "No se pudo crear el producto.",
                },
                {
                    status: 500,
                }
            );
        }

        /* ========================================================
           OK
        ======================================================== */

        return NextResponse.json(
            {
                ok: true,
                producto,
            },
            {
                status: 201,
            }
        );

    } catch (error) {
        console.error(
            "Error creando producto Baruk Shop:",
            error
        );

        /*
         * Si ocurrió un error después de
         * subir el archivo pero antes de
         * crear correctamente el producto,
         * intentamos eliminarlo.
         */

        if (uploadedImagePath) {
            try {
                await supabaseAdmin.storage
                    .from(BUCKET)
                    .remove([
                        uploadedImagePath,
                    ]);
            } catch {
                // No reemplazamos el error original.
            }
        }

        return NextResponse.json(
            {
                ok: false,
                error:
                    "Ocurrió un error al crear el producto.",
            },
            {
                status: 500,
            }
        );
    }
}