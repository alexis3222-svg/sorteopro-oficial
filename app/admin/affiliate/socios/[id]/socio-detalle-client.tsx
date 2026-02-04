"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Socio = {
    id: string;
    username: string;
    display_name: string | null;
    code: string | null;
    whatsapp: string | null;
    is_active: boolean;
    created_at: string;
};

type Pedido = {
    id: number;
    created_at: string;
    aprobado_modo: string | null;
    aprobado_at: string | null;
    total: number | null;
    affiliate_code: string | null;
};

export default function SocioDetalleClient() {
    const params = useParams();
    const socioId = (params?.id as string) || "";

    const [loading, setLoading] = useState(true);
    const [socio, setSocio] = useState<Socio | null>(null);
    const [pedidos, setPedidos] = useState<Pedido[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!socioId) return;

        (async () => {
            setLoading(true);
            setError(null);

            const res = await fetch(`/api/admin/affiliate/socios/${socioId}`, {
                cache: "no-store",
            });

            if (!res.ok) {
                const j = await res.json().catch(() => ({}));
                setError(j?.error || `Error ${res.status}`);
                setLoading(false);
                return;
            }

            const data = await res.json();
            setSocio(data.socio);
            setPedidos(data.pedidos || []);
            setLoading(false);
        })();
    }, [socioId]);

    const totalVentas = pedidos.length;
    const totalVendido = useMemo(
        () => pedidos.reduce((acc, p) => acc + (p.total ?? 0), 0),
        [pedidos]
    );
    const comision = totalVendido * 0.1;

    if (!socioId) {
        return (
            <main className="min-h-screen bg-black text-slate-200 p-6">
                <p className="text-red-300 font-semibold">ID inválido</p>
                <pre className="mt-3 text-xs text-slate-400">{JSON.stringify(params, null, 2)}</pre>
                <Link className="text-orange-400 underline" href="/admin/affiliate/socios">
                    ← Volver
                </Link>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-black text-slate-200">
            <div className="mx-auto max-w-6xl px-4 py-6">
                <div className="mb-4 flex items-center justify-between">
                    <div>
                        <p className="text-xs text-orange-400 tracking-widest">BARUK593 • ADMIN</p>
                        <h1 className="text-3xl font-extrabold">Ventas del socio</h1>
                    </div>
                    <Link
                        href="/admin/affiliate/socios"
                        className="rounded-full border border-slate-700 px-3 py-2 text-sm hover:border-orange-400"
                    >
                        ← Volver
                    </Link>
                </div>

                {loading ? (
                    <p className="text-sm text-slate-400">Cargando…</p>
                ) : error ? (
                    <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
                        <p className="text-red-200 font-semibold">Error</p>
                        <p className="text-sm text-red-200/80">{error}</p>
                    </div>
                ) : !socio ? (
                    <p className="text-sm text-slate-400">No se encontró el socio.</p>
                ) : (
                    <>
                        {/* Card socio */}
                        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
                            <div className="flex flex-wrap items-start justify-between gap-4">
                                <div>
                                    <p className="text-sm text-slate-400">Socio</p>
                                    <p className="text-xl font-semibold">{socio.display_name ?? socio.username}</p>
                                    <p className="mt-1 text-sm text-slate-400">@{socio.username}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-slate-400">Código</p>
                                    <p className="text-lg font-semibold">{socio.code ?? "—"}</p>
                                    <p className="mt-1 text-sm text-slate-400">WhatsApp: {socio.whatsapp ?? "—"}</p>
                                    <span
                                        className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs ${socio.is_active
                                                ? "bg-emerald-500/15 text-emerald-300"
                                                : "bg-red-500/15 text-red-300"
                                            }`}
                                    >
                                        {socio.is_active ? "ACTIVO" : "SUSPENDIDO"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="mt-4 grid gap-3 sm:grid-cols-3">
                            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
                                <p className="text-xs text-slate-400">Ventas</p>
                                <p className="mt-1 text-2xl font-bold">{totalVentas}</p>
                            </div>
                            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
                                <p className="text-xs text-slate-400">Total vendido</p>
                                <p className="mt-1 text-2xl font-bold">${totalVendido.toFixed(2)}</p>
                            </div>
                            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
                                <p className="text-xs text-slate-400">Comisión (10%)</p>
                                <p className="mt-1 text-2xl font-bold">${comision.toFixed(2)}</p>
                            </div>
                        </div>

                        {/* Tabla pedidos */}
                        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60">
                            <table className="min-w-full text-sm">
                                <thead className="text-xs uppercase text-slate-400 border-b border-slate-800">
                                    <tr>
                                        <th className="px-3 py-2 text-left">Pedido</th>
                                        <th className="px-3 py-2 text-left">Fecha</th>
                                        <th className="px-3 py-2 text-left">Modo</th>
                                        <th className="px-3 py-2 text-left">Total</th>
                                        <th className="px-3 py-2 text-left">Ref</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pedidos.map((p) => (
                                        <tr key={p.id} className="border-b border-slate-800 last:border-0">
                                            <td className="px-3 py-2 font-medium">#{p.id}</td>
                                            <td className="px-3 py-2 text-xs text-slate-400">
                                                {new Date(p.created_at).toLocaleString("es-EC")}
                                            </td>
                                            <td className="px-3 py-2">{p.aprobado_modo ?? "—"}</td>
                                            <td className="px-3 py-2">${(p.total ?? 0).toFixed(2)}</td>
                                            <td className="px-3 py-2">{p.affiliate_code ?? "—"}</td>
                                        </tr>
                                    ))}
                                    {pedidos.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-3 py-6 text-center text-slate-400">
                                                Este socio aún no registra ventas.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </main>
    );
}