"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Socio = {
    id: string;
    username: string | null;
    display_name: string | null;
    code: string | null;
    whatsapp: string | null;
    status: "active" | "suspended" | string;
    created_at: string;
};

type Filtro = "all" | "active" | "suspended";

// Convierte a formato wa.me (solo dígitos). Si empieza con 0 y no trae país, intenta Ecuador (593).
function normalizeWhatsAppToWaMe(input: string) {
    const digits = (input || "").replace(/\D/g, "");
    if (!digits) return "";

    // Si ya viene con 593..., ok
    if (digits.startsWith("593")) return digits;

    // Si viene como 09xxxxxxxx (Ecuador), convertir a 5939xxxxxxxx
    if (digits.length === 10 && digits.startsWith("0")) return `593${digits.slice(1)}`;

    // Si viene como 9xxxxxxxx (sin 0), asumir 593
    if (digits.length === 9 && digits.startsWith("9")) return `593${digits}`;

    // Caso genérico: devolver como esté
    return digits;
}

export default function AdminSociosPage() {
    const [socios, setSocios] = useState<Socio[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [filtro, setFiltro] = useState<Filtro>("all");

    // ✅ Siempre enviar x-admin-secret (si existe) + cookies
    const getAdminHeaders = () => ({
        "Content-Type": "application/json",
        "x-admin-secret": localStorage.getItem("admin_secret") || "",
    });

    const cargar = async () => {
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`/api/admin/affiliate/socios?status=${filtro}`, {
                method: "GET",
                credentials: "include",
                cache: "no-store",
                headers: getAdminHeaders(),
            });

            const json = await res.json();

            if (!res.ok || !json?.ok) {
                setError(json?.error || "No autorizado");
                setSocios([]);
                return;
            }

            setSocios(json.affiliates || []);
        } catch {
            setError("Error de conexión");
            setSocios([]);
        } finally {
            setLoading(false);
        }
    };

    const toggleEstado = async (socio: Socio) => {
        const nextStatus = socio.status === "active" ? "suspended" : "active";

        const nombre = socio.display_name || socio.username || "este socio";
        const accion = nextStatus === "suspended" ? "SUSPENDER" : "ACTIVAR";

        const ok = window.confirm(
            `¿Confirmas ${accion} a ${nombre}?\n\nEsto afectará comisiones y retiros desde ahora.`
        );
        if (!ok) return;

        setSavingId(socio.id);
        setError(null);

        try {
            const res = await fetch(`/api/admin/affiliate/socios/${socio.id}`, {
                method: "PATCH",
                credentials: "include",
                headers: getAdminHeaders(),
                body: JSON.stringify({ status: nextStatus }),
            });

            const json = await res.json();

            if (!res.ok || !json?.ok) {
                setError(json?.error || "No se pudo actualizar el estado");
                return;
            }

            await cargar();
        } catch {
            setError("Error de conexión");
        } finally {
            setSavingId(null);
        }
    };

    useEffect(() => {
        cargar();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filtro]);

    const total = socios.length;
    const activos = socios.filter((s) => s.status === "active").length;
    const suspendidos = socios.filter((s) => s.status === "suspended").length;

    return (
        <main className="min-h-screen bg-[#050608] text-slate-50">
            <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
                <header className="space-y-3">
                    <div className="text-xs font-semibold tracking-[0.2em] text-orange-400 uppercase">
                        Casa Bikers • Admin
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-wide">SOCIOS COMERCIALES</h1>
                    <p className="text-sm text-slate-400">
                        Lista de socios registrados. Aquí puedes activar o suspender socios sin tocar pedidos pasados.
                    </p>

                    <Link href="/admin/affiliate" className="text-xs text-orange-300 hover:text-orange-200 inline-block">
                        ← Volver a ADMIN SOCIO
                    </Link>
                </header>

                {/* KPIs */}
                <div className="flex flex-wrap gap-3">
                    <span className="rounded-full border border-slate-700 px-3 py-1 text-xs">Total: {total}</span>
                    <span className="rounded-full border border-emerald-500/40 px-3 py-1 text-xs text-emerald-300">
                        Activos: {activos}
                    </span>
                    <span className="rounded-full border border-red-500/40 px-3 py-1 text-xs text-red-300">
                        Suspendidos: {suspendidos}
                    </span>
                </div>

                {/* Error */}
                {error && (
                    <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                        {error}
                    </div>
                )}

                {/* Filtros */}
                <div className="flex flex-wrap gap-2">
                    {(["all", "active", "suspended"] as Filtro[]).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFiltro(f)}
                            className={`rounded-full px-3 py-1 text-xs font-semibold border ${filtro === f
                                    ? "border-orange-400 bg-orange-500 text-black"
                                    : "border-slate-700 text-slate-200 hover:border-orange-400"
                                }`}
                        >
                            {f === "all" ? "Todos" : f === "active" ? "Activos" : "Suspendidos"}
                        </button>
                    ))}

                    <button
                        onClick={cargar}
                        className="rounded-full px-3 py-1 text-xs font-semibold border border-slate-700 hover:border-orange-400"
                    >
                        Recargar
                    </button>
                </div>

                {/* Listado */}
                {loading ? (
                    <p className="text-sm text-slate-400">Cargando socios…</p>
                ) : socios.length === 0 ? (
                    <p className="text-sm text-slate-400">No hay socios para este filtro.</p>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
                        <table className="min-w-full text-sm">
                            <thead className="text-xs uppercase text-slate-400 border-b border-slate-800">
                                <tr>
                                    <th className="px-3 py-2 text-left">Usuario</th>
                                    <th className="px-3 py-2 text-left">Código</th>
                                    <th className="px-3 py-2 text-left">WhatsApp</th>
                                    <th className="px-3 py-2 text-left">Estado</th>
                                    <th className="px-3 py-2 text-left">Creado</th>
                                    <th className="px-3 py-2 text-left">Acciones</th>
                                </tr>
                            </thead>

                            <tbody>
                                {socios.map((s) => {
                                    const nombre = s.display_name || s.username || "—";
                                    const usuarioSec = s.username ? `@${s.username}` : null;

                                    const waDigits = s.whatsapp ? normalizeWhatsAppToWaMe(s.whatsapp) : "";
                                    const waHref = waDigits ? `https://wa.me/${waDigits}` : "";

                                    return (
                                        <tr key={s.id} className="border-b border-slate-800 last:border-0">
                                            <td className="px-3 py-2">
                                                <div className="font-medium">{nombre}</div>
                                                {usuarioSec && <div className="text-xs text-slate-400">{usuarioSec}</div>}
                                            </td>

                                            <td className="px-3 py-2 text-slate-300">{s.code || "—"}</td>

                                            <td className="px-3 py-2">
                                                {s.whatsapp ? (
                                                    <a
                                                        href={waHref}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-emerald-300 hover:text-emerald-200 underline underline-offset-4"
                                                        title="Abrir chat en WhatsApp"
                                                    >
                                                        {s.whatsapp}
                                                    </a>
                                                ) : (
                                                    <span className="text-slate-500">—</span>
                                                )}
                                            </td>

                                            <td className="px-3 py-2">
                                                <span
                                                    className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.status === "active"
                                                            ? "bg-emerald-500/15 text-emerald-300"
                                                            : "bg-red-500/15 text-red-300"
                                                        }`}
                                                >
                                                    {s.status === "active" ? "ACTIVO" : "SUSPENDIDO"}
                                                </span>
                                            </td>

                                            <td className="px-3 py-2 text-xs text-slate-400">
                                                {new Date(s.created_at).toLocaleString("es-EC")}
                                            </td>

                                            <td className="px-3 py-2">
                                                <button
                                                    disabled={savingId === s.id}
                                                    onClick={() => toggleEstado(s)}
                                                    className={`rounded-full px-3 py-1 text-[11px] font-semibold border transition disabled:opacity-60 disabled:cursor-not-allowed ${s.status === "active"
                                                            ? "border-red-500/40 text-red-300 hover:bg-red-500/10"
                                                            : "border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10"
                                                        }`}
                                                >
                                                    {savingId === s.id ? "Guardando…" : s.status === "active" ? "Suspender" : "Activar"}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </main>
    );
}
