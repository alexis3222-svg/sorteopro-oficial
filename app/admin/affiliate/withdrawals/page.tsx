"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type StatusFilter = "pending" | "paid" | "rejected" | "all";

type WithdrawalRow = {
    id: string;
    affiliate_id: string;
    amount: number;
    destination: string | null;
    status: string;
    created_at: string;
    paid_at: string | null;
    reference: string | null;
    review_note: string | null;
    reviewed_at: string | null;
};

function normalizeStatus(v: any): string {
    return String(v ?? "").trim().toLowerCase();
}

export default function AdminAffiliateWithdrawalsPage() {
    const searchParams = useSearchParams();
    const statusParam = (searchParams.get("status") || "pending").toLowerCase();

    const status: StatusFilter = useMemo(() => {
        if (statusParam === "paid") return "paid";
        if (statusParam === "rejected") return "rejected";
        if (statusParam === "all") return "all";
        return "pending";
    }, [statusParam]);

    const [rows, setRows] = useState<WithdrawalRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [processingId, setProcessingId] = useState<string | null>(null);

    async function load() {
        setLoading(true);
        setErrorMsg(null);

        let q = supabase
            .from("affiliate_withdrawals")
            .select(
                "id, affiliate_id, amount, destination, status, created_at, paid_at, reference, review_note, reviewed_at"
            )
            .order("created_at", { ascending: false });

        if (status !== "all") {
            q = q.eq("status", status);
        }

        const { data, error } = await q;

        if (error) {
            console.error(error);
            setErrorMsg("No se pudieron cargar los retiros.");
            setRows([]);
        } else {
            setRows((data as any) || []);
        }

        setLoading(false);
    }

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status]);

    async function marcarPagado(id: string) {
        if (!confirm("¿Confirmas que este retiro YA fue pagado?")) return;

        setProcessingId(id);

        const res = await fetch(`/api/admin/withdrawals/${id}/pay`, {
            method: "POST",
        });

        if (!res.ok) {
            const txt = await res.text().catch(() => "");
            alert(txt || "Error al marcar como pagado");
        } else {
            await load();
        }

        setProcessingId(null);
    }

    async function rechazar(id: string) {
        const motivo = prompt("Motivo del rechazo:");
        if (!motivo) return;

        setProcessingId(id);

        const res = await fetch(`/api/admin/withdrawals/${id}/reject`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ motivo }),
        });

        if (!res.ok) {
            const txt = await res.text().catch(() => "");
            alert(txt || "Error al rechazar el retiro");
        } else {
            await load();
        }

        setProcessingId(null);
    }

    const title = useMemo(() => {
        if (status === "paid") return "Retiros pagados";
        if (status === "rejected") return "Retiros rechazados";
        if (status === "all") return "Historial de retiros";
        return "Retiros pendientes";
    }, [status]);

    return (
        <main className="min-h-screen bg-[#050608] text-slate-50">
            <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
                <header className="space-y-2">
                    <div className="text-xs font-semibold tracking-[0.2em] text-orange-400 uppercase">
                        Casa Bikers • Admin
                    </div>
                    <h1 className="text-2xl font-bold">{title}</h1>
                    <p className="text-sm text-slate-400">
                        Gestiona solicitudes de retiro de socios comerciales.
                    </p>
                </header>

                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <Link href="/admin/affiliate" className="text-xs text-orange-300 hover:text-orange-200">
                            ← Volver a ADMIN SOCIO
                        </Link>
                    </div>

                    {/* Tabs/Filtros */}
                    <div className="flex flex-wrap gap-2">
                        <Link
                            href="/admin/affiliate/withdrawals?status=pending"
                            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border ${status === "pending"
                                    ? "border-orange-400/70 bg-orange-500/90 text-black"
                                    : "border-slate-700 bg-slate-900 text-slate-100 hover:border-orange-500 hover:text-orange-200"
                                }`}
                        >
                            Pendientes
                        </Link>
                        <Link
                            href="/admin/affiliate/withdrawals?status=paid"
                            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border ${status === "paid"
                                    ? "border-orange-400/70 bg-orange-500/90 text-black"
                                    : "border-slate-700 bg-slate-900 text-slate-100 hover:border-orange-500 hover:text-orange-200"
                                }`}
                        >
                            Pagados
                        </Link>
                        <Link
                            href="/admin/affiliate/withdrawals?status=rejected"
                            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border ${status === "rejected"
                                    ? "border-orange-400/70 bg-orange-500/90 text-black"
                                    : "border-slate-700 bg-slate-900 text-slate-100 hover:border-orange-500 hover:text-orange-200"
                                }`}
                        >
                            Rechazados
                        </Link>
                        <Link
                            href="/admin/affiliate/withdrawals?status=all"
                            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border ${status === "all"
                                    ? "border-orange-400/70 bg-orange-500/90 text-black"
                                    : "border-slate-700 bg-slate-900 text-slate-100 hover:border-orange-500 hover:text-orange-200"
                                }`}
                        >
                            Todo
                        </Link>
                    </div>
                </div>

                {errorMsg && (
                    <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                        {errorMsg}
                    </div>
                )}

                {loading ? (
                    <p className="text-sm text-slate-400">Cargando retiros…</p>
                ) : rows.length === 0 ? (
                    <p className="text-sm text-slate-400">No hay registros para este filtro.</p>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
                        <table className="min-w-full text-sm">
                            <thead className="text-xs uppercase text-slate-400 border-b border-slate-800">
                                <tr>
                                    <th className="py-3 px-3 text-left">Fecha</th>
                                    <th className="py-3 px-3 text-left">Monto</th>
                                    <th className="py-3 px-3 text-left">Destino</th>
                                    <th className="py-3 px-3 text-left">Estado</th>
                                    <th className="py-3 px-3 text-left">Referencia / Nota</th>
                                    <th className="py-3 px-3 text-left">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((r) => {
                                    const e = normalizeStatus(r.status);
                                    const badge =
                                        e === "paid"
                                            ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/40"
                                            : e === "pending"
                                                ? "bg-yellow-500/10 text-yellow-300 border border-yellow-500/40"
                                                : "bg-red-500/10 text-red-300 border border-red-500/40";

                                    const refOrNote =
                                        r.reference ||
                                        r.review_note ||
                                        (r.paid_at ? `Pagado: ${new Date(r.paid_at).toLocaleString("es-EC")}` : "—");

                                    return (
                                        <tr key={r.id} className="border-b border-slate-800 last:border-0">
                                            <td className="py-3 px-3 text-slate-200">
                                                {new Date(r.created_at).toLocaleString("es-EC")}
                                            </td>
                                            <td className="py-3 px-3 font-semibold">${Number(r.amount).toFixed(2)}</td>
                                            <td className="py-3 px-3 text-xs text-slate-300">
                                                {r.destination || "—"}
                                            </td>
                                            <td className="py-3 px-3">
                                                <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge}`}>
                                                    {e}
                                                </span>
                                            </td>
                                            <td className="py-3 px-3 text-xs text-slate-300">{refOrNote}</td>
                                            <td className="py-3 px-3">
                                                {e === "pending" ? (
                                                    <div className="flex flex-wrap gap-2">
                                                        <button
                                                            disabled={processingId === r.id}
                                                            onClick={() => marcarPagado(r.id)}
                                                            className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-black hover:bg-emerald-400 disabled:opacity-50"
                                                        >
                                                            Marcar pagado
                                                        </button>

                                                        <button
                                                            disabled={processingId === r.id}
                                                            onClick={() => rechazar(r.id)}
                                                            className="rounded-full border border-red-500/40 px-3 py-1 text-xs font-semibold text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                                                        >
                                                            Rechazar
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-500">—</span>
                                                )}
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
