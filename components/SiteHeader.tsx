// components/SiteHeader.tsx
"use client";

import { usePathname } from "next/navigation";
import Image from "next/image";
import { FranjaNaranjaRotativa } from "./FranjaNaranjaRotativa";

export function SiteHeader() {
    const pathname = usePathname();
    const esHome = pathname === "/";

    return (
        <header className="fixed top-0 left-0 w-full z-50">
            {/* Franja naranja rotativa SIEMPRE */}
            <FranjaNaranjaRotativa />

            {/* Banda negra SOLO en la página principal */}
            {esHome && (
                <div className="w-full bg-black/35">
                    <div className="mx-auto flex max-w-6xl items-center px-0 py-0">
                        <Image
                            src="/logo-bikers.svg"
                            alt="Bikers Motors"
                            width={300}
                            height={80}
                            className="w-[260px] h-auto md:w-[320px]"
                            priority
                        />
                    </div>
                </div>
            )}
        </header>
    );
}
