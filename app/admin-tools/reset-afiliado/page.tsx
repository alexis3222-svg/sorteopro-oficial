"use client";

import { useState } from "react";

export const dynamic = "force-dynamic";

type Result =
    | { ok: false; error: string }
    | { ok: true; username: string; tempPassword: string };

export default function ResetAfiliadoToolPage() {
    const [pin, setPin] = useState("");
    const [identifier, setIdentifier] = useState("");
    const [tempPassword, setTempPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [res, setRes] = useState<Result | null>(null);

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setRes(null);
        setLoading(true);

        try {
            const r = await fetch("/api/admin-tools/reset-afiliado", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    pin,
                    identifier,
                    tempPassword: tempPassword.trim() || undefined,
                }),
            });

            const j = (await r.json().catch(() => null)) as Result | null;
            if (!j) throw new Error("Respuesta inválida");
            setRes(j);
        } catch (err: any) {
            setRes({ ok: false, error: err?.message || "Error" });
        } finally {
            setLoading(false);
        }
    };

    const copy = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
        } catch { }
    };

    return (
        <main className="min-h-screen bg-neutral-950 text-slate-100 px-4 py-10">
            <div className="mx-auto w-full max-w-xl">
                <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 shadow-2xl">
                    <div className="space-y-1">
                        <div className="text-[11px] font-semibold tracking-[0.25em] text-orange-400 uppercase">
                            CasaBikers • Admin Tools
                        </div>
                        <h1 className="text-xl font-extrabold">Reset afiliado</h1>
                        <p className="text-sm text-slate-400">
                            Genera contraseña temporal (PIN requerido).
                        </p>
                    </div>

                    {res && !res.ok && (
                        <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                            {res.error}
                        </div>
                    )}

                    {res && res.ok && (
                        <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <div className="text-xs text-emerald-200/80">Usuario</div>
                                    <div className="font-semibold">{res.username}</div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => copy(res.username)}
                                    className="text-xs text-emerald-200 underline underline-offset-4"
                                >
                                    copiar
                                </button>
                            </div>

                            <div className="mt-3 flex items-center justify-between gap-3">
                                <div>
                                    <div className="text-xs text-emerald-200/80">Contraseña temporal</div>
                                    <div className="font-extrabold tracking-wide">{res.tempPassword}</div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => copy(res.tempPassword)}
                                    className="text-xs text-emerald-200 underline underline-offset-4"
                                >
                                    copiar
                                </button>
                            </div>
                        </div>
                    )}

                    <form onSubmit={onSubmit} className="mt-6 space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs text-slate-300">PIN de herramienta</label>
                            <input
                                value={pin}
                                onChange={(e) => setPin(e.target.value)}
                                type="password"
                                className="w-full rounded-xl border border-neutral-800 bg-black/40 px-4 py-3 text-sm"
                                placeholder="ADMIN_TOOLS_PIN"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs text-slate-300">Username o email</label>
                            <input
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                className="w-full rounded-xl border border-neutral-800 bg-black/40 px-4 py-3 text-sm"
                                placeholder="alexis3222"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs text-slate-300">Contraseña temporal (opcional)</label>
                            <input
                                value={tempPassword}
                                onChange={(e) => setTempPassword(e.target.value)}
                                className="w-full rounded-xl border border-neutral-800 bg-black/40 px-4 py-3 text-sm"
                                placeholder="Se genera automáticamente si vacío"
                            />
                        </div>

                        <button
                            disabled={loading}
                            className={[
                                "w-full rounded-xl px-4 py-3 text-sm font-extrabold text-black transition",
                                loading ? "bg-slate-700 cursor-not-allowed" : "bg-orange-500 hover:bg-orange-400",
                            ].join(" ")}
                        >
                            {loading ? "Reseteando…" : "Resetear contraseña"}
                        </button>
                    </form>
                </div>
            </div>
        </main>
    );
}
