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

type EstadoPedido = "pendiente" | "pagado" | "cancelado";

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

        const estadoActual = (pedidoActual.estado || "pendiente").toLowerCase() as EstadoPedido;
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
                    alert(data.error || "No se pudo marcar como pagado ni asignar números.");
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

                console.log(`Números liberados para pedido ${id}:`, data.liberados);
            }

            // 3️⃣ Refrescar en memoria
            setPedidos((prev) =>
                prev.map((p) =>
                    p.id === id
                        ? {
                            ...p,
                            estado: nuevoEstado,
                        }
                        : p
                )
            );
        } finally {
            setUpdatingId(null);
        }
    };

    // copiar números para WhatsApp (SOLO LEE, no asigna)
    const copiarNumerosPedido = async (pedido: PedidoRow) => {
        const estado = (pedido.estado || "pendiente").toLowerCase();

        // 🔒 No permitir copiar si NO está pagado
        if (estado !== "pagado" && estado !== "confirmado") {
            alert("Primero marca este pedido como PAGADO para poder copiar los números.");
            return;
        }

        setCopyingId(pedido.id);
        try {
            const { data, error } = await supabase
                .from("numeros_asignados")
                .select("numero")
                .eq("pedido_id", pedido.id)
                .order("numero", { ascending: true });

            if (error) {
                console.error("Error leyendo numeros_asignados:", error.message);
                alert("No se pudieron leer los números de este pedido.");
                return;
            }

            if (!data || data.length === 0) {
                alert("Este pedido aún no tiene números asignados.");
                return;
            }

            const lista = data
                .map((n: any) => n.numero.toString().padStart(5, "0"))
                .join(", ");

            const nombre = pedido.nombre?.trim() || "participante";
            const actividad = pedido.actividad_numero
                ? `la Actividad #${pedido.actividad_numero}`
                : "la actividad";

            const mensaje = `Hola ${nombre}, estos son tus números para ${actividad}: ${lista}`;

            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(mensaje);
                alert("Texto copiado al portapapeles. Pégalo en WhatsApp.");
            } else {
                alert(mensaje);
            }
        } catch (err) {
            console.error("Error copiando números:", err);
            alert("Ocurrió un error al copiar los números.");
        } finally {
            setCopyingId(null);
        }
    };

    // RESUMEN
    const totalPedidos = pedidos.length;

    const totalPagados = pedidos.filter((p) => {
        const e = (p.estado || "pendiente").toLowerCase();
        return e === "pagado" || e === "confirmado";
    }).length;

    const totalPendientes = pedidos.filter((p) => {
        const e = (p.estado || "pendiente").toLowerCase();
        return e === "pendiente";
    }).length;

    const totalCancelados = pedidos.filter((p) => {
        const e = (p.estado || "pendiente").toLowerCase();
        return e === "cancelado";
    }).length;

    const totalRecaudado = pedidos.reduce((acc, p) => {
        const e = (p.estado || "pendiente").toLowerCase();
        if (e === "pagado" || e === "confirmado") {
            return acc + (p.total ?? 0);
        }
        return acc;
    }, 0);

    // Exportar CSV (igual que antes)
    const handleExportCSV = () => {
        if (!pedidos.length) {
            alert("No hay pedidos para exportar.");
            return;
        }

        const headers = [
            "ID",
            "Fecha",
            "Actividad",
            "Cliente",
            "Telefono",
            "MetodoPago",
            "Estado",
            "CantidadNumeros",
            "PrecioUnitario",
            "Total",
            "SorteoID",
        ];

        const rows = pedidos.map((p) => {
            const fecha = p.created_at
                ? new Date(p.created_at).toLocaleString("es-EC")
                : "";
            const actividad = p.actividad_numero ?? "";
            const cliente = (p.nombre || "").replace(/"/g, '""');
            const telefono = (p.telefono || "").replace(/"/g, '""');
            const metodo = (p.metodo_pago || "").replace(/"/g, '""');
            const estado = (p.estado || "").toLowerCase();
            const cantidad = p.cantidad_numeros ?? "";
            const precio =
                p.precio_unitario != null ? p.precio_unitario.toFixed(2) : "";
            const total = p.total != null ? p.total.toFixed(2) : "";
            const sorteoId = p.sorteo_id ?? "";

            return [
                p.id,
                `"${fecha}"`,
                actividad,
                `"${cliente}"`,
                `"${telefono}"`,
                `"${metodo}"`,
                `"${estado}"`,
                cantidad,
                precio,
                total,
                sorteoId,
            ].join(";");
        });

        const csvContent = [headers.join(";"), ...rows].join("\n");

        const blob = new Blob([csvContent], {
            type: "text/csv;charset=utf-8;",
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        const today = new Date().toISOString().slice(0, 10);

        link.href = url;
        link.setAttribute("download", `pedidos_sorteopro_${today}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
            {/* Aquí iría tu header y resumen usando totalPedidos, totalPagados, etc. */}

            <section className="overflow-x-auto rounded-2xl bg-[#14151c] p-4 shadow-lg border border-white/10">
                {loading ? (
                    <div className="py-6 text-center text-sm text-slate-400">
                        Cargando pedidos...
                    </div>
                ) : error ? (
                    <div className="py-6 text-center text-sm text-red-400">{error}</div>
                ) : (
                    <table className="min-w-full text-left text-xs md:text-sm text-slate-200">
                        <thead className="border-b border-white/10 text-[11px] uppercase tracking-[0.18em] text-slate-400">
                            {/* Encabezados de tu tabla */}
                            <tr>
                                <th className="px-3 py-2">ID</th>
                                <th className="px-3 py-2">Fecha</th>
                                <th className="px-3 py-2">Actividad</th>
                                <th className="px-3 py-2">Cliente</th>
                                <th className="px-3 py-2">Contacto</th>
                                <th className="px-3 py-2">Paquete</th>
                                <th className="px-3 py-2">Total</th>
                                <th className="px-3 py-2">Estado</th>
                                <th className="px-3 py-2">Acciones</th>
                            </tr>
                        </thead>

                        <tbody>
                            {pedidos.map((pedido) => {
                                const fecha = pedido.created_at
                                    ? new Date(pedido.created_at)
                                    : null;

                                const fechaLabel = fecha
                                    ? fecha.toLocaleString("es-EC", {
                                        day: "2-digit",
                                        month: "2-digit",
                                        year: "2-digit",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })
                                    : "-";

                                const actividadLabel = pedido.actividad_numero
                                    ? `Act #${pedido.actividad_numero}`
                                    : "-";

                                const paqueteLabel =
                                    pedido.cantidad_numeros && pedido.precio_unitario != null
                                        ? `x${pedido.cantidad_numeros} · $${Number(
                                            pedido.precio_unitario
                                        ).toFixed(2)}`
                                        : "-";

                                const totalLabel =
                                    pedido.total != null
                                        ? `$${Number(pedido.total).toFixed(2)}`
                                        : "-";

                                const clienteLabel = pedido.nombre?.trim() || "Sin nombre";
                                const contactoLabel = pedido.telefono?.trim() || "-";

                                const estado = (pedido.estado || "pendiente").toLowerCase();
                                const isPagado = estado === "pagado" || estado === "confirmado";

                                const estadoColor =
                                    estado === "pagado" || estado === "confirmado"
                                        ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
                                        : estado === "cancelado"
                                            ? "bg-red-500/15 text-red-300 border-red-500/40"
                                            : "bg-yellow-500/15 text-yellow-300 border-yellow-500/40";

                                const estadoTexto =
                                    estado === "pagado" || estado === "confirmado"
                                        ? "PAGADO"
                                        : estado === "cancelado"
                                            ? "CANCELADO"
                                            : "PENDIENTE";

                                const disabled = updatingId === pedido.id;
                                const copying = copyingId === pedido.id;

                                return (
                                    <tr
                                        key={pedido.id}
                                        className="border-b border-white/5 hover:bg-white/5"
                                    >
                                        <td className="px-3 py-3 text-xs">{pedido.id}</td>
                                        <td className="px-3 py-3 text-xs">{fechaLabel}</td>
                                        <td className="px-3 py-3 text-xs">{actividadLabel}</td>
                                        <td className="px-3 py-3 text-xs">{clienteLabel}</td>
                                        <td className="px-3 py-3 text-xs">{contactoLabel}</td>
                                        <td className="px-3 py-3 text-xs">{paqueteLabel}</td>
                                        <td className="px-3 py-3 text-xs">{totalLabel}</td>

                                        <td className="px-3 py-3 text-center">
                                            <span
                                                className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] ${estadoColor}`}
                                            >
                                                {estadoTexto}
                                            </span>
                                        </td>

                                        <td className="px-3 py-3 text-[10px] md:text-xs space-y-1">
                                            <div className="space-x-1">
                                                {estado !== "pagado" && (
                                                    <button
                                                        disabled={disabled}
                                                        onClick={() => cambiarEstado(pedido.id, "pagado")}
                                                        className="rounded-full bg-emerald-500/80 px-3 py-1 font-semibold text-[10px] uppercase tracking-[0.12em] hover:bg-emerald-500 disabled:opacity-40"
                                                    >
                                                        Pagado
                                                    </button>
                                                )}
                                                {estado !== "pendiente" && (
                                                    <button
                                                        disabled={disabled}
                                                        onClick={() =>
                                                            cambiarEstado(pedido.id, "pendiente")
                                                        }
                                                        className="rounded-full bg-yellow-500/80 px-3 py-1 font-semibold text-[10px] uppercase tracking-[0.12em] hover:bg-yellow-500 disabled:opacity-40"
                                                    >
                                                        Pendiente
                                                    </button>
                                                )}
                                                {estado !== "cancelado" && (
                                                    <button
                                                        disabled={disabled}
                                                        onClick={() =>
                                                            cambiarEstado(pedido.id, "cancelado")
                                                        }
                                                        className="rounded-full bg-red-500/80 px-3 py-1 font-semibold text-[10px] uppercase tracking-[0.12em] hover:bg-red-500 disabled:opacity-40"
                                                    >
                                                        Cancelar
                                                    </button>
                                                )}
                                            </div>

                                            <div className="mt-2 flex flex-wrap gap-1">
                                                {isPagado ? (
                                                    <Link
                                                        href={`/admin/numeros?pedido=${pedido.id}`}
                                                        className="rounded-full border border-white/30 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-100 hover:bg-white/10"
                                                    >
                                                        Ver números
                                                    </Link>
                                                ) : (
                                                    <button
                                                        disabled
                                                        className="rounded-full border border-gray-500/40 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500 opacity-40 cursor-not-allowed"
                                                    >
                                                        Ver números
                                                    </button>
                                                )}

                                                <button
                                                    disabled={copying}
                                                    onClick={() => copiarNumerosPedido(pedido)}
                                                    className="rounded-full border border-[#25D366]/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#25D366] hover:bg-[#25D366]/10 disabled:opacity-50"
                                                >
                                                    {copying ? "Copiando..." : "Copiar WhatsApp"}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}

                            {pedidos.length === 0 && !loading && (
                                <tr>
                                    <td
                                        colSpan={10}
                                        className="px-3 py-6 text-center text-[12px] text-slate-400"
                                    >
                                        Aún no hay pedidos registrados.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </section>
        </div>
    );
}
