"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type Slide = {
    id: number;
    src: string;
    alt: string;
};

const slides: Slide[] = [
    { id: 1, src: "/gokart-1.jpg", alt: "Go Kart vista 1" },
    { id: 3, src: "/gokart-3.jpg", alt: "Go Kart vista 3" },
];


export function SorteoCarousel() {
    const [current, setCurrent] = useState(0);

    // cambio automático
    useEffect(() => {
        const id = setInterval(() => {
            setCurrent((prev) => (prev + 1) % slides.length);
        }, 5000);
        return () => clearInterval(id);
    }, []);

    const active = slides[current];

    const prev = () =>
        setCurrent((curr) => (curr - 1 + slides.length) % slides.length);

    const next = () =>
        setCurrent((curr) => (curr + 1) % slides.length);

    return (
        // contenedor sin tarjeta, solo imagen
        <div className="relative w-full overflow-hidden">
            {/* Imagen en formato “faixa” como PF */}
            <div className="relative w-full h-[520px] md:h-[720px] lg:h-[520px]">
                <Image
                    src={active.src}
                    alt={active.alt}
                    fill
                    priority
                    className="object-cover"
                />
            </div>

            {/* Flecha izquierda estilo PF */}
            <button
                type="button"
                onClick={prev}
                className="
          absolute left-4 top-1/2 -translate-y-1/2
          flex h-9 w-9 items-center justify-center
          rounded-full bg-black/30 text-white
          hover:bg-black/45
          transition
        "
            >
                <span className="text-2xl leading-none">‹</span>
            </button>

            {/* Flecha derecha estilo PF */}
            <button
                type="button"
                onClick={next}
                className="
          absolute right-4 top-1/2 -translate-y-1/2
          flex h-9 w-9 items-center justify-center
          rounded-full bg-black/30 text-white
          hover:bg-black/45
          transition
        "
            >
                <span className="text-2xl leading-none">›</span>
            </button>

            {/* Puntos inferiores */}
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2">
                {slides.map((slide, index) => (
                    <button
                        key={slide.id}
                        type="button"
                        onClick={() => setCurrent(index)}
                        className={`h-2 rounded-full transition-all ${index === current
                            ? "w-6 bg-[#FF7F00]"
                            : "w-2 bg-white/60"
                            }`}
                    />
                ))}
            </div>
        </div>
    );
}
