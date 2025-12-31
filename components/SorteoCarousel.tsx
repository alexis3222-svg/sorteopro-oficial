"use client";

import { useEffect, useState } from "react";

type Slide = {
    id: number;
    src: string;
    alt: string;
};

interface SorteoCarouselProps {
    images?: string[];   // 👉 urls dinámicas desde Supabase
    titulo?: string;     // para el alt dinámico
}

// slides por defecto (las que ya tenías en /public)
const defaultSlides: Slide[] = [
    { id: 1, src: "/gokart-1.jpg", alt: "Go Kart vista 1" },
    { id: 2, src: "/gokart-2.jpg", alt: "Go Kart vista 2" },
    { id: 3, src: "/gokart-3.jpg", alt: "Go Kart vista 3" },
];

export function SorteoCarousel({ images, titulo }: SorteoCarouselProps) {
    // Si vienen imágenes desde props, las usamos; si no, usamos las default
    const slides: Slide[] =
        images && images.length > 0
            ? images.map((src, index) => ({
                id: index + 1,
                src,
                alt: titulo ? `${titulo} - Imagen ${index + 1}` : `Imagen ${index + 1}`,
            }))
            : defaultSlides;

    const [current, setCurrent] = useState(0);

    // cambio automático
    useEffect(() => {
        const id = setInterval(() => {
            setCurrent((prev) => (prev + 1) % slides.length);
        }, 4000);
        return () => clearInterval(id);
    }, [slides.length]);

    if (slides.length === 0) return null;

    return (
        <div className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-black/5">
            <div className="relative w-full h-[420px] sm:h-[520px] md:h-[620px] lg:h-[720px]">
                <img
                    key={slides[current].id}
                    src={slides[current].src}
                    alt={slides[current].alt}
                    className="h-full w-full object-cover object-center"

                />
            </div>

            {/* Puntos indicadores */}
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
                {slides.map((slide, index) => (
                    <button
                        key={slide.id}
                        className={`h-2 w-2 rounded-full transition ${index === current ? "bg-white" : "bg-white/40"
                            }`}
                        onClick={() => setCurrent(index)}
                        aria-label={`Ir a la imagen ${index + 1}`}
                    />
                ))}
            </div>
        </div>
    );
}
