// app/admin/premios/page.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabaseClient";

type ClaimStatus =
    | "pending_claim"
    | "verified"
    | "scheduled"
    | "delivered"
    | "cancelled";

type InstantPrize = {
    kind: "instant";
    id: string;
    cardId: string | null;
    prizeId: string | null;
    ownerUserId: string | null;
    ownerEmail: string | null;
    ownerName: string | null;
    status: ClaimStatus;
    automaticDelivery: boolean;
    deliveryOrderId: number | null;
    createdAt: string | null;

    verifiedAt: string | null;
    scheduledAt: string | null;
    deliveredAt: string | null;
    notes: string | null;

    prize:
    | {
        id: string;
        name: string;
        description: string | null;
        type: string;
        cardQuantity: number | null;
        referenceValue: number | null;
        imageUrl: string | null;
    }
    | null;
};

type CollectionPrize = {
    kind: "collection";
    id: string;
    ownerUserId: string;
    ownerEmail: string | null;
    status: ClaimStatus;
    uniqueSpheres: number;
    completedAt: string | null;
    createdAt: string | null;

    verifiedAt: string | null;
    scheduledAt: string | null;
    deliveredAt: string | null;
    notes: string | null;

    reward:
    | {
        id: string;
        name: string;
        description: string | null;
        type: string;
        requiredSpheres: number;
    }
    | null;
};

type AdminSummary = {
    total: number;
    pending: number;
    scheduled: number;
    delivered: number;
};

type ApiResponse = {
    ok: boolean;
    summary?: AdminSummary;
    instantPrizes?: InstantPrize[];
    collectionPrizes?: CollectionPrize[];
    error?: string;
};

type FilterType =
    | "all"
    | "instant"
    | "collection";

const STATUS_OPTIONS: {
    value: ClaimStatus;
    label: string;
}[] = [
        {
            value: "pending_claim",
            label: "Pendiente",
        },
        {
            value: "verified",
            label: "Verificado",
        },
        {
            value: "scheduled",
            label: "Programado",
        },
        {
            value: "delivered",
            label: "Entregado",
        },
        {
            value: "cancelled",
            label: "Cancelado",
        },
    ];

function getStatusLabel(
    status: string
) {
    switch (status) {
        case "verified":
            return "Verificado";

        case "scheduled":
            return "Programado";

        case "delivered":
            return "Entregado";

        case "cancelled":
            return "Cancelado";

        default:
            return "Pendiente";
    }
}

function getStatusClass(
    status: string
) {
    switch (status) {
        case "verified":
            return "border-violet-500/40 bg-violet-500/10 text-violet-200";

        case "scheduled":
            return "border-blue-500/40 bg-blue-500/10 text-blue-200";

        case "delivered":
            return "border-emerald-500/40 bg-emerald-500/10 text-emerald-200";

        case "cancelled":
            return "border-red-500/40 bg-red-500/10 text-red-200";

        default:
            return "border-orange-500/40 bg-orange-500/10 text-orange-200";
    }
}

function getPrizeTypeLabel(
    type:
        | string
        | null
        | undefined
) {
    switch (type) {
        case "digital_cards":
            return "Baruk Cards";

        case "cash":
            return "Efectivo";

        case "physical":
            return "Premio físico";

        case "experience":
            return "Experiencia";

        case "discount":
            return "Beneficio";

        default:
            return "Premio";
    }
}

function formatDate(
    value:
        | string
        | null
        | undefined
) {
    if (!value) {
        return "—";
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return value;
    }

    return date.toLocaleString(
        "es-EC",
        {
            dateStyle: "short",
            timeStyle: "short",
        }
    );
}

function noteKey(
    kind:
        | "instant"
        | "collection",
    id: string
) {
    return `${kind}:${id}`;
}

export default function AdminPremiosPage() {
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

    const [
        summary,
        setSummary,
    ] =
        useState<AdminSummary>({
            total: 0,
            pending: 0,
            scheduled: 0,
            delivered: 0,
        });

    const [
        instantPrizes,
        setInstantPrizes,
    ] =
        useState<InstantPrize[]>(
            []
        );

    const [
        collectionPrizes,
        setCollectionPrizes,
    ] =
        useState<
            CollectionPrize[]
        >([]);

    const [
        updatingId,
        setUpdatingId,
    ] =
        useState<string | null>(
            null
        );

    const [
        savingNotesId,
        setSavingNotesId,
    ] =
        useState<string | null>(
            null
        );

    const [
        notesDrafts,
        setNotesDrafts,
    ] =
        useState<
            Record<string, string>
        >({});

    const [
        filter,
        setFilter,
    ] =
        useState<FilterType>(
            "all"
        );

    const [
        search,
        setSearch,
    ] =
        useState("");

    /*
     * =========================================================
     * OBTENER ACCESS TOKEN DEL ADMIN
     * =========================================================
     */

    async function getAccessToken() {
        const {
            data: sessionData,
            error: sessionError,
        } =
            await supabaseBrowser
                .auth
                .getSession();

        if (sessionError) {
            throw sessionError;
        }

        const session =
            sessionData.session;

        if (!session) {
            throw new Error(
                "No existe una sesión administrativa activa."
            );
        }

        return session.access_token;
    }

    /*
     * =========================================================
     * CARGAR PREMIOS
     * =========================================================
     */

    async function loadPrizes() {
        setLoading(true);
        setError(null);

        try {
            const accessToken =
                await getAccessToken();

            const response =
                await fetch(
                    "/api/admin/premios",
                    {
                        method: "GET",

                        headers: {
                            Authorization:
                                `Bearer ${accessToken}`,
                        },

                        cache: "no-store",
                    }
                );

            const data =
                (await response.json()) as ApiResponse;

            if (
                !response.ok ||
                !data.ok
            ) {
                throw new Error(
                    data.error ??
                    "No se pudieron cargar los premios"
                );
            }

            const nextInstant =
                data.instantPrizes ??
                [];

            const nextCollection =
                data.collectionPrizes ??
                [];

            setSummary(
                data.summary ?? {
                    total: 0,
                    pending: 0,
                    scheduled: 0,
                    delivered: 0,
                }
            );

            setInstantPrizes(
                nextInstant
            );

            setCollectionPrizes(
                nextCollection
            );

            /*
             * Preparar borradores de observaciones.
             */
            const initialNotes:
                Record<
                    string,
                    string
                > = {};

            for (
                const item
                of nextInstant
            ) {
                initialNotes[
                    noteKey(
                        "instant",
                        item.id
                    )
                ] =
                    item.notes ??
                    "";
            }

            for (
                const item
                of nextCollection
            ) {
                initialNotes[
                    noteKey(
                        "collection",
                        item.id
                    )
                ] =
                    item.notes ??
                    "";
            }

            setNotesDrafts(
                initialNotes
            );
        } catch (
        err: unknown
        ) {
            setError(
                err instanceof Error
                    ? err.message
                    : "No se pudo cargar el módulo de premios"
            );
        } finally {
            setLoading(false);
        }
    }

    /*
     * =========================================================
     * CAMBIAR ESTADO
     * =========================================================
     */

    async function updateStatus(
        kind:
            | "instant"
            | "collection",
        claimId: string,
        status: ClaimStatus
    ) {
        if (updatingId) {
            return;
        }

        setUpdatingId(
            claimId
        );

        setError(null);

        try {
            const accessToken =
                await getAccessToken();

            const response =
                await fetch(
                    "/api/admin/premios",
                    {
                        method: "PATCH",

                        headers: {
                            Authorization:
                                `Bearer ${accessToken}`,

                            "Content-Type":
                                "application/json",
                        },

                        body:
                            JSON.stringify({
                                kind,
                                claimId,
                                status,
                            }),
                    }
                );

            const data =
                await response.json();

            if (
                !response.ok ||
                !data?.ok
            ) {
                throw new Error(
                    data?.error ??
                    "No se pudo actualizar el premio"
                );
            }

            /*
             * Actualización visual inmediata.
             */
            if (
                kind ===
                "instant"
            ) {
                setInstantPrizes(
                    (
                        current
                    ) =>
                        current.map(
                            (
                                item
                            ) =>
                                item.id ===
                                    claimId
                                    ? {
                                        ...item,

                                        status:

                                            data
                                                .claim
                                                ?.status ??
                                            status,

                                        verifiedAt:
                                            data
                                                .claim
                                                ?.verifiedAt ??
                                            item.verifiedAt,

                                        scheduledAt:
                                            data
                                                .claim
                                                ?.scheduledAt ??
                                            item.scheduledAt,

                                        deliveredAt:
                                            data
                                                .claim
                                                ?.deliveredAt ??
                                            item.deliveredAt,
                                    }
                                    : item
                        )
                );
            } else {
                setCollectionPrizes(
                    (
                        current
                    ) =>
                        current.map(
                            (
                                item
                            ) =>
                                item.id ===
                                    claimId
                                    ? {
                                        ...item,

                                        status:
                                            data
                                                .claim
                                                ?.status ??
                                            status,

                                        verifiedAt:
                                            data
                                                .claim
                                                ?.verifiedAt ??
                                            item.verifiedAt,

                                        scheduledAt:
                                            data
                                                .claim
                                                ?.scheduledAt ??
                                            item.scheduledAt,

                                        deliveredAt:
                                            data
                                                .claim
                                                ?.deliveredAt ??
                                            item.deliveredAt,
                                    }
                                    : item
                        )
                );
            }

            /*
             * Recarga para sincronizar los contadores.
             */
            await loadPrizes();
        } catch (
        err: unknown
        ) {
            setError(
                err instanceof Error
                    ? err.message
                    : "No se pudo actualizar el estado"
            );
        } finally {
            setUpdatingId(
                null
            );
        }
    }

    /*
     * =========================================================
     * GUARDAR OBSERVACIONES
     * =========================================================
     */

    async function saveNotes(
        kind:
            | "instant"
            | "collection",
        claimId: string
    ) {
        const key =
            noteKey(
                kind,
                claimId
            );

        if (savingNotesId) {
            return;
        }

        setSavingNotesId(
            key
        );

        setError(null);

        try {
            const accessToken =
                await getAccessToken();

            const response =
                await fetch(
                    "/api/admin/premios",
                    {
                        method: "PATCH",

                        headers: {
                            Authorization:
                                `Bearer ${accessToken}`,

                            "Content-Type":
                                "application/json",
                        },

                        body:
                            JSON.stringify({
                                kind,
                                claimId,

                                notes:
                                    notesDrafts[
                                    key
                                    ] ?? "",
                            }),
                    }
                );

            const data =
                await response.json();

            if (
                !response.ok ||
                !data?.ok
            ) {
                throw new Error(
                    data?.error ??
                    "No se pudieron guardar las observaciones"
                );
            }

            const savedNotes =
                data.claim
                    ?.notes ??
                null;

            /*
             * Sincronizar también el arreglo principal.
             */
            if (
                kind ===
                "instant"
            ) {
                setInstantPrizes(
                    (
                        current
                    ) =>
                        current.map(
                            (
                                item
                            ) =>
                                item.id ===
                                    claimId
                                    ? {
                                        ...item,
                                        notes:
                                            savedNotes,
                                    }
                                    : item
                        )
                );
            } else {
                setCollectionPrizes(
                    (
                        current
                    ) =>
                        current.map(
                            (
                                item
                            ) =>
                                item.id ===
                                    claimId
                                    ? {
                                        ...item,
                                        notes:
                                            savedNotes,
                                    }
                                    : item
                        )
                );
            }

            setNotesDrafts(
                (
                    current
                ) => ({
                    ...current,

                    [key]:
                        savedNotes ??
                        "",
                })
            );
        } catch (
        err: unknown
        ) {
            setError(
                err instanceof Error
                    ? err.message
                    : "No se pudieron guardar las observaciones"
            );
        } finally {
            setSavingNotesId(
                null
            );
        }
    }

    /*
     * =========================================================
     * CARGA INICIAL
     * =========================================================
     */

    useEffect(() => {
        loadPrizes();
    }, []);

    /*
     * =========================================================
     * FILTRO INSTANTÁNEOS
     * =========================================================
     */

    const filteredInstantPrizes =
        useMemo(
            () => {
                if (
                    filter ===
                    "collection"
                ) {
                    return [];
                }

                const term =
                    search
                        .trim()
                        .toLowerCase();

                if (!term) {
                    return instantPrizes;
                }

                return instantPrizes.filter(
                    (
                        item
                    ) => {
                        const haystack =
                            [
                                item.ownerName,
                                item.ownerEmail,
                                item.prize
                                    ?.name,
                                item.status,
                                item.notes,
                            ]
                                .filter(
                                    Boolean
                                )
                                .join(" ")
                                .toLowerCase();

                        return haystack.includes(
                            term
                        );
                    }
                );
            },
            [
                instantPrizes,
                search,
                filter,
            ]
        );

    /*
     * =========================================================
     * FILTRO COLECCIÓN
     * =========================================================
     */

    const filteredCollectionPrizes =
        useMemo(
            () => {
                if (
                    filter ===
                    "instant"
                ) {
                    return [];
                }

                const term =
                    search
                        .trim()
                        .toLowerCase();

                if (!term) {
                    return collectionPrizes;
                }

                return collectionPrizes.filter(
                    (
                        item
                    ) => {
                        const haystack =
                            [
                                item.ownerEmail,
                                item.reward
                                    ?.name,
                                item.status,
                                item.notes,
                            ]
                                .filter(
                                    Boolean
                                )
                                .join(" ")
                                .toLowerCase();

                        return haystack.includes(
                            term
                        );
                    }
                );
            },
            [
                collectionPrizes,
                search,
                filter,
            ]
        );

    return (
        <main className="min-h-screen bg-[#050608] text-slate-50">
            <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 md:py-12">

                {/* ENCABEZADO */}

                <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-400">
                            Baruk593 • Admin
                        </p>

                        <h1 className="mt-2 text-3xl font-extrabold tracking-wide md:text-4xl">
                            Premios Baruk
                        </h1>

                        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
                            Gestiona los premios instantáneos obtenidos
                            mediante Baruk Cards y los premios especiales
                            por completar la colección de las 7 esferas.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={
                                loadPrizes
                            }
                            disabled={
                                loading
                            }
                            className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-100 transition hover:border-orange-500 hover:text-orange-200 disabled:opacity-50"
                        >
                            Actualizar
                        </button>

                        <Link
                            href="/admin"
                            className="rounded-full border border-orange-500/60 bg-orange-500/10 px-4 py-2 text-xs font-semibold text-orange-200 transition hover:bg-orange-500/20"
                        >
                            ← Panel administrativo
                        </Link>
                    </div>
                </header>

                {/* ERROR */}

                {error && (
                    <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                        {error}

                        {error
                            .toLowerCase()
                            .includes(
                                "sesión"
                            ) && (
                                <div className="mt-3">
                                    <Link
                                        href="/login"
                                        className="text-xs font-bold text-orange-300 underline"
                                    >
                                        Ir al inicio de sesión
                                    </Link>
                                </div>
                            )}
                    </div>
                )}

                {/* RESUMEN */}

                <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                            Premios registrados
                        </p>

                        <p className="mt-3 text-3xl font-black text-white">
                            {summary.total}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-orange-500/30 bg-orange-500/10 p-5">
                        <p className="text-xs font-semibold uppercase tracking-wider text-orange-200">
                            Por gestionar
                        </p>

                        <p className="mt-3 text-3xl font-black text-orange-300">
                            {summary.pending}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-5">
                        <p className="text-xs font-semibold uppercase tracking-wider text-blue-200">
                            Programados
                        </p>

                        <p className="mt-3 text-3xl font-black text-blue-300">
                            {summary.scheduled}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
                        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-200">
                            Entregados
                        </p>

                        <p className="mt-3 text-3xl font-black text-emerald-300">
                            {summary.delivered}
                        </p>
                    </div>
                </section>

                {/* FILTROS */}

                <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() =>
                                    setFilter(
                                        "all"
                                    )
                                }
                                className={`rounded-full px-4 py-2 text-xs font-bold transition ${filter ===
                                        "all"
                                        ? "bg-orange-500 text-black"
                                        : "border border-slate-700 bg-slate-950 text-slate-300 hover:border-orange-500"
                                    }`}
                            >
                                Todos
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    setFilter(
                                        "instant"
                                    )
                                }
                                className={`rounded-full px-4 py-2 text-xs font-bold transition ${filter ===
                                        "instant"
                                        ? "bg-orange-500 text-black"
                                        : "border border-slate-700 bg-slate-950 text-slate-300 hover:border-orange-500"
                                    }`}
                            >
                                Instantáneos
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    setFilter(
                                        "collection"
                                    )
                                }
                                className={`rounded-full px-4 py-2 text-xs font-bold transition ${filter ===
                                        "collection"
                                        ? "bg-orange-500 text-black"
                                        : "border border-slate-700 bg-slate-950 text-slate-300 hover:border-orange-500"
                                    }`}
                            >
                                Colección 7 esferas
                            </button>
                        </div>

                        <input
                            type="search"
                            value={
                                search
                            }
                            onChange={(
                                event
                            ) =>
                                setSearch(
                                    event
                                        .target
                                        .value
                                )
                            }
                            placeholder="Buscar por correo, cliente, premio u observación..."
                            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-orange-500 lg:max-w-sm"
                        />
                    </div>
                </section>

                {/* CARGANDO */}

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="text-center">
                            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-orange-500" />

                            <p className="mt-4 text-sm text-slate-400">
                                Cargando premios...
                            </p>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* =========================================
                            PREMIOS INSTANTÁNEOS
                        ========================================= */}

                        {filter !==
                            "collection" && (
                                <section className="space-y-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-400">
                                                Baruk Cards
                                            </p>

                                            <h2 className="mt-1 text-xl font-black text-white">
                                                Premios instantáneos
                                            </h2>
                                        </div>

                                        <div className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-300">
                                            {
                                                filteredInstantPrizes.length
                                            }
                                        </div>
                                    </div>

                                    {filteredInstantPrizes.length ===
                                        0 ? (
                                        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center">
                                            <p className="font-semibold text-slate-300">
                                                No hay premios instantáneos para mostrar.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="grid gap-4 lg:grid-cols-2">
                                            {filteredInstantPrizes.map(
                                                (
                                                    item
                                                ) => {
                                                    const notesKey =
                                                        noteKey(
                                                            "instant",
                                                            item.id
                                                        );

                                                    return (
                                                        <article
                                                            key={
                                                                item.id
                                                            }
                                                            className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70"
                                                        >
                                                            <div className="h-1 bg-orange-500" />

                                                            <div className="p-5">

                                                                {/* CABECERA */}

                                                                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                                                    <div>
                                                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-400">
                                                                            {getPrizeTypeLabel(
                                                                                item
                                                                                    .prize
                                                                                    ?.type
                                                                            )}
                                                                        </p>

                                                                        <h3 className="mt-2 text-lg font-black text-white">
                                                                            {item
                                                                                .prize
                                                                                ?.name ??
                                                                                "Premio Baruk593"}
                                                                        </h3>

                                                                        <p className="mt-2 text-xs text-slate-400">
                                                                            {item.ownerName ??
                                                                                "Cliente"}
                                                                        </p>

                                                                        <p className="mt-1 break-all text-xs text-slate-500">
                                                                            {item.ownerEmail ??
                                                                                "Sin correo registrado"}
                                                                        </p>
                                                                    </div>

                                                                    <span
                                                                        className={`inline-flex w-fit rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-wider ${getStatusClass(
                                                                            item.status
                                                                        )}`}
                                                                    >
                                                                        {getStatusLabel(
                                                                            item.status
                                                                        )}
                                                                    </span>
                                                                </div>

                                                                {/* DESCRIPCIÓN */}

                                                                {item
                                                                    .prize
                                                                    ?.description && (
                                                                        <p className="mt-4 text-xs leading-5 text-slate-400">
                                                                            {
                                                                                item
                                                                                    .prize
                                                                                    .description
                                                                            }
                                                                        </p>
                                                                    )}

                                                                {/* INFORMACIÓN */}

                                                                <div className="mt-5 grid grid-cols-2 gap-3">
                                                                    <div className="rounded-xl bg-slate-950/70 p-3">
                                                                        <p className="text-[10px] uppercase tracking-wider text-slate-500">
                                                                            Fecha
                                                                        </p>

                                                                        <p className="mt-1 text-xs font-semibold text-slate-200">
                                                                            {formatDate(
                                                                                item.createdAt
                                                                            )}
                                                                        </p>
                                                                    </div>

                                                                    <div className="rounded-xl bg-slate-950/70 p-3">
                                                                        <p className="text-[10px] uppercase tracking-wider text-slate-500">
                                                                            Valor referencial
                                                                        </p>

                                                                        <p className="mt-1 text-xs font-semibold text-slate-200">
                                                                            {item
                                                                                .prize
                                                                                ?.referenceValue !=
                                                                                null
                                                                                ? `$${Number(
                                                                                    item
                                                                                        .prize
                                                                                        .referenceValue
                                                                                ).toFixed(
                                                                                    2
                                                                                )}`
                                                                                : "—"}
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                {/* PREMIO DIGITAL */}

                                                                {item
                                                                    .prize
                                                                    ?.type ===
                                                                    "digital_cards" &&
                                                                    item
                                                                        .prize
                                                                        .cardQuantity && (
                                                                        <div className="mt-4 rounded-xl border border-orange-500/20 bg-orange-500/10 p-3">
                                                                            <p className="text-xs text-orange-200">
                                                                                Entrega digital:{" "}
                                                                                <strong>
                                                                                    +
                                                                                    {
                                                                                        item
                                                                                            .prize
                                                                                            .cardQuantity
                                                                                    }{" "}
                                                                                    Baruk Cards
                                                                                </strong>
                                                                            </p>

                                                                            {item.deliveryOrderId && (
                                                                                <p className="mt-1 text-[10px] text-orange-300/70">
                                                                                    Pedido de entrega #
                                                                                    {
                                                                                        item.deliveryOrderId
                                                                                    }
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                    )}

                                                                {/* ESTADO */}

                                                                <div className="mt-5 border-t border-slate-800 pt-4">
                                                                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                                                        Estado del premio
                                                                    </label>

                                                                    <select
                                                                        value={
                                                                            item.status
                                                                        }
                                                                        disabled={
                                                                            updatingId ===
                                                                            item.id
                                                                        }
                                                                        onChange={(
                                                                            event
                                                                        ) =>
                                                                            updateStatus(
                                                                                "instant",
                                                                                item.id,
                                                                                event
                                                                                    .target
                                                                                    .value as ClaimStatus
                                                                            )
                                                                        }
                                                                        className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-xs font-semibold text-slate-100 outline-none focus:border-orange-500 disabled:opacity-50"
                                                                    >
                                                                        {STATUS_OPTIONS.map(
                                                                            (
                                                                                option
                                                                            ) => (
                                                                                <option
                                                                                    key={
                                                                                        option.value
                                                                                    }
                                                                                    value={
                                                                                        option.value
                                                                                    }
                                                                                >
                                                                                    {
                                                                                        option.label
                                                                                    }
                                                                                </option>
                                                                            )
                                                                        )}
                                                                    </select>

                                                                    {updatingId ===
                                                                        item.id && (
                                                                            <p className="mt-2 text-[10px] text-orange-300">
                                                                                Actualizando...
                                                                            </p>
                                                                        )}
                                                                </div>

                                                                {/* HISTORIAL */}

                                                                <div className="mt-5 grid gap-2 sm:grid-cols-3">
                                                                    <div className="rounded-xl bg-slate-950/70 p-3">
                                                                        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                                                                            Verificado
                                                                        </p>

                                                                        <p className="mt-1 text-[11px] text-slate-300">
                                                                            {formatDate(
                                                                                item.verifiedAt
                                                                            )}
                                                                        </p>
                                                                    </div>

                                                                    <div className="rounded-xl bg-slate-950/70 p-3">
                                                                        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                                                                            Programado
                                                                        </p>

                                                                        <p className="mt-1 text-[11px] text-slate-300">
                                                                            {formatDate(
                                                                                item.scheduledAt
                                                                            )}
                                                                        </p>
                                                                    </div>

                                                                    <div className="rounded-xl bg-slate-950/70 p-3">
                                                                        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                                                                            Entregado
                                                                        </p>

                                                                        <p className="mt-1 text-[11px] text-slate-300">
                                                                            {formatDate(
                                                                                item.deliveredAt
                                                                            )}
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                {/* OBSERVACIONES */}

                                                                <div className="mt-5">
                                                                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                                                        Observaciones administrativas
                                                                    </label>

                                                                    <textarea
                                                                        rows={
                                                                            3
                                                                        }
                                                                        value={
                                                                            notesDrafts[
                                                                            notesKey
                                                                            ] ??
                                                                            ""
                                                                        }
                                                                        onChange={(
                                                                            event
                                                                        ) =>
                                                                            setNotesDrafts(
                                                                                (
                                                                                    current
                                                                                ) => ({
                                                                                    ...current,

                                                                                    [notesKey]:
                                                                                        event
                                                                                            .target
                                                                                            .value,
                                                                                })
                                                                            )
                                                                        }
                                                                        placeholder="Ej.: Cliente contactado. Entrega coordinada para el viernes..."
                                                                        className="mt-2 w-full resize-y rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-xs text-slate-100 outline-none placeholder:text-slate-600 focus:border-orange-500"
                                                                    />

                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            saveNotes(
                                                                                "instant",
                                                                                item.id
                                                                            )
                                                                        }
                                                                        disabled={
                                                                            savingNotesId ===
                                                                            notesKey
                                                                        }
                                                                        className="mt-2 rounded-lg border border-orange-500/50 bg-orange-500/10 px-4 py-2 text-[11px] font-bold text-orange-200 transition hover:bg-orange-500/20 disabled:opacity-50"
                                                                    >
                                                                        {savingNotesId ===
                                                                            notesKey
                                                                            ? "Guardando..."
                                                                            : "Guardar observaciones"}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </article>
                                                    );
                                                }
                                            )}
                                        </div>
                                    )}
                                </section>
                            )}

                        {/* =========================================
                            PREMIOS POR COLECCIÓN
                        ========================================= */}

                        {filter !==
                            "instant" && (
                                <section className="space-y-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-400">
                                                Colección Baruk593
                                            </p>

                                            <h2 className="mt-1 text-xl font-black text-white">
                                                Premios por completar las 7 esferas
                                            </h2>
                                        </div>

                                        <div className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-300">
                                            {
                                                filteredCollectionPrizes.length
                                            }
                                        </div>
                                    </div>

                                    {filteredCollectionPrizes.length ===
                                        0 ? (
                                        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center">
                                            <p className="font-semibold text-slate-300">
                                                Ningún usuario ha completado todavía la colección.
                                            </p>

                                            <p className="mt-2 text-xs text-slate-500">
                                                El reclamo aparecerá aquí automáticamente cuando un usuario complete las 7 esferas.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="grid gap-4 lg:grid-cols-2">
                                            {filteredCollectionPrizes.map(
                                                (
                                                    item
                                                ) => {
                                                    const notesKey =
                                                        noteKey(
                                                            "collection",
                                                            item.id
                                                        );

                                                    return (
                                                        <article
                                                            key={
                                                                item.id
                                                            }
                                                            className="overflow-hidden rounded-2xl border border-orange-500/30 bg-gradient-to-br from-orange-500/10 via-slate-900 to-slate-950"
                                                        >
                                                            <div className="h-1 bg-gradient-to-r from-orange-500 to-orange-300" />

                                                            <div className="p-5">

                                                                {/* CABECERA */}

                                                                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                                                    <div>
                                                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-400">
                                                                            Colección completa
                                                                        </p>

                                                                        <h3 className="mt-2 text-lg font-black text-white">
                                                                            {item
                                                                                .reward
                                                                                ?.name ??
                                                                                "Premio especial Baruk593"}
                                                                        </h3>

                                                                        <p className="mt-2 break-all text-xs text-slate-400">
                                                                            {item.ownerEmail ??
                                                                                "Sin correo registrado"}
                                                                        </p>
                                                                    </div>

                                                                    <span
                                                                        className={`inline-flex w-fit rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-wider ${getStatusClass(
                                                                            item.status
                                                                        )}`}
                                                                    >
                                                                        {getStatusLabel(
                                                                            item.status
                                                                        )}
                                                                    </span>
                                                                </div>

                                                                {/* DESCRIPCIÓN */}

                                                                {item
                                                                    .reward
                                                                    ?.description && (
                                                                        <p className="mt-4 text-xs leading-5 text-slate-400">
                                                                            {
                                                                                item
                                                                                    .reward
                                                                                    .description
                                                                            }
                                                                        </p>
                                                                    )}

                                                                {/* INFORMACIÓN */}

                                                                <div className="mt-5 grid grid-cols-2 gap-3">
                                                                    <div className="rounded-xl bg-black/20 p-3">
                                                                        <p className="text-[10px] uppercase tracking-wider text-slate-500">
                                                                            Esferas
                                                                        </p>

                                                                        <p className="mt-1 text-xl font-black text-orange-300">
                                                                            {
                                                                                item.uniqueSpheres
                                                                            }
                                                                            /
                                                                            {item
                                                                                .reward
                                                                                ?.requiredSpheres ??
                                                                                7}
                                                                        </p>
                                                                    </div>

                                                                    <div className="rounded-xl bg-black/20 p-3">
                                                                        <p className="text-[10px] uppercase tracking-wider text-slate-500">
                                                                            Completada
                                                                        </p>

                                                                        <p className="mt-1 text-xs font-semibold text-slate-200">
                                                                            {formatDate(
                                                                                item.completedAt
                                                                            )}
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                {/* ESTADO */}

                                                                <div className="mt-5 border-t border-slate-800 pt-4">
                                                                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                                                        Estado del premio
                                                                    </label>

                                                                    <select
                                                                        value={
                                                                            item.status
                                                                        }
                                                                        disabled={
                                                                            updatingId ===
                                                                            item.id
                                                                        }
                                                                        onChange={(
                                                                            event
                                                                        ) =>
                                                                            updateStatus(
                                                                                "collection",
                                                                                item.id,
                                                                                event
                                                                                    .target
                                                                                    .value as ClaimStatus
                                                                            )
                                                                        }
                                                                        className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-xs font-semibold text-slate-100 outline-none focus:border-orange-500 disabled:opacity-50"
                                                                    >
                                                                        {STATUS_OPTIONS.map(
                                                                            (
                                                                                option
                                                                            ) => (
                                                                                <option
                                                                                    key={
                                                                                        option.value
                                                                                    }
                                                                                    value={
                                                                                        option.value
                                                                                    }
                                                                                >
                                                                                    {
                                                                                        option.label
                                                                                    }
                                                                                </option>
                                                                            )
                                                                        )}
                                                                    </select>

                                                                    {updatingId ===
                                                                        item.id && (
                                                                            <p className="mt-2 text-[10px] text-orange-300">
                                                                                Actualizando...
                                                                            </p>
                                                                        )}
                                                                </div>

                                                                {/* HISTORIAL */}

                                                                <div className="mt-5 grid gap-2 sm:grid-cols-3">
                                                                    <div className="rounded-xl bg-black/20 p-3">
                                                                        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                                                                            Verificado
                                                                        </p>

                                                                        <p className="mt-1 text-[11px] text-slate-300">
                                                                            {formatDate(
                                                                                item.verifiedAt
                                                                            )}
                                                                        </p>
                                                                    </div>

                                                                    <div className="rounded-xl bg-black/20 p-3">
                                                                        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                                                                            Programado
                                                                        </p>

                                                                        <p className="mt-1 text-[11px] text-slate-300">
                                                                            {formatDate(
                                                                                item.scheduledAt
                                                                            )}
                                                                        </p>
                                                                    </div>

                                                                    <div className="rounded-xl bg-black/20 p-3">
                                                                        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                                                                            Entregado
                                                                        </p>

                                                                        <p className="mt-1 text-[11px] text-slate-300">
                                                                            {formatDate(
                                                                                item.deliveredAt
                                                                            )}
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                {/* OBSERVACIONES */}

                                                                <div className="mt-5">
                                                                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                                                        Observaciones administrativas
                                                                    </label>

                                                                    <textarea
                                                                        rows={
                                                                            3
                                                                        }
                                                                        value={
                                                                            notesDrafts[
                                                                            notesKey
                                                                            ] ??
                                                                            ""
                                                                        }
                                                                        onChange={(
                                                                            event
                                                                        ) =>
                                                                            setNotesDrafts(
                                                                                (
                                                                                    current
                                                                                ) => ({
                                                                                    ...current,

                                                                                    [notesKey]:
                                                                                        event
                                                                                            .target
                                                                                            .value,
                                                                                })
                                                                            )
                                                                        }
                                                                        placeholder="Ej.: Contactar al ganador para coordinar la fecha de la experiencia..."
                                                                        className="mt-2 w-full resize-y rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-xs text-slate-100 outline-none placeholder:text-slate-600 focus:border-orange-500"
                                                                    />

                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            saveNotes(
                                                                                "collection",
                                                                                item.id
                                                                            )
                                                                        }
                                                                        disabled={
                                                                            savingNotesId ===
                                                                            notesKey
                                                                        }
                                                                        className="mt-2 rounded-lg border border-orange-500/50 bg-orange-500/10 px-4 py-2 text-[11px] font-bold text-orange-200 transition hover:bg-orange-500/20 disabled:opacity-50"
                                                                    >
                                                                        {savingNotesId ===
                                                                            notesKey
                                                                            ? "Guardando..."
                                                                            : "Guardar observaciones"}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </article>
                                                    );
                                                }
                                            )}
                                        </div>
                                    )}
                                </section>
                            )}
                    </>
                )}
            </div>
        </main>
    );
}