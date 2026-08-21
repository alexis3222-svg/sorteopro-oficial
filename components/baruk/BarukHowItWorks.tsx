// components/baruk/BarukHowItWorks.tsx
"use client";

const pasos = [
    {
        numero: "01",
        titulo: "Elige tus Experience Pass",
        descripcion:
            "Selecciona cuántas quieres comprar para ti o para regalar.",
        icono: "card",
        color: "orange",
    },
    {
        numero: "02",
        titulo: "Paga de forma segura",
        descripcion:
            "Elige PayPhone, Saldo Baruk593 o transferencia y confirma tu compra.",
        icono: "payment",
        color: "pink",
    },
    {
        numero: "03",
        titulo: "Revela y descubre",
        descripcion:
            "Descubre tu número y conoce si tu Experience Pass contiene una F1 Sphere o un premio instantáneo.",
        icono: "spark",
        color: "orange",
    },
] as const;

function IconoPaso({
    tipo,
}: {
    tipo: "card" | "payment" | "spark";
}) {
    if (tipo === "card") {
        return (
            <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
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
                    d="M7 9h7M7 13h4"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                />
                <circle
                    cx="17"
                    cy="14"
                    r="1.5"
                    stroke="currentColor"
                    strokeWidth="1.6"
                />
            </svg>
        );
    }

    if (tipo === "payment") {
        return (
            <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
                <rect
                    x="3"
                    y="6"
                    width="18"
                    height="12"
                    rx="3"
                    stroke="currentColor"
                    strokeWidth="1.8"
                />
                <path d="M3 10h18" stroke="currentColor" strokeWidth="1.8" />
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
        <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
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
                scroll-mt-[120px]
                py-12
                md:py-14
            "
        >
            <div
                className="
        mx-auto
        w-full
        max-w-7xl
        px-4
        md:px-6
    "
            >
                {/* ENCABEZADO */}
                <div className="flex flex-col gap-3">
                    <div>
                        <div className="flex items-center gap-3">
                            <span
                                className="
                                    h-[3px]
                                    w-7
                                    rounded-full
                                    bg-gradient-to-r
                                    from-[#C1317F]
                                    to-[#ff6600]
                                "
                            />
                            <p
                                className="
                                    text-[9px]
                                    font-black
                                    uppercase
                                    tracking-[0.22em]
                                    text-[#C1317F]
                                "
                            >
                                Así de fácil
                            </p>
                        </div>

                        <h2
                            className="
                                mt-3
                                text-2xl
                                font-black
                                tracking-[-0.04em]
                                text-[#171717]
                                md:text-[32px]
                            "
                        >
                            ¿Cómo funciona?
                        </h2>

                        <p
                            className="
                                mt-2
                                max-w-xl
                                text-xs
                                leading-5
                                text-slate-500
                                md:text-[13px]
                            "
                        >
                            Compra, revela y participa en pocos pasos.
                        </p>
                    </div>
                </div>

                {/* PASOS */}
                <div
                    className="
                        relative
                        mt-7
                        grid
                        gap-5
                        md:grid-cols-3
                    "
                >
                    <div
                        className="
                            pointer-events-none
                            absolute
                            left-[16.66%]
                            right-[16.66%]
                            top-[32px]
                            hidden
                            h-px
                            bg-gradient-to-r
                            from-[#ff6600]/20
                            via-[#C1317F]/25
                            to-[#ff6600]/20
                            md:block
                        "
                    />

                    {pasos.map((paso) => {
                        const esRosa = paso.color === "pink";

                        return (
                            <article
                                key={paso.numero}
                                className="
                                    group
                                    relative
                                    overflow-hidden
                                    rounded-[22px]
                                    border
                                    border-slate-200
                                    bg-white
                                    p-6
                                    shadow-[0_12px_30px_rgba(15,23,42,0.08)]
                                    transition-all
                                    duration-300
                                    hover:-translate-y-1
                                    hover:shadow-[0_18px_40px_rgba(15,23,42,0.12)]
                                "
                            >
                                <span
                                    className="
                                        absolute
                                        right-5
                                        top-5
                                        text-[10px]
                                        font-black
                                        tracking-[0.16em]
                                        text-slate-300
                                    "
                                >
                                    {paso.numero}
                                </span>

                                <div
                                    className={`
                                        relative
                                        z-10
                                        flex
                                        h-12
                                        w-12
                                        items-center
                                        justify-center
                                        rounded-[15px]
                                        transition-all
                                        duration-300
                                        ${esRosa
                                            ? "bg-[#C1317F]/10 text-[#C1317F] group-hover:bg-[#C1317F] group-hover:text-white"
                                            : "bg-[#ff6600]/10 text-[#ff6600] group-hover:bg-[#ff6600] group-hover:text-white"
                                        }
                                    `}
                                >
                                    <IconoPaso tipo={paso.icono} />
                                </div>

                                <h3
                                    className="
                                        mt-5
                                        text-[15px]
                                        font-black
                                        tracking-[-0.02em]
                                        text-[#171717]
                                        md:text-[28px]
                                    "
                                >
                                    {paso.titulo}
                                </h3>

                                <p
                                    className="
                                        mt-2
                                        text-[12px]
                                        leading-6
                                        text-slate-500
                                        md:text-[14px]
                                    "
                                >
                                    {paso.descripcion}
                                </p>
                            </article>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}