"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export const dynamic = "force-dynamic";

export default function CambiarClaveAfiliadoPage() {
    const router = useRouter();

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirm, setConfirm] = useState("");

    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [okMsg, setOkMsg] = useState<string | null>(null);

    const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault(); // ✅ evita que el form haga POST a otra ruta
        if (loading) return;

        setErrorMsg(null);
        setOkMsg(null);

        if (!currentPassword) return setErrorMsg("Ingresa tu contraseña actual.");
        if (!newPassword) return setErrorMsg("Ingresa tu nueva contraseña.");
        if (newPassword.length < 8) return setErrorMsg("La nueva contraseña debe tener al menos 8 caracteres.");
        if (newPassword !== confirm) return setErrorMsg("La confirmación no coincide.");

        setLoading(true);
        try {
            const r = await fetch("/api/affiliate/change-password", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ currentPassword, newPassword, confirmPassword: confirm }),
            });

            const j = await r.json().catch(() => null);

            if (!r.ok || !j?.ok) {
                throw new Error(j?.error || "No se pudo cambiar la contraseña.");
            }

            setOkMsg("Contraseña actualizada. Redirigiendo…");
            setCurrentPassword("");
            setNewPassword("");
            setConfirm("");

            router.push(j?.redirect || "/afiliado");
            router.refresh();
        } catch (err: any) {
            setErrorMsg(err?.message || "Error al cambiar la contraseña.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-neutral-950 text-slate-100 px-4 py-10">
            <div className="mx-auto w-full max-w-xl">
                <div className="rounded-2xl border border-slate-800 bg-gradient-to-b from-[#0b1220] to-[#070c16] shadow-2xl px-6 py-7 md:px-8 md:py-8">
                    <div className="space-y-1">
                        <div className="text-[11px] font-semibold tracking-[0.25em] text-orange-400 uppercase">
                            Baruk593
                        </div>
                        <h1 className="text-2xl md:text-3xl font-extrabold tracking-wide text-slate-50">
                            Cambiar contraseña
                        </h1>
                        <p className="text-sm text-slate-400">
                            Por seguridad, debes establecer una nueva contraseña para continuar.
                        </p>
                    </div>

                    {errorMsg && (
                        <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                            {errorMsg}
                        </div>
                    )}

                    {okMsg && (
                        <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                            {okMsg}
                        </div>
                    )}

                    <form onSubmit={onSubmit} className="mt-6 space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs text-slate-300">Contraseña actual</label>
                            <input
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                className="w-full rounded-xl border border-slate-800 bg-black/40 px-4 py-3 text-sm text-slate-100 outline-none focus:border-orange-400"
                                type="password"
                                placeholder="••••••••"
                                autoComplete="current-password"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs text-slate-300">Nueva contraseña</label>
                            <input
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full rounded-xl border border-slate-800 bg-black/40 px-4 py-3 text-sm text-slate-100 outline-none focus:border-orange-400"
                                type="password"
                                placeholder="mínimo 8 caracteres"
                                autoComplete="new-password"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs text-slate-300">Confirmar nueva contraseña</label>
                            <input
                                value={confirm}
                                onChange={(e) => setConfirm(e.target.value)}
                                className="w-full rounded-xl border border-slate-800 bg-black/40 px-4 py-3 text-sm text-slate-100 outline-none focus:border-orange-400"
                                type="password"
                                placeholder="repite la nueva contraseña"
                                autoComplete="new-password"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={[
                                "w-full rounded-xl px-4 py-3 text-sm font-extrabold tracking-wide transition",
                                loading
                                    ? "bg-slate-700 text-slate-200 cursor-not-allowed"
                                    : "bg-orange-500 text-black hover:bg-orange-400",
                            ].join(" ")}
                        >
                            {loading ? "Guardando…" : "Guardar nueva contraseña"}
                        </button>
                    </form>
                </div>
            </div>
        </main>
    );
}
