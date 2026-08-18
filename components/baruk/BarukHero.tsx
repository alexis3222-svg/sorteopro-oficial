// components/baruk/BarukHero.tsx

"use client";

import { SorteoCarousel } from "@/components/SorteoCarousel";

type BarukHeroProps = {
    titulo?: string | null;
    imagenUrl?: string | null;
    galeriaUrls?: string[];
    precioUnidad?: number;
    agotado?: boolean;
    progreso?: number;
};

export default function BarukHero({
    titulo,
    imagenUrl,
    galeriaUrls = [],
    precioUnidad = 1,
    agotado = false,
    progreso = 0,
}: BarukHeroProps) {

    /* ============================================================
       PROGRESO
    ============================================================ */

    const progresoSeguro =
        Math.max(
            0,
            Math.min(
                100,
                Number(progreso) || 0
            )
        );

    const progresoTexto =
        progresoSeguro.toLocaleString(
            "es-EC",
            {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
            }
        );

    const progresoVisual =
        progresoSeguro > 0
            ? Math.max(
                progresoSeguro,
                1.2
            )
            : 0;

    /* ============================================================
       SCROLL
    ============================================================ */

    function scrollToPurchase() {
        const section =
            document.getElementById(
                "comprar-baruk-card"
            );

        section?.scrollIntoView({
            behavior: "smooth",
            block: "start",
        });
    }

    function scrollToHowItWorks() {
        const section =
            document.getElementById(
                "como-funciona"
            );

        section?.scrollIntoView({
            behavior: "smooth",
            block: "start",
        });
    }

    return (
        <section
            className="
        relative
        isolate
        w-full
    "
        >

            {/* =====================================================
                DECORACIÓN DE FONDO MUY SUAVE
            ===================================================== */}



            {/* =====================================================
                CONTENIDO
            ===================================================== */}

            <div
                className="
                    mx-auto

                    grid
                    w-full
                    max-w-7xl
                    items-center

                    gap-8

                    px-5

                    pb-10
                    pt-[100px]

                    sm:px-6

                    md:pb-12
                    md:pt-[105px]

                    lg:min-h-[690px]
                    lg:grid-cols-[0.88fr_1.12fr]
                    lg:gap-12
                    lg:pb-14
                    lg:pt-[105px]

                    xl:gap-16
                "
            >

                {/* =================================================
                    TEXTO
                ================================================= */}

                <div
                    className="
                        order-2
                        lg:order-1
                    "
                >

                    {/* ETIQUETA */}

                    <div
                        className="
                            flex
                            items-center
                            gap-3
                        "
                    >
                        <span
                            className="
                                h-[2px]
                                w-7
                                bg-[#C1317F]
                            "
                        />

                        <p
                            className="
                                text-[9px]
                                font-black
                                uppercase
                                tracking-[0.23em]
                                text-[#C1317F]
                            "
                        >
                            Tarjeta de la Suerte Baruk593
                        </p>
                    </div>

                    {/* =================================================
                        TÍTULO
                    ================================================= */}

                    <h1
                        className="
                            mt-5

                            max-w-[650px]

                            text-[42px]
                            font-black
                            uppercase
                            leading-[0.91]
                            tracking-[-0.058em]
                            text-[#171717]

                            sm:text-[52px]
                            md:text-[62px]
                            lg:text-[64px]
                            xl:text-[70px]
                        "
                    >
                        TU NÚMERO.

                        <br />

                        <span className="text-[#ff6600]">
                            TU EXPERIENCIA.
                        </span>

                        <br />

                        TU OPORTUNIDAD.
                    </h1>

                    {/* =================================================
                        DESCRIPCIÓN
                    ================================================= */}

                    <p
                        className="
                            mt-6

                            max-w-[525px]

                            text-[13px]
                            leading-6
                            text-slate-500

                            md:text-sm
                            md:leading-7
                        "
                    >
                        Cada Tarjeta de la Suerte
                        Baruk593 incluye un número
                        único de participación y puede
                        revelar una esfera coleccionable
                        o un premio instantáneo.
                    </p>

                    {/* =================================================
                        BENEFICIOS
                    ================================================= */}

                    <div
                        className="
                            mt-6

                            flex
                            flex-wrap

                            gap-x-5
                            gap-y-3
                        "
                    >

                        {/* NÚMERO */}

                        <div
                            className="
                                flex
                                items-center
                                gap-2

                                text-[10px]
                                font-bold
                                text-slate-500
                            "
                        >
                            <span
                                className="
                                    flex
                                    h-5
                                    w-5
                                    items-center
                                    justify-center

                                    rounded-full

                                    border
                                    border-slate-200

                                    bg-white
                                "
                            >
                                <span
                                    className="
                                        h-1.5
                                        w-1.5

                                        rounded-full

                                        bg-[#C1317F]
                                    "
                                />
                            </span>

                            Número único
                        </div>

                        {/* ESFERAS */}

                        <div
                            className="
                                flex
                                items-center
                                gap-2

                                text-[10px]
                                font-bold
                                text-slate-500
                            "
                        >
                            <span
                                className="
                                    flex
                                    h-5
                                    w-5
                                    items-center
                                    justify-center

                                    rounded-full

                                    border
                                    border-slate-200

                                    bg-white
                                "
                            >
                                <span
                                    className="
                                        h-[7px]
                                        w-[7px]

                                        rounded-full

                                        border
                                        border-[#ff6600]
                                    "
                                />
                            </span>

                            7 esferas
                        </div>

                        {/* PREMIO */}

                        <div
                            className="
                                flex
                                items-center
                                gap-2

                                text-[10px]
                                font-bold
                                text-slate-500
                            "
                        >
                            <span
                                className="
                                    flex
                                    h-5
                                    w-5
                                    items-center
                                    justify-center

                                    rounded-full

                                    border
                                    border-slate-200

                                    bg-white
                                "
                            >
                                <span
                                    className="
                                        h-[6px]
                                        w-[6px]

                                        rotate-45

                                        bg-[#C1317F]
                                    "
                                />
                            </span>

                            Premios instantáneos
                        </div>

                    </div>

                    {/* =================================================
                        PRECIO + BOTONES
                    ================================================= */}

                    <div
                        className="
                            mt-8

                            flex
                            flex-col

                            gap-5

                            sm:flex-row
                            sm:items-end
                        "
                    >

                        {/* PRECIO */}

                        <div className="shrink-0">

                            <p
                                className="
                                    text-[8px]
                                    font-black
                                    uppercase
                                    tracking-[0.20em]
                                    text-slate-400
                                "
                            >
                                Valor por tarjeta
                            </p>

                            <div
                                className="
                                    mt-1
                                    flex
                                    items-end
                                "
                            >
                                <span
                                    className="
                                        pb-[3px]

                                        text-lg
                                        font-black
                                        text-[#ff6600]
                                    "
                                >
                                    $
                                </span>

                                <p
                                    className="
                                        text-[42px]
                                        font-black
                                        leading-none
                                        tracking-[-0.055em]
                                        text-[#171717]
                                    "
                                >
                                    {Number(
                                        precioUnidad
                                    ).toFixed(2)}
                                </p>

                            </div>
                        </div>

                        {/* BOTONES */}

                        <div
                            className="
                                flex
                                flex-1
                                flex-col

                                gap-2.5

                                sm:flex-row
                            "
                        >

                            <button
                                type="button"
                                onClick={
                                    scrollToPurchase
                                }
                                disabled={
                                    agotado
                                }
                                className="
                                    group

                                    inline-flex
                                    min-h-[50px]
                                    items-center
                                    justify-center

                                    rounded-xl

                                    bg-[#ff6600]

                                    px-6

                                    text-xs
                                    font-black
                                    text-white

                                    shadow-[0_8px_20px_rgba(255,102,0,0.18)]

                                    transition-all
                                    duration-300

                                    hover:-translate-y-[2px]
                                    hover:bg-[#ed5d00]
                                    hover:shadow-[0_10px_26px_rgba(255,102,0,0.28)]

                                    disabled:cursor-not-allowed
                                    disabled:bg-slate-300
                                    disabled:shadow-none
                                "
                            >
                                {agotado
                                    ? "Tarjetas agotadas"
                                    : "Comprar Tarjetas"}

                                {!agotado && (
                                    <span
                                        className="
                                            ml-2

                                            transition-transform

                                            group-hover:translate-x-1
                                        "
                                    >
                                        →
                                    </span>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={
                                    scrollToHowItWorks
                                }
                                className="
                                    inline-flex
                                    min-h-[50px]
                                    items-center
                                    justify-center

                                    rounded-xl

                                    border
                                    border-slate-200

                                    bg-white

                                    px-6

                                    text-xs
                                    font-black
                                    text-[#171717]

                                    transition-all
                                    duration-300

                                    hover:border-[#C1317F]/50
                                    hover:text-[#C1317F]
                                "
                            >
                                Cómo funciona
                            </button>

                        </div>
                    </div>

                    {/* =================================================
                        CONFIANZA
                    ================================================= */}

                    <div
                        className="
                            mt-6

                            flex
                            flex-wrap
                            items-center

                            gap-x-5
                            gap-y-2

                            text-[9px]
                            font-semibold
                            text-slate-400
                        "
                    >
                        <span>
                            Pago seguro
                        </span>

                        <span
                            className="
                                hidden

                                h-1
                                w-1

                                rounded-full

                                bg-slate-300

                                sm:block
                            "
                        />

                        <span>
                            Asignación automática
                        </span>

                        <span
                            className="
                                hidden

                                h-1
                                w-1

                                rounded-full

                                bg-slate-300

                                sm:block
                            "
                        />

                        <span>
                            También puedes regalar
                        </span>
                    </div>

                </div>

                {/* =================================================
                    KTM
                ================================================= */}

                <div
                    className="
                        order-1
                        lg:order-2
                    "
                >
                    <div
                        className="
                            relative
                            mx-auto
                            w-full
                            max-w-[720px]
                        "
                    >

                        {/* =============================================
                            PREMIO PRINCIPAL
                        ============================================= */}

                        <div
                            className="
                                mb-2

                                flex
                                items-end
                                justify-between

                                gap-4

                                px-1
                            "
                        >
                            <div>

                                <p
                                    className="
                                        text-[8px]
                                        font-black
                                        uppercase
                                        tracking-[0.22em]
                                        text-[#C1317F]
                                    "
                                >
                                    Premio principal
                                </p>

                                <h2
                                    className="
                                        mt-1

                                        text-base
                                        font-black
                                        uppercase
                                        tracking-[-0.025em]
                                        text-[#171717]

                                        md:text-lg
                                    "
                                >
                                    {titulo ??
                                        "KTM Adventure 390 R"}
                                </h2>

                            </div>
                        </div>

                        {/* =============================================
                            MOTO - SIN CUADRO
                        ============================================= */}

                        <div
                            className="
                                group
                                relative
                                w-full
                            "
                        >

                            {/* GLOW DETRÁS */}

                            <div
                                className="
                                    pointer-events-none

                                    absolute
                                    left-1/2
                                    top-1/2
                                    -z-10

                                    h-[60%]
                                    w-[65%]

                                    -translate-x-1/2
                                    -translate-y-1/2

                                    rounded-full

                                    bg-[#ff6600]/[0.07]

                                    blur-[70px]

                                    transition-colors
                                    duration-500

                                    group-hover:bg-[#C1317F]/[0.07]
                                "
                            />

                            {/* KTM DECORATIVO */}

                            <div
                                className="
                                    pointer-events-none

                                    absolute
                                    left-[3%]
                                    top-[8%]
                                    -z-10

                                    text-[75px]
                                    font-black
                                    leading-none
                                    tracking-[-0.08em]

                                    text-black/[0.025]

                                    sm:text-[105px]

                                    lg:text-[125px]
                                "
                            >
                                KTM
                            </div>

                            {/* IMAGEN / CAROUSEL */}

                            {galeriaUrls.length >
                                0 ? (
                                <div className="relative">
                                    <SorteoCarousel
                                        images={
                                            galeriaUrls
                                        }
                                        titulo={
                                            titulo ??
                                            "Baruk593"
                                        }
                                    />
                                </div>
                            ) : imagenUrl ? (
                                <div
                                    className="
                                        relative

                                        aspect-[10/7]

                                        w-full
                                    "
                                >
                                    <img
                                        src={
                                            imagenUrl
                                        }
                                        alt={
                                            titulo ??
                                            "KTM Adventure 390 R"
                                        }
                                        className="
                                            absolute
                                            inset-0

                                            h-full
                                            w-full

                                            object-contain

                                            p-2

                                            drop-shadow-[0_25px_22px_rgba(0,0,0,0.14)]

                                            transition-transform
                                            duration-700

                                            group-hover:scale-[1.025]

                                            sm:p-4
                                        "
                                    />
                                </div>
                            ) : (
                                <div
                                    className="
                                        flex

                                        aspect-[10/7]

                                        w-full

                                        items-center
                                        justify-center
                                    "
                                >
                                    <div className="text-center">

                                        <p
                                            className="
                                                text-[8px]
                                                font-black
                                                uppercase
                                                tracking-[0.24em]
                                                text-[#C1317F]
                                            "
                                        >
                                            Baruk593
                                        </p>

                                        <p
                                            className="
                                                mt-2

                                                text-3xl
                                                font-black
                                                text-[#171717]
                                            "
                                        >
                                            KTM 390
                                        </p>

                                    </div>
                                </div>
                            )}

                        </div>

                        {/* =============================================
                            PROGRESO LIMPIO
                        ============================================= */}

                        <div
                            className="
                                mt-3
                                px-1
                            "
                        >

                            <div
                                className="
                                    flex
                                    items-end
                                    justify-between
                                    gap-4
                                "
                            >

                                <div>

                                    <p
                                        className="
                                            text-[8px]
                                            font-black
                                            uppercase
                                            tracking-[0.18em]
                                            text-slate-400
                                        "
                                    >
                                        Avance del sorteo
                                    </p>

                                    <p
                                        className="
                                            mt-1

                                            text-[11px]
                                            font-bold
                                            text-[#171717]
                                        "
                                    >
                                        Sorteo al completar
                                        el 100 %
                                    </p>

                                </div>

                                <p
                                    className="
                                        shrink-0

                                        text-2xl
                                        font-black
                                        tracking-[-0.045em]
                                        text-[#171717]
                                    "
                                >
                                    {progresoTexto}

                                    <span
                                        className="
                                            ml-0.5

                                            text-sm
                                            text-[#ff6600]
                                        "
                                    >
                                        %
                                    </span>
                                </p>

                            </div>

                            {/* BARRA */}

                            <div
                                className="
                                    relative

                                    mt-4

                                    h-[7px]
                                    w-full

                                    overflow-visible

                                    rounded-full

                                    bg-slate-200
                                "
                            >
                                <div
                                    className="
                                        absolute
                                        inset-y-0
                                        left-0

                                        rounded-full

                                        bg-gradient-to-r
                                        from-[#C1317F]
                                        to-[#ff6600]

                                        transition-[width]
                                        duration-700
                                    "
                                    style={{
                                        width: `${progresoVisual}%`,
                                    }}
                                />

                                {progresoSeguro >
                                    0 && (
                                        <div
                                            className="
                                            absolute
                                            top-1/2

                                            h-[17px]
                                            w-[17px]

                                            -translate-x-1/2
                                            -translate-y-1/2

                                            rounded-full

                                            border-[4px]
                                            border-[#ffb173]

                                            bg-[#ff6600]

                                            shadow-[0_3px_12px_rgba(255,102,0,0.35)]

                                            transition-[left]
                                            duration-700
                                        "
                                            style={{
                                                left: `${Math.min(
                                                    progresoVisual,
                                                    98
                                                )}%`,
                                            }}
                                        />
                                    )}

                            </div>

                            <p
                                className="
                                    mt-3

                                    text-[9px]
                                    leading-4
                                    text-slate-400
                                "
                            >
                                El sorteo se realizará cuando
                                el avance llegue al 100 %.
                            </p>

                        </div>

                    </div>
                </div>

            </div>
        </section>
    );
}