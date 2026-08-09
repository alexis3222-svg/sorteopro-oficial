"use client";

import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";

import { supabaseBrowser } from "@/lib/supabaseClient";

import "./BarukRevealCard.css";

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

    /*
     * Se conserva para compatibilidad temporal
     * con /mi-compra.
     *
     * Si existe una sesión Supabase autenticada,
     * la API utilizará el access token y no
     * dependerá de este correo.
     */
    email?: string;

    frontImage?: string;
    backImage?: string;

    initialRevealed?: boolean;

    /*
     * Más adelante nos permitirá actualizar
     * automáticamente "Mi colección" y
     * los contadores después de revelar.
     */
    onRevealed?: (
        result: RevealResult
    ) => void;
}

export default function BarukRevealCard({
    cardId,
    email = "",

    frontImage =
    "/assets/baruk-card-front-white-completa.png",

    backImage =
    "/assets/baruk-card-back-white-completa.png",

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

    const [
        soundEnabled,
        setSoundEnabled,
    ] =
        useState(true);

    const audioContextRef =
        useRef<AudioContext | null>(
            null
        );

    /*
     * =========================================================
     * SONIDO
     * =========================================================
     */

    const playTone = (
        context: AudioContext,
        frequency: number,
        startTime: number,
        duration: number,
        volume: number
    ) => {
        const oscillator =
            context.createOscillator();

        const gain =
            context.createGain();

        oscillator.type =
            "sine";

        oscillator.frequency.setValueAtTime(
            frequency,
            startTime
        );

        gain.gain.setValueAtTime(
            0.0001,
            startTime
        );

        gain.gain.exponentialRampToValueAtTime(
            volume,
            startTime + 0.02
        );

        gain.gain.exponentialRampToValueAtTime(
            0.0001,
            startTime + duration
        );

        oscillator.connect(
            gain
        );

        gain.connect(
            context.destination
        );

        oscillator.start(
            startTime
        );

        oscillator.stop(
            startTime +
            duration
        );
    };

    const playRevealSound =
        async () => {
            if (
                !soundEnabled
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

            const sweep =
                context.createOscillator();

            const sweepGain =
                context.createGain();

            sweep.type =
                "sine";

            sweep.frequency.setValueAtTime(
                180,
                now
            );

            sweep.frequency.exponentialRampToValueAtTime(
                900,
                now + 0.65
            );

            sweepGain.gain.setValueAtTime(
                0.0001,
                now
            );

            sweepGain.gain.exponentialRampToValueAtTime(
                0.07,
                now + 0.12
            );

            sweepGain.gain.exponentialRampToValueAtTime(
                0.0001,
                now + 0.72
            );

            sweep.connect(
                sweepGain
            );

            sweepGain.connect(
                context.destination
            );

            sweep.start(
                now
            );

            sweep.stop(
                now + 0.75
            );

            [
                392,
                523.25,
                659.25,
                783.99,
            ].forEach(
                (
                    frequency,
                    index
                ) => {
                    playTone(
                        context,
                        frequency,
                        now +
                        0.48 +
                        index *
                        0.09,
                        0.4,
                        0.075
                    );
                }
            );
        };

    /*
     * =========================================================
     * SOLICITAR RESULTADO
     * =========================================================
     *
     * PRIORIDAD:
     *
     * 1. Si existe sesión Supabase:
     *
     *    Authorization: Bearer access_token
     *
     *    La API comprobará owner_user_id.
     *
     * 2. Si no existe sesión:
     *
     *    enviamos email temporalmente para
     *    mantener funcionando /mi-compra.
     * =========================================================
     */

    const requestRevealResult =
        useCallback(
            async () => {
                /*
                 * Consultar sesión actual
                 * de Supabase.
                 */
                const {
                    data:
                    sessionData,

                    error:
                    sessionError,
                } =
                    await supabaseBrowser
                        .auth
                        .getSession();

                /*
                 * Un error al leer la sesión no debe
                 * impedir el flujo temporal de
                 * /mi-compra.
                 */
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

                /*
                 * Si existe sesión, enviamos
                 * el token al servidor.
                 */
                if (
                    session
                        ?.access_token
                ) {
                    headers.Authorization =
                        `Bearer ${session.access_token}`;
                }

                /*
                 * Si estamos autenticados,
                 * no necesitamos depender del
                 * correo para autorizar.
                 *
                 * Si NO estamos autenticados,
                 * conservamos email para /mi-compra.
                 */
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
                        "No se pudo cargar el resultado de la tarjeta"
                    );
                }

                return data.card as RevealResult;
            },
            [
                cardId,
                email,
            ]
        );

    /*
     * =========================================================
     * CARGAR UNA TARJETA QUE YA ESTABA REVELADA
     * =========================================================
     *
     * No reproduce sonido.
     * No vuelve a sortear.
     *
     * Simplemente recupera el resultado almacenado.
     */

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
                    err instanceof
                        Error
                        ? err.message
                        : "No se pudo cargar la tarjeta revelada"
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

        loadExistingResult();

        return () => {
            cancelled =
                true;
        };
    }, [
        initialRevealed,
        requestRevealResult,
    ]);

    /*
     * =========================================================
     * REVELAR TARJETA
     * =========================================================
     */

    const revealCard =
        async () => {
            /*
             * Evitamos:
             *
             * - doble clic
             * - múltiples peticiones
             * - volver a revelar
             */
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
                const cardResult =
                    await requestRevealResult();

                /*
                 * Primero almacenamos
                 * el resultado.
                 */
                setResult(
                    cardResult
                );

                /*
                 * Reproducimos sonido únicamente
                 * cuando el usuario hace clic.
                 */
                await playRevealSound();

                /*
                 * Activamos la animación flip.
                 */
                setRevealed(
                    true
                );

                /*
                 * Vibración ligera en dispositivos
                 * compatibles.
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
                            80,
                        ]
                    );
                }

                /*
                 * Avisamos al componente padre.
                 *
                 * Lo utilizaremos para refrescar
                 * colección, premios y contadores
                 * inmediatamente.
                 */
                onRevealed?.(
                    cardResult
                );
            } catch (
            err: unknown
            ) {
                setError(
                    err instanceof
                        Error
                        ? err.message
                        : "No se pudo revelar la tarjeta"
                );
            } finally {
                setLoading(
                    false
                );
            }
        };

    /*
     * =========================================================
     * INTERFAZ
     * =========================================================
     */

    return (
        <section className="baruk-wrapper">

            {/* CONTROL DE SONIDO */}

            <button
                type="button"
                className="baruk-sound"
                onClick={() =>
                    setSoundEnabled(
                        (
                            current
                        ) =>
                            !current
                    )
                }
            >
                {soundEnabled
                    ? "🔊 Sonido activado"
                    : "🔇 Sonido desactivado"}
            </button>

            {/* TARJETA */}

            <div className="baruk-card-area">

                <button
                    type="button"
                    className="baruk-scene"
                    onClick={
                        revealCard
                    }
                    disabled={
                        loading
                    }
                    aria-label={
                        revealed
                            ? "Tarjeta Baruk593 revelada"
                            : "Revelar Baruk Card"
                    }
                >
                    <div
                        className={`baruk-flip-card ${revealed
                                ? "is-revealed"
                                : ""
                            }`}
                    >

                        {/* ===============================
                            FRENTE
                        =============================== */}

                        <div className="baruk-card-face baruk-card-front">

                            <img
                                src={
                                    frontImage
                                }
                                alt="Frente de la tarjeta Baruk593"
                                className="baruk-image"
                                draggable={
                                    false
                                }
                            />

                            {!loading && (
                                <div
                                    className="baruk-pulse"
                                    aria-hidden="true"
                                >
                                    <span />
                                    <span />
                                    <span />
                                </div>
                            )}

                            {loading && (
                                <div className="baruk-loading">
                                    Revelando...
                                </div>
                            )}

                        </div>

                        {/* ===============================
                            PARTE POSTERIOR
                        =============================== */}

                        <div className="baruk-card-face baruk-card-back">

                            <img
                                src={
                                    backImage
                                }
                                alt="Resultado de la tarjeta Baruk593"
                                className="baruk-image"
                                draggable={
                                    false
                                }
                            />

                            {result && (
                                <div className="baruk-result-overlay">

                                    {/* NÚMERO */}

                                    <div className="baruk-live-number">
                                        <strong>
                                            {
                                                result.numero
                                            }
                                        </strong>
                                    </div>

                                    {/* PREMIO */}

                                    {result.extraType ===
                                        "prize" &&
                                        result.prize && (

                                            <div className="baruk-result-caption">

                                                <span>
                                                    ¡GANASTE!
                                                </span>

                                                <p>
                                                    {
                                                        result
                                                            .prize
                                                            .nombre
                                                    }
                                                </p>

                                            </div>
                                        )}

                                    {/* ESFERA */}

                                    {result.extraType ===
                                        "sphere" &&
                                        result.sphere && (

                                            <div className="baruk-result-caption">

                                                <span>
                                                    ¡ENCONTRASTE UNA ESFERA!
                                                </span>

                                                <p>
                                                    {
                                                        result
                                                            .sphere
                                                            .nombre
                                                    }
                                                </p>

                                            </div>
                                        )}

                                </div>
                            )}

                        </div>
                    </div>
                </button>
            </div>

            {/* ERROR */}

            {error && (
                <p className="baruk-error">
                    {error}
                </p>
            )}

            {/* MENSAJE */}

            <p className="baruk-instruction">
                {revealed
                    ? "Tu resultado quedó guardado en Baruk593."
                    : loading
                        ? "Estamos revelando tu tarjeta..."
                        : "Haz clic sobre la tarjeta para revelar el resultado."}
            </p>

        </section>
    );
}