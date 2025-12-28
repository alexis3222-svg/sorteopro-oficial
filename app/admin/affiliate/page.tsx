// app/admin/affiliate/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Stats = {
    sociosActivos: number;
    saldoDisponibleTotal: number;
    saldoPendienteTotal: number;
    retirosPendientes: number;
};

export default function AdminAffiliateHomePage() {
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [stats, setStats] = useState<Stats>({
        sociosActivos: 0,
        saldoDisponibleTotal: 0,
        saldoPendienteTotal: 0,
        retirosPendientes: 0,
    });

    useEffect(() => {
        let alive = true;

        async function load() {
            setLoading(true);
            setErrorMsg(null);

            try {
                // 1) Socios activos
                const { count: sociosActivos, error: e1 } = await supabase
                    .from("affiliates")
                    .select("*", { count: "exact", head: true });

                if (e1) throw e1;

                // 2) Retiros pendientes
                const { count: retirosPendientes, error: e2 } = await supabase
                    .from("affiliate_withdrawals")
                    .select("*", { count: "exact", head: true })
                    .eq("status", "pending");

                if (e2) throw e2;

                // 3) Saldos totales (sumatorias)
                // Nota: Supabase JS no hace SUM directo sin RPC; lo hacemos trayendo columnas
                // y sumando en el cliente (v1). En v2 lo movemos a una vista/RPC opcional.
                const { data: wallets, error: e3 } = await supabase
                    .from("affiliate_wallets")
                    .select("balance_available, balance_pending");

                if (e3) throw e3;

                const saldoDisponibleTotal = (wallets || []).reduce(
                    (acc: number, w: any) => acc + (Number(w.balance_available ?? 0) || 0),
                    0
                );

                const saldoPendienteTotal = (wallets || []).reduce(
                    (acc: number, w: any) => acc + (Number(w.balance_pending ?? 0) || 0),
                    0
                );

                if (!alive) return;

                setStats({
                    sociosActivos: sociosActivos ?? 0,
                    saldoDisponibleTotal,
                    saldoPendienteTotal,
                    retirosPendientes: retirosPendientes ?? 0,
                });
            } catch (err: any) {
                console.error("AdminAffiliateHomePage load error:", err);
                if (!alive) return;
                setErrorMsg(err?.message || "No se pudo cargar el módulo ADMIN SOCIO.");
            } finally {
                if (!alive) return;
                setLoading(false);
            }
        }

        load();
        return () => {
            alive = false;
        };
    }, []);

    const warningRetiros = useMemo(() => stats.retirosPendientes > 0, [stats.retirosPendientes]);

    return (
        <main className="min-h-screen bg-[#050608] text-slate-50">
            <div className="mx-auto max-w-6xl px-4 py-8 md:py-12 space-y-8">
                <header className="space-y-3">
                    <div className="text-xs font-semibold tracking-[0.2em] text-orange-400 uppercase">
                        Casa Bikers • Admin
                    </div>
                    <h1 className="text-3xl md:text-4xl font-extrabold tracking-wide">ADMIN SOCIO</h1>
                    <p className="max-w-2xl text-sm text-slate-400">
                        Gestión de socios comerciales, comisiones y retiros. Revisa solicitudes pendientes y controla
                        los saldos de billeteras.
                    </p>
                </header>

                {errorMsg && (
                    <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                        {errorMsg}
                    </div>
                )}

                {loading ? (
                    <div className="flex items-center justify-center py-16 text-sm text-slate-400">
                        Cargando ADMIN SOCIO...
                    </div>
                ) : (
                    <>
                        {/* KPIs */}
                        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3">
                                <p className="text-xs text-slate-400">Socios registrados</p>
                                <p className="mt-2 text-2xl font-semibold">{stats.sociosActivos}</p>
                            </div>

                            <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3">
                                <p className="text-xs text-slate-400">Saldo disponible total</p>
                                <p className="mt-2 text-2xl font-semibold">${stats.saldoDisponibleTotal.toFixed(2)}</p>
                            </div>

                            <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3">
                                <p className="text-xs text-slate-400">Saldo pendiente total</p>
                                <p className="mt-2 text-2xl font-semibold">${stats.saldoPendienteTotal.toFixed(2)}</p>
                            </div>

                            <div
                                className={[
                                    "rounded-xl px-4 py-3 border",
                                    warningRetiros
                                        ? "border-yellow-500/50 bg-yellow-500/10"
                                        : "border-slate-800 bg-slate-900/70",
                                ].join(" ")}
                            >
                                <p className={warningRetiros ? "text-xs text-yellow-100" : "text-xs text-slate-400"}>
                                    Retiros pendientes
                                </p>
                                <p className="mt-2 text-2xl font-semibold">{stats.retirosPendientes}</p>
                                {warningRetiros && (
                                    <p className="mt-1 text-[11px] text-yellow-100/80">
                                        Hay solicitudes por revisar y pagar.
                                    </p>
                                )}
                            </div>
                        </section>

                        {/* Acciones */}
                        <section className="space-y-3">
                            <h2 className="text-sm font-semibold text-slate-200">Acciones</h2>

                            <div className="flex flex-wrap gap-3">
                                <Link
                                    href="/admin/affiliate/withdrawals"
                                    className="inline-flex items-center rounded-full bg-orange-500 px-4 py-2 text-xs font-semibold text-black hover:bg-orange-400"
                                >
                                    Ver retiros pendientes
                                </Link>

                                <Link
                                    href="/admin"
                                    className="inline-flex items-center rounded-full border border-slate-700 bg-transparent px-4 py-2 text-xs font-semibold text-slate-200 hover:border-orange-500 hover:text-orange-200"
                                >
                                    Volver al dashboard admin
                                </Link>

                                <Link
                                    href="/"
                                    className="inline-flex items-center rounded-full border border-slate-700 bg-transparent px-4 py-2 text-xs font-semibold text-slate-200 hover:border-orange-500 hover:text-orange-200"
                                >
                                    Volver al sitio público
                                </Link>
                            </div>

                            <p className="text-xs text-slate-400 max-w-3xl">
                                Nota: En esta v1 las sumatorias de saldos se calculan leyendo las billeteras y sumando en el
                                cliente. Si quieres, luego lo optimizamos con una vista o RPC para sumar en el servidor.
                            </p>
                        </section>
                    </>
                )}
            </div>
        </main>
    );
}
