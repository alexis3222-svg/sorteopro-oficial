"use client";

import {
    useEffect,
    useRef,
    useState,
} from "react";

import Link from "next/link";

import {
    usePathname,
} from "next/navigation";

/* ============================================================
   NAVEGACIÓN PRINCIPAL

   Ya no utilizamos el Header como índice del Home.

   Cada opción representa una sección real
   de la plataforma Baruk593.
============================================================ */

const NAVEGACION = [
    {
        href: "/",
        label: "Inicio",
    },
    {
        href: "/#como-funciona",
        label: "Cómo funciona",
    },
    {
        href: "/marketplace",
        label: "Marketplace de Esferas",
    },
    {
        href: "/tienda",
        label: "Baruk Shop",
    },
] as const;

export function SiteHeader() {
    const pathname =
        usePathname();

    const esHome =
        pathname === "/";

    const ultimoScroll =
        useRef(0);

    const [
        regOpen,
        setRegOpen,
    ] =
        useState<
            boolean | null
        >(null);

    const [
        menuOpen,
        setMenuOpen,
    ] =
        useState(false);

    const [
        visible,
        setVisible,
    ] =
        useState(true);

    const [
        scrolled,
        setScrolled,
    ] =
        useState(false);

    /* ============================================================
       SOCIO COMERCIAL
    ============================================================ */

    useEffect(() => {
        let activo =
            true;

        async function cargar() {
            try {
                const response =
                    await fetch(
                        "/api/settings/affiliate-registration",
                        {
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
                    !activo
                ) {
                    return;
                }

                setRegOpen(
                    Boolean(
                        response.ok &&
                        data?.ok &&
                        data.open
                    )
                );
            } catch {
                if (
                    activo
                ) {
                    setRegOpen(
                        false
                    );
                }
            }
        }

        void cargar();

        return () => {
            activo =
                false;
        };
    }, []);

    /* ============================================================
       OCULTAR HEADER AL BAJAR
       MOSTRAR AL SUBIR
    ============================================================ */

    useEffect(() => {
        function controlarScroll() {
            const actual =
                window.scrollY;

            setScrolled(
                actual > 20
            );

            /*
             * Siempre visible cuando
             * estamos arriba.
             */
            if (
                actual < 40
            ) {
                setVisible(
                    true
                );

                ultimoScroll.current =
                    actual;

                return;
            }

            /*
             * Mientras el menú móvil
             * esté abierto no ocultamos
             * el header.
             */
            if (
                menuOpen
            ) {
                setVisible(
                    true
                );

                ultimoScroll.current =
                    actual;

                return;
            }

            const diferencia =
                actual -
                ultimoScroll.current;

            /*
             * Bajando.
             */
            if (
                diferencia > 6
            ) {
                setVisible(
                    false
                );
            }

            /*
             * Subiendo.
             */
            if (
                diferencia < -6
            ) {
                setVisible(
                    true
                );
            }

            ultimoScroll.current =
                actual;
        }

        window.addEventListener(
            "scroll",
            controlarScroll,
            {
                passive: true,
            }
        );

        controlarScroll();

        return () => {
            window.removeEventListener(
                "scroll",
                controlarScroll
            );
        };
    }, [
        menuOpen,
    ]);

    /* ============================================================
       CERRAR MENÚ CON ESC
    ============================================================ */

    useEffect(() => {
        if (!menuOpen) {
            return;
        }

        function handleKeyDown(
            event: KeyboardEvent
        ) {
            if (event.key === "Escape") {
                setMenuOpen(false);
                setVisible(true);
            }
        }

        window.addEventListener(
            "keydown",
            handleKeyDown
        );

        return () => {
            window.removeEventListener(
                "keydown",
                handleKeyDown
            );
        };
    }, [menuOpen]);

    /* ============================================================
       CERRAR MENÚ CUANDO CAMBIA LA RUTA
    ============================================================ */

    useEffect(() => {
        setMenuOpen(
            false
        );

        setVisible(
            true
        );
    }, [
        pathname,
    ]);

    /* ============================================================
   CERRAR MENÚ MÓVIL
============================================================ */

    function cerrarMenu() {
        setMenuOpen(false);
        setVisible(true);
    }


    /* ============================================================
       IR A COMPRAR
    ============================================================ */

    function irAComprar() {
        cerrarMenu();

        if (!esHome) {
            window.location.href =
                "/#comprar-baruk-card";

            return;
        }

        document
            .getElementById(
                "comprar-baruk-card"
            )
            ?.scrollIntoView({
                behavior: "smooth",
                block: "start",
            });
    }

    /* ============================================================
       ESTILO DE LINK DESKTOP
    ============================================================ */

    const desktopLinkClass =
        `
            group
            relative

            flex
            h-[70px]
            items-center

            px-3

            whitespace-nowrap

            text-[10px]
            font-black
            uppercase
            tracking-[0.055em]

            text-[#171717]

            transition-colors
            duration-300

            hover:text-[#C1317F]
        `;

    /* ============================================================
       RENDER
    ============================================================ */

    return (
        <>
            <header
                className={`
                    fixed
                    left-0
                    right-0
                    top-0
                    z-50

                    w-full

                    transition-all
                    duration-500
                    ease-[cubic-bezier(0.22,1,0.36,1)]

                    ${visible
                        ? "translate-y-0"
                        : "-translate-y-full"
                    }

                    ${esHome
                        ? scrolled
                            ? "border-b border-white/20 bg-white/72 shadow-[0_6px_25px_rgba(0,0,0,0.08)] backdrop-blur-xl"
                            : "border-b border-white/10 bg-white/45 backdrop-blur-md"
                        : "border-b border-slate-200/80 bg-white/90 shadow-[0_5px_20px_rgba(0,0,0,0.05)] backdrop-blur-xl"
                    }
                `}
            >
                <div
                    className="
                        mx-auto

                        flex
                        h-[70px]
                        w-full
                        max-w-[1500px]

                        items-center
                        justify-between

                        gap-4

                        px-5

                        sm:px-6
                        xl:px-8
                    "
                >
                    {/* =================================================
                        LOGO
                    ================================================= */}

                    <Link
                        href="/"
                        aria-label="Ir al inicio de Baruk593"
                        className="
                            flex
                            shrink-0
                            items-center
                        "
                    >
                        <img
                            src="/barukgris-03.svg"
                            alt="Baruk593"
                            className="
                                h-[25px]
                                w-auto

                                transition-transform
                                duration-300

                                hover:scale-[1.025]
                            "
                        />
                    </Link>

                    {/* =================================================
                        NAVEGACIÓN DESKTOP
                    ================================================= */}

                    <nav
                        className="
                            hidden

                            flex-1
                            items-center
                            justify-center

                            xl:flex
                        "
                        aria-label="Navegación principal"
                    >
                        {/* RUTAS PRINCIPALES */}

                        {NAVEGACION.map(
                            (
                                item
                            ) => (
                                <Link
                                    key={
                                        item.href
                                    }
                                    href={
                                        item.href
                                    }
                                    className={
                                        desktopLinkClass
                                    }
                                >
                                    {
                                        item.label
                                    }

                                    {/* UNDERLINE HOVER */}

                                    <span
                                        className="
                                            absolute
                                            bottom-[9px]
                                            left-3
                                            right-3

                                            h-[2px]

                                            origin-center
                                            scale-x-0

                                            rounded-full

                                            bg-[#C1317F]

                                            transition-transform
                                            duration-300

                                            group-hover:scale-x-100
                                        "
                                    />
                                </Link>
                            )
                        )}

                        {/* SOCIOS */}

                        {regOpen ===
                            true && (
                                <Link
                                    href="/mi-cuenta/afiliado"
                                    onClick={cerrarMenu}
                                    className={
                                        desktopLinkClass
                                    }
                                >
                                    Afiliado

                                    <span
                                        className="
                                            absolute
                                            bottom-[9px]
                                            left-3
                                            right-3

                                            h-[2px]

                                            origin-center
                                            scale-x-0

                                            rounded-full

                                            bg-[#C1317F]

                                            transition-transform
                                            duration-300

                                            group-hover:scale-x-100
                                        "
                                    />
                                </Link>
                            )}
                    </nav>

                    {/* =================================================
                        ACCIONES DESKTOP
                    ================================================= */}

                    <div
                        className="
                            hidden
                            shrink-0
                            items-center
                            gap-2

                            xl:flex
                        "
                    >
                        {/* MI CUENTA */}

                        <Link
                            href="/mi-cuenta"
                            onClick={cerrarMenu}
                            className="
        flex
        w-full
        items-center
        justify-between

        border-b
        border-slate-100

        py-4

        text-sm
        font-black
        text-[#171717]

        transition-colors

        hover:text-[#C1317F]
    "
                        >
                            Mi cuenta

                        </Link>

                        {/* COMPRAR */}

                        <button
                            type="button"
                            onClick={
                                irAComprar
                            }
                            className="
                                group

                                flex
                                min-h-[44px]
                                items-center

                                rounded-xl

                                bg-[#ff6600]

                                px-5

                                text-[11px]
                                font-black
                                uppercase
                                tracking-[0.055em]
                                text-white

                                shadow-[0_6px_16px_rgba(255,102,0,0.16)]

                                transition-all
                                duration-300

                                hover:-translate-y-[1px]
                                hover:bg-[#ed5d00]
                                hover:shadow-[0_8px_22px_rgba(255,102,0,0.26)]
                            "
                        >
                            Comprar

                        </button>
                    </div>

                    {/* =================================================
                        BOTÓN MOBILE
                    ================================================= */}

                    <button
                        type="button"
                        aria-label={
                            menuOpen
                                ? "Cerrar menú"
                                : "Abrir menú"
                        }
                        aria-expanded={
                            menuOpen
                        }
                        onClick={() => {
                            setMenuOpen(
                                (
                                    actual
                                ) =>
                                    !actual
                            );

                            setVisible(
                                true
                            );
                        }}
                        className="
                            flex
                            h-[42px]
                            w-[42px]
                            shrink-0
                            items-center
                            justify-center

                            rounded-xl

                            border
                            border-black/10

                            bg-white/70

                            backdrop-blur-md

                            xl:hidden
                        "
                    >
                        <div
                            className="
                                relative
                                h-[16px]
                                w-[19px]
                            "
                        >
                            <span
                                className={`
                                    absolute
                                    left-0
                                    top-0

                                    h-[2px]
                                    w-full

                                    rounded-full

                                    bg-[#171717]

                                    transition-all
                                    duration-300

                                    ${menuOpen
                                        ? "top-[7px] rotate-45"
                                        : ""
                                    }
                                `}
                            />

                            <span
                                className={`
                                    absolute
                                    left-0
                                    top-[7px]

                                    h-[2px]
                                    w-full

                                    rounded-full

                                    bg-[#171717]

                                    transition-all
                                    duration-300

                                    ${menuOpen
                                        ? "opacity-0"
                                        : ""
                                    }
                                `}
                            />

                            <span
                                className={`
                                    absolute
                                    bottom-0
                                    left-0

                                    h-[2px]
                                    w-full

                                    rounded-full

                                    bg-[#171717]

                                    transition-all
                                    duration-300

                                    ${menuOpen
                                        ? "bottom-[7px] -rotate-45"
                                        : ""
                                    }
                                `}
                            />
                        </div>
                    </button>
                </div>

                {/* =================================================
                    MENÚ MÓVIL / TABLET
                ================================================= */}

                <div
                    className={`
                        overflow-hidden

                        bg-white/97

                        backdrop-blur-xl

                        transition-all
                        duration-300

                        xl:hidden

                        ${menuOpen
                            ? "max-h-[720px] border-t border-slate-200/60 opacity-100"
                            : "max-h-0 opacity-0"
                        }
                    `}
                >
                    <div
                        className="
                            mx-auto
                            w-full
                            max-w-[1500px]

                            px-5
                            py-4

                            sm:px-6
                        "
                    >
                        {/* RUTAS */}

                        {NAVEGACION.map(
                            (
                                item
                            ) => (
                                <Link
                                    key={
                                        item.href
                                    }
                                    href={
                                        item.href
                                    }
                                    className="
                                        flex
                                        w-full
                                        items-center
                                        justify-between

                                        border-b
                                        border-slate-100

                                        py-4

                                        text-left
                                        text-sm
                                        font-black

                                        text-[#171717]

                                        transition-colors

                                        hover:text-[#C1317F]
                                    "
                                >
                                    {
                                        item.label
                                    }

                                    <span
                                        className="
                                            text-[#C1317F]
                                        "
                                    >
                                        →
                                    </span>
                                </Link>
                            )
                        )}

                        {/* SOCIOS */}

                        {regOpen ===
                            true && (
                                <Link
                                    href="/mi-cuenta/afiliado"
                                    className="
                                        flex
                                        w-full
                                        items-center
                                        justify-between

                                        border-b
                                        border-slate-100

                                        py-4

                                        text-sm
                                        font-black
                                        text-[#171717]

                                        transition-colors

                                        hover:text-[#C1317F]
                                    "
                                >
                                    Socios

                                    <span
                                        className="
                                            text-[#C1317F]
                                        "
                                    >
                                        →
                                    </span>
                                </Link>
                            )}

                        {/* MI CUENTA */}

                        <Link
                            href="/mi-cuenta"
                            className="
                                flex
                                w-full
                                items-center
                                justify-between

                                border-b
                                border-slate-100

                                py-4

                                text-sm
                                font-black
                                text-[#171717]

                                transition-colors

                                hover:text-[#C1317F]
                            "
                        >
                            Mi cuenta

                            <span
                                className="
                                    text-[#C1317F]
                                "
                            >
                                →
                            </span>
                        </Link>

                        {/* COMPRAR */}

                        <button
                            type="button"
                            onClick={
                                irAComprar
                            }
                            className="
                                mt-4

                                flex
                                min-h-[50px]
                                w-full
                                items-center
                                justify-center

                                rounded-xl

                                bg-[#ff6600]

                                px-5

                                text-xs
                                font-black
                                uppercase
                                tracking-[0.06em]
                                text-white

                                shadow-[0_7px_20px_rgba(255,102,0,0.18)]

                                transition-all

                                hover:bg-[#ed5d00]
                            "
                        >
                            Comprar Tarjetas

                            <span className="ml-2">
                                →
                            </span>
                        </button>
                    </div>
                </div>
            </header>

            {/* =====================================================
                COMPENSACIÓN SOLO FUERA DEL HOME
            ===================================================== */}

            {!esHome && (
                <div className="h-[70px]" />
            )}
        </>
    );
}