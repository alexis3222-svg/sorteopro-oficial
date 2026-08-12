"use client";

import {
    ChangeEvent,
    FormEvent,
    useEffect,
    useMemo,
    useState,
} from "react";

import Link from "next/link";
import {
    useRouter,
} from "next/navigation";

import { supabase } from "@/lib/supabaseClient";

type Categoria = {
    id: string;
    nombre: string;
    slug: string;
};

export default function NuevoProductoPage() {
    const router =
        useRouter();

    const [
        categorias,
        setCategorias,
    ] = useState<Categoria[]>([]);

    const [
        categoriasLoading,
        setCategoriasLoading,
    ] = useState(true);

    const [
        nombre,
        setNombre,
    ] = useState("");

    const [
        slug,
        setSlug,
    ] = useState("");

    const [
        descripcionCorta,
        setDescripcionCorta,
    ] = useState("");

    const [
        descripcion,
        setDescripcion,
    ] = useState("");

    const [
        precio,
        setPrecio,
    ] = useState("");

    const [
        precioAnterior,
        setPrecioAnterior,
    ] = useState("");

    const [
        stock,
        setStock,
    ] = useState("0");

    const [
        sku,
        setSku,
    ] = useState("");

    const [
        categoryId,
        setCategoryId,
    ] = useState("");

    const [
        etiqueta,
        setEtiqueta,
    ] = useState("");

    const [
        orden,
        setOrden,
    ] = useState("0");

    const [
        activo,
        setActivo,
    ] = useState(true);

    const [
        destacado,
        setDestacado,
    ] = useState(false);

    const [
        tendencia,
        setTendencia,
    ] = useState(false);

    const [
        nuevo,
        setNuevo,
    ] = useState(false);

    const [
        imagen,
        setImagen,
    ] = useState<File | null>(
        null
    );

    const [
        imagenPreview,
        setImagenPreview,
    ] = useState<string | null>(
        null
    );

    const [
        loading,
        setLoading,
    ] = useState(false);

    const [
        error,
        setError,
    ] = useState<string | null>(
        null
    );

    /* ============================================================
       CATEGORÍAS
    ============================================================ */

    useEffect(() => {
        const cargarCategorias =
            async () => {
                try {
                    const {
                        data,
                        error:
                        categoriasError,
                    } =
                        await supabase
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
                            );

                    if (
                        categoriasError
                    ) {
                        throw categoriasError;
                    }

                    setCategorias(
                        (data ??
                            []) as Categoria[]
                    );

                } catch (err) {
                    console.error(
                        "Error cargando categorías:",
                        err
                    );

                } finally {
                    setCategoriasLoading(
                        false
                    );
                }
            };

        cargarCategorias();
    }, []);

    /* ============================================================
       SLUG AUTOMÁTICO
    ============================================================ */

    const slugAutomatico =
        useMemo(() => {
            return nombre
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
        }, [nombre]);

    /* ============================================================
       PREVIEW
    ============================================================ */

    const seleccionarImagen = (
        event:
            ChangeEvent<HTMLInputElement>
    ) => {
        const file =
            event.target.files?.[0] ??
            null;

        setImagen(file);

        if (imagenPreview) {
            URL.revokeObjectURL(
                imagenPreview
            );
        }

        if (file) {
            setImagenPreview(
                URL.createObjectURL(
                    file
                )
            );
        } else {
            setImagenPreview(
                null
            );
        }
    };

    /* ============================================================
       SUBMIT
    ============================================================ */

    const onSubmit =
        async (
            event:
                FormEvent<HTMLFormElement>
        ) => {
            event.preventDefault();

            if (loading) {
                return;
            }

            setError(null);

            if (!nombre.trim()) {
                setError(
                    "Ingresa el nombre del producto."
                );
                return;
            }

            if (!precio.trim()) {
                setError(
                    "Ingresa el precio del producto."
                );
                return;
            }

            setLoading(true);

            try {
                const formData =
                    new FormData();

                formData.set(
                    "nombre",
                    nombre.trim()
                );

                formData.set(
                    "slug",
                    slug.trim() ||
                    slugAutomatico
                );

                formData.set(
                    "descripcion_corta",
                    descripcionCorta.trim()
                );

                formData.set(
                    "descripcion",
                    descripcion.trim()
                );

                formData.set(
                    "precio",
                    precio
                );

                formData.set(
                    "precio_anterior",
                    precioAnterior
                );

                formData.set(
                    "stock",
                    stock || "0"
                );

                formData.set(
                    "sku",
                    sku.trim()
                );

                formData.set(
                    "category_id",
                    categoryId
                );

                formData.set(
                    "etiqueta",
                    etiqueta.trim()
                );

                formData.set(
                    "orden",
                    orden || "0"
                );

                formData.set(
                    "activo",
                    String(activo)
                );

                formData.set(
                    "destacado",
                    String(destacado)
                );

                formData.set(
                    "tendencia",
                    String(tendencia)
                );

                formData.set(
                    "nuevo",
                    String(nuevo)
                );

                if (imagen) {
                    formData.set(
                        "imagen",
                        imagen
                    );
                }

                const response =
                    await fetch(
                        "/api/admin/shop/products",
                        {
                            method:
                                "POST",

                            credentials:
                                "include",

                            body:
                                formData,
                        }
                    );

                const json =
                    await response
                        .json()
                        .catch(
                            () =>
                                null
                        );

                if (
                    !response.ok ||
                    !json?.ok
                ) {
                    throw new Error(
                        json?.error ||
                        "No se pudo crear el producto."
                    );
                }

                router.push(
                    "/admin/shop"
                );

                router.refresh();

            } catch (err) {
                console.error(
                    err
                );

                setError(
                    err instanceof Error
                        ? err.message
                        : "No se pudo crear el producto."
                );

            } finally {
                setLoading(
                    false
                );
            }
        };

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
                    max-w-5xl
                    px-4
                    py-8

                    md:py-12
                "
            >

                {/* HEADER */}

                <header
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
                            href="/admin/shop"
                            className="
                                text-xs
                                font-semibold
                                text-slate-400

                                transition

                                hover:text-orange-300
                            "
                        >
                            ← Baruk Shop
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

                                md:text-4xl
                            "
                        >
                            Nuevo producto
                        </h1>

                        <p
                            className="
                                mt-3
                                max-w-xl
                                text-sm
                                leading-6
                                text-slate-400
                            "
                        >
                            Crea un nuevo
                            producto para
                            Baruk Shop.
                        </p>

                    </div>
                </header>

                {/* ERROR */}

                {error && (
                    <div
                        className="
                            mt-7
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

                <form
                    onSubmit={onSubmit}
                    className="
                        mt-8
                        grid
                        gap-6

                        lg:grid-cols-[1fr_320px]
                    "
                >

                    {/* =============================================
                        COLUMNA PRINCIPAL
                    ============================================= */}

                    <div className="space-y-6">

                        {/* INFORMACIÓN */}

                        <section
                            className="
                                rounded-2xl

                                border
                                border-slate-800

                                bg-slate-900/70

                                p-5

                                md:p-6
                            "
                        >
                            <h2
                                className="
                                    text-sm
                                    font-semibold
                                    text-white
                                "
                            >
                                Información del producto
                            </h2>

                            <div
                                className="
                                    mt-5
                                    grid
                                    gap-5

                                    sm:grid-cols-2
                                "
                            >

                                {/* NOMBRE */}

                                <div className="sm:col-span-2">

                                    <label className="text-xs text-slate-300">
                                        Nombre *
                                    </label>

                                    <input
                                        value={
                                            nombre
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setNombre(
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                        placeholder="Ej. Casco Baruk Adventure"
                                        className="
                                            mt-2
                                            min-h-[44px]
                                            w-full

                                            rounded-xl

                                            border
                                            border-slate-700

                                            bg-slate-950

                                            px-4

                                            text-sm
                                            text-white

                                            outline-none

                                            focus:border-orange-500
                                        "
                                    />

                                </div>

                                {/* SLUG */}

                                <div className="sm:col-span-2">

                                    <label className="text-xs text-slate-300">
                                        Slug
                                    </label>

                                    <input
                                        value={
                                            slug
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setSlug(
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                        placeholder={
                                            slugAutomatico ||
                                            "casco-baruk-adventure"
                                        }
                                        className="
                                            mt-2
                                            min-h-[44px]
                                            w-full

                                            rounded-xl

                                            border
                                            border-slate-700

                                            bg-slate-950

                                            px-4

                                            font-mono
                                            text-xs
                                            text-slate-200

                                            outline-none

                                            focus:border-orange-500
                                        "
                                    />

                                    <p
                                        className="
                                            mt-2
                                            text-[10px]
                                            text-slate-500
                                        "
                                    >
                                        URL pública:
                                        /tienda/
                                        {slug.trim() ||
                                            slugAutomatico ||
                                            "..."}
                                    </p>

                                </div>

                                {/* DESCRIPCIÓN CORTA */}

                                <div className="sm:col-span-2">

                                    <label className="text-xs text-slate-300">
                                        Descripción corta
                                    </label>

                                    <textarea
                                        value={
                                            descripcionCorta
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setDescripcionCorta(
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                        rows={3}
                                        className="
                                            mt-2
                                            w-full
                                            resize-none

                                            rounded-xl

                                            border
                                            border-slate-700

                                            bg-slate-950

                                            px-4
                                            py-3

                                            text-sm
                                            text-white

                                            outline-none

                                            focus:border-orange-500
                                        "
                                    />

                                </div>

                                {/* DESCRIPCIÓN */}

                                <div className="sm:col-span-2">

                                    <label className="text-xs text-slate-300">
                                        Descripción completa
                                    </label>

                                    <textarea
                                        value={
                                            descripcion
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setDescripcion(
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                        rows={6}
                                        className="
                                            mt-2
                                            w-full
                                            resize-y

                                            rounded-xl

                                            border
                                            border-slate-700

                                            bg-slate-950

                                            px-4
                                            py-3

                                            text-sm
                                            leading-6
                                            text-white

                                            outline-none

                                            focus:border-orange-500
                                        "
                                    />

                                </div>

                            </div>
                        </section>

                        {/* PRECIO E INVENTARIO */}

                        <section
                            className="
                                rounded-2xl

                                border
                                border-slate-800

                                bg-slate-900/70

                                p-5

                                md:p-6
                            "
                        >
                            <h2
                                className="
                                    text-sm
                                    font-semibold
                                    text-white
                                "
                            >
                                Precio e inventario
                            </h2>

                            <div
                                className="
                                    mt-5
                                    grid
                                    gap-5

                                    sm:grid-cols-2
                                "
                            >

                                <div>

                                    <label className="text-xs text-slate-300">
                                        Precio *
                                    </label>

                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={
                                            precio
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setPrecio(
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                        placeholder="0.00"
                                        className="
                                            mt-2
                                            min-h-[44px]
                                            w-full

                                            rounded-xl

                                            border
                                            border-slate-700

                                            bg-slate-950

                                            px-4

                                            text-sm
                                            text-white

                                            outline-none

                                            focus:border-orange-500
                                        "
                                    />

                                </div>

                                <div>

                                    <label className="text-xs text-slate-300">
                                        Precio anterior
                                    </label>

                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={
                                            precioAnterior
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setPrecioAnterior(
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                        placeholder="Opcional"
                                        className="
                                            mt-2
                                            min-h-[44px]
                                            w-full

                                            rounded-xl

                                            border
                                            border-slate-700

                                            bg-slate-950

                                            px-4

                                            text-sm
                                            text-white

                                            outline-none

                                            focus:border-orange-500
                                        "
                                    />

                                </div>

                                <div>

                                    <label className="text-xs text-slate-300">
                                        Stock
                                    </label>

                                    <input
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={
                                            stock
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setStock(
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                        className="
                                            mt-2
                                            min-h-[44px]
                                            w-full

                                            rounded-xl

                                            border
                                            border-slate-700

                                            bg-slate-950

                                            px-4

                                            text-sm
                                            text-white

                                            outline-none

                                            focus:border-orange-500
                                        "
                                    />

                                </div>

                                <div>

                                    <label className="text-xs text-slate-300">
                                        SKU
                                    </label>

                                    <input
                                        value={
                                            sku
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setSku(
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                        placeholder="BRK-001"
                                        className="
                                            mt-2
                                            min-h-[44px]
                                            w-full

                                            rounded-xl

                                            border
                                            border-slate-700

                                            bg-slate-950

                                            px-4

                                            font-mono
                                            text-xs
                                            text-white

                                            outline-none

                                            focus:border-orange-500
                                        "
                                    />

                                </div>

                                <div>

                                    <label className="text-xs text-slate-300">
                                        Categoría
                                    </label>

                                    <select
                                        value={
                                            categoryId
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setCategoryId(
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                        disabled={
                                            categoriasLoading
                                        }
                                        className="
                                            mt-2
                                            min-h-[44px]
                                            w-full

                                            rounded-xl

                                            border
                                            border-slate-700

                                            bg-slate-950

                                            px-4

                                            text-xs
                                            text-white

                                            outline-none

                                            focus:border-orange-500
                                        "
                                    >
                                        <option value="">
                                            Sin categoría
                                        </option>

                                        {categorias.map(
                                            (
                                                categoria
                                            ) => (
                                                <option
                                                    key={
                                                        categoria.id
                                                    }
                                                    value={
                                                        categoria.id
                                                    }
                                                >
                                                    {
                                                        categoria.nombre
                                                    }
                                                </option>
                                            )
                                        )}

                                    </select>

                                </div>

                                <div>

                                    <label className="text-xs text-slate-300">
                                        Orden
                                    </label>

                                    <input
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={
                                            orden
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setOrden(
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                        className="
                                            mt-2
                                            min-h-[44px]
                                            w-full

                                            rounded-xl

                                            border
                                            border-slate-700

                                            bg-slate-950

                                            px-4

                                            text-sm
                                            text-white

                                            outline-none

                                            focus:border-orange-500
                                        "
                                    />

                                </div>

                            </div>
                        </section>

                    </div>

                    {/* =============================================
                        COLUMNA DERECHA
                    ============================================= */}

                    <aside className="space-y-6">

                        {/* IMAGEN */}

                        <section
                            className="
                                rounded-2xl

                                border
                                border-slate-800

                                bg-slate-900/70

                                p-5
                            "
                        >
                            <h2
                                className="
                                    text-sm
                                    font-semibold
                                    text-white
                                "
                            >
                                Imagen principal
                            </h2>

                            <div
                                className="
                                    relative
                                    mt-4

                                    aspect-square

                                    overflow-hidden

                                    rounded-xl

                                    border
                                    border-slate-700

                                    bg-slate-950
                                "
                            >
                                {imagenPreview ? (
                                    <img
                                        src={
                                            imagenPreview
                                        }
                                        alt="Vista previa"
                                        className="
                                            h-full
                                            w-full
                                            object-contain
                                            p-3
                                        "
                                    />
                                ) : (
                                    <div
                                        className="
                                            flex
                                            h-full
                                            items-center
                                            justify-center

                                            px-5

                                            text-center
                                            text-xs
                                            text-slate-500
                                        "
                                    >
                                        Selecciona una
                                        fotografía del
                                        producto.
                                    </div>
                                )}
                            </div>

                            <input
                                type="file"
                                accept="
                                    image/webp,
                                    image/png,
                                    image/jpeg
                                "
                                onChange={
                                    seleccionarImagen
                                }
                                className="
                                    mt-4
                                    block
                                    w-full

                                    text-[10px]
                                    text-slate-400

                                    file:mr-3
                                    file:rounded-full
                                    file:border-0
                                    file:bg-orange-500
                                    file:px-3
                                    file:py-2
                                    file:text-[10px]
                                    file:font-bold
                                    file:text-black
                                "
                            />

                            <p
                                className="
                                    mt-3
                                    text-[10px]
                                    leading-5
                                    text-slate-500
                                "
                            >
                                WEBP, PNG o JPG.
                                Máximo 5 MB.
                            </p>

                        </section>

                        {/* VISIBILIDAD */}

                        <section
                            className="
                                rounded-2xl

                                border
                                border-slate-800

                                bg-slate-900/70

                                p-5
                            "
                        >
                            <h2
                                className="
                                    text-sm
                                    font-semibold
                                    text-white
                                "
                            >
                                Publicación
                            </h2>

                            <div className="mt-5 space-y-4">

                                <label
                                    className="
                                        flex
                                        cursor-pointer
                                        items-center
                                        justify-between
                                        gap-4
                                    "
                                >
                                    <div>
                                        <p className="text-xs font-semibold text-slate-200">
                                            Activo
                                        </p>

                                        <p className="mt-1 text-[10px] text-slate-500">
                                            Visible en Baruk Shop.
                                        </p>
                                    </div>

                                    <input
                                        type="checkbox"
                                        checked={
                                            activo
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setActivo(
                                                event
                                                    .target
                                                    .checked
                                            )
                                        }
                                        className="h-4 w-4 accent-orange-500"
                                    />
                                </label>

                                <label className="flex cursor-pointer items-center justify-between gap-4">
                                    <div>
                                        <p className="text-xs font-semibold text-slate-200">
                                            Destacado
                                        </p>

                                        <p className="mt-1 text-[10px] text-slate-500">
                                            Mostrar en el Home.
                                        </p>
                                    </div>

                                    <input
                                        type="checkbox"
                                        checked={
                                            destacado
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setDestacado(
                                                event
                                                    .target
                                                    .checked
                                            )
                                        }
                                        className="h-4 w-4 accent-orange-500"
                                    />
                                </label>

                                <label className="flex cursor-pointer items-center justify-between gap-4">
                                    <div>
                                        <p className="text-xs font-semibold text-slate-200">
                                            Tendencia
                                        </p>
                                    </div>

                                    <input
                                        type="checkbox"
                                        checked={
                                            tendencia
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setTendencia(
                                                event
                                                    .target
                                                    .checked
                                            )
                                        }
                                        className="h-4 w-4 accent-orange-500"
                                    />
                                </label>

                                <label className="flex cursor-pointer items-center justify-between gap-4">
                                    <div>
                                        <p className="text-xs font-semibold text-slate-200">
                                            Nuevo
                                        </p>
                                    </div>

                                    <input
                                        type="checkbox"
                                        checked={
                                            nuevo
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setNuevo(
                                                event
                                                    .target
                                                    .checked
                                            )
                                        }
                                        className="h-4 w-4 accent-orange-500"
                                    />
                                </label>

                            </div>

                            <div
                                className="
                                    mt-5
                                    border-t
                                    border-slate-800
                                    pt-5
                                "
                            >
                                <label className="text-xs text-slate-300">
                                    Etiqueta
                                </label>

                                <input
                                    value={
                                        etiqueta
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setEtiqueta(
                                            event
                                                .target
                                                .value
                                        )
                                    }
                                    placeholder="Ej. Más vendido"
                                    className="
                                        mt-2
                                        min-h-[42px]
                                        w-full

                                        rounded-xl

                                        border
                                        border-slate-700

                                        bg-slate-950

                                        px-4

                                        text-xs
                                        text-white

                                        outline-none

                                        focus:border-orange-500
                                    "
                                />

                            </div>
                        </section>

                        {/* GUARDAR */}

                        <button
                            type="submit"
                            disabled={
                                loading
                            }
                            className={`
                                min-h-[50px]
                                w-full

                                rounded-xl

                                px-5

                                text-sm
                                font-extrabold

                                transition

                                ${loading
                                    ? "cursor-not-allowed bg-slate-700 text-slate-300"
                                    : "bg-orange-500 text-black hover:bg-orange-400"
                                }
                            `}
                        >
                            {loading
                                ? "Guardando..."
                                : "Crear producto"}
                        </button>

                        <Link
                            href="/admin/shop"
                            className="
                                block
                                text-center
                                text-xs
                                font-semibold
                                text-slate-400

                                hover:text-white
                            "
                        >
                            Cancelar
                        </Link>

                    </aside>

                </form>

            </div>
        </main>
    );
}