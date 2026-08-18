"use client";

import {
    useEffect,
    useState,
} from "react";

type TipoPremio =
    | "physical"
    | "digital_cards"
    | "cash"
    | "experience"
    | "discount";

type Premio = {
    id: string;
    nombre: string;
    descripcion: string | null;
    tipo: TipoPremio;
    imagenUrl: string | null;
    cantidadCards: number | null;
    valorReferencial: number | null;
    instrucciones: string | null;

    agotado: boolean;
    revelados: number;

    stockTotal: number;
    stockAsignado: number;
};

type ApiResponse = {
    ok: boolean;
    premios: Premio[];
    error?: string;
};

/* ============================================================
   TIPO DE PREMIO
============================================================ */

function textoTipo(
    tipo: TipoPremio
) {
    switch (tipo) {
        case "digital_cards":
            return "Tarjetas";

        case "cash":
            return "Efectivo";

        case "physical":
            return "Producto";

        case "experience":
            return "Experiencia";

        case "discount":
            return "Beneficio";

        default:
            return "Premio";
    }
}

/* ============================================================
   ICONOS
============================================================ */

function PremioIcon({
    tipo,
}: {
    tipo: TipoPremio;
}) {
    if (tipo === "cash") {
        return (
            <svg
                viewBox="0 0 48 48"
                fill="none"
                className="h-8 w-8"
            >
                <rect
                    x="7"
                    y="12"
                    width="34"
                    height="24"
                    rx="4"
                    stroke="currentColor"
                    strokeWidth="2.5"
                />

                <circle
                    cx="24"
                    cy="24"
                    r="5"
                    stroke="currentColor"
                    strokeWidth="2.5"
                />

                <path
                    d="M12 18h3M33 30h3"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                />
            </svg>
        );
    }

    if (tipo === "digital_cards") {
        return (
            <svg
                viewBox="0 0 48 48"
                fill="none"
                className="h-8 w-8"
            >
                <rect
                    x="9"
                    y="10"
                    width="30"
                    height="28"
                    rx="4"
                    stroke="currentColor"
                    strokeWidth="2.5"
                />

                <path
                    d="M15 18h18M15 24h12"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                />
            </svg>
        );
    }

    if (tipo === "physical") {
        return (
            <svg
                viewBox="0 0 48 48"
                fill="none"
                className="h-8 w-8"
            >
                <path
                    d="M10 18h28v21H10V18Z"
                    stroke="currentColor"
                    strokeWidth="2.5"
                />

                <path
                    d="M24 18v21M8 18h32v-7H8v7Z"
                    stroke="currentColor"
                    strokeWidth="2.5"
                />

                <path
                    d="M24 11c-1-5-8-6-8-2 0 3 4 4 8 2Zm0 0c1-5 8-6 8-2 0 3-4 4-8 2Z"
                    stroke="currentColor"
                    strokeWidth="2.5"
                />
            </svg>
        );
    }

    if (tipo === "experience") {
        return (
            <svg
                viewBox="0 0 48 48"
                fill="none"
                className="h-8 w-8"
            >
                <path
                    d="M24 41s12-12 12-22a12 12 0 1 0-24 0c0 10 12 22 12 22Z"
                    stroke="currentColor"
                    strokeWidth="2.5"
                />

                <circle
                    cx="24"
                    cy="19"
                    r="4"
                    stroke="currentColor"
                    strokeWidth="2.5"
                />
            </svg>
        );
    }

    return (
        <svg
            viewBox="0 0 48 48"
            fill="none"
            className="h-8 w-8"
        >
            <path
                d="M10 15h16l12 12-12 12L10 23v-8Z"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinejoin="round"
            />

            <circle
                cx="17"
                cy="21"
                r="2"
                fill="currentColor"
            />
        </svg>
    );
}

/* ============================================================
   COMPONENTE
============================================================ */

export function PremiosInstantaneos() {
    const [
        premios,
        setPremios,
    ] =
        useState<Premio[]>(
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

    const [
        premioSeleccionado,
        setPremioSeleccionado,
    ] =
        useState<
            Premio | null
        >(null);

    /* ============================================================
       CARGAR PREMIOS
    ============================================================ */

    useEffect(() => {
        const cargar =
            async () => {
                try {
                    setLoading(
                        true
                    );

                    setError(
                        null
                    );

                    const response =
                        await fetch(
                            "/api/public/premios-instantaneos",
                            {
                                cache:
                                    "no-store",
                            }
                        );

                    const data:
                        ApiResponse =
                        await response.json();

                    if (
                        !response.ok ||
                        !data.ok
                    ) {
                        throw new Error(
                            data.error ??
                            "No se pudieron cargar los premios."
                        );
                    }

                    setPremios(
                        data.premios ??
                        []
                    );
                } catch (err) {
                    console.error(
                        err
                    );

                    setError(
                        "No pudimos cargar los premios en este momento."
                    );
                } finally {
                    setLoading(
                        false
                    );
                }
            };

        void cargar();
    }, []);

    /* ============================================================
       CERRAR MODAL CON ESC
    ============================================================ */

    useEffect(() => {
        if (
            !premioSeleccionado
        ) {
            return;
        }

        const cerrar = (
            event: KeyboardEvent
        ) => {
            if (
                event.key ===
                "Escape"
            ) {
                setPremioSeleccionado(
                    null
                );
            }
        };

        window.addEventListener(
            "keydown",
            cerrar
        );

        return () => {
            window.removeEventListener(
                "keydown",
                cerrar
            );
        };
    }, [
        premioSeleccionado,
    ]);

    /* ============================================================
       IR A COMPRAR
    ============================================================ */

    function irAComprar() {
        setPremioSeleccionado(
            null
        );

        setTimeout(() => {
            document
                .getElementById(
                    "comprar-baruk-card"
                )
                ?.scrollIntoView({
                    behavior:
                        "smooth",

                    block:
                        "start",
                });
        }, 100);
    }

    return (
        <>
            {/* =====================================================
                SECCIÓN
            ===================================================== */}

            <section
                id="premios-instantaneos"
                className="
                    scroll-mt-24
                    w-full
                    bg-white
                    py-12

                    md:py-14
                "
            >
                <div
                    className="
                        mx-auto
                        w-full
                        max-w-6xl

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
                            gap-4

                            md:flex-row
                            md:items-end
                            md:justify-between
                        "
                    >
                        <div>
                            <p
                                className="
                                    text-[9px]
                                    font-black
                                    uppercase
                                    tracking-[0.22em]
                                    text-[#C1317F]
                                "
                            >
                                Descubre al instante
                            </p>

                            <h2
                                className="
                                    mt-2

                                    text-2xl
                                    font-black
                                    tracking-[-0.04em]
                                    text-[#171717]

                                    md:text-[30px]
                                "
                            >
                                Premios instantáneos
                            </h2>

                            <p
                                className="
                                    mt-2
                                    max-w-2xl

                                    text-[13px]
                                    leading-6
                                    text-slate-500
                                "
                            >
                                Algunas Tarjetas de la
                                Suerte Baruk593 pueden
                                revelar premios además
                                de tu número de
                                participación.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={
                                irAComprar
                            }
                            className="
                                hidden

                                text-xs
                                font-black
                                text-[#171717]

                                transition-colors

                                hover:text-[#C1317F]

                                md:inline-flex
                            "
                        >
                            Comprar Tarjetas

                            <span className="ml-2">
                                →
                            </span>
                        </button>
                    </div>

                    {/* =================================================
                        LOADING
                    ================================================= */}

                    {loading && (
                        <div
                            className="
                                mt-7

                                rounded-[20px]

                                border
                                border-slate-200

                                bg-[#fafafa]

                                px-6
                                py-10

                                text-center
                                text-sm
                                text-slate-400
                            "
                        >
                            Cargando premios...
                        </div>
                    )}

                    {/* =================================================
                        ERROR
                    ================================================= */}

                    {!loading &&
                        error && (
                            <div
                                className="
                                    mt-7

                                    rounded-2xl

                                    border
                                    border-red-100

                                    bg-red-50

                                    px-5
                                    py-4

                                    text-sm
                                    text-red-600
                                "
                            >
                                {error}
                            </div>
                        )}

                    {/* =================================================
                        PREMIOS
                    ================================================= */}

                    {!loading &&
                        !error &&
                        premios.length >
                        0 && (
                            <div
                                className="
                                    mt-8

                                    grid
                                    grid-cols-2
                                    gap-3

                                    md:gap-4

                                    lg:grid-cols-4
                                "
                            >
                                {premios.map(
                                    (
                                        premio
                                    ) => (
                                        <button
                                            key={
                                                premio.id
                                            }
                                            type="button"
                                            onClick={() =>
                                                setPremioSeleccionado(
                                                    premio
                                                )
                                            }
                                            className="
                                                group
                                                relative
                                                overflow-hidden

                                                rounded-[20px]

                                                border
                                                border-slate-200

                                                bg-white

                                                text-left

                                                shadow-[0_5px_16px_rgba(0,0,0,0.08)]

                                                transition-all
                                                duration-300

                                                hover:-translate-y-[3px]

                                                hover:border-[#C1317F]/35

                                                hover:shadow-[0_12px_32px_rgba(193,49,127,0.28)]

                                                focus:outline-none

                                                focus:ring-2
                                                focus:ring-[#C1317F]/20
                                            "
                                        >
                                            {/* =====================================
                                                VISUAL
                                            ===================================== */}

                                            <div
                                                className="
                                                    relative
                                                    z-10

                                                    flex
                                                    aspect-[4/3]
                                                    items-center
                                                    justify-center

                                                    overflow-hidden

                                                    bg-[#f8f8f8]
                                                "
                                            >
                                                {/* =================================
                                                    CANTIDAD GANADA
                                                ================================= */}

                                                <div
                                                    className="
                                                        absolute
                                                        left-3
                                                        top-3
                                                        z-20
                                                    "
                                                >
                                                    <div
                                                        className="
                                                            inline-flex
                                                            h-[30px]
                                                            items-center
                                                            gap-2

                                                            rounded-full

                                                            border
                                                            border-white/80

                                                            bg-white/95

                                                            px-3

                                                            shadow-[0_4px_14px_rgba(0,0,0,0.08)]

                                                            backdrop-blur-sm
                                                        "
                                                    >
                                                        <span
                                                            className={`
                                                                h-1.5
                                                                w-1.5
                                                                shrink-0

                                                                rounded-full

                                                                ${premio.agotado
                                                                    ? "bg-slate-400"
                                                                    : "bg-[#C1317F]"
                                                                }
                                                            `}
                                                        />

                                                        <span
                                                            className="
                                                                whitespace-nowrap

                                                                text-[8px]
                                                                font-black
                                                                uppercase
                                                                tracking-[0.10em]

                                                                text-[#171717]
                                                            "
                                                        >
                                                            {
                                                                premio.stockAsignado
                                                            }{" "}
                                                            de{" "}
                                                            {
                                                                premio.stockTotal
                                                            }{" "}
                                                            ganados
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* =================================
                                                    IMAGEN / ICONO
                                                ================================= */}

                                                {premio.imagenUrl ? (
                                                    <img
                                                        src={
                                                            premio.imagenUrl
                                                        }
                                                        alt={
                                                            premio.nombre
                                                        }
                                                        className="
                                                            h-full
                                                            w-full

                                                            object-contain

                                                            p-5

                                                            transition-transform
                                                            duration-500

                                                            group-hover:scale-[1.06]
                                                        "
                                                    />
                                                ) : (
                                                    <div
                                                        className="
                                                            flex
                                                            h-16
                                                            w-16
                                                            items-center
                                                            justify-center

                                                            rounded-2xl

                                                            border
                                                            border-slate-200

                                                            bg-white

                                                            text-[#555]

                                                            shadow-sm

                                                            transition-all
                                                            duration-300

                                                            group-hover:border-[#C1317F]/30
                                                            group-hover:text-[#C1317F]
                                                        "
                                                    >
                                                        <PremioIcon
                                                            tipo={
                                                                premio.tipo
                                                            }
                                                        />
                                                    </div>
                                                )}

                                                {/* =================================
                                                    FLECHA
                                                ================================= */}

                                                <div
                                                    className="
                                                        absolute
                                                        bottom-3
                                                        right-3
                                                        z-20

                                                        flex
                                                        h-8
                                                        w-8
                                                        translate-y-1
                                                        items-center
                                                        justify-center

                                                        rounded-full

                                                        bg-white

                                                        text-xs
                                                        font-black
                                                        text-[#171717]

                                                        opacity-0

                                                        shadow-md

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

                                            {/* =====================================
                                                INFORMACIÓN
                                            ===================================== */}

                                            <div
                                                className="
                                                    relative
                                                    z-10

                                                    bg-white

                                                    p-4
                                                "
                                            >
                                                <p
                                                    className="
                                                        text-[8px]
                                                        font-black
                                                        uppercase
                                                        tracking-[0.18em]
                                                        text-[#C1317F]
                                                    "
                                                >
                                                    {textoTipo(
                                                        premio.tipo
                                                    )}
                                                </p>

                                                <h3
                                                    className="
                                                        mt-1.5

                                                        text-[13px]
                                                        font-black
                                                        leading-5
                                                        text-[#171717]

                                                        md:text-sm
                                                    "
                                                >
                                                    {
                                                        premio.nombre
                                                    }
                                                </h3>

                                                {premio.descripcion && (
                                                    <p
                                                        className="
                                                            mt-1.5

                                                            line-clamp-2

                                                            text-[10px]
                                                            leading-[18px]
                                                            text-slate-400

                                                            md:text-[11px]
                                                        "
                                                    >
                                                        {
                                                            premio.descripcion
                                                        }
                                                    </p>
                                                )}
                                            </div>
                                        </button>
                                    )
                                )}
                            </div>
                        )}

                    {/* =================================================
                        CTA MÓVIL
                    ================================================= */}

                    <button
                        type="button"
                        onClick={
                            irAComprar
                        }
                        className="
                            mt-6

                            flex
                            min-h-[46px]
                            w-full
                            items-center
                            justify-center

                            rounded-xl

                            bg-[#171717]

                            px-5

                            text-xs
                            font-black
                            text-white

                            transition-colors

                            hover:bg-[#C1317F]

                            md:hidden
                        "
                    >
                        Comprar Tarjetas
                    </button>
                </div>
            </section>

            {/* =====================================================
                MODAL
            ===================================================== */}

            {premioSeleccionado && (
                <div
                    className="
                        fixed
                        inset-0
                        z-[100]

                        flex
                        items-center
                        justify-center

                        bg-black/45

                        p-4

                        backdrop-blur-[2px]
                    "
                    onClick={() =>
                        setPremioSeleccionado(
                            null
                        )
                    }
                >
                    <div
                        className="
                            relative

                            max-h-[90vh]
                            w-full
                            max-w-lg

                            overflow-y-auto

                            rounded-[24px]

                            bg-white

                            shadow-[0_30px_90px_rgba(0,0,0,0.25)]
                        "
                        onClick={(
                            event
                        ) =>
                            event.stopPropagation()
                        }
                    >
                        {/* =================================================
                            CERRAR
                        ================================================= */}

                        <button
                            type="button"
                            onClick={() =>
                                setPremioSeleccionado(
                                    null
                                )
                            }
                            aria-label="Cerrar"
                            className="
                                absolute
                                right-4
                                top-4
                                z-20

                                flex
                                h-9
                                w-9
                                items-center
                                justify-center

                                rounded-full

                                bg-white

                                text-lg
                                font-bold
                                text-slate-600

                                shadow-md

                                transition-colors

                                hover:bg-slate-100
                            "
                        >
                            ×
                        </button>

                        {/* =================================================
                            IMAGEN
                        ================================================= */}

                        <div
                            className="
                                flex
                                aspect-[16/8]
                                items-center
                                justify-center

                                overflow-hidden

                                rounded-t-[24px]

                                bg-[#f7f7f7]
                            "
                        >
                            {premioSeleccionado.imagenUrl ? (
                                <img
                                    src={
                                        premioSeleccionado.imagenUrl
                                    }
                                    alt={
                                        premioSeleccionado.nombre
                                    }
                                    className="
                                        h-full
                                        w-full

                                        object-contain

                                        p-7
                                    "
                                />
                            ) : (
                                <div
                                    className="
                                        flex
                                        h-20
                                        w-20
                                        items-center
                                        justify-center

                                        rounded-2xl

                                        border
                                        border-slate-200

                                        bg-white

                                        text-[#C1317F]

                                        shadow-sm
                                    "
                                >
                                    <PremioIcon
                                        tipo={
                                            premioSeleccionado.tipo
                                        }
                                    />
                                </div>
                            )}
                        </div>

                        {/* =================================================
                            INFORMACIÓN MODAL
                        ================================================= */}

                        <div className="p-6">

                            <div
                                className="
                                    flex
                                    items-center
                                    justify-between
                                    gap-3
                                "
                            >
                                <p
                                    className="
                                        text-[9px]
                                        font-black
                                        uppercase
                                        tracking-[0.18em]
                                        text-[#C1317F]
                                    "
                                >
                                    Premio instantáneo
                                </p>

                                {/* CANTIDAD GANADA */}

                                <span
                                    className="
                                        shrink-0

                                        rounded-full

                                        bg-[#C1317F]/10

                                        px-3
                                        py-1.5

                                        text-[8px]
                                        font-black
                                        uppercase
                                        tracking-[0.08em]

                                        text-[#C1317F]
                                    "
                                >
                                    {
                                        premioSeleccionado.stockAsignado
                                    }{" "}
                                    de{" "}
                                    {
                                        premioSeleccionado.stockTotal
                                    }{" "}
                                    ganados
                                </span>
                            </div>

                            <h3
                                className="
                                    mt-3

                                    text-2xl
                                    font-black
                                    tracking-[-0.03em]
                                    text-[#171717]
                                "
                            >
                                {
                                    premioSeleccionado.nombre
                                }
                            </h3>

                            {premioSeleccionado.descripcion && (
                                <p
                                    className="
                                        mt-3

                                        text-sm
                                        leading-6
                                        text-slate-500
                                    "
                                >
                                    {
                                        premioSeleccionado.descripcion
                                    }
                                </p>
                            )}

                            {/* =================================================
                                CTA
                            ================================================= */}

                            <button
                                type="button"
                                onClick={
                                    irAComprar
                                }
                                className="
                                    mt-6

                                    min-h-[50px]
                                    w-full

                                    rounded-xl

                                    bg-[#171717]

                                    px-5

                                    text-sm
                                    font-black
                                    text-white

                                    transition-all

                                    hover:bg-[#C1317F]

                                    hover:shadow-[0_8px_24px_rgba(193,49,127,0.25)]
                                "
                            >
                                Quiero una Tarjeta de la Suerte
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}