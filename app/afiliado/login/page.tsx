// app/afiliado/login/page.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function AfiliadoLoginPage() {
    const router = useRouter();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const onSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);

        const u = username.trim();
        const p = password;

        if (!u || !p) {
            setErrorMsg("Ingresa tu usuario y contraseña.");
            return;
        }

        setLoading(true);
        try {
            const r = await fetch("/api/affiliate/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: u, password: p }),
            });

            const data = await r.json().catch(() => ({}));

            if (!r.ok || !data?.ok) {
                setErrorMsg(data?.error ?? "Credenciales inválidas.");
                return;
            }

            router.push(data?.redirect ?? "/afiliado");
            router.refresh();
        } catch {
            setErrorMsg("No se pudo conectar. Intenta de nuevo.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-neutral-950 text-slate-100 flex items-center justify-center px-4">
            <div className="w-full max-w-md border border-[#FF7F00]/40 bg-neutral-900/40 rounded-2xl p-6 shadow-sm">
                <h1 className="text-lg font-semibold tracking-wide">Ingreso de afiliado</h1>
                <p className="text-xs text-slate-300 mt-1">
                    Accede con tu usuario y contraseña.
                </p>

                <form onSubmit={onSubmit} className="mt-6 space-y-4">
                    <div>
                        <label className="block text-xs text-slate-300 mb-1">Usuario</label>
                        <input
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            autoComplete="username"
                            className="w-full rounded-xl border border-neutral-700 bg-neutral-950/60 px-3 py-2 text-sm outline-none focus:border-[#FF7F00]"
                            placeholder="tu_usuario"
                        />
                    </div>

                    <div>
                        <label className="block text-xs text-slate-300 mb-1">Contraseña</label>
                        <input
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            type="password"
                            autoComplete="current-password"
                            className="w-full rounded-xl border border-neutral-700 bg-neutral-950/60 px-3 py-2 text-sm outline-none focus:border-[#FF7F00]"
                            placeholder="••••••••"
                        />
                    </div>

                    {errorMsg ? (
                        <div className="text-xs text-red-300 border border-red-500/30 bg-red-500/10 rounded-xl px-3 py-2">
                            {errorMsg}
                        </div>
                    ) : null}

                    <button
                        disabled={loading}
                        className="w-full rounded-xl border border-[#FF7F00] px-4 py-2 text-sm font-medium
                       hover:bg-[#FF7F00] hover:text-white transition disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {loading ? "Ingresando..." : "Ingresar"}
                    </button>
                </form>

                <div className="mt-5 flex items-center justify-between text-xs">
                    <Link
                        href="/socio-comercial"
                        className="text-slate-300 hover:text-white underline underline-offset-4"
                    >
                        Crear cuenta
                    </Link>

                    <Link
                        href="/"
                        className="text-slate-300 hover:text-white underline underline-offset-4"
                    >
                        Volver al inicio
                    </Link>
                </div>
            </div>
        </div>
    );
}
