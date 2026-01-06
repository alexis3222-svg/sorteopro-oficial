"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export const dynamic = "force-dynamic";

const SUPPORT_WA = "593980966034";
// ⬆️ Cambia este número por el WhatsApp real (formato: 593 + número sin 0)
// Ej: 0969xxxxxx -> 593969xxxxxx

function waMeLink(message: string) {
    const encoded = encodeURIComponent(message);
    return `https://wa.me/${SUPPORT_WA}?text=${encoded}`;
}

export default function AfiliadoLoginPage() {
    const router = useRouter();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);

        const u = username.trim();
        if (!u) return setErrorMsg("Ingresa tu usuario.");
        if (!password) return setErrorMsg("Ingresa tu contraseña.");

        setLoading(true);
        try {
            const r = await fetch("/api/affiliate/login", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: u, password }),
            });

            const j = await r.json().catch(() => null);
            if (!r.ok || !j?.ok) throw new Error(j?.error || "No se pudo iniciar sesión.");

            // ✅ Ajusta este destino si tu dashboard está en otra ruta
            router.push("/afiliado");
            router.refresh();
        } catch (err: any) {
            setErrorMsg(err?.message || "Error al iniciar sesión.");
        } finally {
            setLoading(false);
        }
    };

    const forgotHref = waMeLink(
        `Hola, olvidé mi contraseña de Casa Bikers.\nUsuario: ${username.trim() || "(no lo sé)"}\nNecesito recuperar acceso.`
    );

    return (
        // ✅ Quitamos items-center para NO centrar verticalmente
        // ✅ pt-16 para subir la tarjeta y reducir el espacio bajo la franja
        <main className="min-h-[calc(100vh-3rem)] flex justify-center px-4 pt-16 pb-12">
            <div className="w-full max-w-xl">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 shadow-2xl backdrop-blur px-6 py-7 md:px-8 md:py-8">
                    <div className="space-y-1">
                        <div className="text-[11px] font-semibold tracking-[0.25em] text-orange-400 uppercase">
                            Casa Bikers • Afiliado
                        </div>
                        <h1 className="text-2xl md:text-3xl font-extrabold tracking-wide text-slate-50">
                            Ingreso de afiliado
                        </h1>
                        <p className="text-sm text-slate-400">Accede con tu usuario y contraseña.</p>
                    </div>

                    {errorMsg && (
                        <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                            {errorMsg}
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

                            {/* ✅ “Olvidé contraseña” por WhatsApp (por ahora) */}
                            <a
                                href={forgotHref}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-orange-300 hover:text-orange-200 underline underline-offset-4"
                            >
                                Olvidé mi contraseña
                            </a>
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
