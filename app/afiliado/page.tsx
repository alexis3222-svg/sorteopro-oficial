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

type WalletRow = {
    balance_available: number | null;
    balance_pending: number | null;
    balance_withdrawn: number | null;
    balance: number | null;
};

type MoveRow = {
    id: string;
    pedido_id: number;
    base_total: number | null;
    amount: number | null;
    created_at: string | null;
};

export default function AfiliadoDashboardPage() {
    const [loading, setLoading] = useState(true);
    const [me, setMe] = useState<MeRes | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [copied, setCopied] = useState(false);

    const [wallet, setWallet] = useState<WalletRow | null>(null);
    const [moves, setMoves] = useState<MoveRow[]>([]);

    // QR (siempre que haya sesión)
    const [qrSrc, setQrSrc] = useState<string>("");

    const isOk = !!me && me.ok;

    const code = useMemo(() => {
        if (!isOk) return "";
        return me.affiliate.code || me.affiliate.username;
    }, [isOk, me]);

    const link = useMemo(() => {
        if (!isOk) return "";
        if (typeof window === "undefined") return "";
        return `${window.location.origin}/?ref=${encodeURIComponent(code)}`;
    }, [isOk, code]);

    useEffect(() => {
        let alive = true;

        const run = async () => {
            setLoading(true);
            setError(null);

            try {
                // 1) SESIÓN
                const rMe = await fetch("/api/affiliate/me", {
                    method: "GET",
                    cache: "no-store",
                });
                const jMe = (await rMe.json().catch(() => ({ ok: false }))) as MeRes;

                if (!rMe.ok || !jMe.ok) {
                    if (!alive) return;
                    setMe({ ok: false });
                    setWallet(null);
                    setMoves([]);
                    setQrSrc("");
                    setError("No se pudo cargar tu sesión. Vuelve a iniciar sesión.");
                    return;
                }

                if (!alive) return;
                setMe(jMe);

                // 2) Cargar Wallet + Movimientos en paralelo (si tu API no existe, fallback sin romper UI)
                const [rWallet, rMoves] = await Promise.all([
                    fetch("/api/affiliate/wallet", { method: "GET", cache: "no-store" }).catch(
                        () => null
                    ),
                    fetch("/api/affiliate/movements", { method: "GET", cache: "no-store" }).catch(
                        () => null
                    ),
                ]);

                if (!alive) return;

                // Wallet
                if (rWallet && rWallet.ok) {
                    const j = await rWallet.json().catch(() => null);
                    // Esperado: { ok: true, wallet: {...} }
                    if (j?.ok && j?.wallet) setWallet(j.wallet as WalletRow);
                    else setWallet(null);
                } else {
                    setWallet(null);
                }

                // Movements
                if (rMoves && rMoves.ok) {
                    const j = await rMoves.json().catch(() => null);
                    // Esperado: { ok: true, moves: [...] }
                    if (j?.ok && Array.isArray(j?.moves)) setMoves(j.moves as MoveRow[]);
                    else setMoves([]);
                } else {
                    setMoves([]);
                }

                // QR (cache-bust)
                setQrSrc(`/api/affiliate/qr?t=${Date.now()}`);
            } catch (e) {
                if (!alive) return;
                setMe({ ok: false });
                setWallet(null);
                setMoves([]);
                setQrSrc("");
                setError("Error de conexión. Intenta de nuevo.");
            } finally {
                if (!alive) return;
                setLoading(false);
            }
        };

        run();
        return () => {
            alive = false;
        };
    }, []);

    const copy = async () => {
        if (!link) return;
        await navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
    };

    return (
        <div className="space-y-6">
            {/* Movimientos */}
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/20 p-5">
                <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">Movimientos</p>
                    <p className="text-xs text-slate-400">Últimos 20</p>
                </div>

                <div className="mt-4 overflow-hidden rounded-xl border border-neutral-800">
                    <div className="grid grid-cols-4 bg-neutral-950/60 px-4 py-2 text-xs text-slate-400">
                        <span>Pedido</span>
                        <span>Base</span>
                        <span>Comisión</span>
                        <span>Fecha</span>
                    </div>

                    {moves.length === 0 ? (
                        <div className="px-4 py-4 text-sm text-slate-400">
                            Aún no tienes comisiones. Cuando un pedido referido quede en <b>pagado</b>,
                            aparecerá aquí.
                        </div>
                    ) : (
                        moves.map((m) => (
                            <div
                                key={m.id}
                                className="grid grid-cols-4 border-t border-neutral-800 px-4 py-3 text-sm"
                            >
                                <span className="text-slate-200">#{m.pedido_id}</span>
                                <span className="text-slate-300">
                                    ${Number(m.base_total ?? 0).toFixed(2)}
                                </span>
                                <span className="font-semibold text-emerald-300">
                                    +${Number(m.amount ?? 0).toFixed(2)}
                                </span>
                                <span className="text-xs text-slate-400">
                                    {m.created_at ? new Date(m.created_at).toLocaleString() : "—"}
                                </span>
                            </div>
                        ))
                    )}
                </div>
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
                        <span className="text-slate-200">{loading ? "…" : isOk ? code : "—"}</span>
                    </p>
                </div>

                <div className="rounded-2xl border border-neutral-800 bg-neutral-900/20 p-5">
                    <p className="text-xs text-slate-400">Billetera</p>
                    <p className="mt-2 text-2xl font-semibold">
                        $
                        {wallet ? Number(wallet.balance_available ?? 0).toFixed(2) : "0.00"}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">Disponible para retiro.</p>
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
                                className="rounded-xl border border-[#FF7F00] px-4 py-2 text-sm font-semibold hover:bg-[#FF7F00] hover:text-white transition disabled:opacity-50"
                            >
                                {copied ? "Copiado ✅" : "Copiar link"}
                            </button>

                            {isOk ? (
                                <a
                                    href={link}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="rounded-xl border border-neutral-700 px-4 py-2 text-sm font-semibold hover:bg-neutral-800 transition"
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
                                    className="rounded-xl border border-[#FF7F00] px-4 py-2 text-sm font-semibold hover:bg-[#FF7F00] hover:text-white transition"
                                >
                                    Descargar
                                </a>
                            </div>
                        </div>

                        <div className="mt-4 flex items-center justify-center">
                            <div className="rounded-2xl border border-neutral-700 bg-white p-4">
                                {isOk ? (
                                    <img src={qrSrc} alt="QR Afiliado" className="h-[260px] w-[260px]" />
                                ) : (
                                    <p className="text-sm text-neutral-600">Inicia sesión para ver tu QR…</p>
                                )}
                            </div>
                        </div>

                        {isOk ? (
                            <p className="mt-3 break-all text-[11px] text-slate-500">{link}</p>
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
