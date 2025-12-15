// app/admin/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

const normEstado = (v: any) => String(v ?? "").trim().toLowerCase();

type PedidoResumen = {
    id: number;
    created_at: string | null;
    total: number;
    estado: string | null;
    cliente_nombre: string | null;
};

type Stats = {
    totalPedidos: number;
    pedidosPagados: number;
    pedidosPendientes: number;
    totalNumeros: number;
    totalRecaudado: number;
};

export default function AdminHomePage() {
    const [pedidos, setPedidos] = useState<PedidoResumen[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [sorteoActivo, setSorteoActivo] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function cargarDashboard() {
            setLoading(true);

            // 1️⃣ Sorteo activo
            const { data: sorteo } = await supabase
                .from("sorteos")
                .select("*")
                .eq("estado", "activo")
                .limit(1)
                .maybeSingle();

            if (!sorteo) {
                setStats({
                    totalPedidos: 0,
                    pedidosPagados: 0,
                    pedidosPendientes: 0,
                    totalNumeros: 0,
                    totalRecaudado: 0,
                });
                setLoading(false);
                return;
            }

            setSorteoActivo(sorteo);

            // 2️⃣ Pedidos del sorteo activo
            const { data: pedidosRaw } = await supabase
                .from("pedidos")
                .select("*")
                .eq("sorteo_id", sorteo.id)
                .order("created_at", { ascending: false });

            const pedidosNorm: PedidoResumen[] = (pedidosRaw ?? []).map((p: any) => ({
                id: p.id,
                created_at: p.created_at,
                total: Number(p.total ?? 0),
                estado: p.estado ?? null,
                cliente_nombre: p.nombre ?? null,
            }));

            setPedidos(pedidosNorm);

            const pedidosPagados = pedidosNorm.filter(
                (p) => normEstado(p.estado) === "pagado"
            ).length;

            const pedidosPendientes = pedidosNorm.filter(
                (p) => normEstado(p.estado) === "pendiente"
            ).length;

            // 3️⃣ 🔥 NÚMEROS VENDIDOS REALES (FUENTE ÚNICA)
            const { count: numerosVendidos } = await supabase
                .from("numeros_asignados")
                .select("id", { count: "exact", head: true })
                .eq("sorteo_id", sorteo.id)
                .eq("estado", "asignado");

            const vendidos = numerosVendidos ?? 0;

            // 4️⃣ 💰 RECAUDADO REAL (derivado de números)
            const recaudado = vendidos * Number(sorteo.precio_numero ?? 0);

            setStats({
                totalPedidos: pedidosNorm.length,
                pedidosPagados,
                pedidosPendientes,
                totalNumeros: vendidos,
                totalRecaudado: recaudado,
            });

            setLoading(false);
        }

        cargarDashboard();
    }, []);

    const ultimosPedidos = useMemo(() => pedidos.slice(0, 5), [pedidos]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center text-slate-400">
                Cargando panel administrativo…
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-[#050608] text-slate-50">
            <div className="mx-auto max-w-6xl px-4 py-10 space-y-8">
                <header>
                    <p className="text-xs tracking-[0.2em] text-orange-400 uppercase">
                        Casa Bikers · Admin
                    </p>
                    <h1 className="text-4xl font-extrabold">Panel administrativo</h1>
                </header>

                {/* KPIs */}
                <section className="grid md:grid-cols-3 gap-4">
                    <KPI title="Total de pedidos" value={stats?.totalPedidos} />
                    <KPI title="Números vendidos" value={stats?.totalNumeros} />
                    <KPI
                        title="Total recaudado"
                        value={`$${stats?.totalRecaudado.toFixed(2)}`}
                    />
                </section>

                <section className="grid md:grid-cols-2 gap-4">
                    <KPI title="Pedidos pagados" value={stats?.pedidosPagados} green />
                    <KPI
                        title="Pedidos pendientes"
                        value={stats?.pedidosPendientes}
                        yellow
                    />
                </section>

                {/* Últimos pedidos */}
                <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                    <div className="flex justify-between mb-2">
                        <h2 className="text-sm font-semibold">Últimos pedidos</h2>
                        <Link href="/admin/pedidos" className="text-xs text-orange-300">
                            Ver todos →
                        </Link>
                    </div>

                    {ultimosPedidos.length === 0 ? (
                        <p className="text-xs text-slate-400">Sin pedidos</p>
                    ) : (
                        <table className="w-full text-xs">
                            <thead className="text-slate-400">
                                <tr>
                                    <th>ID</th>
                                    <th>Cliente</th>
                                    <th>Total</th>
                                    <th>Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ultimosPedidos.map((p) => (
                                    <tr key={p.id}>
                                        <td>#{p.id}</td>
                                        <td>{p.cliente_nombre}</td>
                                        <td>${p.total.toFixed(2)}</td>
                                        <td>{p.estado}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </section>
            </div>
        </main>
    );
}

function KPI({
    title,
    value,
    green,
    yellow,
}: {
    title: string;
    value: any;
    green?: boolean;
    yellow?: boolean;
}) {
    return (
        <div
            className={`rounded-xl border px-4 py-3 ${green
                    ? "border-emerald-500/30 bg-emerald-500/10"
                    : yellow
                        ? "border-yellow-500/40 bg-yellow-500/10"
                        : "border-slate-800 bg-slate-900/70"
                }`}
        >
            <p className="text-xs text-slate-400">{title}</p>
            <p className="mt-2 text-2xl font-semibold">{value}</p>
        </div>
    );
}
