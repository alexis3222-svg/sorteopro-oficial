// components/FranjaNaranjaRotativa.tsx
"use client";

import { useEffect, useState } from "react";

const FRASES = [
    "JUEGA KTM ADVENTURE R390",
    "+2000 DOLARES EN EFECTIVO",
    "+GO KART 90 CC",
    "¡VÁLIDO PARA TODO EL ECUADOR!",
];

export function FranjaNaranjaRotativa() {
    const [index, setIndex] = useState(0);
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        // Cada ciclo dura 6 segundos (más lento, estilo PF)
        const intervalo = setInterval(() => {
            // 1) Fade out lento
            setVisible(false);

            // 2) Cuando ya casi se apagó, cambiamos de frase y hacemos fade in
            const timeoutCambio = setTimeout(() => {
                setIndex((prev) => (prev + 1) % FRASES.length);
                setVisible(true);
            }, 9000); // el fade-out dura 900ms

            return () => clearTimeout(timeoutCambio);
        }, 4000); // cambia de frase cada 4s

        return () => clearInterval(intervalo);
    }, []);

    const frase = FRASES[index];

    return (
        <div className="w-full bg-[#ff6600] flex items-center justify-center overflow-hidden">
            <p
                className={`
          py-2
          text-[11px] md:text-xs
          font-extrabold
          tracking-[0.35em]
          text-black
          uppercase
          text-center
          transition-opacity duration-[900ms] ease-out
          ${visible ? "opacity-100" : "opacity-0"}
        `}
            >
                {frase}
            </p>
        </div>
    );
}
