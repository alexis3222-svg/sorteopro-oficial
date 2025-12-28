"use client";

import { useEffect, useState } from "react";

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

type Wallet = {
    balance_available: number;
};

type Movement = {
    id: string;
    pedido_id: number;
    base_total: number;
    amount: number;
    created_at: string;
};

export default function AfiliadoDashboardPage() {
    const [loading, setLoading] = useState(true);
    const [me, setMe] = useState<MeRes | null>(null);
    const [wallet, setWallet] = useState<Wallet | null>(null);
    const [moves, setMoves] = useState<Movement[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [qrSrc, setQrSrc] = useState<string>("");

    useEffect(() => {
        const run = async () => {
            try {
                // ME
                const rMe = await fetch("/api/affiliate/me", { cache: "no-store" });
                const jMe = await rMe.json();

                if (!rMe.ok || !jMe.ok) {
                    setMe({ ok: false });
                    return;
                }

                setMe(jMe);

                // WALLET
                const rWallet = await fetch("/api/affiliate/wallet", { cache: "no-store" });
                const jWallet = await rWallet.json();
                if (rWallet.ok && jWallet.ok) {
                    setWallet(jWallet.wallet);
                }

                // MOVEMENTS
                const rMov = await fetch("/api/affiliate/movements", { cache: "no-store" });
                const jMov = await rMov.json();
                if (rMov.ok && jMov.ok) {
                    setMoves(jMov.movements);
                }

                // QR
                setQrSrc(`/api/affiliate/qr?t=${Date.now()}`);
            } catch (e) {
                setError("Error cargando datos del afiliado");
            } finally {
                setLoading(false);
            }
        };

        run();
    }, []);

    const isOk = !!me && me.ok;
    const code = isOk ? me.affiliate.code || me.affiliate.username : "";
    const link =
        isOk && typeof window !== "undefined"
            ? `${window.location.origin}/?ref=${encodeURIComponent(code)}`
            : "";

    const copy = async () => {
        if (!link) return;
        await navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
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
                            Aún no tienes comisiones.
                        </div>
                    ) : (
                        moves.map((m) => (
                            <div
                                key={m.id}
                                className="grid grid-cols-4 border-t border-neutral-800 px-4 py-3 text-sm"
                            >
                                <span>#{m.pedido_id}</span>
                                <span>${m.base_total.toFixed(2)}</span>
                                <span className="text-emerald-400 font-semibold">
                                    +${m.amount.toFixed(2)}
                                </span>
                                <span className="text-xs text-slate-400">
                                    {new Date(m.created_at).toLocaleString()}
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
                </div>

                <div className="rounded-2xl border border-neutral-800 bg-neutral-900/20 p-5">
                    <p className="text-xs text-slate-400">Tu usuario</p>
                    <p className="mt-2 text-lg font-semibold">
                        {isOk ? me.affiliate.username : "—"}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                        Código: <span className="text-slate-200">{code}</span>
                    </p>
                </div>

                <div className="rounded-2xl border border-neutral-800 bg-neutral-900/20 p-5">
                    <p className="text-xs text-slate-400">Billetera</p>
                    <p className="mt-2 text-2xl font-semibold">
                        ${wallet ? wallet.balance_available.toFixed(2) : "0.00"}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">Disponible para retiro</p>
                </div>
            </div>

            {/* Link + QR */}
            <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-neutral-800 bg-neutral-900/20 p-5">
                    <p className="text-xs text-slate-400">Tu link de referido</p>
                    <input
                        readOnly
                        value={link}
                        className="mt-3 w-full rounded-xl border border-neutral-700 bg-neutral-950/60 px-3 py-2 text-sm"
                    />
                    <div className="mt-3 flex gap-2">
                        <button
                            onClick={copy}
                            className="rounded-xl border border-[#FF7F00] px-4 py-2 text-sm font-semibold"
                        >
                            {copied ? "Copiado ✅" : "Copiar link"}
                        </button>
                    </div>
                </div>

                <div className="rounded-2xl border border-neutral-800 bg-neutral-900/20 p-5 flex justify-center">
                    {qrSrc ? (
                        <img src={qrSrc} alt="QR Afiliado" className="h-[260px] w-[260px]" />
                    ) : (
                        <p>Cargando QR…</p>
                    )}
                </div>
            </div>
        </div>
    );
}
