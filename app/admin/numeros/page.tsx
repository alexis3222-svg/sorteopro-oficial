// app/admin/numeros/page.tsx
// @ts-nocheck
"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { Anton } from "next/font/google";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const anton = Anton({
    subsets: ["latin"],
    weight: "400",
});

type PedidoRow = {
    id: number;
    created_at: string | null;
    actividad_numero: number | null;
    nombre: string | null;
    telefono: string | null;
    estado: string | null;
    metodo_pago: string | null;
};

type NumeroRow = {
    id: number;
    numero: number;
    sorteo_id: string;
    pedido_id: number | null;      // 👈 importante
    pedido: PedidoRow[];           // 👈 lo seguimos usando como array[0]
};

type FiltroActividad = "todas" | number;
type FiltroEstado = "todos" | "pagado" | "pendiente" | "cancelado";

export default function AdminNumerosPage() {
    const [numeros, setNumeros] = useState<NumeroRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [actividadFiltro, setActividadFiltro] =
        useState<FiltroActividad>("todas");
    const [estadoFiltro, setEstadoFiltro] =
        useState<FiltroEstado>("todos");
    const [searchNumero, setSearchNumero] = useState("");

    useEffect(() => {
        const fetchNumeros = async () => {
            setLoading(true);
            setError(null);

            // 1️⃣ Traemos solo los números, sin embed
            const { data: numerosData, error: errorNumeros } = await supabase
                .from("numeros_asignados")
                .select(`
          id,
          numero,
          sorteo_id,
          pedido_id
        `)
                .order("numero", { ascending: true });

            if (errorNumeros) {
                console.error("Error cargando números:", errorNumeros.message);
                setError("No se pudieron cargar los números.");
                setLoading(false);
                return;
            }

            const numerosList = (numerosData || []) as {
                id: number;
                numero: number;
                sorteo_id: string;
                pedido_id: number | null;
            }[];

            // 2️⃣ Sacamos los pedido_id únicos
            const pedidoIds = Array.from(
                new Set(
                    numerosList
                        .map((n) => n.pedido_id)
                        .filter((v): v is number => v !== null)
                )
            );

            // 3️⃣ Mapa de pedidos por id
            const pedidosMap: Record<number, PedidoRow> = {};

            if (pedidoIds.length > 0) {
                const { data: pedidosData, error: errorPedidos } = await supabase
                    .from("pedidos")
                    .select(`
            id,
            created_at,
            actividad_numero,
            nombre,
            telefono,
            estado,
            metodo_pago
          `)
                    .in("id", pedidoIds);

                if (errorPedidos) {
                    console.error("Error cargando pedidos para números:", errorPedidos.message);
                } else {
                    (pedidosData || []).forEach((p: any) => {
                        pedidosMap[p.id] = p as PedidoRow;
                    });
                }
            }

            // 4️⃣ Armamos la estructura NumeroRow con pedido: [pedido]
            const withPedidos: NumeroRow[] = numerosList.map((n) => {
                const pedido = n.pedido_id ? pedidosMap[n.pedido_id] : undefined;
                return {
                    ...n,
                    pedido: pedido ? [pedido] : [],    // 👈 así no rompemos el resto del código
                };
            });

            setNumeros(withPedidos);
            setLoading(false);
        };

        fetchNumeros();
    }, []);

    // Actividades disponibles (desde el primer pedido relacionado)
    const actividadesDisponibles = Array.from(
        new Set(
            numeros
                .map((n) => n.pedido[0]?.actividad_numero ?? null)
                .filter((v): v is number => v !== null)
        )
    ).sort((a, b) => a - b);

    // Filtrado (actividad + estado + número buscado)
    const numerosFiltrados = numeros.filter((n) => {
        const pedido = n.pedido[0]; // 👈 tomamos el primero
        const act = pedido?.actividad_numero ?? null;
        const estado = (pedido?.estado || "pendiente").toLowerCase();

        // 🔎 filtro por número (si hay algo escrito)
        if (searchNumero.trim() !== "") {
            const buscado = parseInt(searchNumero.trim(), 10);
            if (isNaN(buscado) || n.numero !== buscado) {
                return false;
            }
        }

        // filtro por actividad
        if (actividadFiltro !== "todas" && act !== actividadFiltro) {
            return false;
        }

        // filtro por estado
        if (estadoFiltro !== "todos") {
            if (estadoFiltro === "pagado") {
                if (!(estado === "pagado" || estado === "confirmado")) {
                    return false;
                }
            } else if (estado !== estadoFiltro) {
                return false;
            }
        }

        return true;
    });

    // Exportar CSV (sobre los números filtrados)
    const handleExportNumeros = () => {
        if (!numerosFiltrados.length) {
            alert("No hay números para exportar con el filtro actual.");
            return;
        }

        const headers = [
            "Numero",
            "Actividad",
            "Cliente",
            "Telefono",
            "Estado",
            "MetodoPago",
            "PedidoID",
            "FechaPedido",
            "SorteoID",
        ];

        const rows = numerosFiltrados.map((n) => {
            const p = n.pedido[0]; // 👈 primero
            const actividad = p?.actividad_numero ?? "";
            const cliente = (p?.nombre || "").replace(/"/g, '""');
            const telefono = (p?.telefono || "").replace(/"/g, '""');
            const estado = p?.estado ?? "";
            const metodo = p?.metodo_pago ?? "";
            const pedidoId = p?.id ?? "";
            const fecha = p?.created_at ?? "";
            const sorteoId = n.sorteo_id ?? "";

            return [
                n.numero,
                actividad,
                `"${cliente}"`,
                `"${telefono}"`,
                estado,
                metodo,
                pedidoId,
                fecha,
                sorteoId,
            ].join(";");
        });

        const csv = [headers.join(";"), ...rows].join("\n");

        const blob = new Blob([csv], {
            type: "text/csv;charset=utf-8;",
        });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        const today = new Date().toISOString().slice(0, 10);

        a.href = url;
        a.download = `numeros_sorteopro_${today}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
            <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <p
                        className={`${anton.className} text-xs uppercase tracking-[0.25em] text-[#ff9933]`}
                    >
                        Sorteopro • Admin
                    </p>
                    <h1
                        className={`${anton.className} mt-1 text-2xl md:text-3xl uppercase tracking-[0.18em] text-slate-100`}
                    >
                        Números asignados
                    </h1>
                    <p className="mt-1 text-sm text-slate-400">
                        Vista de todos los números y a qué pedido pertenecen.
                    </p>
                </div>

                <div className="flex flex-col gap-2 md:flex-row md:items-center">
                    {/* BUSCADOR */}
                    <div className="flex items-center gap-2">
                        <span className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                            Buscar número:
                        </span>
                        <input
                            type="text"
                            value={searchNumero}
                            onChange={(e) => setSearchNumero(e.target.value)}
                            placeholder="Ej: 00057"
                            className="rounded-full border border-white/20 bg-[#14151c] px-3 py-1 text-[11px] text-slate-100 outline-none"
                        />
                    </div>

                    {/* ACTIVIDAD */}
                    <div className="flex items-center gap-2">
                        <span className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                            Actividad:
                        </span>
                        <select
                            value={actividadFiltro}
                            onChange={(e) => {
                                const v = e.target.value;
                                if (v === "todas") {
                                    setActividadFiltro("todas");
                                } else {
                                    setActividadFiltro(Number(v));
                                }
                            }}
                            className="rounded-full border border-white/20 bg-[#14151c] px-3 py-1 text-[11px] text-slate-100 outline-none"
                        >
                            <option value="todas">Todas</option>
                            {actividadesDisponibles.map((act) => (
                                <option key={act} value={act}>
                                    Act #{act}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* ESTADO */}
                    <div className="flex items-center gap-2">
                        <span className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                            Estado:
                        </span>
                        <select
                            value={estadoFiltro}
                            onChange={(e) =>
                                setEstadoFiltro(e.target.value as FiltroEstado)
                            }
                            className="rounded-full border border-white/20 bg-[#14151c] px-3 py-1 text-[11px] text-slate-100 outline-none"
                        >
                            <option value="todos">Todos</option>
                            <option value="pagado">Pagados</option>
                            <option value="pendiente">Pendientes</option>
                            <option value="cancelado">Cancelados</option>
                        </select>
                    </div>

                    {/* EXPORTAR CSV */}
                    <button
                        onClick={handleExportNumeros}
                        className="rounded-full bg-[#ff9933] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-950 hover:bg-[#ffb866]"
                    >
                        Exportar CSV
                    </button>

                    <Link
                        href="/admin"
                        className="rounded-full border border-white/20 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-100 hover:bg-white/10"
                    >
                        ← Volver al panel
                    </Link>
                </div>
            </header>

            <section className="overflow-x-auto rounded-2xl bg-[#14151c] p-4 shadow-lg border border-white/10">
                {loading ? (
                    <div className="py-6 text-center text-sm text-slate-400">
                        Cargando números...
                    </div>
                ) : error ? (
                    <div className="py-6 text-center text-sm text-red-400">
                        {error}
                    </div>
                ) : (
                    <table className="min-w-full text-left text-xs md:text-sm text-slate-200">
                        <thead className="border-b border-white/10 text-[11px] uppercase tracking-[0.18em] text-slate-400">
                            <tr>
                                <th className="px-3 py-3">#</th>
                                <th className="px-3 py-3">Número</th>
                                <th className="px-3 py-3">Actividad</th>
                                <th className="px-3 py-3">Pedido</th>
                                <th className="px-3 py-3">Cliente</th>
                                <th className="px-3 py-3">Contacto</th>
                                <th className="px-3 py-3">Estado</th>
                                <th className="px-3 py-3">Pago</th>
                                <th className="px-3 py-3">Fecha pedido</th>
                            </tr>
                        </thead>

                        <tbody>
                            {numerosFiltrados.map((row, idx) => {
                                const pedido = row.pedido[0];
                                const fecha = pedido?.created_at
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

                                const actividadLabel = pedido?.actividad_numero
                                    ? `Act #${pedido.actividad_numero}`
                                    : "-";

                                const clienteLabel =
                                    pedido?.nombre?.trim() || "Sin nombre";
                                const contactoLabel =
                                    pedido?.telefono?.trim() || "-";

                                const estado = (pedido?.estado || "pendiente").toLowerCase();

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

                                return (
                                    <tr
                                        key={row.id}
                                        className="border-b border-white/5 hover:bg-white/5"
                                    >
                                        <td className="px-3 py-3 text-[11px] md:text-xs text-slate-400">
                                            {idx + 1}
                                        </td>
                                        <td className="px-3 py-3 text-[11px] md:text-xs font-semibold text-slate-100">
                                            {row.numero.toString().padStart(5, "0")}
                                        </td>
                                        <td className="px-3 py-3 text-[11px] md:text-xs">
                                            {actividadLabel}
                                        </td>
                                        <td className="px-3 py-3 text-[11px] md:text-xs">
                                            {pedido?.id ? (
                                                <Link
                                                    href={`/admin/pedidos?pedido=${pedido.id}`}
                                                    className="underline underline-offset-2 hover:no-underline text-slate-100"
                                                >
                                                    #{pedido.id}
                                                </Link>
                                            ) : (
                                                "-"
                                            )}
                                        </td>

                                        <td className="px-3 py-3 text-[11px] md:text-xs">
                                            {clienteLabel}
                                        </td>
                                        <td className="px-3 py-3 text-[11px] md:text-xs">
                                            {contactoLabel}
                                        </td>
                                        <td className="px-3 py-3 text-center">
                                            <span
                                                className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] ${estadoColor}`}
                                            >
                                                {estadoTexto}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3 text-[11px] md:text-xs">
                                            {pedido?.metodo_pago || "-"}
                                        </td>
                                        <td className="px-3 py-3 text-[11px] md:text-xs">
                                            {fechaLabel}
                                        </td>
                                    </tr>
                                );
                            })}

                            {numerosFiltrados.length === 0 && !loading && (
                                <tr>
                                    <td
                                        colSpan={9}
                                        className="px-3 py-6 text-center text-[12px] text-slate-400"
                                    >
                                        No hay números para el filtro seleccionado.
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
