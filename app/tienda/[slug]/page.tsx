"use client";

import {
    useEffect,
    useMemo,
    useState,
} from "react";

import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useBarukCart } from "@/components/baruk/shop/BarukCartProvider";
import {
    getBarukShopImageUrl,
} from "@/lib/barukShopImage";

type ImagenProducto = {
    id: string;
    image_url: string;
    alt_text: string | null;
    orden: number;
};

type Producto = {
    id: string;

    nombre: string;
    slug: string;

    descripcion: string | null;
    descripcion_corta: string | null;

    precio: number | string;
    precio_anterior:
    | number
    | string
    | null;

    stock: number;

    sku: string | null;

    imagen_principal:
    | string
    | null;

    etiqueta: string | null;

    nuevo: boolean;

    store_categories: {
        nombre: string;
        slug: string;
    } | null;

    store_product_images:
    ImagenProducto[];
};

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
   PLACEHOLDER GRANDE
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
                p-8
            "
        >
            <div className="text-center">

                <div
                    className="
                        mx-auto
                        flex
                        h-28
                        w-28
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
                        className="
                            h-11
                            w-11
                            text-slate-300
                        "
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
                        mt-5
                        text-[10px]
                        font-black
                        uppercase
                        tracking-[0.18em]
                        text-slate-400
                    "
                >
                    Baruk Shop
                </p>

                <p
                    className="
                        mt-1
                        text-xs
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
   PÁGINA
============================================================ */

export default function ProductoPage() {
    const {
        agregarProducto,
        totalItems,
    } = useBarukCart();

    const [cantidad, setCantidad] = useState(1);
    const [agregado, setAgregado] = useState(false);

    const params =
        useParams();

    const slugParam =
        params.slug;

    const slug =
        Array.isArray(slugParam)
            ? slugParam[0]
            : String(
                slugParam ?? ""
            );

    const [
        producto,
        setProducto,
    ] =
        useState<Producto | null>(
            null
        );

    const [
        imagenActiva,
        setImagenActiva,
    ] =
        useState<string | null>(
            null
        );

    const [
        imagenError,
        setImagenError,
    ] = useState(false);

    const [
        loading,
        setLoading,
    ] = useState(true);

    const [
        error,
        setError,
    ] =
        useState<string | null>(
            null
        );

    /* ============================================================
       CARGAR PRODUCTO
    ============================================================ */

    useEffect(() => {
        if (!slug) {
            return;
        }

        const cargarProducto =
            async () => {
                try {
                    setLoading(true);
                    setError(null);

                    const {
                        data,
                        error:
                        productoError,
                    } =
                        await supabase
                            .from(
                                "store_products"
                            )
                            .select(`
                                id,
                                nombre,
                                slug,
                                descripcion,
                                descripcion_corta,
                                precio,
                                precio_anterior,
                                stock,
                                sku,
                                imagen_principal,
                                etiqueta,
                                nuevo,

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
                                "slug",
                                slug
                            )
                            .eq(
                                "activo",
                                true
                            )
                            .maybeSingle();

                    if (
                        productoError
                    ) {
                        throw productoError;
                    }

                    if (!data) {
                        setProducto(
                            null
                        );

                        return;
                    }

                    const productoData =
                        data as unknown as Producto;

                    productoData.store_product_images =
                        (
                            productoData.store_product_images ??
                            []
                        ).sort(
                            (
                                a,
                                b
                            ) =>
                                a.orden -
                                b.orden
                        );

                    setProducto(
                        productoData
                    );

                    const primeraImagenRaw =
                        productoData.imagen_principal ??
                        productoData
                            .store_product_images?.[0]
                            ?.image_url ??
                        null;

                    const primeraImagen =
                        getBarukShopImageUrl(
                            primeraImagenRaw
                        );

                    setImagenActiva(
                        primeraImagen
                    );

                    setImagenError(
                        false
                    );
                } catch (err) {
                    console.error(
                        "Error cargando producto:",
                        err
                    );

                    setError(
                        "No pudimos cargar este producto."
                    );
                } finally {
                    setLoading(
                        false
                    );
                }
            };

        cargarProducto();
    }, [slug]);

    /* ============================================================
       RESETEAR ERROR AL CAMBIAR IMAGEN
    ============================================================ */

    useEffect(() => {
        setImagenError(false);
    }, [imagenActiva]);

    /* ============================================================
       GALERÍA
    ============================================================ */

    const imagenes =
        useMemo(() => {

            if (!producto) {
                return [];
            }

            const lista: {
                url: string;
                alt: string;
            }[] = [];


            /* =========================================
               IMAGEN PRINCIPAL
            ========================================= */

            const principal =
                getBarukShopImageUrl(
                    producto.imagen_principal
                );


            if (principal) {

                lista.push({
                    url:
                        principal,

                    alt:
                        producto.nombre,
                });
            }


            /* =========================================
               GALERÍA
            ========================================= */

            for (
                const imagen of
                producto.store_product_images ??
                []
            ) {

                const url =
                    getBarukShopImageUrl(
                        imagen.image_url
                    );


                if (!url) {
                    continue;
                }


                if (
                    lista.some(
                        (
                            item
                        ) =>
                            item.url ===
                            url
                    )
                ) {
                    continue;
                }


                lista.push({
                    url,

                    alt:
                        imagen.alt_text ??
                        producto.nombre,
                });
            }


            return lista;

        }, [
            producto,
        ]);

    /* ============================================================
       LOADING
    ============================================================ */

    if (loading) {
        return (
            <div className="w-full py-6">

                <div
                    className="
                        grid
                        animate-pulse
                        gap-10

                        lg:grid-cols-2
                    "
                >
                    <div
                        className="
                            aspect-square
                            rounded-[30px]
                            bg-slate-100
                        "
                    />

                    <div className="lg:pt-6">

                        <div className="h-3 w-24 rounded bg-slate-100" />

                        <div className="mt-5 h-10 w-3/4 rounded bg-slate-100" />

                        <div className="mt-5 h-8 w-32 rounded bg-slate-100" />

                        <div className="mt-8 h-20 rounded bg-slate-100" />

                        <div className="mt-8 h-14 rounded-2xl bg-slate-100" />

                    </div>
                </div>

            </div>
        );
    }

    /* ============================================================
       ERROR / NO EXISTE
    ============================================================ */

    if (
        error ||
        !producto
    ) {
        return (
            <div
                className="
                    flex
                    min-h-[55vh]
                    items-center
                    justify-center
                "
            >
                <div className="text-center">

                    <p
                        className="
                            text-2xl
                            font-black
                            text-[#171717]
                        "
                    >
                        Producto no disponible
                    </p>

                    <p
                        className="
                            mt-2
                            text-sm
                            text-slate-500
                        "
                    >
                        No encontramos el
                        producto que estás
                        buscando.
                    </p>

                    <Link
                        href="/tienda"
                        className="
                            mt-6
                            inline-flex
                            rounded-xl
                            bg-[#ff6600]
                            px-5
                            py-3
                            text-sm
                            font-black
                            text-white
                            transition
                            hover:bg-[#e65c00]
                        "
                    >
                        Volver a Baruk Shop
                    </Link>

                </div>
            </div>
        );
    }

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

    const aumentarCantidad = () => {
        setCantidad((actual) =>
            Math.min(
                actual + 1,
                Number(producto.stock)
            )
        );
    };

    const disminuirCantidad = () => {
        setCantidad((actual) =>
            Math.max(
                actual - 1,
                1
            )
        );
    };

    const agregarAlCarrito = () => {
        if (agotado) return;

        agregarProducto(
            {
                id: producto.id,
                nombre: producto.nombre,
                slug: producto.slug,
                precio: Number(producto.precio),
                stock: Number(producto.stock),
                imagen:
                    getBarukShopImageUrl(
                        producto.imagen_principal
                    ),
                sku: producto.sku,
            },
            cantidad
        );

        setAgregado(true);

        window.setTimeout(() => {
            setAgregado(false);
        }, 1800);
    };

    return (
        <div className="w-full">

            {/* =====================================================
                BREADCRUMB
            ===================================================== */}

            <nav
                className="
                    flex
                    items-center
                    gap-2
                    overflow-hidden
                    py-5

                    text-[11px]
                    font-semibold
                    text-slate-400
                "
            >
                <Link
                    href="/"
                    className="
                        shrink-0
                        transition
                        hover:text-[#ff6600]
                    "
                >
                    Inicio
                </Link>

                <span>/</span>

                <Link
                    href="/tienda"
                    className="
                        shrink-0
                        transition
                        hover:text-[#ff6600]
                    "
                >
                    Baruk Shop
                </Link>

                <span>/</span>

                <span
                    className="
                        truncate
                        text-slate-600
                    "
                >
                    {producto.nombre}
                </span>
            </nav>

            {/* =====================================================
                PRODUCTO
            ===================================================== */}

            <section
                className="
                    grid
                    gap-8
                    pb-14

                    lg:grid-cols-[1.05fr_0.95fr]
                    lg:gap-12
                "
            >

                {/* =================================================
                    GALERÍA
                ================================================= */}

                <div>

                    <div
                        className="
                            relative
                            flex
                            aspect-square
                            items-center
                            justify-center
                            overflow-hidden

                            rounded-[30px]

                            border
                            border-slate-200

                            bg-[#f7f7f7]
                        "
                    >

                        {/* BADGE */}

                        {(agotado ||
                            producto.etiqueta ||
                            producto.nuevo) && (
                                <div
                                    className="
                                    absolute
                                    left-4
                                    top-4
                                    z-30
                                "
                                >
                                    <span
                                        className={`
                                        rounded-full

                                        px-4
                                        py-2

                                        text-[9px]
                                        font-black
                                        uppercase
                                        tracking-[0.13em]

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

                        {/* PLACEHOLDER */}

                        <ProductPlaceholder />

                        {/* IMAGEN */}

                        {imagenActiva &&
                            !imagenError && (
                                <img
                                    src={
                                        imagenActiva
                                    }
                                    alt={
                                        producto.nombre
                                    }
                                    onError={() =>
                                        setImagenError(
                                            true
                                        )
                                    }
                                    className="
                                        relative
                                        z-10

                                        h-full
                                        w-full

                                        object-contain

                                        p-8

                                        md:p-10
                                    "
                                />
                            )}

                    </div>

                    {/* MINIATURAS */}

                    {imagenes.length >
                        1 && (
                            <div
                                className="
                                mt-4
                                flex
                                gap-3
                                overflow-x-auto
                                pb-2
                            "
                            >
                                {imagenes.map(
                                    (
                                        imagen,
                                        index
                                    ) => {
                                        const activa =
                                            imagenActiva ===
                                            imagen.url;

                                        return (
                                            <button
                                                key={`${imagen.url}-${index}`}
                                                type="button"
                                                onClick={() => {
                                                    setImagenActiva(
                                                        imagen.url
                                                    );

                                                    setImagenError(
                                                        false
                                                    );
                                                }}
                                                className={`
                                                flex
                                                h-20
                                                w-20
                                                shrink-0
                                                items-center
                                                justify-center

                                                overflow-hidden

                                                rounded-2xl

                                                border

                                                bg-[#f7f7f7]

                                                transition

                                                ${activa
                                                        ? "border-[#ff6600] ring-2 ring-orange-100"
                                                        : "border-slate-200 hover:border-orange-300"
                                                    }
                                            `}
                                            >
                                                <img
                                                    src={
                                                        imagen.url
                                                    }
                                                    alt={
                                                        imagen.alt
                                                    }
                                                    className="
                                                    h-full
                                                    w-full
                                                    object-contain
                                                    p-2
                                                "
                                                    onError={(
                                                        event
                                                    ) => {
                                                        event.currentTarget.style.display =
                                                            "none";
                                                    }}
                                                />
                                            </button>
                                        );
                                    }
                                )}
                            </div>
                        )}

                </div>

                {/* =================================================
                    INFORMACIÓN
                ================================================= */}

                <div className="lg:pt-5">

                    {/* CATEGORÍA */}

                    <p
                        className="
                            text-[10px]
                            font-black
                            uppercase
                            tracking-[0.20em]
                            text-[#ff6600]
                        "
                    >
                        {producto
                            .store_categories
                            ?.nombre ??
                            "Baruk Shop"}
                    </p>

                    {/* NOMBRE */}

                    <h1
                        className="
                            mt-3

                            text-3xl
                            font-black
                            tracking-[-0.04em]
                            text-[#171717]

                            md:text-4xl
                        "
                    >
                        {producto.nombre}
                    </h1>

                    {/* PRECIO */}

                    <div
                        className="
                            mt-6
                            flex
                            flex-wrap
                            items-end
                            gap-3
                        "
                    >
                        <p
                            className="
                                text-3xl
                                font-black
                                tracking-[-0.04em]
                                text-[#171717]

                                md:text-4xl
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
                                        pb-1
                                        text-sm
                                        font-bold
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

                    {/* DISPONIBILIDAD */}

                    <div
                        className="
                            mt-5
                            inline-flex
                            items-center
                            gap-2
                        "
                    >
                        <span
                            className={`
                                h-2
                                w-2
                                rounded-full

                                ${agotado
                                    ? "bg-slate-400"
                                    : "bg-emerald-500"
                                }
                            `}
                        />

                        <p
                            className={`
                                text-xs
                                font-black

                                ${agotado
                                    ? "text-slate-400"
                                    : "text-emerald-600"
                                }
                            `}
                        >
                            {agotado
                                ? "Producto agotado"
                                : "Disponible"}
                        </p>
                    </div>

                    {/* DESCRIPCIÓN */}

                    {producto.descripcion_corta && (
                        <p
                            className="
                                mt-7
                                max-w-xl
                                text-sm
                                leading-7
                                text-slate-500

                                md:text-base
                            "
                        >
                            {textoBarukShop(
                                producto.descripcion_corta
                            )}
                        </p>
                    )}

                    {/* SEPARADOR */}

                    <div
                        className="
                            mt-8
                            border-t
                            border-slate-200
                            pt-7
                        "
                    >

                        {/* FUTURA COMPRA */}

                        <div className="space-y-4">

                            {!agotado && (
                                <div
                                    className="
                flex
                items-center
                justify-between
                gap-4
            "
                                >
                                    <div>
                                        <p className="text-xs font-black text-[#171717]">
                                            Cantidad
                                        </p>

                                        <p className="mt-1 text-[10px] text-slate-400">
                                            {producto.stock} disponibles
                                        </p>
                                    </div>

                                    <div
                                        className="
                    flex
                    items-center
                    overflow-hidden
                    rounded-xl
                    border
                    border-slate-200
                    bg-white
                "
                                    >
                                        <button
                                            type="button"
                                            onClick={disminuirCantidad}
                                            disabled={cantidad <= 1}
                                            className="
                        flex
                        h-11
                        w-11
                        items-center
                        justify-center
                        text-lg
                        font-bold
                        text-[#171717]
                        transition
                        hover:bg-slate-50
                        disabled:cursor-not-allowed
                        disabled:text-slate-300
                    "
                                        >
                                            −
                                        </button>

                                        <div
                                            className="
                        flex
                        h-11
                        min-w-[48px]
                        items-center
                        justify-center
                        border-x
                        border-slate-200
                        text-sm
                        font-black
                        text-[#171717]
                    "
                                        >
                                            {cantidad}
                                        </div>

                                        <button
                                            type="button"
                                            onClick={aumentarCantidad}
                                            disabled={
                                                cantidad >= Number(producto.stock)
                                            }
                                            className="
                        flex
                        h-11
                        w-11
                        items-center
                        justify-center
                        text-lg
                        font-bold
                        text-[#171717]
                        transition
                        hover:bg-slate-50
                        disabled:cursor-not-allowed
                        disabled:text-slate-300
                    "
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={agregarAlCarrito}
                                disabled={agotado}
                                className={`
            min-h-[54px]
            w-full
            rounded-2xl
            px-6
            text-sm
            font-black
            transition

            ${agotado
                                        ? "cursor-not-allowed bg-slate-200 text-slate-400"
                                        : agregado
                                            ? "bg-emerald-500 text-white"
                                            : "bg-[#ff6600] text-white hover:bg-[#e85d00]"
                                    }
        `}
                            >
                                {agotado
                                    ? "Producto agotado"
                                    : agregado
                                        ? "✓ Agregado al carrito"
                                        : `Agregar al carrito · $${(
                                            precio * cantidad
                                        ).toFixed(2)}`}
                            </button>

                            {!agotado && (
                                <Link
                                    href="/tienda/carrito"
                                    className="
                flex
                min-h-[48px]
                w-full
                items-center
                justify-center
                rounded-2xl
                border
                border-slate-200
                bg-white
                px-6
                text-sm
                font-black
                text-[#171717]
                transition
                hover:border-[#ff6600]
                hover:text-[#ff6600]
            "
                                >
                                    Ver carrito
                                    {totalItems > 0 && (
                                        <span
                                            className="
                        ml-2
                        rounded-full
                        bg-[#171717]
                        px-2
                        py-0.5
                        text-[10px]
                        text-white
                    "
                                        >
                                            {totalItems}
                                        </span>
                                    )}
                                </Link>
                            )}

                        </div>

                    </div>

                    {/* INFORMACIÓN */}

                    <div
                        className="
                            mt-7
                            grid
                            grid-cols-2
                            gap-3
                        "
                    >

                        <div
                            className="
                                rounded-2xl
                                border
                                border-slate-200
                                bg-[#fafafa]
                                p-4
                            "
                        >
                            <p
                                className="
                                    text-[9px]
                                    font-black
                                    uppercase
                                    tracking-[0.16em]
                                    text-slate-400
                                "
                            >
                                Pago
                            </p>

                            <p
                                className="
                                    mt-1.5
                                    text-xs
                                    font-black
                                    text-[#171717]
                                "
                            >
                                Compra segura
                            </p>
                        </div>

                        <div
                            className="
                                rounded-2xl
                                border
                                border-slate-200
                                bg-[#fafafa]
                                p-4
                            "
                        >
                            <p
                                className="
                                    text-[9px]
                                    font-black
                                    uppercase
                                    tracking-[0.16em]
                                    text-slate-400
                                "
                            >
                                Tienda
                            </p>

                            <p
                                className="
                                    mt-1.5
                                    text-xs
                                    font-black
                                    text-[#171717]
                                "
                            >
                                Baruk Shop
                            </p>
                        </div>

                    </div>

                    {/* SKU */}

                    {producto.sku && (
                        <p
                            className="
                                mt-5
                                text-[10px]
                                font-semibold
                                text-slate-400
                            "
                        >
                            SKU:{" "}
                            {producto.sku}
                        </p>
                    )}

                </div>

            </section>

            {/* =====================================================
                DESCRIPCIÓN COMPLETA
            ===================================================== */}

            {producto.descripcion && (
                <section
                    className="
                        border-t
                        border-slate-200
                        py-10

                        md:py-14
                    "
                >
                    <p
                        className="
                            text-[10px]
                            font-black
                            uppercase
                            tracking-[0.20em]
                            text-[#ff6600]
                        "
                    >
                        Detalles
                    </p>

                    <h2
                        className="
                            mt-2
                            text-2xl
                            font-black
                            tracking-[-0.03em]
                            text-[#171717]
                        "
                    >
                        Acerca del producto
                    </h2>

                    <p
                        className="
                            mt-5
                            max-w-3xl

                            whitespace-pre-line

                            text-sm
                            leading-7
                            text-slate-500
                        "
                    >
                        {textoBarukShop(
                            producto.descripcion
                        )}
                    </p>
                </section>
            )}

        </div>
    );
}