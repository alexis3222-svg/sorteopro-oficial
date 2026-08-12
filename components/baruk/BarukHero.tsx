// components/baruk/BarukHero.tsx

"use client";

import { SorteoCarousel } from "@/components/SorteoCarousel";
import { ProgressBar } from "@/components/ProgressBar";

type BarukHeroProps = {
    titulo?: string | null;
    imagenUrl?: string | null;
    galeriaUrls?: string[];
    precioUnidad?: number;
    agotado?: boolean;

    progreso?: number;
    vendidos?: number;
    total?: number;
};

export default function BarukHero({
    titulo,
    imagenUrl,
    galeriaUrls = [],
    precioUnidad = 1,
    agotado = false,

    progreso = 0,
    vendidos = 0,
    total = 0,
}: BarukHeroProps) {

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

    const progresoSeguro = Math.min(
        Math.max(Number(progreso) || 0, 0),
        100
    );

    const vendidosTexto =
        Number(vendidos || 0).toLocaleString(
            "es-EC"
        );

    const totalTexto =
        Number(total || 0).toLocaleString(
            "es-EC"
        );

    return (
        <section className="relative w-full overflow-hidden bg-white">

            {/* Decoración muy suave */}
            <div className="pointer-events-none absolute -left-40 top-20 h-80 w-80 rounded-full bg-orange-50 blur-3xl" />

            <div className="pointer-events-none absolute -right-40 top-0 h-96 w-96 rounded-full bg-slate-50 blur-3xl" />

            {/* =====================================================
                CONTENIDO PRINCIPAL
                Más ancho para aprovechar pantallas grandes.
            ===================================================== */}

            <div
                className="
        relative
        grid
        w-full
        items-center
        gap-8

        px-0
        pt-5
        pb-10

        md:pt-6
        md:pb-12

        lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]
        lg:gap-10
        lg:pt-7
        lg:pb-14
    "
            >

                {/* =====================================================
                    COLUMNA IZQUIERDA
                ===================================================== */}

                <div className="order-2 lg:order-1">

                    {/* TÍTULO PRINCIPAL */}

                    <h1
                        className="
        max-w-[720px]
        text-[42px]
        font-black
        leading-[0.94]
        tracking-[-0.045em]
        text-[#171717]

        sm:text-[48px]
        md:text-[54px]
        lg:text-[58px]
        xl:text-[64px]
        2xl:text-[68px]
    "
                    >
                        <span className="block">
                            ELIGE TU BARUK CARD.
                        </span>

                        <span className="mt-2 block text-[#ff6600]">
                            DESCUBRE LO QUE TE ESPERA.
                        </span>
                    </h1>

                    {/* BENEFICIOS */}

                    <div className="mt-7 flex flex-wrap gap-2.5">

                        <div className="rounded-full border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 shadow-sm">
                            ✓ Número único
                        </div>

                        <div className="rounded-full border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 shadow-sm">
                            ◉ 7 esferas
                        </div>

                        <div className="rounded-full border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 shadow-sm">
                            🎁 Premios
                        </div>

                    </div>

                    {/* PRECIO */}

                    <div className="mt-9">

                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
                            Valor
                        </p>

                        <div className="mt-1 flex items-end gap-2">

                            <p className="text-4xl font-black tracking-tight text-gray-900 md:text-5xl">
                                $
                                {Number(
                                    precioUnidad
                                ).toFixed(2)}
                            </p>

                            <p className="pb-1 text-sm font-semibold text-gray-400">
                                por Baruk Card
                            </p>

                        </div>

                    </div>

                    {/* BOTONES */}

                    <div className="mt-8 flex flex-col gap-3 sm:flex-row">

                        <button
                            type="button"
                            onClick={
                                scrollToPurchase
                            }
                            disabled={
                                agotado
                            }
                            className="
                                inline-flex
                                min-h-[54px]
                                items-center
                                justify-center
                                rounded-2xl
                                bg-[#ff6600]
                                px-8
                                py-3
                                text-sm
                                font-black
                                text-white
                                shadow-lg
                                shadow-orange-500/20
                                transition

                                hover:-translate-y-0.5
                                hover:bg-[#f75f00]

                                disabled:cursor-not-allowed
                                disabled:bg-gray-300
                                disabled:shadow-none
                            "
                        >
                            {agotado
                                ? "Cards agotadas"
                                : "Conseguir Baruk Cards"}
                        </button>

                        <button
                            type="button"
                            onClick={
                                scrollToHowItWorks
                            }
                            className="
                                inline-flex
                                min-h-[54px]
                                items-center
                                justify-center
                                rounded-2xl
                                border
                                border-gray-200
                                bg-white
                                px-8
                                py-3
                                text-sm
                                font-black
                                text-gray-700
                                transition

                                hover:border-gray-300
                                hover:bg-gray-50
                            "
                        >
                            ¿Cómo funciona?
                        </button>

                    </div>

                    {/* CONFIANZA */}

                    <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-[11px] font-semibold text-gray-400">

                        <span>
                            🔒 Pago seguro
                        </span>

                        <span>
                            ⚡ Asignación automática
                        </span>

                        <span>
                            🎁 Puedes regalar
                        </span>

                    </div>

                </div>

                {/* =====================================================
                    COLUMNA DERECHA
                    KTM + PROGRESO
                ===================================================== */}

                <div className="order-1 lg:order-2">

                    <div className="w-full">

                        {/* ===============================
                            TARJETA VISUAL DE LA KTM
                        =============================== */}

                        <div className="relative">

                            <div
                                className="
                                    pointer-events-none
                                    absolute
                                    inset-8
                                    rounded-[40px]
                                    bg-gradient-to-br
                                    from-orange-100/60
                                    via-white
                                    to-gray-100
                                    blur-2xl
                                "
                            />

                            <div
                                className="
                                    relative
                                    overflow-hidden
                                    rounded-[30px]
                                    border
                                    border-gray-200
                                    bg-white
                                    p-3
                                    shadow-[0_28px_70px_rgba(0,0,0,0.10)]

                                    md:p-4
                                "
                            >

                                {galeriaUrls.length > 0 ? (

                                    <SorteoCarousel
                                        images={
                                            galeriaUrls
                                        }
                                        titulo={
                                            titulo ??
                                            "Baruk593"
                                        }
                                    />

                                ) : imagenUrl ? (

                                    <div className="relative aspect-[12/7] w-full overflow-hidden rounded-[23px] bg-white">

                                        <img
                                            src={
                                                imagenUrl
                                            }
                                            alt={
                                                titulo ??
                                                "Actividad Baruk593"
                                            }
                                            className="absolute inset-0 h-full w-full object-contain p-1 md:p-2"
                                        />

                                    </div>

                                ) : (

                                    <div className="relative flex aspect-[12/7] items-center justify-center overflow-hidden rounded-[23px] bg-[#171717]">

                                        <div className="text-center">

                                            <p className="text-xs font-black uppercase tracking-[0.28em] text-[#ff6600]">
                                                BARUK593
                                            </p>

                                            <p className="mt-3 text-3xl font-black text-white md:text-5xl">
                                                BARUK CARD
                                            </p>

                                        </div>

                                    </div>

                                )}

                            </div>

                        </div>

                        {/* =================================================
                            PROGRESS BAR
                            Directamente debajo de la tarjeta de la KTM
                        ================================================= */}

                        <div
                            className="
                                mx-auto
                                mt-6
                                w-full
                                px-1

                                md:px-3
                            "
                        >

                            <div className="flex items-end justify-between gap-4">

                                <div>

                                    <p className="mt-1 text-sm font-bold text-gray-900 md:text-base">
                                        {titulo ??
                                            "Actividad actual"}
                                    </p>

                                </div>



                            </div>

                            <div className="mt-4">
                                <ProgressBar
                                    value={
                                        progresoSeguro
                                    }
                                />
                            </div>

                            <div
                                className="
                                    mt-3
                                    flex
                                    flex-col
                                    gap-1

                                    sm:flex-row
                                    sm:items-center
                                    sm:justify-between
                                "
                            >

                                <p className="text-xs font-bold text-[#ff6600] md:text-sm">
                                    Sorteo al completar el 100 %
                                </p>

                            </div>

                            <p className="mt-3 text-xs leading-5 text-gray-400">
                                El sorteo de{" "}
                                <span className="font-semibold text-gray-600">
                                    {titulo ??
                                        "la actividad actual"}
                                </span>{" "}
                                se realiza una vez que la barra llegue al 100 %.
                            </p>

                        </div>

                    </div>

                </div>

            </div>

        </section>
    );
}