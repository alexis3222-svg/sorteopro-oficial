// app/admin/affiliate/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

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

    // ✅ Toggle registro socios
    const [regOpen, setRegOpen] = useState<boolean | null>(null);
    const [regSaving, setRegSaving] = useState(false);
    const [regErr, setRegErr] = useState<string | null>(null);

    const loadReg = async () => {
        setRegErr(null);
        try {
            const r = await fetch("/api/admin/settings/affiliate-registration", {
                method: "GET",
                credentials: "include",
                cache: "no-store",
            });
            const j = await r.json().catch(() => null);
            if (!r.ok || !j?.ok) throw new Error(j?.error || "No autorizado");
            setRegOpen(Boolean(j.open));
        } catch (e: any) {
            setRegErr(e?.message || "Error cargando setting");
            setRegOpen(null);
        }
    };

    const toggleReg = async () => {
        if (regOpen === null) return;

        const next = !regOpen;
        const ok = window.confirm(
            next
                ? "¿ABRIR registro de nuevos socios?"
                : "¿CERRAR registro de nuevos socios?\n\nSocios existentes seguirán funcionando normal."
        );
        if (!ok) return;

        setRegSaving(true);
        setRegErr(null);

        try {
            const r = await fetch("/api/admin/settings/affiliate-registration", {
                method: "PATCH",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ open: next }),
            });

            const j = await r.json().catch(() => null);
            if (!r.ok || !j?.ok) throw new Error(j?.error || "No se pudo guardar");

            setRegOpen(Boolean(j.open));
        } catch (e: any) {
            setRegErr(e?.message || "Error guardando setting");
        } finally {
            setRegSaving(false);
        }
    };

    useEffect(() => {
        let alive = true;

        async function load() {
            setLoading(true);
            setErrorMsg(null);

            try {
                const r = await fetch("/api/admin/affiliate/stats", {
                    cache: "no-store",
                    credentials: "include",
                });
                const j = await r.json().catch(() => null);

                if (!r.ok || !j?.ok || !j?.stats) {
                    throw new Error(j?.error || "No se pudieron cargar las estadísticas.");
                }

                if (!alive) return;

                setStats({
                    sociosActivos: Number(j.stats.sociosActivos ?? 0),
                    saldoDisponibleTotal: Number(j.stats.saldoDisponibleTotal ?? 0),
                    saldoPendienteTotal: Number(j.stats.saldoPendienteTotal ?? 0),
                    retirosPendientes: Number(j.stats.retirosPendientes ?? 0),
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
        loadReg(); // ✅ cargar estado del registro

        return () => {
            alive = false;
        };
    }, []);

    const warningRetiros = useMemo(
        () => stats.retirosPendientes > 0,
        [stats.retirosPendientes]
    );

    return (
        <main className="min-h-screen bg-[#050608] text-slate-50">
            <div className="mx-auto max-w-6xl px-4 py-8 md:py-12 space-y-8">
                <header className="space-y-3">
                    <div className="text-xs font-semibold tracking-[0.2em] text-orange-400 uppercase">
                        Casa Bikers • Admin
                    </div>
                    <h1 className="text-3xl md:text-4xl font-extrabold tracking-wide">
                        ADMIN SOCIO
                    </h1>
                    <p className="max-w-2xl text-sm text-slate-400">
                        Gestión de socios comerciales, comisiones y retiros. Revisa solicitudes
                        pendientes y controla los saldos de billeteras.
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
                        {/* ✅ Control de registro de nuevos socios */}
                        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <div className="text-xs font-semibold tracking-[0.18em] uppercase text-orange-400">
                                        Registro de nuevos socios
                                    </div>

                                    <div className="mt-1 text-sm text-slate-300">
                                        {regOpen === null
                                            ? "Cargando estado…"
                                            : regOpen
                                                ? "Estado: ABIERTO (se permite registro)"
                                                : "Estado: CERRADO (bloquea nuevos registros)"}
                                    </div>

                                    {regErr && (
                                        <div className="mt-2 text-xs text-red-300">{regErr}</div>
                                    )}
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={loadReg}
                                        className="rounded-full px-3 py-1 text-xs font-semibold border border-slate-700 hover:border-orange-400"
                                    >
                                        Recargar
                                    </button>

                                    <button
                                        disabled={regOpen === null || regSaving}
                                        onClick={toggleReg}
                                        className={[
                                            "rounded-full px-4 py-2 text-xs font-extrabold tracking-wide border transition",
                                            "disabled:opacity-60 disabled:cursor-not-allowed",
                                            regOpen
                                                ? "border-red-500/40 text-red-200 hover:bg-red-500/10"
                                                : "border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/10",
                                        ].join(" ")}
                                    >
                                        {regSaving
                                            ? "Guardando…"
                                            : regOpen
                                                ? "Cerrar registro"
                                                : "Abrir registro"}
                                    </button>
                                </div>
                            </div>

                            <p className="mt-3 text-xs text-slate-400">
                                Importante: esto solo afecta <b>crear nuevos socios</b>. Socios
                                existentes siguen normal.
                            </p>
                        </section>

                        {/* KPIs */}
                        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3">
                                <p className="text-xs text-slate-400">Socios registrados</p>
                                <p className="mt-2 text-2xl font-semibold">
                                    {stats.sociosActivos}
                                </p>
                            </div>

                            <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3">
                                <p className="text-xs text-slate-400">Saldo disponible total</p>
                                <p className="mt-2 text-2xl font-semibold">
                                    ${stats.saldoDisponibleTotal.toFixed(2)}
                                </p>
                            </div>

                            <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3">
                                <p className="text-xs text-slate-400">Saldo pendiente total</p>
                                <p className="mt-2 text-2xl font-semibold">
                                    ${stats.saldoPendienteTotal.toFixed(2)}
                                </p>
                            </div>

                            <div
                                className={[
                                    "rounded-xl px-4 py-3 border",
                                    warningRetiros
                                        ? "border-yellow-500/50 bg-yellow-500/10"
                                        : "border-slate-800 bg-slate-900/70",
                                ].join(" ")}
                            >
                                <p
                                    className={
                                        warningRetiros ? "text-xs text-yellow-100" : "text-xs text-slate-400"
                                    }
                                >
                                    Retiros pendientes
                                </p>
                                <p className="mt-2 text-2xl font-semibold">
                                    {stats.retirosPendientes}
                                </p>
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
                                    href="/admin/affiliate/withdrawals?status=paid"
                                    className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-100 hover:border-orange-500 hover:text-orange-200"
                                >
                                    Ver retiros pagados
                                </Link>

                                <Link
                                    href="/admin/affiliate/socios"
                                    className="rounded-full border border-orange-500 bg-orange-500/10 px-4 py-2 text-xs font-semibold text-orange-300 hover:bg-orange-500 hover:text-black transition"
                                >
                                    Ver socios comerciales
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
                                Nota: Las sumatorias se calculan en el servidor (service role) para
                                garantizar datos reales y evitar problemas de permisos del cliente.
                            </p>
                        </section>
                    </>
                )}
            </div>
        </main>
    );
}
