"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function AdminLoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [secret, setSecret] = useState("");
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const next = searchParams.get("next") || "/admin";

    const onSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);

        const s = secret.trim();
        if (!s) {
            setErrorMsg("Ingresa tu ADMIN SECRET.");
            return;
        }

        setLoading(true);
        try {
            const r = await fetch("/api/admin/login", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ secret: s }),
            });

            const j = await r.json().catch(() => null);
            if (!r.ok || !j?.ok) {
                throw new Error(j?.error || "No se pudo iniciar sesión.");
            }

            // ✅ cookie httpOnly queda seteada desde el server
            router.push(next);
            router.refresh();
        } catch (err: any) {
            setErrorMsg(err?.message || "Error al iniciar sesión.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-[calc(100vh-3rem)] flex justify-center px-4 pt-16 pb-12">
            <div className="w-full max-w-xl">
                <div className="rounded-2xl border border-slate-800 bg-gradient-to-b from-[#0b1220] to-[#070c16] shadow-2xl px-6 py-7 md:px-8 md:py-8">
                    <div className="space-y-1">
                        <div className="text-[11px] font-semibold tracking-[0.25em] text-orange-400 uppercase">
                            SorteoPro • Admin
                        </div>
                        <h1 className="text-2xl md:text-3xl font-extrabold tracking-wide text-slate-50">
                            Ingreso de administración
                        </h1>
                        <p className="text-sm text-slate-400">
                            Ingresa el <b>ADMIN SECRET</b> para continuar.
                        </p>
                    </div>

                    {errorMsg && (
                        <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                            {errorMsg}
                        </div>
                    )}

                    <form onSubmit={onSubmit} className="mt-6 space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs text-slate-300">ADMIN SECRET</label>
                            <input
                                value={secret}
                                onChange={(e) => setSecret(e.target.value)}
                                className="w-full rounded-xl border border-slate-800 bg-black/40 px-4 py-3 text-sm text-slate-100 outline-none focus:border-orange-400"
                                placeholder="Pega aquí tu ADMIN SECRET"
                                autoComplete="off"
                            />
                            <p className="text-[11px] text-slate-500">
                                Tip: en producción la cookie puede quedar guardada; en local suele perderse al cerrar el navegador.
                            </p>
                        </div>

                        <button
                            disabled={loading}
                            className={[
                                "w-full rounded-xl px-4 py-3 text-sm font-extrabold tracking-wide transition",
                                loading
                                    ? "bg-slate-700 text-slate-200 cursor-not-allowed"
                                    : "bg-orange-500 text-black hover:bg-orange-400",
                            ].join(" ")}
                        >
                            {loading ? "Ingresando…" : "Ingresar"}
                        </button>

                        <div className="pt-2 text-center">
                            <Link href="/" className="text-xs text-slate-400 hover:text-slate-200">
                                Volver al inicio
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
        </main>
    );
}
