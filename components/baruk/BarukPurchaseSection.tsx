"use client";

type TipoCompra =
    | "self"
    | "gift";

type BarukPurchaseSectionProps = {
    precioUnidad: number;

    agotado: boolean;

    cantidadSeleccionada:
    | number
    | null;

    onCantidadChange:
    (
        cantidad: number
    ) => void;

    tipoCompra:
    TipoCompra;

    onTipoCompraChange:
    (
        tipo: TipoCompra
    ) => void;

    destinatarioNombre:
    string;

    onDestinatarioNombreChange:
    (
        value: string
    ) => void;

    destinatarioCorreo:
    string;

    onDestinatarioCorreoChange:
    (
        value: string
    ) => void;

    destinatarioTelefono:
    string;

    onDestinatarioTelefonoChange:
    (
        value: string
    ) => void;

    mensajeRegalo:
    string;

    onMensajeRegaloChange:
    (
        value: string
    ) => void;

    onComprar:
    (
        cantidad: number
    ) => void;
};

const CANTIDADES = [
    5,
    10,
    20,
    30,
    50,
];

/* ============================================================
   ICONOS
============================================================ */

function IconUser() {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-4 w-4"
        >
            <circle
                cx="12"
                cy="8"
                r="3.5"
                stroke="currentColor"
                strokeWidth="1.7"
            />

            <path
                d="M5 19c.8-4 3.2-6 7-6s6.2 2 7 6"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
            />
        </svg>
    );
}

function IconGift() {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-4 w-4"
        >
            <path
                d="M4 9h16v11H4V9Z"
                stroke="currentColor"
                strokeWidth="1.7"
            />

            <path
                d="M12 9v11M3 6h18v3H3V6Z"
                stroke="currentColor"
                strokeWidth="1.7"
            />

            <path
                d="M12 6c-1-3-5-4-5-1 0 2 2.5 2.5 5 1Zm0 0c1-3 5-4 5-1 0 2-2.5 2.5-5 1Z"
                stroke="currentColor"
                strokeWidth="1.7"
            />
        </svg>
    );
}

function IconShield() {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-3.5 w-3.5"
        >
            <path
                d="M12 3 19 6v5c0 4.5-2.8 8-7 10-4.2-2-7-5.5-7-10V6l7-3Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
            />

            <path
                d="m9 12 2 2 4-4"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function IconLightning() {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-3.5 w-3.5"
        >
            <path
                d="m13.5 2-7 11h5L10.5 22l7-12h-5l1-8Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
            />
        </svg>
    );
}

/* ============================================================
   EXPERIENCE PASS - PREVIEW
============================================================ */

function ExperiencePassPreview({
    className = "",
    secondary = false,
}: {
    className?: string;
    secondary?: boolean;
}) {
    return (
        <div
            className={`
                relative
                aspect-[1.586/1]
                overflow-hidden

                rounded-[22px]

                border
                border-white/10

                bg-[linear-gradient(135deg,#262626_0%,#151515_38%,#0d0d0e_68%,#1b1b1d_100%)]

                shadow-[0_18px_40px_rgba(0,0,0,0.28)]

                ${secondary
                    ? "opacity-[0.88]"
                    : ""
                }

                ${className}
            `}
        >
            {/* CARBONO */}

            <div
                className="
                    pointer-events-none
                    absolute
                    inset-0
                    opacity-[0.17]
                "
                style={{
                    backgroundImage: `
                        linear-gradient(
                            45deg,
                            rgba(255,255,255,0.055) 25%,
                            transparent 25%,
                            transparent 75%,
                            rgba(255,255,255,0.055) 75%
                        ),
                        linear-gradient(
                            45deg,
                            rgba(255,255,255,0.028) 25%,
                            transparent 25%,
                            transparent 75%,
                            rgba(255,255,255,0.028) 75%
                        )
                    `,
                    backgroundSize:
                        "10px 10px",

                    backgroundPosition:
                        "0 0, 5px 5px",
                }}
            />

            {/* REFLEJO */}

            <div
                className="
                    pointer-events-none

                    absolute
                    -right-[10%]
                    -top-[35%]

                    h-[95%]
                    w-[70%]

                    rotate-[18deg]

                    bg-gradient-to-b
                    from-white/[0.12]
                    via-white/[0.025]
                    to-transparent

                    blur-[8px]
                "
            />

            {/* GLOW FUSCIA */}

            <div
                className="
                    pointer-events-none

                    absolute
                    left-1/2
                    top-1/2

                    h-[150px]
                    w-[150px]

                    -translate-x-1/2
                    -translate-y-1/2

                    rounded-full

                    bg-[#C1317F]/10

                    blur-[45px]
                "
            />

            {/* BORDE INTERIOR */}

            <div
                className="
                    pointer-events-none
                    absolute
                    inset-[1px]

                    rounded-[20px]

                    ring-1
                    ring-inset
                    ring-white/[0.045]
                "
            />

            {/* HEADER */}

            <div
                className="
                    relative
                    z-10

                    flex
                    items-center
                    justify-between

                    px-5
                    pt-5
                "
            >
                <div
                    className="
                        flex
                        items-center
                        gap-1.5
                    "
                >
                    <span
                        className="
                            text-[13px]
                            font-black
                            tracking-[-0.04em]
                            text-white
                        "
                    >
                        BARUK
                    </span>

                    <span
                        className="
                            text-[13px]
                            font-black
                            tracking-[-0.04em]
                            text-[#C1317F]
                        "
                    >
                        593
                    </span>
                </div>

                <span
                    className="
                        text-[5px]
                        font-black
                        uppercase
                        tracking-[0.18em]
                        text-white/30
                    "
                >
                    PASS / 593
                </span>
            </div>

            {/* CENTRO */}

            <div
                className="
                    relative
                    z-10

                    flex
                    h-[58%]
                    flex-col
                    items-center
                    justify-center
                "
            >
                <p
                    className="
                        text-[6px]
                        font-black
                        uppercase
                        tracking-[0.25em]
                        text-white/45
                    "
                >
                    Experience Pass
                </p>

                {/* POWER */}

                <div
                    className="
                        relative

                        mt-3

                        flex
                        h-[62px]
                        w-[62px]
                        items-center
                        justify-center

                        rounded-full

                        border
                        border-[#C1317F]/50

                        bg-black/20

                        shadow-[0_0_28px_rgba(193,49,127,0.20)]
                    "
                >
                    <div
                        className="
                            absolute
                            inset-[7px]

                            rounded-full

                            border
                            border-[#C1317F]/20
                        "
                    />

                    <div
                        className="
                            relative

                            h-[23px]
                            w-[23px]

                            rotate-45

                            rounded-full

                            border-[2px]
                            border-[#C1317F]

                            border-t-transparent

                            shadow-[0_0_10px_rgba(193,49,127,0.45)]
                        "
                    >
                        <span
                            className="
                                absolute
                                left-1/2
                                top-[-6px]

                                h-[12px]
                                w-[2px]

                                -translate-x-1/2
                                -rotate-45

                                rounded-full

                                bg-[#C1317F]

                                shadow-[0_0_8px_rgba(193,49,127,0.65)]
                            "
                        />
                    </div>
                </div>

                <p
                    className="
                        mt-2

                        text-[6px]
                        font-black
                        uppercase
                        tracking-[0.22em]
                        text-[#C1317F]
                    "
                >
                    Activar
                </p>

                <p
                    className="
                        mt-2

                        text-[8px]
                        font-black
                        uppercase
                        tracking-[0.10em]
                        text-white/80
                    "
                >
                    Tu llave de acceso
                </p>
            </div>

            {/* FOOTER */}

            <div
                className="
                    absolute
                    bottom-4
                    left-5
                    right-5
                    z-10

                    flex
                    items-end
                    justify-between
                "
            >
                <div>
                    <p
                        className="
                            text-[4px]
                            font-black
                            uppercase
                            tracking-[0.16em]
                            text-white/25
                        "
                    >
                        Series
                    </p>

                    <p
                        className="
                            mt-0.5
                            text-[6px]
                            font-black
                            uppercase
                            tracking-[0.14em]
                            text-[#ff6600]
                        "
                    >
                        KTM
                    </p>
                </div>

                <div
                    className="
                        flex
                        items-center
                        gap-1.5

                        text-[4px]
                        font-black
                        uppercase
                        tracking-[0.10em]
                        text-white/30
                    "
                >
                    <span>
                        Activa
                    </span>

                    <i
                        className="
                            h-[3px]
                            w-[3px]
                            rounded-full
                            bg-[#C1317F]
                        "
                    />

                    <span>
                        Descubre
                    </span>

                    <i
                        className="
                            h-[3px]
                            w-[3px]
                            rounded-full
                            bg-[#C1317F]
                        "
                    />

                    <span>
                        Acelera
                    </span>
                </div>
            </div>

            {/* LÍNEA DE ENERGÍA */}

            <div
                className="
                    absolute
                    bottom-[4px]
                    left-[8%]
                    right-[8%]

                    h-[2px]

                    rounded-full

                    bg-gradient-to-r
                    from-transparent
                    via-[#C1317F]
                    to-[#ff6600]

                    opacity-70

                    shadow-[0_0_14px_rgba(193,49,127,0.55)]
                "
            />
        </div>
    );
}

/* ============================================================
   COMPONENTE
============================================================ */

export default function BarukPurchaseSection({
    precioUnidad,
    agotado,

    cantidadSeleccionada,
    onCantidadChange,

    tipoCompra,
    onTipoCompraChange,

    destinatarioNombre,
    onDestinatarioNombreChange,

    destinatarioCorreo,
    onDestinatarioCorreoChange,

    destinatarioTelefono,
    onDestinatarioTelefonoChange,

    mensajeRegalo,
    onMensajeRegaloChange,

    onComprar,
}: BarukPurchaseSectionProps) {
    const cantidad =
        cantidadSeleccionada ??
        5;

    const total =
        cantidad *
        precioUnidad;

    return (
        <section
            id="comprar-baruk-card"
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
                    max-w-7xl
                    px-5
                    sm:px-6
                "
            >
                {/* =================================================
                    CABECERA
                ================================================= */}

                <div
                    className="
                        mb-7
                        flex
                        flex-col
                        gap-3

                        md:flex-row
                        md:items-end
                        md:justify-between
                    "
                >
                    <div>
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
                                    tracking-[0.22em]
                                    text-[#C1317F]
                                "
                            >
                                Tarjetas de la Suerte
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
                            Elige tus Tarjetas
                        </h2>

                        <p
                            className="
                                mt-2
                                max-w-xl

                                text-[13px]
                                leading-6
                                text-slate-500
                            "
                        >
                            Selecciona cuántas quieres,
                            compra para ti o sorprende a
                            alguien con una Tarjeta de la
                            Suerte Baruk593.
                        </p>
                    </div>

                    <div
                        className="
                            hidden
                            text-right
                            md:block
                        "
                    >
                        <p
                            className="
                                text-[9px]
                                font-black
                                uppercase
                                tracking-[0.16em]
                                text-slate-400
                            "
                        >
                            Desde
                        </p>

                        <p
                            className="
                                mt-1
                                text-2xl
                                font-black
                                tracking-[-0.04em]
                                text-[#171717]
                            "
                        >
                            $
                            {precioUnidad.toFixed(
                                2
                            )}
                        </p>

                        <p
                            className="
                                text-[10px]
                                font-semibold
                                text-slate-400
                            "
                        >
                            por tarjeta
                        </p>
                    </div>
                </div>

                {/* =================================================
                    CONTENIDO
                ================================================= */}

                <div
                    className="
                        grid
                        gap-7

                        lg:grid-cols-[0.82fr_1.18fr]
                        lg:items-start

                        xl:gap-9
                    "
                >
                    {/* =================================================
    EXPERIENCE PASS / PACK DE TARJETAS
================================================= */}

                    <div>
                        <div
                            className="
            group
            relative

            min-h-[330px]

            overflow-hidden

            rounded-[24px]

            border
            border-slate-200

            bg-[radial-gradient(circle_at_50%_45%,rgba(193,49,127,0.065),transparent_42%),#f8f8f8]

            shadow-[0_10px_25px_rgba(0,0,0,0.12)]

            transition-all
            duration-300
            ease-out

            hover:-translate-y-[3px]
            hover:border-[#C1317F]/35
            hover:shadow-[0_15px_38px_rgba(193,49,127,0.22)]

            sm:min-h-[370px]

            lg:min-h-[400px]
        "
                        >


                            {/* =============================================
            TARJETA TRASERA IZQUIERDA
        ============================================= */}

                            <div
                                className="
                absolute

                left-[8%]
                top-[26%]

                z-10

                w-[72%]

                -rotate-[8deg]

                opacity-80

                transition-all
                duration-500

                group-hover:left-[5%]
                group-hover:-rotate-[10deg]
            "
                            >
                                <ExperiencePassPreview
                                    secondary
                                />
                            </div>

                            {/* =============================================
            TARJETA TRASERA DERECHA
        ============================================= */}

                            <div
                                className="
                absolute

                right-[7%]
                top-[17%]

                z-20

                w-[74%]

                rotate-[7deg]

                opacity-90

                transition-all
                duration-500

                group-hover:right-[4%]
                group-hover:rotate-[9deg]
            "
                            >
                                <ExperiencePassPreview
                                    secondary
                                />
                            </div>

                            {/* =============================================
            TARJETA PRINCIPAL
        ============================================= */}

                            <div
                                className="
                absolute

                left-1/2
                top-1/2

                z-30

                w-[80%]

                -translate-x-1/2
                -translate-y-[45%]

                transition-all
                duration-500
                ease-out

                group-hover:-translate-y-[48%]
                group-hover:scale-[1.025]

                sm:w-[76%]

                lg:w-[78%]
            "
                            >
                                <ExperiencePassPreview />
                            </div>

                            {/* =============================================
            SOMBRA INFERIOR
        ============================================= */}

                            <div
                                className="
                pointer-events-none

                absolute
                bottom-[9%]
                left-1/2

                h-[35px]
                w-[62%]

                -translate-x-1/2

                rounded-full

                bg-black/15

                blur-[22px]
            "
                            />

                            {/* =============================================
            PRECIO
        ============================================= */}

                            <div
                                className="
                absolute
                bottom-4
                right-4
                z-40

                rounded-full

                border
                border-slate-200

                bg-white/95

                px-3
                py-1.5

                text-[8px]
                font-black
                uppercase
                tracking-[0.10em]
                text-slate-500

                shadow-sm

                backdrop-blur-sm
            "
                            >
                                $
                                {precioUnidad.toFixed(
                                    2
                                )}{" "}
                                c/u
                            </div>
                        </div>

                        {/* =================================================
        INFO INFERIOR
    ================================================= */}

                        <div
                            className="
            mt-4
            grid
            grid-cols-3
            gap-2
        "
                        >
                            {/* NÚMERO */}

                            <div
                                className="
                rounded-xl

                border
                border-slate-100

                bg-white

                px-3
                py-3

                text-center
            "
                            >
                                <p
                                    className="
                    text-[8px]
                    font-black
                    uppercase
                    tracking-[0.10em]
                    text-slate-400
                "
                                >
                                    Incluye
                                </p>

                                <p
                                    className="
                    mt-1

                    text-[10px]
                    font-black
                    text-[#171717]
                "
                                >
                                    Número único
                                </p>
                            </div>

                            {/* ESFERA */}

                            <div
                                className="
                rounded-xl

                border
                border-slate-100

                bg-white

                px-3
                py-3

                text-center
            "
                            >
                                <p
                                    className="
                    text-[8px]
                    font-black
                    uppercase
                    tracking-[0.10em]
                    text-slate-400
                "
                                >
                                    Puedes
                                </p>

                                <p
                                    className="
                    mt-1

                    text-[10px]
                    font-black
                    text-[#171717]
                "
                                >
                                    Desbloquear esfera
                                </p>
                            </div>

                            {/* PREMIO */}

                            <div
                                className="
                rounded-xl

                border
                border-slate-100

                bg-white

                px-3
                py-3

                text-center
            "
                            >
                                <p
                                    className="
                    text-[8px]
                    font-black
                    uppercase
                    tracking-[0.10em]
                    text-slate-400
                "
                                >
                                    O ganar
                                </p>

                                <p
                                    className="
                    mt-1

                    text-[10px]
                    font-black
                    text-[#171717]
                "
                                >
                                    Premio
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* =================================================
                        CONFIGURADOR
                    ================================================= */}

                    <div
                        className="
                            rounded-[24px]

                            border
                            border-slate-200

                            bg-white

                            p-5

                            shadow-[0_7px_22px_rgba(0,0,0,0.06)]

                            sm:p-6
                            md:p-7
                        "
                    >
                        {/* PRODUCTO */}

                        <div>
                            <p
                                className="
                                    text-[9px]
                                    font-black
                                    uppercase
                                    tracking-[0.18em]
                                    text-[#C1317F]
                                "
                            >
                                Tarjeta digital
                            </p>

                            <h3
                                className="
                                    mt-2
                                    text-xl
                                    font-black
                                    tracking-[-0.03em]
                                    text-[#171717]

                                    md:text-2xl
                                "
                            >
                                Tarjeta de la Suerte
                                Baruk593
                            </h3>

                            <p
                                className="
                                    mt-2
                                    max-w-xl

                                    text-xs
                                    leading-5
                                    text-slate-500
                                "
                            >
                                Cada tarjeta incluye un
                                número único de participación
                                y puede contener una esfera
                                coleccionable o un premio
                                instantáneo.
                            </p>
                        </div>

                        {/* =============================================
                            CANTIDAD
                        ============================================= */}

                        <div
                            className="
                                mt-6
                                border-t
                                border-slate-100
                                pt-5
                            "
                        >
                            <div
                                className="
                                    flex
                                    items-center
                                    justify-between
                                "
                            >
                                <div>
                                    <p
                                        className="
                                            text-[10px]
                                            font-black
                                            uppercase
                                            tracking-[0.14em]
                                            text-slate-400
                                        "
                                    >
                                        Cantidad
                                    </p>

                                    <p
                                        className="
                                            mt-1
                                            text-sm
                                            font-black
                                            text-[#171717]
                                        "
                                    >
                                        ¿Cuántas quieres?
                                    </p>
                                </div>

                                <span
                                    className="
                                        rounded-full

                                        bg-[#C1317F]/10

                                        px-3
                                        py-1.5

                                        text-[10px]
                                        font-black
                                        text-[#C1317F]
                                    "
                                >
                                    {cantidad} seleccionadas
                                </span>
                            </div>

                            <div
                                className="
                                    mt-4
                                    grid
                                    grid-cols-5
                                    gap-2
                                "
                            >
                                {CANTIDADES.map(
                                    (
                                        opcion
                                    ) => {
                                        const selected =
                                            opcion ===
                                            cantidad;

                                        return (
                                            <button
                                                key={
                                                    opcion
                                                }
                                                type="button"
                                                disabled={
                                                    agotado
                                                }
                                                onClick={() =>
                                                    onCantidadChange(
                                                        opcion
                                                    )
                                                }
                                                className={`
                                                    min-h-[46px]

                                                    rounded-xl

                                                    border

                                                    text-xs
                                                    font-black

                                                    transition-all
                                                    duration-200

                                                    ${selected
                                                        ? "border-[#C1317F] bg-[#C1317F] text-white shadow-[0_6px_16px_rgba(193,49,127,0.20)]"
                                                        : "border-slate-200 bg-white text-[#171717] hover:border-[#C1317F]/50 hover:text-[#C1317F]"
                                                    }

                                                    disabled:cursor-not-allowed
                                                    disabled:opacity-40
                                                `}
                                            >
                                                {
                                                    opcion
                                                }
                                            </button>
                                        );
                                    }
                                )}
                            </div>
                        </div>

                        {/* =============================================
                            PARA QUIÉN
                        ============================================= */}

                        <div
                            className="
                                mt-6
                                border-t
                                border-slate-100
                                pt-5
                            "
                        >
                            <p
                                className="
                                    text-[10px]
                                    font-black
                                    uppercase
                                    tracking-[0.14em]
                                    text-slate-400
                                "
                            >
                                Destino
                            </p>

                            <p
                                className="
                                    mt-1
                                    text-sm
                                    font-black
                                    text-[#171717]
                                "
                            >
                                ¿Para quién son?
                            </p>

                            <div
                                className="
                                    mt-4
                                    grid
                                    grid-cols-2
                                    gap-2
                                "
                            >
                                {/* PARA MÍ */}

                                <button
                                    type="button"
                                    onClick={() =>
                                        onTipoCompraChange(
                                            "self"
                                        )
                                    }
                                    className={`
                                        flex
                                        min-h-[50px]
                                        items-center
                                        justify-center
                                        gap-2

                                        rounded-xl

                                        border

                                        text-xs
                                        font-black

                                        transition-all

                                        ${tipoCompra ===
                                            "self"
                                            ? "border-[#C1317F] bg-[#C1317F]/10 text-[#C1317F]"
                                            : "border-slate-200 bg-white text-[#171717] hover:border-[#C1317F]/40 hover:text-[#C1317F]"
                                        }
                                    `}
                                >
                                    <IconUser />

                                    Para mí
                                </button>

                                {/* REGALAR */}

                                <button
                                    type="button"
                                    onClick={() =>
                                        onTipoCompraChange(
                                            "gift"
                                        )
                                    }
                                    className={`
                                        flex
                                        min-h-[50px]
                                        items-center
                                        justify-center
                                        gap-2

                                        rounded-xl

                                        border

                                        text-xs
                                        font-black

                                        transition-all

                                        ${tipoCompra ===
                                            "gift"
                                            ? "border-[#C1317F] bg-[#C1317F]/10 text-[#C1317F]"
                                            : "border-slate-200 bg-white text-[#171717] hover:border-[#C1317F]/40 hover:text-[#C1317F]"
                                        }
                                    `}
                                >
                                    <IconGift />

                                    Regalar
                                </button>
                            </div>

                            <p
                                className="
                                    mt-2
                                    text-[10px]
                                    leading-5
                                    text-slate-400
                                "
                            >
                                {tipoCompra ===
                                    "self"
                                    ? "Las Tarjetas de la Suerte quedarán vinculadas a tu cuenta."
                                    : "Tú realizas el pago y las tarjetas pertenecerán al destinatario."}
                            </p>
                        </div>

                        {/* =============================================
                            REGALO
                        ============================================= */}

                        {tipoCompra ===
                            "gift" && (
                                <div
                                    className="
                                    mt-5

                                    rounded-2xl

                                    border
                                    border-[#C1317F]/15

                                    bg-[#C1317F]/[0.025]

                                    p-4

                                    sm:p-5
                                "
                                >
                                    <div
                                        className="
                                        flex
                                        items-center
                                        gap-2
                                    "
                                    >
                                        <span className="text-[#C1317F]">
                                            <IconGift />
                                        </span>

                                        <p
                                            className="
                                            text-sm
                                            font-black
                                            text-[#171717]
                                        "
                                        >
                                            Datos del regalo
                                        </p>
                                    </div>

                                    <p
                                        className="
                                        mt-1
                                        text-[10px]
                                        leading-5
                                        text-slate-400
                                    "
                                    >
                                        La persona que indiques será
                                        la propietaria de las Tarjetas
                                        de la Suerte.
                                    </p>

                                    <div
                                        className="
                                        mt-4
                                        grid
                                        gap-3

                                        sm:grid-cols-2
                                    "
                                    >
                                        {/* NOMBRE */}

                                        <div className="sm:col-span-2">
                                            <label
                                                className="
                                                text-[10px]
                                                font-black
                                                text-slate-500
                                            "
                                            >
                                                Nombre del destinatario
                                            </label>

                                            <input
                                                type="text"
                                                value={
                                                    destinatarioNombre
                                                }
                                                onChange={(
                                                    e
                                                ) =>
                                                    onDestinatarioNombreChange(
                                                        e
                                                            .target
                                                            .value
                                                    )
                                                }
                                                placeholder="Ej: María Pérez"
                                                className="
                                                mt-1.5

                                                min-h-[44px]
                                                w-full

                                                rounded-xl

                                                border
                                                border-slate-200

                                                bg-white

                                                px-3

                                                text-xs
                                                text-[#171717]

                                                outline-none

                                                transition

                                                placeholder:text-slate-300

                                                focus:border-[#C1317F]
                                                focus:ring-4
                                                focus:ring-[#C1317F]/[0.07]
                                            "
                                            />
                                        </div>

                                        {/* CORREO */}

                                        <div>
                                            <label
                                                className="
                                                text-[10px]
                                                font-black
                                                text-slate-500
                                            "
                                            >
                                                Correo
                                            </label>

                                            <input
                                                type="email"
                                                value={
                                                    destinatarioCorreo
                                                }
                                                onChange={(
                                                    e
                                                ) =>
                                                    onDestinatarioCorreoChange(
                                                        e
                                                            .target
                                                            .value
                                                    )
                                                }
                                                placeholder="correo@ejemplo.com"
                                                className="
                                                mt-1.5

                                                min-h-[44px]
                                                w-full

                                                rounded-xl

                                                border
                                                border-slate-200

                                                bg-white

                                                px-3

                                                text-xs
                                                text-[#171717]

                                                outline-none

                                                transition

                                                placeholder:text-slate-300

                                                focus:border-[#C1317F]
                                                focus:ring-4
                                                focus:ring-[#C1317F]/[0.07]
                                            "
                                            />
                                        </div>

                                        {/* WHATSAPP */}

                                        <div>
                                            <label
                                                className="
                                                text-[10px]
                                                font-black
                                                text-slate-500
                                            "
                                            >
                                                WhatsApp
                                            </label>

                                            <input
                                                type="tel"
                                                value={
                                                    destinatarioTelefono
                                                }
                                                onChange={(
                                                    e
                                                ) =>
                                                    onDestinatarioTelefonoChange(
                                                        e
                                                            .target
                                                            .value
                                                    )
                                                }
                                                placeholder="09xxxxxxxx"
                                                className="
                                                mt-1.5

                                                min-h-[44px]
                                                w-full

                                                rounded-xl

                                                border
                                                border-slate-200

                                                bg-white

                                                px-3

                                                text-xs
                                                text-[#171717]

                                                outline-none

                                                transition

                                                placeholder:text-slate-300

                                                focus:border-[#C1317F]
                                                focus:ring-4
                                                focus:ring-[#C1317F]/[0.07]
                                            "
                                            />
                                        </div>

                                        {/* MENSAJE */}

                                        <div className="sm:col-span-2">
                                            <div
                                                className="
                                                flex
                                                items-center
                                                justify-between
                                            "
                                            >
                                                <label
                                                    className="
                                                    text-[10px]
                                                    font-black
                                                    text-slate-500
                                                "
                                                >
                                                    Mensaje
                                                </label>

                                                <span
                                                    className="
                                                    text-[9px]
                                                    text-slate-400
                                                "
                                                >
                                                    {
                                                        mensajeRegalo.length
                                                    }
                                                    /300
                                                </span>
                                            </div>

                                            <textarea
                                                rows={
                                                    2
                                                }
                                                maxLength={
                                                    300
                                                }
                                                value={
                                                    mensajeRegalo
                                                }
                                                onChange={(
                                                    e
                                                ) =>
                                                    onMensajeRegaloChange(
                                                        e
                                                            .target
                                                            .value
                                                    )
                                                }
                                                placeholder="Escribe un mensaje para el destinatario..."
                                                className="
                                                mt-1.5

                                                w-full
                                                resize-none

                                                rounded-xl

                                                border
                                                border-slate-200

                                                bg-white

                                                px-3
                                                py-2.5

                                                text-xs
                                                text-[#171717]

                                                outline-none

                                                transition

                                                placeholder:text-slate-300

                                                focus:border-[#C1317F]
                                                focus:ring-4
                                                focus:ring-[#C1317F]/[0.07]
                                            "
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                        {/* =============================================
                            TOTAL
                        ============================================= */}

                        <div
                            className="
                                mt-6
                                border-t
                                border-slate-100
                                pt-5
                            "
                        >
                            <div
                                className="
                                    flex
                                    items-end
                                    justify-between
                                    gap-5
                                "
                            >
                                <div>
                                    <p
                                        className="
                                            text-[10px]
                                            font-semibold
                                            text-slate-400
                                        "
                                    >
                                        {cantidad}{" "}
                                        {cantidad ===
                                            1
                                            ? "Tarjeta de la Suerte"
                                            : "Tarjetas de la Suerte"}
                                    </p>

                                    <p
                                        className="
                                            mt-1
                                            text-sm
                                            font-black
                                            text-[#171717]
                                        "
                                    >
                                        Total
                                    </p>
                                </div>

                                <p
                                    className="
                                        text-3xl
                                        font-black
                                        tracking-[-0.05em]
                                        text-[#171717]
                                    "
                                >
                                    $
                                    {total.toFixed(
                                        2
                                    )}
                                </p>
                            </div>
                        </div>

                        {/* =============================================
                            CTA
                        ============================================= */}

                        <button
                            type="button"
                            disabled={
                                agotado
                            }
                            onClick={() =>
                                onComprar(
                                    cantidad
                                )
                            }
                            className="
                                group

                                mt-5

                                flex
                                min-h-[52px]
                                w-full
                                items-center
                                justify-center

                                rounded-xl

                                bg-[#ff6600]

                                px-5

                                text-sm
                                font-black
                                text-white

                                shadow-[0_7px_20px_rgba(255,102,0,0.20)]

                                transition-all

                                hover:-translate-y-[1px]
                                hover:bg-[#ed5d00]
                                hover:shadow-[0_9px_24px_rgba(255,102,0,0.30)]

                                disabled:cursor-not-allowed
                                disabled:bg-slate-300
                                disabled:shadow-none
                            "
                        >
                            {agotado
                                ? "Tarjetas agotadas"
                                : tipoCompra ===
                                    "gift"
                                    ? "Continuar con el regalo"
                                    : "Continuar con la compra"}

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

                        {/* SEGURIDAD */}

                        <div
                            className="
                                mt-4

                                flex
                                flex-wrap
                                items-center
                                justify-center

                                gap-x-5
                                gap-y-2

                                text-[9px]
                                font-semibold
                                text-slate-400
                            "
                        >
                            <span
                                className="
                                    flex
                                    items-center
                                    gap-1.5
                                "
                            >
                                <IconShield />

                                Pago seguro
                            </span>

                            <span
                                className="
                                    flex
                                    items-center
                                    gap-1.5
                                "
                            >
                                <IconLightning />

                                Entrega digital
                            </span>

                            <span>
                                Acceso desde tu cuenta
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}