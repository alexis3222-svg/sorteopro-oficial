// app/afiliado/login/layout.tsx
import type { ReactNode } from "react";
import { FranjaNaranjaRotativa } from "@/components/FranjaNaranjaRotativa";

export default function AfiliadoLoginLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="es">
            <body className="min-h-screen bg-[#050608] text-slate-50">
                {/* SOLO franja naranja */}
                <div className="fixed top-0 left-0 right-0 z-50">
                    <FranjaNaranjaRotativa />
                </div>

                {/* Contenido sin layout padre */}
                <div className="pt-12">{children}</div>
            </body>
        </html>
    );
}
