"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";

type Status = "pending" | "paid" | "rejected" | "all";

type AffiliateInfo = {
    id: string;
    username: string | null;
    display_name: string | null;
    code: string | null;
    whatsapp: string | null;
};

type WithdrawalRow = {
    id: string;
    affiliate_id: string;
    amount: number;
    status: string;
    destination: string | null;
    notes: string | null;
    created_at: string;
    affiliate?: AffiliateInfo | null; // 👈 viene anidado desde el API
};

// wa.me (solo dígitos). Si empieza con 0 y no trae país, Ecuador (593).
function normalizeWhatsAppToWaMe(input: string) {
    const digits = (input || "").replace(/\D/g, "");
    if (!digits) return "";
    if (digits.startsWith("593")) return digits;
    if (digits.length === 10 && digits.startsWith("0")) return `593${digits.slice(1)}`;
    if (digits.length === 9 && digits.startsWith("9")) return `593${digits}`;
    return digits;
}

export default function WithdrawalsClient() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const statusParam = (searchParams.get("status") || "pending").toLowerCase() as Status;
    const status: Status = ["pending", "paid", "rejected", "all"].includes(statusParam)
        ? statusParam
        : "pending";

    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState<WithdrawalRow[]>([]);
    const [error, setError] = useState<string | null>(null);

    const cargar = async () => {
        setLoading(true);
        setError(null);

        try {
            // ✅ OJO: este endpoint es /api/admin/withdrawals (NO /api/admin/affiliate/withdrawals)
            const r = await fetch(`/api/admin/withdrawals?status=${status}`, {
                method: "GET",
                credentials: "include",
                cache: "no-store",
            });

            const j = await r.json().catch(() => null);
            if (!r.ok || !j?.ok) throw new Error(j?.error || "No autorizado");

            setRows(Array.isArray(j.withdrawals) ? j.withdrawals : []);
        } catch (e: any) {
            setRows([]);
            setError(e?.message || "Error cargando retiros");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargar();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status]);

    const titulo = useMemo(() => {
        if (status === "paid") return "Retiros pagados";
        if (status === "rejected") return "Retiros rechazados";
        if (status === "all") return "Todos los retiros";
        return "Retiros pendientes";
    }, [status]);

    const setFilter = (s: Status) => {
        const url = new URL(window.location.href);
        if (s === "pending") url.searchParams.delete("status");
        else url.searchParams.set("status", s);
        router.push(url.pathname + url.search);
    };

    return (
        <div className="mx-auto max-w-6xl px-4 py-8 md:py-12 space-y-6">
            <header className="space-y-2">
                <div className="text-xs font-semibold tracking-[0.2em] text-orange-400 uppercase">
                    Casa Bikers • Admin
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-extrabold tracking-wide">{titulo}</h1>
                        <p className="text-sm text-slate-400">
                            Gestiona solicitudes de retiro de socios comerciales.
                        </p>

                        <Link
                            href="/admin/affiliate"
                            className="mt-2 inline-block text-xs text-orange-300 hover:text-orange-200"
                        >
                            ← Volver a ADMIN SOCIO
                        </Link>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setFilter("pending")}
                            className={`rounded-full px-3 py-1 text-xs font-semibold border ${status === "pending"
                                ? "border-orange-400 bg-orange-500 text-black"
                                : "border-slate-700 text-slate-200 hover:border-orange-400"
                                }`}
                        >
                            Pendientes
                        </button>

                        <button
                            onClick={() => setFilter("paid")}
                            className={`rounded-full px-3 py-1 text-xs font-semibold border ${status === "paid"
                                ? "border-orange-400 bg-orange-500 text-black"
                                : "border-slate-700 text-slate-200 hover:border-orange-400"
                                }`}
                        >
                            Pagados
                        </button>

                        <button
                            onClick={() => setFilter("rejected")}
                            className={`rounded-full px-3 py-1 text-xs font-semibold border ${status === "rejected"
                                ? "border-orange-400 bg-orange-500 text-black"
                                : "border-slate-700 text-slate-200 hover:border-orange-400"
                                }`}
                        >
                            Rechazados
                        </button>

                        <button
                            onClick={() => setFilter("all")}
                            className={`rounded-full px-3 py-1 text-xs font-semibold border ${status === "all"
                                ? "border-orange-400 bg-orange-500 text-black"
                                : "border-slate-700 text-slate-200 hover:border-orange-400"
                                }`}
                        >
                            Todo
                        </button>

                        <button
                            onClick={cargar}
                            className="rounded-full px-3 py-1 text-xs font-semibold border border-slate-700 hover:border-orange-400"
                        >
                            Recargar
                        </button>
                    </div>
                </div>
            </header>

            {error && (
                <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="py-12 text-sm text-slate-400">Cargando retiros…</div>
            ) : rows.length === 0 ? (
                <div className="py-12 text-sm text-slate-400">No hay retiros para este filtro.</div>
            ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60">
                    <table className="min-w-full text-sm">
                        <thead className="text-xs uppercase text-slate-400 border-b border-slate-800">
                            <tr>
                                <th className="px-3 py-3 text-left">Fecha</th>
                                <th className="px-3 py-3 text-left">Socio</th>
                                <th className="px-3 py-3 text-left">Código</th>
                                <th className="px-3 py-3 text-left">WhatsApp</th>
                                <th className="px-3 py-3 text-left">Monto</th>
                                <th className="px-3 py-3 text-left">Destino</th>
                                <th className="px-3 py-3 text-left">Estado</th>
                                <th className="px-3 py-3 text-left">Referencia / Nota</th>
                                <th className="px-3 py-3 text-left">Acciones</th>
                            </tr>
                        </thead>

                        <tbody>
                            {rows.map((w) => {
                                const a = w.affiliate || null;
                                const nombre = a?.display_name || a?.username || "—";
                                const user = a?.username ? `@${a.username}` : "";
                                const code = a?.code || "—";

                                const waDigits = a?.whatsapp ? normalizeWhatsAppToWaMe(a.whatsapp) : "";
                                const waHref = waDigits ? `https://wa.me/${waDigits}` : "";

                                const st = (w.status || "").toLowerCase();

                                return (
                                    <tr key={w.id} className="border-b border-slate-800 last:border-0">
                                        <td className="px-3 py-3 text-xs text-slate-300">
                                            {new Date(w.created_at).toLocaleString("es-EC")}
                                        </td>

                                        <td className="px-3 py-3">
                                            <div className="font-medium text-slate-100">{nombre}</div>
                                            <div className="text-xs text-slate-400">{user || "—"}</div>
                                        </td>

                                        <td className="px-3 py-3 text-slate-200">{code}</td>

                                        <td className="px-3 py-3">
                                            {a?.whatsapp ? (
                                                <a
                                                    href={waHref}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-emerald-300 hover:text-emerald-200 underline underline-offset-4"
                                                    title="Abrir chat en WhatsApp"
                                                >
                                                    {a.whatsapp}
                                                </a>
                                            ) : (
                                                <span className="text-slate-500">—</span>
                                            )}
                                        </td>

                                        <td className="px-3 py-3 font-semibold">${Number(w.amount || 0).toFixed(2)}</td>

                                        <td className="px-3 py-3 text-slate-200">{w.destination || "—"}</td>

                                        <td className="px-3 py-3">
                                            <span
                                                className={[
                                                    "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold border",
                                                    st === "paid"
                                                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                                                        : st === "rejected"
                                                            ? "border-red-500/40 bg-red-500/10 text-red-200"
                                                            : "border-yellow-500/40 bg-yellow-500/10 text-yellow-100",
                                                ].join(" ")}
                                            >
                                                {st === "paid" ? "Pagado" : st === "rejected" ? "Rechazado" : "Pendiente"}
                                            </span>
                                        </td>

                                        <td className="px-3 py-3 text-slate-300">{w.notes || "—"}</td>

                                        <td className="px-3 py-3">
                                            {st === "pending" ? (
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={async () => {
                                                            const ok = confirm("¿Marcar este retiro como PAGADO?");
                                                            if (!ok) return;

                                                            await fetch(`/api/admin/withdrawals/${w.id}`, {
                                                                method: "PATCH",
                                                                credentials: "include",
                                                                headers: { "Content-Type": "application/json" },
                                                                body: JSON.stringify({ status: "paid" }),
                                                            });

                                                            cargar();
                                                        }}
                                                        className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-black hover:bg-emerald-400"
                                                    >
                                                        Marcar pagado
                                                    </button>

                                                    <button
                                                        onClick={async () => {
                                                            const motivo = prompt("Motivo del rechazo (opcional):") || null;
                                                            const ok = confirm("¿Rechazar este retiro?");
                                                            if (!ok) return;

                                                            await fetch(`/api/admin/withdrawals/${w.id}`, {
                                                                method: "PATCH",
                                                                credentials: "include",
                                                                headers: { "Content-Type": "application/json" },
                                                                body: JSON.stringify({ status: "rejected", notes: motivo }),
                                                            });

                                                            cargar();
                                                        }}
                                                        className="rounded-full border border-red-500/40 px-3 py-1 text-xs font-semibold text-red-300 hover:bg-red-500/10"
                                                    >
                                                        Rechazar
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-slate-500 text-xs">—</span>
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
    );
}
