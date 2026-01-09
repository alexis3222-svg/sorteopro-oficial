// components/ProgressBar.tsx
"use client";

import { useEffect, useState } from "react";

interface ProgressBarProps {
    value: number; // porcentaje ya calculado (0–100)
}

export function ProgressBar({ value }: ProgressBarProps) {
    const [internal, setInternal] = useState(0);

    // Clamp por seguridad (evita cosas raras si llega >100 o <0)
    const clamped = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));

    // Animación: 0 → value (suave)
    useEffect(() => {
        const timeout = setTimeout(() => {
            setInternal(clamped);
        }, 80);

        return () => clearTimeout(timeout);
    }, [clamped]);

    const showStripeAnim = internal > 0 && internal < 100;

    return (
        <div className="space-y-2">
            {/* Keyframes globales (sin tocar tu globals.css) */}
            <style jsx global>{`
        @keyframes cb-progress-stripes {
          0% {
            background-position: 0 0, 0 0;
          }
          100% {
            background-position: 48px 0, 0 0;
          }
        }
        @keyframes cb-progress-glow {
          0% {
            opacity: 0.35;
            transform: translateX(-20%);
          }
          100% {
            opacity: 0.15;
            transform: translateX(120%);
          }
        }
      `}</style>

            {/* ---- TEXTO SUPERIOR ---- */}
            <p className="text-center text-base md:text-lg font-semibold text-slate-800">
                Números vendidos:{" "}
                <span className="font-bold text-slate-900">{clamped.toFixed(2)}%</span>
            </p>

            {/* ---- BARRA DE PROGRESO (más gruesa + animación pro) ---- */}
            <div
                className="h-5 md:h-6 w-full overflow-hidden rounded-full bg-slate-800 shadow-sm"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Number(internal.toFixed(2))}
                aria-label="Progreso de números vendidos"
            >
                <div
                    className={[
                        "h-full rounded-full transition-[width] duration-700 ease-out",
                        // Mantienes tus colores (mismo gradiente)
                        "bg-gradient-to-r from-[#FF7F00] via-[#FF7F00] to-amber-400",
                    ].join(" ")}
                    style={{
                        width: `${internal}%`,
                        // Rayas suaves sobre el gradiente (sin cambiar tu color base)
                        backgroundImage:
                            "repeating-linear-gradient(45deg, rgba(255,255,255,.18) 0 12px, rgba(255,255,255,0) 12px 24px), linear-gradient(to right, #FF6600, #FF7F00, #ecc517)",
                        backgroundSize: "48px 48px, 100% 100%",
                        // Animación de rayas (solo mientras no está al 100)
                        animation: showStripeAnim ? "cb-progress-stripes 1.15s linear infinite" : "none",
                        // Un glow sutil (proyectosflores vibe)
                        boxShadow: "0 0 0 1px rgba(0,0,0,.12) inset, 0 0 18px rgba(255,127,0,.22)",
                        position: "relative",
                    }}
                >
                    {/* Brillo que pasa por encima (opcional pro) */}
                    <span
                        aria-hidden="true"
                        style={{
                            position: "absolute",
                            inset: 0,
                            background:
                                "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,.22) 45%, rgba(255,255,255,0) 80%)",
                            mixBlendMode: "soft-light",
                            animation: showStripeAnim ? "cb-progress-glow 2.2s ease-in-out infinite" : "none",
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
