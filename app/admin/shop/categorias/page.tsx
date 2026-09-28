"use client";

import {
    FormEvent,
    useCallback,
    useEffect,
    useState,
} from "react";

import Link from "next/link";

type Categoria = {
    id: string;
    nombre: string;
    slug: string;
    descripcion: string | null;
    activo: boolean;
    orden: number;
    productos_count: number;
};

type FormCategoria = {
    nombre: string;
    slug: string;
    descripcion: string;
    activo: boolean;
    orden: string;
};

const FORM_INICIAL: FormCategoria = {
    nombre: "",
    slug: "",
    descripcion: "",
    activo: true,
    orden: "0",
};

function slugify(value: string): string {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

export default function CategoriasBarukShopPage() {
    const [categorias, setCategorias] =
        useState<Categoria[]>([]);

    const [cargando, setCargando] =
        useState(true);

    const [guardando, setGuardando] =
        useState(false);

    const [eliminandoId, setEliminandoId] =
        useState<string | null>(null);

    const [error, setError] =
        useState<string | null>(null);

    const [mensaje, setMensaje] =
        useState<string | null>(null);

    const [editandoId, setEditandoId] =
        useState<string | null>(null);

    const [form, setForm] =
        useState<FormCategoria>(FORM_INICIAL);

    const [slugModificado, setSlugModificado] =
        useState(false);

    const cargarCategorias = useCallback(
        async () => {
            try {
                setCargando(true);
                setError(null);

                const response = await fetch(
                    "/api/admin/shop/categories",
                    {
                        method: "GET",
                        credentials: "include",
                        cache: "no-store",
                    }
                );

                const json = await response
                    .json()
                    .catch(() => null);

                if (
                    !response.ok ||
                    !json?.ok
                ) {
                    throw new Error(
                        json?.error ||
                        "No se pudieron cargar las categorías."
                    );
                }

                setCategorias(
                    (json.categorias ?? []) as Categoria[]
                );
            } catch (err) {
                console.error(err);

                setError(
                    err instanceof Error
                        ? err.message
                        : "No se pudieron cargar las categorías."
                );
            } finally {
                setCargando(false);
            }
        },
        []
    );

    useEffect(() => {
        cargarCategorias();
    }, [cargarCategorias]);

    const limpiarFormulario = () => {
        setForm(FORM_INICIAL);
        setEditandoId(null);
        setSlugModificado(false);
        setError(null);
    };

    const cambiarNombre = (
        value: string
    ) => {
        setForm((actual) => ({
            ...actual,
            nombre: value,
            slug: slugModificado
                ? actual.slug
                : slugify(value),
        }));
    };

    const cambiarSlug = (
        value: string
    ) => {
        setSlugModificado(true);

        setForm((actual) => ({
            ...actual,
            slug: slugify(value),
        }));
    };

    const editarCategoria = (
        categoria: Categoria
    ) => {
        setEditandoId(categoria.id);

        setForm({
            nombre: categoria.nombre,
            slug: categoria.slug,
            descripcion:
                categoria.descripcion ?? "",
            activo: categoria.activo,
            orden: String(
                categoria.orden ?? 0
            ),
        });

        setSlugModificado(true);
        setError(null);
        setMensaje(null);

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    };

    const guardarCategoria = async (
        event: FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();

        if (guardando) {
            return;
        }

        setError(null);
        setMensaje(null);

        if (!form.nombre.trim()) {
            setError(
                "Ingresa el nombre de la categoría."
            );
            return;
        }

        const orden =
            Number(form.orden || 0);

        if (
            !Number.isInteger(orden) ||
            orden < 0
        ) {
            setError(
                "El orden debe ser un número entero igual o mayor a 0."
            );
            return;
        }

        try {
            setGuardando(true);

            const url = editandoId
                ? `/api/admin/shop/categories/${editandoId}`
                : "/api/admin/shop/categories";

            const response = await fetch(
                url,
                {
                    method: editandoId
                        ? "PUT"
                        : "POST",

                    credentials: "include",

                    headers: {
                        "Content-Type":
                            "application/json",
                    },

                    body: JSON.stringify({
                        nombre:
                            form.nombre.trim(),

                        slug:
                            form.slug.trim(),

                        descripcion:
                            form.descripcion.trim(),

                        activo:
                            form.activo,

                        orden,
                    }),
                }
            );

            const json = await response
                .json()
                .catch(() => null);

            if (
                !response.ok ||
                !json?.ok
            ) {
                throw new Error(
                    json?.error ||
                    "No se pudo guardar la categoría."
                );
            }

            const estabaEditando =
                Boolean(editandoId);

            limpiarFormulario();

            setMensaje(
                estabaEditando
                    ? "Categoría actualizada correctamente."
                    : "Categoría creada correctamente."
            );

            await cargarCategorias();
        } catch (err) {
            console.error(err);

            setError(
                err instanceof Error
                    ? err.message
                    : "No se pudo guardar la categoría."
            );
        } finally {
            setGuardando(false);
        }
    };

    const cambiarEstado = async (
        categoria: Categoria
    ) => {
        setError(null);
        setMensaje(null);

        try {
            const response = await fetch(
                `/api/admin/shop/categories/${categoria.id}`,
                {
                    method: "PUT",
                    credentials: "include",

                    headers: {
                        "Content-Type":
                            "application/json",
                    },

                    body: JSON.stringify({
                        nombre:
                            categoria.nombre,

                        slug:
                            categoria.slug,

                        descripcion:
                            categoria.descripcion ?? "",

                        activo:
                            !categoria.activo,

                        orden:
                            categoria.orden,
                    }),
                }
            );

            const json = await response
                .json()
                .catch(() => null);

            if (
                !response.ok ||
                !json?.ok
            ) {
                throw new Error(
                    json?.error ||
                    "No se pudo cambiar el estado."
                );
            }

            setMensaje(
                !categoria.activo
                    ? "Categoría activada."
                    : "Categoría desactivada."
            );

            await cargarCategorias();
        } catch (err) {
            console.error(err);

            setError(
                err instanceof Error
                    ? err.message
                    : "No se pudo cambiar el estado."
            );
        }
    };

    const eliminarCategoria = async (
        categoria: Categoria
    ) => {
        if (categoria.productos_count > 0) {
            setError(
                `No puedes eliminar "${categoria.nombre}" porque tiene ` +
                `${categoria.productos_count} producto` +
                `${categoria.productos_count === 1 ? "" : "s"} asociado` +
                `${categoria.productos_count === 1 ? "" : "s"}. ` +
                "Reasigna primero esos productos."
            );

            setMensaje(null);
            return;
        }

        const confirmado =
            window.confirm(
                `¿Eliminar la categoría "${categoria.nombre}"?\n\nEsta acción no se puede deshacer.`
            );

        if (!confirmado) {
            return;
        }

        try {
            setEliminandoId(
                categoria.id
            );

            setError(null);
            setMensaje(null);

            const response = await fetch(
                `/api/admin/shop/categories/${categoria.id}`,
                {
                    method: "DELETE",
                    credentials: "include",
                }
            );

            const json = await response
                .json()
                .catch(() => null);

            if (
                !response.ok ||
                !json?.ok
            ) {
                throw new Error(
                    json?.error ||
                    "No se pudo eliminar la categoría."
                );
            }

            if (
                editandoId ===
                categoria.id
            ) {
                limpiarFormulario();
            }

            setMensaje(
                "Categoría eliminada correctamente."
            );

            await cargarCategorias();
        } catch (err) {
            console.error(err);

            setError(
                err instanceof Error
                    ? err.message
                    : "No se pudo eliminar la categoría."
            );
        } finally {
            setEliminandoId(null);
        }
    };

    const totalProductos =
        categorias.reduce(
            (total, categoria) =>
                total +
                Number(
                    categoria.productos_count ??
                    0
                ),
            0
        );

    const categoriasActivas =
        categorias.filter(
            (categoria) =>
                categoria.activo
        ).length;

    return (
        <main className="min-h-screen bg-[#050608] text-slate-50">
            <div className="mx-auto max-w-6xl px-4 py-8 md:py-12">
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
                            Categorías
                        </h1>

                        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
                            Organiza las categorías de productos disponibles
                            en Baruk Shop.
                        </p>
                    </div>
                </header>

                <section className="mt-8 grid gap-4 sm:grid-cols-3">
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
                        <p className="text-xs text-slate-400">
                            Categorías
                        </p>

                        <p className="mt-2 text-2xl font-extrabold">
                            {categorias.length}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
                        <p className="text-xs text-emerald-300">
                            Activas
                        </p>

                        <p className="mt-2 text-2xl font-extrabold">
                            {categoriasActivas}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-orange-500/30 bg-orange-500/10 p-5">
                        <p className="text-xs text-orange-300">
                            Productos asociados
                        </p>

                        <p className="mt-2 text-2xl font-extrabold">
                            {totalProductos}
                        </p>
                    </div>
                </section>

                {error && (
                    <div className="mt-6 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                        {error}
                    </div>
                )}

                {mensaje && (
                    <div className="mt-6 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                        {mensaje}
                    </div>
                )}

                <div className="mt-8 grid gap-6 lg:grid-cols-[360px_1fr]">
                    <section className="h-fit rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
                        <div className="flex items-center justify-between gap-3">
                            <h2 className="text-sm font-bold">
                                {editandoId
                                    ? "Editar categoría"
                                    : "Nueva categoría"}
                            </h2>

                            {editandoId && (
                                <button
                                    type="button"
                                    onClick={
                                        limpiarFormulario
                                    }
                                    className="text-[11px] font-semibold text-slate-400 transition hover:text-white"
                                >
                                    Cancelar
                                </button>
                            )}
                        </div>

                        <form
                            onSubmit={
                                guardarCategoria
                            }
                            className="mt-5 space-y-5"
                        >
                            <div>
                                <label className="text-xs text-slate-300">
                                    Nombre *
                                </label>

                                <input
                                    value={
                                        form.nombre
                                    }
                                    onChange={(event) =>
                                        cambiarNombre(
                                            event.target.value
                                        )
                                    }
                                    placeholder="Ej. Tecnología"
                                    className="mt-2 min-h-[44px] w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-sm text-white outline-none focus:border-orange-500"
                                />
                            </div>

                            <div>
                                <label className="text-xs text-slate-300">
                                    Slug
                                </label>

                                <input
                                    value={
                                        form.slug
                                    }
                                    onChange={(event) =>
                                        cambiarSlug(
                                            event.target.value
                                        )
                                    }
                                    placeholder="tecnologia"
                                    className="mt-2 min-h-[44px] w-full rounded-xl border border-slate-700 bg-slate-950 px-4 font-mono text-xs text-slate-200 outline-none focus:border-orange-500"
                                />

                                <p className="mt-2 text-[10px] text-slate-500">
                                    Se genera automáticamente a partir del nombre.
                                </p>
                            </div>

                            <div>
                                <label className="text-xs text-slate-300">
                                    Descripción
                                </label>

                                <textarea
                                    value={
                                        form.descripcion
                                    }
                                    onChange={(event) =>
                                        setForm(
                                            (
                                                actual
                                            ) => ({
                                                ...actual,
                                                descripcion:
                                                    event
                                                        .target
                                                        .value,
                                            })
                                        )
                                    }
                                    rows={4}
                                    placeholder="Describe qué productos pertenecen a esta categoría."
                                    className="mt-2 w-full resize-y rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-orange-500"
                                />
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
                                        form.orden
                                    }
                                    onChange={(event) =>
                                        setForm(
                                            (
                                                actual
                                            ) => ({
                                                ...actual,
                                                orden:
                                                    event
                                                        .target
                                                        .value,
                                            })
                                        )
                                    }
                                    className="mt-2 min-h-[44px] w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-sm text-white outline-none focus:border-orange-500"
                                />
                            </div>

                            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3">
                                <div>
                                    <p className="text-xs font-semibold">
                                        Activa
                                    </p>

                                    <p className="mt-1 text-[10px] text-slate-500">
                                        Disponible para asignar a productos.
                                    </p>
                                </div>

                                <input
                                    type="checkbox"
                                    checked={
                                        form.activo
                                    }
                                    onChange={(event) =>
                                        setForm(
                                            (
                                                actual
                                            ) => ({
                                                ...actual,
                                                activo:
                                                    event
                                                        .target
                                                        .checked,
                                            })
                                        )
                                    }
                                    className="h-4 w-4 accent-orange-500"
                                />
                            </label>

                            <button
                                type="submit"
                                disabled={
                                    guardando
                                }
                                className={`min-h-[48px] w-full rounded-xl px-5 text-sm font-extrabold transition ${guardando
                                        ? "cursor-not-allowed bg-slate-700 text-slate-300"
                                        : "bg-orange-500 text-black hover:bg-orange-400"
                                    }`}
                            >
                                {guardando
                                    ? "Guardando..."
                                    : editandoId
                                        ? "Guardar cambios"
                                        : "+ Crear categoría"}
                            </button>
                        </form>
                    </section>

                    <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
                        <div className="border-b border-slate-800 px-5 py-4">
                            <h2 className="text-sm font-bold">
                                Categorías de Baruk Shop
                            </h2>
                        </div>

                        {cargando ? (
                            <div className="px-5 py-12 text-center text-sm text-slate-400">
                                Cargando categorías...
                            </div>
                        ) : categorias.length ===
                            0 ? (
                            <div className="px-5 py-12 text-center">
                                <p className="text-sm font-semibold">
                                    Todavía no hay categorías.
                                </p>

                                <p className="mt-2 text-xs text-slate-500">
                                    Crea la primera categoría desde el formulario.
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-800">
                                {categorias.map(
                                    (
                                        categoria
                                    ) => (
                                        <article
                                            key={
                                                categoria.id
                                            }
                                            className="p-5"
                                        >
                                            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <h3 className="font-bold text-white">
                                                            {
                                                                categoria.nombre
                                                            }
                                                        </h3>

                                                        <span
                                                            className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${categoria.activo
                                                                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                                                                    : "border-slate-700 bg-slate-800 text-slate-400"
                                                                }`}
                                                        >
                                                            {categoria.activo
                                                                ? "Activa"
                                                                : "Inactiva"}
                                                        </span>
                                                    </div>

                                                    <p className="mt-2 font-mono text-[11px] text-slate-500">
                                                        /
                                                        {
                                                            categoria.slug
                                                        }
                                                    </p>

                                                    {categoria.descripcion && (
                                                        <p className="mt-2 max-w-xl text-xs leading-5 text-slate-400">
                                                            {
                                                                categoria.descripcion
                                                            }
                                                        </p>
                                                    )}

                                                    <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-slate-500">
                                                        <span>
                                                            Productos:{" "}
                                                            <strong className="text-slate-300">
                                                                {
                                                                    categoria.productos_count
                                                                }
                                                            </strong>
                                                        </span>

                                                        <span>
                                                            Orden:{" "}
                                                            <strong className="text-slate-300">
                                                                {
                                                                    categoria.orden
                                                                }
                                                            </strong>
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            editarCategoria(
                                                                categoria
                                                            )
                                                        }
                                                        className="rounded-full border border-slate-700 px-3 py-2 text-[11px] font-semibold text-slate-200 transition hover:border-orange-500 hover:text-orange-300"
                                                    >
                                                        Editar
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            cambiarEstado(
                                                                categoria
                                                            )
                                                        }
                                                        className="rounded-full border border-slate-700 px-3 py-2 text-[11px] font-semibold text-slate-300 transition hover:border-slate-500 hover:text-white"
                                                    >
                                                        {categoria.activo
                                                            ? "Desactivar"
                                                            : "Activar"}
                                                    </button>

                                                    <button
                                                        type="button"
                                                        disabled={
                                                            eliminandoId ===
                                                            categoria.id
                                                        }
                                                        onClick={() =>
                                                            eliminarCategoria(
                                                                categoria
                                                            )
                                                        }
                                                        className="rounded-full border border-red-500/30 px-3 py-2 text-[11px] font-semibold text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        {eliminandoId ===
                                                            categoria.id
                                                            ? "Eliminando..."
                                                            : "Eliminar"}
                                                    </button>
                                                </div>
                                            </div>
                                        </article>
                                    )
                                )}
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </main>
    );
}