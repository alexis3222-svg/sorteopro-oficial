"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type ConfirmResp =
    | {
        ok: true;
        status:
        | "APPROVED_ASSIGNED"
        | "APPROVED_ALREADY_ASSIGNED"
        | "NOT_APPROVED";
        pedidoId?: number;
        numeros?: number[];
        payphone?: any;
    }
    | { ok: false; error: string };

export default function PagoExitosoClient() {
    const searchParams = useSearchParams();

    const payphoneId = useMemo(() => {
        const v = searchParams.get("id");
        return v ? Number(v) : null;
    }, [searchParams]);

    const clientTxId = useMemo(() => {
        return (searchParams.get("clientTransactionId") || "").trim() || null;
    }, [searchParams]);

    const [loading, setLoading] = useState(true);
    const [resp, setResp] = useState<ConfirmResp | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function run() {
            setLoading(true);
            setResp(null);

            if (!payphoneId || Number.isNaN(payphoneId) || !clientTxId) {
                setLoading(false);
                setResp({
                    ok: false,
                    error: "Faltan parámetros en la URL: id y/o clientTransactionId",
                });
                return;
            }

            try {
                const r = await fetch("/api/payphone/confirm", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ payphoneId, clientTxId }),
                });

                const j = (await r.json().catch(() => null)) as ConfirmResp | null;

                if (cancelled) return;

                if (!j) {
                    setResp({ ok: false, error: "Respuesta inválida del servidor" });
                } else {
                    setResp(j);
                }
            } catch (e: any) {
                if (cancelled) return;
                setResp({ ok: false, error: e?.message || "Error llamando confirm" });
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        run();
        return () => {
            cancelled = true;
        };
    }, [payphoneId, clientTxId]);

    return (
        <div className="min-h-screen bg-neutral-950 text-slate-100 flex items-center justify-center px-4">
            <div className="w-full max-w-lg rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6">
                <h1 className="text-lg font-semibold">Verificando pago…</h1>

                <div className="mt-3 text-xs text-slate-400 space-y-1">
                    <p>
                        <span className="text-slate-300">PayPhone ID:</span>{" "}
                        {payphoneId ?? "—"}
                    </p>
                    <p className="break-all">
                        <span className="text-slate-300">Client Tx:</span>{" "}
                        {clientTxId ?? "—"}
                    </p>
                </div>

                {loading && (
                    <p className="mt-4 text-sm text-slate-300">
                        Consultando PayPhone y validando tu transacción…
                    </p>
                )}

                {!loading && resp?.ok === false && (
                    <div className="mt-4 rounded-xl border border-red-900/50 bg-red-950/30 p-3">
                        <p className="text-sm text-red-200">Error: {resp.error}</p>
                    </div>
                )}

                {!loading && resp?.ok === true && (
                    <div className="mt-4 rounded-xl border border-neutral-800 bg-neutral-950/40 p-3">
                        <p className="text-sm">
                            Estado:{" "}
                            <span className="font-semibold text-orange-300">
                                {resp.status}
                            </span>
                        </p>

                        {resp.status === "NOT_APPROVED" && (
                            <p className="mt-2 text-xs text-slate-400">
                                PayPhone aún no confirma el pago como aprobado. Si ya pagaste,
                                espera unos segundos y refresca esta página.
                            </p>
                        )}

                        {(resp.status === "APPROVED_ASSIGNED" ||
                            resp.status === "APPROVED_ALREADY_ASSIGNED") && (
                                <>
                                    <p className="mt-2 text-xs text-slate-400">
                                        Pedido #{resp.pedidoId ?? "—"}
                                    </p>

                                    <div className="mt-3">
                                        <p className="text-xs text-slate-400 mb-2">
                                            Números asignados:
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {(resp.numeros ?? []).map((n) => (
                                                <span
                                                    key={n}
                                                    className="px-2 py-1 rounded-lg bg-neutral-800 text-sm"
                                                >
                                                    {n}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                    </div>
                )}
            </div>
        </div>
    );
}
