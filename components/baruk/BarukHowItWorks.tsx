// components/baruk/BarukHowItWorks.tsx

"use client";

const HOVER_COLOR = "#C1317F";

const pasos = [
    {
        numero: "01",
        titulo: "Elige tus Tarjetas",
        descripcion:
            "Selecciona la cantidad de Tarjetas de la Suerte Baruk593 que deseas para ti o para regalar.",
        icono: "card",
    },
    {
        numero: "02",
        titulo: "Compra de forma segura",
        descripcion:
            "Completa tus datos, elige tu método de pago y confirma tu compra de forma rápida y segura.",
        icono: "payment",
    },
    {
        numero: "03",
        titulo: "Revela y descubre",
        descripcion:
            "Abre tu Tarjeta de la Suerte y descubre tu número, una esfera coleccionable o un premio instantáneo.",
        icono: "spark",
    },
] as const;

function Icono({
    tipo,
}: {
    tipo:
    | "card"
    | "payment"
    | "spark";
}) {
    if (tipo === "card") {
        return (
            <svg
                viewBox="0 0 48 48"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="h-11 w-11"
            >
                <rect
                    x="8"
                    y="11"
                    width="32"
                    height="24"
                    rx="4"
                    stroke="currentColor"
                    strokeWidth="3"
                />

                <path
                    d="M8 18H40"
                    stroke="currentColor"
                    strokeWidth="3"
                />

                <path
                    d="M14 27H22"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                />
            </svg>
        );
    }

    if (tipo === "payment") {
        return (
            <svg
                viewBox="0 0 48 48"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="h-11 w-11"
            >
                {/* TECHO / TOLDO */}

                <path
                    d="M9 18L12 9H36L39 18"
                    stroke="currentColor"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />

                {/* TOLDO */}

                <path
                    d="M8 18H40"
                    stroke="currentColor"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                />

                {/* BASE DE LA TIENDA */}

                <path
                    d="M11 20V39H37V20"
                    stroke="currentColor"
                    strokeWidth="2.8"
                    strokeLinejoin="round"
                />

                {/* PUERTA */}

                <path
                    d="M20 39V28H28V39"
                    stroke="currentColor"
                    strokeWidth="2.8"
                    strokeLinejoin="round"
                />

                {/* VENTANA */}

                <path
                    d="M14 25H18"
                    stroke="currentColor"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                />

                <path
                    d="M30 25H34"
                    stroke="currentColor"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                />
            </svg>
        );
    }

    return (
        <svg
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="h-11 w-11"
        >
            <path
                d="M24 6L27 17L38 20L27 23L24 34L21 23L10 20L21 17L24 6Z"
                stroke="currentColor"
                strokeWidth="2.8"
                strokeLinejoin="round"
            />

            <path
                d="M37 29L39 35L45 37L39 39L37 45L35 39L29 37L35 35L37 29Z"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinejoin="round"
            />
        </svg>
    );
}

export default function BarukHowItWorks() {
    return (
        <section
            id="como-funciona"
            className="
                scroll-mt-24
                w-full
                bg-white
                py-20

                md:py-24
            "
        >
            <div
                className="
                    mx-auto
                    w-full
                    max-w-7xl
                    px-5

                    sm:px-6
                "
            >
                {/* =====================================================
                    TITULO
                ===================================================== */}

                <div className="text-center">
                    <p
                        className="
                            text-[11px]
                            font-black
                            uppercase
                            tracking-[0.22em]
                            text-[#C1317F]
                        "
                    >
                        Fácil, rápido y seguro
                    </p>

                    <h2
                        className="
                            mt-2
                            text-3xl
                            font-black
                            tracking-[-0.045em]
                            text-[#171717]

                            md:text-4xl
                        "
                    >
                        ¿Cómo funciona?
                    </h2>

                    <p
                        className="
                            mx-auto
                            mt-3
                            max-w-2xl
                            text-sm
                            leading-6
                            text-slate-500

                            md:text-base
                        "
                    >
                        Elige, compra y revela tu
                        Tarjeta de la Suerte.
                        Todo sucede en pocos pasos.
                    </p>
                </div>

                {/* =====================================================
                    TARJETAS
                ===================================================== */}

                <div
                    className="
                        mt-12
                        grid
                        gap-8

                        md:grid-cols-3
                    "
                >
                    {pasos.map(
                        (paso) => (
                            <article
                                key={
                                    paso.numero
                                }
                                className="
                                    group
                                    relative
                                    min-h-[400px]
                                    overflow-hidden

                                    rounded-[20px]

                                    border
                                    border-slate-100

                                    bg-white

                                    px-8
                                    py-10

                                    shadow-[0_8px_22px_rgba(0,0,0,0.22)]

                                    transition-all
                                    duration-300
                                    ease-out

                                    hover:-translate-y-[3px]
                                    hover:border-[#C1317F]/40
                                    hover:shadow-[0_8px_28px_rgba(193,49,127,0.48)]

                                    md:min-h-[430px]
                                "
                            >
                                {/* =====================================
                                    CUADRICULA HOVER
                                ===================================== */}

                                <div
                                    className="
                                        pointer-events-none
                                        absolute
                                        inset-0
                                        z-0

                                        opacity-0

                                        transition-opacity
                                        duration-300

                                        group-hover:opacity-100
                                    "
                                    style={{
                                        backgroundImage: `
                                            linear-gradient(
                                                to right,
                                                rgba(193,49,127,0.75) 1px,
                                                transparent 1px
                                            ),
                                            linear-gradient(
                                                to bottom,
                                                rgba(193,49,127,0.75) 1px,
                                                transparent 1px
                                            )
                                        `,

                                        backgroundSize:
                                            "110px 100px",
                                    }}
                                />

                                {/* =====================================
                                    SUAVE VELO BLANCO
                                ===================================== */}

                                <div
                                    className="
                                        pointer-events-none
                                        absolute
                                        inset-0
                                        z-[1]

                                        bg-white/10

                                        opacity-0

                                        transition-opacity
                                        duration-300

                                        group-hover:opacity-100
                                    "
                                />

                                {/* =====================================
                                    NUMERO
                                ===================================== */}

                                <span
                                    className="
                                        absolute
                                        right-7
                                        top-7
                                        z-10

                                        text-[11px]
                                        font-black
                                        tracking-[0.18em]
                                        text-slate-300

                                        transition-colors
                                        duration-300

                                        group-hover:text-[#C1317F]
                                    "
                                >
                                    {
                                        paso.numero
                                    }
                                </span>

                                {/* =====================================
                                    CONTENIDO
                                ===================================== */}

                                <div
                                    className="
                                        relative
                                        z-10
                                        flex
                                        h-full
                                        flex-col
                                    "
                                >
                                    {/* ICONO */}

                                    <div
                                        className="
                                            mt-8
                                            text-[#555555]

                                            transition-all
                                            duration-300

                                            group-hover:text-[#C1317F]
                                        "
                                    >
                                        <Icono
                                            tipo={
                                                paso.icono
                                            }
                                        />
                                    </div>

                                    {/* TEXTO */}

                                    <div className="mt-8">
                                        <h3
                                            className="
                                                text-[18px]
                                                font-black
                                                leading-tight
                                                tracking-[-0.025em]
                                                text-[#4a4a4a]

                                                transition-colors
                                                duration-300

                                                group-hover:text-[#3f3f3f]
                                            "
                                        >
                                            {
                                                paso.titulo
                                            }
                                        </h3>

                                        <p
                                            className="
                                                mt-4
                                                text-[15px]
                                                leading-7
                                                text-[#8b8b8b]
                                            "
                                        >
                                            {
                                                paso.descripcion
                                            }
                                        </p>
                                    </div>
                                </div>

                                {/* =====================================
                                    BORDE DE LUZ
                                ===================================== */}

                                <div
                                    className="
                                        pointer-events-none
                                        absolute
                                        inset-0
                                        z-20

                                        rounded-[20px]

                                        ring-1
                                        ring-inset
                                        ring-transparent

                                        transition-all
                                        duration-300

                                        group-hover:ring-[#C1317F]/30
                                    "
                                />
                            </article>
                        )
                    )}
                </div>
            </div>
        </section>
    );
}