"use client";

import {
    useEffect,
    useMemo,
    useState,
} from "react";

import Link from "next/link";

import {
    supabaseBrowser,
} from "@/lib/supabaseClient";


type ProgramMode =
    | "number"
    | "live_event";


type SorteoItem = {
    id: string;
    name: string;
    totalNumbers: number;
    activityNumber: number | null;
    status: string | null;
};


type PrizeCatalogItem = {
    id: string;
    sorteoId: string;
    sorteoName: string;

    name: string;
    description: string | null;
    type: string;

    imageUrl: string | null;

    cardQuantity: number | null;

    referenceValue: number | null;

    weight: number;

    stockTotal: number;
    stockAssigned: number;
    stockProgrammed: number;
    availableStock: number;

    active: boolean;

    startsAt: string | null;
    endsAt: string | null;
};


type ProgrammedPrize = {
    id: string;

    sorteoId: string;
    sorteoName: string;

    number: number;

    description: string | null;

    status: string;
    mode: ProgramMode;

    eventName: string | null;

    eventStartAt:
    string | null;

    eventEndAt:
    string | null;

    notes: string | null;

    scheduledBy: string | null;

    scheduledAt: string | null;
    lockedAt: string | null;

    assignedAt: string | null;
    revealedAt: string | null;

    cancelledAt: string | null;
    cancelledBy: string | null;

    assignedCardId: string | null;
    assignedOrderId: number | null;

    assignedOwnerUserId: string | null;
    assignedOwnerEmail: string | null;

    createdAt: string | null;
    updatedAt: string | null;

    prize:
    | PrizeCatalogItem
    | null;
};


type ApiResponse = {
    ok: boolean;

    sorteos?: SorteoItem[];

    catalog?: PrizeCatalogItem[];

    programmedPrizes?: ProgrammedPrize[];

    error?: string;
};


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
        new Date(
            value
        );

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
            dateStyle:
                "short",

            timeStyle:
                "short",
        }
    );
}


function formatNumber(
    value: number
) {
    return String(
        value
    ).padStart(
        5,
        "0"
    );
}


function getPrizeTypeLabel(
    type:
        | string
        | null
        | undefined
) {
    switch (type) {

        case "cash":
            return "Efectivo";

        case "physical":
            return "Premio físico";

        case "experience":
            return "Experiencia";

        case "digital_cards":
            return "Experience Pass";

        case "discount":
            return "Beneficio";

        default:
            return "Premio";
    }
}


function getStatusLabel(
    status: string
) {
    switch (
    status
    ) {

        case "scheduled":
            return "Programado";

        case "assigned":
            return "Asignado";

        case "revealed":
            return "Revelado";

        case "delivered":
            return "Entregado";

        case "cancelled":
            return "Cancelado";

        default:
            return status;
    }
}


function getStatusClass(
    status: string
) {
    switch (
    status
    ) {

        case "scheduled":
            return "border-blue-500/40 bg-blue-500/10 text-blue-200";

        case "assigned":
            return "border-violet-500/40 bg-violet-500/10 text-violet-200";

        case "revealed":
            return "border-orange-500/40 bg-orange-500/10 text-orange-200";

        case "delivered":
            return "border-emerald-500/40 bg-emerald-500/10 text-emerald-200";

        case "cancelled":
            return "border-red-500/40 bg-red-500/10 text-red-200";

        default:
            return "border-slate-500/40 bg-slate-500/10 text-slate-300";
    }
}


export default function AdminProgrammedPrizesPage() {

    const [
        loading,
        setLoading,
    ] =
        useState(
            true
        );


    const [
        saving,
        setSaving,
    ] =
        useState(
            false
        );


    const [
        error,
        setError,
    ] =
        useState<
            string | null
        >(
            null
        );


    const [
        success,
        setSuccess,
    ] =
        useState<
            string | null
        >(
            null
        );


    const [
        sorteos,
        setSorteos,
    ] =
        useState<
            SorteoItem[]
        >(
            []
        );


    const [
        catalog,
        setCatalog,
    ] =
        useState<
            PrizeCatalogItem[]
        >(
            []
        );


    const [
        programmedPrizes,
        setProgrammedPrizes,
    ] =
        useState<
            ProgrammedPrize[]
        >(
            []
        );


    const [
        sorteoId,
        setSorteoId,
    ] =
        useState(
            ""
        );


    const [
        prizeId,
        setPrizeId,
    ] =
        useState(
            ""
        );


    const [
        numberValue,
        setNumberValue,
    ] =
        useState(
            ""
        );


    const [
        mode,
        setMode,
    ] =
        useState<
            ProgramMode
        >(
            "number"
        );


    const [
        eventName,
        setEventName,
    ] =
        useState(
            ""
        );

    const [
        eventStartAt,
        setEventStartAt,
    ] =
        useState(
            ""
        );


    const [
        eventEndAt,
        setEventEndAt,
    ] =
        useState(
            ""
        );

    const [
        notes,
        setNotes,
    ] =
        useState(
            ""
        );


    const [
        cancellingId,
        setCancellingId,
    ] =
        useState<
            string | null
        >(
            null
        );


    /*
     * =========================================================
     * TOKEN ADMIN
     * =========================================================
     */

    async function getAccessToken() {

        const {
            data,
            error:
            sessionError,
        } =
            await supabaseBrowser
                .auth
                .getSession();


        if (
            sessionError
        ) {
            throw sessionError;
        }


        if (
            !data.session
        ) {
            throw new Error(
                "No existe una sesión administrativa activa."
            );
        }


        return (
            data
                .session
                .access_token
        );
    }


    /*
     * =========================================================
     * CARGAR DATOS
     * =========================================================
     */

    async function loadData() {

        setLoading(
            true
        );

        setError(
            null
        );


        try {

            const accessToken =
                await getAccessToken();


            const response =
                await fetch(
                    "/api/admin/premios/programados",
                    {
                        method:
                            "GET",

                        headers: {
                            Authorization:
                                `Bearer ${accessToken}`,
                        },

                        cache:
                            "no-store",
                    }
                );


            const data =
                (
                    await response.json()
                ) as ApiResponse;


            if (
                !response.ok ||
                !data.ok
            ) {
                throw new Error(
                    data.error ??
                    "No se pudieron cargar los premios programados"
                );
            }


            const nextSorteos =
                data.sorteos ??
                [];


            const nextCatalog =
                data.catalog ??
                [];


            setSorteos(
                nextSorteos
            );


            setCatalog(
                nextCatalog
            );


            setProgrammedPrizes(
                data.programmedPrizes ??
                []
            );


            /*
             * Selección automática inicial.
             */

            if (
                !sorteoId &&
                nextSorteos.length >
                0
            ) {

                setSorteoId(
                    nextSorteos[
                        0
                    ].id
                );
            }

        } catch (
        err: unknown
        ) {

            setError(
                err instanceof Error
                    ? err.message
                    : "No se pudo cargar el módulo"
            );

        } finally {

            setLoading(
                false
            );
        }
    }


    useEffect(
        () => {
            loadData();
        },
        []
    );


    /*
     * =========================================================
     * PREMIOS DE LA ACTIVIDAD SELECCIONADA
     * =========================================================
     */

    const availablePrizes =
        useMemo(
            () => {

                if (
                    !sorteoId
                ) {
                    return [];
                }


                return catalog.filter(
                    (
                        item
                    ) =>
                        item.sorteoId ===
                        sorteoId
                );

            },
            [
                catalog,
                sorteoId,
            ]
        );


    /*
     * Si cambia el sorteo, limpiar premio seleccionado.
     */

    useEffect(
        () => {

            setPrizeId(
                ""
            );

        },
        [
            sorteoId,
        ]
    );


    const selectedPrize =
        useMemo(
            () => {

                return (
                    availablePrizes.find(
                        (
                            item
                        ) =>
                            item.id ===
                            prizeId
                    ) ??
                    null
                );

            },
            [
                availablePrizes,
                prizeId,
            ]
        );


    const selectedSorteo =
        useMemo(
            () => {

                return (
                    sorteos.find(
                        (
                            item
                        ) =>
                            item.id ===
                            sorteoId
                    ) ??
                    null
                );

            },
            [
                sorteos,
                sorteoId,
            ]
        );


    /*
     * =========================================================
     * PROGRAMAR
     * =========================================================
     */

    async function handleProgramPrize() {

        if (
            saving
        ) {
            return;
        }


        setError(
            null
        );

        setSuccess(
            null
        );


        if (
            !sorteoId
        ) {

            setError(
                "Selecciona una actividad."
            );

            return;
        }


        if (
            !prizeId
        ) {

            setError(
                "Selecciona el premio que deseas programar."
            );

            return;
        }


        const parsedNumber =
            Number(
                numberValue
            );


        if (
            !Number.isInteger(
                parsedNumber
            ) ||
            parsedNumber <
            0
        ) {

            setError(
                "Ingresa un número válido."
            );

            return;
        }


        if (
            mode ===
            "live_event"
        ) {

            if (
                !eventName.trim()
            ) {
                setError(
                    "Ingresa el nombre del evento."
                );

                return;
            }


            if (
                !eventStartAt
            ) {
                setError(
                    "Selecciona la fecha y hora de inicio del evento."
                );

                return;
            }


            if (
                !eventEndAt
            ) {
                setError(
                    "Selecciona la fecha y hora de finalización del evento."
                );

                return;
            }


            const startDate =
                new Date(
                    eventStartAt
                );


            const endDate =
                new Date(
                    eventEndAt
                );


            if (
                endDate.getTime() <=
                startDate.getTime()
            ) {
                setError(
                    "La finalización debe ser posterior al inicio del evento."
                );

                return;
            }
        }


        setSaving(
            true
        );


        try {

            const accessToken =
                await getAccessToken();


            const response =
                await fetch(
                    "/api/admin/premios/programados",
                    {
                        method:
                            "POST",

                        headers: {
                            Authorization:
                                `Bearer ${accessToken}`,

                            "Content-Type":
                                "application/json",
                        },

                        body:
                            JSON.stringify({
                                sorteoId,

                                prizeId,

                                number:
                                    parsedNumber,

                                mode,

                                eventName:
                                    mode === "live_event"
                                        ? eventName.trim()
                                        : null,

                                eventStartAt:
                                    mode === "live_event"
                                        ? new Date(
                                            eventStartAt
                                        ).toISOString()
                                        : null,

                                eventEndAt:
                                    mode === "live_event"
                                        ? new Date(
                                            eventEndAt
                                        ).toISOString()
                                        : null,

                                notes:
                                    notes.trim() ||
                                    null,
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
                    "No se pudo programar el premio"
                );
            }


            setSuccess(
                `Premio programado correctamente para el número ${formatNumber(
                    parsedNumber
                )}.`
            );


            setNumberValue(
                ""
            );

            setPrizeId(
                ""
            );

            setEventName(
                ""
            );

            setEventStartAt(
                ""
            );

            setEventEndAt(
                ""
            );

            setNotes(
                ""
            );

            setMode(
                "number"
            );


            await loadData();

        } catch (
        err: unknown
        ) {

            setError(
                err instanceof Error
                    ? err.message
                    : "No se pudo programar el premio"
            );

        } finally {

            setSaving(
                false
            );
        }
    }


    /*
     * =========================================================
     * CANCELAR
     * =========================================================
     */

    async function cancelProgrammedPrize(
        item: ProgrammedPrize
    ) {

        if (
            cancellingId
        ) {
            return;
        }


        const confirmed =
            window.confirm(
                `¿Cancelar el premio programado para el número ${formatNumber(
                    item.number
                )}?\n\nEl stock reservado volverá a estar disponible.`
            );


        if (
            !confirmed
        ) {
            return;
        }


        setCancellingId(
            item.id
        );

        setError(
            null
        );

        setSuccess(
            null
        );


        try {

            const accessToken =
                await getAccessToken();


            const response =
                await fetch(
                    "/api/admin/premios/programados",
                    {
                        method:
                            "PATCH",

                        headers: {
                            Authorization:
                                `Bearer ${accessToken}`,

                            "Content-Type":
                                "application/json",
                        },

                        body:
                            JSON.stringify({
                                action:
                                    "cancel",

                                programmedPrizeId:
                                    item.id,

                                reason:
                                    "Cancelado desde el panel administrativo",
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
                    "No se pudo cancelar el premio"
                );
            }


            setSuccess(
                `Premio del número ${formatNumber(
                    item.number
                )} cancelado correctamente.`
            );


            await loadData();

        } catch (
        err: unknown
        ) {

            setError(
                err instanceof Error
                    ? err.message
                    : "No se pudo cancelar el premio"
            );

        } finally {

            setCancellingId(
                null
            );
        }
    }


    /*
     * =========================================================
     * UI
     * =========================================================
     */

    return (

        <main className="min-h-screen bg-[#050608] text-slate-50">

            <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 md:py-12">


                {/* =========================================
                    CABECERA
                ========================================= */}

                <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">

                    <div>

                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-400">
                            Baruk593 • Admin
                        </p>


                        <h1 className="mt-2 text-3xl font-extrabold tracking-wide md:text-4xl">
                            Premios programados
                        </h1>


                        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
                            Reserva un premio para un número específico antes de conocer al comprador.
                            El premio queda bloqueado y auditado desde el momento de su programación.
                        </p>

                    </div>


                    <div className="flex flex-wrap gap-2">

                        <button
                            type="button"
                            onClick={
                                loadData
                            }
                            disabled={
                                loading
                            }
                            className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-100 transition hover:border-orange-500 disabled:opacity-50"
                        >
                            Actualizar
                        </button>


                        <Link
                            href="/admin/premios"
                            className="rounded-full border border-orange-500/60 bg-orange-500/10 px-4 py-2 text-xs font-semibold text-orange-200 transition hover:bg-orange-500/20"
                        >
                            ← Premios
                        </Link>

                    </div>

                </header>


                {/* =========================================
                    MENSAJES
                ========================================= */}

                {error && (

                    <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                        {error}
                    </div>

                )}


                {success && (

                    <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                        {success}
                    </div>

                )}


                {/* =========================================
                    FORMULARIO
                ========================================= */}

                <section className="overflow-hidden rounded-3xl border border-orange-500/20 bg-slate-900/70">

                    <div className="h-1 bg-orange-500" />


                    <div className="p-5 md:p-7">

                        <div>

                            <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-400">
                                Nuevo premio especial
                            </p>


                            <h2 className="mt-2 text-2xl font-black text-white">
                                Programar y bloquear
                            </h2>


                            <p className="mt-2 text-xs leading-5 text-slate-400">
                                El número debe estar libre. Una vez que el número sea asignado a un comprador,
                                el premio ya no podrá modificarse ni cancelarse.
                            </p>

                        </div>


                        <div className="mt-7 grid gap-5 lg:grid-cols-2">


                            {/* ACTIVIDAD */}

                            <div>

                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                                    Actividad
                                </label>


                                <select
                                    value={
                                        sorteoId
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setSorteoId(
                                            event.target.value
                                        )
                                    }
                                    className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-orange-500"
                                >

                                    <option value="">
                                        Seleccionar actividad
                                    </option>


                                    {sorteos.map(
                                        (
                                            item
                                        ) => (

                                            <option
                                                key={
                                                    item.id
                                                }
                                                value={
                                                    item.id
                                                }
                                            >
                                                {item.name}
                                            </option>

                                        )
                                    )}

                                </select>

                            </div>


                            {/* PREMIO */}

                            <div>

                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                                    Premio
                                </label>


                                <select
                                    value={
                                        prizeId
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setPrizeId(
                                            event.target.value
                                        )
                                    }
                                    disabled={
                                        !sorteoId
                                    }
                                    className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-orange-500 disabled:opacity-50"
                                >

                                    <option value="">
                                        Seleccionar premio
                                    </option>


                                    {availablePrizes.map(
                                        (
                                            item
                                        ) => (

                                            <option
                                                key={
                                                    item.id
                                                }
                                                value={
                                                    item.id
                                                }
                                                disabled={
                                                    item.availableStock <=
                                                    0
                                                }
                                            >

                                                {item.name}
                                                {" · "}
                                                disponibles: {item.availableStock}

                                            </option>

                                        )
                                    )}

                                </select>

                            </div>


                            {/* MODALIDAD */}

                            <div className="lg:col-span-2">

                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                                    Modalidad
                                </label>


                                <div className="mt-2 grid gap-3 sm:grid-cols-2">


                                    <button
                                        type="button"
                                        onClick={() =>
                                            setMode(
                                                "number"
                                            )
                                        }
                                        className={`rounded-2xl border p-4 text-left transition ${mode ===
                                            "number"
                                            ? "border-orange-500 bg-orange-500/10"
                                            : "border-slate-800 bg-slate-950 hover:border-slate-700"
                                            }`}
                                    >

                                        <p className="text-sm font-black text-white">
                                            Número específico
                                        </p>


                                        <p className="mt-1 text-xs text-slate-500">
                                            Elige manualmente el número que tendrá el premio.
                                        </p>

                                    </button>


                                    <button
                                        type="button"
                                        onClick={() =>
                                            setMode(
                                                "live_event"
                                            )
                                        }
                                        className={`rounded-2xl border p-4 text-left transition ${mode ===
                                            "live_event"
                                            ? "border-orange-500 bg-orange-500/10"
                                            : "border-slate-800 bg-slate-950 hover:border-slate-700"
                                            }`}
                                    >

                                        <p className="text-sm font-black text-white">
                                            Evento en vivo
                                        </p>


                                        <p className="mt-1 text-xs text-slate-500">
                                            Premio especial bloqueado antes de iniciar el evento.
                                        </p>

                                    </button>

                                </div>

                            </div>


                            {/* NÚMERO */}

                            <div>

                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                                    Número ganador
                                </label>


                                <input
                                    type="number"
                                    min={
                                        1
                                    }
                                    max={
                                        selectedSorteo?.totalNumbers ??
                                        undefined
                                    }
                                    value={
                                        numberValue
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setNumberValue(
                                            event.target.value
                                        )
                                    }
                                    placeholder="Ej.: 173"
                                    className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-orange-500"
                                />


                                {numberValue !==
                                    "" &&
                                    Number.isInteger(
                                        Number(
                                            numberValue
                                        )
                                    ) && (

                                        <p className="mt-2 text-xs font-black text-orange-300">
                                            Experience Pass Nº{" "}
                                            {formatNumber(
                                                Number(
                                                    numberValue
                                                )
                                            )}
                                        </p>

                                    )}

                            </div>


                            {/* =========================================
    DATOS DEL EVENTO EN VIVO
========================================= */}

                            {mode ===
                                "live_event" && (
                                    <>

                                        {/* NOMBRE DEL EVENTO */}

                                        <div>

                                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                                                Nombre del evento *
                                            </label>

                                            <input
                                                type="text"
                                                value={
                                                    eventName
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    setEventName(
                                                        event.target.value
                                                    )
                                                }
                                                placeholder="Ej.: Baruk593 Live"
                                                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-orange-500"
                                            />

                                        </div>


                                        {/* INICIO */}

                                        <div>

                                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                                                Inicio del evento *
                                            </label>

                                            <input
                                                type="datetime-local"
                                                value={
                                                    eventStartAt
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    setEventStartAt(
                                                        event.target.value
                                                    )
                                                }
                                                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-orange-500"
                                            />

                                            <p className="mt-2 text-[10px] leading-4 text-slate-500">
                                                Antes de esta fecha el número permanecerá bloqueado.
                                            </p>

                                        </div>


                                        {/* FINALIZACIÓN */}

                                        <div>

                                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                                                Fin del evento *
                                            </label>

                                            <input
                                                type="datetime-local"
                                                value={
                                                    eventEndAt
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    setEventEndAt(
                                                        event.target.value
                                                    )
                                                }
                                                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-orange-500"
                                            />

                                            <p className="mt-2 text-[10px] leading-4 text-slate-500">
                                                Después de esta hora, si el número no salió, volverá a quedar bloqueado.
                                            </p>

                                        </div>

                                    </>
                                )}


                            {/* NOTAS */}

                            <div className="lg:col-span-2">

                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                                    Notas administrativas
                                </label>


                                <textarea
                                    rows={
                                        3
                                    }
                                    value={
                                        notes
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setNotes(
                                            event.target.value
                                        )
                                    }
                                    placeholder="Ej.: Premio anunciado previamente para transmisión del sábado..."
                                    className="mt-2 w-full resize-y rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-orange-500"
                                />

                            </div>

                        </div>


                        {/* =====================================
                            RESUMEN DEL PREMIO
                        ===================================== */}

                        {selectedPrize && (

                            <div className="mt-6 rounded-2xl border border-slate-800 bg-black/20 p-4">

                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">


                                    <div>

                                        <p className="text-[10px] font-black uppercase tracking-wider text-orange-400">
                                            {getPrizeTypeLabel(
                                                selectedPrize.type
                                            )}
                                        </p>


                                        <p className="mt-1 font-black text-white">
                                            {selectedPrize.name}
                                        </p>


                                        {selectedPrize.referenceValue !=
                                            null && (

                                                <p className="mt-1 text-xs text-slate-400">
                                                    Valor referencial: $
                                                    {selectedPrize.referenceValue.toFixed(
                                                        2
                                                    )}
                                                </p>

                                            )}

                                    </div>


                                    <div className="grid grid-cols-3 gap-2 text-center">

                                        <div className="rounded-xl bg-slate-950 px-3 py-2">

                                            <p className="text-[9px] uppercase text-slate-500">
                                                Total
                                            </p>

                                            <p className="mt-1 font-black text-white">
                                                {selectedPrize.stockTotal}
                                            </p>

                                        </div>


                                        <div className="rounded-xl bg-slate-950 px-3 py-2">

                                            <p className="text-[9px] uppercase text-slate-500">
                                                Reservado
                                            </p>

                                            <p className="mt-1 font-black text-blue-300">
                                                {selectedPrize.stockProgrammed}
                                            </p>

                                        </div>


                                        <div className="rounded-xl bg-slate-950 px-3 py-2">

                                            <p className="text-[9px] uppercase text-slate-500">
                                                Disponible
                                            </p>

                                            <p className="mt-1 font-black text-emerald-300">
                                                {selectedPrize.availableStock}
                                            </p>

                                        </div>

                                    </div>

                                </div>

                            </div>

                        )}


                        {/* GUARDAR */}

                        <button
                            type="button"
                            onClick={
                                handleProgramPrize
                            }
                            disabled={
                                saving
                            }
                            className="mt-6 w-full rounded-xl bg-orange-500 px-5 py-3.5 text-sm font-black uppercase tracking-wider text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
                        >

                            {saving
                                ? "Programando..."
                                : "Programar y bloquear premio"}

                        </button>

                    </div>

                </section>


                {/* =========================================
                    HISTORIAL
                ========================================= */}

                <section className="space-y-4">

                    <div className="flex items-center justify-between gap-3">

                        <div>

                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-400">
                                Auditoría
                            </p>


                            <h2 className="mt-1 text-xl font-black text-white">
                                Premios programados
                            </h2>

                        </div>


                        <div className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-black text-slate-300">
                            {programmedPrizes.length}
                        </div>

                    </div>


                    {loading ? (

                        <div className="py-16 text-center text-sm text-slate-500">
                            Cargando premios programados...
                        </div>

                    ) : programmedPrizes.length ===
                        0 ? (

                        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center">

                            <p className="font-semibold text-slate-300">
                                Todavía no existen premios programados.
                            </p>


                            <p className="mt-2 text-xs text-slate-500">
                                El primer premio que programes aparecerá aquí con su historial.
                            </p>

                        </div>

                    ) : (

                        <div className="grid gap-4 lg:grid-cols-2">


                            {programmedPrizes.map(
                                (
                                    item
                                ) => (

                                    <article
                                        key={
                                            item.id
                                        }
                                        className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70"
                                    >

                                        <div className="h-1 bg-orange-500" />


                                        <div className="p-5">


                                            {/* CABECERA */}

                                            <div className="flex items-start justify-between gap-4">

                                                <div>

                                                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-400">
                                                        Experience Pass Nº
                                                    </p>


                                                    <p className="mt-1 text-3xl font-black tracking-wider text-white">
                                                        {formatNumber(
                                                            item.number
                                                        )}
                                                    </p>

                                                </div>


                                                <span
                                                    className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wider ${getStatusClass(
                                                        item.status
                                                    )}`}
                                                >
                                                    {getStatusLabel(
                                                        item.status
                                                    )}
                                                </span>

                                            </div>


                                            {/* PREMIO */}

                                            <div className="mt-5 rounded-xl bg-slate-950/70 p-4">

                                                <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                                                    Premio
                                                </p>


                                                <p className="mt-1 font-black text-white">
                                                    {item.prize?.name ??
                                                        "Premio Baruk593"}
                                                </p>


                                                <p className="mt-1 text-xs text-slate-500">
                                                    {getPrizeTypeLabel(
                                                        item.prize?.type
                                                    )}
                                                </p>

                                            </div>


                                            {/* DATOS */}

                                            <div className="mt-4 grid grid-cols-2 gap-3">

                                                <div className="rounded-xl bg-black/20 p-3">

                                                    <p className="text-[9px] uppercase tracking-wider text-slate-500">
                                                        Modalidad
                                                    </p>


                                                    <p className="mt-1 text-xs font-bold text-slate-200">
                                                        {item.mode ===
                                                            "live_event"
                                                            ? "Evento en vivo"
                                                            : "Número específico"}
                                                    </p>

                                                </div>


                                                <div className="rounded-xl bg-black/20 p-3">

                                                    <p className="text-[9px] uppercase tracking-wider text-slate-500">
                                                        Programado
                                                    </p>


                                                    <p className="mt-1 text-xs font-bold text-slate-200">
                                                        {formatDate(
                                                            item.scheduledAt
                                                        )}
                                                    </p>

                                                </div>

                                            </div>


                                            {item.eventName && (

                                                <div className="mt-3 rounded-xl border border-orange-500/20 bg-orange-500/10 p-3">

                                                    <p className="text-[9px] font-black uppercase tracking-wider text-orange-300/70">
                                                        Evento
                                                    </p>


                                                    <p className="mt-1 text-xs font-black text-orange-200">
                                                        {item.eventName}
                                                    </p>

                                                </div>

                                            )}

                                            {item.mode ===
                                                "live_event" && (

                                                    <div className="mt-3 grid gap-3 sm:grid-cols-2">

                                                        <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3">

                                                            <p className="text-[9px] font-black uppercase tracking-wider text-blue-300/70">
                                                                Inicio del evento
                                                            </p>

                                                            <p className="mt-1 text-xs font-black text-blue-100">
                                                                {formatDate(
                                                                    item.eventStartAt
                                                                )}
                                                            </p>

                                                        </div>


                                                        <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3">

                                                            <p className="text-[9px] font-black uppercase tracking-wider text-blue-300/70">
                                                                Fin del evento
                                                            </p>

                                                            <p className="mt-1 text-xs font-black text-blue-100">
                                                                {formatDate(
                                                                    item.eventEndAt
                                                                )}
                                                            </p>

                                                        </div>

                                                    </div>

                                                )}

                                            {item.assignedOrderId && (

                                                <div className="mt-4 rounded-xl border border-violet-500/20 bg-violet-500/10 p-3">

                                                    <p className="text-[9px] font-black uppercase tracking-wider text-violet-300">
                                                        Ganador asignado
                                                    </p>


                                                    <p className="mt-1 text-xs text-violet-100">
                                                        Pedido #
                                                        {item.assignedOrderId}
                                                    </p>


                                                    {item.assignedOwnerEmail && (

                                                        <p className="mt-1 break-all text-xs text-violet-200/70">
                                                            {item.assignedOwnerEmail}
                                                        </p>

                                                    )}

                                                </div>

                                            )}


                                            {/* HISTORIAL */}

                                            <div className="mt-4 grid grid-cols-3 gap-2">

                                                <div className="rounded-xl bg-black/20 p-3">

                                                    <p className="text-[8px] font-black uppercase tracking-wider text-slate-600">
                                                        Bloqueado
                                                    </p>


                                                    <p className="mt-1 text-[10px] text-slate-300">
                                                        {formatDate(
                                                            item.lockedAt
                                                        )}
                                                    </p>

                                                </div>


                                                <div className="rounded-xl bg-black/20 p-3">

                                                    <p className="text-[8px] font-black uppercase tracking-wider text-slate-600">
                                                        Asignado
                                                    </p>


                                                    <p className="mt-1 text-[10px] text-slate-300">
                                                        {formatDate(
                                                            item.assignedAt
                                                        )}
                                                    </p>

                                                </div>


                                                <div className="rounded-xl bg-black/20 p-3">

                                                    <p className="text-[8px] font-black uppercase tracking-wider text-slate-600">
                                                        Revelado
                                                    </p>


                                                    <p className="mt-1 text-[10px] text-slate-300">
                                                        {formatDate(
                                                            item.revealedAt
                                                        )}
                                                    </p>

                                                </div>

                                            </div>


                                            {/* NOTAS */}

                                            {item.notes && (

                                                <div className="mt-4 border-t border-slate-800 pt-4">

                                                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-600">
                                                        Observaciones
                                                    </p>


                                                    <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-400">
                                                        {item.notes}
                                                    </p>

                                                </div>

                                            )}


                                            {/* CANCELAR */}

                                            {item.status ===
                                                "scheduled" && (

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            cancelProgrammedPrize(
                                                                item
                                                            )
                                                        }
                                                        disabled={
                                                            cancellingId ===
                                                            item.id
                                                        }
                                                        className="mt-5 w-full rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs font-black text-red-200 transition hover:bg-red-500/20 disabled:opacity-50"
                                                    >

                                                        {cancellingId ===
                                                            item.id
                                                            ? "Cancelando..."
                                                            : "Cancelar premio programado"}

                                                    </button>

                                                )}

                                        </div>

                                    </article>

                                )
                            )}

                        </div>

                    )}

                </section>

            </div>

        </main>
    );
}