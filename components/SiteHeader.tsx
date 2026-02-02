// components/SiteHeader.tsx
"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { FranjaNaranjaRotativa } from "./FranjaNaranjaRotativa";

export function SiteHeader() {
    const pathname = usePathname();
    const esHome = pathname === "/";

    // Estado del registro de socios
    const [regOpen, setRegOpen] = useState<boolean | null>(null);

    useEffect(() => {
        let alive = true;

        async function loadSetting() {
            try {
                const r = await fetch("/api/settings/affiliate-registration", {
                    cache: "no-store",
                });
                const j = await r.json().catch(() => null);
                if (!alive) return;

                if (r.ok && j?.ok) {
                    setRegOpen(Boolean(j.open));
                } else {
                    setRegOpen(false);
                }
            } catch {
                if (!alive) return;
                setRegOpen(false);
            }
        }

        loadSetting();
        return () => {
            alive = false;
        };
    }, []);

    return (
        <header className="fixed top-0 left-0 w-full z-50">
            {/* Franja naranja rotativa SIEMPRE */}
            <FranjaNaranjaRotativa />

            {/* Banda negra SOLO en la página principal */}
            {esHome && (
                <div className="w-full bg-black/35">
                    <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2">
                        {/* LOGO */}
                        <img
                            src="/baruknaranja-04.svg"
                            alt="BARUK"
                            className="
    h-8 sm:h-9 md:h-10 lg:h-12
    w-auto
    transition-all
  "
                        />


                        {/* BOTÓN SOCIO COMERCIAL (solo si registro está ABIERTO) */}
                        {regOpen === true && (
                            <Link
                                href="/socio-comercial"
                                className="
                                    rounded-full
                                    border-2 border-[#FF6600]
                                    px-4 py-2
                                    text-xs md:text-sm
                                    font-extrabold
                                    uppercase
                                    tracking-[0.12em]
                                    text-black
                                    bg-transparent
                                    transition-all
                                    duration-200
                                    hover:bg-[#FF6600]
                                    hover:text-white
                                "
                            >
                                Socio comercial
                            </Link>
                        )}
                    </div>
                </div>
            )}
        </header>
    );
}
