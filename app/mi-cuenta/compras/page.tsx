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


type Purchase = {
    id: number;

    createdAt:
    | string
    | null;

    quantity: number;
    unitPrice: number;
    total: number;

    paymentMethod:
    | string
    | null;

    status:
    | string
    | null;

    purchaseType:
    | string
    | null;

    cardsProcessingStatus:
    | string
    | null;

    cards: {
        total: number;

        revealed:
        | number
        | null;

        pending:
        | number
        | null;
    };

    transactionId:
    | string
    | null;
};


type PurchasesSummary = {
    totalPurchases: number;
    paidPurchases: number;
    totalInvested: number;
    totalCardsPurchased: number;
};


type InvoiceSummary = {
    pedidoId: number;

    provider: string;

    environment:
    | "test"
    | "live"
    | string;

    receiptId:
    | string
    | null;

    sequential:
    | string
    | null;

    authorizationNumber:
    | string
    | null;

    status: string;

    total:
    | number
    | null;

    createdAt:
    | string
    | null;

    authorizedAt:
    | string
    | null;
};


type InvoicesResponse = {
    ok: boolean;

    invoices?: InvoiceSummary[];

    error?: string;
};


type InvoiceFileResponse = {
    ok: boolean;

    file?:
    | "pdf"
    | "xml";

    url?:
    | string
    | null;

    previewUrl?:
    | string
    | null;

    error?: string;
};


type PurchasesResponse = {
    ok: boolean;

    purchases?: Purchase[];

    summary?: Partial<
        PurchasesSummary
    >;

    error?: string;
};


type Filter =
    | "all"
    | "paid"
    | "pending";


const EMPTY_SUMMARY:
    PurchasesSummary = {
    totalPurchases: 0,
    paidPurchases: 0,
    totalInvested: 0,
    totalCardsPurchased: 0,
};


function formatMoney(
    value:
        | number
        | null
        | undefined
) {
    const amount =
        Number(
            value ??
            0
        );

    return new Intl.NumberFormat(
        "es-EC",
        {
            style:
                "currency",

            currency:
                "USD",

            minimumFractionDigits:
                2,

            maximumFractionDigits:
                2,
        }
    ).format(
        Number.isFinite(
            amount
        )
            ? amount
            : 0
    );
}


function formatDate(
    value:
        | string
        | null
) {
    if (
        !value
    ) {
        return "Fecha no disponible";
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

    return new Intl.DateTimeFormat(
        "es-EC",
        {
            day:
                "2-digit",

            month:
                "short",

            year:
                "numeric",

            hour:
                "2-digit",

            minute:
                "2-digit",
        }
    ).format(
        date
    );
}


function getStatusInfo(
    status:
        | string
        | null
) {
    const normalized =
        String(
            status ??
            ""
        )
            .trim()
            .toLowerCase();

    if (
        normalized ===
        "pagado" ||
        normalized ===
        "paid"
    ) {
        return {
            label:
                "Pagado",

            className:
                "bg-emerald-50 text-emerald-700 border-emerald-100",
        };
    }

    if (
        normalized ===
        "cancelado" ||
        normalized ===
        "cancelled" ||
        normalized ===
        "canceled"
    ) {
        return {
            label:
                "Cancelado",

            className:
                "bg-red-50 text-red-600 border-red-100",
        };
    }

    if (
        normalized ===
        "fallido" ||
        normalized ===
        "failed"
    ) {
        return {
            label:
                "Fallido",

            className:
                "bg-red-50 text-red-600 border-red-100",
        };
    }

    return {
        label:
            "Pendiente",

        className:
            "bg-amber-50 text-amber-700 border-amber-100",
    };
}


function getPaymentMethodLabel(
    value:
        | string
        | null
) {
    const normalized =
        String(
            value ??
            ""
        )
            .trim()
            .toLowerCase();

    if (
        normalized ===
        "payphone"
    ) {
        return "PayPhone";
    }

    if (
        normalized ===
        "transferencia" ||
        normalized ===
        "bank_transfer"
    ) {
        return "Transferencia";
    }

    if (
        normalized ===
        "wallet" ||
        normalized ===
        "saldo" ||
        normalized ===
        "baruk_wallet"
    ) {
        return "Saldo Baruk593";
    }

    return value
        ? String(
            value
        )
        : "No especificado";
}


function getPurchaseTypeLabel(
    value:
        | string
        | null
) {
    if (
        value ===
        "gift"
    ) {
        return "Regalo";
    }

    return "Compra personal";
}


function getInvoiceStatusInfo(
    status:
        string
) {
    const normalized =
        String(
            status ??
            ""
        )
            .trim()
            .toUpperCase();


    if (
        normalized ===
        "COMPLETED" ||
        normalized ===
        "AUTHORIZED"
    ) {
        return {
            label:
                "Autorizada",

            className:
                "text-emerald-700",
        };
    }


    if (
        normalized ===
        "ERROR" ||
        normalized ===
        "REJECTED"
    ) {
        return {
            label:
                "Con novedad",

            className:
                "text-red-600",
        };
    }


    return {
        label:
            "Procesando",

        className:
            "text-amber-600",
    };
}


function isPaid(
    purchase:
        Purchase
) {
    const status =
        String(
            purchase.status ??
            ""
        )
            .trim()
            .toLowerCase();

    return (
        status ===
        "pagado" ||
        status ===
        "paid"
    );
}


export default function MisComprasPage() {

    const [
        purchases,
        setPurchases,
    ] =
        useState<
            Purchase[]
        >(
            []
        );

    const [
        summary,
        setSummary,
    ] =
        useState<
            PurchasesSummary
        >(
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
        useState<
            string |
            null
        >(
            null
        );

    const [
        email,
        setEmail,
    ] =
        useState(
            ""
        );

    const [
        hasSession,
        setHasSession,
    ] =
        useState(
            true
        );

    const [
        filter,
        setFilter,
    ] =
        useState<
            Filter
        >(
            "all"
        );


    const [
        invoicesByPurchase,
        setInvoicesByPurchase,
    ] =
        useState<
            Record<
                number,
                InvoiceSummary
            >
        >(
            {}
        );


    const [
        invoiceFileLoading,
        setInvoiceFileLoading,
    ] =
        useState<
            string |
            null
        >(
            null
        );


    async function loadPurchases(
        accessToken:
            string
    ) {

        const [
            purchasesResponse,
            invoicesResponse,
        ] =
            await Promise.all([
                fetch(
                    "/api/mi-cuenta/compras",
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
                ),

                fetch(
                    "/api/mi-cuenta/facturas",
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
                ),
            ]);


        const data =
            (
                await purchasesResponse
                    .json()
                    .catch(
                        () =>
                            null
                    )
            ) as
            PurchasesResponse |
            null;


        if (
            !purchasesResponse.ok ||
            !data?.ok
        ) {
            throw new Error(
                data?.error ??
                "No se pudieron cargar tus compras."
            );
        }


        setPurchases(
            data.purchases ??
            []
        );


        setSummary({
            totalPurchases:
                Number(
                    data.summary
                        ?.totalPurchases ??
                    0
                ),

            paidPurchases:
                Number(
                    data.summary
                        ?.paidPurchases ??
                    0
                ),

            totalInvested:
                Number(
                    data.summary
                        ?.totalInvested ??
                    0
                ),

            totalCardsPurchased:
                Number(
                    data.summary
                        ?.totalCardsPurchased ??
                    0
                ),
        });


        const invoiceData =
            (
                await invoicesResponse
                    .json()
                    .catch(
                        () =>
                            null
                    )
            ) as
            InvoicesResponse |
            null;


        if (
            invoicesResponse.ok &&
            invoiceData?.ok
        ) {

            const map:
                Record<
                    number,
                    InvoiceSummary
                > =
                {};


            for (
                const invoice
                of invoiceData.invoices ??
                []
            ) {
                map[
                    Number(
                        invoice.pedidoId
                    )
                ] =
                    invoice;
            }


            setInvoicesByPurchase(
                map
            );

        } else {

            /*
             * Una falla al listar facturas no debe impedir
             * que el cliente vea su historial de compras.
             */
            console.error(
                "No se pudieron cargar las facturas:",
                invoiceData?.error
            );

            setInvoicesByPurchase(
                {}
            );
        }
    }


    async function openInvoiceFile(
        pedidoId:
            number,

        file:
            "pdf" |
            "xml"
    ) {

        const loadingKey =
            `${pedidoId}:${file}`;


        setInvoiceFileLoading(
            loadingKey
        );

        setError(
            null
        );


        /*
         * Abrimos la pestaña inmediatamente para evitar
         * bloqueadores de popups mientras esperamos la API.
         */
        const targetWindow =
            window.open(
                "about:blank",
                "_blank"
            );


        try {

            if (
                targetWindow
            ) {
                targetWindow.opener =
                    null;

                targetWindow.document.title =
                    file ===
                        "pdf"
                        ? "Factura Baruk593"
                        : "XML Factura Baruk593";

                targetWindow.document.body.innerHTML =
                    "<p style='font-family:system-ui;padding:24px'>Preparando documento...</p>";
            }


            const {
                data:
                sessionData,

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


            const session =
                sessionData
                    .session;


            if (
                !session
            ) {
                throw new Error(
                    "Tu sesión ha expirado. Inicia sesión nuevamente."
                );
            }


            const response =
                await fetch(
                    `/api/mi-cuenta/facturas?pedidoId=${encodeURIComponent(
                        String(
                            pedidoId
                        )
                    )}&file=${file}`,
                    {
                        method:
                            "GET",

                        headers: {
                            Authorization:
                                `Bearer ${session.access_token}`,
                        },

                        cache:
                            "no-store",
                    }
                );


            const data =
                (
                    await response
                        .json()
                        .catch(
                            () =>
                                null
                        )
                ) as
                InvoiceFileResponse |
                null;


            if (
                !response.ok ||
                !data?.ok
            ) {
                throw new Error(
                    data?.error ??
                    "No se pudo abrir el documento."
                );
            }


            const destination =
                data.url ??
                data.previewUrl;


            if (
                !destination
            ) {
                throw new Error(
                    "Factuplan no devolvió una URL para este documento."
                );
            }


            if (
                targetWindow
            ) {
                targetWindow.location.href =
                    destination;
            } else {
                window.open(
                    destination,
                    "_blank",
                    "noopener,noreferrer"
                );
            }


        } catch (
        err:
            unknown
        ) {

            if (
                targetWindow
            ) {
                targetWindow.close();
            }


            setError(
                err instanceof
                    Error
                    ? err.message
                    : "No se pudo abrir la factura."
            );

        } finally {

            setInvoiceFileLoading(
                null
            );
        }
    }


    useEffect(
        () => {

            let active =
                true;


            async function initialize() {

                try {

                    setLoading(
                        true
                    );

                    setError(
                        null
                    );


                    const {
                        data:
                        sessionData,

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


                    const session =
                        sessionData
                            .session;


                    if (
                        !active
                    ) {
                        return;
                    }


                    if (
                        !session
                    ) {

                        setHasSession(
                            false
                        );

                        setEmail(
                            ""
                        );

                        setPurchases(
                            []
                        );

                        setInvoicesByPurchase(
                            {}
                        );

                        setSummary(
                            EMPTY_SUMMARY
                        );

                        return;
                    }


                    setHasSession(
                        true
                    );

                    setEmail(
                        session
                            .user
                            .email ??
                        ""
                    );


                    await loadPurchases(
                        session
                            .access_token
                    );

                } catch (
                err:
                    unknown
                ) {

                    if (
                        !active
                    ) {
                        return;
                    }


                    setError(
                        err instanceof
                            Error
                            ? err.message
                            : "No se pudo cargar el historial de compras."
                    );

                } finally {

                    if (
                        active
                    ) {
                        setLoading(
                            false
                        );
                    }
                }
            }


            void initialize();


            const {
                data:
                authListener,
            } =
                supabaseBrowser
                    .auth
                    .onAuthStateChange(
                        (
                            event,
                            session
                        ) => {

                            if (
                                !active
                            ) {
                                return;
                            }


                            if (
                                event ===
                                "SIGNED_OUT"
                            ) {

                                setHasSession(
                                    false
                                );

                                setEmail(
                                    ""
                                );

                                setPurchases(
                                    []
                                );

                                setInvoicesByPurchase(
                                    {}
                                );

                                setSummary(
                                    EMPTY_SUMMARY
                                );

                                return;
                            }


                            if (
                                event ===
                                "SIGNED_IN" &&
                                session
                            ) {

                                setHasSession(
                                    true
                                );

                                setEmail(
                                    session
                                        .user
                                        .email ??
                                    ""
                                );


                                window.setTimeout(
                                    () => {

                                        if (
                                            !active
                                        ) {
                                            return;
                                        }


                                        loadPurchases(
                                            session
                                                .access_token
                                        )
                                            .catch(
                                                (
                                                    err:
                                                        unknown
                                                ) => {

                                                    if (
                                                        !active
                                                    ) {
                                                        return;
                                                    }


                                                    setError(
                                                        err instanceof
                                                            Error
                                                            ? err.message
                                                            : "No se pudieron cargar tus compras."
                                                    );
                                                }
                                            );
                                    },
                                    0
                                );
                            }
                        }
                    );


            return () => {

                active =
                    false;

                authListener
                    .subscription
                    .unsubscribe();
            };

        },
        []
    );


    const filteredPurchases =
        useMemo(
            () => {

                if (
                    filter ===
                    "paid"
                ) {
                    return purchases.filter(
                        isPaid
                    );
                }


                if (
                    filter ===
                    "pending"
                ) {
                    return purchases.filter(
                        (
                            purchase
                        ) =>
                            !isPaid(
                                purchase
                            )
                    );
                }


                return purchases;

            },
            [
                purchases,
                filter,
            ]
        );


    if (
        loading
    ) {
        return (
            <main className="min-h-screen bg-white px-4 pb-20 pt-28 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-6xl">

                    <div className="flex min-h-[420px] items-center justify-center">

                        <div className="text-center">

                            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-[#ff6600]" />

                            <p className="mt-4 text-sm font-semibold text-gray-500">
                                Cargando tus compras...
                            </p>

                        </div>

                    </div>

                </div>
            </main>
        );
    }


    if (
        !hasSession
    ) {
        return (
            <main className="min-h-screen bg-white px-4 pb-20 pt-28 sm:px-6 lg:px-8">

                <div className="mx-auto max-w-lg">

                    <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm">

                        <p className="text-xs font-black uppercase tracking-[0.22em] text-[#ff6600]">
                            BARUK593
                        </p>

                        <h1 className="mt-3 text-3xl font-black text-gray-900">
                            Mis compras
                        </h1>

                        <p className="mt-3 text-sm leading-6 text-gray-500">
                            Inicia sesión para consultar tu historial de compras y tus Tarjetas de la Suerte.
                        </p>

                        <Link
                            href="/mi-cuenta"
                            className="mt-7 inline-flex min-h-[48px] items-center justify-center rounded-xl bg-[#ff6600] px-6 text-sm font-black text-white transition hover:bg-[#ed5d00]"
                        >
                            Iniciar sesión
                        </Link>

                    </div>

                </div>

            </main>
        );
    }


    return (
        <main className="min-h-screen bg-white px-4 pb-20 pt-28 sm:px-6 lg:px-8 xl:px-10">

            <div className="mx-auto w-full max-w-7xl">

                {/* ENCABEZADO */}

                <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">

                    <div>

                        <p className="text-xs font-black uppercase tracking-[0.24em] text-[#ff6600]">
                            BARUK593 · MI CUENTA
                        </p>

                        <h1 className="mt-2 text-3xl font-black tracking-[-0.035em] text-gray-900 md:text-4xl">
                            Mis compras
                        </h1>

                        <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500">
                            Consulta tus pedidos, pagos y la cantidad de Tarjetas de la Suerte adquiridas.
                        </p>

                        {email && (
                            <p className="mt-2 text-xs font-semibold text-gray-400">
                                {email}
                            </p>
                        )}

                    </div>


                    <Link
                        href="/mi-cuenta"
                        className="inline-flex min-h-[46px] w-fit items-center justify-center rounded-xl border border-gray-200 bg-white px-5 text-sm font-black text-gray-700 transition hover:border-[#C1317F]/30 hover:bg-[#C1317F]/5 hover:text-[#C1317F]"
                    >
                        ← Volver a Mi cuenta
                    </Link>

                </div>


                {/* ERROR */}

                {error && (

                    <div className="mt-6 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-600">
                        {error}
                    </div>

                )}


                {/* RESUMEN */}

                <section className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">

                    <div className="rounded-2xl border border-gray-200 bg-white p-5">

                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-400">
                            Compras
                        </p>

                        <p className="mt-2 text-3xl font-black text-gray-900">
                            {summary.totalPurchases}
                        </p>

                    </div>


                    <div className="rounded-2xl border border-gray-200 bg-white p-5">

                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-400">
                            Pagadas
                        </p>

                        <p className="mt-2 text-3xl font-black text-emerald-600">
                            {summary.paidPurchases}
                        </p>

                    </div>


                    <div className="rounded-2xl border border-gray-200 bg-white p-5">

                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-400">
                            Tarjetas adquiridas
                        </p>

                        <p className="mt-2 text-3xl font-black text-[#ff6600]">
                            {summary.totalCardsPurchased}
                        </p>

                    </div>


                    <div className="rounded-2xl border border-gray-200 bg-white p-5">

                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-400">
                            Total pagado
                        </p>

                        <p className="mt-2 text-2xl font-black text-gray-900">
                            {formatMoney(
                                summary.totalInvested
                            )}
                        </p>

                    </div>

                </section>


                {/* FILTROS */}

                <div className="mt-8 flex flex-wrap gap-2">

                    {(
                        [
                            {
                                key:
                                    "all",

                                label:
                                    `Todas (${purchases.length})`,
                            },
                            {
                                key:
                                    "paid",

                                label:
                                    `Pagadas (${purchases.filter(isPaid).length})`,
                            },
                            {
                                key:
                                    "pending",

                                label:
                                    `Pendientes (${purchases.filter(
                                        (
                                            purchase
                                        ) =>
                                            !isPaid(
                                                purchase
                                            )
                                    ).length})`,
                            },
                        ] as const
                    ).map(
                        (
                            item
                        ) => (

                            <button
                                key={
                                    item.key
                                }
                                type="button"
                                onClick={
                                    () =>
                                        setFilter(
                                            item.key
                                        )
                                }
                                className={`
                                    rounded-full
                                    border
                                    px-4
                                    py-2
                                    text-xs
                                    font-black
                                    transition

                                    ${filter ===
                                        item.key

                                        ? "border-[#C1317F] bg-[#C1317F] text-white"

                                        : "border-gray-200 bg-white text-gray-600 hover:border-[#C1317F]/30 hover:text-[#C1317F]"
                                    }
                                `}
                            >
                                {item.label}
                            </button>

                        )
                    )}

                </div>


                {/* SIN COMPRAS */}

                {filteredPurchases.length ===
                    0 && (

                        <div className="mt-8 rounded-3xl border border-gray-200 bg-gray-50 p-10 text-center">

                            <div className="text-4xl">
                                🧾
                            </div>

                            <h2 className="mt-4 text-xl font-black text-gray-900">
                                {purchases.length ===
                                    0

                                    ? "Todavía no tienes compras"

                                    : "No hay compras con este estado"
                                }
                            </h2>

                            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-gray-500">
                                {purchases.length ===
                                    0

                                    ? "Cuando adquieras Tarjetas de la Suerte, tus pedidos aparecerán aquí."

                                    : "Selecciona otro filtro para consultar el resto de tu historial."
                                }
                            </p>

                            {purchases.length ===
                                0 && (

                                    <Link
                                        href="/#comprar-baruk-card"
                                        className="mt-6 inline-flex min-h-[46px] items-center justify-center rounded-xl bg-[#ff6600] px-6 text-sm font-black text-white transition hover:bg-[#ed5d00]"
                                    >
                                        Comprar Tarjetas
                                    </Link>

                                )}

                        </div>

                    )}


                {/* LISTADO */}

                {filteredPurchases.length >
                    0 && (

                        <section className="mt-6 space-y-4">

                            {filteredPurchases.map(
                                (
                                    purchase
                                ) => {

                                    const statusInfo =
                                        getStatusInfo(
                                            purchase.status
                                        );

                                    const cardsTotal =
                                        Number(
                                            purchase.cards
                                                ?.total ??
                                            purchase.quantity ??
                                            0
                                        );

                                    const cardsRevealed =
                                        Number(
                                            purchase.cards
                                                ?.revealed ??
                                            0
                                        );

                                    const cardsPending =
                                        Number(
                                            purchase.cards
                                                ?.pending ??
                                            Math.max(
                                                0,
                                                cardsTotal -
                                                cardsRevealed
                                            )
                                        );

                                    const canViewDetail =
                                        purchase.purchaseType !==
                                        "gift";


                                    const invoice =
                                        invoicesByPurchase[
                                        purchase.id
                                        ];


                                    const invoiceStatusInfo =
                                        invoice
                                            ? getInvoiceStatusInfo(
                                                invoice.status
                                            )
                                            : null;


                                    const invoiceReady =
                                        Boolean(
                                            invoice &&
                                            (
                                                String(
                                                    invoice.status
                                                )
                                                    .toUpperCase() ===
                                                "COMPLETED" ||
                                                String(
                                                    invoice.status
                                                )
                                                    .toUpperCase() ===
                                                "AUTHORIZED"
                                            )
                                        );


                                    return (

                                        <article
                                            key={
                                                purchase.id
                                            }
                                            className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm"
                                        >

                                            <div className="h-1 bg-gradient-to-r from-[#ff6600] via-[#ff8a3d] to-[#C1317F]" />


                                            <div className="p-5 sm:p-6">

                                                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">

                                                    <div>

                                                        <div className="flex flex-wrap items-center gap-2">

                                                            <p className="text-sm font-black text-gray-900">
                                                                Pedido #
                                                                {purchase.id}
                                                            </p>

                                                            <span
                                                                className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wider ${statusInfo.className}`}
                                                            >
                                                                {
                                                                    statusInfo.label
                                                                }
                                                            </span>

                                                            <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-gray-500">
                                                                {getPurchaseTypeLabel(
                                                                    purchase.purchaseType
                                                                )}
                                                            </span>

                                                        </div>


                                                        <p className="mt-2 text-xs text-gray-400">
                                                            {formatDate(
                                                                purchase.createdAt
                                                            )}
                                                        </p>

                                                    </div>


                                                    <div className="md:text-right">

                                                        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400">
                                                            Total
                                                        </p>

                                                        <p className="mt-1 text-2xl font-black text-gray-900">
                                                            {formatMoney(
                                                                purchase.total
                                                            )}
                                                        </p>

                                                    </div>

                                                </div>


                                                <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">

                                                    <div className="rounded-2xl bg-[#fff6ef] p-4">

                                                        <p className="text-[9px] font-black uppercase tracking-wider text-gray-400">
                                                            Tarjetas
                                                        </p>

                                                        <p className="mt-1 text-xl font-black text-[#ff6600]">
                                                            {purchase.quantity}
                                                        </p>

                                                    </div>


                                                    <div className="rounded-2xl bg-gray-50 p-4">

                                                        <p className="text-[9px] font-black uppercase tracking-wider text-gray-400">
                                                            Reveladas
                                                        </p>

                                                        <p className="mt-1 text-xl font-black text-gray-900">
                                                            {cardsRevealed}
                                                        </p>

                                                    </div>


                                                    <div className="rounded-2xl bg-gray-50 p-4">

                                                        <p className="text-[9px] font-black uppercase tracking-wider text-gray-400">
                                                            Por revelar
                                                        </p>

                                                        <p className="mt-1 text-xl font-black text-[#C1317F]">
                                                            {cardsPending}
                                                        </p>

                                                    </div>


                                                    <div className="rounded-2xl bg-gray-50 p-4">

                                                        <p className="text-[9px] font-black uppercase tracking-wider text-gray-400">
                                                            Método
                                                        </p>

                                                        <p className="mt-1 text-sm font-black text-gray-900">
                                                            {getPaymentMethodLabel(
                                                                purchase.paymentMethod
                                                            )}
                                                        </p>

                                                    </div>

                                                </div>


                                                <div className="mt-5 border-t border-gray-100 pt-5">

                                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                                                        <div className="text-xs leading-5 text-gray-400">

                                                            <span>
                                                                Valor por tarjeta:{" "}
                                                                <strong className="text-gray-600">
                                                                    {formatMoney(
                                                                        purchase.unitPrice
                                                                    )}
                                                                </strong>
                                                            </span>

                                                            {purchase.purchaseType ===
                                                                "gift" && (

                                                                    <span className="ml-3 font-bold text-[#C1317F]">
                                                                        🎁 Compra enviada como regalo
                                                                    </span>

                                                                )}

                                                        </div>


                                                        {canViewDetail && (

                                                            <Link
                                                                href={`/mi-compra?pedido=${purchase.id}`}
                                                                className="inline-flex min-h-[42px] items-center justify-center rounded-xl bg-[#171717] px-5 text-xs font-black text-white transition hover:bg-[#C1317F]"
                                                            >
                                                                Ver detalle
                                                                <span className="ml-2">
                                                                    →
                                                                </span>
                                                            </Link>

                                                        )}

                                                    </div>


                                                    {invoice && (

                                                        <div className="mt-5 flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">

                                                            <div>

                                                                <div className="flex flex-wrap items-center gap-2">

                                                                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-gray-400">
                                                                        Factura electrónica
                                                                    </p>

                                                                    {invoice.environment ===
                                                                        "test" && (

                                                                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-700">
                                                                                Prueba
                                                                            </span>

                                                                        )}

                                                                </div>


                                                                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">

                                                                    <p className="text-sm font-black text-gray-900">
                                                                        {invoice.sequential
                                                                            ? `N.º ${invoice.sequential}`
                                                                            : "Comprobante en proceso"
                                                                        }
                                                                    </p>


                                                                    {invoiceStatusInfo && (

                                                                        <span
                                                                            className={`text-[10px] font-black uppercase tracking-wider ${invoiceStatusInfo.className}`}
                                                                        >
                                                                            {invoiceStatusInfo.label}
                                                                        </span>

                                                                    )}

                                                                </div>

                                                            </div>


                                                            {invoiceReady && (

                                                                <div className="flex flex-wrap items-center gap-2">

                                                                    <button
                                                                        type="button"
                                                                        onClick={
                                                                            () =>
                                                                                void openInvoiceFile(
                                                                                    purchase.id,
                                                                                    "pdf"
                                                                                )
                                                                        }
                                                                        disabled={
                                                                            invoiceFileLoading ===
                                                                            `${purchase.id}:pdf`
                                                                        }
                                                                        className="inline-flex min-h-[38px] items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-[11px] font-black text-gray-700 transition hover:border-[#C1317F]/30 hover:text-[#C1317F] disabled:cursor-not-allowed disabled:opacity-50"
                                                                    >
                                                                        {invoiceFileLoading ===
                                                                            `${purchase.id}:pdf`
                                                                            ? "Abriendo..."
                                                                            : "Ver factura"
                                                                        }
                                                                    </button>


                                                                    <button
                                                                        type="button"
                                                                        onClick={
                                                                            () =>
                                                                                void openInvoiceFile(
                                                                                    purchase.id,
                                                                                    "xml"
                                                                                )
                                                                        }
                                                                        disabled={
                                                                            invoiceFileLoading ===
                                                                            `${purchase.id}:xml`
                                                                        }
                                                                        className="inline-flex min-h-[38px] items-center justify-center rounded-xl px-3 text-[11px] font-black text-gray-500 transition hover:text-[#C1317F] disabled:cursor-not-allowed disabled:opacity-50"
                                                                    >
                                                                        {invoiceFileLoading ===
                                                                            `${purchase.id}:xml`
                                                                            ? "Abriendo..."
                                                                            : "XML"
                                                                        }
                                                                    </button>

                                                                </div>

                                                            )}

                                                        </div>

                                                    )}

                                                </div>

                                            </div>

                                        </article>

                                    );
                                }
                            )}

                        </section>

                    )}

            </div>

        </main>
    );
}