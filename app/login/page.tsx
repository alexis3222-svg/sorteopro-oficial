"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { Anton } from "next/font/google";

const anton = Anton({
    subsets: ["latin"],
    weight: "400",
});

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [errorMsg, setErrorMsg] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault();
        setErrorMsg("");
        setLoading(true);

        const { data, error } = await supabaseBrowser.auth.signInWithPassword({
            email,
            password,
        });

        setLoading(false);

        if (error) {
            setErrorMsg(error.message || "Error al iniciar sesión");
            return;
        }

        if (data.user) {
            router.replace("/admin"); // 🔐 Entra directo al panel
        }
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-[#050814] px-4">
            <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#14151c] p-6 shadow-lg">
                <p
                    className={`${anton.className} text-xs uppercase tracking-[0.25em] text-[#ff9933]`}
                >
                    Baruk593 • Acceso
                </p>

                <h1
                    className={`${anton.className} mt-2 text-xl uppercase tracking-[0.18em] text-white`}
                >
                    Iniciar sesión
                </h1>

                <p className="mt-1 text-xs text-slate-400">
                    Solo para administradores de SorteoPro.
                </p>

                <form onSubmit={handleLogin} className="mt-5 space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-300">
                            Correo electrónico
                        </label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full rounded-lg border border-white/10 bg-[#0b0d16] px-3 py-2 text-sm text-slate-100 outline-none focus:border-[#ff9933]"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-300">
                            Contraseña
                        </label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full rounded-lg border border-white/10 bg-[#0b0d16] px-3 py-2 text-sm text-slate-100 outline-none focus:border-[#ff9933]"
                        />
                    </div>

                    {errorMsg && (
                        <p className="text-xs text-red-400">
                            {errorMsg}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="mt-2 w-full rounded-full bg-[#ff9933] py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-950 hover:bg-[#ffb866] disabled:opacity-60"
                    >
                        {loading ? "Entrando..." : "Entrar al panel"}
                    </button>
                </form>
            </div>
        </main>
    );
}
