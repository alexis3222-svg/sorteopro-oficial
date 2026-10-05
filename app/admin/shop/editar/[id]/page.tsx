"use client";

import {
    ChangeEvent,
    FormEvent,
    useEffect,
    useState,
} from "react";

import Link from "next/link";

import {
    useParams,
    useRouter,
} from "next/navigation";

import {
    getBarukShopImageUrl,
} from "@/lib/barukShopImage";

type Categoria = {
    id: string;
    nombre: string;
    slug: string;
};

type Producto = {
    id: string;

    category_id: string | null;

    nombre: string;
    slug: string;

    descripcion:
    | string
    | null;

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

    sku:
    | string
    | null;

    imagen_principal:
    | string
    | null;

    activo: boolean;
    destacado: boolean;
    tendencia: boolean;
    nuevo: boolean;

    etiqueta:
    | string
    | null;

    orden: number;
};

type GaleriaImagen = {
    id: string;
    product_id: string;
    image_url: string;
    alt_text: string | null;
    orden: number;
    created_at: string;
};

const MAX_GALLERY_IMAGES = 7;

export default function EditarProductoPage() {
    const params =
        useParams();

    const router =
        useRouter();

    const idParam =
        params.id;

    const id =
        Array.isArray(idParam)
            ? idParam[0]
            : String(
                idParam ?? ""
            );

    /* ============================================================
       ESTADO GENERAL
    ============================================================ */

    const [
        cargando,
        setCargando,
    ] = useState(true);

    const [
        guardando,
        setGuardando,
    ] = useState(false);

    const [
        error,
        setError,
    ] =
        useState<string | null>(
            null
        );

    const [
        categorias,
        setCategorias,
    ] =
        useState<Categoria[]>(
            []
        );

    /* ============================================================
       CAMPOS
    ============================================================ */

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

    /* ============================================================
       IMAGEN
    ============================================================ */

    const [
        imagenPrincipal,
        setImagenPrincipal,
    ] =
        useState<string | null>(
            null
        );

    const [
        nuevaImagen,
        setNuevaImagen,
    ] =
        useState<File | null>(
            null
        );

    const [
        nuevaImagenPreview,
        setNuevaImagenPreview,
    ] =
        useState<string | null>(
            null
        );

    const [
        eliminarImagen,
        setEliminarImagen,
    ] = useState(false);

    const [
        imagenError,
        setImagenError,
    ] = useState(false);

    /* ============================================================
       GALERÍA
    ============================================================ */

    const [
        galeriaImagenes,
        setGaleriaImagenes,
    ] = useState<GaleriaImagen[]>([]);

    const [
        nuevasGaleria,
        setNuevasGaleria,
    ] = useState<File[]>([]);

    const [
        nuevasGaleriaPreview,
        setNuevasGaleriaPreview,
    ] = useState<string[]>([]);

    const [
        galeriaAEliminar,
        setGaleriaAEliminar,
    ] = useState<string[]>([]);

    /* ============================================================
       CARGAR PRODUCTO
    ============================================================ */

    useEffect(() => {
        if (!id) {
            return;
        }

        const cargar =
            async () => {
                try {
                    setCargando(true);
                    setError(null);

                    const response =
                        await fetch(
                            `/api/admin/shop/products/${id}`,
                            {
                                method:
                                    "GET",

                                credentials:
                                    "include",

                                cache:
                                    "no-store",
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
                            "No se pudo cargar el producto."
                        );
                    }

                    const producto =
                        json.producto as Producto;

                    setCategorias(
                        (
                            json.categorias ??
                            []
                        ) as Categoria[]
                    );

                    setNombre(
                        producto.nombre ??
                        ""
                    );

                    setSlug(
                        producto.slug ??
                        ""
                    );

                    setDescripcionCorta(
                        producto.descripcion_corta ??
                        ""
                    );

                    setDescripcion(
                        producto.descripcion ??
                        ""
                    );

                    setPrecio(
                        String(
                            producto.precio ??
                            ""
                        )
                    );

                    setPrecioAnterior(
                        producto.precio_anterior !==
                            null
                            ? String(
                                producto.precio_anterior
                            )
                            : ""
                    );

                    setStock(
                        String(
                            producto.stock ??
                            0
                        )
                    );

                    setSku(
                        producto.sku ??
                        ""
                    );

                    setCategoryId(
                        producto.category_id ??
                        ""
                    );

                    setEtiqueta(
                        producto.etiqueta ??
                        ""
                    );

                    setOrden(
                        String(
                            producto.orden ??
                            0
                        )
                    );

                    setActivo(
                        Boolean(
                            producto.activo
                        )
                    );

                    setDestacado(
                        Boolean(
                            producto.destacado
                        )
                    );

                    setTendencia(
                        Boolean(
                            producto.tendencia
                        )
                    );

                    setNuevo(
                        Boolean(
                            producto.nuevo
                        )
                    );

                    setImagenPrincipal(
                        producto.imagen_principal ??
                        null
                    );

                    const galleryResponse =
                        await fetch(
                            `/api/admin/shop/products/${id}/images`,
                            {
                                method: "GET",
                                credentials: "include",
                                cache: "no-store",
                            }
                        );

                    const galleryJson =
                        await galleryResponse
                            .json()
                            .catch(() => null);

                    if (
                        !galleryResponse.ok ||
                        !galleryJson?.ok
                    ) {
                        throw new Error(
                            galleryJson?.error ||
                            "No se pudo cargar la galería."
                        );
                    }

                    setGaleriaImagenes(
                        galleryJson.images ?? []
                    );

                } catch (err) {
                    console.error(err);

                    setError(
                        err instanceof Error
                            ? err.message
                            : "No se pudo cargar el producto."
                    );

                } finally {
                    setCargando(
                        false
                    );
                }
            };

        cargar();

    }, [id]);

    /* ============================================================
       URL DE IMAGEN ACTUAL
    ============================================================ */

    const imagenActualUrl =
        !eliminarImagen
            ? getBarukShopImageUrl(
                imagenPrincipal
            )
            : null;

    const imagenMostrada =
        nuevaImagenPreview ??
        imagenActualUrl;

    /* ============================================================
       LIMPIAR OBJECT URL
    ============================================================ */

    useEffect(() => {
        return () => {
            if (
                nuevaImagenPreview
            ) {
                URL.revokeObjectURL(
                    nuevaImagenPreview
                );
            }
        };
    }, [nuevaImagenPreview]);

    /* ============================================================
       SELECCIONAR IMAGEN
    ============================================================ */

    const seleccionarImagen = (
        event:
            ChangeEvent<HTMLInputElement>
    ) => {
        const file =
            event.target.files?.[0] ??
            null;

        if (
            nuevaImagenPreview
        ) {
            URL.revokeObjectURL(
                nuevaImagenPreview
            );
        }

        setNuevaImagen(
            file
        );

        setEliminarImagen(
            false
        );

        setImagenError(
            false
        );

        if (file) {
            setNuevaImagenPreview(
                URL.createObjectURL(
                    file
                )
            );
        } else {
            setNuevaImagenPreview(
                null
            );
        }
    };

    /* ============================================================
       QUITAR IMAGEN
    ============================================================ */

    const quitarImagen =
        () => {
            if (
                nuevaImagenPreview
            ) {
                URL.revokeObjectURL(
                    nuevaImagenPreview
                );
            }

            setNuevaImagen(
                null
            );

            setNuevaImagenPreview(
                null
            );

            setEliminarImagen(
                true
            );

            setImagenError(
                false
            );
        };

    /* ============================================================
       GALERÍA - SELECCIONAR
    ============================================================ */

    const seleccionarGaleria = (
        event: ChangeEvent<HTMLInputElement>
    ) => {
        const files = Array.from(
            event.target.files ?? []
        );

        if (files.length === 0) {
            return;
        }

        const existentesActivas =
            galeriaImagenes.filter(
                (imagen) =>
                    !galeriaAEliminar.includes(
                        imagen.id
                    )
            ).length;

        const disponibles =
            MAX_GALLERY_IMAGES -
            existentesActivas -
            nuevasGaleria.length;

        if (disponibles <= 0) {
            setError(
                `La galería permite máximo ${MAX_GALLERY_IMAGES} imágenes adicionales.`
            );

            event.target.value = "";
            return;
        }

        const permitidos = new Set([
            "image/webp",
            "image/png",
            "image/jpeg",
        ]);

        const seleccionadas =
            files.slice(0, disponibles);

        for (const file of seleccionadas) {
            if (!permitidos.has(file.type)) {
                setError(
                    "Las imágenes deben ser WEBP, PNG o JPG."
                );

                event.target.value = "";
                return;
            }

            if (
                file.size >
                5 * 1024 * 1024
            ) {
                setError(
                    "Cada imagen puede pesar máximo 5 MB."
                );

                event.target.value = "";
                return;
            }
        }

        setNuevasGaleria(
            (actuales) => [
                ...actuales,
                ...seleccionadas,
            ]
        );

        setNuevasGaleriaPreview(
            (actuales) => [
                ...actuales,
                ...seleccionadas.map(
                    (file) =>
                        URL.createObjectURL(file)
                ),
            ]
        );

        if (files.length > disponibles) {
            setError(
                `Solo se agregaron ${disponibles} imágenes porque el máximo es ${MAX_GALLERY_IMAGES}.`
            );
        } else {
            setError(null);
        }

        event.target.value = "";
    };

    const quitarNuevaGaleria = (
        index: number
    ) => {
        const preview =
            nuevasGaleriaPreview[index];

        if (preview) {
            URL.revokeObjectURL(preview);
        }

        setNuevasGaleria(
            (actuales) =>
                actuales.filter(
                    (_, i) =>
                        i !== index
                )
        );

        setNuevasGaleriaPreview(
            (actuales) =>
                actuales.filter(
                    (_, i) =>
                        i !== index
                )
        );
    };

    const quitarGaleriaExistente = (
        imageId: string
    ) => {
        setGaleriaAEliminar(
            (actuales) => {
                if (
                    actuales.includes(imageId)
                ) {
                    return actuales.filter(
                        (id) =>
                            id !== imageId
                    );
                }

                return [
                    ...actuales,
                    imageId,
                ];
            }
        );
    };

    /* ============================================================
       GALERÍA - REORDENAR
    ============================================================ */

    const moverImagenGaleria =
        async (
            imageId: string,
            direccion: "izquierda" | "derecha"
        ) => {
            const activas =
                galeriaImagenes.filter(
                    (imagen) =>
                        !galeriaAEliminar.includes(
                            imagen.id
                        )
                );

            const indice =
                activas.findIndex(
                    (imagen) =>
                        imagen.id ===
                        imageId
                );

            if (indice === -1) {
                return;
            }

            const nuevoIndice =
                direccion ===
                    "izquierda"
                    ? indice - 1
                    : indice + 1;

            if (
                nuevoIndice < 0 ||
                nuevoIndice >=
                activas.length
            ) {
                return;
            }

            const anteriores =
                [...galeriaImagenes];

            const nuevas =
                [...activas];

            [
                nuevas[indice],
                nuevas[nuevoIndice],
            ] = [
                    nuevas[nuevoIndice],
                    nuevas[indice],
                ];

            const eliminadas =
                galeriaImagenes.filter(
                    (imagen) =>
                        galeriaAEliminar.includes(
                            imagen.id
                        )
                );

            setGaleriaImagenes([
                ...nuevas,
                ...eliminadas,
            ]);

            try {
                const response =
                    await fetch(
                        `/api/admin/shop/products/${id}/images`,
                        {
                            method:
                                "PATCH",

                            credentials:
                                "include",

                            headers: {
                                "Content-Type":
                                    "application/json",
                            },

                            body:
                                JSON.stringify({
                                    imageIds:
                                        nuevas.map(
                                            (
                                                imagen
                                            ) =>
                                                imagen.id
                                        ),
                                }),
                        }
                    );

                const json =
                    await response
                        .json()
                        .catch(
                            () => null
                        );

                if (
                    !response.ok ||
                    !json?.ok
                ) {
                    throw new Error(
                        json?.error ||
                        "No se pudo guardar el orden."
                    );
                }

                setGaleriaImagenes(
                    (actuales) =>
                        actuales.map(
                            (
                                imagen
                            ) => {
                                const posicion =
                                    nuevas.findIndex(
                                        (
                                            item
                                        ) =>
                                            item.id ===
                                            imagen.id
                                    );

                                if (
                                    posicion ===
                                    -1
                                ) {
                                    return imagen;
                                }

                                return {
                                    ...imagen,
                                    orden:
                                        posicion,
                                };
                            }
                        )
                );
            } catch (
            error
            ) {
                console.error(
                    "Error ordenando galería:",
                    error
                );

                setGaleriaImagenes(
                    anteriores
                );

                setError(
                    "No se pudo cambiar el orden de las imágenes."
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

            if (guardando) {
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

            setGuardando(
                true
            );

            try {
                const formData =
                    new FormData();

                formData.set(
                    "nombre",
                    nombre.trim()
                );

                formData.set(
                    "slug",
                    slug.trim()
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

                formData.set(
                    "eliminar_imagen",
                    String(
                        eliminarImagen
                    )
                );

                if (nuevaImagen) {
                    formData.set(
                        "imagen",
                        nuevaImagen
                    );
                }

                const response =
                    await fetch(
                        `/api/admin/shop/products/${id}`,
                        {
                            method:
                                "PUT",

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
                        "No se pudo actualizar el producto."
                    );
                }

                /* ============================================================
                   GALERÍA - ELIMINAR IMÁGENES
                ============================================================ */

                for (
                    const imageId of galeriaAEliminar
                ) {
                    const deleteResponse =
                        await fetch(
                            `/api/admin/shop/products/${id}/images`,
                            {
                                method: "DELETE",

                                credentials: "include",

                                headers: {
                                    "Content-Type":
                                        "application/json",
                                },

                                body: JSON.stringify({
                                    imageId,
                                }),
                            }
                        );

                    const deleteJson =
                        await deleteResponse
                            .json()
                            .catch(() => null);

                    if (
                        !deleteResponse.ok ||
                        !deleteJson?.ok
                    ) {
                        throw new Error(
                            deleteJson?.error ||
                            "No se pudo eliminar una imagen de la galería."
                        );
                    }
                }


                /* ============================================================
                   GALERÍA - SUBIR NUEVAS IMÁGENES
                ============================================================ */

                if (
                    nuevasGaleria.length > 0
                ) {
                    const galleryFormData =
                        new FormData();

                    nuevasGaleria.forEach(
                        (file) => {
                            galleryFormData.append(
                                "images",
                                file
                            );
                        }
                    );

                    const galleryResponse =
                        await fetch(
                            `/api/admin/shop/products/${id}/images`,
                            {
                                method: "POST",

                                credentials: "include",

                                body:
                                    galleryFormData,
                            }
                        );

                    const galleryJson =
                        await galleryResponse
                            .json()
                            .catch(() => null);

                    if (
                        !galleryResponse.ok ||
                        !galleryJson?.ok
                    ) {
                        throw new Error(
                            galleryJson?.error ||
                            "El producto se actualizó, pero no se pudieron guardar las imágenes de la galería."
                        );
                    }
                }

                router.push(
                    "/admin/shop"
                );

                router.refresh();

            } catch (err) {
                console.error(err);

                setError(
                    err instanceof Error
                        ? err.message
                        : "No se pudo actualizar el producto."
                );

            } finally {
                setGuardando(
                    false
                );
            }
        };

    /* ============================================================
       LOADING
    ============================================================ */

    if (cargando) {
        return (
            <main className="min-h-screen bg-[#050608] text-slate-50">
                <div className="mx-auto flex max-w-5xl items-center justify-center px-4 py-24 text-sm text-slate-400">
                    Cargando producto...
                </div>
            </main>
        );
    }

    /* ============================================================
       ERROR INICIAL
    ============================================================ */

    if (
        error &&
        !nombre
    ) {
        return (
            <main className="min-h-screen bg-[#050608] text-slate-50">
                <div className="mx-auto max-w-5xl px-4 py-12">

                    <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-6">
                        <p className="text-sm font-semibold text-red-200">
                            {error}
                        </p>

                        <Link
                            href="/admin/shop"
                            className="mt-5 inline-flex text-xs font-semibold text-orange-300 hover:text-orange-200"
                        >
                            ← Volver a Baruk Shop
                        </Link>
                    </div>

                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[#050608] text-slate-50">

            <div className="mx-auto max-w-5xl px-4 py-8 md:py-12">

                {/* =================================================
                    HEADER
                ================================================= */}

                <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">

                    <div>

                        <Link
                            href="/admin/shop"
                            className="text-xs font-semibold text-slate-400 transition hover:text-orange-300"
                        >
                            ← Baruk Shop
                        </Link>

                        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-orange-400">
                            Baruk593 • Admin
                        </p>

                        <h1 className="mt-2 text-3xl font-extrabold md:text-4xl">
                            Editar producto
                        </h1>

                        <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">
                            Actualiza la información,
                            precio, inventario,
                            publicación e imagen del
                            producto.
                        </p>

                    </div>

                    {slug && (
                        <Link
                            href={`/tienda/${slug}`}
                            target="_blank"
                            className="inline-flex items-center justify-center rounded-full border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-200 transition hover:border-orange-500 hover:text-orange-200"
                        >
                            Ver producto ↗
                        </Link>
                    )}

                </header>

                {/* =================================================
                    ERROR
                ================================================= */}

                {error && (
                    <div className="mt-7 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                        {error}
                    </div>
                )}

                {/* =================================================
                    FORM
                ================================================= */}

                <form
                    onSubmit={onSubmit}
                    className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]"
                >

                    {/* =============================================
                        IZQUIERDA
                    ============================================= */}

                    <div className="space-y-6">

                        {/* INFORMACIÓN */}

                        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 md:p-6">

                            <h2 className="text-sm font-semibold text-white">
                                Información del producto
                            </h2>

                            <div className="mt-5 grid gap-5 sm:grid-cols-2">

                                <div className="sm:col-span-2">

                                    <label className="text-xs text-slate-300">
                                        Nombre *
                                    </label>

                                    <input
                                        value={nombre}
                                        onChange={(event) =>
                                            setNombre(
                                                event.target.value
                                            )
                                        }
                                        className="mt-2 min-h-[44px] w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-sm text-white outline-none focus:border-orange-500"
                                    />

                                </div>

                                <div className="sm:col-span-2">

                                    <label className="text-xs text-slate-300">
                                        Slug
                                    </label>

                                    <input
                                        value={slug}
                                        onChange={(event) =>
                                            setSlug(
                                                event.target.value
                                            )
                                        }
                                        className="mt-2 min-h-[44px] w-full rounded-xl border border-slate-700 bg-slate-950 px-4 font-mono text-xs text-slate-200 outline-none focus:border-orange-500"
                                    />

                                    <p className="mt-2 text-[10px] text-slate-500">
                                        URL pública: /tienda/{slug || "..."}
                                    </p>

                                </div>

                                <div className="sm:col-span-2">

                                    <label className="text-xs text-slate-300">
                                        Descripción corta
                                    </label>

                                    <textarea
                                        value={
                                            descripcionCorta
                                        }
                                        onChange={(event) =>
                                            setDescripcionCorta(
                                                event.target.value
                                            )
                                        }
                                        rows={3}
                                        className="mt-2 w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-orange-500"
                                    />

                                </div>

                                <div className="sm:col-span-2">

                                    <label className="text-xs text-slate-300">
                                        Descripción completa
                                    </label>

                                    <textarea
                                        value={
                                            descripcion
                                        }
                                        onChange={(event) =>
                                            setDescripcion(
                                                event.target.value
                                            )
                                        }
                                        rows={7}
                                        className="mt-2 w-full resize-y rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm leading-6 text-white outline-none focus:border-orange-500"
                                    />

                                </div>

                            </div>

                        </section>

                        {/* PRECIO / INVENTARIO */}

                        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 md:p-6">

                            <h2 className="text-sm font-semibold text-white">
                                Precio e inventario
                            </h2>

                            <div className="mt-5 grid gap-5 sm:grid-cols-2">

                                <div>

                                    <label className="text-xs text-slate-300">
                                        Precio *
                                    </label>

                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={precio}
                                        onChange={(event) =>
                                            setPrecio(
                                                event.target.value
                                            )
                                        }
                                        className="mt-2 min-h-[44px] w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-sm text-white outline-none focus:border-orange-500"
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
                                        onChange={(event) =>
                                            setPrecioAnterior(
                                                event.target.value
                                            )
                                        }
                                        placeholder="Opcional"
                                        className="mt-2 min-h-[44px] w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-sm text-white outline-none focus:border-orange-500"
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
                                        value={stock}
                                        onChange={(event) =>
                                            setStock(
                                                event.target.value
                                            )
                                        }
                                        className="mt-2 min-h-[44px] w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-sm text-white outline-none focus:border-orange-500"
                                    />

                                </div>

                                <div>

                                    <label className="text-xs text-slate-300">
                                        SKU
                                    </label>

                                    <input
                                        value={sku}
                                        onChange={(event) =>
                                            setSku(
                                                event.target.value
                                            )
                                        }
                                        className="mt-2 min-h-[44px] w-full rounded-xl border border-slate-700 bg-slate-950 px-4 font-mono text-xs text-white outline-none focus:border-orange-500"
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
                                        onChange={(event) =>
                                            setCategoryId(
                                                event.target.value
                                            )
                                        }
                                        className="mt-2 min-h-[44px] w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-xs text-white outline-none focus:border-orange-500"
                                    >
                                        <option value="">
                                            Sin categoría
                                        </option>

                                        {categorias.map(
                                            (categoria) => (
                                                <option
                                                    key={
                                                        categoria.id
                                                    }
                                                    value={
                                                        categoria.id
                                                    }
                                                >
                                                    {categoria.nombre}
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
                                        value={orden}
                                        onChange={(event) =>
                                            setOrden(
                                                event.target.value
                                            )
                                        }
                                        className="mt-2 min-h-[44px] w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-sm text-white outline-none focus:border-orange-500"
                                    />

                                </div>

                            </div>

                        </section>

                    </div>

                    {/* =============================================
                        DERECHA
                    ============================================= */}

                    <aside className="space-y-6">

                        {/* IMAGEN */}

                        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">

                            <h2 className="text-sm font-semibold text-white">
                                Imagen principal
                            </h2>

                            <div className="relative mt-4 aspect-square overflow-hidden rounded-xl border border-slate-700 bg-slate-950">

                                {imagenMostrada &&
                                    !imagenError ? (
                                    <img
                                        src={
                                            imagenMostrada
                                        }
                                        alt={nombre}
                                        onError={() =>
                                            setImagenError(
                                                true
                                            )
                                        }
                                        className="h-full w-full object-contain p-3"
                                    />
                                ) : (
                                    <div className="flex h-full items-center justify-center px-5 text-center text-xs text-slate-500">
                                        Sin imagen principal
                                    </div>
                                )}

                            </div>

                            <input
                                type="file"
                                accept="image/webp,image/png,image/jpeg"
                                onChange={
                                    seleccionarImagen
                                }
                                className="mt-4 block w-full text-[10px] text-slate-400 file:mr-3 file:rounded-full file:border-0 file:bg-orange-500 file:px-3 file:py-2 file:text-[10px] file:font-bold file:text-black"
                            />

                            <p className="mt-3 text-[10px] leading-5 text-slate-500">
                                WEBP, PNG o JPG. Máximo 5 MB.
                            </p>

                            {(imagenPrincipal ||
                                nuevaImagenPreview) && (
                                    <button
                                        type="button"
                                        onClick={
                                            quitarImagen
                                        }
                                        className="mt-4 text-[10px] font-semibold text-red-300 transition hover:text-red-200"
                                    >
                                        Quitar imagen
                                    </button>
                                )}

                            {eliminarImagen && (
                                <p className="mt-3 text-[10px] text-yellow-300">
                                    La imagen actual se eliminará al guardar los cambios.
                                </p>
                            )}

                        </section>

                        {/* GALERÍA */}

                        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">

                            <div className="flex items-start justify-between gap-4">

                                <div>
                                    <h2 className="text-sm font-semibold text-white">
                                        Galería del producto
                                    </h2>

                                    <p className="mt-1 text-[10px] leading-5 text-slate-500">
                                        Agrega distintos ángulos, accesorios y detalles.
                                    </p>
                                </div>

                                <span className="rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 text-[9px] font-semibold text-slate-400">
                                    {
                                        galeriaImagenes.filter(
                                            (imagen) =>
                                                !galeriaAEliminar.includes(
                                                    imagen.id
                                                )
                                        ).length +
                                        nuevasGaleria.length
                                    }
                                    /{MAX_GALLERY_IMAGES}
                                </span>

                            </div>


                            {/* IMÁGENES EXISTENTES */}

                            <div className="mt-4 grid grid-cols-2 gap-3">

                                {galeriaImagenes
                                    .filter(
                                        (imagen) =>
                                            !galeriaAEliminar.includes(
                                                imagen.id
                                            )
                                    )
                                    .map(
                                        (imagen) => {

                                            const imageUrl =
                                                imagen.image_url;

                                            if (!imageUrl) {
                                                return null;
                                            }

                                            return (
                                                <div
                                                    key={imagen.id}
                                                    className="relative"
                                                >
                                                    <div className="group relative aspect-square overflow-hidden rounded-xl border border-slate-700 bg-slate-950">

                                                        <img
                                                            src={imagen.image_url}
                                                            alt={
                                                                imagen.alt_text ||
                                                                nombre
                                                            }
                                                            className="h-full w-full object-contain p-2"
                                                        />

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                quitarGaleriaExistente(
                                                                    imagen.id
                                                                )
                                                            }
                                                            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/75 text-xs font-bold text-white shadow-lg transition hover:bg-red-500"
                                                            aria-label="Quitar imagen"
                                                        >
                                                            ×
                                                        </button>

                                                    </div>

                                                    <div className="mt-2 flex items-center justify-between gap-2">

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                moverImagenGaleria(
                                                                    imagen.id,
                                                                    "izquierda"
                                                                )
                                                            }
                                                            disabled={
                                                                galeriaImagenes
                                                                    .filter(
                                                                        (item) =>
                                                                            !galeriaAEliminar.includes(
                                                                                item.id
                                                                            )
                                                                    )
                                                                    .findIndex(
                                                                        (item) =>
                                                                            item.id ===
                                                                            imagen.id
                                                                    ) === 0
                                                            }
                                                            className="flex-1 rounded-lg border border-slate-700 bg-slate-950 py-1.5 text-xs text-slate-300 transition hover:border-orange-500 hover:text-orange-300 disabled:cursor-not-allowed disabled:opacity-25"
                                                            title="Mover a la izquierda"
                                                        >
                                                            ←
                                                        </button>

                                                        <span className="text-[9px] font-semibold text-slate-500">
                                                            {galeriaImagenes
                                                                .filter(
                                                                    (item) =>
                                                                        !galeriaAEliminar.includes(
                                                                            item.id
                                                                        )
                                                                )
                                                                .findIndex(
                                                                    (item) =>
                                                                        item.id ===
                                                                        imagen.id
                                                                ) + 1}
                                                        </span>

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                moverImagenGaleria(
                                                                    imagen.id,
                                                                    "derecha"
                                                                )
                                                            }
                                                            disabled={
                                                                galeriaImagenes
                                                                    .filter(
                                                                        (item) =>
                                                                            !galeriaAEliminar.includes(
                                                                                item.id
                                                                            )
                                                                    )
                                                                    .findIndex(
                                                                        (item) =>
                                                                            item.id ===
                                                                            imagen.id
                                                                    ) ===
                                                                galeriaImagenes.filter(
                                                                    (item) =>
                                                                        !galeriaAEliminar.includes(
                                                                            item.id
                                                                        )
                                                                ).length -
                                                                1
                                                            }
                                                            className="flex-1 rounded-lg border border-slate-700 bg-slate-950 py-1.5 text-xs text-slate-300 transition hover:border-orange-500 hover:text-orange-300 disabled:cursor-not-allowed disabled:opacity-25"
                                                            title="Mover a la derecha"
                                                        >
                                                            →
                                                        </button>

                                                    </div>
                                                </div>
                                            );
                                        }
                                    )}


                                {/* NUEVAS */}

                                {nuevasGaleriaPreview.map(
                                    (
                                        preview,
                                        index
                                    ) => (
                                        <div
                                            key={preview}
                                            className="relative aspect-square overflow-hidden rounded-xl border border-orange-500/40 bg-slate-950"
                                        >
                                            <img
                                                src={preview}
                                                alt={`${nombre} ${index + 1}`}
                                                className="h-full w-full object-contain p-2"
                                            />

                                            <span className="absolute bottom-2 left-2 rounded-full bg-orange-500 px-2 py-1 text-[8px] font-black uppercase tracking-wide text-black">
                                                Nueva
                                            </span>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    quitarNuevaGaleria(
                                                        index
                                                    )
                                                }
                                                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/75 text-xs font-bold text-white shadow-lg transition hover:bg-red-500"
                                                aria-label="Quitar imagen"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    )
                                )}

                            </div>


                            {/* GALERÍA VACÍA */}

                            {galeriaImagenes.filter(
                                (imagen) =>
                                    !galeriaAEliminar.includes(
                                        imagen.id
                                    )
                            ).length === 0 &&
                                nuevasGaleria.length === 0 && (

                                    <div className="mt-4 rounded-xl border border-dashed border-slate-700 bg-slate-950/50 px-4 py-8 text-center">

                                        <p className="text-xs font-semibold text-slate-400">
                                            Aún no hay imágenes adicionales
                                        </p>

                                        <p className="mt-1 text-[10px] text-slate-600">
                                            Puedes agregar hasta 7 imágenes.
                                        </p>

                                    </div>
                                )}


                            {/* SELECCIONAR */}

                            <label
                                className="
            mt-4
            flex
            cursor-pointer
            items-center
            justify-center
            rounded-xl
            border
            border-dashed
            border-orange-500/50
            bg-orange-500/5
            px-4
            py-3
            text-[10px]
            font-bold
            text-orange-300
            transition
            hover:border-orange-400
            hover:bg-orange-500/10
        "
                            >
                                + Agregar imágenes

                                <input
                                    type="file"
                                    multiple
                                    accept="image/webp,image/png,image/jpeg"
                                    onChange={
                                        seleccionarGaleria
                                    }
                                    className="hidden"
                                />
                            </label>

                            <p className="mt-3 text-[10px] leading-5 text-slate-500">
                                WEBP, PNG o JPG · Máximo 5 MB cada una · Hasta 7 imágenes adicionales.
                            </p>

                        </section>

                        {/* PUBLICACIÓN */}

                        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">

                            <h2 className="text-sm font-semibold text-white">
                                Publicación
                            </h2>

                            <div className="mt-5 space-y-4">

                                <label className="flex cursor-pointer items-center justify-between gap-4">

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
                                        checked={activo}
                                        onChange={(event) =>
                                            setActivo(
                                                event.target.checked
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
                                        onChange={(event) =>
                                            setDestacado(
                                                event.target.checked
                                            )
                                        }
                                        className="h-4 w-4 accent-orange-500"
                                    />

                                </label>

                                <label className="flex cursor-pointer items-center justify-between gap-4">

                                    <p className="text-xs font-semibold text-slate-200">
                                        Tendencia
                                    </p>

                                    <input
                                        type="checkbox"
                                        checked={
                                            tendencia
                                        }
                                        onChange={(event) =>
                                            setTendencia(
                                                event.target.checked
                                            )
                                        }
                                        className="h-4 w-4 accent-orange-500"
                                    />

                                </label>

                                <label className="flex cursor-pointer items-center justify-between gap-4">

                                    <p className="text-xs font-semibold text-slate-200">
                                        Nuevo
                                    </p>

                                    <input
                                        type="checkbox"
                                        checked={nuevo}
                                        onChange={(event) =>
                                            setNuevo(
                                                event.target.checked
                                            )
                                        }
                                        className="h-4 w-4 accent-orange-500"
                                    />

                                </label>

                            </div>

                            <div className="mt-5 border-t border-slate-800 pt-5">

                                <label className="text-xs text-slate-300">
                                    Etiqueta
                                </label>

                                <input
                                    value={
                                        etiqueta
                                    }
                                    onChange={(event) =>
                                        setEtiqueta(
                                            event.target.value
                                        )
                                    }
                                    placeholder="Ej. Más vendido"
                                    className="mt-2 min-h-[42px] w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-xs text-white outline-none focus:border-orange-500"
                                />

                            </div>

                        </section>

                        {/* GUARDAR */}

                        <button
                            type="submit"
                            disabled={guardando}
                            className={`
                                min-h-[50px]
                                w-full
                                rounded-xl
                                px-5
                                text-sm
                                font-extrabold
                                transition

                                ${guardando
                                    ? "cursor-not-allowed bg-slate-700 text-slate-300"
                                    : "bg-orange-500 text-black hover:bg-orange-400"
                                }
                            `}
                        >
                            {guardando
                                ? "Guardando..."
                                : "Guardar cambios"}
                        </button>

                        <Link
                            href="/admin/shop"
                            className="block text-center text-xs font-semibold text-slate-400 hover:text-white"
                        >
                            Cancelar
                        </Link>

                    </aside>

                </form>

            </div>

        </main>
    );
}