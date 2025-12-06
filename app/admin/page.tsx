// @ts-nocheck
"use client";

import Link from "next/link";
import { Anton } from "next/font/google";

const anton = Anton({
    subsets: ["latin"],
    weight: "400",
});

export default function AdminHomePage() {
    return (
        <div className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-4 py-10">
            <header>
                <p
                    className={`${anton.className} text-xs uppercase tracking-[0.25em] text-[#ff9933]`}
                >
                    Casa bikers • Admin
                </p>
                <h1
                    className={`${anton.className} mt-2 text-2xl md:text-3xl uppercase tracking-[0.18em] text-slate-100`}
                >
                    Panel administrativo (versión básica)
                </h1>
                <p className="mt-1 text-sm text-slate-400">
                    Versión simplificada del panel para producción. Las funciones
                    avanzadas se habilitarán más adelante.
                </p>
            </header>

            <main className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-[#14151c] p-5">
                    <h2 className="text-sm font-semibold text-slate-100">
                        Módulos disponibles
                    </h2>
                    <p className="mt-1 text-xs text-slate-400">
                        Desde aquí puedes revisar los números asignados de los sorteos.
                    </p>

                    <div className="mt-4 flex flex-wrap gap-3">
                        <Link
                            href="/admin/numeros"
                            className="rounded-full bg-[#ff9933] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-950 hover:bg-[#ffb866]"
                        >
                            Ver números asignados
                        </Link>

                        <Link
                            href="/"
                            className="rounded-full border border-white/20 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-100 hover:bg-white/10"
                        >
                            ← Volver a la página principal
                        </Link>
                    </div>
                </div>
            </main>
        </div>
    );
}
