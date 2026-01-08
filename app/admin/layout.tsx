// app/admin/layout.tsx
import type { ReactNode } from "react";
import Link from "next/link";

export default function AdminLayout({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-screen bg-neutral-950 text-slate-100">
            {/* HEADER ADMIN */}
            <header className="border-b border-neutral-800 bg-neutral-900/80">
                <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
                    <div>
                        <p className="text-[11px] uppercase tracking-[0.25em] text-orange-400">
                            Cumpliendo Sueños
                        </p>
                        <h1 className="text-sm text-neutral-200">
                            Panel de administración
                        </h1>
                    </div>

                    <nav className="flex items-center gap-4 text-xs">
                        <Link href="/" className="text-neutral-300 hover:text-white">
                            Ver sitio público
                        </Link>
                        {/* Más links si luego quieres (usuarios, reportes, etc.) */}
                    </nav>
                </div>
            </header>

            {/* CONTENIDO DEL PANEL */}
            <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        </div>
    );
}
