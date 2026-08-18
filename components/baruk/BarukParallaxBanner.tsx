"use client";

import Link from "next/link";

export default function BarukParallaxBanner() {
    return (
        <section className="w-full px-4 py-12 md:px-6 md:py-16">
            <div
                className="
                    relative
                    mx-auto
                    max-w-7xl
                    overflow-hidden
                    rounded-[32px]
                    border
                    border-white/10
                    shadow-[0_20px_60px_rgba(0,0,0,0.18)]
                "
            >
                {/* Fondo parallax */}
                <div
                    className="
                        relative
                        min-h-[380px]
                        md:min-h-[460px]
                        lg:min-h-[520px]
                        bg-cover
                        bg-center
                        bg-no-repeat
                        md:bg-fixed
                    "
                    style={{
                        backgroundImage: "url('/moto-carretera-montana.jpg')",
                    }}
                >
                    {/* Overlay oscuro */}
                    <div
                        className="
                            absolute
                            inset-0
                            bg-gradient-to-r
                            from-black/70
                            via-black/45
                            to-black/35
                        "
                    />

                    {/* Contenido */}
                    <div
                        className="
                            relative
                            z-10
                            flex
                            min-h-[380px]
                            md:min-h-[460px]
                            lg:min-h-[520px]
                            items-center
                            px-6
                            py-10
                            md:px-12
                            lg:px-16
                        "
                    >
                        <div className="max-w-2xl text-white">
                            <p
                                className="
                                    text-[11px]
                                    font-extrabold
                                    uppercase
                                    tracking-[0.25em]
                                    text-[#ff7a1a]
                                "
                            >
                                Experiencia Baruk593
                            </p>

                            <h2
                                className="
                                    mt-4
                                    text-3xl
                                    font-black
                                    leading-tight
                                    tracking-[-0.03em]
                                    md:text-5xl
                                    lg:text-6xl
                                "
                            >
                                Vive la aventura
                                <span className="block text-[#ff7a1a]">
                                    dentro y fuera de Baruk.
                                </span>
                            </h2>

                            <p
                                className="
                                    mt-5
                                    max-w-xl
                                    text-sm
                                    leading-7
                                    text-white/85
                                    md:text-base
                                "
                            >
                                Descubre una experiencia pensada para quienes aman
                                la emoción, la ruta y el estilo adventure. Además
                                de tus Tarjetas de la Suerte, encuentra productos
                                seleccionados para acompañar tu camino.
                            </p>

                            <div className="mt-8 flex flex-wrap gap-4">


                                <Link
                                    href="/tienda"
                                    className="
                                        inline-flex
                                        items-center
                                        justify-center
                                        rounded-full
                                        border
                                        border-white/30
                                        bg-white/10
                                        px-7
                                        py-3.5
                                        text-sm
                                        font-extrabold
                                        text-white
                                        backdrop-blur-sm
                                        transition
                                        hover:bg-white/20
                                    "
                                >
                                    Ver tienda completa
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}