"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import Link from "next/link";


type GiftRow = {
    id: string;
    pedidoId: number | null;
    buyerName: string;
    recipientName: string;
    recipientEmail: string | null;
    recipientPhone: string;
    message: string | null;
    giftStatus: string | null;
    claimed: boolean;
    claimedAt: string | null;
    whatsappStatus: string;
    whatsappMessageSid: string | null;
    whatsappErrorCode: string | null;
    whatsappErrorMessage: string | null;
    whatsappStatusUpdatedAt: string | null;
    sentAt: string | null;
    deliveredAt: string | null;
    readAt: string | null;
    failedAt: string | null;
    createdAt: string | null;
    quantity: number;
    orderStatus: string | null;
    paymentMethod: string | null;
    total: number;
    claimUrl: string | null;
};


type Summary = {
    total: number;
    read: number;
    delivered: number;
    undelivered: number;
    failed: number;
    pendingClaim: number;
};


type Filter =
    | "all"
    | "read"
    | "delivered"
    | "sent"
    | "queued"
    | "undelivered"
    | "failed";


const EMPTY_SUMMARY:
    Summary = {
    total: 0,
    read: 0,
    delivered: 0,
    undelivered: 0,
    failed: 0,
    pendingClaim: 0,
};


function formatDate(
    value:
        | string
        | null
        | undefined
): string {

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
        return "—";
    }

    return new Intl
        .DateTimeFormat(
            "es-EC",
            {
                dateStyle:
                    "short",

                timeStyle:
                    "short",
            }
        )
        .format(
            date
        );
}


function formatMoney(
    value: number
): string {

    return new Intl
        .NumberFormat(
            "en-US",
            {
                style:
                    "currency",

                currency:
                    "USD",
            }
        )
        .format(
            Number(
                value ??
                0
            )
        );
}


function whatsappBadge(
    status: string,
    hasRealTracking: boolean
) {

    switch (
    status
    ) {

        case "read":
            return {
                label:
                    "✓ Leído",

                className:
                    "border-emerald-200 bg-emerald-50 text-emerald-700",
            };

        case "delivered":
            return {
                label:
                    "✓ Entregado",

                className:
                    "border-green-200 bg-green-50 text-green-700",
            };

        case "sent":
            return {
                label:
                    hasRealTracking
                        ? "Enviado"
                        : "Enviado · Sin seguimiento histórico",

                className:
                    hasRealTracking
                        ? "border-sky-200 bg-sky-50 text-sky-700"
                        : "border-slate-200 bg-slate-50 text-slate-600",
            };

        case "queued":
        case "accepted":
        case "sending":
            return {
                label:
                    "Procesando",

                className:
                    "border-amber-200 bg-amber-50 text-amber-700",
            };

        case "undelivered":
            return {
                label:
                    "⚠ No entregado",

                className:
                    "border-orange-200 bg-orange-50 text-orange-700",
            };

        case "failed":
            return {
                label:
                    "✕ Fallido",

                className:
                    "border-red-200 bg-red-50 text-red-700",
            };

        default:
            return {
                label:
                    "Pendiente",

                className:
                    "border-slate-200 bg-slate-50 text-slate-600",
            };
    }
}


export default function AdminRegalosPage() {

    const [
        rows,
        setRows,
    ] =
        useState<GiftRow[]>(
            []
        );

    const [
        summary,
        setSummary,
    ] =
        useState<Summary>(
            EMPTY_SUMMARY
        );

    const [
        loading,
        setLoading,
    ] =
        useState(
            true
        );

    const [
        error,
        setError,
    ] =
        useState<string | null>(
            null
        );

    const [
        filter,
        setFilter,
    ] =
        useState<Filter>(
            "all"
        );

    const [
        search,
        setSearch,
    ] =
        useState(
            ""
        );

    const [
        copiedId,
        setCopiedId,
    ] =
        useState<string | null>(
            null
        );


    const loadGifts =
        useCallback(
            async () => {

                setLoading(
                    true
                );

                setError(
                    null
                );

                try {

                    const params =
                        new URLSearchParams();

                    params.set(
                        "status",
                        filter
                    );

                    params.set(
                        "limit",
                        "300"
                    );

                    const response =
                        await fetch(
                            `/api/admin/regalos?${params.toString()}`,
                            {
                                method:
                                    "GET",

                                credentials:
                                    "include",

                                cache:
                                    "no-store",
                            }
                        );

                    const data =
                        await response
                            .json()
                            .catch(
                                () =>
                                    null
                            );

                    if (
                        !response.ok ||
                        !data?.ok
                    ) {

                        throw new Error(
                            data
                                ?.error ??
                            "No se pudieron cargar los regalos."
                        );
                    }

                    setRows(
                        Array.isArray(
                            data.rows
                        )
                            ? data.rows
                            : []
                    );

                    setSummary({
                        ...EMPTY_SUMMARY,
                        ...(
                            data.summary ??
                            {}
                        ),
                    });

                } catch (
                err:
                    unknown
                ) {

                    setRows(
                        []
                    );

                    setSummary(
                        EMPTY_SUMMARY
                    );

                    setError(
                        err instanceof
                            Error

                            ? err.message

                            : "No se pudieron cargar los regalos."
                    );

                } finally {

                    setLoading(
                        false
                    );
                }
            },
            [
                filter,
            ]
        );


    useEffect(
        () => {

            void loadGifts();

        },
        [
            loadGifts,
        ]
    );


    async function reauthenticate() {

        const secret =
            window.prompt(
                "Ingresa tu ADMIN SECRET para reautenticar:"
            );

        if (!secret) {
            return;
        }

        setError(
            null
        );

        try {

            const response =
                await fetch(
                    "/api/admin/login",
                    {
                        method:
                            "POST",

                        credentials:
                            "include",

                        headers: {
                            "Content-Type":
                                "application/json",
                        },

                        body:
                            JSON.stringify({
                                secret,
                            }),
                    }
                );

            const data =
                await response
                    .json()
                    .catch(
                        () =>
                            null
                    );

            if (
                !response.ok ||
                !data?.ok
            ) {

                throw new Error(
                    data
                        ?.error ??
                    "No se pudo iniciar la sesión administrativa."
                );
            }

            await loadGifts();

        } catch (
        err:
            unknown
        ) {

            setError(
                err instanceof
                    Error

                    ? err.message

                    : "No se pudo iniciar la sesión administrativa."
            );
        }
    }


    async function copyClaimUrl(
        row: GiftRow
    ) {

        if (
            !row.claimUrl
        ) {
            return;
        }

        try {

            await navigator
                .clipboard
                .writeText(
                    row.claimUrl
                );

            setCopiedId(
                row.id
            );

            window.setTimeout(
                () => {

                    setCopiedId(
                        (
                            current
                        ) =>
                            current ===
                                row.id

                                ? null

                                : current
                    );
                },
                1800
            );

        } catch {

            window.prompt(
                "Copia el enlace del regalo:",
                row.claimUrl
            );
        }
    }


    const visibleRows =
        useMemo(
            () => {

                const term =
                    search
                        .trim()
                        .toLowerCase();

                if (!term) {
                    return rows;
                }

                return rows.filter(
                    (
                        row
                    ) => {

                        const haystack =
                            [
                                row.pedidoId,
                                row.recipientName,
                                row.recipientPhone,
                                row.recipientEmail,
                                row.buyerName,
                                row.whatsappStatus,
                                row.whatsappErrorCode,
                            ]
                                .map(
                                    (
                                        value
                                    ) =>
                                        String(
                                            value ??
                                            ""
                                        )
                                            .toLowerCase()
                                )
                                .join(
                                    " "
                                );

                        return haystack
                            .includes(
                                term
                            );
                    }
                );
            },
            [
                rows,
                search,
            ]
        );


    return (

        <main className="min-h-screen bg-[#f7f7f7] text-[#121212]">

            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

                <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

                    <div>

                        <p className="text-xs font-black uppercase tracking-[0.22em] text-[#f36b21]">
                            BARUK593 · ADMIN
                        </p>

                        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                            Entregas de regalos
                        </h1>

                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                            Consulta el estado real de WhatsApp y recupera el enlace de reclamación cuando una notificación no pueda ser entregada.
                        </p>

                    </div>

                    <div className="flex flex-wrap gap-2">

                        <Link
                            href="/admin"
                            className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50"
                        >
                            ← Volver
                        </Link>

                        <button
                            type="button"
                            onClick={
                                () =>
                                    void loadGifts()
                            }
                            className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50"
                        >
                            Actualizar
                        </button>

                    </div>

                </header>


                <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">

                    <Kpi
                        label="Regalos"
                        value={
                            summary.total
                        }
                    />

                    <Kpi
                        label="Leídos"
                        value={
                            summary.read
                        }
                        accent="text-emerald-600"
                    />

                    <Kpi
                        label="Entregados"
                        value={
                            summary.delivered
                        }
                        accent="text-green-600"
                    />

                    <Kpi
                        label="No entregados"
                        value={
                            summary.undelivered +
                            summary.failed
                        }
                        accent="text-red-600"
                    />

                    <Kpi
                        label="Por reclamar"
                        value={
                            summary.pendingClaim
                        }
                        accent="text-[#f36b21]"
                    />

                </section>


                <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">

                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">

                        <div className="flex flex-wrap gap-2">

                            {(
                                [
                                    [
                                        "all",
                                        "Todos",
                                    ],
                                    [
                                        "read",
                                        "Leídos",
                                    ],
                                    [
                                        "delivered",
                                        "Entregados",
                                    ],
                                    [
                                        "sent",
                                        "Enviados",
                                    ],
                                    [
                                        "undelivered",
                                        "No entregados",
                                    ],
                                    [
                                        "failed",
                                        "Fallidos",
                                    ],
                                ] as Array<
                                    [
                                        Filter,
                                        string
                                    ]
                                >
                            ).map(
                                (
                                    [
                                        value,
                                        label,
                                    ]
                                ) => (

                                    <button
                                        key={
                                            value
                                        }
                                        type="button"
                                        onClick={
                                            () =>
                                                setFilter(
                                                    value
                                                )
                                        }
                                        className={
                                            [
                                                "rounded-full border px-3 py-2 text-xs font-black transition",
                                                filter ===
                                                    value
                                                    ? "border-[#171717] bg-[#171717] text-white"
                                                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-400",
                                            ]
                                                .join(
                                                    " "
                                                )
                                        }
                                    >
                                        {label}
                                    </button>
                                )
                            )}

                        </div>

                        <input
                            value={
                                search
                            }
                            onChange={
                                (
                                    event
                                ) =>
                                    setSearch(
                                        event
                                            .target
                                            .value
                                    )
                            }
                            placeholder="Buscar pedido, nombre, teléfono..."
                            className="min-h-[44px] w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-[#f36b21] lg:max-w-sm"
                        />

                    </div>

                </section>


                {error && (

                    <section className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-5">

                        <p className="font-black text-red-700">
                            ⚠ {error}
                        </p>

                        {error
                            .toLowerCase()
                            .includes(
                                "sesión"
                            ) && (

                                <button
                                    type="button"
                                    onClick={
                                        () =>
                                            void reauthenticate()
                                    }
                                    className="mt-4 rounded-xl bg-[#171717] px-4 py-2.5 text-sm font-black text-white"
                                >
                                    Reautenticar administrador
                                </button>
                            )}

                    </section>
                )}


                <section className="mt-5">

                    {loading ? (

                        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                            Cargando entregas…
                        </div>

                    ) : visibleRows.length ===
                        0 ? (

                        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                            No hay regalos para mostrar.
                        </div>

                    ) : (

                        <div className="space-y-4">

                            {visibleRows.map(
                                (
                                    row
                                ) => {

                                    const hasRealTracking =
                                        Boolean(
                                            row.whatsappMessageSid
                                        );

                                    const badge =
                                        whatsappBadge(
                                            row.whatsappStatus,
                                            hasRealTracking
                                        );

                                    const hasDeliveryError =
                                        row.whatsappStatus ===
                                        "undelivered" ||
                                        row.whatsappStatus ===
                                        "failed";

                                    return (

                                        <article
                                            key={
                                                row.id
                                            }
                                            className={
                                                [
                                                    "overflow-hidden rounded-2xl border bg-white shadow-sm",
                                                    hasDeliveryError
                                                        ? "border-red-200"
                                                        : "border-slate-200",
                                                ]
                                                    .join(
                                                        " "
                                                    )
                                            }
                                        >

                                            <div className="grid gap-5 p-5 lg:grid-cols-[1fr_auto]">

                                                <div className="min-w-0">

                                                    <div className="flex flex-wrap items-center gap-2">

                                                        <span className="text-lg font-black">
                                                            Pedido #
                                                            {
                                                                row.pedidoId ??
                                                                "—"
                                                            }
                                                        </span>

                                                        <span
                                                            className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${badge.className}`}
                                                        >
                                                            {
                                                                badge.label
                                                            }
                                                        </span>

                                                        <span
                                                            className={
                                                                [
                                                                    "rounded-full border px-2.5 py-1 text-[11px] font-black",
                                                                    row.claimed
                                                                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                                                        : "border-slate-200 bg-slate-50 text-slate-600",
                                                                ]
                                                                    .join(
                                                                        " "
                                                                    )
                                                            }
                                                        >
                                                            {
                                                                row.claimed
                                                                    ? "Regalo reclamado"
                                                                    : "Pendiente de reclamar"
                                                            }
                                                        </span>

                                                    </div>


                                                    <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

                                                        <Detail
                                                            label="Destinatario"
                                                            value={
                                                                row.recipientName ||
                                                                "—"
                                                            }
                                                        />

                                                        <Detail
                                                            label="WhatsApp"
                                                            value={
                                                                row.recipientPhone ||
                                                                "—"
                                                            }
                                                        />

                                                        <Detail
                                                            label="Tarjetas"
                                                            value={
                                                                String(
                                                                    row.quantity
                                                                )
                                                            }
                                                        />

                                                        <Detail
                                                            label="Total"
                                                            value={
                                                                formatMoney(
                                                                    row.total
                                                                )
                                                            }
                                                        />

                                                        <Detail
                                                            label="Comprador"
                                                            value={
                                                                row.buyerName ||
                                                                "—"
                                                            }
                                                        />

                                                        <Detail
                                                            label="Enviado"
                                                            value={
                                                                formatDate(
                                                                    row.sentAt
                                                                )
                                                            }
                                                        />

                                                        <Detail
                                                            label="Entregado"
                                                            value={
                                                                formatDate(
                                                                    row.deliveredAt
                                                                )
                                                            }
                                                        />

                                                        <Detail
                                                            label="Leído"
                                                            value={
                                                                formatDate(
                                                                    row.readAt
                                                                )
                                                            }
                                                        />

                                                    </div>


                                                    {hasDeliveryError && (

                                                        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4">

                                                            <p className="text-sm font-black text-red-700">
                                                                WhatsApp no pudo completar la entrega
                                                            </p>

                                                            <p className="mt-1 text-xs leading-5 text-red-700/80">
                                                                Código:{" "}
                                                                <b>
                                                                    {
                                                                        row.whatsappErrorCode ??
                                                                        "sin código"
                                                                    }
                                                                </b>
                                                            </p>

                                                            {row.whatsappErrorMessage && (

                                                                <p className="mt-1 text-xs leading-5 text-red-700/80">
                                                                    {
                                                                        row.whatsappErrorMessage
                                                                    }
                                                                </p>
                                                            )}

                                                            {row.whatsappErrorCode ===
                                                                "63049" && (

                                                                    <p className="mt-2 text-xs font-semibold leading-5 text-red-700">
                                                                        Meta decidió no entregar este mensaje a este destinatario. No se realizará un reintento automático.
                                                                    </p>
                                                                )}

                                                        </div>
                                                    )}

                                                </div>


                                                <div className="flex min-w-[190px] flex-col gap-2">

                                                    <button
                                                        type="button"
                                                        disabled={
                                                            !row.claimUrl
                                                        }
                                                        onClick={
                                                            () =>
                                                                void copyClaimUrl(
                                                                    row
                                                                )
                                                        }
                                                        className="min-h-[44px] rounded-xl bg-[#171717] px-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
                                                    >
                                                        {
                                                            copiedId ===
                                                                row.id

                                                                ? "✓ Enlace copiado"

                                                                : "Copiar enlace del regalo"
                                                        }
                                                    </button>


                                                    {row.claimUrl && (

                                                        <a
                                                            href={
                                                                row.claimUrl
                                                            }
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 hover:bg-slate-50"
                                                        >
                                                            Abrir regalo
                                                        </a>
                                                    )}


                                                    {hasDeliveryError ? (

                                                        <p className="mt-1 text-center text-[10px] leading-4 text-slate-400">
                                                            Los mensajes rechazados por Meta no se reintentan automáticamente.
                                                        </p>

                                                    ) : !hasRealTracking ? (

                                                        <p className="mt-1 text-center text-[10px] leading-4 text-slate-400">
                                                            Este envío es anterior al seguimiento real de Twilio, por eso no hay confirmación de entrega o lectura.
                                                        </p>

                                                    ) : null}

                                                </div>

                                            </div>

                                        </article>
                                    );
                                }
                            )}

                        </div>
                    )}

                </section>

            </div>

        </main>
    );
}


function Kpi({
    label,
    value,
    accent =
    "text-[#171717]",
}: {
    label: string;
    value: number;
    accent?: string;
}) {

    return (

        <div className="rounded-2xl border border-slate-200 bg-white p-5">

            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                {label}
            </p>

            <p className={`mt-2 text-3xl font-black ${accent}`}>
                {value}
            </p>

        </div>
    );
}


function Detail({
    label,
    value,
}: {
    label: string;
    value: string;
}) {

    return (

        <div>

            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                {label}
            </p>

            <p className="mt-1 break-words text-sm font-bold text-slate-700">
                {value}
            </p>

        </div>
    );
}
