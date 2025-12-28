// app/admin/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

type PedidoResumen = {
    id: number;
    created_at: string | null;
    total: number | null;
    cantidad_numeros: number | null;
    estado: string | null;
    cliente_nombre: string | null;
};

type Stats = {
    totalPedidos: number;
    totalNumeros: number; // ✅ solo pagados/confirmados
    totalRecaudado: number; // ✅ solo pagados/confirmados
    pedidosPendientes: number;
    pedidosPagados: number; // ✅ incluye confirmado
};

type SorteoActivo = any;

function normEstado(v: any): string {
    return String(v ?? "pendiente").trim().toLowerCase();
}
function isPagadoEstado(e: string): boolean {
    return e === "pagado" || e === "confirmado";
}

export default function AdminHomePage() {
    const [pedidos, setPedidos] = useState<PedidoResumen[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [sorteoActivo, setSorteoActivo] = useState<SorteoActivo | null>(null);
    const [loading, setLoading] = useState(true);
    const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
    const [alertas, setAlertas] = useState<string[]>([]);

    useEffect(() => {
        async function cargarDashboard() {
            setLoading(true);
            setErrorGeneral(null);
            const nuevasAlertas: string[] = [];

            try {
                // 1) Pedidos
                const { data: pedidosRaw, error: pedidosError } = await supabase
                    .from("pedidos")
                    .select("*")
                    .order("created_at", { ascending: false });

                if (pedidosError) {
                    console.error("Error cargando pedidos:", JSON.stringify(pedidosError, null, 2));
                    setErrorGeneral("No se pudieron cargar los pedidos.");
                    setLoading(false);
                    return;
                }

                const pedidosNorm: PedidoResumen[] = (pedidosRaw || []).map((p: any) => ({
                    id: p.id,
                    created_at: p.created_at,
                    total: Number(p.total ?? p.monto_total ?? 0) || 0,
                    cantidad_numeros: Number(p.cantidad_numeros ?? p.cantidad ?? p.cant_numeros ?? 0) || 0,
                    estado: normEstado(p.estado ?? p.status ?? p.estado_pago),
                    cliente_nombre: (p.cliente_nombre ?? p.nombre_cliente ?? p.nombre ?? null) as any,
                }));

                setPedidos(pedidosNorm);

                // ✅ 2) Stats COHERENTES con /admin/pedidos
                const totalPedidos = pedidosNorm.length;

                const pedidosPagados = pedidosNorm.filter((p) => isPagadoEstado(normEstado(p.estado))).length;
                const pedidosPendientes = pedidosNorm.filter((p) => normEstado(p.estado) === "pendiente").length;

                const totalRecaudado = pedidosNorm.reduce((acc, p) => {
                    const e = normEstado(p.estado);
                    return isPagadoEstado(e) ? acc + (p.total ?? 0) : acc;
                }, 0);

                const totalNumeros = pedidosNorm.reduce((acc, p) => {
                    const e = normEstado(p.estado);
                    return isPagadoEstado(e) ? acc + (p.cantidad_numeros ?? 0) : acc;
                }, 0);

                setStats({
                    totalPedidos,
                    totalNumeros,
                    totalRecaudado,
                    pedidosPendientes,
                    pedidosPagados,
                });

                // Alertas
                if (pedidosPendientes > 0) {
                    nuevasAlertas.push(`Tienes ${pedidosPendientes} pedido(s) pendiente(s) de pago.`);
                }
                if (totalPedidos === 0) {
                    nuevasAlertas.push("Aún no se han registrado pedidos en el sistema.");
                }

                // 3) Sorteo activo
                const { data: sorteoData, error: sorteoError } = await supabase
                    .from("sorteos")
                    .select("*")
                    .eq("estado", "activo")
                    .order("created_at", { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (sorteoError) {
                    console.error("Error cargando sorteo activo:", sorteoError);
                } else if (sorteoData) {
                    setSorteoActivo(sorteoData);
                } else {
                    nuevasAlertas.push("No hay un sorteo activo configurado actualmente.");
                }
            } catch (err: any) {
                console.error(err);
                setErrorGeneral(err?.message || "Ocurrió un error al cargar el panel.");
            } finally {
                setAlertas(nuevasAlertas);
                setLoading(false);
            }
        }

        cargarDashboard();
    }, []);

    const sorteoTitulo: string | null = useMemo(() => {
        if (!sorteoActivo) return null;
        return (
            sorteoActivo.titulo ||
            sorteoActivo.nombre ||
            sorteoActivo.nombre_publico ||
            sorteoActivo.titulo_publico ||
            null
        );
    }, [sorteoActivo]);

    const sorteoActividadNumero: number | null = useMemo(() => {
        if (!sorteoActivo) return null;
        return (
            sorteoActivo.actividad_numero ||
            sorteoActivo.actividad ||
            sorteoActivo.numero_actividad ||
            null
        );
    }, [sorteoActivo]);

    const sorteoProgresoLabel: string | null = useMemo(() => {
        if (!sorteoActivo) return null;
        const raw =
            sorteoActivo.porcentaje_vendido ||
            sorteoActivo.progreso ||
            sorteoActivo.progreso_venta ||
            null;
        if (raw == null) return null;
        const num = Number(raw);
        if (Number.isNaN(num)) return null;
        return `${num.toFixed(2)}% vendido`;
    }, [sorteoActivo]);

    const sorteoId: string | null = sorteoActivo?.id || null;

    const ultimosPedidos = useMemo(() => pedidos.slice(0, 5), [pedidos]);

    return (
        <main className="min-h-screen bg-[#050608] text-slate-50">
            <div className="mx-auto max-w-6xl px-4 py-8 md:py-12 space-y-8">
                <header className="space-y-3">
                    <div className="text-xs font-semibold tracking-[0.2em] text-orange-400 uppercase">
                        Casa Bikers • Admin
                    </div>
                    <h1 className="text-3xl md:text-4xl font-extrabold tracking-wide">
                        Panel administrativo
                    </h1>
                    <p className="max-w-2xl text-sm text-slate-400">
                        Resumen general del sistema de sorteos. Desde aquí puedes controlar
                        pedidos, números asignados y el estado de tus actividades.
                    </p>
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
                                        <p className="mt-2 text-2xl font-semibold">{stats?.totalPedidos ?? 0}</p>
                                    </div>

                                    <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3">
                                        <p className="text-xs text-slate-400">Números vendidos</p>
                                        <p className="mt-2 text-2xl font-semibold">{stats?.totalNumeros ?? 0}</p>
                                    </div>

                                    <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3">
                                        <p className="text-xs text-slate-400">Total recaudado</p>
                                        <p className="mt-2 text-2xl font-semibold">
                                            ${stats ? stats.totalRecaudado.toFixed(2) : "0.00"}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
                                        <p className="text-xs text-emerald-200">Pedidos pagados</p>
                                        <p className="mt-2 text-xl font-semibold">{stats?.pedidosPagados ?? 0}</p>
                                    </div>

                                    <div className="rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-4 py-3">
                                        <p className="text-xs text-yellow-100">Pedidos pendientes</p>
                                        <p className="mt-2 text-xl font-semibold">{stats?.pedidosPendientes ?? 0}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-xl border border-orange-500/60 bg-gradient-to-b from-orange-500/20 via-slate-900/80 to-slate-950 px-4 py-4 flex flex-col justify-between">
                                <div className="space-y-1">
                                    <p className="text-xs font-semibold tracking-[0.2em] uppercase text-orange-300">
                                        Sorteo activo
                                    </p>
                                    {sorteoActivo ? (
                                        <>
                                            <h2 className="text-lg font-semibold">
                                                {sorteoTitulo || "Sorteo en curso"}
                                            </h2>
                                            <p className="text-xs text-orange-100/80">
                                                {sorteoActividadNumero ? `Actividad #${sorteoActividadNumero}` : "Actividad sin número definido"}
                                            </p>
                                            {sorteoProgresoLabel && (
                                                <p className="mt-2 text-xs font-medium text-orange-100">
                                                    {sorteoProgresoLabel}
                                                </p>
                                            )}
                                        </>
                                    ) : (
                                        <p className="text-sm text-orange-100/80">
                                            No hay un sorteo activo configurado en este momento.
                                        </p>
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
                                    href="/admin/affiliate"
                                    className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-100 hover:border-orange-500 hover:text-orange-200"
                                >
                                    Admin Socio
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
                                                    const e = normEstado(p.estado);
                                                    const paid = isPagadoEstado(e);

                                                    const badgeClass = paid
                                                        ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/40"
                                                        : e === "pendiente"
                                                            ? "bg-yellow-500/10 text-yellow-300 border border-yellow-500/40"
                                                            : "bg-slate-700/60 text-slate-200 border border-slate-600";

                                                    return (
                                                        <tr key={p.id} className="border-b border-slate-800/60 last:border-0">
                                                            <td className="py-1.5 pr-3 align-middle font-mono text-[11px] text-orange-300">
                                                                #{p.id}
                                                            </td>
                                                            <td className="py-1.5 pr-3 align-middle">{p.cliente_nombre || "—"}</td>
                                                            <td className="py-1.5 pr-3 align-middle text-slate-300">
                                                                {p.created_at
                                                                    ? new Date(p.created_at).toLocaleString("es-EC", {
                                                                        dateStyle: "short",
                                                                        timeStyle: "short",
                                                                    })
                                                                    : "-"}
                                                            </td>
                                                            <td className="py-1.5 pr-3 align-middle">
                                                                {p.total ? `$${p.total.toFixed(2)}` : "$0.00"}
                                                            </td>
                                                            <td className="py-1.5 pr-3 align-middle">
                                                                <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeClass}`}>
                                                                    {e || "n/a"}
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
