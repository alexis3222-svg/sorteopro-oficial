"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

type PedidoRow = {
    id: number;
    created_at: string | null;
    sorteo_id: string | null;
    actividad_numero: number | null;
    cantidad_numeros: number | null;
    precio_unitario: number | null;
    total: number | null;
    metodo_pago: string | null;
    estado: string | null;
    nombre: string | null;
    telefono: string | null;
};

type Stats = {
    totalPedidos: number;
    totalNumeros: number;
    totalRecaudado: number;
    pedidosPendientes: number;
    pedidosPagados: number;
};

type SorteoActivo = any;

const norm = (v: any) => String(v ?? "").trim().toLowerCase();

const STATS_ZERO: Stats = {
    totalPedidos: 0,
    totalNumeros: 0,
    totalRecaudado: 0,
    pedidosPendientes: 0,
    pedidosPagados: 0,
};

export default function AdminHomePage() {
    const [pedidos, setPedidos] = useState<PedidoRow[]>([]);
    const [stats, setStats] = useState<Stats>(STATS_ZERO);
    const [sorteoActivo, setSorteoActivo] = useState<SorteoActivo | null>(null);
    const [loading, setLoading] = useState(true);
    const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
    const [alertas, setAlertas] = useState<string[]>([]);

    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

    const cargarDashboard = useCallback(async () => {
        setLoading(true);
        setErrorGeneral(null);
        const nuevasAlertas: string[] = [];

        try {
            // 1) Sorteo activo
            const { data: sorteoData, error: sorteoError } = await supabase
                .from("sorteos")
                .select("*")
                .eq("estado", "activo")
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

            if (sorteoError) {
                console.error("Error cargando sorteo activo:", sorteoError);
                nuevasAlertas.push("No se pudo cargar el sorteo activo.");
            }

            if (!sorteoData?.id) {
                setSorteoActivo(null);
                setPedidos([]);
                setStats(STATS_ZERO);
                nuevasAlertas.push("No hay un sorteo activo configurado actualmente.");
                setAlertas(nuevasAlertas);
                return;
            }

            setSorteoActivo(sorteoData);
            const sorteoIdActivo = String(sorteoData.id);

            // 2) Pedidos del sorteo activo
            const { data: pedidosData, error: pedidosError } = await supabase
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
                .eq("sorteo_id", sorteoIdActivo)
                .order("id", { ascending: false });

            if (pedidosError) {
                console.error("Error cargando pedidos:", pedidosError);
                setErrorGeneral("No se pudieron cargar los pedidos.");
                setAlertas(nuevasAlertas);
                setPedidos([]);
                setStats(STATS_ZERO);
                return;
            }

            const pedidosNorm = (pedidosData || []) as PedidoRow[];
            setPedidos(pedidosNorm);

            // 3) Estados
            const pagadosArr = pedidosNorm.filter((p) => norm(p.estado) === "pagado");
            const pendientesArr = pedidosNorm.filter((p) => norm(p.estado) === "pendiente");
            const enProcesoArr = pedidosNorm.filter((p) => norm(p.estado) === "en_proceso");

            const totalPedidos = pedidosNorm.length;
            const pedidosPagados = pagadosArr.length;
            const pedidosPendientes = pendientesArr.length;

            // 4) Vendidos reales: numeros_asignados SOLO de pedidos pagados
            let totalNumeros = 0;
            const pedidoIdsPagados = pagadosArr.map((p) => p.id);

            if (pedidoIdsPagados.length > 0) {
                const { count, error: countError } = await supabase
                    .from("numeros_asignados")
                    .select("id", { count: "exact", head: true })
                    .eq("sorteo_id", sorteoIdActivo)
                    .in("pedido_id", pedidoIdsPagados);

                if (countError) {
                    console.error("Error contando numeros_asignados:", countError);
                } else {
                    totalNumeros = count ?? 0;
                }
            }

            // 5) Recaudado: SOLO pedidos pagados
            const totalRecaudado = pagadosArr.reduce((acc, p) => acc + Number(p.total ?? 0), 0);

            setStats({
                totalPedidos,
                totalNumeros,
                totalRecaudado,
                pedidosPendientes,
                pedidosPagados,
            });

            // 6) Alertas
            if (pedidosPendientes > 0) {
                nuevasAlertas.push(`Tienes ${pedidosPendientes} pedido(s) pendiente(s) de pago.`);
            }
            if (enProcesoArr.length > 0) {
                nuevasAlertas.push(`Tienes ${enProcesoArr.length} pedido(s) en proceso (PayPhone).`);
            }
            if (totalPedidos === 0) {
                nuevasAlertas.push("Aún no se han registrado pedidos en el sorteo activo.");
            }
        } catch (err: any) {
            console.error(err);
            setErrorGeneral(err?.message || "Ocurrió un error al cargar el panel.");
            setPedidos([]);
            setStats(STATS_ZERO);
        } finally {
            setAlertas(nuevasAlertas);
            setLoading(false);
        }
    }, []);

    // Carga inicial
    useEffect(() => {
        cargarDashboard();
    }, [cargarDashboard]);

    // Realtime: suscribirse cuando hay sorteoActivo
    useEffect(() => {
        const sorteoId = sorteoActivo?.id ? String(sorteoActivo.id) : null;
        if (!sorteoId) return;

        // Evitar duplicar canales
        if (channelRef.current) {
            supabase.removeChannel(channelRef.current);
            channelRef.current = null;
        }

        const ch = supabase
            .channel(`admin-dashboard-${sorteoId}`)
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "pedidos", filter: `sorteo_id=eq.${sorteoId}` },
                () => cargarDashboard()
            )
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "numeros_asignados", filter: `sorteo_id=eq.${sorteoId}` },
                () => cargarDashboard()
            )
            .subscribe();

        channelRef.current = ch;

        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
        };
    }, [cargarDashboard, sorteoActivo?.id]);

    const sorteoTitulo: string | null = useMemo(() => (sorteoActivo ? sorteoActivo.titulo || null : null), [sorteoActivo]);
    const sorteoActividadNumero: number | null = useMemo(
        () => (sorteoActivo ? sorteoActivo.actividad_numero ?? null : null),
        [sorteoActivo]
    );

    const sorteoId: string | null = sorteoActivo?.id || null;
    const ultimosPedidos = useMemo(() => pedidos.slice(0, 5), [pedidos]);

    return (
        <main className="min-h-screen bg-[#050608] text-slate-50">
            <div className="mx-auto max-w-6xl px-4 py-8 md:py-12 space-y-8">
                <header className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <div className="text-xs font-semibold tracking-[0.2em] text-orange-400 uppercase">
                                Casa Bikers • Admin
                            </div>
                            <h1 className="text-3xl md:text-4xl font-extrabold tracking-wide">Panel administrativo</h1>
                            <p className="max-w-2xl text-sm text-slate-400">
                                Resumen del sorteo activo. Aquí controlas pedidos, números asignados y estado.
                            </p>
                        </div>

                        <button
                            onClick={cargarDashboard}
                            className="shrink-0 rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-100 hover:border-orange-500 hover:text-orange-200"
                        >
                            Actualizar
                        </button>
                    </div>
                </header>

                {errorGeneral && (
                    <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                        {errorGeneral}
                    </div>
                )}

                {loading ? (
                    <div className="flex items-center justify-center py-16 text-sm text-slate-400">
                        Cargando información del panel...
                    </div>
                ) : (
                    <>
                        <section className="grid gap-4 md:grid-cols-3">
                            <div className="md:col-span-2 space-y-4">
                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3">
                                        <p className="text-xs text-slate-400">Total de pedidos</p>
                                        <p className="mt-2 text-2xl font-semibold">{stats.totalPedidos}</p>
                                    </div>

                                    <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3">
                                        <p className="text-xs text-slate-400">Números vendidos</p>
                                        <p className="mt-2 text-2xl font-semibold">{stats.totalNumeros}</p>
                                    </div>

                                    <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3">
                                        <p className="text-xs text-slate-400">Total recaudado</p>
                                        <p className="mt-2 text-2xl font-semibold">${stats.totalRecaudado.toFixed(2)}</p>
                                    </div>
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
                                        <p className="text-xs text-emerald-200">Pedidos pagados</p>
                                        <p className="mt-2 text-xl font-semibold">{stats.pedidosPagados}</p>
                                    </div>

                                    <div className="rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-4 py-3">
                                        <p className="text-xs text-yellow-100">Pedidos pendientes</p>
                                        <p className="mt-2 text-xl font-semibold">{stats.pedidosPendientes}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-xl border border-orange-500/60 bg-gradient-to-b from-orange-500/20 via-slate-900/80 to-slate-950 px-4 py-4 flex flex-col justify-between">
                                <div className="space-y-1">
                                    <p className="text-xs font-semibold tracking-[0.2em] uppercase text-orange-300">Sorteo activo</p>
                                    {sorteoActivo ? (
                                        <>
                                            <h2 className="text-lg font-semibold">{sorteoTitulo || "Sorteo en curso"}</h2>
                                            <p className="text-xs text-orange-100/80">
                                                {sorteoActividadNumero ? `Actividad #${sorteoActividadNumero}` : "Actividad sin número"}
                                            </p>
                                        </>
                                    ) : (
                                        <p className="text-sm text-orange-100/80">No hay un sorteo activo configurado en este momento.</p>
                                    )}
                                </div>

                                <div className="mt-4 flex flex-wrap gap-2">
                                    <Link
                                        href="/admin/sorteos"
                                        className="inline-flex items-center rounded-full border border-orange-400/70 bg-orange-500/90 px-3 py-1 text-xs font-semibold text-black hover:bg-orange-400"
                                    >
                                        Ver sorteos
                                    </Link>
                                    {sorteoId && (
                                        <Link
                                            href={`/admin/sorteos/${sorteoId}`}
                                            className="inline-flex items-center rounded-full border border-orange-300/60 bg-transparent px-3 py-1 text-xs font-semibold text-orange-100 hover:bg-orange-500/20"
                                        >
                                            Editar sorteo activo
                                        </Link>
                                    )}
                                </div>
                            </div>
                        </section>

                        <section className="space-y-3">
                            <h2 className="text-sm font-semibold text-slate-200">Módulos disponibles</h2>
                            <div className="flex flex-wrap gap-3">
                                <Link
                                    href="/admin/numeros"
                                    className="inline-flex items-center rounded-full bg-orange-500 px-4 py-2 text-xs font-semibold text-black hover:bg-orange-400"
                                >
                                    Ver números asignados
                                </Link>
                                <Link
                                    href="/admin/pedidos"
                                    className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-100 hover:border-orange-500 hover:text-orange-200"
                                >
                                    Ver pedidos
                                </Link>
                                <Link
                                    href="/"
                                    className="inline-flex items-center rounded-full border border-slate-700 bg-transparent px-4 py-2 text-xs font-semibold text-slate-200 hover:border-orange-500 hover:text-orange-200"
                                >
                                    Volver al sitio público
                                </Link>
                            </div>
                        </section>

                        <section className="grid gap-4 md:grid-cols-3">
                            <div className="md:col-span-2 rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-4">
                                <div className="flex items-center justify-between mb-3">
                                    <h2 className="text-sm font-semibold text-slate-200">Últimos pedidos</h2>
                                    <Link href="/admin/pedidos" className="text-[11px] text-orange-300 hover:text-orange-200">
                                        Ver todos →
                                    </Link>
                                </div>

                                {ultimosPedidos.length === 0 ? (
                                    <p className="text-xs text-slate-400">Aún no se registran pedidos.</p>
                                ) : (
                                    <div className="overflow-x-auto text-xs">
                                        <table className="min-w-full text-left">
                                            <thead className="text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-800">
                                                <tr>
                                                    <th className="py-1.5 pr-3">ID</th>
                                                    <th className="py-1.5 pr-3">Cliente</th>
                                                    <th className="py-1.5 pr-3">Fecha</th>
                                                    <th className="py-1.5 pr-3">Total</th>
                                                    <th className="py-1.5 pr-3">Estado</th>
                                                    <th className="py-1.5 pr-3"></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {ultimosPedidos.map((p) => {
                                                    const est = norm(p.estado);
                                                    return (
                                                        <tr key={p.id} className="border-b border-slate-800/60 last:border-0">
                                                            <td className="py-1.5 pr-3 align-middle font-mono text-[11px] text-orange-300">#{p.id}</td>
                                                            <td className="py-1.5 pr-3 align-middle">{p.nombre || "—"}</td>
                                                            <td className="py-1.5 pr-3 align-middle text-slate-300">
                                                                {p.created_at
                                                                    ? new Date(p.created_at).toLocaleString("es-EC", { dateStyle: "short", timeStyle: "short" })
                                                                    : "-"}
                                                            </td>
                                                            <td className="py-1.5 pr-3 align-middle">
                                                                {p.total ? `$${Number(p.total).toFixed(2)}` : "$0.00"}
                                                            </td>
                                                            <td className="py-1.5 pr-3 align-middle">
                                                                <span
                                                                    className={[
                                                                        "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold border",
                                                                        est === "pagado"
                                                                            ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
                                                                            : est === "pendiente"
                                                                                ? "bg-yellow-500/10 text-yellow-300 border-yellow-500/40"
                                                                                : est === "en_proceso"
                                                                                    ? "bg-sky-500/10 text-sky-300 border-sky-500/40"
                                                                                    : est === "cancelado"
                                                                                        ? "bg-red-500/10 text-red-200 border-red-500/40"
                                                                                        : "bg-slate-700/60 text-slate-200 border-slate-600",
                                                                    ].join(" ")}
                                                                >
                                                                    {est === "en_proceso" ? "en proceso" : p.estado || "N/A"}
                                                                </span>
                                                            </td>
                                                            <td className="py-1.5 pr-3 align-middle">
                                                                <Link href={`/admin/pedidos?pedido=${p.id}`} className="text-[11px] text-orange-300 hover:text-orange-200">
                                                                    Ver detalle
                                                                </Link>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-4">
                                <h2 className="text-sm font-semibold text-slate-200 mb-2">Alertas del sistema</h2>
                                {alertas.length === 0 ? (
                                    <p className="text-xs text-slate-400">Todo se ve bien por ahora. 🎯</p>
                                ) : (
                                    <ul className="space-y-1 text-xs text-slate-200">
                                        {alertas.map((a, idx) => (
                                            <li key={idx} className="flex gap-2">
                                                <span className="mt-[3px] h-1.5 w-1.5 rounded-full bg-orange-400" />
                                                <span>{a}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </section>
                    </>
                )}
            </div>
        </main>
    );
}
