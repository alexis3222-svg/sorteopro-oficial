"use client";

import {
    useEffect,
    useState,
} from "react";

import Link from "next/link";

import {
    supabase,
} from "@/lib/supabaseClient";

import {
    getBarukShopImageUrl,
} from "@/lib/barukShopImage";


type Categoria = {
    nombre: string;
    slug: string;
};


type Producto = {
    id: string;

    nombre: string;
    slug: string;

    descripcion_corta:
    | string
    | null;

    precio:
    | number
    | string;

    precio_anterior:
    | number
    | string
    | null;

    stock: number;

    imagen_principal:
    | string
    | null;

    etiqueta:
    | string
    | null;

    nuevo: boolean;
    tendencia: boolean;
    destacado: boolean;

    orden: number;

    store_categories:
    | Categoria
    | null;
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

                bg-[#f7f7f7]

                p-6
            "
        >
            <div className="text-center">

                <div
                    className="
                        mx-auto

                        flex
                        h-16
                        w-16
                        items-center
                        justify-center

                        rounded-2xl

                        border
                        border-slate-200

                        bg-white

                        text-slate-300

                        shadow-sm
                    "
                >
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        className="h-7 w-7"
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
                        mt-3

                        text-[8px]
                        font-black
                        uppercase
                        tracking-[0.16em]
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
    const [
        productos,
        setProductos,
    ] =
        useState<Producto[]>(
            []
        );

    const [
        loading,
        setLoading,
    ] =
        useState(true);

    const [
        error,
        setError,
    ] =
        useState<
            string | null
        >(null);


    /* ============================================================
       CARGAR PRODUCTOS
    ============================================================ */

    useEffect(() => {
        const cargarProductos =
            async () => {
                try {
                    setLoading(
                        true
                    );

                    setError(
                        null
                    );

                    const {
                        data,
                        error:
                        productosError,
                    } =
                        await supabase
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
                                    nombre,
                                    slug
                                )
                            `)
                            .eq(
                                "activo",
                                true
                            )
                            .eq(
                                "destacado",
                                true
                            )
                            .order(
                                "orden",
                                {
                                    ascending:
                                        true,
                                }
                            )
                            .limit(
                                4
                            );


                    if (
                        productosError
                    ) {
                        throw productosError;
                    }


                    setProductos(
                        (
                            data ??
                            []
                        ) as unknown as Producto[]
                    );

                } catch (
                err
                ) {
                    console.error(
                        "Error cargando Baruk Shop:",
                        err
                    );

                    setError(
                        "No pudimos cargar los productos de Baruk Shop."
                    );

                } finally {
                    setLoading(
                        false
                    );
                }
            };


        void cargarProductos();

    }, []);


    /* ============================================================
       RENDER
    ============================================================ */

    return (
        <section
            id="baruk-shop"
            className="
        scroll-mt-24
        w-full
        bg-white
        py-14
        md:py-16
    "
        >
            <div
                className="
                    mx-auto
                    w-full
                    max-w-7xl

                    px-5

                    sm:px-6
                "
            >

                {/* =================================================
                    HEADER
                ================================================= */}

                <div
                    className="
                        flex
                        flex-col
                        gap-5

                        md:flex-row
                        md:items-end
                        md:justify-between
                    "
                >
                    <div>

                        <div
                            className="
                                flex
                                items-center
                                gap-3
                            "
                        >
                            <span
                                className="
                                    h-[2px]
                                    w-7
                                    bg-[#C1317F]
                                "
                            />

                            <p
                                className="
                                    text-[9px]
                                    font-black
                                    uppercase
                                    tracking-[0.22em]
                                    text-[#C1317F]
                                "
                            >
                                Equipamiento
                            </p>
                        </div>


                        <h2
                            className="
                                mt-3

                                text-3xl
                                font-black
                                tracking-[-0.045em]
                                text-[#171717]

                                md:text-[38px]
                            "
                        >
                            Baruk Shop
                        </h2>


                        <p
                            className="
                                mt-2

                                max-w-xl

                                text-[13px]
                                leading-6
                                text-slate-500

                                md:text-sm
                            "
                        >
                            Encuentra productos seleccionados
                            para acompañarte dentro y fuera de
                            la ruta.
                        </p>

                    </div>


                    <Link
                        href="/tienda"
                        className="
                            group

                            hidden
                            items-center
                            gap-2

                            text-xs
                            font-black
                            text-[#171717]

                            transition-colors

                            hover:text-[#C1317F]

                            md:flex
                        "
                    >
                        Explorar tienda

                        <span
                            className="
                                transition-transform

                                group-hover:translate-x-1
                            "
                        >
                            →
                        </span>
                    </Link>

                </div>


                {/* =================================================
                    LOADING
                ================================================= */}

                {loading && (
                    <div
                        className="
                            mt-8

                            grid
                            grid-cols-2
                            gap-3

                            lg:grid-cols-4
                            lg:gap-5
                        "
                    >
                        {[1, 2, 3, 4].map(
                            (
                                item
                            ) => (
                                <div
                                    key={
                                        item
                                    }
                                    className="
                                        animate-pulse
                                    "
                                >
                                    <div
                                        className="
                                            aspect-[4/5]

                                            rounded-[22px]

                                            bg-slate-200/70
                                        "
                                    />

                                    <div
                                        className="
                                            mt-4
                                            h-2
                                            w-14
                                            rounded
                                            bg-slate-200
                                        "
                                    />

                                    <div
                                        className="
                                            mt-3
                                            h-4
                                            w-3/4
                                            rounded
                                            bg-slate-200
                                        "
                                    />

                                    <div
                                        className="
                                            mt-3
                                            h-5
                                            w-20
                                            rounded
                                            bg-slate-200
                                        "
                                    />
                                </div>
                            )
                        )}
                    </div>
                )}


                {/* =================================================
                    ERROR
                ================================================= */}

                {!loading &&
                    error && (
                        <div
                            className="
                                mt-8

                                rounded-[20px]

                                border
                                border-slate-200

                                bg-white

                                px-6
                                py-10

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
                                Baruk Shop no está disponible
                                en este momento.
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


                {/* =================================================
                    SIN PRODUCTOS
                ================================================= */}

                {!loading &&
                    !error &&
                    productos.length ===
                    0 && (
                        <div
                            className="
                                mt-8

                                rounded-[20px]

                                border
                                border-slate-200

                                bg-white

                                px-6
                                py-10

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
                                Próximamente nuevos productos
                            </p>

                            <p
                                className="
                                    mt-1
                                    text-xs
                                    text-slate-400
                                "
                            >
                                Estamos preparando novedades
                                para Baruk Shop.
                            </p>
                        </div>
                    )}


                {/* =================================================
                    PRODUCTOS
                ================================================= */}

                {!loading &&
                    !error &&
                    productos.length >
                    0 && (
                        <div
                            className="
                                mt-8

                                grid
                                grid-cols-2

                                gap-x-3
                                gap-y-7

                                md:gap-x-5

                                lg:grid-cols-4
                            "
                        >
                            {productos.map(
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
                                        ) <=
                                        0;


                                    const imagenUrl =
                                        getBarukShopImageUrl(
                                            producto.imagen_principal
                                        );


                                    return (
                                        <article
                                            key={
                                                producto.id
                                            }
                                            className="
                                                group
                                            "
                                        >

                                            {/* =================================
                                                IMAGEN
                                            ================================= */}

                                            <Link
                                                href={`/tienda/${producto.slug}`}
                                                aria-label={`Ver ${producto.nombre}`}
                                                className="
                                                    block
                                                "
                                            >
                                                <div
                                                    className="
        relative
        aspect-[4/5]
        overflow-hidden

        rounded-[22px]

        border
        border-slate-200/80

        bg-white

        shadow-[0_8px_22px_rgba(0,0,0,0.20)]

        transition-all
        duration-300
        ease-out

        group-hover:-translate-y-[3px]

        group-hover:border-[#C1317F]/30

        group-hover:shadow-[0_9px_30px_rgba(193,49,127,0.42)]
    "
                                                >




                                                    {/* =========================
                                                        ESTADO / ETIQUETA
                                                    ========================= */}

                                                    <div
                                                        className="
                                                            absolute
                                                            left-3
                                                            top-3
                                                            z-30
                                                        "
                                                    >
                                                        {agotado ? (
                                                            <span
                                                                className="
                                                                    rounded-full

                                                                    bg-[#171717]

                                                                    px-2.5
                                                                    py-1.5

                                                                    text-[8px]
                                                                    font-black
                                                                    uppercase
                                                                    tracking-[0.10em]
                                                                    text-white
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

                                                                    px-2.5
                                                                    py-1.5

                                                                    text-[8px]
                                                                    font-black
                                                                    uppercase
                                                                    tracking-[0.10em]
                                                                    text-[#171717]

                                                                    shadow-sm
                                                                "
                                                            >
                                                                {
                                                                    producto.etiqueta
                                                                }
                                                            </span>
                                                        ) : producto.nuevo ? (
                                                            <span
                                                                className="
                                                                    rounded-full

                                                                    bg-[#C1317F]

                                                                    px-2.5
                                                                    py-1.5

                                                                    text-[8px]
                                                                    font-black
                                                                    uppercase
                                                                    tracking-[0.10em]
                                                                    text-white

                                                                    shadow-sm
                                                                "
                                                            >
                                                                Nuevo
                                                            </span>
                                                        ) : null}
                                                    </div>


                                                    {/* =========================
                                                        PLACEHOLDER
                                                    ========================= */}

                                                    <ProductPlaceholder />


                                                    {/* =========================
                                                        IMAGEN REAL
                                                    ========================= */}

                                                    {imagenUrl && (
                                                        <img
                                                            src={
                                                                imagenUrl
                                                            }
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

                                                                group-hover:scale-[1.055]
                                                            "
                                                            onError={(
                                                                event
                                                            ) => {
                                                                event.currentTarget.style.display =
                                                                    "none";
                                                            }}
                                                        />
                                                    )}


                                                    {/* =========================
                                                        FLECHA
                                                    ========================= */}

                                                    <div
                                                        className="
                                                            absolute
                                                            bottom-4
                                                            right-4
                                                            z-30

                                                            flex
                                                            h-9
                                                            w-9

                                                            translate-y-2

                                                            items-center
                                                            justify-center

                                                            rounded-full

                                                            bg-white

                                                            text-sm
                                                            font-black
                                                            text-[#171717]

                                                            opacity-0

                                                            shadow-[0_8px_20px_rgba(0,0,0,0.14)]

                                                            transition-all
                                                            duration-300

                                                            group-hover:translate-y-0
                                                            group-hover:opacity-100
                                                            group-hover:text-[#C1317F]
                                                        "
                                                    >
                                                        →
                                                    </div>

                                                </div>
                                            </Link>


                                            {/* =================================
                                                INFO
                                            ================================= */}

                                            <div
                                                className="
                                                    px-1
                                                    pt-4
                                                "
                                            >

                                                {/* CATEGORÍA */}

                                                <p
                                                    className="
                                                        text-[8px]
                                                        font-black
                                                        uppercase
                                                        tracking-[0.18em]
                                                        text-[#C1317F]
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

                                                            group-hover:text-[#C1317F]

                                                            md:text-base
                                                        "
                                                    >
                                                        {
                                                            producto.nombre
                                                        }
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


                                                    {precioAnterior !==
                                                        null &&
                                                        precioAnterior >
                                                        precio && (
                                                            <>
                                                                <p
                                                                    className="
                                                                        text-[11px]
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

                                                                        bg-[#C1317F]/10

                                                                        px-2
                                                                        py-1

                                                                        text-[7px]
                                                                        font-black
                                                                        uppercase
                                                                        text-[#C1317F]
                                                                    "
                                                                >
                                                                    Oferta
                                                                </span>
                                                            </>
                                                        )}
                                                </div>


                                                {/* CTA */}

                                                <Link
                                                    href={`/tienda/${producto.slug}`}
                                                    className="
                                                        mt-3

                                                        inline-flex
                                                        items-center
                                                        gap-1.5

                                                        text-[10px]
                                                        font-black
                                                        text-[#171717]

                                                        transition-all

                                                        hover:gap-2.5
                                                        hover:text-[#C1317F]
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


                {/* =================================================
                    CTA MÓVIL
                ================================================= */}

                {!loading &&
                    !error &&
                    productos.length >
                    0 && (
                        <Link
                            href="/tienda"
                            className="
                                mt-8

                                flex
                                min-h-[48px]
                                w-full
                                items-center
                                justify-center

                                rounded-xl

                                bg-[#171717]

                                text-xs
                                font-black
                                text-white

                                transition-colors

                                hover:bg-[#C1317F]

                                md:hidden
                            "
                        >
                            Explorar Baruk Shop
                        </Link>
                    )}

            </div>
        </section>
    );
}