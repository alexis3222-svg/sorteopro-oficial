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

const MAX_GALLERY_IMAGES = 7;

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

/**
 * Convierte una URL pública de Supabase Storage al path interno
 * necesario para poder eliminar el archivo del bucket.
 *
 * También admite paths antiguos del tipo:
 * productos/slug/galeria/archivo.webp
 */
function getStoragePathFromImageUrl(
    value: string | null | undefined
): string | null {
    if (!value) {
        return null;
    }

    if (value.startsWith("productos/")) {
        return value;
    }

    try {
        const url =
            new URL(value);

        const publicMarker =
            `/storage/v1/object/public/${BUCKET}/`;

        const signedMarker =
            `/storage/v1/object/sign/${BUCKET}/`;

        let marker =
            "";

        if (
            url.pathname.includes(
                publicMarker
            )
        ) {
            marker =
                publicMarker;
        } else if (
            url.pathname.includes(
                signedMarker
            )
        ) {
            marker =
                signedMarker;
        } else {
            return null;
        }

        const markerIndex =
            url.pathname.indexOf(
                marker
            );

        if (markerIndex === -1) {
            return null;
        }

        return decodeURIComponent(
            url.pathname.slice(
                markerIndex +
                marker.length
            )
        );
    } catch {
        return null;
    }
}

/* ============================================================
   GET
   OBTENER GALERÍA
============================================================ */

export async function GET(
    _req: NextRequest,
    context: RouteContext
) {
    try {
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

        const {
            data,
            error,
        } =
            await supabaseAdmin
                .from(
                    "store_product_images"
                )
                .select(`
                    id,
                    product_id,
                    image_url,
                    alt_text,
                    orden,
                    created_at
                `)
                .eq(
                    "product_id",
                    id
                )
                .order(
                    "orden",
                    {
                        ascending: true,
                    }
                );

        if (error) {
            throw error;
        }

        return NextResponse.json({
            ok: true,
            images:
                data ?? [],
        });
    } catch (error) {
        console.error(
            "Error cargando galería:",
            error
        );

        return NextResponse.json(
            {
                ok: false,
                error:
                    "No se pudo cargar la galería.",
            },
            {
                status: 500,
            }
        );
    }
}

/* ============================================================
   POST
   AGREGAR IMÁGENES
============================================================ */

export async function POST(
    req: NextRequest,
    context: RouteContext
) {
    const uploadedPaths:
        string[] = [];

    try {
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

        const {
            data: producto,
            error:
            productError,
        } =
            await supabaseAdmin
                .from(
                    "store_products"
                )
                .select(`
                    id,
                    nombre,
                    slug
                `)
                .eq(
                    "id",
                    id
                )
                .maybeSingle();

        if (
            productError ||
            !producto
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

        const {
            count,
            error:
            countError,
        } =
            await supabaseAdmin
                .from(
                    "store_product_images"
                )
                .select(
                    "id",
                    {
                        count:
                            "exact",
                        head: true,
                    }
                )
                .eq(
                    "product_id",
                    id
                );

        if (countError) {
            throw countError;
        }

        const formData =
            await req.formData();

        const files =
            formData
                .getAll(
                    "images"
                )
                .filter(
                    (
                        value
                    ): value is File =>
                        value instanceof
                        File &&
                        value.size >
                        0
                );

        if (
            files.length ===
            0
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Selecciona al menos una imagen.",
                },
                {
                    status: 400,
                }
            );
        }

        const currentCount =
            count ?? 0;

        if (
            currentCount +
            files.length >
            MAX_GALLERY_IMAGES
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        `La galería admite máximo ${MAX_GALLERY_IMAGES} imágenes adicionales.`,
                },
                {
                    status: 400,
                }
            );
        }

        for (
            const file of
            files
        ) {
            if (
                !IMAGE_TYPES.has(
                    file.type
                )
            ) {
                return NextResponse.json(
                    {
                        ok: false,
                        error:
                            "Todas las imágenes deben ser WEBP, PNG o JPG.",
                    },
                    {
                        status: 400,
                    }
                );
            }

            if (
                file.size >
                MAX_IMAGE_SIZE
            ) {
                return NextResponse.json(
                    {
                        ok: false,
                        error:
                            "Cada imagen puede pesar máximo 5 MB.",
                    },
                    {
                        status: 400,
                    }
                );
            }
        }

        const rows: {
            product_id: string;
            image_url: string;
            alt_text: string;
            orden: number;
        }[] = [];

        for (
            let index = 0;
            index <
            files.length;
            index++
        ) {
            const file =
                files[index];

            const extension =
                getExtension(
                    file
                );

            if (!extension) {
                throw new Error(
                    "Formato no permitido."
                );
            }

            const unique =
                `${Date.now()}-${crypto.randomUUID()}-${index}`;

            const path =
                `productos/${producto.slug}/galeria/${unique}.${extension}`;

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
                        path,
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
                throw uploadError;
            }

            uploadedPaths.push(
                path
            );

            const {
                data:
                publicUrlData,
            } =
                supabaseAdmin
                    .storage
                    .from(
                        BUCKET
                    )
                    .getPublicUrl(
                        path
                    );

            const imageUrl =
                publicUrlData
                    .publicUrl;

            if (!imageUrl) {
                throw new Error(
                    "No se pudo obtener la URL pública de la imagen."
                );
            }

            rows.push({
                product_id:
                    id,

                image_url:
                    imageUrl,

                alt_text:
                    producto.nombre,

                orden:
                    currentCount +
                    index,
            });
        }

        const {
            data,
            error:
            insertError,
        } =
            await supabaseAdmin
                .from(
                    "store_product_images"
                )
                .insert(rows)
                .select(`
                    id,
                    product_id,
                    image_url,
                    alt_text,
                    orden,
                    created_at
                `);

        if (
            insertError
        ) {
            throw insertError;
        }

        return NextResponse.json({
            ok: true,
            images:
                data ?? [],
        });
    } catch (error) {
        console.error(
            "Error agregando imágenes:",
            error
        );

        if (
            uploadedPaths.length >
            0
        ) {
            const {
                error:
                rollbackError,
            } =
                await supabaseAdmin
                    .storage
                    .from(
                        BUCKET
                    )
                    .remove(
                        uploadedPaths
                    );

            if (
                rollbackError
            ) {
                console.error(
                    "Error limpiando imágenes después del rollback:",
                    rollbackError
                );
            }
        }

        return NextResponse.json(
            {
                ok: false,
                error:
                    "No se pudieron agregar las imágenes.",
            },
            {
                status: 500,
            }
        );
    }
}

/* ============================================================
   DELETE
   ELIMINAR UNA IMAGEN
============================================================ */

export async function DELETE(
    req: NextRequest,
    context: RouteContext
) {
    try {
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

        const body =
            await req.json();

        const imageId =
            String(
                body?.imageId ??
                ""
            );

        if (!imageId) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Imagen inválida.",
                },
                {
                    status: 400,
                }
            );
        }

        const {
            data: image,
            error:
            imageError,
        } =
            await supabaseAdmin
                .from(
                    "store_product_images"
                )
                .select(`
                    id,
                    product_id,
                    image_url
                `)
                .eq(
                    "id",
                    imageId
                )
                .eq(
                    "product_id",
                    id
                )
                .maybeSingle();

        if (
            imageError ||
            !image
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Imagen no encontrada.",
                },
                {
                    status: 404,
                }
            );
        }

        const {
            error:
            deleteError,
        } =
            await supabaseAdmin
                .from(
                    "store_product_images"
                )
                .delete()
                .eq(
                    "id",
                    imageId
                )
                .eq(
                    "product_id",
                    id
                );

        if (
            deleteError
        ) {
            throw deleteError;
        }

        const storagePath =
            getStoragePathFromImageUrl(
                image.image_url
            );

        if (storagePath) {
            const {
                error:
                storageDeleteError,
            } =
                await supabaseAdmin
                    .storage
                    .from(
                        BUCKET
                    )
                    .remove([
                        storagePath,
                    ]);

            if (
                storageDeleteError
            ) {
                console.error(
                    "La fila se eliminó, pero no se pudo eliminar el archivo del Storage:",
                    storageDeleteError
                );
            }
        }

        return NextResponse.json({
            ok: true,
        });
    } catch (error) {
        console.error(
            "Error eliminando imagen:",
            error
        );

        return NextResponse.json(
            {
                ok: false,
                error:
                    "No se pudo eliminar la imagen.",
            },
            {
                status: 500,
            }
        );
    }
}

/* ============================================================
   PATCH
   REORDENAR GALERÍA
============================================================ */

export async function PATCH(
    req: NextRequest,
    context: RouteContext
) {
    try {
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

        const body =
            await req.json();

        const imageIds:
            string[] =
            Array.isArray(
                body?.imageIds
            )
                ? body.imageIds.map(
                    (
                        value:
                            unknown
                    ) =>
                        String(
                            value
                        )
                )
                : [];

        if (
            imageIds.length ===
            0
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Orden inválido.",
                },
                {
                    status: 400,
                }
            );
        }

        if (
            imageIds.length >
            MAX_GALLERY_IMAGES
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "La galería supera el máximo permitido.",
                },
                {
                    status: 400,
                }
            );
        }

        const {
            data:
            existingImages,
            error:
            existingError,
        } =
            await supabaseAdmin
                .from(
                    "store_product_images"
                )
                .select(
                    "id"
                )
                .eq(
                    "product_id",
                    id
                )
                .in(
                    "id",
                    imageIds
                );

        if (
            existingError
        ) {
            throw existingError;
        }

        if (
            (
                existingImages ??
                []
            ).length !==
            imageIds.length
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Una o más imágenes no pertenecen a este producto.",
                },
                {
                    status: 400,
                }
            );
        }

        for (
            let index = 0;
            index <
            imageIds.length;
            index++
        ) {
            const {
                error,
            } =
                await supabaseAdmin
                    .from(
                        "store_product_images"
                    )
                    .update({
                        orden:
                            index,
                    })
                    .eq(
                        "id",
                        imageIds[
                        index
                        ]
                    )
                    .eq(
                        "product_id",
                        id
                    );

            if (error) {
                throw error;
            }
        }

        return NextResponse.json({
            ok: true,
        });
    } catch (error) {
        console.error(
            "Error reordenando galería:",
            error
        );

        return NextResponse.json(
            {
                ok: false,
                error:
                    "No se pudo ordenar la galería.",
            },
            {
                status: 500,
            }
        );
    }
}
