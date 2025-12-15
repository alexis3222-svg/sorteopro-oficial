// app/admin/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

type PedidoResumen = {
    id: number;
    created_at: string | null;
    total: number | null;
    estado: string | null;
    cliente_nombre: string | null;
};

type Stats = {
    totalPedidos: number;
    totalNumeros: number;      // 🔥 desde numeros_asignados
    totalRecaudado: number;    // 🔥 vendidos * precio
    pedidosPendientes: number;
    pedidosPagados: number;
};

type SorteoActivo = any;

const normEstado = (v: any) => String(v ?? "").trim().toLowerCase();

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
                // 1️⃣ Sorteo activo
                const { data: sorteoData, error: sorteoError } = await supabase
                    .from("sorteos")
                    .select("*")
                    .eq("estado", "activo")
                    .order("created_at", { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (sorteoError || !sorteoData) {
                    setStats({
                        totalPedidos: 0,
                        totalNumeros: 0,
                        totalRecaudado: 0,
                        pedidosPendientes: 0,
                        pedidosPagados: 0,
                    });
                    setSorteoActivo(null);
                    nuevasAlertas.push("No hay un sorteo activo configurado.");
                    return;
                }

                setSorteoActivo(sorteoData);
                const sorteoId = sorteoData.id;
                const precioNumero = Number(sorteoData.precio_numero) || 0;

                // 2️⃣ Pedidos del sorteo (SOLO para info administrativa)
                const { data: pedidosRaw } = await supabase
                    .from("pedidos")
                    .select("*")
                    .eq("sorteo_id", sorteoId)
                    .order("created_at", { ascending: false });

                const pedidosNorm: PedidoResumen[] = (pedidosRaw || []).map((p: any) => ({
                    id: p.id,
                    created_at: p.created_at,
                    total: Number(p.total ?? 0),
                    estado: p.estado ?? null,
                    cliente_nombre: p.cliente_nombre ?? p.nombre ?? null,
                }));

                setPedidos(pedidosNorm);

                const pedidosPagados = pedidosNorm.filter(p => normEstado(p.estado) === "pagado").length;
                const pedidosPendientes = pedidosNorm.filter(p => normEstado(p.estado) === "pendiente").length;

                // 3️⃣ 🔥 VENTAS REALES → numeros_asignados
                const { count: vendidos, error: vendidosError } = await supabase
                    .from("numeros_asignados")
                    .select("id", { count: "exact", head: true })
                    .eq("sorteo_id", sorteoId)
                    .eq("estado", "asignado");

                if (vendidosError) {
                    console.error("Error contando numeros_asignados:", vendidosError);
                }

                const totalNumeros = vendidos ?? 0;
                const totalRecaudado = totalNumeros * precioNumero;

                setStats({
                    totalPedidos: pedidosNorm.length,
                    totalNumeros,
                    totalRecaudado,
                    pedidosPendientes,
                    pedidosPagados,
                });

                if (pedidosPendientes > 0) {
                    nuevasAlertas.push(`Tienes ${pedidosPendientes} pedido(s) pendiente(s).`);
                }
            } catch (err: any) {
                console.error(err);
                setErrorGeneral(err?.message || "Error cargando el panel.");
            } finally {
                setAlertas(nuevasAlertas);
                setLoading(false);
            }
        }

        cargarDashboard();
    }, []);

    const ultimosPedidos = useMemo(() => pedidos.slice(0, 5), [pedidos]);

    return (
        <main className="min-h-screen bg-[#050608] text-slate-50">
            <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
                <header>
                    <div className="text-xs font-semibold tracking-[0.2em] text-orange-400 uppercase">
                        Casa Bikers • Admin
                    </div>
                    <h1 className="text-3xl font-extrabold">Panel administrativo</h1>
                </header>

                {loading ? (
                    <div className="py-16 text-center text-slate-400">Cargando…</div>
                ) : (
                    <>
                        {/* KPIs */}
                        <section className="grid gap-4 md:grid-cols-3">
                            <KPI label="Total de pedidos" value={stats?.totalPedidos ?? 0} />
                            <KPI label="Números vendidos" value={stats?.totalNumeros ?? 0} />
                            <KPI
                                label="Total recaudado"
                                value={`$${(stats?.totalRecaudado ?? 0).toFixed(2)}`}
                            />
                        </section>

                        <section className="grid gap-4 md:grid-cols-2">
                            <KPI label="Pedidos pagados" value={stats?.pedidosPagados ?? 0} />
                            <KPI label="Pedidos pendientes" value={stats?.pedidosPendientes ?? 0} />
                        </section>

                        {/* Últimos pedidos */}
                        <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                            <h2 className="text-sm font-semibold mb-2">Últimos pedidos</h2>
                            {ultimosPedidos.length === 0 ? (
                                <p className="text-xs text-slate-400">Sin pedidos</p>
                            ) : (
                                <table className="w-full text-xs">
                                    <tbody>
                                        {ultimosPedidos.map(p => (
                                            <tr key={p.id} className="border-b border-slate-800">
                                                <td className="py-2">#{p.id}</td>
                                                <td>{p.cliente_nombre ?? "—"}</td>
                                                <td>{p.estado}</td>
                                                <td>${(p.total ?? 0).toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </section>
                    </>
                )}
            </div>
        </main>
    );
}

function KPI({ label, value }: { label: string; value: any }) {
    return (
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3">
            <p className="text-xs text-slate-400">{label}</p>
            <p className="mt-2 text-2xl font-semibold">{value}</p>
        </div>
    );
}
