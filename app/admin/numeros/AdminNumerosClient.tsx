"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Props = { pedidoId: number };

type PedidoInfo = {
    id: number;
    created_at: string | null;
    actividad_numero: number | null;
    cantidad_numeros: number | null;
    estado: string | null;
    nombre: string | null;
    telefono: string | null;
    metodo_pago: string | null;
    total: number | null;
};

type NumeroAsignado = { numero: number };

export default function AdminNumerosClient({ pedidoId }: Props) {
    const [loading, setLoading] = useState(true);
    const [pedido, setPedido] = useState<PedidoInfo | null>(null);
    const [numeros, setNumeros] = useState<NumeroAsignado[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            setLoading(true);
            setError(null);

            // Pedido
            const { data: p, error: pe } = await supabase
                .from("pedidos")
                .select(
                    "id, created_at, actividad_numero, cantidad_numeros, estado, nombre, telefono, metodo_pago, total"
                )
                .eq("id", pedidoId)
                .maybeSingle();

            if (pe) {
                console.error("pedidos select error:", pe);
                setError(pe.message || "Error leyendo pedido");
                setLoading(false);
                return;
            }
            if (!p) {
                setError("Pedido no encontrado");
                setLoading(false);
                return;
            }
            setPedido(p as PedidoInfo);

            // Números asignados (esto debe mostrar 11..15 en pedido 340 según tu BD)
            const { data: ns, error: ne } = await supabase
                .from("numeros_asignados")
                .select("numero")
                .eq("pedido_id", pedidoId)
                .order("numero", { ascending: true });

            if (ne) {
                console.error("numeros_asignados select error:", ne);
                setError(ne.message || "Error leyendo números");
                setLoading(false);
                return;
            }

            setNumeros((ns || []) as NumeroAsignado[]);
            setLoading(false);
        })();
    }, [pedidoId]);

    if (loading) {
        return (
            <main className="min-h-screen bg-[#050609] text-slate-100 flex items-center justify-center">
                <p className="text-slate-400">Cargando…</p>
            </main>
        );
    }

    if (error) {
        return (
            <main className="min-h-screen bg-[#050609] text-slate-100 flex items-center justify-center p-6">
                <div className="max-w-lg text-center">
                    <p className="text-red-400 font-semibold">{error}</p>
                    <Link
                        href="/admin/pedidos"
                        className="inline-block mt-4 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] hover:bg-white/10"
                    >
                        Volver a pedidos
                    </Link>
                </div>
            </main>
        );
    }

    const actividad = pedido?.actividad_numero ? `Actividad #${pedido.actividad_numero}` : "Actividad";
    const nombre = pedido?.nombre?.trim() || "—";
    const tel = pedido?.telefono || "—";
    const estado = (pedido?.estado || "pendiente").toUpperCase();

    return (
        <main className="min-h-screen bg-[#050609] text-slate-100">
            <div className="mx-auto max-w-5xl px-4 py-8">
                <header className="flex items-center justify-between gap-3">
                    <div>
                        <p className="text-xs text-slate-400">{actividad}</p>
                        <h1 className="text-xl font-semibold">Pedido #{pedidoId}</h1>
                        <p className="text-xs text-slate-400">
                            {nombre} • {tel} • {estado}
                        </p>
                    </div>

                    <Link
                        href="/admin/pedidos"
                        className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] hover:bg-white/10"
                    >
                        ← Pedidos
                    </Link>
                </header>

                <section className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <h2 className="text-sm font-semibold">Números asignados</h2>

                    {numeros.length === 0 ? (
                        <p className="mt-2 text-sm text-yellow-300">
                            Este pedido no tiene números en <code>numeros_asignados</code>.
                        </p>
                    ) : (
                        <div className="mt-3 flex flex-wrap gap-2">
                            {numeros.map((n) => (
                                <span
                                    key={n.numero}
                                    className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold"
                                >
                                    {n.numero.toString().padStart(5, "0")}
                                </span>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}
