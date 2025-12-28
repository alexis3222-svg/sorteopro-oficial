"use client";

import { useEffect, useMemo, useState } from "react";

const MIN_WITHDRAW = 10;

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

type WithdrawalRow = {
    id: string;
    amount: number;
    status: "pending" | "approved" | "rejected" | string;
    destination: string | null;
    notes: string | null;
    created_at: string | null;
    reviewed_at: string | null;
    review_note: string | null;
};

export default function AfiliadoDashboardPage() {
    const [loading, setLoading] = useState(true);
    const [me, setMe] = useState<MeRes | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [copied, setCopied] = useState(false);

    const [wallet, setWallet] = useState<WalletRow | null>(null);
    const [moves, setMoves] = useState<MoveRow[]>([]);
    const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([]);

    const [qrSrc, setQrSrc] = useState<string>("");

    // retiro form
    const [wAmount, setWAmount] = useState<string>("");
    const [wDestination, setWDestination] = useState<string>("");
    const [wNotes, setWNotes] = useState<string>("");

    const [wSending, setWSending] = useState(false);
    const [wErr, setWErr] = useState<string | null>(null);
    const [wOk, setWOk] = useState<string | null>(null);

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

    const avail = useMemo(() => Number(wallet?.balance_available ?? 0), [wallet]);

    const canWithdraw = isOk && avail >= MIN_WITHDRAW;

    const formatMoney = (n: any) => Number(n ?? 0).toFixed(2);

    const statusBadge = (s: string) => {
        const base =
            "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold";
        if (s === "pending")
            return <span className={`${base} border-yellow-400/30 bg-yellow-500/10 text-yellow-200`}>PENDIENTE</span>;
        if (s === "approved")
            return <span className={`${base} border-emerald-400/30 bg-emerald-500/10 text-emerald-200`}>APROBADO</span>;
        if (s === "rejected")
            return <span className={`${base} border-red-400/30 bg-red-500/10 text-red-200`}>RECHAZADO</span>;
        return <span className={`${base} border-neutral-500/30 bg-neutral-500/10 text-neutral-200`}>{String(s).toUpperCase()}</span>;
    };

    const loadAll = async () => {
        setLoading(true);
        setError(null);

        try {
            // 1) SESIÓN
            const rMe = await fetch("/api/affiliate/me", { method: "GET", cache: "no-store" });
            const jMe = (await rMe.json().catch(() => ({ ok: false }))) as MeRes;

            if (!rMe.ok || !jMe.ok) {
                setMe({ ok: false });
                setWallet(null);
                setMoves([]);
                setWithdrawals([]);
                setQrSrc("");
                setError("No se pudo cargar tu sesión. Vuelve a iniciar sesión.");
                return;
            }

            setMe(jMe);

            // 2) Wallet + Movements + Withdrawals
            const [rWallet, rMoves, rWith] = await Promise.all([
                fetch("/api/affiliate/wallet", { method: "GET", cache: "no-store" }).catch(() => null),
                fetch("/api/affiliate/movements", { method: "GET", cache: "no-store" }).catch(() => null),
                fetch("/api/affiliate/withdrawals", { method: "GET", cache: "no-store" }).catch(() => null),
            ]);

            // Wallet
            if (rWallet && rWallet.ok) {
                const j = await rWallet.json().catch(() => null);
                if (j?.ok && j?.wallet) setWallet(j.wallet as WalletRow);
                else setWallet(null);
            } else {
                setWallet(null);
            }

            // Movements
            if (rMoves && rMoves.ok) {
                const j = await rMoves.json().catch(() => null);
                if (j?.ok && Array.isArray(j?.moves)) setMoves(j.moves as MoveRow[]);
                else setMoves([]);
            } else {
                setMoves([]);
            }

            // Withdrawals
            if (rWith && rWith.ok) {
                const j = await rWith.json().catch(() => null);
                if (j?.ok && Array.isArray(j?.withdrawals)) setWithdrawals(j.withdrawals as WithdrawalRow[]);
                else setWithdrawals([]);
            } else {
                setWithdrawals([]);
            }

            // QR (cache bust)
            setQrSrc(`/api/affiliate/qr?t=${Date.now()}`);
        } catch {
            setMe({ ok: false });
            setWallet(null);
            setMoves([]);
            setWithdrawals([]);
            setQrSrc("");
            setError("Error de conexión. Intenta de nuevo.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let alive = true;
        (async () => {
            if (!alive) return;
            await loadAll();
        })();
        return () => {
            alive = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const copy = async () => {
        if (!link) return;
        await navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
    };

    const requestWithdraw = async () => {
        setWErr(null);
        setWOk(null);

        if (!isOk) {
            setWErr("Sesión inválida. Inicia sesión nuevamente.");
            return;
        }

        const amt = Number(wAmount);
        if (!amt || Number.isNaN(amt) || amt <= 0) {
            setWErr("Ingresa un monto válido.");
            return;
        }

        if (avail < MIN_WITHDRAW) {
            setWErr(`Mínimo de retiro: $${MIN_WITHDRAW.toFixed(2)}. Disponible: $${avail.toFixed(2)}.`);
            return;
        }

        if (amt < MIN_WITHDRAW) {
            setWErr(`El monto mínimo de retiro es $${MIN_WITHDRAW.toFixed(2)}.`);
            return;
        }

        if (amt > avail) {
            setWErr(`Fondos insuficientes. Disponible: $${avail.toFixed(2)}.`);
            return;
        }

        setWSending(true);
        try {
            const r = await fetch("/api/affiliate/withdraw", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                cache: "no-store",
                body: JSON.stringify({
                    amount: amt,
                    destination: wDestination.trim() || null,
                    notes: wNotes.trim() || null,
                }),
            });

            const j = await r.json().catch(() => ({ ok: false, error: "Error" }));

            if (!r.ok || !j?.ok) {
                setWErr(j?.error || "No se pudo solicitar el retiro.");
                return;
            }

            setWOk("Retiro solicitado ✅ Queda en revisión.");
            setWAmount("");
            setWDestination("");
            setWNotes("");

            await loadAll();
        } catch {
            setWErr("Error de conexión. Intenta de nuevo.");
        } finally {
            setWSending(false);
            setTimeout(() => setWOk(null), 2500);
        }
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
                            Aún no tienes comisiones. Cuando un pedido referido quede en <b>pagado</b>, aparecerá aquí.
                        </div>
                    ) : (
                        moves.map((m) => (
                            <div key={m.id} className="grid grid-cols-4 border-t border-neutral-800 px-4 py-3 text-sm">
                                <span className="text-slate-200">#{m.pedido_id}</span>
                                <span className="text-slate-300">${formatMoney(m.base_total)}</span>
                                <span className="font-semibold text-emerald-300">+${formatMoney(m.amount)}</span>
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
                    <p className="mt-2 text-sm">{loading ? "Cargando…" : isOk ? "Sesión activa ✅" : "Sesión inválida"}</p>
                    {error ? <p className="mt-2 text-xs text-red-300">{error}</p> : null}
                </div>

                <div className="rounded-2xl border border-neutral-800 bg-neutral-900/20 p-5">
                    <p className="text-xs text-slate-400">Tu usuario</p>
                    <p className="mt-2 text-lg font-semibold">{loading ? "…" : isOk ? me.affiliate.username : "—"}</p>
                    <p className="mt-1 text-xs text-slate-400">
                        Código: <span className="text-slate-200">{loading ? "…" : isOk ? code : "—"}</span>
                    </p>
                </div>

                <div className="rounded-2xl border border-neutral-800 bg-neutral-900/20 p-5">
                    <p className="text-xs text-slate-400">Billetera</p>
                    <p className="mt-2 text-2xl font-semibold">${formatMoney(wallet?.balance_available)}</p>
                    <p className="mt-1 text-xs text-slate-400">Disponible para retiro.</p>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-3">
                            <p className="text-slate-400">Pendiente</p>
                            <p className="mt-1 text-slate-200">${formatMoney(wallet?.balance_pending)}</p>
                        </div>
                        <div className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-3">
                            <p className="text-slate-400">Retirado</p>
                            <p className="mt-1 text-slate-200">${formatMoney(wallet?.balance_withdrawn)}</p>
                        </div>
                    </div>

                    {!canWithdraw ? (
                        <p className="mt-3 text-[11px] text-yellow-200/90">
                            Mínimo de retiro: <b>${MIN_WITHDRAW.toFixed(2)}</b>. Disponible: <b>${avail.toFixed(2)}</b>.
                        </p>
                    ) : null}
                </div>
            </div>

            {/* Solicitar Retiro */}
            <div className="rounded-2xl border border-[#FF7F00]/20 bg-neutral-900/10 p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm font-semibold">Solicitar retiro</p>
                        <p className="mt-1 text-xs text-slate-400">
                            Mínimo: <b>${MIN_WITHDRAW.toFixed(2)}</b> • Se descuenta de “Disponible” y pasa a “Pendiente” hasta que Admin apruebe.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={requestWithdraw}
                        disabled={!canWithdraw || wSending}
                        className="rounded-xl border-2 border-[#FF7F00] px-4 py-2 text-sm font-semibold text-white hover:bg-[#FF7F00] hover:text-black transition disabled:opacity-50"
                    >
                        {wSending ? "Enviando…" : "Solicitar"}
                    </button>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <label className="block">
                        <span className="text-xs font-semibold text-slate-300">Monto</span>
                        <input
                            value={wAmount}
                            onChange={(e) => setWAmount(e.target.value)}
                            placeholder={`Ej: ${MIN_WITHDRAW}`}
                            inputMode="decimal"
                            className="mt-1 w-full rounded-xl border border-neutral-800 bg-neutral-950/60 px-3 py-2 text-sm outline-none focus:border-[#FF7F00]"
                        />
                    </label>

                    <label className="block">
                        <span className="text-xs font-semibold text-slate-300">Destino (opcional)</span>
                        <input
                            value={wDestination}
                            onChange={(e) => setWDestination(e.target.value)}
                            placeholder="Ej: Banco Pichincha - cuenta ahorros ..."
                            className="mt-1 w-full rounded-xl border border-neutral-800 bg-neutral-950/60 px-3 py-2 text-sm outline-none focus:border-[#FF7F00]"
                        />
                    </label>

                    <label className="block">
                        <span className="text-xs font-semibold text-slate-300">Nota (opcional)</span>
                        <input
                            value={wNotes}
                            onChange={(e) => setWNotes(e.target.value)}
                            placeholder="Ej: Retiro semanal"
                            className="mt-1 w-full rounded-xl border border-neutral-800 bg-neutral-950/60 px-3 py-2 text-sm outline-none focus:border-[#FF7F00]"
                        />
                    </label>
                </div>

                {wErr ? (
                    <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
                        {wErr}
                    </div>
                ) : null}

                {wOk ? (
                    <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-200">
                        {wOk}
                    </div>
                ) : null}
            </div>

            {/* Historial de Retiros */}
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/20 p-5">
                <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">Retiros</p>
                    <p className="text-xs text-slate-400">Últimos 20</p>
                </div>

                <div className="mt-4 overflow-hidden rounded-xl border border-neutral-800">
                    <div className="grid grid-cols-5 bg-neutral-950/60 px-4 py-2 text-xs text-slate-400">
                        <span>Monto</span>
                        <span>Estado</span>
                        <span>Destino</span>
                        <span>Fecha</span>
                        <span>Nota</span>
                    </div>

                    {withdrawals.length === 0 ? (
                        <div className="px-4 py-4 text-sm text-slate-400">Aún no has solicitado retiros.</div>
                    ) : (
                        withdrawals.map((w) => (
                            <div key={w.id} className="grid grid-cols-5 border-t border-neutral-800 px-4 py-3 text-sm">
                                <span className="text-slate-200">${formatMoney(w.amount)}</span>
                                <span>{statusBadge(w.status)}</span>
                                <span className="text-slate-300 truncate">{w.destination || "—"}</span>
                                <span className="text-xs text-slate-400">
                                    {w.created_at ? new Date(w.created_at).toLocaleString() : "—"}
                                </span>
                                <span className="text-slate-300 truncate">{w.review_note || w.notes || "—"}</span>
                            </div>
                        ))
                    )}
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
                                    Escanéalo o compártelo. Este QR apunta a tu link con <span className="font-semibold">ref</span>.
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

                        {isOk ? <p className="mt-3 break-all text-[11px] text-slate-500">{link}</p> : null}
                    </div>
                </div>
            </div>

            {/* CTA */}
            <div className="rounded-2xl border border-[#FF7F00]/20 bg-neutral-900/10 p-5">
                <p className="text-sm font-semibold">Siguiente: Retiros aprobados por Admin</p>
                <p className="mt-1 text-xs text-slate-400">
                    Cuando solicites un retiro, pasará a <b>Pendiente</b> y luego Admin lo aprobará o rechazará.
                </p>
            </div>
        </div>
    );
}
