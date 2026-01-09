"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function AdminLoginClient() {
    const router = useRouter();
    const sp = useSearchParams();

    const nextPath = useMemo(() => {
        const n = sp.get("next");
        return n && n.startsWith("/") ? n : "/admin";
    }, [sp]);

    const [secret, setSecret] = useState("");
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);

        const s = secret.trim();
        if (!s) return setErrorMsg("Ingresa el ADMIN SECRET.");

        setLoading(true);
        try {
            const r = await fetch("/api/admin/login", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ secret: s }),
            });

            const j = await r.json().catch(() => null);
            if (!r.ok || !j?.ok) throw new Error(j?.error || "No se pudo iniciar sesión.");

            router.push(nextPath);
            router.refresh();
        } catch (err: any) {
            setErrorMsg(err?.message || "Error al iniciar sesión.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-2xl px-4">
            <div className="rounded-2xl border border-slate-800 bg-gradient-to-b from-[#0b1220] to-[#070c16] shadow-2xl px-6 py-7 md:px-10 md:py-10">
                <div className="space-y-2">
                    <div className="text-[11px] font-semibold tracking-[0.25em] text-orange-400 uppercase">
                        SorteoPro • Admin
                    </div>
                    <h1 className="text-3xl md:text-4xl font-extrabold tracking-wide text-slate-50">
                        Ingreso de administración
                    </h1>
                    <p className="text-sm text-slate-400">Ingresa el ADMIN SECRET para continuar.</p>
                </div>

                {errorMsg && (
                    <div className="mt-5 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
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
                            placeholder="CBPIN-...."
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
    );
}
