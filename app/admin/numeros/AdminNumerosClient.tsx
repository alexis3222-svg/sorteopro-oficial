"use client";
export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Props = { pedidoId: number };

type PedidoInfo = {
    id: number;
    created_at: string | null;
    actividad_numero: number | null;
    cantidad_numeros: number | null;
    estado: string | null;
    nombre: string | null;
    telefono: string | null;
    metodo_pago: string | null;
    total: number | null;
};

type NumeroAsignado = { numero: number };

function fmtFechaEC(dateStr: string | null) {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleString("es-EC", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function fmtEstado(estado: string | null) {
    const e = (estado || "pendiente").toLowerCase();
    if (e === "pagado" || e === "confirmado") {
        return { label: "PAGADO", cls: "bg-emerald-500/15 text-emerald-200 border-emerald-500/40" };
    }
    if (e === "cancelado") {
        return { label: "CANCELADO", cls: "bg-red-500/15 text-red-200 border-red-500/40" };
    }
    return { label: "PENDIENTE", cls: "bg-yellow-500/15 text-yellow-200 border-yellow-500/40" };
}

function fmtMetodo(m: string | null) {
    const x = (m || "").toLowerCase();
    if (x.includes("transfer")) return "TRANSFERENCIA";
    if (x.includes("payphone")) return "PAYPHONE";
    if (!x) return "—";
    return x.toUpperCase();
}

export default function AdminNumerosClient({ pedidoId }: Props) {
    const [loading, setLoading] = useState(true);
    const [pedido, setPedido] = useState<PedidoInfo | null>(null);
    const [numeros, setNumeros] = useState<NumeroAsignado[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [copying, setCopying] = useState(false);

    const cargar = async () => {
        setLoading(true);
        setError(null);

        const { data: p, error: pe } = await supabase
            .from("pedidos")
            .select("id, created_at, actividad_numero, cantidad_numeros, estado, nombre, telefono, metodo_pago, total")
            .eq("id", pedidoId)
            .maybeSingle();

        if (pe) {
            setError("pedidos: " + pe.message);
            setLoading(false);
            return;
        }
        if (!p) {
            setError("Pedido no encontrado.");
            setLoading(false);
            return;
        }
        setPedido(p as PedidoInfo);

        const { data: ns, error: ne } = await supabase
            .from("numeros_asignados")
            .select("numero")
            .eq("pedido_id", pedidoId)
            .order("numero", { ascending: true });

        if (ne) {
            setError("numeros_asignados: " + ne.message);
            setLoading(false);
            return;
        }

        setNumeros((ns || []) as NumeroAsignado[]);
        setLoading(false);
    };

    useEffect(() => {
        cargar();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pedidoId]);

    const estadoBadge = useMemo(() => fmtEstado(pedido?.estado ?? null), [pedido?.estado]);
    const actividadLabel = pedido?.actividad_numero ? `Actividad #${pedido.actividad_numero}` : "Actividad —";
    const fechaLabel = fmtFechaEC(pedido?.created_at ?? null);

    const totalLabel = useMemo(() => {
        if (pedido?.total == null) return "—";
        const n = Number(pedido.total);
        return `$${n.toFixed(2)}`;
    }, [pedido?.total]);

    const chips = useMemo(
        () => numeros.map((n) => String(n.numero).padStart(5, "0")),
        [numeros]
    );

    const copiarWhatsApp = async () => {
        if (!pedido) return;
        if (!chips.length) {
            alert("Este pedido aún no tiene números asignados.");
            return;
        }

        setCopying(true);
        try {
            const nombre = (pedido.nombre || "participante").trim() || "participante";
            const actividad = pedido.actividad_numero ? `la Actividad #${pedido.actividad_numero}` : "la actividad";
            const lista = chips.join(", ");
            const mensaje = `Hola ${nombre}, estos son tus números para ${actividad}: ${lista}`;

            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(mensaje);
                alert("Texto copiado. Pégalo en WhatsApp.");
            } else {
                alert(mensaje);
            }
        } catch {
            alert("No se pudo copiar. Intenta de nuevo.");
        } finally {
            setCopying(false);
        }
    };

    if (loading) {
        return (
            <main className="min-h-screen bg-[#050609] text-slate-100 flex items-center justify-center">
                <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-sm text-slate-300">
                    Cargando números…
                </div>
            </main>
        );
    }

    if (error) {
        return (
            <main className="min-h-screen bg-[#050609] text-slate-100 flex items-center justify-center p-6">
                <div className="max-w-lg w-full rounded-2xl border border-red-500/30 bg-red-500/10 p-5">
                    <p className="text-red-200 font-semibold">Error</p>
                    <p className="mt-2 text-sm text-red-100/90 break-words">{error}</p>
                    <div className="mt-4 flex gap-2">
                        <button
                            onClick={cargar}
                            className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs hover:bg-white/10"
                        >
                            Reintentar
                        </button>
                        <Link
                            href="/admin/pedidos"
                            className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs hover:bg-white/10"
                        >
                            ← Volver a pedidos
                        </Link>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[#050609] text-slate-100">
            <div className="mx-auto max-w-6xl px-4 py-8">
                {/* Header */}
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-orange-400">
                            SORTEOPRO • ADMIN
                        </p>
                        <h1 className="mt-2 text-2xl md:text-3xl font-semibold tracking-wide">
                            Números del pedido <span className="text-slate-200">#{pedidoId}</span>
                        </h1>
                        <p className="mt-2 text-sm text-slate-400">
                            {actividadLabel} • {fechaLabel}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 justify-start md:justify-end">
                        <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] ${estadoBadge.cls}`}>
                            {estadoBadge.label}
                        </span>

                        <button
                            onClick={cargar}
                            className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] hover:bg-white/10 transition"
                        >
                            Recargar
                        </button>

                        <Link
                            href="/admin/pedidos"
                            className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] hover:bg-white/10 transition"
                        >
                            ← Pedidos
                        </Link>

                        <Link
                            href="/"
                            className="rounded-full border border-orange-500/40 bg-gradient-to-r from-orange-500/80 to-yellow-400/80 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-black hover:from-orange-400 hover:to-yellow-300 transition shadow-lg shadow-orange-500/20"
                        >
                            Ver sitio público
                        </Link>
                    </div>
                </div>

                {/* Grid principal */}
                <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Card cliente */}
                    <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Cliente</p>

                        <p className="mt-2 text-lg font-semibold text-slate-100">
                            {pedido?.nombre?.trim() || "Sin nombre"}
                        </p>
                        <p className="mt-1 text-sm text-slate-300">
                            {pedido?.telefono?.trim() || "Sin teléfono"}
                        </p>

                        <div className="mt-4 grid grid-cols-2 gap-3">
                            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Método</p>
                                <p className="mt-1 text-sm font-semibold">{fmtMetodo(pedido?.metodo_pago ?? null)}</p>
                            </div>
                            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Total</p>
                                <p className="mt-1 text-sm font-semibold">{totalLabel}</p>
                            </div>
                            <div className="rounded-xl border border-white/10 bg-black/20 p-3 col-span-2">
                                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Paquete</p>
                                <p className="mt-1 text-sm font-semibold">
                                    {pedido?.cantidad_numeros ? `x${pedido.cantidad_numeros} números` : "—"}
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={copiarWhatsApp}
                            disabled={copying}
                            className="mt-4 w-full rounded-2xl border border-[#25D366]/60 bg-[#25D366]/10 px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#25D366] hover:bg-[#25D366]/15 disabled:opacity-50"
                        >
                            {copying ? "Copiando…" : "Copiar mensaje WhatsApp"}
                        </button>
                    </section>

                    {/* Card números */}
                    <section className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-5">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Números asignados</p>
                                <p className="mt-1 text-sm text-slate-300">
                                    {chips.length ? `${chips.length} números` : "Sin números asignados"}
                                </p>
                            </div>

                            {chips.length ? (
                                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] text-slate-200">
                                    {chips[0]} — {chips[chips.length - 1]}
                                </span>
                            ) : null}
                        </div>

                        {chips.length === 0 ? (
                            <div className="mt-6 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4">
                                <p className="text-yellow-200 text-sm font-semibold">Aún no hay números</p>
                                <p className="mt-1 text-xs text-yellow-100/80">
                                    Si el pedido ya está pagado, vuelve a “Pedidos” y marca “Pagado” para asignar.
                                </p>
                            </div>
                        ) : (
                            <div className="mt-6 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                                {chips.map((chip) => (
                                    <div
                                        key={chip}
                                        className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-center font-semibold tracking-[0.12em] text-slate-100"
                                    >
                                        {chip}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Hint */}
                        <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Tip</p>
                            <p className="mt-1 text-xs text-slate-300">
                                Puedes volver a la lista de pedidos, cambiar el estado, o copiar el mensaje listo para WhatsApp.
                            </p>
                        </div>
                    </section>
                </div>
            </div>
        </main>
    );
}
