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

    sku: string | null;

    imagen_principal: string | null;

    activo: boolean;

    destacado: boolean;
    tendencia: boolean;
    nuevo: boolean;

    etiqueta: string | null;

    orden: number;

    created_at: string | null;
    updated_at: string | null;

    store_categories: Categoria | null;
};

function ProductImage({
    path,
    nombre,
}: {
    path: string | null;
    nombre: string;
}) {
    const [errorImagen, setErrorImagen] =
        useState(false);

    const url =
        getBarukShopImageUrl(path);

    useEffect(() => {
        setErrorImagen(false);
    }, [path]);

    if (!url || errorImagen) {
        return (
            <div
                className="
                    flex
                    h-full
                    w-full
                    items-center
                    justify-center
                    bg-slate-900
                "
            >
                <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-6 w-6 text-slate-600"
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
                </svg>
            </div>
        );
    }

    return (
        <img
            src={url}
            alt={nombre}
            onError={() =>
                setErrorImagen(true)
            }
            className="
                h-full
                w-full
                object-contain
                p-1
            "
        />
    );
}

export default function AdminBarukShopPage() {
    const [
        productos,
        setProductos,
    ] = useState<Producto[]>([]);

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

    const [
        busqueda,
        setBusqueda,
    ] = useState("");

    /* ============================================================
       CARGAR PRODUCTOS
    ============================================================ */

    useEffect(() => {
        const cargarProductos =
            async () => {
                try {
                    setLoading(true);
                    setError(null);

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
                                sku,
                                imagen_principal,
                                activo,
                                destacado,
                                tendencia,
                                nuevo,
                                etiqueta,
                                orden,
                                created_at,
                                updated_at,

                                store_categories (
                                    id,
                                    nombre,
                                    slug
                                )
                            `)
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
                        throw productosError;
                    }

                    setProductos(
                        (data ??
                            []) as unknown as Producto[]
                    );

                } catch (err) {
                    console.error(
                        "Error cargando Baruk Shop:",
                        err
                    );

                    setError(
                        "No se pudieron cargar los productos de Baruk Shop."
                    );

                } finally {
                    setLoading(
                        false
                    );
                }
            };

        cargarProductos();
    }, []);

    /* ============================================================
       ESTADÍSTICAS
    ============================================================ */

    const stats =
        useMemo(() => {
            const total =
                productos.length;

            const activos =
                productos.filter(
                    (producto) =>
                        producto.activo
                ).length;

            const destacados =
                productos.filter(
                    (producto) =>
                        producto.destacado
                ).length;

            const agotados =
                productos.filter(
                    (producto) =>
                        Number(
                            producto.stock
                        ) <= 0
                ).length;

            const unidades =
                productos.reduce(
                    (
                        totalStock,
                        producto
                    ) =>
                        totalStock +
                        Number(
                            producto.stock ??
                            0
                        ),
                    0
                );

            return {
                total,
                activos,
                destacados,
                agotados,
                unidades,
            };
        }, [productos]);

    /* ============================================================
       FILTRAR
    ============================================================ */

    const productosFiltrados =
        useMemo(() => {
            const termino =
                busqueda
                    .trim()
                    .toLowerCase();

            if (!termino) {
                return productos;
            }

            return productos.filter(
                (producto) => {
                    return (
                        producto.nombre
                            .toLowerCase()
                            .includes(
                                termino
                            ) ||
                        producto.slug
                            .toLowerCase()
                            .includes(
                                termino
                            ) ||
                        producto.sku
                            ?.toLowerCase()
                            .includes(
                                termino
                            ) ||
                        producto
                            .store_categories
                            ?.nombre
                            .toLowerCase()
                            .includes(
                                termino
                            )
                    );
                }
            );
        }, [
            productos,
            busqueda,
        ]);

    return (
        <main
            className="
                min-h-screen
                bg-[#050608]
                text-slate-50
            "
        >
            <div
                className="
                    mx-auto
                    max-w-6xl
                    space-y-8
                    px-4
                    py-8

                    md:py-12
                "
            >

                {/* =================================================
                    HEADER
                ================================================= */}

                <header>
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

                            <Link
                                href="/admin"
                                className="
                                    text-xs
                                    font-semibold
                                    text-slate-400

                                    transition

                                    hover:text-orange-300
                                "
                            >
                                ← Panel administrativo
                            </Link>

                            <p
                                className="
                                    mt-6

                                    text-xs
                                    font-semibold
                                    uppercase
                                    tracking-[0.2em]
                                    text-orange-400
                                "
                            >
                                Baruk593 • Admin
                            </p>

                            <h1
                                className="
                                    mt-2

                                    text-3xl
                                    font-extrabold
                                    tracking-wide

                                    md:text-4xl
                                "
                            >
                                Baruk Shop
                            </h1>

                            <p
                                className="
                                    mt-3
                                    max-w-2xl

                                    text-sm
                                    leading-6
                                    text-slate-400
                                "
                            >
                                Gestiona el catálogo,
                                inventario y productos
                                disponibles en Baruk Shop.
                            </p>

                        </div>

                        {/* Por ahora no enlazamos a una
                            pantalla que todavía no existe. */}

                        <Link
                            href="/admin/shop/nuevo"
                            className="
        inline-flex
        items-center
        justify-center

        rounded-full

        bg-orange-500

        px-5
        py-2.5

        text-xs
        font-bold
        text-black

        transition

        hover:bg-orange-400
    "
                        >
                            + Nuevo producto
                        </Link>

                        <Link
                            href="/admin/shop/pedidos"
                            className="
        inline-flex
        min-h-[44px]
        items-center
        justify-center
        rounded-xl
        bg-[#171717]
        px-5
        text-sm
        font-black
        text-white
        transition
        hover:bg-black
    "
                        >
                            Pedidos
                        </Link>

                    </div>
                </header>

                {/* =================================================
                    ERROR
                ================================================= */}

                {error && (
                    <div
                        className="
                            rounded-xl

                            border
                            border-red-500/40

                            bg-red-500/10

                            px-4
                            py-3

                            text-sm
                            text-red-200
                        "
                    >
                        {error}
                    </div>
                )}

                {/* =================================================
                    STATS
                ================================================= */}

                {!loading &&
                    !error && (
                        <section
                            className="
                                grid
                                gap-4

                                sm:grid-cols-2

                                lg:grid-cols-5
                            "
                        >

                            <div
                                className="
                                    rounded-xl
                                    border
                                    border-slate-800
                                    bg-slate-900/70
                                    px-4
                                    py-4
                                "
                            >
                                <p className="text-xs text-slate-400">
                                    Productos
                                </p>

                                <p
                                    className="
                                        mt-2
                                        text-2xl
                                        font-semibold
                                    "
                                >
                                    {
                                        stats.total
                                    }
                                </p>
                            </div>

                            <div
                                className="
                                    rounded-xl
                                    border
                                    border-emerald-500/30
                                    bg-emerald-500/10
                                    px-4
                                    py-4
                                "
                            >
                                <p className="text-xs text-emerald-200">
                                    Activos
                                </p>

                                <p
                                    className="
                                        mt-2
                                        text-2xl
                                        font-semibold
                                    "
                                >
                                    {
                                        stats.activos
                                    }
                                </p>
                            </div>

                            <div
                                className="
                                    rounded-xl
                                    border
                                    border-orange-500/30
                                    bg-orange-500/10
                                    px-4
                                    py-4
                                "
                            >
                                <p className="text-xs text-orange-200">
                                    Destacados
                                </p>

                                <p
                                    className="
                                        mt-2
                                        text-2xl
                                        font-semibold
                                    "
                                >
                                    {
                                        stats.destacados
                                    }
                                </p>
                            </div>

                            <div
                                className="
                                    rounded-xl
                                    border
                                    border-yellow-500/30
                                    bg-yellow-500/10
                                    px-4
                                    py-4
                                "
                            >
                                <p className="text-xs text-yellow-200">
                                    Agotados
                                </p>

                                <p
                                    className="
                                        mt-2
                                        text-2xl
                                        font-semibold
                                    "
                                >
                                    {
                                        stats.agotados
                                    }
                                </p>
                            </div>

                            <div
                                className="
                                    rounded-xl
                                    border
                                    border-slate-800
                                    bg-slate-900/70
                                    px-4
                                    py-4
                                "
                            >
                                <p className="text-xs text-slate-400">
                                    Stock total
                                </p>

                                <p
                                    className="
                                        mt-2
                                        text-2xl
                                        font-semibold
                                    "
                                >
                                    {
                                        stats.unidades
                                    }
                                </p>
                            </div>

                        </section>
                    )}

                {/* =================================================
                    CONTROLES
                ================================================= */}

                <section
                    className="
                        rounded-xl

                        border
                        border-slate-800

                        bg-slate-900/70

                        p-4
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

                        <div
                            className="
                                w-full

                                sm:max-w-sm
                            "
                        >
                            <input
                                type="search"
                                value={
                                    busqueda
                                }
                                onChange={(
                                    event
                                ) =>
                                    setBusqueda(
                                        event
                                            .target
                                            .value
                                    )
                                }
                                placeholder="Buscar producto, categoría o SKU..."
                                className="
                                    min-h-[42px]
                                    w-full

                                    rounded-lg

                                    border
                                    border-slate-700

                                    bg-slate-950

                                    px-4

                                    text-xs
                                    text-white

                                    outline-none

                                    transition

                                    placeholder:text-slate-500

                                    focus:border-orange-500
                                "
                            />
                        </div>

                        <p
                            className="
                                text-xs
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
                </section>

                {/* =================================================
                    LOADING
                ================================================= */}

                {loading && (
                    <div
                        className="
                            flex
                            items-center
                            justify-center
                            py-16

                            text-sm
                            text-slate-400
                        "
                    >
                        Cargando productos de
                        Baruk Shop...
                    </div>
                )}

                {/* =================================================
                    TABLA
                ================================================= */}

                {!loading &&
                    !error && (
                        <section
                            className="
                                overflow-hidden
                                rounded-xl

                                border
                                border-slate-800

                                bg-slate-900/70
                            "
                        >

                            <div
                                className="
                                    border-b
                                    border-slate-800

                                    px-4
                                    py-4
                                "
                            >
                                <h2
                                    className="
                                        text-sm
                                        font-semibold
                                        text-slate-200
                                    "
                                >
                                    Productos
                                </h2>
                            </div>

                            {productosFiltrados.length ===
                                0 ? (
                                <div
                                    className="
                                        px-6
                                        py-14
                                        text-center
                                    "
                                >
                                    <p
                                        className="
                                            text-sm
                                            font-semibold
                                            text-slate-300
                                        "
                                    >
                                        No encontramos productos
                                    </p>

                                    <p
                                        className="
                                            mt-1
                                            text-xs
                                            text-slate-500
                                        "
                                    >
                                        Prueba otra búsqueda.
                                    </p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">

                                    <table className="min-w-full text-left">

                                        <thead
                                            className="
                                                border-b
                                                border-slate-800

                                                text-[10px]
                                                uppercase
                                                tracking-wide
                                                text-slate-500
                                            "
                                        >
                                            <tr>
                                                <th className="px-4 py-3">
                                                    Producto
                                                </th>

                                                <th className="px-4 py-3">
                                                    Precio
                                                </th>

                                                <th className="px-4 py-3">
                                                    Stock
                                                </th>

                                                <th className="px-4 py-3">
                                                    Estado
                                                </th>

                                                <th className="px-4 py-3">
                                                    Home
                                                </th>

                                                <th className="px-4 py-3">
                                                    SKU
                                                </th>

                                                <th className="px-4 py-3 text-right">
                                                    Acciones
                                                </th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {productosFiltrados.map(
                                                (
                                                    producto
                                                ) => {
                                                    const precio =
                                                        Number(
                                                            producto.precio
                                                        );

                                                    const agotado =
                                                        Number(
                                                            producto.stock
                                                        ) <=
                                                        0;

                                                    return (
                                                        <tr
                                                            key={
                                                                producto.id
                                                            }
                                                            className="
                                                                border-b
                                                                border-slate-800/70

                                                                last:border-0

                                                                hover:bg-slate-800/40
                                                            "
                                                        >

                                                            {/* PRODUCTO */}

                                                            <td className="px-4 py-3">

                                                                <div
                                                                    className="
                                                                        flex
                                                                        min-w-[230px]
                                                                        items-center
                                                                        gap-3
                                                                    "
                                                                >


                                                                    <div
                                                                        className="
                                                                            h-12
                                                                            w-12
                                                                            shrink-0

                                                                            overflow-hidden

                                                                            rounded-lg

                                                                            border
                                                                            border-slate-700

                                                                            bg-slate-950
                                                                        "
                                                                    >
                                                                        <ProductImage
                                                                            path={
                                                                                producto.imagen_principal
                                                                            }
                                                                            nombre={
                                                                                producto.nombre
                                                                            }
                                                                        />
                                                                    </div>

                                                                    <div>

                                                                        <p
                                                                            className="
                                                                                text-xs
                                                                                font-semibold
                                                                                text-white
                                                                            "
                                                                        >
                                                                            {
                                                                                producto.nombre
                                                                            }
                                                                        </p>

                                                                        <p
                                                                            className="
                                                                                mt-1
                                                                                text-[10px]
                                                                                text-slate-500
                                                                            "
                                                                        >
                                                                            {producto
                                                                                .store_categories
                                                                                ?.nombre ??
                                                                                "Sin categoría"}
                                                                        </p>

                                                                    </div>

                                                                </div>

                                                            </td>

                                                            {/* PRECIO */}

                                                            <td className="px-4 py-3">

                                                                <p
                                                                    className="
                                                                        text-xs
                                                                        font-semibold
                                                                        text-slate-200
                                                                    "
                                                                >
                                                                    $
                                                                    {precio.toFixed(
                                                                        2
                                                                    )}
                                                                </p>

                                                                {producto.precio_anterior !==
                                                                    null &&
                                                                    Number(
                                                                        producto.precio_anterior
                                                                    ) >
                                                                    precio && (
                                                                        <p
                                                                            className="
                                                                                mt-1
                                                                                text-[10px]
                                                                                text-slate-500
                                                                                line-through
                                                                            "
                                                                        >
                                                                            $
                                                                            {Number(
                                                                                producto.precio_anterior
                                                                            ).toFixed(
                                                                                2
                                                                            )}
                                                                        </p>
                                                                    )}

                                                            </td>

                                                            {/* STOCK */}

                                                            <td className="px-4 py-3">

                                                                <span
                                                                    className={`
                                                                        inline-flex
                                                                        rounded-full

                                                                        px-2
                                                                        py-1

                                                                        text-[10px]
                                                                        font-semibold

                                                                        ${agotado
                                                                            ? "border border-red-500/40 bg-red-500/10 text-red-300"
                                                                            : Number(
                                                                                producto.stock
                                                                            ) <=
                                                                                3
                                                                                ? "border border-yellow-500/40 bg-yellow-500/10 text-yellow-200"
                                                                                : "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                                                                        }
                                                                    `}
                                                                >
                                                                    {
                                                                        producto.stock
                                                                    }{" "}
                                                                    ud.
                                                                </span>

                                                            </td>

                                                            {/* ESTADO */}

                                                            <td className="px-4 py-3">

                                                                <span
                                                                    className={`
                                                                        inline-flex
                                                                        rounded-full

                                                                        px-2
                                                                        py-1

                                                                        text-[10px]
                                                                        font-semibold

                                                                        ${producto.activo
                                                                            ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                                                                            : "border border-slate-600 bg-slate-800 text-slate-400"
                                                                        }
                                                                    `}
                                                                >
                                                                    {producto.activo
                                                                        ? "Activo"
                                                                        : "Inactivo"}
                                                                </span>

                                                            </td>

                                                            {/* DESTACADO */}

                                                            <td className="px-4 py-3">

                                                                <span
                                                                    className={`
                                                                        text-[10px]
                                                                        font-semibold

                                                                        ${producto.destacado
                                                                            ? "text-orange-300"
                                                                            : "text-slate-600"
                                                                        }
                                                                    `}
                                                                >
                                                                    {producto.destacado
                                                                        ? "Destacado"
                                                                        : "—"}
                                                                </span>

                                                            </td>

                                                            {/* SKU */}

                                                            <td
                                                                className="
        px-4
        py-3

        font-mono
        text-[10px]
        text-slate-400
    "
                                                            >
                                                                {producto.sku ?? "—"}
                                                            </td>

                                                            {/* ACCIONES */}

                                                            <td className="px-4 py-3 text-right">
                                                                <Link
                                                                    href={`/admin/shop/editar/${producto.id}`}
                                                                    className="
            inline-flex
            items-center
            gap-1

            whitespace-nowrap

            text-[11px]
            font-semibold
            text-orange-300

            transition

            hover:text-orange-200
        "
                                                                >
                                                                    Editar
                                                                    <span>→</span>
                                                                </Link>
                                                            </td>

                                                        </tr>
                                                    );
                                                }
                                            )}
                                        </tbody>

                                    </table>

                                </div>
                            )}

                        </section>
                    )}

                {/* =================================================
                    ACCESOS
                ================================================= */}

                <section
                    className="
                        flex
                        flex-wrap
                        gap-3
                    "
                >
                    <Link
                        href="/tienda"
                        target="_blank"
                        className="
                            inline-flex
                            items-center

                            rounded-full

                            border
                            border-slate-700

                            bg-slate-900

                            px-4
                            py-2

                            text-xs
                            font-semibold
                            text-slate-100

                            transition

                            hover:border-orange-500
                            hover:text-orange-200
                        "
                    >
                        Ver Baruk Shop pública ↗
                    </Link>

                    <Link
                        href="/admin"
                        className="
                            inline-flex
                            items-center

                            rounded-full

                            border
                            border-slate-700

                            px-4
                            py-2

                            text-xs
                            font-semibold
                            text-slate-300

                            transition

                            hover:border-orange-500
                            hover:text-orange-200
                        "
                    >
                        Volver al panel
                    </Link>
                </section>

            </div>
        </main>
    );
}