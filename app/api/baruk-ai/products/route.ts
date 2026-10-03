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


// =========================================================
// NORMALIZAR TEXTO
// =========================================================

function normalizar(
    value:
        | string
        | null
        | undefined
): string {

    return (
        value ??
        ""
    )
        .normalize(
            "NFD"
        )
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .toLowerCase()
        .replace(
            /[^a-z0-9]+/g,
            " "
        )
        .trim();
}


// =========================================================
// URL JPEG COMPATIBLE CON WHATSAPP
// =========================================================

function buildWhatsAppImageUrl(
    request: NextRequest,
    productId: string,
    image:
        string
) {

    const url =
        new URL(
            "/api/baruk-ai/whatsapp-image",
            request
                .nextUrl
                .origin
        );


    url.searchParams.set(
        "product_id",
        productId
    );


    url.searchParams.set(
        "image",
        image
    );


    return url.toString();
}


// =========================================================
// GET
// =========================================================

export async function GET(
    request: NextRequest
) {

    try {

        // =====================================================
        // 1. AUTENTICACIÓN INTERNA
        // =====================================================

        const expectedSecret =
            process.env
                .BARUK_AI_INTERNAL_SECRET;


        if (
            !expectedSecret
        ) {

            console.error(
                "BARUK_AI_INTERNAL_SECRET no está configurado"
            );


            return NextResponse.json(
                {
                    success:
                        false,

                    error:
                        "Configuración interna incompleta",
                },
                {
                    status:
                        500,
                }
            );
        }


        const authorization =
            request.headers.get(
                "authorization"
            );


        if (
            authorization !==
            `Bearer ${expectedSecret}`
        ) {

            return NextResponse.json(
                {
                    success:
                        false,

                    error:
                        "Unauthorized",
                },
                {
                    status:
                        401,
                }
            );
        }


        // =====================================================
        // 2. CONSULTA
        // =====================================================

        const rawQuery =
            request
                .nextUrl
                .searchParams
                .get(
                    "q"
                )
                ?.trim() ??
            "";


        if (
            rawQuery.length <
            2
        ) {

            return NextResponse.json(
                {
                    success:
                        false,

                    error:
                        "La búsqueda debe contener al menos dos caracteres",
                },
                {
                    status:
                        400,
                }
            );
        }


        const queryNormalizada =
            normalizar(
                rawQuery
            );


        const tokens =
            queryNormalizada
                .split(
                    /\s+/
                )
                .filter(
                    (
                        token
                    ) =>
                        token.length >
                        1
                );


        // =====================================================
        // 3. PRODUCTOS ACTIVOS
        // =====================================================

        const {
            data:
            productos,

            error:
            productosError,

        } =
            await supabaseAdmin
                .from(
                    "store_products"
                )
                .select(`
                    id,
                    nombre,
                    slug,
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

                    store_categories (
                        nombre,
                        slug
                    ),

                    store_product_images (
                        id,
                        image_url,
                        alt_text,
                        orden
                    )
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
                );


        if (
            productosError
        ) {

            console.error(
                "Error consultando Baruk Shop:",
                productosError
            );


            throw productosError;
        }


        // =====================================================
        // 4. BÚSQUEDA FLEXIBLE
        // =====================================================

        const encontrados =
            (
                productos ??
                []
            )
                .map(
                    (
                        producto:
                            any
                    ) => {

                        const categoria =
                            Array.isArray(
                                producto
                                    .store_categories
                            )
                                ? producto
                                    .store_categories[0] ??
                                null
                                : producto
                                    .store_categories ??
                                null;


                        const nombre =
                            normalizar(
                                producto
                                    .nombre
                            );


                        const slug =
                            normalizar(
                                producto
                                    .slug
                            );


                        const descripcion =
                            normalizar(
                                producto
                                    .descripcion_corta
                            );


                        const sku =
                            normalizar(
                                producto
                                    .sku
                            );


                        const etiqueta =
                            normalizar(
                                producto
                                    .etiqueta
                            );


                        const categoriaTexto =
                            normalizar(
                                categoria
                                    ?.nombre
                            );


                        const searchable =
                            [
                                nombre,
                                slug,
                                descripcion,
                                sku,
                                etiqueta,
                                categoriaTexto,
                            ]
                                .filter(
                                    Boolean
                                )
                                .join(
                                    " "
                                );


                        const tokensEncontrados =
                            tokens.filter(
                                (
                                    token
                                ) =>
                                    searchable.includes(
                                        token
                                    )
                            );


                        if (
                            tokensEncontrados
                                .length ===
                            0
                        ) {

                            return null;
                        }


                        let score =
                            tokensEncontrados
                                .length *
                            10;


                        if (
                            nombre ===
                            queryNormalizada
                        ) {

                            score +=
                                100;
                        }


                        if (
                            nombre.includes(
                                queryNormalizada
                            )
                        ) {

                            score +=
                                50;
                        }


                        if (
                            tokens.length >
                            0 &&
                            tokens.every(
                                (
                                    token
                                ) =>
                                    nombre.includes(
                                        token
                                    )
                            )
                        ) {

                            score +=
                                40;
                        }


                        if (
                            tokens.length >
                            0 &&
                            tokens.every(
                                (
                                    token
                                ) =>
                                    searchable.includes(
                                        token
                                    )
                            )
                        ) {

                            score +=
                                20;
                        }


                        return {
                            producto,
                            categoria,
                            score,
                        };
                    }
                )
                .filter(
                    Boolean
                )
                .sort(
                    (
                        a:
                            any,
                        b:
                            any
                    ) =>
                        b.score -
                        a.score
                )
                .slice(
                    0,
                    8
                );


        // =====================================================
        // 5. RESPUESTA PARA BARUK AI
        // =====================================================

        const products =
            encontrados.map(
                (
                    item:
                        any
                ) => {

                    const producto =
                        item.producto;


                    const stock =
                        Number(
                            producto
                                .stock
                        );


                    const precio =
                        Number(
                            producto
                                .precio
                        );


                    const precioAnterior =
                        producto
                            .precio_anterior ===
                            null ||
                            producto
                                .precio_anterior ===
                            undefined
                            ? null
                            : Number(
                                producto
                                    .precio_anterior
                            );


                    // La URL que recibe Baruk AI ya devuelve JPEG,
                    // aunque el archivo original en Supabase sea WebP.
                    const imagenPrincipal =
                        producto
                            .imagen_principal
                            ? buildWhatsAppImageUrl(
                                request,
                                String(
                                    producto.id
                                ),
                                "principal"
                            )
                            : null;


                    const imagenesAdicionales =
                        (
                            producto
                                .store_product_images ??
                            []
                        )
                            .slice()
                            .sort(
                                (
                                    a:
                                        any,
                                    b:
                                        any
                                ) =>
                                    Number(
                                        a.orden ??
                                        0
                                    ) -
                                    Number(
                                        b.orden ??
                                        0
                                    )
                            )
                            .map(
                                (
                                    imagen:
                                        any
                                ) => {

                                    if (
                                        !imagen
                                            ?.id ||
                                        !imagen
                                            ?.image_url
                                    ) {

                                        return null;
                                    }


                                    return {
                                        id:
                                            imagen.id,

                                        url:
                                            buildWhatsAppImageUrl(
                                                request,
                                                String(
                                                    producto.id
                                                ),
                                                String(
                                                    imagen.id
                                                )
                                            ),

                                        alt:
                                            imagen
                                                .alt_text ??
                                            producto
                                                .nombre,

                                        orden:
                                            Number(
                                                imagen
                                                    .orden ??
                                                0
                                            ),
                                    };
                                }
                            )
                            .filter(
                                Boolean
                            );


                    return {
                        id:
                            producto.id,

                        nombre:
                            producto.nombre,

                        slug:
                            producto.slug,

                        url_producto:
                            `https://www.baruk593.com/tienda/${producto.slug}`,

                        precio,

                        precio_anterior:
                            precioAnterior,

                        moneda:
                            "USD",

                        stock,

                        disponible:
                            stock >
                            0,

                        sku:
                            producto.sku ??
                            null,

                        imagen_principal:
                            imagenPrincipal,

                        imagenes:
                            imagenesAdicionales,

                        categoria:
                            item.categoria
                                ? {
                                    nombre:
                                        item
                                            .categoria
                                            .nombre,

                                    slug:
                                        item
                                            .categoria
                                            .slug,
                                }
                                : null,

                        destacado:
                            Boolean(
                                producto
                                    .destacado
                            ),

                        tendencia:
                            Boolean(
                                producto
                                    .tendencia
                            ),

                        nuevo:
                            Boolean(
                                producto
                                    .nuevo
                            ),

                        etiqueta:
                            producto
                                .etiqueta ??
                            null,
                    };
                }
            );


        return NextResponse.json(
            {
                success:
                    true,

                query:
                    rawQuery,

                count:
                    products.length,

                products,
            },
            {
                status:
                    200,

                headers: {
                    "Cache-Control":
                        "no-store",
                },
            }
        );


    } catch (
    error
    ) {

        console.error(
            "Baruk AI products error:",
            error
        );


        return NextResponse.json(
            {
                success:
                    false,

                error:
                    "No se pudo consultar Baruk Shop",
            },
            {
                status:
                    500,
            }
        );
    }
}
