"use client";

import { useEffect, useState } from "react";
import { resetAfiliadoAction } from "./actions";

type Result =
    | { ok: true; username: string; tempPassword: string }
    | { ok: false; error: string }
    | null;

const LS_KEY = "baruk593_admin_tools_pin";

export default function ResetAfiliadoToolPage() {
    const [pin, setPin] = useState("");
    const [remember, setRemember] = useState(true);
    const [showPin, setShowPin] = useState(false);

    const [identifier, setIdentifier] = useState("");
    const [tempPassword, setTempPassword] = useState("");

    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<Result>(null);

    // ✅ Auto-rellena PIN guardado
    useEffect(() => {
        try {
            const saved = localStorage.getItem(LS_KEY) || "";
            if (saved) setPin(saved);
        } catch { }
    }, []);

    const forgetPin = () => {
        try {
            localStorage.removeItem(LS_KEY);
        } catch { }
        setPin("");
    };

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setResult(null);
        setSubmitting(true);

        try {
            // ✅ Guardar PIN si el user quiere
            if (remember && pin.trim()) {
                try {
                    localStorage.setItem(LS_KEY, pin.trim());
                } catch { }
            }

            const fd = new FormData();
            fd.set("pin", pin.trim());
            fd.set("identifier", identifier.trim());
            fd.set("tempPassword", tempPassword.trim());

            const r = await resetAfiliadoAction(fd);
            setResult(r as Result);
        } catch {
            setResult({ ok: false, error: "Error inesperado." });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <main className="min-h-screen bg-neutral-950 text-slate-100 px-4 py-10">
            <div className="mx-auto w-full max-w-xl">
                <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 shadow-2xl">
                    <div className="space-y-1">
                        <div className="text-[11px] font-semibold tracking-[0.25em] text-orange-400 uppercase">
                            Baruk593 • Admin Tools
                        </div>
                        <h1 className="text-xl font-extrabold">Reset afiliado</h1>
                        <p className="text-sm text-slate-400">
                            Genera contraseña temporal (PIN requerido).
                        </p>
                    </div>

                    {/* RESULTADO */}
                    {result?.ok && (
                        <div className="mt-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-4">
                            <div className="text-xs text-emerald-200/80">Usuario</div>
                            <div className="mt-1 flex items-center justify-between gap-3">
                                <div className="font-semibold">{result.username}</div>
                                <button
                                    type="button"
                                    onClick={() => navigator.clipboard.writeText(result.username)}
                                    className="text-xs text-emerald-200 hover:text-emerald-100 underline underline-offset-4"
                                >
                                    copiar
                                </button>
                            </div>

                            <div className="mt-4 text-xs text-emerald-200/80">
                                Contraseña temporal
                            </div>
                            <div className="mt-1 flex items-center justify-between gap-3">
                                <div className="font-extrabold tracking-wide">
                                    {result.tempPassword}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => navigator.clipboard.writeText(result.tempPassword)}
                                    className="text-xs text-emerald-200 hover:text-emerald-100 underline underline-offset-4"
                                >
                                    copiar
                                </button>
                            </div>
                        </div>
                    )}

                    {result && !result.ok && (
                        <div className="mt-5 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                            {result.error}
                        </div>
                    )}

                    <form onSubmit={onSubmit} className="mt-6 space-y-4">
                        {/* PIN */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                                <label className="text-xs text-slate-300">PIN de herramienta</label>

                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowPin((v) => !v)}
                                        className="text-[11px] text-slate-300 hover:text-slate-100 underline underline-offset-4"
                                    >
                                        {showPin ? "Ocultar" : "Mostrar"}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={forgetPin}
                                        className="text-[11px] text-orange-300 hover:text-orange-200 underline underline-offset-4"
                                        title="Borra el PIN guardado en este navegador"
                                    >
                                        Olvidar PIN
                                    </button>
                                </div>
                            </div>

                            <input
                                name="pin"
                                value={pin}
                                onChange={(e) => setPin(e.target.value)}
                                type={showPin ? "text" : "password"}
                                className="w-full rounded-xl border border-neutral-800 bg-black/40 px-4 py-3 text-sm text-slate-100 outline-none focus:border-orange-400"
                                placeholder="ADMIN_TOOLS_PIN"
                                autoComplete="off"
                                required
                            />

                            <label className="flex items-center gap-2 text-xs text-slate-400 select-none">
                                <input
                                    type="checkbox"
                                    className="accent-orange-500"
                                    checked={remember}
                                    onChange={(e) => setRemember(e.target.checked)}
                                />
                                Recordar PIN en este navegador
                            </label>
                        </div>

                        {/* IDENTIFIER */}
                        <div className="space-y-2">
                            <label className="text-xs text-slate-300">Username o email</label>
                            <input
                                name="identifier"
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                className="w-full rounded-xl border border-neutral-800 bg-black/40 px-4 py-3 text-sm text-slate-100 outline-none focus:border-orange-400"
                                placeholder="alexis3222"
                                required
                            />
                        </div>

                        {/* TEMP PASSWORD */}
                        <div className="space-y-2">
                            <label className="text-xs text-slate-300">
                                Contraseña temporal (opcional)
                            </label>
                            <input
                                name="tempPassword"
                                value={tempPassword}
                                onChange={(e) => setTempPassword(e.target.value)}
                                className="w-full rounded-xl border border-neutral-800 bg-black/40 px-4 py-3 text-sm text-slate-100 outline-none focus:border-orange-400"
                                placeholder="Se genera automáticamente si vacío"
                            />
                        </div>

                        <button
                            disabled={submitting}
                            className={[
                                "w-full rounded-xl px-4 py-3 text-sm font-extrabold text-black transition",
                                submitting
                                    ? "bg-slate-700 cursor-not-allowed"
                                    : "bg-orange-500 hover:bg-orange-400",
                            ].join(" ")}
                        >
                            {submitting ? "Procesando…" : "Resetear contraseña"}
                        </button>
                    </form>
                </div>
            </div>
        </main>
    );
}
