"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

type WithdrawalRow = {
    id: string;
    affiliate_id: string;
    amount: number;
    destination: string | null;
    status: string;
    created_at: string;
};

export default function AdminAffiliateWithdrawalsPage() {
    const [rows, setRows] = useState<WithdrawalRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [processingId, setProcessingId] = useState<string | null>(null);

    async function load() {
        setLoading(true);
        setErrorMsg(null);

        const { data, error } = await supabase
            .from("affiliate_withdrawals")
            .select("*")
            .eq("status", "pending")
            .order("created_at", { ascending: true });

        if (error) {
            console.error(error);
            setErrorMsg("No se pudieron cargar los retiros.");
        } else {
            setRows((data as any) || []);
        }

        setLoading(false);
    }

    useEffect(() => {
        load();
    }, []);

    async function marcarPagado(id: string) {
        if (!confirm("¿Confirmas que este retiro YA fue pagado?")) return;

        setProcessingId(id);

        const res = await fetch(`/api/admin/withdrawals/${id}/pay`, {
            method: "POST",
        });

        if (!res.ok) {
            alert("Error al marcar como pagado");
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
            alert("Error al rechazar el retiro");
        } else {
            await load();
        }

        setProcessingId(null);
    }

    return (
        <main className="min-h-screen bg-[#050608] text-slate-50">
            <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
                <header className="space-y-2">
                    <h1 className="text-2xl font-bold">Retiros pendientes</h1>
                    <p className="text-sm text-slate-400">
                        Solicitudes de retiro de socios comerciales.
                    </p>
                </header>

                <div className="flex gap-3">
                    <Link
                        href="/admin/affiliate"
                        className="text-xs text-orange-300 hover:text-orange-200"
                    >
                        ← Volver a ADMIN SOCIO
                    </Link>
                </div>

                {errorMsg && (
                    <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                        {errorMsg}
                    </div>
                )}

                {loading ? (
                    <p className="text-sm text-slate-400">Cargando retiros…</p>
                ) : rows.length === 0 ? (
                    <p className="text-sm text-slate-400">
                        No hay retiros pendientes 🎉
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="text-xs uppercase text-slate-400 border-b border-slate-800">
                                <tr>
                                    <th className="py-2 pr-3 text-left">Fecha</th>
                                    <th className="py-2 pr-3 text-left">Monto</th>
                                    <th className="py-2 pr-3 text-left">Destino</th>
                                    <th className="py-2 pr-3 text-left">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((r) => (
                                    <tr
                                        key={r.id}
                                        className="border-b border-slate-800 last:border-0"
                                    >
                                        <td className="py-2 pr-3">
                                            {new Date(r.created_at).toLocaleString("es-EC")}
                                        </td>
                                        <td className="py-2 pr-3 font-semibold">
                                            ${Number(r.amount).toFixed(2)}
                                        </td>
                                        <td className="py-2 pr-3 text-xs text-slate-300">
                                            {r.destination || "—"}
                                        </td>
                                        <td className="py-2 pr-3 flex gap-2">
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
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </main>
    );
}
