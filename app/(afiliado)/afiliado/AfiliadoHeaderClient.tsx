"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AfiliadoHeaderClient() {
    const router = useRouter();

    // ✅ mantenemos el tema para que no se pierda el estilo, aunque ya no haya botón
    const [theme, setTheme] = useState<"dark" | "light">("dark");

    useEffect(() => {
        const saved = localStorage.getItem("affiliate_theme") || "dark";
        const t = saved === "light" ? "light" : "dark";
        setTheme(t);
        document.documentElement.classList.toggle("affiliate-light", t === "light");
    }, []);

    useEffect(() => {
        localStorage.setItem("affiliate_theme", theme);
        document.documentElement.classList.toggle("affiliate-light", theme === "light");
    }, [theme]);

    const logout = async () => {
        try {
            await fetch("/api/affiliate/logout", { method: "POST" });
        } finally {
            router.push("/afiliado/login");
            router.refresh();
        }
    };

    const goChangePassword = () => {
        router.push("/afiliado/cambiar-clave");
    };

    const isDark = theme === "dark";

    return (
        <header
            className={
                isDark
                    ? "border-b border-neutral-800 bg-neutral-900/70"
                    : "border-b border-neutral-200 bg-white"
            }
        >
            <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
                <div>
                    <p
                        className={
                            isDark
                                ? "text-[11px] uppercase tracking-[0.25em] text-orange-400"
                                : "text-[11px] uppercase tracking-[0.25em] text-orange-600"
                        }
                    >
                        Baruk593 • Afiliado
                    </p>
                    <h1 className={isDark ? "text-sm text-neutral-200" : "text-sm text-neutral-800"}>
                        Panel de afiliados
                    </h1>
                </div>

                <div className="flex items-center gap-2">
                    {/* ✅ NUEVO: Cambiar clave */}
                    <button
                        onClick={goChangePassword}
                        className={
                            isDark
                                ? "rounded-xl border border-neutral-700 px-3 py-1.5 text-xs hover:bg-neutral-800 transition"
                                : "rounded-xl border border-neutral-300 px-3 py-1.5 text-xs hover:bg-neutral-50 transition"
                        }
                    >
                        Cambiar clave
                    </button>

                    {/* ✅ Mantiene logout como estaba */}
                    <button
                        onClick={logout}
                        className="rounded-xl border border-[#FF7F00] px-3 py-1.5 text-xs hover:bg-[#FF7F00] hover:text-white transition"
                    >
                        Cerrar sesión
                    </button>
                </div>
            </div>
        </header>
    );
}