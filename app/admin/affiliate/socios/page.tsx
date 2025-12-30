// app/admin/affiliate/socios/page.tsx
"use client";
export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type StatusFilter = "all" | "active" | "suspended";

type SocioRow = {
    id: string;
    username: string | null;
    display_name: string | null;
    code: string | null;
    status: "active" | "suspended" | string | null;
    created_at: string | null;
};

// 🔐 HEADER ADMIN (mismo patrón que ya usas en /admin/pedidos)
const ADMIN_HEADERS = {
    "Content-Type": "application/json",
    "x-admin-secret": process.env.NEXT_PUBLIC_ADMIN_SECRET!,
};

function normStatus(v: any): "active" | "suspended" | "unknown" {
    const s = String(v ?? "").trim().toLowerCase();
    if (s === "active") return "active";
    if (s === "suspended") return "suspended";
    return "unknown";
}

export default function AdminSociosPage() {
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [rows, setRows] = useState<SocioRow[]>([]);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const [filter, setFilter] = useState<StatusFilter>("all");

    async function load() {
        setLoading(true);
        setErrorMsg(null);

        try {
            // ⚠️ Este endpoint lo creamos en el PASO 4 (parte 2).
            // Por ahora solo dejamos el fetch listo.
            const res = await fetch("/api/admin/affiliate/socios", {
                method: "GET",
                headers: ADMIN_HEADERS,
                cache: "no-store",
            });

            const j = await res.json().catch(() => null);

            if (!res.ok || !j?.ok) {
                setRows([]);
                setErrorMsg(j?.error || "No se pudieron cargar los socios.");
                return;
            }

            setRows(Array.isArray(j?.socios) ? (j.socios as SocioRow[]) : []);
        } catch (e: any) {
            setRows([]);
            setErrorMsg(e?.message || "Error de conexión cargando socios.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const filtered = useMemo(() => {
        if (filter === "all") return rows;
        return rows.filter((r) => normStatus(r.status) === filter);
    }, [rows, filter]);

    const stats = useMemo(() => {
        const total = rows.length;
        const active = rows.filter((r) => normStatus(r.status) === "active").length;
        const suspended = rows.filter((r) => normStatus(r.status) === "suspended").length;
        return { total, active, suspended };
    }, [rows]);

    async function setStatus(id: string, next: "active" | "suspended") {
        const ok = confirm(
            next === "suspended"
                ? "¿Seguro que deseas SUSPENDER este socio? (no ganará comisión ni podrá retirar)"
                : "¿Seguro que deseas ACTIVAR este socio?"
        );
        if (!ok) return;

        setProcessingId(id);

        try {
            // ⚠️ Este endpoint lo creamos en el PASO 4 (parte 2).
            const res = await fetch("/api/admin/affiliate/socios/status", {
                method: "POST",
                headers: ADMIN_HEADERS,
                cache: "no-store",
                body: JSON.stringify({ affiliateId: id, status: next }),
            });

            const j = await res.json().catch(() => null);

            if (!res.ok || !j?.ok) {
                alert(j?.error || "No se pudo actualizar el estado.");
                return;
            }

            // update local
            setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: next } : r)));
        } catch {
            alert("Error de conexión actualizando el estado.");
        } finally {
            setProcessingId(null);
        }
    }

    return (
        <main className="min-h-screen bg-[#050608] text-slate-50">
            <div className="mx-auto max-w-6xl px-4 py-8 md:py-12 space-y-8">
                <header className="space-y-3">
                    <div className="text-xs font-semibold tracking-[0.2em] text-orange-400 uppercase">
                        Casa Bikers • Admin
                    </div>
                    <h1 className="text-3xl md:text-4xl font-extrabold tracking-wide">SOCIOS COMERCIALES</h1>
                    <p className="max-w-2xl text-sm text-slate-400">
                        Lista de socios registrados. Aquí puedes <b>activar</b> o <b>suspender</b> socios sin tocar pedidos pasados.
                    </p>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                        <Link href="/admin/affiliate" className="text-xs text-orange-300 hover:text-orange-200">
                            ← Volver a ADMIN SOCIO
                        </Link>

                        <div className="flex flex-wrap gap-2">
                            <span className="inline-flex items-center rounded-full border border-slate-800 bg-slate-900/70 px-3 py-1 text-xs text-slate-200">
                                Total: <b className="ml-1">{stats.total}</b>
                            </span>
                            <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
                                Activos: <b className="ml-1">{stats.active}</b>
                            </span>
                            <span className="inline-flex items-center rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs text-red-200">
                                Suspendidos: <b className="ml-1">{stats.suspended}</b>
                            </span>
                        </div>
                    </div>
                </header>

                {errorMsg && (
                    <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                        {errorMsg}
                    </div>
                )}

                <section className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <h2 className="text-sm font-semibold text-slate-200">Listado</h2>

                        <div className="flex flex-wrap gap-2">
                            {(["all", "active", "suspended"] as StatusFilter[]).map((f) => {
                                const active = filter === f;
                                const label = f === "all" ? "Todos" : f === "active" ? "Activos" : "Suspendidos";
                                return (
                                    <button
                                        key={f}
                                        type="button"
                                        onClick={() => setFilter(f)}
                                        className={[
                                            "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border transition",
                                            active
                                                ? "border-orange-400/70 bg-orange-500/90 text-black"
                                                : "border-slate-700 bg-slate-900 text-slate-100 hover:border-orange-500 hover:text-orange-200",
                                        ].join(" ")}
                                    >
                                        {label}
                                    </button>
                                );
                            })}

                            <button
                                type="button"
                                onClick={load}
                                className="inline-flex items-center rounded-full border border-slate-700 bg-transparent px-3 py-1 text-xs font-semibold text-slate-200 hover:border-orange-500 hover:text-orange-200"
                            >
                                Recargar
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <p className="text-sm text-slate-400">Cargando socios…</p>
                    ) : filtered.length === 0 ? (
                        <p className="text-sm text-slate-400">No hay socios para este filtro.</p>
                    ) : (
                        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
                            <table className="min-w-full text-sm">
                                <thead className="text-xs uppercase text-slate-400 border-b border-slate-800">
                                    <tr>
                                        <th className="py-3 px-3 text-left">Usuario</th>
                                        <th className="py-3 px-3 text-left">Nombre</th>
                                        <th className="py-3 px-3 text-left">Código</th>
                                        <th className="py-3 px-3 text-left">Estado</th>
                                        <th className="py-3 px-3 text-left">Creado</th>
                                        <th className="py-3 px-3 text-left">Acciones</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {filtered.map((r) => {
                                        const st = normStatus(r.status);

                                        const badge =
                                            st === "active"
                                                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/40"
                                                : st === "suspended"
                                                    ? "bg-red-500/10 text-red-300 border border-red-500/40"
                                                    : "bg-slate-700/40 text-slate-200 border border-slate-600";

                                        return (
                                            <tr key={r.id} className="border-b border-slate-800 last:border-0">
                                                <td className="py-3 px-3 text-slate-200">{r.username || "—"}</td>
                                                <td className="py-3 px-3 text-slate-300">{r.display_name || "—"}</td>
                                                <td className="py-3 px-3 text-slate-300">{r.code || "—"}</td>
                                                <td className="py-3 px-3">
                                                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge}`}>
                                                        {st === "active" ? "ACTIVO" : st === "suspended" ? "SUSPENDIDO" : String(r.status || "—")}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-3 text-xs text-slate-400">
                                                    {r.created_at ? new Date(r.created_at).toLocaleString("es-EC") : "—"}
                                                </td>
                                                <td className="py-3 px-3">
                                                    <div className="flex flex-wrap gap-2">
                                                        {st !== "active" ? (
                                                            <button
                                                                disabled={processingId === r.id}
                                                                onClick={() => setStatus(r.id, "active")}
                                                                className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-black hover:bg-emerald-400 disabled:opacity-50"
                                                            >
                                                                Activar
                                                            </button>
                                                        ) : (
                                                            <button
                                                                disabled={processingId === r.id}
                                                                onClick={() => setStatus(r.id, "suspended")}
                                                                className="rounded-full border border-red-500/40 px-3 py-1 text-xs font-semibold text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                                                            >
                                                                Suspender
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}
