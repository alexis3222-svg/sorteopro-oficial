"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type PagoExitosoMode = "OK" | "PENDING";

type PedidoInfo = {
    id: number;
    nombre: string | null;
    telefono: string | null;
    correo: string | null;
    cantidad_numeros: number | null;
    total: number | null;
    metodo_pago: string | null;
};

type ConfirmResp =
    | {
        ok: true;
        status: "APPROVED_ASSIGNED" | "APPROVED_ALREADY_ASSIGNED" | "NOT_APPROVED";
        pedidoId?: number;
        numeros?: number[];
        pedido?: PedidoInfo;
        payphone?: any;
    }
    | { ok: false; error: string; detail?: any };

export default function PagoExitosoClient() {
    const sp = useSearchParams();

    const payphoneId = useMemo(() => {
        const v = sp.get("id"); // PayPhone devuelve ?id=...
        return v ? Number(v) : null;
    }, [sp]);

    const clientTxId = useMemo(() => {
        return (sp.get("clientTransactionId") || "").trim() || null;
    }, [sp]);

    const [loading, setLoading] = useState(true);
    const [resp, setResp] = useState<ConfirmResp | null>(null);

    // modal
    const [open, setOpen] = useState(false);

    // ✅ auto-open modal cuando OK
    useEffect(() => {
        if (
            resp?.ok &&
            (resp.status === "APPROVED_ASSIGNED" ||
                resp.status === "APPROVED_ALREADY_ASSIGNED")
        ) {
            setOpen(true);
        }
    }, [resp]);

    useEffect(() => {
        let cancelled = false;

        async function run() {
            setLoading(true);
            setResp(null);

            if (!clientTxId) {
                setLoading(false);
                setResp({ ok: false, error: "Falta clientTransactionId en la URL" });
                return;
            }

            try {
                const r = await fetch("/api/payphone/confirm", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    // payphoneId puede venir, pero el endpoint también puede usar BD si no viene
                    body: JSON.stringify({ payphoneId, clientTxId }),
                });

                const j = (await r.json().catch(() => null)) as ConfirmResp | null;
                if (cancelled) return;

                if (!j) setResp({ ok: false, error: "Respuesta inválida del servidor" });
                else setResp(j);
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

    const mode: PagoExitosoMode =
        resp?.ok &&
            (resp.status === "APPROVED_ASSIGNED" ||
                resp.status === "APPROVED_ALREADY_ASSIGNED")
            ? "OK"
            : "PENDING";

    const title = mode === "OK" ? "Pago confirmado ✅" : "Pedido recibido";

    const message =
        mode === "OK"
            ? "Tus números fueron asignados. Revisa el detalle."
            : "Tu pedido fue registrado. En caso de que hayas pagado, el sistema confirmará el pago o el administrador lo revisará.";

    const numeros = resp?.ok ? resp.numeros ?? [] : [];
    const pedido = resp?.ok ? resp.pedido : undefined;

    // ✅ FIX TS: resolver pedidoId sin ternarios raros (resp puede ser null)
    const pedidoIdLabel =
        pedido?.id ??
        (resp && resp.ok ? resp.pedidoId : undefined) ??
        "—";

    return (
        <div className="min-h-screen bg-neutral-950 text-slate-100 flex items-center justify-center px-4">
            <div className="w-full max-w-2xl rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6">
                <p className="text-xs uppercase tracking-[0.25em] text-orange-400">
                    SorteoPro
                </p>

                <h1 className="mt-2 text-lg font-semibold">{title}</h1>
                <p className="mt-2 text-sm text-slate-300">{message}</p>

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

                {mode === "PENDING" && (
                    <div className="mt-4 rounded-xl border border-yellow-900/40 bg-yellow-950/20 p-3">
                        <p className="text-sm text-yellow-200">
                            Estado: <span className="font-semibold">En verificación</span>
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                            Puedes refrescar esta página en unos segundos.
                        </p>
                    </div>
                )}

                {mode === "OK" && (
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-3">
                            <p className="text-sm text-emerald-200">
                                Estado: <span className="font-semibold">Confirmado</span>
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                                Pedido #{pedidoIdLabel} • {numeros.length} número(s)
                            </p>
                        </div>

                        <button
                            onClick={() => setOpen(true)}
                            className="inline-flex items-center justify-center rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-orange-400"
                        >
                            Ver detalles
                        </button>
                    </div>
                )}
            </div>

            {/* MODAL 2 columnas */}
            {open && mode === "OK" && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <button
                        aria-label="Cerrar"
                        onClick={() => setOpen(false)}
                        className="absolute inset-0 bg-black/70"
                    />

                    <div className="relative z-10 w-full max-w-3xl rounded-2xl border border-neutral-800 bg-neutral-950 p-6 shadow-2xl">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs uppercase tracking-[0.25em] text-orange-400">
                                    Confirmación de compra
                                </p>
                                <h2 className="mt-2 text-lg font-semibold text-slate-100">
                                    Pedido #{pedidoIdLabel}
                                </h2>
                                <p className="mt-1 text-sm text-slate-400">
                                    Aquí están los datos del comprador y los números asignados.
                                </p>
                            </div>

                            <button
                                onClick={() => setOpen(false)}
                                className="rounded-xl border border-neutral-700 px-3 py-2 text-sm text-slate-200 hover:bg-neutral-900"
                            >
                                Cerrar
                            </button>
                        </div>

                        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                            {/* Datos */}
                            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
                                <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
                                    Datos del comprador
                                </p>

                                <div className="mt-4 space-y-3 text-sm">
                                    <Row label="Nombre" value={pedido?.nombre ?? "—"} />
                                    <Row label="Correo" value={pedido?.correo ?? "—"} />
                                    <Row label="Teléfono" value={pedido?.telefono ?? "—"} />
                                    <Row label="Método" value={pedido?.metodo_pago ?? "payphone"} />
                                    <Row
                                        label="Cantidad"
                                        value={String(pedido?.cantidad_numeros ?? numeros.length)}
                                    />
                                    <Row
                                        label="Total"
                                        value={
                                            pedido?.total != null
                                                ? `$${Number(pedido.total).toFixed(2)}`
                                                : "—"
                                        }
                                    />
                                </div>
                            </div>

                            {/* Números */}
                            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
                                <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
                                    Números asignados
                                </p>

                                {numeros.length === 0 ? (
                                    <p className="mt-4 text-sm text-slate-400">
                                        No hay números para mostrar.
                                    </p>
                                ) : (
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {numeros.map((n) => (
                                            <span
                                                key={n}
                                                className="px-3 py-2 rounded-xl bg-neutral-800 text-sm text-slate-100"
                                            >
                                                {n}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                <p className="mt-4 text-xs text-slate-500">
                                    Consejo: toma captura de pantalla o guarda esta página.
                                </p>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={() => (window.location.href = "/")}
                                className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-slate-200"
                            >
                                Ir al inicio
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-start justify-between gap-3">
            <span className="text-slate-400">{label}</span>
            <span className="text-slate-100 text-right break-all">{value}</span>
        </div>
    );
}
