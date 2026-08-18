"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { getBarukShopImageUrl } from "@/lib/barukShopImage";

type Categoria = {
    id: string;
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

    store_categories: {
        id: string;
        nombre: string;
        slug: string;
    } | null;
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
                        tracking-[0.15em]
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
   IMAGEN SEGURA
============================================================ */

function ProductImage({
    src,
    alt,
}: {
    src: string | null;
    alt: string;
}) {
    const [errorImagen, setErrorImagen] =
        useState(false);

    /*
     * Convierte:
     *
     * productos/casco-adventure/principal.webp
     *
     * en la URL pública real del bucket baruk-shop.
     *
     * Si src ya fuera una URL https:// completa,
     * el helper también la conserva correctamente.
     */
    const imagenUrl =
        getBarukShopImageUrl(
            src
        );

    useEffect(() => {
        setErrorImagen(false);
    }, [src]);

    return (
        <>
            <ProductPlaceholder />

            {imagenUrl &&
                !errorImagen && (
                    <img
                        src={
                            imagenUrl
                        }
                        alt={
                            alt
                        }
                        onError={() =>
                            setErrorImagen(
                                true
                            )
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
                    />
                )}
        </>
    );
}

/* ============================================================
   NORMALIZAR TEXTO
============================================================ */

function textoBarukShop(
    texto: string | null
) {
    if (!texto) return null;

    return texto.replace(
        /Baruk Store/gi,
        "Baruk Shop"
    );
}

/* ============================================================
   PÁGINA
============================================================ */

export default function BarukShopPage() {
    const [
        productos,
        setProductos,
    ] = useState<Producto[]>([]);

    const [
        categorias,
        setCategorias,
    ] = useState<Categoria[]>([]);

    const [
        categoriaActiva,
        setCategoriaActiva,
    ] = useState("todos");

    const [
        busqueda,
        setBusqueda,
    ] = useState("");

    const [
        loading,
        setLoading,
    ] = useState(true);

    const [
        error,
        setError,
    ] = useState<string | null>(
        null
    );

    /* ============================================================
       CARGAR CATÁLOGO
    ============================================================ */

    useEffect(() => {
        const cargarCatalogo =
            async () => {
                try {
                    setLoading(true);
                    setError(null);

                    const [
                        productosResponse,
                        categoriasResponse,
                    ] =
                        await Promise.all([
                            supabase
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
                                    imagen_principal,
                                    etiqueta,
                                    nuevo,
                                    tendencia,
                                    destacado,
                                    orden,
                                    store_categories (
                                        id,
                                        nombre,
                                        slug
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
                                ),

                            supabase
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
                        productosResponse.error
                    ) {
                        throw productosResponse.error;
                    }

                    if (
                        categoriasResponse.error
                    ) {
                        throw categoriasResponse.error;
                    }

                    setProductos(
                        (productosResponse.data ??
                            []) as unknown as Producto[]
                    );

                    setCategorias(
                        (categoriasResponse.data ??
                            []) as Categoria[]
                    );
                } catch (err) {
                    console.error(
                        "Error cargando Baruk Shop:",
                        err
                    );

                    setError(
                        "No pudimos cargar Baruk Shop."
                    );
                } finally {
                    setLoading(false);
                }
            };

        cargarCatalogo();
    }, []);

    /* ============================================================
       FILTRADO
    ============================================================ */

    const productosFiltrados =
        useMemo(() => {
            const termino =
                busqueda
                    .trim()
                    .toLowerCase();

            return productos.filter(
                (producto) => {
                    const categoriaCorrecta =
                        categoriaActiva ===
                        "todos" ||
                        producto
                            .store_categories
                            ?.slug ===
                        categoriaActiva;

                    const nombre =
                        producto.nombre.toLowerCase();

                    const descripcion =
                        producto.descripcion_corta
                            ?.toLowerCase() ??
                        "";

                    const busquedaCorrecta =
                        !termino ||
                        nombre.includes(
                            termino
                        ) ||
                        descripcion.includes(
                            termino
                        );

                    return (
                        categoriaCorrecta &&
                        busquedaCorrecta
                    );
                }
            );
        }, [
            productos,
            categoriaActiva,
            busqueda,
        ]);

    return (
        <div className="w-full">

            {/* =====================================================
                HERO
            ===================================================== */}

            <section
                className="
                    relative
                    overflow-hidden
                    rounded-[30px]
                    bg-[#171717]
                    px-6
                    py-11
                    text-white

                    md:px-9
                    md:py-14
                "
            >
                {/* DETALLE DECORATIVO */}

                <div
                    className="
                        pointer-events-none
                        absolute
                        -right-24
                        -top-32
                        h-72
                        w-72
                        rounded-full
                        bg-[#ff6600]/10
                        blur-3xl
                    "
                />

                <div className="relative z-10">

                    <p
                        className="
                            text-[9px]
                            font-black
                            uppercase
                            tracking-[0.25em]
                            text-[#ff6600]
                        "
                    >
                        Tienda oficial Baruk593
                    </p>

                    <h1
                        className="
                            mt-4
                            text-4xl
                            font-black
                            tracking-[-0.045em]

                            md:text-5xl
                        "
                    >
                        Baruk Shop
                    </h1>

                    <p
                        className="
                            mt-4
                            max-w-2xl
                            text-sm
                            leading-6
                            text-white/65

                            md:text-base
                        "
                    >
                        Explora el catálogo
                        de productos
                        disponibles en
                        Baruk593 y encuentra
                        tus favoritos.
                    </p>

                </div>
            </section>

            {/* =====================================================
                CONTROLES
            ===================================================== */}

            <section
                className="
                    py-8
                    md:py-10
                "
            >

                <div
                    className="
                        flex
                        flex-col
                        gap-4

                        sm:flex-row
                        sm:items-center
                        sm:justify-between
                    "
                >

                    {/* BUSCADOR */}

                    <div
                        className="
                            relative
                            w-full

                            sm:max-w-sm
                        "
                    >
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            className="
                                absolute
                                left-4
                                top-1/2
                                h-4
                                w-4
                                -translate-y-1/2
                                text-slate-400
                            "
                            aria-hidden="true"
                        >
                            <circle
                                cx="11"
                                cy="11"
                                r="6"
                                stroke="currentColor"
                                strokeWidth="1.7"
                            />

                            <path
                                d="m16 16 4 4"
                                stroke="currentColor"
                                strokeWidth="1.7"
                                strokeLinecap="round"
                            />
                        </svg>

                        <input
                            type="search"
                            value={busqueda}
                            onChange={(event) =>
                                setBusqueda(
                                    event
                                        .target
                                        .value
                                )
                            }
                            placeholder="Buscar en Baruk Shop..."
                            className="
                                min-h-[48px]
                                w-full

                                rounded-xl

                                border
                                border-slate-200

                                bg-white

                                pl-11
                                pr-4

                                text-sm
                                text-[#171717]

                                outline-none

                                transition

                                placeholder:text-slate-400

                                focus:border-[#ff6600]
                                focus:ring-2
                                focus:ring-orange-100
                            "
                        />

                    </div>

                    <p
                        className="
                            text-xs
                            font-semibold
                            text-slate-400
                        "
                    >
                        {
                            productosFiltrados.length
                        }{" "}
                        {productosFiltrados.length ===
                            1
                            ? "producto"
                            : "productos"}
                    </p>

                </div>

                {/* CATEGORÍAS */}

                <div
                    className="
                        mt-4
                        flex
                        gap-2
                        overflow-x-auto
                        pb-2
                    "
                >
                    <button
                        type="button"
                        onClick={() =>
                            setCategoriaActiva(
                                "todos"
                            )
                        }
                        className={`
                            shrink-0
                            rounded-full
                            border
                            px-4
                            py-2
                            text-[10px]
                            font-black
                            transition

                            ${categoriaActiva ===
                                "todos"
                                ? "border-[#ff6600] bg-[#ff6600] text-white"
                                : "border-slate-200 bg-white text-slate-600 hover:border-orange-300 hover:text-[#ff6600]"
                            }
                        `}
                    >
                        Todos
                    </button>

                    {categorias.map(
                        (categoria) => (
                            <button
                                key={
                                    categoria.id
                                }
                                type="button"
                                onClick={() =>
                                    setCategoriaActiva(
                                        categoria.slug
                                    )
                                }
                                className={`
                                    shrink-0
                                    rounded-full
                                    border
                                    px-4
                                    py-2
                                    text-[10px]
                                    font-black
                                    transition

                                    ${categoriaActiva ===
                                        categoria.slug
                                        ? "border-[#ff6600] bg-[#ff6600] text-white"
                                        : "border-slate-200 bg-white text-slate-600 hover:border-orange-300 hover:text-[#ff6600]"
                                    }
                                `}
                            >
                                {
                                    categoria.nombre
                                }
                            </button>
                        )
                    )}
                </div>

            </section>

            {/* =====================================================
                CATÁLOGO
            ===================================================== */}

            <section className="pb-16">

                {/* LOADING */}

                {loading && (
                    <div
                        className="
                            grid
                            grid-cols-2
                            gap-x-3
                            gap-y-8

                            md:grid-cols-3
                            md:gap-x-5

                            lg:grid-cols-4
                        "
                    >
                        {[1, 2, 3, 4].map(
                            (item) => (
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

                                    <div className="mt-4 h-2 w-16 rounded bg-slate-100" />

                                    <div className="mt-3 h-4 w-3/4 rounded bg-slate-100" />

                                    <div className="mt-3 h-5 w-20 rounded bg-slate-100" />
                                </div>
                            )
                        )}
                    </div>
                )}

                {/* ERROR */}

                {!loading &&
                    error && (
                        <div
                            className="
                                rounded-[24px]
                                border
                                border-slate-200
                                bg-[#fafafa]
                                px-6
                                py-12
                                text-center
                            "
                        >
                            <p
                                className="
                                    text-sm
                                    font-black
                                    text-[#171717]
                                "
                            >
                                Baruk Shop no
                                está disponible
                                en este momento.
                            </p>

                            <p
                                className="
                                    mt-2
                                    text-xs
                                    text-slate-400
                                "
                            >
                                Intenta
                                nuevamente más
                                tarde.
                            </p>
                        </div>
                    )}

                {/* SIN RESULTADOS */}

                {!loading &&
                    !error &&
                    productosFiltrados.length ===
                    0 && (
                        <div
                            className="
                                rounded-[24px]
                                border
                                border-slate-200
                                bg-[#fafafa]
                                px-6
                                py-12
                                text-center
                            "
                        >
                            <p
                                className="
                                    text-sm
                                    font-black
                                    text-[#171717]
                                "
                            >
                                No encontramos
                                productos
                            </p>

                            <p
                                className="
                                    mt-2
                                    text-xs
                                    text-slate-400
                                "
                            >
                                Prueba con otra
                                categoría o
                                búsqueda.
                            </p>
                        </div>
                    )}

                {/* PRODUCTOS */}

                {!loading &&
                    !error &&
                    productosFiltrados.length >
                    0 && (
                        <div
                            className="
                                grid
                                grid-cols-2
                                gap-x-3
                                gap-y-8

                                md:grid-cols-3
                                md:gap-x-5

                                lg:grid-cols-4
                            "
                        >
                            {productosFiltrados.map(
                                (
                                    producto
                                ) => {
                                    const precio =
                                        Number(
                                            producto.precio
                                        );

                                    const precioAnterior =
                                        producto.precio_anterior !==
                                            null
                                            ? Number(
                                                producto.precio_anterior
                                            )
                                            : null;

                                    const agotado =
                                        Number(
                                            producto.stock
                                        ) <= 0;

                                    return (
                                        <article
                                            key={
                                                producto.id
                                            }
                                            className="group"
                                        >

                                            {/* IMAGEN */}

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

                                                    {/* BADGE */}

                                                    {(agotado ||
                                                        producto.etiqueta ||
                                                        producto.nuevo) && (
                                                            <div
                                                                className="
                                                                absolute
                                                                left-3
                                                                top-3
                                                                z-20
                                                            "
                                                            >
                                                                <span
                                                                    className={`
                                                                    rounded-full
                                                                    px-3
                                                                    py-1.5

                                                                    text-[8px]
                                                                    font-black
                                                                    uppercase
                                                                    tracking-[0.11em]

                                                                    shadow-sm

                                                                    ${agotado
                                                                            ? "bg-[#171717] text-white"
                                                                            : producto.nuevo &&
                                                                                !producto.etiqueta
                                                                                ? "bg-[#ff6600] text-white"
                                                                                : "border border-slate-100 bg-white text-[#171717]"
                                                                        }
                                                                `}
                                                                >
                                                                    {agotado
                                                                        ? "Agotado"
                                                                        : producto.etiqueta ??
                                                                        "Nuevo"}
                                                                </span>
                                                            </div>
                                                        )}

                                                    <ProductImage
                                                        src={
                                                            producto.imagen_principal
                                                        }
                                                        alt={
                                                            producto.nombre
                                                        }
                                                    />

                                                    {/* FLECHA */}

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

                                            {/* INFORMACIÓN */}

                                            <div className="px-1 pt-4">

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

                                                <Link
                                                    href={`/tienda/${producto.slug}`}
                                                >
                                                    <h2
                                                        className="
                                                            mt-1.5
                                                            line-clamp-2

                                                            text-sm
                                                            font-black
                                                            leading-5
                                                            text-[#171717]

                                                            transition

                                                            group-hover:text-[#ff6600]

                                                            md:text-base
                                                        "
                                                    >
                                                        {
                                                            producto.nombre
                                                        }
                                                    </h2>
                                                </Link>

                                                {producto.descripcion_corta && (
                                                    <p
                                                        className="
                                                            mt-1.5
                                                            hidden
                                                            line-clamp-2

                                                            text-xs
                                                            leading-5
                                                            text-slate-400

                                                            md:block
                                                        "
                                                    >
                                                        {textoBarukShop(
                                                            producto.descripcion_corta
                                                        )}
                                                    </p>
                                                )}

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

                                                    {precioAnterior !==
                                                        null &&
                                                        precioAnterior >
                                                        precio && (
                                                            <p
                                                                className="
                                                                    text-[10px]
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
                                                        )}
                                                </div>

                                                <Link
                                                    href={`/tienda/${producto.slug}`}
                                                    className="
                                                        mt-3
                                                        inline-flex
                                                        items-center
                                                        gap-1.5

                                                        text-[10px]
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

                                            </div>

                                        </article>
                                    );
                                }
                            )}
                        </div>
                    )}

            </section>

        </div>
    );
}