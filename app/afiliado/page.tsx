// app/afiliado/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type MeResponse =
    | { ok: true; affiliate: { id: string; username: string; display_name: string | null; code: string | null; created_at: string } }
    | { ok: false };

export default function AfiliadoDashboardPage() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<MeResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const run = async () => {
            setLoading(true);
            setError(null);

            try {
                const r = await fetch("/api/affiliate/me", { method: "GET" });
                const j = (await r.json().catch(() => ({ ok: false }))) as MeResponse;

                if (!r.ok || !j.ok) {
                    setData({ ok: false });
                    setError("No se pudo cargar tu sesión. Vuelve a iniciar sesión.");
                    return;
                }

                setData(j);
            } catch {
                setData({ ok: false });
                setError("Error de conexión. Intenta de nuevo.");
            } finally {
                setLoading(false);
            }
        };

        run();
    }, []);

    const referLink = useMemo(() => {
        if (!data || !data.ok) return null;
        // Ajusta el parámetro como tú lo vayas a usar en el checkout (ej: ?ref=CODE)
        const code = data.affiliate.code || data.affiliate.username;
        return `${window.location.origin}/?ref=${encodeURIComponent(code)}`;
    }, [data]);

    const copy = async () => {
        if (!referLink) return;
        await navigator.clipboard.writeText(referLink);
    };

    return (
        <div className="space-y-6">
            <div className="rounded-2xl border border-[#FF7F00]/30 bg-neutral-900/30 p-6">
                <h2 className="text-lg font-semibold">Dashboard</h2>
                <p className="mt-1 text-xs text-slate-300">
                    Aquí verás tus referidos, ventas y comisiones (fase siguiente).
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-neutral-800 bg-neutral-900/20 p-5">
                    <p className="text-xs text-slate-400">Estado</p>
                    <p className="mt-1 text-sm">
                        {loading ? "Cargando…" : data?.ok ? "Sesión activa ✅" : "Sesión inválida"}
                    </p>
                    {error ? (
                        <p className="mt-2 text-xs text-red-300">{error}</p>
                    ) : null}
                </div>

                <div className="rounded-2xl border border-neutral-800 bg-neutral-900/20 p-5">
                    <p className="text-xs text-slate-400">Tu perfil</p>

                    {loading ? (
                        <p className="mt-1 text-sm">Cargando…</p>
                    ) : data?.ok ? (
                        <div className="mt-2 space-y-1 text-sm">
                            <p>
                                <span className="text-slate-400">Usuario:</span>{" "}
                                <span className="text-slate-100">{data.affiliate.username}</span>
                            </p>
                            <p>
                                <span className="text-slate-400">Nombre:</span>{" "}
                                <span className="text-slate-100">{data.affiliate.display_name || "—"}</span>
                            </p>
                            <p>
                                <span className="text-slate-400">Código:</span>{" "}
                                <span className="text-slate-100">{data.affiliate.code || "—"}</span>
                            </p>
                        </div>
                    ) : (
                        <p className="mt-1 text-sm text-slate-300">
                            No disponible.
                        </p>
                    )}
                </div>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/20 p-5">
                <p className="text-xs text-slate-400">Tu link de referido</p>

                {loading ? (
                    <p className="mt-2 text-sm">Cargando…</p>
                ) : data?.ok && referLink ? (
                    <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
                        <input
                            readOnly
                            value={referLink}
                            className="w-full rounded-xl border border-neutral-700 bg-neutral-950/60 px-3 py-2 text-sm"
                        />
                        <button
                            onClick={copy}
                            className="rounded-xl border border-[#FF7F00] px-4 py-2 text-sm font-medium
                         hover:bg-[#FF7F00] hover:text-white transition"
                        >
                            Copiar
                        </button>
                    </div>
                ) : (
                    <p className="mt-2 text-sm text-slate-300">
                        No disponible.
                    </p>
                )}

                <p className="mt-3 text-[11px] text-slate-400">
                    Nota: luego lo conectamos al checkout para registrar ventas por código.
                </p>
            </div>
        </div>
    );
}
