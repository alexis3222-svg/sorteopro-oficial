// app/api/admin/shop/products/[id]/route.ts

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
    5 * 1024 * 1024;

const IMAGE_TYPES = new Set([
    "image/webp",
    "image/png",
    "image/jpeg",
]);

type RouteContext = {
    params: Promise<{
        id: string;
    }>;
};

/* ============================================================
   HELPERS
============================================================ */

function slugify(
    value: string
): string {
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

function cleanString(
    value:
        | FormDataEntryValue
        | null
): string {
    if (
        typeof value !== "string"
    ) {
        return "";
    }

    return value.trim();
}

function parseBoolean(
    value:
        | FormDataEntryValue
        | null
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

function isManagedStoragePath(
    path:
        | string
        | null
        | undefined
): boolean {
    if (!path) {
        return false;
    }

    if (
        path.startsWith(
            "http://"
        ) ||
        path.startsWith(
            "https://"
        )
    ) {
        return false;
    }

    return path.startsWith(
        "productos/"
    );
}

/* ============================================================
   GET
   CARGAR PRODUCTO PARA EDITAR
============================================================ */

export async function GET(
    _req: NextRequest,
    context: RouteContext
) {
    try {
        /* ========================================================
           VALIDAR ADMIN
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

        const { id } =
            await context.params;

        if (!id) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "ID de producto inválido.",
                },
                {
                    status: 400,
                }
            );
        }

        /* ========================================================
           PRODUCTO + CATEGORÍAS
        ======================================================== */

        const [
            productoResponse,
            categoriasResponse,
        ] = await Promise.all([
            supabaseAdmin
                .from(
                    "store_products"
                )
                .select(`
                    id,
                    category_id,
                    nombre,
                    slug,
                    descripcion,
                    descripcion_corta,
                    precio,
                    precio_anterior,
                    stock,
                    sku,
                    imagen_principal,
                    activo,
                    destacado,
                    tendencia,
                    nuevo,
                    etiqueta,
                    orden,
                    created_at,
                    updated_at
                `)
                .eq("id", id)
                .maybeSingle(),

            supabaseAdmin
                .from(
                    "store_categories"
                )
                .select(`
                    id,
                    nombre,
                    slug
                `)
                .eq(
                    "activo",
                    true
                )
                .order(
                    "orden",
                    {
                        ascending:
                            true,
                    }
                ),
        ]);

        if (
            productoResponse.error
        ) {
            throw productoResponse.error;
        }

        if (
            categoriasResponse.error
        ) {
            throw categoriasResponse.error;
        }

        if (
            !productoResponse.data
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Producto no encontrado.",
                },
                {
                    status: 404,
                }
            );
        }

        return NextResponse.json({
            ok: true,

            producto:
                productoResponse.data,

            categorias:
                categoriasResponse.data ??
                [],
        });

    } catch (error) {
        console.error(
            "Error cargando producto admin:",
            error
        );

        return NextResponse.json(
            {
                ok: false,
                error:
                    "No se pudo cargar el producto.",
            },
            {
                status: 500,
            }
        );
    }
}

/* ============================================================
   PUT
   ACTUALIZAR PRODUCTO
============================================================ */

export async function PUT(
    req: NextRequest,
    context: RouteContext
) {
    let nuevaImagenPath:
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

        const { id } =
            await context.params;

        if (!id) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "ID de producto inválido.",
                },
                {
                    status: 400,
                }
            );
        }

        /* ========================================================
           2. PRODUCTO ACTUAL
        ======================================================== */

        const {
            data:
            productoActual,

            error:
            productoActualError,
        } =
            await supabaseAdmin
                .from(
                    "store_products"
                )
                .select(`
                    id,
                    nombre,
                    slug,
                    sku,
                    imagen_principal
                `)
                .eq("id", id)
                .maybeSingle();

        if (
            productoActualError
        ) {
            throw productoActualError;
        }

        if (!productoActual) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Producto no encontrado.",
                },
                {
                    status: 404,
                }
            );
        }

        const imagenAnterior =
            productoActual.imagen_principal as
            | string
            | null;

        /* ========================================================
           3. FORM DATA
        ======================================================== */

        const formData =
            await req.formData();

        const nombre =
            cleanString(
                formData.get("nombre")
            );

        const slugRaw =
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

        const eliminarImagen =
            parseBoolean(
                formData.get(
                    "eliminar_imagen"
                )
            );

        const imagen =
            formData.get("imagen");

        /* ========================================================
           4. VALIDACIONES
        ======================================================== */

        if (!nombre) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "El nombre es obligatorio.",
                },
                {
                    status: 400,
                }
            );
        }

        const slug =
            slugify(
                slugRaw || nombre
            );

        if (!slug) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "El slug no es válido.",
                },
                {
                    status: 400,
                }
            );
        }

        const precio =
            Number(precioRaw);

        if (
            !Number.isFinite(
                precio
            ) ||
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
            Number(
                stockRaw || 0
            );

        if (
            !Number.isInteger(
                stock
            ) ||
            stock < 0
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "El stock debe ser un entero igual o mayor a 0.",
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
            !Number.isInteger(
                orden
            ) ||
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
           5. CATEGORÍA
        ======================================================== */

        if (categoryId) {
            const {
                data: categoria,
                error:
                categoriaError,
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
           6. SLUG ÚNICO
        ======================================================== */

        const {
            data:
            otroSlug,

            error:
            slugError,
        } =
            await supabaseAdmin
                .from(
                    "store_products"
                )
                .select("id")
                .eq(
                    "slug",
                    slug
                )
                .neq("id", id)
                .maybeSingle();

        if (slugError) {
            throw slugError;
        }

        if (otroSlug) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Ya existe otro producto con ese slug.",
                },
                {
                    status: 409,
                }
            );
        }

        /* ========================================================
           7. SKU ÚNICO
        ======================================================== */

        if (sku) {
            const {
                data:
                otroSku,

                error:
                skuError,
            } =
                await supabaseAdmin
                    .from(
                        "store_products"
                    )
                    .select("id")
                    .eq(
                        "sku",
                        sku
                    )
                    .neq("id", id)
                    .maybeSingle();

            if (skuError) {
                throw skuError;
            }

            if (otroSku) {
                return NextResponse.json(
                    {
                        ok: false,
                        error:
                            "Ya existe otro producto con ese SKU.",
                    },
                    {
                        status: 409,
                    }
                );
            }
        }

        /* ========================================================
           8. NUEVA IMAGEN
        ======================================================== */

        const hayNuevaImagen =
            imagen instanceof File &&
            imagen.size > 0;

        if (hayNuevaImagen) {
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

            /*
             * Usamos nombre versionado.
             *
             * Así no sobrescribimos la
             * imagen anterior antes de
             * confirmar la actualización
             * en la base de datos.
             */

            nuevaImagenPath =
                `productos/${slug}/principal-${Date.now()}.${extension}`;

            const buffer =
                Buffer.from(
                    await imagen.arrayBuffer()
                );

            const {
                error:
                uploadError,
            } =
                await supabaseAdmin.storage
                    .from(BUCKET)
                    .upload(
                        nuevaImagenPath,
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
                    "Error subiendo nueva imagen:",
                    uploadError
                );

                return NextResponse.json(
                    {
                        ok: false,
                        error:
                            "No se pudo subir la nueva imagen.",
                    },
                    {
                        status: 500,
                    }
                );
            }
        }

        /* ========================================================
           9. DEFINIR IMAGEN FINAL
        ======================================================== */

        let imagenFinal =
            imagenAnterior;

        if (hayNuevaImagen) {
            imagenFinal =
                nuevaImagenPath;
        } else if (
            eliminarImagen
        ) {
            imagenFinal =
                null;
        }

        /* ========================================================
           10. ACTUALIZAR PRODUCTO
        ======================================================== */

        const {
            data:
            productoActualizado,

            error:
            updateError,
        } =
            await supabaseAdmin
                .from(
                    "store_products"
                )
                .update({
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
                        imagenFinal,

                    activo,

                    destacado,

                    tendencia,

                    nuevo,

                    etiqueta:
                        etiqueta ||
                        null,

                    orden,

                    updated_at:
                        new Date()
                            .toISOString(),
                })
                .eq("id", id)
                .select(`
                    id,
                    nombre,
                    slug,
                    imagen_principal
                `)
                .single();

        /* ========================================================
           11. ROLLBACK NUEVA IMAGEN
        ======================================================== */

        if (updateError) {
            console.error(
                "Error actualizando producto:",
                updateError
            );

            if (
                nuevaImagenPath
            ) {
                await supabaseAdmin.storage
                    .from(BUCKET)
                    .remove([
                        nuevaImagenPath,
                    ]);
            }

            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "No se pudo actualizar el producto.",
                },
                {
                    status: 500,
                }
            );
        }

        /* ========================================================
           12. BORRAR IMAGEN ANTERIOR
        ======================================================== */

        const debeEliminarAnterior =
            Boolean(
                imagenAnterior
            ) &&
            (
                hayNuevaImagen ||
                eliminarImagen
            ) &&
            imagenAnterior !==
            imagenFinal &&
            isManagedStoragePath(
                imagenAnterior
            );

        if (
            debeEliminarAnterior &&
            imagenAnterior
        ) {
            const {
                error:
                removeError,
            } =
                await supabaseAdmin.storage
                    .from(BUCKET)
                    .remove([
                        imagenAnterior,
                    ]);

            if (removeError) {
                /*
                 * No hacemos fallar la
                 * actualización porque
                 * el producto ya quedó
                 * correctamente guardado.
                 */
                console.error(
                    "No se pudo eliminar la imagen anterior:",
                    removeError
                );
            }
        }

        /* ========================================================
           OK
        ======================================================== */

        return NextResponse.json({
            ok: true,

            producto:
                productoActualizado,
        });

    } catch (error) {
        console.error(
            "Error editando producto Baruk Shop:",
            error
        );

        /*
         * Si subimos una imagen nueva
         * pero hubo una excepción antes
         * de terminar, intentamos retirarla.
         */

        if (nuevaImagenPath) {
            try {
                await supabaseAdmin.storage
                    .from(BUCKET)
                    .remove([
                        nuevaImagenPath,
                    ]);
            } catch {
                // conservar error original
            }
        }

        return NextResponse.json(
            {
                ok: false,
                error:
                    "Ocurrió un error al actualizar el producto.",
            },
            {
                status: 500,
            }
        );
    }
}