import {
    NextRequest,
    NextResponse,
} from "next/server";

import sharp from "sharp";

import {
    supabaseAdmin,
} from "@/lib/supabaseAdmin";

import {
    getBarukShopImageUrl,
} from "@/lib/barukShopImage";


export const runtime =
    "nodejs";

export const dynamic =
    "force-dynamic";


// =========================================================
// GET
// Convierte imágenes de Baruk Shop a JPEG compatible
// con WhatsApp Cloud API.
// =========================================================

export async function GET(
    request: NextRequest
) {

    try {

        const productId =
            request
                .nextUrl
                .searchParams
                .get(
                    "product_id"
                )
                ?.trim() ??
            "";


        const imageSelector =
            request
                .nextUrl
                .searchParams
                .get(
                    "image"
                )
                ?.trim() ??
            "principal";


        if (
            !productId
        ) {

            return NextResponse.json(
                {
                    ok:
                        false,

                    error:
                        "Falta product_id",
                },
                {
                    status:
                        400,
                }
            );
        }


        // =====================================================
        // PRODUCTO + GALERÍA
        // =====================================================

        const {
            data:
            producto,

            error:
            productoError,

        } =
            await supabaseAdmin
                .from(
                    "store_products"
                )
                .select(`
                    id,
                    nombre,
                    imagen_principal,
                    activo,

                    store_product_images (
                        id,
                        image_url,
                        alt_text,
                        orden
                    )
                `)
                .eq(
                    "id",
                    productId
                )
                .eq(
                    "activo",
                    true
                )
                .maybeSingle();


        if (
            productoError
        ) {

            console.error(
                "Error consultando producto para WhatsApp:",
                productoError
            );

            throw productoError;
        }


        if (
            !producto
        ) {

            return NextResponse.json(
                {
                    ok:
                        false,

                    error:
                        "Producto no encontrado",
                },
                {
                    status:
                        404,
                }
            );
        }


        let imagePath:
            string |
            null =
            null;


        if (
            imageSelector ===
            "principal"
        ) {

            imagePath =
                producto
                    .imagen_principal ??
                null;

        } else {

            const gallery =
                Array.isArray(
                    producto
                        .store_product_images
                )
                    ? producto
                        .store_product_images
                    : [];


            const selected =
                gallery.find(
                    (
                        item:
                            any
                    ) =>
                        String(
                            item.id
                        ) ===
                        imageSelector
                );


            imagePath =
                selected
                    ?.image_url ??
                null;
        }


        if (
            !imagePath
        ) {

            return NextResponse.json(
                {
                    ok:
                        false,

                    error:
                        "Imagen no encontrada",
                },
                {
                    status:
                        404,
                }
            );
        }


        const sourceUrl =
            getBarukShopImageUrl(
                imagePath
            );


        if (
            !sourceUrl
        ) {

            return NextResponse.json(
                {
                    ok:
                        false,

                    error:
                        "No se pudo resolver la imagen",
                },
                {
                    status:
                        404,
                }
            );
        }


        // =====================================================
        // DESCARGAR IMAGEN ORIGINAL
        // =====================================================

        const sourceResponse =
            await fetch(
                sourceUrl,
                {
                    cache:
                        "force-cache",
                }
            );


        if (
            !sourceResponse.ok
        ) {

            throw new Error(
                `No se pudo descargar la imagen original (${sourceResponse.status})`
            );
        }


        const sourceBuffer =
            Buffer.from(
                await sourceResponse
                    .arrayBuffer()
            );


        // =====================================================
        // CONVERTIR A JPEG
        // WhatsApp image admite JPEG / PNG, no WebP.
        // Limitamos tamaño para no superar requisitos.
        // =====================================================

        const jpegBuffer =
            await sharp(
                sourceBuffer
            )
                .rotate()
                .resize({
                    width:
                        1600,

                    height:
                        1600,

                    fit:
                        "inside",

                    withoutEnlargement:
                        true,
                })
                .jpeg({
                    quality:
                        86,

                    mozjpeg:
                        true,
                })
                .toBuffer();


        if (
            jpegBuffer.byteLength >
            5 * 1024 * 1024
        ) {

            return NextResponse.json(
                {
                    ok:
                        false,

                    error:
                        "La imagen convertida supera 5 MB",
                },
                {
                    status:
                        413,
                }
            );
        }


        return new NextResponse(
            new Uint8Array(
                jpegBuffer
            ),
            {
                status:
                    200,

                headers: {
                    "Content-Type":
                        "image/jpeg",

                    "Content-Length":
                        String(
                            jpegBuffer
                                .byteLength
                        ),

                    "Cache-Control":
                        "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
                },
            }
        );


    } catch (
    error
    ) {

        console.error(
            "WhatsApp product image error:",
            error
        );


        return NextResponse.json(
            {
                ok:
                    false,

                error:
                    "No se pudo preparar la imagen para WhatsApp",
            },
            {
                status:
                    500,
            }
        );
    }
}
