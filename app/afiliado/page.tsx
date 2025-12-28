// app/afiliado/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type MeOk = {
    ok: true;
    affiliate: {
        id: string;
        username: string;
        display_name: string | null;
        code: string | null;
        created_at: string;
    };
};

type MeRes = MeOk | { ok: false };

export default function AfiliadoDashboardPage() {
    const [loading, setLoading] = useState(true);
    const [me, setMe] = useState<MeRes | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const run = async () => {
            setLoading(true);
            setError(null);

            try {
                const r = await fetch("/api/affiliate/me", {
                    method: "GET",
                    cache: "no-store",
                });
                const j = (await r.json().catch(() => ({ ok: false }))) as MeRes;

                if (!r.ok || !j.ok) {
                    setMe({ ok: false });
                    setError("No se pudo cargar tu sesión. Vuelve a iniciar sesión.");
                    return;
                }

                setMe(j);
            } catch {
                setMe({ ok: false });
                setError("Error de conexión. Intenta de nuevo.");
            } finally {
                setLoading(false);
            }
        };

        run();
    }, []);

    const isOk = !!me && me.ok;

    const code = useMemo(() => {
        return isOk ? (me.affiliate.code || me.affiliate.username) : "";
    }, [isOk, me]);

    const link = useMemo(() => {
        if (!isOk || typeof window === "undefined") return "";
        return `${window.location.origin}/?ref=${encodeURIComponent(code)}`;
    }, [isOk, code]);

    // ✅ NO dependemos de estado qrUrl; lo calculamos directo (evita quedarse en vacío)
    const qrSrc = useMemo(() => {
        if (!isOk) return "";
        return `/api/affiliate/qr?t=${Date.now()}`;
    }, [isOk]);

    const copy = async () => {
        if (!link) return;
        try {
            await navigator.clipboard.writeText(link);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
        } catch {
            // fallback: nada
        }
    };

    return (
        <div className="space-y-6">
            {/* Hero */}
            <div className="rounded-2xl border border-[#FF7F00]/30 bg-gradient-to-r from-neutral-900/60 to-neutral-950/60 p-6">
                <p className="text-[11px] uppercase tracking-[0.25em] text-orange-400">
                    Dashboard
                </p>
                <h2 className="mt-2 text-2xl font-extrabold tracking-tight">
                    Panel del Afiliado
                </h2>
                <p className="mt-2 text-sm text-slate-300">
                    Aquí tendrás tus enlaces, QR, ventas y billetera de comisiones.
                </p>
            </div>

            {/* Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-neutral-800 bg-neutral-900/20 p-5">
                    <p className="text-xs text-slate-400">Estado</p>
                    <p className="mt-2 text-sm">
                        {loading ? "Cargando…" : isOk ? "Sesión activa ✅" : "Sesión inválida"}
                    </p>
                    {error ? <p className="mt-2 text-xs text-red-300">{error}</p> : null}
                </div>

                <div className="rounded-2xl border border-neutral-800 bg-neutral-900/20 p-5">
                    <p className="text-xs text-slate-400">Tu usuario</p>
                    <p className="mt-2 text-lg font-semibold">
                        {loading ? "…" : isOk ? me.affiliate.username : "—"}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                        Código:{" "}
                        <span className="text-slate-200">
                            {loading ? "…" : isOk ? code : "—"}
                        </span>
                    </p>
                </div>

                <div className="rounded-2xl border border-neutral-800 bg-neutral-900/20 p-5">
                    <p className="text-xs text-slate-400">Billetera</p>
                    <p className="mt-2 text-2xl font-semibold">$0.00</p>
                    <p className="mt-1 text-xs text-slate-400">
                        Próximo paso: comisiones automáticas.
                    </p>
                </div>
            </div>

            {/* Link + QR */}
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/20 p-5">
                <div className="grid gap-4 lg:grid-cols-2">
                    {/* Link */}
                    <div className="rounded-2xl border border-neutral-800 bg-neutral-950/30 p-5">
                        <p className="text-xs text-slate-400">Tu link de referido</p>
                        <p className="mt-1 text-sm text-slate-200">
                            Compártelo para que las compras queden ligadas a tu cuenta.
                        </p>

                        <input
                            readOnly
                            value={isOk ? link : ""}
                            placeholder={loading ? "Cargando…" : ""}
                            className="mt-3 w-full rounded-xl border border-neutral-700 bg-neutral-950/60 px-3 py-2 text-sm outline-none"
                        />

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                            <button
                                onClick={copy}
                                disabled={!isOk || !link}
                                className="rounded-xl border border-[#FF7F00] px-4 py-2 text-sm font-semibold
                           hover:bg-[#FF7F00] hover:text-white transition disabled:opacity-50"
                            >
                                {copied ? "Copiado ✅" : "Copiar link"}
                            </button>

                            {isOk ? (
                                <a
                                    href={link}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="rounded-xl border border-neutral-700 px-4 py-2 text-sm font-semibold
                             hover:bg-neutral-800 transition"
                                >
                                    Abrir link
                                </a>
                            ) : null}
                        </div>
                    </div>

                    {/* QR */}
                    <div className="rounded-2xl border border-neutral-800 bg-neutral-950/30 p-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="text-xs text-slate-400">Tu QR</p>
                                <p className="mt-1 text-sm text-slate-200">
                                    Escanéalo o compártelo. Este QR apunta a tu link con{" "}
                                    <span className="font-semibold">ref</span>.
                                </p>
                            </div>

                            <div className="flex gap-2">
                                <a
                                    href={qrSrc || "#"}
                                    download
                                    onClick={(e) => {
                                        if (!qrSrc) e.preventDefault();
                                    }}
                                    className="rounded-xl border border-[#FF7F00] px-4 py-2 text-sm font-semibold
                             hover:bg-[#FF7F00] hover:text-white transition disabled:opacity-50"
                                >
                                    Descargar
                                </a>
                            </div>
                        </div>

                        <div className="mt-4 flex items-center justify-center">
                            <div className="rounded-2xl border border-neutral-700 bg-white p-4">
                                {isOk ? (
                                    <img
                                        src={qrSrc}
                                        alt="QR Afiliado"
                                        className="h-[260px] w-[260px]"
                                    />
                                ) : (
                                    <p className="text-sm text-neutral-600">
                                        Inicia sesión para ver tu QR…
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Debug-friendly link */}
                        {isOk ? (
                            <p className="mt-3 text-[11px] text-slate-500 break-all">
                                {link}
                            </p>
                        ) : null}
                    </div>
                </div>
            </div>

            {/* CTA */}
            <div className="rounded-2xl border border-[#FF7F00]/20 bg-neutral-900/10 p-5">
                <p className="text-sm font-semibold">Siguiente: QR y Comisiones</p>
                <p className="mt-1 text-xs text-slate-400">
                    Vamos a generar tu QR automáticamente y luego tu billetera con comisiones.
                </p>
            </div>
        </div>
    );
}
