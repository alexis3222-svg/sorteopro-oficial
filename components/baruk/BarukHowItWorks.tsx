// components/baruk/BarukHowItWorks.tsx

const pasos = [
    {
        numero: "01",
        titulo: "Elige tus Baruk Cards",
        descripcion:
            "Selecciona la cantidad de Baruk Cards que deseas para ti o para regalar.",
        icono: "card",
    },
    {
        numero: "02",
        titulo: "Compra de forma segura",
        descripcion:
            "Completa tus datos, elige tu método de pago y confirma tu compra.",
        icono: "payment",
    },
    {
        numero: "03",
        titulo: "Revela y descubre",
        descripcion:
            "Abre tu Baruk Card y descubre tu número, una esfera o un premio instantáneo.",
        icono: "reveal",
    },
];

function IconoPaso({
    tipo,
}: {
    tipo: string;
}) {
    if (tipo === "card") {
        return (
            <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-7 w-7"
                aria-hidden="true"
            >
                <rect
                    x="3"
                    y="5"
                    width="18"
                    height="14"
                    rx="3"
                    stroke="currentColor"
                    strokeWidth="1.8"
                />

                <path
                    d="M7 9h6"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                />

                <path
                    d="M7 13h3"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                />

                <circle
                    cx="17"
                    cy="13"
                    r="1.5"
                    stroke="currentColor"
                    strokeWidth="1.6"
                />
            </svg>
        );
    }

    if (tipo === "payment") {
        return (
            <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-7 w-7"
                aria-hidden="true"
            >
                <rect
                    x="3"
                    y="6"
                    width="18"
                    height="12"
                    rx="3"
                    stroke="currentColor"
                    strokeWidth="1.8"
                />

                <path
                    d="M3 10h18"
                    stroke="currentColor"
                    strokeWidth="1.8"
                />

                <path
                    d="M7 15h4"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                />

                <path
                    d="m16 14 1.2 1.2L19.5 13"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        );
    }

    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-7 w-7"
            aria-hidden="true"
        >
            <path
                d="M12 3 13.7 8.3 19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
            />

            <path
                d="m18.5 15 .7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7.7-2.3Z"
                stroke="currentColor"
                strokeWidth="1.5"
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
                w-full
                scroll-mt-[140px]
                py-12
                md:py-16
            "
        >
            {/* ================================================
                ENCABEZADO
            ================================================= */}

            <div className="mb-8 md:mb-10">

                <div
                    className="
                        mt-2
                        flex
                        flex-col
                        gap-3

                        md:flex-row
                        md:items-end
                        md:justify-between
                    "
                >
                    <div>

                        <h2
                            className="
                                text-2xl
                                font-black
                                tracking-[-0.035em]
                                text-[#171717]

                                md:text-3xl
                            "
                        >
                            ¿Cómo funciona?
                        </h2>

                        <p
                            className="
                                mt-3
                                max-w-2xl
                                text-sm
                                leading-6
                                text-slate-500
                            "
                        >
                            Elige, compra y revela tu Baruk Card.
                            Todo sucede en pocos pasos.
                        </p>

                    </div>


                </div>

            </div>

            {/* ================================================
                PASOS
            ================================================= */}

            <div
                className="
                    relative
                    grid
                    grid-cols-1
                    gap-4

                    md:grid-cols-3
                    md:gap-5
                "
            >

                {/* Línea horizontal para escritorio */}
                <div
                    className="
                        pointer-events-none
                        absolute
                        left-[16.66%]
                        right-[16.66%]
                        top-[42px]
                        hidden
                        h-px
                        bg-slate-200

                        md:block
                    "
                />

                {pasos.map((paso) => (
                    <article
                        key={paso.numero}
                        className="
        group
        relative
        overflow-hidden

        rounded-[24px]

        border
        border-[#FFB27D]

        bg-white

        px-5
        py-5

        shadow-[0_4px_16px_rgba(0,0,0,0.025)]

        transition-all
        duration-300
        ease-out

        hover:-translate-y-1.5
        hover:border-[#ff6600]

        hover:shadow-[0_14px_32px_rgba(255,102,0,0.14)]

        md:px-6
        md:py-6
    "
                    >
                        {/* =================================================
        SOMBRA / SILUETA NARANJA AL HACER HOVER
    ================================================= */}

                        <div
                            className="
            pointer-events-none
            absolute

            -bottom-8
            left-[12%]
            right-[12%]

            h-12

            rounded-full
            bg-[#ff6600]/0
            blur-2xl

            transition-all
            duration-300

            group-hover:bg-[#ff6600]/10
        "
                        />

                        {/* =================================================
        NÚMERO DEL PASO
    ================================================= */}

                        <div
                            className="
            absolute
            right-5
            top-4

            text-[11px]
            font-black
            tracking-[0.18em]

            text-slate-300

            transition-colors
            duration-300

            group-hover:text-[#ff6600]/50
        "
                        >
                            {paso.numero}
                        </div>

                        {/* =================================================
        ICONO
    ================================================= */}

                        <div
                            className="
            relative
            z-10

            flex
            h-[54px]
            w-[54px]
            items-center
            justify-center

            rounded-2xl

            border
            border-[#FFDCC4]

            bg-[#FFF8F3]

            text-[#ff6600]

            transition-all
            duration-300

            group-hover:border-[#ff6600]
            group-hover:bg-[#ff6600]
            group-hover:text-white

            group-hover:shadow-[0_7px_18px_rgba(255,102,0,0.16)]
        "
                        >
                            <IconoPaso tipo={paso.icono} />
                        </div>

                        {/* =================================================
        TEXTO
    ================================================= */}

                        <div className="relative z-10 mt-5">

                            <h3
                                className="
                text-base
                font-black
                tracking-[-0.02em]
                text-[#171717]

                md:text-lg
            "
                            >
                                {paso.titulo}
                            </h3>

                            <p
                                className="
                mt-2
                max-w-sm

                text-xs
                leading-5
                text-slate-500

                md:text-[13px]
                md:leading-6
            "
                            >
                                {paso.descripcion}
                            </p>

                        </div>
                    </article>
                ))}

            </div>

            {/* ================================================
                MENSAJE INFERIOR
            ================================================= */}


        </section>
    );
}