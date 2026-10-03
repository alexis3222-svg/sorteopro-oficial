import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function unauthorized() {
    return NextResponse.json(
        {
            success: false,
            error: "Unauthorized",
        },
        { status: 401 }
    );
}

function normalizeSearch(value: string) {
    return value
        .trim()
        .toLowerCase()
        .replace(/[(),]/g, " ")
        .replace(/\s+/g, " ")
        .slice(0, 100);
}

export async function GET(request: NextRequest) {
    try {
        // =====================================================
        // 1. AUTORIZACIÓN PRIVADA
        // =====================================================

        const expectedSecret =
            process.env.BARUK_AI_INTERNAL_SECRET;

        if (!expectedSecret) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Configuración interna incompleta",
                },
                { status: 500 }
            );
        }

        const authorization =
            request.headers.get("authorization");

        if (
            !authorization ||
            authorization !== `Bearer ${expectedSecret}`
        ) {
            return unauthorized();
        }

        // =====================================================
        // 2. TEXTO DE BÚSQUEDA
        // =====================================================

        const rawQuery =
            request.nextUrl.searchParams.get("q") ?? "";

        const query = normalizeSearch(rawQuery);

        if (query.length < 2) {
            return NextResponse.json(
                {
                    success: false,
                    error:
                        "Debes indicar al menos 2 caracteres para buscar",
                },
                { status: 400 }
            );
        }

        // =====================================================
        // 3. PRODUCTOS ACTIVOS
        // =====================================================

        const {
            data: products,
            error: productsError,
        } = await supabaseAdmin
            .from("store_products")
            .select(`
        id,
        category_id,
        nombre,
        slug,
        descripcion_corta,
        precio,
        precio_anterior,
        stock,
        sku,
        imagen_principal,
        destacado,
        tendencia,
        nuevo,
        etiqueta
      `)
            .eq("activo", true)
            .or(
                [
                    `nombre.ilike.%${query}%`,
                    `slug.ilike.%${query}%`,
                    `sku.ilike.%${query}%`,
                ].join(",")
            )
            .order("destacado", {
                ascending: false,
            })
            .order("orden", {
                ascending: true,
            })
            .limit(10);

        if (productsError) {
            console.error(
                "Error buscando productos:",
                productsError
            );

            return NextResponse.json(
                {
                    success: false,
                    error: "No se pudieron consultar los productos",
                },
                { status: 500 }
            );
        }

        const categoryIds = [
            ...new Set(
                (products ?? [])
                    .map((product) => product.category_id)
                    .filter(Boolean)
            ),
        ];

        // =====================================================
        // 4. CATEGORÍAS
        // =====================================================

        let categories: {
            id: string;
            nombre: string;
            slug: string;
        }[] = [];

        if (categoryIds.length > 0) {
            const {
                data,
                error,
            } = await supabaseAdmin
                .from("store_categories")
                .select("id, nombre, slug")
                .in("id", categoryIds);

            if (!error && data) {
                categories = data;
            }
        }

        const categoryMap = new Map(
            categories.map((category) => [
                category.id,
                category,
            ])
        );

        // =====================================================
        // 5. RESPUESTA COMERCIAL
        // =====================================================

        const result = (products ?? []).map(
            (product) => {
                const category = product.category_id
                    ? categoryMap.get(product.category_id)
                    : null;

                return {
                    id: product.id,

                    nombre: product.nombre,
                    slug: product.slug,

                    precio: Number(product.precio),

                    precio_anterior:
                        product.precio_anterior !== null
                            ? Number(product.precio_anterior)
                            : null,

                    moneda: "USD",

                    stock: product.stock,

                    disponible: product.stock > 0,

                    sku: product.sku,

                    imagen_principal:
                        product.imagen_principal,

                    categoria: category
                        ? {
                            nombre: category.nombre,
                            slug: category.slug,
                        }
                        : null,

                    destacado: product.destacado,
                    tendencia: product.tendencia,
                    nuevo: product.nuevo,
                    etiqueta: product.etiqueta,
                };
            }
        );

        return NextResponse.json(
            {
                success: true,
                query,
                count: result.length,
                products: result,
            },
            {
                headers: {
                    "Cache-Control": "no-store",
                },
            }
        );
    } catch (error) {
        console.error(
            "Baruk AI products API error:",
            error
        );

        return NextResponse.json(
            {
                success: false,
                error: "Error interno del servidor",
            },
            { status: 500 }
        );
    }
}