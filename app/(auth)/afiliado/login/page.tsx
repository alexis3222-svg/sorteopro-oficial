"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export const dynamic = "force-dynamic";

const SUPPORT_WA = "593990575984";
// formato: 593 + número sin 0

function waMeLink(message: string) {
    const encoded = encodeURIComponent(message);
    return `https://wa.me/${SUPPORT_WA}?text=${encoded}`;
}

function formatEcuadorDateTime(d: Date) {
    const pad = (n: number) => String(n).padStart(2, "0");
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

export default function AfiliadoLoginPage() {
    const router = useRouter();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const [fpLoading, setFpLoading] = useState(false);
    const [fpMsg, setFpMsg] = useState<string | null>(null);

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);
        setFpMsg(null);

        const u = username.trim();
        if (!u) return setErrorMsg("Ingresa tu usuario o email.");
        if (!password) return setErrorMsg("Ingresa tu contraseña.");

        setLoading(true);
        try {
            const r = await fetch("/api/affiliate/login", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    identifier: u,   // ✅ para endpoint nuevo
                    username: u,     // ✅ para endpoint viejo
                    password,
                }),
            });

            const j = await r.json().catch(() => null);
            if (!r.ok || !j?.ok) throw new Error(j?.error || "No se pudo iniciar sesión.");

            router.push(j?.redirect || "/afiliado");
            router.refresh();
        } catch (err: any) {
            setErrorMsg(err?.message || "Error al iniciar sesión.");
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        const u = username.trim();

        setFpMsg(null);
        setErrorMsg(null);
        setFpLoading(true);

        try {
            const r = await fetch("/api/affiliate/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ identifier: u || "" }),
            });

            const j = await r.json().catch(() => ({}));
            const codeLine = j?.code ? `Código: ${j.code}` : "Código: (pendiente)";

            const when = formatEcuadorDateTime(new Date());
            const msgLines = [
                "Hola soporte de Baruk593, necesito recuperar mi contraseña de AFILIADO.",
                `Usuario: ${u || "(no lo sé)"}`,
                `Fecha: ${when} (ECU)`,
                codeLine,
                "Solicito validación de identidad y restablecimiento. Gracias.",
            ];

            setFpMsg("Solicitud enviada. Se abrirá WhatsApp para continuar con soporte.");
            window.open(waMeLink(msgLines.join("\n")), "_blank", "noopener,noreferrer");
        } catch {
            const when = formatEcuadorDateTime(new Date());
            const msgLines = [
                "Hola soporte de Baruk593, necesito recuperar mi contraseña de AFILIADO.",
                `Usuario: ${u || "(no lo sé)"}`,
                `Fecha: ${when} (ECU)`,
                "Código: (pendiente)",
                "Solicito validación de identidad y restablecimiento. Gracias.",
            ];

            setFpMsg("No pudimos generar el código. Se abrirá WhatsApp igual para soporte.");
            window.open(waMeLink(msgLines.join("\n")), "_blank", "noopener,noreferrer");
        } finally {
            setFpLoading(false);
        }
    };

    return (
        <main className="min-h-[calc(100vh-3rem)] flex justify-center px-4 pt-16 pb-12">
            <div className="w-full max-w-xl">
                <div className="rounded-2xl border border-slate-800 bg-gradient-to-b from-[#0b1220] to-[#070c16] shadow-2xl px-6 py-7 md:px-8 md:py-8">
                    <div className="space-y-1">
                        <div className="text-[11px] font-semibold tracking-[0.25em] text-orange-400 uppercase">
                            Baruk593
                        </div>
                        <h1 className="text-2xl md:text-3xl font-extrabold tracking-wide text-slate-50">
                            Ingreso de afiliado
                        </h1>
                        <p className="text-sm text-slate-400">Accede con tu usuario y contraseña.</p>
                    </div>

                    {/* ✅ Mensajes (aquí sí renderiza) */}
                    {errorMsg && (
                        <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                            {errorMsg}
                        </div>
                    )}

                    {fpMsg && (
                        <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                            {fpMsg}
                        </div>
                    )}

                    <form onSubmit={onSubmit} className="mt-6 space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs text-slate-300">Usuario</label>
                            <input
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full rounded-xl border border-slate-800 bg-black/40 px-4 py-3 text-sm text-slate-100 outline-none focus:border-orange-400"
                                placeholder="tu_usuario"
                                autoComplete="username"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs text-slate-300">Contraseña</label>
                            <input
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full rounded-xl border border-slate-800 bg-black/40 px-4 py-3 text-sm text-slate-100 outline-none focus:border-orange-400"
                                placeholder="••••••••"
                                type="password"
                                autoComplete="current-password"
                            />
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

                        <div className="flex items-center justify-between pt-2">
                            <Link
                                href="/socio-comercial"
                                className="text-xs text-slate-300 hover:text-orange-200 underline underline-offset-4"
                            >
                                Crear cuenta
                            </Link>

                            <button
                                type="button"
                                onClick={handleForgotPassword}
                                disabled={fpLoading}
                                className={[
                                    "text-xs underline underline-offset-4",
                                    fpLoading
                                        ? "text-slate-400 cursor-not-allowed"
                                        : "text-orange-300 hover:text-orange-200",
                                ].join(" ")}
                            >
                                {fpLoading ? "Enviando…" : "Olvidé mi contraseña"}
                            </button>
                        </div>

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
