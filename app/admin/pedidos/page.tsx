"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { Anton } from "next/font/google";
import Link from "next/link";

const anton = Anton({
    subsets: ["latin"],
    weight: "400",
});

type PedidoRow = {
    id: number;
    created_at: string | null;
    sorteo_id: string | null; // uuid
    actividad_numero: number | null;
    cantidad_numeros: number | null;
    precio_unitario: number | null;
    total: number | null;
    metodo_pago: string | null;
    estado: string | null;
    nombre: string | null;
    telefono: string | null;
};

// 👇 incluimos en_proceso porque ahora existe ese estado
type EstadoPedido = "pendiente" | "pagado" | "cancelado" | "en_proceso";

export default function AdminPedidosPage() {
    const [pedidos, setPedidos] = useState<PedidoRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [updatingId, setUpdatingId] = useState<number | null>(null);
    const [copyingId, setCopyingId] = useState<number | null>(null);

    // Cargar pedidos
    const fetchPedidos = async () => {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
            .from("pedidos")
            .select(
                `
        id,
        created_at,
        sorteo_id,
        actividad_numero,
        cantidad_numeros,
        precio_unitario,
        total,
        metodo_pago,
        estado,
        nombre,
        telefono
      `
            )
            .order("id", { ascending: false });

        if (error) {
            console.error("Error cargando pedidos:", error.message);
            setError("No se pudieron cargar los pedidos.");
        } else {
            setPedidos((data || []) as PedidoRow[]);
        }

        setLoading(false);
    };

    useEffect(() => {
        fetchPedidos();
    }, []);

    // 👉 CAMBIAR ESTADO (usa endpoints para asignar / liberar números)
    const cambiarEstado = async (id: number, nuevoEstado: EstadoPedido) => {
        const pedidoActual = pedidos.find((p) => p.id === id);
        if (!pedidoActual) return;

        const estadoActual = (
            pedidoActual.estado || "pendiente"
        ).toLowerCase() as EstadoPedido;

        // Si ya está en ese estado, no hacemos nada
        if (estadoActual === nuevoEstado) return;

        try {
            setUpdatingId(id);

            if (nuevoEstado === "pagado") {
                // 🔵 PAGADO → asignar números vía API
                const res = await fetch("/api/admin/pedidos/marcar-pagado", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ pedidoId: id }),
                });

                const data = await res.json();

                if (!res.ok || !data.ok) {
                    console.error("Error marcar-pagado:", data);
                    alert(
                        data.error ||
                        "No se pudo marcar como pagado ni asignar números."
                    );
                    return;
                }
            } else {
                // 🟠 PENDIENTE o CANCELADO → liberar números + actualizar estado vía API
                const res = await fetch("/api/admin/pedidos/cancelar", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ pedidoId: id, nuevoEstado }),
                });

                const data = await res.json();

                if (!res.ok || !data.ok) {
                    console.error("Error al liberar / cambiar estado:", data);
                    alert(data.error || "No se pudo actualizar el estado del pedido.");
                    return;
                }

                console.log(
                    `Números liberados para pedido ${id}:`,
                    data.liberados
                );
            }

            // 🔄 refrescar lista después de cambiar estado
            await fetchPedidos();
        } catch (err) {
            console.error("Error cambiando estado del pedido:", err);
            alert("Ocurrió un error inesperado al cambiar el estado del pedido.");
        } finally {
            setUpdatingId(null);
        }
    };

    // 💡 listas filtradas:
    // Solo transferencias pendientes
    const pendientesTransferencia = pedidos.filter(
        (p) => p.estado === "pendiente" && p.metodo_pago === "transferencia"
    );

    // PayPhone en proceso (opcional para otro tab / métricas)
    const payphoneEnProceso = pedidos.filter(
        (p) => p.estado === "en_proceso" && p.metodo_pago === "payphone"
    );

    const pagados = pedidos.filter((p) => p.estado === "pagado");
    const cancelados = pedidos.filter((p) => p.estado === "cancelado");

    const totalPedidos = pedidos.length;
    const totalPagados = pagados.length;
    const totalPendientes = pendientesTransferencia.length;

    const totalRecaudado = pagados.reduce((sum, p) => sum + (p.total || 0), 0);

    // 🔹 helpers para pintar ESTADO correctamente
    const getEstadoLabel = (estado: string | null, metodo_pago: string | null) => {
        const e = (estado || "").toLowerCase();

        if (e === "pagado") return "PAGADO";
        if (e === "cancelado") return "CANCELADO";

        if (e === "en_proceso" && metodo_pago === "payphone") {
            return "EN PROCESO";
        }

        // lo demás sí es pendiente
        return "PENDIENTE";
    };

    const getEstadoClass = (estado: string | null, metodo_pago: string | null) => {
        const e = (estado || "").toLowerCase();

        if (e === "pagado") return "bg-emerald-900/60 text-emerald-200";
        if (e === "cancelado") return "bg-red-900/60 text-red-200";

        if (e === "en_proceso" && metodo_pago === "payphone") {
            // puedes ajustarlo a tu paleta
            return "bg-blue-900/60 text-blue-200";
        }

        // pendiente
        return "bg-yellow-900/60 text-yellow-200";
    };

    const formatFecha = (iso: string | null) => {
        if (!iso) return "-";
        try {
            return new Date(iso).toLocaleString("es-EC", {
                day: "2-digit",
                month: "2-digit",
                year: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
            });
        } catch {
            return iso;
        }
    };

    const copiarWhatsApp = (pedido: PedidoRow) => {
        const mensaje = `Hola ${pedido.nombre || ""}, te escribimos de SorteoPro / CasaBikers sobre tu pedido #${pedido.id
            } por $${pedido.total?.toFixed(2) || "0.00"}.`;
        navigator.clipboard.writeText(mensaje);
        setCopyingId(pedido.id);
        setTimeout(() => setCopyingId(null), 1200);
    };

    // 🔹 Exportar CSV
    const handleExportCsv = () => {
        window.open("/api/admin/pedidos/export-csv", "_blank");
    };

    return (
        <main className="min-h-screen bg-[#05060a] text-slate-50 px-6 py-8">
            {/* HEADER */}
            <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1
                        className={`${anton.className} text-3xl md:text-4xl tracking-wide`}
                    >
                        Panel de pedidos
                    </h1>
                    <p className="text-sm text-slate-400">
                        Gestiona pagos, estados y números asignados de cada cliente.
                    </p>
                </div>

                <div className="flex flex-wrap gap-3 justify-end">
                    <Link
                        href="/admin"
                        className="rounded-full border border-slate-600 px-4 py-2 text-sm hover:bg-slate-800 transition"
                    >
                        ← Panel admin
                    </Link>

                    {/* 🔹 Botón EXPORTAR CSV */}
                    <button
                        onClick={handleExportCsv}
                        className="rounded-full bg-slate-900/80 border border-amber-400 px-4 py-2 text-sm font-semibold text-amber-200 shadow hover:bg-amber-500/10 hover:border-amber-300 transition"
                    >
                        Exportar CSV
                    </button>

                    <Link
                        href="/"
                        className="rounded-full bg-gradient-to-r from-orange-500 to-yellow-400 px-4 py-2 text-sm font-semibold text-black shadow hover:opacity-90 transition"
                    >
                        Ver sitio público
                    </Link>
                </div>
            </header>

            {/* Tarjetas resumen */}
            <section className="mb-6 grid gap-4 md:grid-cols-4">
                <div className="rounded-2xl bg-slate-900/80 px-4 py-3">
                    <p className="text-xs text-slate-400">Total pedidos</p>
                    <p className="mt-1 text-2xl font-semibold">{totalPedidos}</p>
                </div>
                <div className="rounded-2xl bg-emerald-900/40 px-4 py-3">
                    <p className="text-xs text-emerald-200/70">Pagados</p>
                    <p className="mt-1 text-2xl font-semibold text-emerald-200">
                        {totalPagados}
                    </p>
                </div>
                <div className="rounded-2xl bg-yellow-900/40 px-4 py-3">
                    <p className="text-xs text-yellow-200/70">Pendientes (transferencia)</p>
                    <p className="mt-1 text-2xl font-semibold text-yellow-100">
                        {totalPendientes}
                    </p>
                </div>
                <div className="rounded-2xl bg-slate-900/80 px-4 py-3">
                    <p className="text-xs text-slate-400">Recaudado</p>
                    <p className="mt-1 text-2xl font-semibold">
                        ${totalRecaudado.toFixed(2)}
                    </p>
                </div>
            </section>

            {/* Tabla de pedidos */}
            <section className="rounded-2xl bg-slate-900/80 p-4 shadow-lg">
                <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Pedidos</h2>
                    {loading && (
                        <span className="text-xs text-slate-400">Cargando pedidos...</span>
                    )}
                    {error && <span className="text-xs text-red-400">{error}</span>}
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-700/60 text-xs uppercase text-slate-400">
                                <th className="px-3 py-2 text-left">ID</th>
                                <th className="px-3 py-2 text-left">Fecha</th>
                                <th className="px-3 py-2 text-left">Actividad</th>
                                <th className="px-3 py-2 text-left">Cliente</th>
                                <th className="px-3 py-2 text-left">Contacto</th>
                                <th className="px-3 py-2 text-left">Cant.</th>
                                <th className="px-3 py-2 text-left">Total</th>
                                <th className="px-3 py-2 text-left">Método</th>
                                <th className="px-3 py-2 text-left">Estado</th>
                                <th className="px-3 py-2 text-left">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pedidos.map((pedido) => (
                                <tr
                                    key={pedido.id}
                                    className="border-b border-slate-800/60 last:border-0 hover:bg-slate-800/40"
                                >
                                    <td className="px-3 py-2 text-xs text-slate-300">
                                        #{pedido.id}
                                    </td>
                                    <td className="px-3 py-2 text-xs text-slate-300">
                                        {formatFecha(pedido.created_at)}
                                    </td>
                                    <td className="px-3 py-2 text-xs text-slate-300">
                                        {pedido.actividad_numero
                                            ? `Act #${pedido.actividad_numero}`
                                            : "-"}
                                    </td>
                                    <td className="px-3 py-2 text-xs text-slate-100">
                                        {pedido.nombre || "-"}
                                    </td>
                                    <td className="px-3 py-2 text-xs text-slate-300">
                                        {pedido.telefono || "-"}
                                    </td>
                                    <td className="px-3 py-2 text-xs text-slate-300">
                                        x{pedido.cantidad_numeros ?? "-"}
                                    </td>
                                    <td className="px-3 py-2 text-xs text-slate-100">
                                        ${pedido.total?.toFixed(2) ?? "0.00"}
                                    </td>
                                    <td className="px-3 py-2 text-xs text-slate-300">
                                        {pedido.metodo_pago === "payphone"
                                            ? "PayPhone"
                                            : pedido.metodo_pago || "-"}
                                    </td>

                                    {/* ESTADO */}
                                    <td className="px-3 py-2">
                                        <span
                                            className={
                                                "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold " +
                                                getEstadoClass(pedido.estado, pedido.metodo_pago)
                                            }
                                        >
                                            {getEstadoLabel(pedido.estado, pedido.metodo_pago)}
                                        </span>
                                    </td>

                                    {/* ACCIONES */}
                                    <td className="px-3 py-2">
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                onClick={() => cambiarEstado(pedido.id, "pagado")}
                                                disabled={updatingId === pedido.id}
                                                className="rounded-full bg-emerald-700 px-3 py-1 text-xs font-semibold hover:bg-emerald-600 disabled:opacity-40"
                                            >
                                                PAGADO
                                            </button>

                                            <button
                                                onClick={() => cambiarEstado(pedido.id, "pendiente")}
                                                disabled={updatingId === pedido.id}
                                                className="rounded-full bg-yellow-700 px-3 py-1 text-xs font-semibold hover:bg-yellow-600 disabled:opacity-40"
                                            >
                                                PENDIENTE
                                            </button>

                                            <button
                                                onClick={() => cambiarEstado(pedido.id, "cancelado")}
                                                disabled={updatingId === pedido.id}
                                                className="rounded-full bg-red-700 px-3 py-1 text-xs font-semibold hover:bg-red-600 disabled:opacity-40"
                                            >
                                                CANCELAR
                                            </button>

                                            {/* VER NÚMEROS */}
                                            {pedido.estado === "pagado" ? (
                                                <Link
                                                    href={`/admin/numeros?pedido=${pedido.id}`}
                                                    className="rounded-full border border-sky-400 px-3 py-1 text-xs font-semibold text-sky-200 hover:bg-sky-500/10 transition"
                                                >
                                                    VER NÚMEROS
                                                </Link>
                                            ) : (
                                                <span className="rounded-full border border-slate-600 px-3 py-1 text-xs font-semibold text-slate-500 cursor-not-allowed opacity-40">
                                                    VER NÚMEROS
                                                </span>
                                            )}

                                            <button
                                                onClick={() => copiarWhatsApp(pedido)}
                                                disabled={copyingId === pedido.id}
                                                className="rounded-full border border-emerald-500 px-3 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-40"
                                            >
                                                {copyingId === pedido.id
                                                    ? "COPIADO ✅"
                                                    : "COPIAR WHATSAPP"}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}

                            {pedidos.length === 0 && !loading && (
                                <tr>
                                    <td
                                        colSpan={10}
                                        className="px-3 py-6 text-center text-xs text-slate-400"
                                    >
                                        No hay pedidos registrados todavía.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </main>
    );
}
