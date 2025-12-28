// app/afiliado/layout.tsx
"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

export default function AfiliadoLayout({ children }: { children: ReactNode }) {
    const router = useRouter();

    const logout = async () => {
        try {
            await fetch("/api/affiliate/logout", {
                method: "POST",
            });
        } finally {
            router.push("/afiliado/login");
            router.refresh();
        }
    };

    return (
        <div className="min-h-screen bg-neutral-950 text-slate-100">
            {/* HEADER */}
            <header className="border-b border-neutral-800 bg-neutral-900/70">
                <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
                    <div>
                        <p className="text-[11px] uppercase tracking-[0.25em] text-orange-400">
                            CasaBikers • Afiliado
                        </p>
                        <h1 className="text-sm text-neutral-200">
                            Panel de afiliados
                        </h1>
                    </div>

                    <button
                        onClick={logout}
                        className="rounded-xl border border-[#FF7F00] px-3 py-1.5 text-xs
                       hover:bg-[#FF7F00] hover:text-white transition"
                    >
                        Cerrar sesión
                    </button>
                </div>
            </header>

            {/* CONTENIDO */}
            <main className="mx-auto max-w-6xl px-4 py-6">
                {children}
            </main>
        </div>
    );
}
