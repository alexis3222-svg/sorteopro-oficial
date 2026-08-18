"use client";

import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";

import type {
    PointerEvent as ReactPointerEvent,
} from "react";

import { supabaseBrowser } from "@/lib/supabaseClient";

import "./BarukRevealCard.css";

/* ============================================================
   TIPOS
============================================================ */

interface SphereResult {
    id: string;
    numero: number;
    nombre: string;
    descripcion: string | null;
    imagen_url: string | null;
}

interface PrizeResult {
    id: string;
    nombre: string;
    descripcion: string | null;
    tipo: string;
    imagen_url: string | null;
    cantidad_cards: number | null;
    valor_referencial: number | null;
}

interface RevealResult {
    id: string;
    numero: number;

    extraType:
    | "none"
    | "sphere"
    | "prize";

    sphere: SphereResult | null;
    prize: PrizeResult | null;

    revealedAt: string | null;
}

interface BarukRevealCardProps {
    cardId: string;

    email?: string;

    /*
     * Se conservan por compatibilidad.
     * El nuevo diseño ya no depende de imágenes.
     */
    frontImage?: string;
    backImage?: string;

    initialRevealed?: boolean;

    onRevealed?: (
        result: RevealResult
    ) => void;
}

/* ============================================================
   COMPONENTE
============================================================ */

export default function BarukRevealCard({
    cardId,
    email = "",
    initialRevealed = false,
    onRevealed,
}: BarukRevealCardProps) {

    const [
        revealed,
        setRevealed,
    ] =
        useState(false);

    const [
        loading,
        setLoading,
    ] =
        useState(false);

    const [
        error,
        setError,
    ] =
        useState<string | null>(
            null
        );

    const [
        result,
        setResult,
    ] =
        useState<RevealResult | null>(
            null
        );

    const soundEnabled = true;

    /*
     * Audio real opcional.
     */
    const motorAudioRef =
        useRef<HTMLAudioElement | null>(
            null
        );

    /*
     * Audio sintético de respaldo.
     */
    const audioContextRef =
        useRef<AudioContext | null>(
            null
        );

    /* ============================================================
       PREPARAR AUDIO DE MOTO
    ============================================================ */

    useEffect(() => {
        const audio =
            new Audio(
                "/sounds/moto-start.mp3"
            );

        audio.preload =
            "auto";

        audio.volume =
            0.82;

        motorAudioRef.current =
            audio;

        return () => {
            audio.pause();

            motorAudioRef.current =
                null;
        };
    }, []);

    /* ============================================================
       SONIDO DE RESPALDO
    ============================================================ */

    const playSyntheticEngine =
        async () => {

            if (
                typeof window ===
                "undefined"
            ) {
                return;
            }

            if (
                !audioContextRef.current
            ) {
                audioContextRef.current =
                    new AudioContext();
            }

            const context =
                audioContextRef.current;

            if (
                context.state ===
                "suspended"
            ) {
                await context.resume();
            }

            const now =
                context.currentTime;

            /*
             * Motor grave.
             */

            const engine =
                context.createOscillator();

            const engineGain =
                context.createGain();

            const filter =
                context.createBiquadFilter();

            engine.type =
                "sawtooth";

            engine.frequency.setValueAtTime(
                48,
                now
            );

            engine.frequency.exponentialRampToValueAtTime(
                115,
                now + 0.22
            );

            engine.frequency.exponentialRampToValueAtTime(
                72,
                now + 0.82
            );

            filter.type =
                "lowpass";

            filter.frequency.setValueAtTime(
                650,
                now
            );

            engineGain.gain.setValueAtTime(
                0.0001,
                now
            );

            engineGain.gain.exponentialRampToValueAtTime(
                0.14,
                now + 0.06
            );

            engineGain.gain.exponentialRampToValueAtTime(
                0.055,
                now + 0.52
            );

            engineGain.gain.exponentialRampToValueAtTime(
                0.0001,
                now + 1.05
            );

            engine.connect(
                filter
            );

            filter.connect(
                engineGain
            );

            engineGain.connect(
                context.destination
            );

            engine.start(
                now
            );

            engine.stop(
                now + 1.1
            );

            /*
             * Segundo tono:
             * sensación de arranque / aceleración.
             */

            const rev =
                context.createOscillator();

            const revGain =
                context.createGain();

            rev.type =
                "triangle";

            rev.frequency.setValueAtTime(
                110,
                now + 0.12
            );

            rev.frequency.exponentialRampToValueAtTime(
                360,
                now + 0.48
            );

            rev.frequency.exponentialRampToValueAtTime(
                165,
                now + 0.92
            );

            revGain.gain.setValueAtTime(
                0.0001,
                now
            );

            revGain.gain.exponentialRampToValueAtTime(
                0.065,
                now + 0.18
            );

            revGain.gain.exponentialRampToValueAtTime(
                0.0001,
                now + 0.98
            );

            rev.connect(
                revGain
            );

            revGain.connect(
                context.destination
            );

            rev.start(
                now
            );

            rev.stop(
                now + 1
            );
        };

    /* ============================================================
       REPRODUCIR ENCENDIDO
    ============================================================ */

    const playMotorStart =
        async () => {

            if (
                !soundEnabled
            ) {
                return;
            }

            /*
             * Primero intentamos reproducir
             * el MP3 real.
             */

            const audio =
                motorAudioRef.current;

            if (audio) {
                try {
                    audio.currentTime =
                        0;

                    await audio.play();

                    return;
                } catch {
                    /*
                     * Si el archivo todavía no existe
                     * o el navegador no puede reproducirlo,
                     * usamos el sonido generado.
                     */
                }
            }

            try {
                await playSyntheticEngine();
            } catch (
            audioError
            ) {
                console.warn(
                    "No se pudo reproducir el sonido de activación:",
                    audioError
                );
            }
        };

    /* ============================================================
       CONSULTAR RESULTADO
    ============================================================ */

    const requestRevealResult =
        useCallback(
            async () => {

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
                    console.warn(
                        "No se pudo leer la sesión Supabase:",
                        sessionError.message
                    );
                }

                const session =
                    sessionData
                        ?.session ??
                    null;

                const headers:
                    Record<
                        string,
                        string
                    > = {
                    "Content-Type":
                        "application/json",
                };

                if (
                    session
                        ?.access_token
                ) {
                    headers.Authorization =
                        `Bearer ${session.access_token}`;
                }

                const requestBody =
                    session
                        ?.access_token
                        ? {
                            cardId,
                        }
                        : {
                            cardId,
                            email,
                        };

                const response =
                    await fetch(
                        "/api/cards/reveal",
                        {
                            method:
                                "POST",

                            headers,

                            body:
                                JSON.stringify(
                                    requestBody
                                ),

                            cache:
                                "no-store",
                        }
                    );

                const data =
                    await response.json();

                if (
                    !response.ok ||
                    !data?.ok
                ) {
                    throw new Error(
                        data?.error ??
                        "No se pudo activar la tarjeta"
                    );
                }

                return data.card as RevealResult;
            },
            [
                cardId,
                email,
            ]
        );

    /* ============================================================
       TARJETA YA REVELADA
    ============================================================ */

    useEffect(() => {

        if (
            !initialRevealed
        ) {
            return;
        }

        let cancelled =
            false;

        async function loadExistingResult() {

            try {
                setLoading(
                    true
                );

                setError(
                    null
                );

                const cardResult =
                    await requestRevealResult();

                if (
                    cancelled
                ) {
                    return;
                }

                setResult(
                    cardResult
                );

                setRevealed(
                    true
                );

            } catch (
            err: unknown
            ) {

                if (
                    cancelled
                ) {
                    return;
                }

                setError(
                    err instanceof Error
                        ? err.message
                        : "No se pudo cargar la tarjeta"
                );

            } finally {

                if (
                    !cancelled
                ) {
                    setLoading(
                        false
                    );
                }
            }
        }

        void loadExistingResult();

        return () => {
            cancelled =
                true;
        };

    }, [
        initialRevealed,
        requestRevealResult,
    ]);

    /* ============================================================
       ACTIVAR
    ============================================================ */

    const activateCard =
        async () => {

            if (
                revealed ||
                loading
            ) {
                return;
            }

            setLoading(
                true
            );

            setError(
                null
            );

            try {

                /*
                 * Primero obtenemos el resultado real.
                 */

                const cardResult =
                    await requestRevealResult();

                setResult(
                    cardResult
                );

                /*
                 * Ahora encendemos el motor.
                 */

                void playMotorStart();

                /*
                 * Pequeña espera para que
                 * la animación de energía tenga sentido.
                 */

                await new Promise<void>(
                    (
                        resolve
                    ) => {
                        window.setTimeout(
                            resolve,
                            850
                        );
                    }
                );

                /*
                 * Flip.
                 */

                setRevealed(
                    true
                );

                /*
                 * Vibración.
                 */

                if (
                    typeof navigator !==
                    "undefined" &&
                    "vibrate" in
                    navigator
                ) {
                    navigator.vibrate(
                        [
                            40,
                            30,
                            90,
                        ]
                    );
                }

                onRevealed?.(
                    cardResult
                );

            } catch (
            err: unknown
            ) {

                setError(
                    err instanceof Error
                        ? err.message
                        : "No se pudo activar la tarjeta"
                );

            } finally {

                setLoading(
                    false
                );
            }
        };

    /* ============================================================
       EFECTO 3D CON CURSOR
    ============================================================ */

    function handlePointerMove(
        event:
            ReactPointerEvent<HTMLButtonElement>
    ) {

        if (
            event.pointerType ===
            "touch"
        ) {
            return;
        }

        const element =
            event.currentTarget;

        const rect =
            element.getBoundingClientRect();

        const x =
            (
                event.clientX -
                rect.left
            ) /
            rect.width;

        const y =
            (
                event.clientY -
                rect.top
            ) /
            rect.height;

        const rotateY =
            (
                x -
                0.5
            ) *
            10;

        const rotateX =
            (
                0.5 -
                y
            ) *
            8;

        element.style.setProperty(
            "--tilt-x",
            `${rotateX}deg`
        );

        element.style.setProperty(
            "--tilt-y",
            `${rotateY}deg`
        );

        element.style.setProperty(
            "--light-x",
            `${x * 100}%`
        );

        element.style.setProperty(
            "--light-y",
            `${y * 100}%`
        );
    }

    function resetTilt(
        event:
            ReactPointerEvent<HTMLButtonElement>
    ) {

        const element =
            event.currentTarget;

        element.style.setProperty(
            "--tilt-x",
            "0deg"
        );

        element.style.setProperty(
            "--tilt-y",
            "0deg"
        );

        element.style.setProperty(
            "--light-x",
            "50%"
        );

        element.style.setProperty(
            "--light-y",
            "35%"
        );
    }

    /* ============================================================
       TEXTOS DEL RESULTADO
    ============================================================ */

    const numeroFormateado =
        result
            ? String(
                result.numero
            ).padStart(
                5,
                "0"
            )
            : "-----";

    const resultKind =
        result?.extraType ===
            "prize"
            ? "REWARD UNLOCKED"
            : result?.extraType ===
                "sphere"
                ? "SPHERE UNLOCKED"
                : "ACCESS ACTIVE";

    const resultTitle =
        result?.extraType ===
            "prize" &&
            result.prize
            ? result.prize.nombre

            : result?.extraType ===
                "sphere" &&
                result.sphere
                ? result.sphere.nombre

                : "TU NÚMERO ESTÁ EN JUEGO";

    const resultSubtext =
        result?.extraType ===
            "prize"
            ? "Premio instantáneo desbloqueado"

            : result?.extraType ===
                "sphere"
                ? "Añadida a tu colección"

                : "Tu acceso permanece activo para el premio principal.";

    /*
     * ID visual corto.
     * No se utiliza para seguridad.
     */

    const passCode =
        cardId
            .replace(
                /-/g,
                ""
            )
            .slice(
                -6
            )
            .toUpperCase();

    /* ============================================================
       INTERFAZ
    ============================================================ */

    return (
        <section className="baruk-wrapper">



            {/* ================================================
                TARJETA
            ================================================= */}

            <div className="baruk-card-area">

                <button
                    type="button"
                    className="baruk-scene"
                    onClick={
                        activateCard
                    }
                    onPointerMove={
                        handlePointerMove
                    }
                    onPointerLeave={
                        resetTilt
                    }
                    disabled={
                        revealed ||
                        loading
                    }
                    aria-label={
                        revealed
                            ? "Experience Pass Baruk593 activado"
                            : "Activar Experience Pass Baruk593"
                    }
                >

                    <div
                        className={`
                            baruk-flip-card
                            ${revealed
                                ? "is-revealed"
                                : ""
                            }
                            ${loading
                                ? "is-activating"
                                : ""
                            }
                        `}
                    >

                        {/* ====================================
                            FRENTE
                        ===================================== */}

                        <div className="baruk-card-face baruk-card-front">

                            {/* MATERIAL */}

                            <div
                                className="baruk-carbon"
                                aria-hidden="true"
                            />

                            <div
                                className="baruk-light"
                                aria-hidden="true"
                            />

                            <div
                                className="baruk-energy-line"
                                aria-hidden="true"
                            />

                            <div
                                className="baruk-metal-border"
                                aria-hidden="true"
                            />

                            {/* HEADER */}

                            <header className="baruk-pass-header">

                                <div className="baruk-logo">

                                    <strong>
                                        BARUK
                                    </strong>

                                    <span>
                                        593
                                    </span>

                                </div>

                                <div className="baruk-pass-id">
                                    PASS /{" "}
                                    {passCode}
                                </div>

                            </header>

                            {/* CENTRO */}

                            <div className="baruk-pass-center">

                                <p className="baruk-experience-label">
                                    EXPERIENCE PASS
                                </p>

                                <div className="baruk-power">

                                    <div className="baruk-power-halo" />

                                    <div className="baruk-power-button">

                                        <div className="baruk-power-symbol">
                                            <span />
                                        </div>

                                    </div>

                                </div>

                                <p className="baruk-activate-label">
                                    {loading
                                        ? "ENCENDIENDO"
                                        : "ACTIVAR"}
                                </p>

                                <p className="baruk-pass-copy">
                                    TU LLAVE DE ACCESO
                                </p>

                            </div>

                            {/* FOOTER */}

                            <footer className="baruk-pass-footer">

                                <div className="baruk-series">

                                    <span>
                                        SERIES
                                    </span>

                                    <strong>
                                        KTM
                                    </strong>

                                </div>

                                <div className="baruk-footer-wordmark">
                                    ACTIVA
                                    <i />
                                    DESCUBRE
                                    <i />
                                    ACELERA
                                </div>

                            </footer>

                        </div>

                        {/* ====================================
                            POSTERIOR
                        ===================================== */}

                        <div className="baruk-card-face baruk-card-back">

                            <div
                                className="baruk-carbon"
                                aria-hidden="true"
                            />

                            <div
                                className="baruk-light"
                                aria-hidden="true"
                            />

                            <div
                                className="baruk-energy-line"
                                aria-hidden="true"
                            />

                            <div
                                className="baruk-metal-border"
                                aria-hidden="true"
                            />

                            {/* HEADER */}

                            <header className="baruk-pass-header">

                                <div className="baruk-logo">

                                    <strong>
                                        BARUK
                                    </strong>

                                    <span>
                                        593
                                    </span>

                                </div>

                                <div className="baruk-active-status">

                                    <i />

                                    ACTIVADA

                                </div>

                            </header>

                            {/* RESULTADO */}

                            <div className="baruk-result">

                                <p className="baruk-result-eyebrow">
                                    TU NÚMERO
                                </p>

                                <strong className="baruk-live-number">
                                    {numeroFormateado}
                                </strong>

                                <p className="baruk-number-state">
                                    TU NÚMERO ESTÁ EN JUEGO
                                </p>

                                <div className="baruk-result-separator" />

                                <p className="baruk-result-kind">
                                    {resultKind}
                                </p>

                                {/* PREMIO */}

                                {result?.extraType ===
                                    "prize" &&
                                    result.prize
                                        ?.imagen_url && (

                                        <img
                                            src={
                                                result.prize.imagen_url
                                            }
                                            alt={
                                                result.prize.nombre
                                            }
                                            className="baruk-result-image"
                                            draggable={
                                                false
                                            }
                                        />

                                    )}

                                {/* ESFERA */}

                                {result?.extraType ===
                                    "sphere" &&
                                    result.sphere
                                        ?.imagen_url && (

                                        <img
                                            src={
                                                result.sphere.imagen_url
                                            }
                                            alt={
                                                result.sphere.nombre
                                            }
                                            className="baruk-result-image baruk-result-sphere"
                                            draggable={
                                                false
                                            }
                                        />

                                    )}

                                <strong className="baruk-result-title">
                                    {resultTitle}
                                </strong>

                                <span className="baruk-result-subtext">
                                    {resultSubtext}
                                </span>

                            </div>

                            {/* FOOTER */}

                            <footer className="baruk-pass-footer">

                                <div className="baruk-series">

                                    <span>
                                        STATUS
                                    </span>

                                    <strong>
                                        ACTIVE
                                    </strong>

                                </div>

                                <div className="baruk-footer-wordmark">
                                    BARUK593
                                    <i />
                                    EXPERIENCE
                                </div>

                            </footer>

                        </div>

                    </div>

                </button>

            </div>

            {/* ================================================
                ERROR
            ================================================= */}

            {error && (
                <p className="baruk-error">
                    {error}
                </p>
            )}

            {/* ================================================
                INSTRUCCIÓN
            ================================================= */}

            <p className="baruk-instruction">

                {revealed
                    ? "Acceso activado. Tu resultado quedó guardado en Baruk593."

                    : loading
                        ? "Encendiendo tu Experience Pass..."

                        : "Presiona la tarjeta para activar tu acceso."}

            </p>

        </section>
    );
}