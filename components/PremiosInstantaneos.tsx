"use client";

import {
    useEffect,
    useMemo,
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
};

type Ganador = {
    premioId: string;
    premioNombre: string;
    premioTipo: TipoPremio;
    imagenUrl: string | null;
    ganador: string;
    reveladoAt: string;
    entregado: boolean;
};

type ApiResponse = {
    ok: boolean;
    premios: Premio[];
    ganadores: Ganador[];
    error?: string;
};

function iconoPremio(tipo: TipoPremio) {
    switch (tipo) {
        case "digital_cards":
            return "🎴";

        case "cash":
            return "💵";

        case "physical":
            return "🎁";

        case "experience":
            return "🌋";

        case "discount":
            return "🏷️";

        default:
            return "🎁";
    }
}

function textoTipo(tipo: TipoPremio) {
    switch (tipo) {
        case "digital_cards":
            return "Baruk Cards";

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

function tiempoRelativo(fecha: string) {
    const ahora = Date.now();

    const fechaMs =
        new Date(fecha).getTime();

    const diferencia =
        Math.max(
            0,
            ahora - fechaMs
        );

    const minutos =
        Math.floor(
            diferencia / 60000
        );

    if (minutos < 1) {
        return "Ahora";
    }

    if (minutos < 60) {
        return `Hace ${minutos} min`;
    }

    const horas =
        Math.floor(
            minutos / 60
        );

    if (horas < 24) {
        return `Hace ${horas} ${horas === 1
            ? "hora"
            : "horas"
            }`;
    }

    const dias =
        Math.floor(
            horas / 24
        );

    if (dias === 1) {
        return "Ayer";
    }

    if (dias < 7) {
        return `Hace ${dias} días`;
    }

    return new Intl.DateTimeFormat(
        "es-EC",
        {
            day: "2-digit",
            month: "short",
        }
    ).format(
        new Date(fecha)
    );
}

export function PremiosInstantaneos() {
    const [
        premios,
        setPremios,
    ] = useState<Premio[]>([]);

    const [
        ganadores,
        setGanadores,
    ] = useState<Ganador[]>([]);

    const [
        loading,
        setLoading,
    ] = useState(true);

    const [
        error,
        setError,
    ] = useState<string | null>(
        null
    );

    const [
        premioSeleccionado,
        setPremioSeleccionado,
    ] = useState<Premio | null>(
        null
    );


    // =====================================================
    // CARGAR PREMIOS
    // =====================================================

    useEffect(() => {
        const cargar = async () => {
            try {
                setLoading(true);
                setError(null);

                const response =
                    await fetch(
                        "/api/public/premios-instantaneos",
                        {
                            cache: "no-store",
                        }
                    );

                const data: ApiResponse =
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
                    data.premios ?? []
                );

                setGanadores(
                    data.ganadores ?? []
                );
            } catch (err) {
                console.error(err);

                setError(
                    "No pudimos cargar los premios en este momento."
                );
            } finally {
                setLoading(false);
            }
        };

        cargar();
    }, []);

    // =====================================================
    // CERRAR MODAL CON ESC
    // =====================================================

    useEffect(() => {
        if (!premioSeleccionado) {
            return;
        }

        const cerrarConEscape = (
            event: KeyboardEvent
        ) => {
            if (
                event.key === "Escape"
            ) {
                setPremioSeleccionado(
                    null
                );
            }
        };

        window.addEventListener(
            "keydown",
            cerrarConEscape
        );

        return () => {
            window.removeEventListener(
                "keydown",
                cerrarConEscape
            );
        };
    }, [premioSeleccionado]);

    // =====================================================
    // GANADORES DEL PREMIO SELECCIONADO
    // =====================================================

    const ganadoresPremio =
        useMemo(() => {
            if (
                !premioSeleccionado
            ) {
                return [];
            }

            return ganadores.filter(
                (ganador) =>
                    ganador.premioId ===
                    premioSeleccionado.id
            );
        }, [
            ganadores,
            premioSeleccionado,
        ]);

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
                    block: "start",
                });
        }, 100);
    }

    return (

        <section
            className="
                    w-full
                    py-12
                    md:py-16
                "
        >
            {/* =========================================
                    ENCABEZADO
                ========================================== */}

            <div className="mb-8">

                <p
                    className="
                            text-[10px]
                            font-black
                            uppercase
                            tracking-[0.22em]
                            text-[#ff6600]
                        "
                >
                    Descubre al instante
                </p>

                <h2
                    className="
                            mt-2
                            text-2xl
                            font-black
                            tracking-[-0.035em]
                            text-[#171717]

                            md:text-3xl
                        "
                >
                    Premios instantáneos
                </h2>

                <p
                    className="
                            mt-3
                            max-w-3xl
                            text-sm
                            leading-6
                            text-slate-500
                        "
                >
                    Tu Baruk Card siempre incluye
                    un número de participación,
                    pero algunas esconden algo más.
                    Revela la tuya y descubre si
                    contiene un premio instantáneo.
                </p>

            </div>

            {/* =========================================
                    LOADING
                ========================================== */}

            {loading && (
                <div
                    className="
                            rounded-[24px]
                            border
                            border-slate-200
                            bg-[#fafafa]
                            px-6
                            py-12
                            text-center
                            text-sm
                            text-slate-400
                        "
                >
                    Cargando premios...
                </div>
            )}

            {/* ERROR */}
            {!loading &&
                error && (
                    <div
                        className="
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

            {/* =========================================
                    CARDS DE PREMIOS
                ========================================== */}

            {!loading &&
                !error &&
                premios.length > 0 && (
                    <div
                        className="
                                grid
                                grid-cols-2
                                gap-3

                                md:gap-5

                                lg:grid-cols-4
                            "
                    >
                        {premios.map(
                            (premio) => {

                                const tieneGanador =
                                    premio.revelados > 0;

                                const ultimoGanador =
                                    ganadores.find(
                                        (ganador) =>
                                            ganador.premioId === premio.id
                                    );

                                return (
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
                                                rounded-[24px]
                                                border
                                                border-slate-200
                                                bg-white
                                                text-left

                                                transition-all
                                                duration-300

                                                hover:-translate-y-1
                                                hover:border-orange-300
                                                hover:shadow-[0_18px_42px_rgba(255,102,0,0.10)]

                                                focus:outline-none
                                                focus:ring-2
                                                focus:ring-orange-200
                                            "
                                    >
                                        {/* IMAGEN */}
                                        <div
                                            className="
                                                    relative
                                                    flex
                                                    aspect-[4/3]
                                                    items-center
                                                    justify-center
                                                    overflow-hidden
                                                    bg-[#f7f7f7]
                                                "
                                        >
                                            {/* ESTADO */}
                                            <div
                                                className="
                                                        absolute
                                                        left-3
                                                        top-3
                                                        z-10
                                                    "
                                            >
                                                {premio.agotado ? (
                                                    <span
                                                        className="
                                                                inline-flex
                                                                rounded-full
                                                                bg-[#171717]
                                                                px-3
                                                                py-1.5
                                                                text-[9px]
                                                                font-black
                                                                uppercase
                                                                tracking-[0.12em]
                                                                text-white
                                                                shadow-sm
                                                            "
                                                    >
                                                        Agotado
                                                    </span>
                                                ) : tieneGanador ? (
                                                    <span
                                                        className="
                                                                inline-flex
                                                                items-center
                                                                gap-1.5
                                                                rounded-full
                                                                bg-white
                                                                px-3
                                                                py-1.5
                                                                text-[9px]
                                                                font-black
                                                                uppercase
                                                                tracking-[0.10em]
                                                                text-[#ff6600]
                                                                shadow-sm
                                                            "
                                                    >
                                                        <span
                                                            className="
                                                                    h-1.5
                                                                    w-1.5
                                                                    rounded-full
                                                                    bg-[#ff6600]
                                                                "
                                                        />

                                                        Premio revelado
                                                    </span>
                                                ) : (
                                                    <span
                                                        className="
                                                                inline-flex
                                                                rounded-full
                                                                bg-white
                                                                px-3
                                                                py-1.5
                                                                text-[9px]
                                                                font-black
                                                                uppercase
                                                                tracking-[0.12em]
                                                                text-[#ff6600]
                                                                shadow-sm
                                                            "
                                                    >
                                                        Disponible
                                                    </span>
                                                )}
                                            </div>

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
                                                            p-6
                                                            transition
                                                            duration-500

                                                            group-hover:scale-[1.05]
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
                                                            rounded-full
                                                            border
                                                            border-orange-100
                                                            bg-white
                                                            text-4xl
                                                            shadow-sm
                                                        "
                                                >
                                                    {iconoPremio(
                                                        premio.tipo
                                                    )}
                                                </div>
                                            )}

                                            {/* VER DETALLES */}
                                            <div
                                                className="
                                                        absolute
                                                        bottom-3
                                                        right-3

                                                        flex
                                                        h-9
                                                        w-9
                                                        translate-y-2
                                                        items-center
                                                        justify-center

                                                        rounded-full
                                                        bg-white
                                                        text-[#171717]

                                                        opacity-0
                                                        shadow-lg

                                                        transition-all
                                                        duration-300

                                                        group-hover:translate-y-0
                                                        group-hover:opacity-100
                                                    "
                                            >
                                                →
                                            </div>
                                        </div>

                                        {/* INFORMACIÓN */}
                                        <div
                                            className="
                                                    p-4
                                                    md:p-5
                                                "
                                        >
                                            <p
                                                className="
                                                        text-[9px]
                                                        font-black
                                                        uppercase
                                                        tracking-[0.18em]
                                                        text-[#ff6600]
                                                    "
                                            >
                                                {textoTipo(
                                                    premio.tipo
                                                )}
                                            </p>

                                            <h3
                                                className="
                                                        mt-2
                                                        text-sm
                                                        font-black
                                                        leading-5
                                                        text-[#171717]

                                                        md:text-base
                                                    "
                                            >
                                                {
                                                    premio.nombre
                                                }
                                            </h3>

                                            {premio.descripcion && (
                                                <p
                                                    className="
                                                            mt-2
                                                            line-clamp-2
                                                            text-[11px]
                                                            leading-5
                                                            text-slate-400
                                                        "
                                                >
                                                    {
                                                        premio.descripcion
                                                    }
                                                </p>
                                            )}


                                            {tieneGanador && ultimoGanador && (
                                                <div
                                                    className="
            mt-4
            border-t
            border-slate-100
            pt-3
        "
                                                >
                                                    <div className="flex items-center gap-3">

                                                        <div
                                                            className="
                    flex
                    h-8
                    w-8
                    shrink-0
                    items-center
                    justify-center
                    rounded-full
                    bg-[#fff5ee]
                    text-sm
                "
                                                        >
                                                            🎉
                                                        </div>

                                                        <div className="min-w-0 flex-1">

                                                            <p
                                                                className="
                        text-[9px]
                        font-black
                        uppercase
                        tracking-[0.13em]
                        text-slate-400
                    "
                                                            >
                                                                Último ganador
                                                            </p>

                                                            <div
                                                                className="
                        mt-0.5
                        flex
                        items-center
                        justify-between
                        gap-2
                    "
                                                            >
                                                                <p
                                                                    className="
                            truncate
                            text-[11px]
                            font-black
                            text-[#171717]
                        "
                                                                >
                                                                    {ultimoGanador.ganador}
                                                                </p>

                                                                <p
                                                                    className="
                            shrink-0
                            text-[9px]
                            font-semibold
                            text-slate-400
                        "
                                                                >
                                                                    {tiempoRelativo(
                                                                        ultimoGanador.reveladoAt
                                                                    )}
                                                                </p>
                                                            </div>

                                                        </div>

                                                    </div>
                                                </div>
                                            )}

                                        </div>
                                    </button>
                                );
                            }
                        )}
                    </div>
                )}

            {/* 
                   </section>

        {/* =============================================
            MODAL DEL PREMIO
        ============================================== */}

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
                            rounded-[28px]
                            bg-white
                            shadow-[0_30px_90px_rgba(0,0,0,0.25)]
                        "
                        onClick={(
                            event
                        ) =>
                            event.stopPropagation()
                        }
                    >
                        {/* CERRAR */}
                        <button
                            type="button"
                            onClick={() =>
                                setPremioSeleccionado(
                                    null
                                )
                            }
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

                                transition

                                hover:bg-slate-100
                            "
                        >
                            ×
                        </button>

                        {/* IMAGEN */}
                        <div
                            className="
                                flex
                                aspect-[16/9]
                                items-center
                                justify-center
                                overflow-hidden
                                rounded-t-[28px]
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
                                        p-8
                                    "
                                />
                            ) : (
                                <div
                                    className="
                                        flex
                                        h-24
                                        w-24
                                        items-center
                                        justify-center
                                        rounded-full
                                        border
                                        border-orange-100
                                        bg-white
                                        text-5xl
                                        shadow-sm
                                    "
                                >
                                    {iconoPremio(
                                        premioSeleccionado.tipo
                                    )}
                                </div>
                            )}
                        </div>

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
                                        text-[#ff6600]
                                    "
                                >
                                    Premio instantáneo
                                </p>

                                <span
                                    className={`
                                        rounded-full
                                        px-3
                                        py-1
                                        text-[9px]
                                        font-black
                                        uppercase
                                        tracking-[0.10em]

                                        ${premioSeleccionado.agotado
                                            ? "bg-slate-900 text-white"
                                            : "bg-orange-50 text-[#ff6600]"
                                        }
                                    `}
                                >
                                    {premioSeleccionado.agotado
                                        ? "Agotado"
                                        : "Disponible"}
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

                            {/* GANADORES DEL PREMIO */}
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
                                        tracking-[0.18em]
                                        text-slate-400
                                    "
                                >
                                    Ganadores recientes
                                </p>

                                {ganadoresPremio.length >
                                    0 ? (
                                    <div className="mt-3 space-y-2">

                                        {ganadoresPremio
                                            .slice(
                                                0,
                                                5
                                            )
                                            .map(
                                                (
                                                    ganador,
                                                    index
                                                ) => (
                                                    <div
                                                        key={`${ganador.reveladoAt}-${index}`}
                                                        className="
                                                            flex
                                                            items-center
                                                            justify-between
                                                            gap-3
                                                            rounded-xl
                                                            bg-[#fafafa]
                                                            px-4
                                                            py-3
                                                        "
                                                    >
                                                        <div
                                                            className="
                                                                flex
                                                                items-center
                                                                gap-2
                                                            "
                                                        >
                                                            <span>
                                                                🎉
                                                            </span>

                                                            <p
                                                                className="
                                                                    text-xs
                                                                    font-bold
                                                                    text-[#171717]
                                                                "
                                                            >
                                                                {
                                                                    ganador.ganador
                                                                }
                                                            </p>
                                                        </div>

                                                        <p
                                                            className="
                                                                text-[10px]
                                                                font-semibold
                                                                text-slate-400
                                                            "
                                                        >
                                                            {tiempoRelativo(
                                                                ganador.reveladoAt
                                                            )}
                                                        </p>
                                                    </div>
                                                )
                                            )}
                                    </div>
                                ) : (
                                    <p
                                        className="
                                            mt-3
                                            text-xs
                                            leading-5
                                            text-slate-400
                                        "
                                    >
                                        Este premio todavía no ha sido revelado públicamente.
                                    </p>
                                )}
                            </div>

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
                                    bg-[#ff6600]
                                    px-5
                                    text-sm
                                    font-black
                                    text-white
                                    shadow-[0_8px_20px_rgba(255,102,0,0.18)]
                                    transition

                                    hover:-translate-y-0.5
                                    hover:bg-[#f15f00]
                                "
                            >
                                Quiero una Baruk Card
                            </button>

                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}