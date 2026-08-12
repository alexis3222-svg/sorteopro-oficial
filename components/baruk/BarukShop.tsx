"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { getBarukShopImageUrl } from "@/lib/barukShopImage";

type Categoria = {
    nombre: string;
    slug: string;
};

type Producto = {
    id: string;
    nombre: string;
    slug: string;
    descripcion_corta: string | null;
    precio: number | string;
    precio_anterior: number | string | null;
    stock: number;
    imagen_principal: string | null;
    etiqueta: string | null;
    nuevo: boolean;
    tendencia: boolean;
    destacado: boolean;
    orden: number;
    store_categories: Categoria | null;
};

/* ============================================================
   PLACEHOLDER
============================================================ */

function ProductPlaceholder() {
    return (
        <div
            className="
                absolute
                inset-0
                flex
                items-center
                justify-center
                bg-gradient-to-b
                from-[#fafafa]
                to-[#f4f4f4]
                p-6
            "
        >
            <div className="text-center">

                <div
                    className="
                        mx-auto
                        flex
                        h-20
                        w-20
                        items-center
                        justify-center
                        rounded-full
                        border
                        border-slate-200
                        bg-white
                        shadow-sm
                    "
                >
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        className="h-8 w-8 text-slate-300"
                        aria-hidden="true"
                    >
                        <path
                            d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5v-9Z"
                            stroke="currentColor"
                            strokeWidth="1.6"
                        />

                        <path
                            d="m7 16 3.2-3.5 2.2 2.3 1.8-2 2.8 3.2"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />

                        <circle
                            cx="15.5"
                            cy="9"
                            r="1.3"
                            stroke="currentColor"
                            strokeWidth="1.5"
                        />
                    </svg>
                </div>

                <p
                    className="
                        mt-4
                        text-[9px]
                        font-black
                        uppercase
                        tracking-[0.14em]
                        text-slate-300
                    "
                >
                    Baruk Shop
                </p>

                <p
                    className="
                        mt-1
                        text-[9px]
                        font-semibold
                        text-slate-300
                    "
                >
                    Imagen próximamente
                </p>

            </div>
        </div>
    );
}

/* ============================================================
   COMPONENTE
============================================================ */

export default function BarukShop() {
    const [productos, setProductos] =
        useState<Producto[]>([]);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState<string | null>(null);

    /* ============================================================
       CARGAR PRODUCTOS DESDE SUPABASE
    ============================================================ */

    useEffect(() => {
        const cargarProductos = async () => {
            try {
                setLoading(true);
                setError(null);

                const {
                    data,
                    error: productosError,
                } = await supabase
                    .from("store_products")
                    .select(`
                        id,
                        nombre,
                        slug,
                        descripcion_corta,
                        precio,
                        precio_anterior,
                        stock,
                        imagen_principal,
                        etiqueta,
                        nuevo,
                        tendencia,
                        destacado,
                        orden,
                        store_categories (
                            nombre,
                            slug
                        )
                    `)
                    .eq("activo", true)
                    .eq("destacado", true)
                    .order("orden", {
                        ascending: true,
                    })
                    .limit(4);

                if (productosError) {
                    console.error(
                        "Error cargando Baruk Shop:",
                        productosError
                    );

                    throw productosError;
                }

                setProductos(
                    (data ?? []) as unknown as Producto[]
                );

            } catch (err) {
                console.error(
                    "Error cargando productos:",
                    err
                );

                setError(
                    "No pudimos cargar los productos de Baruk Shop."
                );

            } finally {
                setLoading(false);
            }
        };

        cargarProductos();
    }, []);

    return (
        <section className="w-full py-12 md:py-16">

            {/* =====================================================
                ENCABEZADO
            ===================================================== */}

            <div
                className="
                    mb-8
                    flex
                    flex-col
                    gap-4

                    sm:flex-row
                    sm:items-end
                    sm:justify-between
                "
            >
                <div>

                    <h2
                        className="
                            text-2xl
                            font-black
                            tracking-[-0.035em]
                            text-[#171717]

                            md:text-3xl
                        "
                    >
                        Baruk Shop
                    </h2>

                    <p
                        className="
                            mt-3
                            max-w-2xl
                            text-sm
                            leading-6
                            text-slate-500
                        "
                    >
                        Explora los productos disponibles en Baruk Shop
                        y encuentra tus favoritos directamente desde nuestra tienda.
                    </p>

                </div>

                {/* VER BARUK SHOP - ESCRITORIO */}

                <Link
                    href="/tienda"
                    className="
                        hidden
                        shrink-0
                        items-center
                        gap-2

                        text-xs
                        font-black
                        text-[#171717]

                        transition

                        hover:text-[#ff6600]

                        sm:flex
                    "
                >
                    Ver Baruk Shop

                    <span className="text-base">
                        →
                    </span>
                </Link>

            </div>

            {/* =====================================================
                LOADING
            ===================================================== */}

            {loading && (
                <div
                    className="
                        grid
                        grid-cols-2
                        gap-3

                        lg:grid-cols-4
                        lg:gap-5
                    "
                >
                    {[1, 2, 3, 4].map((item) => (
                        <div
                            key={item}
                            className="animate-pulse"
                        >
                            <div
                                className="
                                    aspect-square
                                    rounded-[24px]
                                    bg-slate-100
                                "
                            />

                            <div
                                className="
                                    mt-4
                                    h-2
                                    w-16
                                    rounded
                                    bg-slate-100
                                "
                            />

                            <div
                                className="
                                    mt-3
                                    h-4
                                    w-3/4
                                    rounded
                                    bg-slate-100
                                "
                            />

                            <div
                                className="
                                    mt-3
                                    h-5
                                    w-20
                                    rounded
                                    bg-slate-100
                                "
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* =====================================================
                ERROR
            ===================================================== */}

            {!loading && error && (
                <div
                    className="
                        rounded-[24px]
                        border
                        border-slate-200
                        bg-[#fafafa]
                        px-6
                        py-10
                        text-center
                    "
                >
                    <p
                        className="
                            text-sm
                            font-bold
                            text-slate-600
                        "
                    >
                        Baruk Shop no está disponible en este momento.
                    </p>

                    <p
                        className="
                            mt-1
                            text-xs
                            text-slate-400
                        "
                    >
                        Intenta nuevamente más tarde.
                    </p>
                </div>
            )}

            {/* =====================================================
                SIN PRODUCTOS
            ===================================================== */}

            {!loading &&
                !error &&
                productos.length === 0 && (
                    <div
                        className="
                            rounded-[24px]
                            border
                            border-slate-200
                            bg-[#fafafa]
                            px-6
                            py-10
                            text-center
                        "
                    >
                        <p
                            className="
                                text-sm
                                font-bold
                                text-slate-600
                            "
                        >
                            Próximamente nuevos productos
                        </p>

                        <p
                            className="
                                mt-1
                                text-xs
                                text-slate-400
                            "
                        >
                            Estamos preparando novedades para Baruk Shop.
                        </p>
                    </div>
                )}

            {/* =====================================================
                PRODUCTOS
            ===================================================== */}

            {!loading &&
                !error &&
                productos.length > 0 && (
                    <div
                        className="
                            grid
                            grid-cols-2
                            gap-x-3
                            gap-y-7

                            md:gap-x-5

                            lg:grid-cols-4
                        "
                    >
                        {productos.map((producto) => {

                            /* =============================================
                               VALORES DEL PRODUCTO
                            ============================================= */

                            const precio =
                                Number(
                                    producto.precio
                                );

                            const precioAnterior =
                                producto.precio_anterior !== null
                                    ? Number(
                                        producto.precio_anterior
                                    )
                                    : null;

                            const agotado =
                                Number(
                                    producto.stock
                                ) <= 0;

                            /*
                             * Convierte:
                             *
                             * productos/casco-adventure/principal.webp
                             *
                             * en:
                             *
                             * https://...supabase.co/storage/v1/object/public/...
                             */
                            const imagenUrl =
                                getBarukShopImageUrl(
                                    producto.imagen_principal
                                );

                            return (
                                <article
                                    key={producto.id}
                                    className="group"
                                >

                                    {/* =========================================
                                        IMAGEN DEL PRODUCTO
                                    ========================================== */}

                                    <Link
                                        href={`/tienda/${producto.slug}`}
                                        aria-label={`Ver ${producto.nombre}`}
                                        className="block"
                                    >
                                        <div
                                            className="
                                                relative
                                                aspect-square
                                                overflow-hidden

                                                rounded-[24px]

                                                border
                                                border-slate-200

                                                bg-[#f7f7f7]

                                                transition-all
                                                duration-300

                                                group-hover:-translate-y-1
                                                group-hover:border-orange-200

                                                group-hover:shadow-[0_16px_35px_rgba(255,102,0,0.10)]
                                            "
                                        >

                                            {/* ETIQUETA */}

                                            <div
                                                className="
                                                    absolute
                                                    left-3
                                                    top-3
                                                    z-20
                                                "
                                            >
                                                {agotado ? (
                                                    <span
                                                        className="
                                                            rounded-full
                                                            bg-[#171717]

                                                            px-3
                                                            py-1.5

                                                            text-[8px]
                                                            font-black
                                                            uppercase
                                                            tracking-[0.12em]
                                                            text-white

                                                            shadow-sm
                                                        "
                                                    >
                                                        Agotado
                                                    </span>

                                                ) : producto.etiqueta ? (

                                                    <span
                                                        className="
                                                            rounded-full

                                                            border
                                                            border-slate-100

                                                            bg-white

                                                            px-3
                                                            py-1.5

                                                            text-[8px]
                                                            font-black
                                                            uppercase
                                                            tracking-[0.12em]
                                                            text-[#171717]

                                                            shadow-sm
                                                        "
                                                    >
                                                        {producto.etiqueta}
                                                    </span>

                                                ) : producto.nuevo ? (

                                                    <span
                                                        className="
                                                            rounded-full
                                                            bg-[#ff6600]

                                                            px-3
                                                            py-1.5

                                                            text-[8px]
                                                            font-black
                                                            uppercase
                                                            tracking-[0.12em]
                                                            text-white

                                                            shadow-sm
                                                        "
                                                    >
                                                        Nuevo
                                                    </span>

                                                ) : null}
                                            </div>

                                            {/* =====================================
                                                PLACEHOLDER
                                            ====================================== */}

                                            <ProductPlaceholder />

                                            {/* =====================================
                                                IMAGEN REAL DESDE SUPABASE STORAGE
                                            ====================================== */}

                                            {imagenUrl && (
                                                <img
                                                    src={imagenUrl}
                                                    alt={
                                                        producto.nombre
                                                    }
                                                    className="
                                                        relative
                                                        z-10

                                                        h-full
                                                        w-full

                                                        object-contain
                                                        p-5

                                                        transition-transform
                                                        duration-500

                                                        group-hover:scale-[1.06]
                                                    "
                                                    onError={(event) => {
                                                        /*
                                                         * Si la imagen falla,
                                                         * desaparece el img y queda
                                                         * visible el placeholder.
                                                         */
                                                        event.currentTarget.style.display =
                                                            "none";
                                                    }}
                                                />
                                            )}

                                            {/* =====================================
                                                FLECHA FLOTANTE
                                            ====================================== */}

                                            <div
                                                className="
                                                    absolute
                                                    bottom-3
                                                    right-3
                                                    z-20

                                                    hidden
                                                    h-10
                                                    w-10

                                                    translate-y-2

                                                    items-center
                                                    justify-center

                                                    rounded-full
                                                    bg-white

                                                    text-base
                                                    font-black
                                                    text-[#171717]

                                                    opacity-0

                                                    shadow-[0_8px_20px_rgba(0,0,0,0.12)]

                                                    transition-all
                                                    duration-300

                                                    group-hover:translate-y-0
                                                    group-hover:opacity-100

                                                    md:flex
                                                "
                                            >
                                                →
                                            </div>

                                        </div>
                                    </Link>

                                    {/* =========================================
                                        INFORMACIÓN
                                    ========================================== */}

                                    <div className="px-1 pt-4">

                                        {/* CATEGORÍA */}

                                        <p
                                            className="
                                                text-[9px]
                                                font-black
                                                uppercase
                                                tracking-[0.18em]
                                                text-slate-400
                                            "
                                        >
                                            {producto
                                                .store_categories
                                                ?.nombre ??
                                                "Baruk Shop"}
                                        </p>

                                        {/* NOMBRE */}

                                        <Link
                                            href={`/tienda/${producto.slug}`}
                                            className="block"
                                        >
                                            <h3
                                                className="
                                                    mt-1.5
                                                    line-clamp-2

                                                    text-sm
                                                    font-black
                                                    leading-5
                                                    text-[#171717]

                                                    transition-colors

                                                    group-hover:text-[#ff6600]

                                                    md:text-base
                                                "
                                            >
                                                {producto.nombre}
                                            </h3>
                                        </Link>

                                        {/* PRECIO */}

                                        <div
                                            className="
                                                mt-2
                                                flex
                                                flex-wrap
                                                items-center
                                                gap-x-2
                                                gap-y-1
                                            "
                                        >
                                            <p
                                                className="
                                                    text-base
                                                    font-black
                                                    text-[#171717]

                                                    md:text-lg
                                                "
                                            >
                                                $
                                                {precio.toFixed(
                                                    2
                                                )}
                                            </p>

                                            {precioAnterior !== null &&
                                                precioAnterior > precio && (
                                                    <>
                                                        <p
                                                            className="
                                                                text-xs
                                                                font-semibold
                                                                text-slate-400
                                                                line-through
                                                            "
                                                        >
                                                            $
                                                            {precioAnterior.toFixed(
                                                                2
                                                            )}
                                                        </p>

                                                        <span
                                                            className="
                                                                rounded-full
                                                                bg-orange-50

                                                                px-2
                                                                py-1

                                                                text-[8px]
                                                                font-black
                                                                text-[#ff6600]
                                                            "
                                                        >
                                                            OFERTA
                                                        </span>
                                                    </>
                                                )}

                                        </div>

                                        {/* =====================================
                                            VER PRODUCTO
                                        ====================================== */}

                                        <Link
                                            href={`/tienda/${producto.slug}`}
                                            className="
                                                mt-3
                                                inline-flex
                                                items-center
                                                gap-1.5

                                                text-[11px]
                                                font-black
                                                text-[#ff6600]

                                                transition-all

                                                hover:gap-2.5
                                            "
                                        >
                                            Ver producto

                                            <span>
                                                →
                                            </span>
                                        </Link>

                                        {/* =====================================
                                            AGOTADO
                                        ====================================== */}

                                        {agotado && (
                                            <p
                                                className="
                                                    mt-2
                                                    text-[9px]
                                                    font-bold
                                                    uppercase
                                                    tracking-[0.12em]
                                                    text-slate-400
                                                "
                                            >
                                                Actualmente agotado
                                            </p>
                                        )}

                                    </div>

                                </article>
                            );
                        })}
                    </div>
                )}

            {/* =====================================================
                VER BARUK SHOP - MÓVIL
            ===================================================== */}

            {!loading &&
                !error &&
                productos.length > 0 && (
                    <Link
                        href="/tienda"
                        className="
                            mt-8
                            block
                            w-full

                            rounded-xl

                            border
                            border-slate-200

                            bg-white

                            py-3

                            text-center
                            text-sm
                            font-black
                            text-[#171717]

                            transition

                            hover:border-[#ff6600]
                            hover:text-[#ff6600]

                            sm:hidden
                        "
                    >
                        Ver Baruk Shop
                    </Link>
                )}

        </section>
    );
}