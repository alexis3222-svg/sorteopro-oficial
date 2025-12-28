// app/afiliado/layout.tsx
"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AfiliadoLayout({ children }: { children: ReactNode }) {
    const router = useRouter();
    const [theme, setTheme] = useState<"dark" | "light">("dark");

    useEffect(() => {
        const saved =
            (typeof window !== "undefined" && localStorage.getItem("affiliate_theme")) || "dark";
        setTheme(saved === "light" ? "light" : "dark");
    }, []);

    useEffect(() => {
        if (typeof window !== "undefined") {
            localStorage.setItem("affiliate_theme", theme);
        }
    }, [theme]);

    const logout = async () => {
        try {
            await fetch("/api/affiliate/logout", { method: "POST" });
        } finally {
            router.push("/afiliado/login");
            router.refresh();
        }
    };

    const isDark = theme === "dark";

    return (
        <div className={isDark ? "min-h-screen bg-neutral-950 text-slate-100" : "min-h-screen bg-white text-neutral-900"}>
            <header className={isDark ? "border-b border-neutral-800 bg-neutral-900/70" : "border-b border-neutral-200 bg-white"}>
                <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
                    <div>
                        <p className={isDark ? "text-[11px] uppercase tracking-[0.25em] text-orange-400" : "text-[11px] uppercase tracking-[0.25em] text-orange-600"}>
                            CasaBikers • Afiliado
                        </p>
                        <h1 className={isDark ? "text-sm text-neutral-200" : "text-sm text-neutral-800"}>
                            Panel de afiliados
                        </h1>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setTheme(isDark ? "light" : "dark")}
                            className={
                                isDark
                                    ? "rounded-xl border border-neutral-700 px-3 py-1.5 text-xs hover:bg-neutral-800 transition"
                                    : "rounded-xl border border-neutral-300 px-3 py-1.5 text-xs hover:bg-neutral-50 transition"
                            }
                        >
                            {isDark ? "Modo blanco" : "Modo oscuro"}
                        </button>

                        <button
                            onClick={logout}
                            className="rounded-xl border border-[#FF7F00] px-3 py-1.5 text-xs hover:bg-[#FF7F00] hover:text-white transition"
                        >
                            Cerrar sesión
                        </button>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        </div>
    );
}
