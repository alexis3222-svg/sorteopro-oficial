"use client";

import { useEffect, useState } from "react";

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

type Props = {
    mode: PagoExitosoMode;
    title: string;
    message: string;
    numeros?: number[];
    pedido?: PedidoInfo;
};

export default function PagoExitosoClient({
    mode,
    title,
    message,
    numeros = [],
    pedido,
}: Props) {
    const [open, setOpen] = useState(false);

    // ✅ Auto abrir modal cuando está OK
    useEffect(() => {
        if (mode === "OK") setOpen(true);
    }, [mode]);

    return (
        <div className="min-h-screen bg-neutral-950 text-slate-100 flex items-center justify-center px-4">
            <div className="w-full max-w-2xl rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6">
                <p className="text-xs uppercase tracking-[0.25em] text-orange-400">
                    SorteoPro
                </p>

                <h1 className="mt-2 text-lg font-semibold">{title}</h1>
                <p className="mt-2 text-sm text-slate-300">{message}</p>

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
                                Pedido #{pedido?.id ?? "—"} • {numeros.length} número(s)
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

            {/* ✅ MODAL */}
            {open && mode === "OK" && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* overlay */}
                    <button
                        aria-label="Cerrar"
                        onClick={() => setOpen(false)}
                        className="absolute inset-0 bg-black/70"
                    />

                    {/* modal card */}
                    <div className="relative z-10 w-full max-w-3xl rounded-2xl border border-neutral-800 bg-neutral-950 p-6 shadow-2xl">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs uppercase tracking-[0.25em] text-orange-400">
                                    Confirmación de compra
                                </p>
                                <h2 className="mt-2 text-lg font-semibold text-slate-100">
                                    Pedido #{pedido?.id ?? "—"}
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

                        {/* 2 columnas */}
                        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                            {/* Columna izquierda: datos */}
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
                                            pedido?.total != null ? `$${Number(pedido.total).toFixed(2)}` : "—"
                                        }
                                    />
                                </div>
                            </div>

                            {/* Columna derecha: números */}
                            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
                                <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
                                    Números asignados
                                </p>

                                {numeros.length === 0 ? (
                                    <p className="mt-4 text-sm text-slate-400">No hay números para mostrar.</p>
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
