"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import Link from "next/link";

type NumeroRow = { numero: number };
type PedidoInfo = {
    id: number;
    nombre: string | null;
    telefono: string | null;
    actividad_numero: number | null;
    cantidad_numeros: number | null;
    estado: string | null;
};

export default function NumerosClient({ pedidoId }: { pedidoId: number }) {
    const [pedido, setPedido] = useState<PedidoInfo | null>(null);
    const [numeros, setNumeros] = useState<NumeroRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const cargar = async () => {
            setLoading(true);

            // PEDIDO
            const { data: pedidoData, error: pedidoError } = await supabase
                .from("pedidos")
                .select("*")
                .eq("id", pedidoId)
                .maybeSingle();

            if (pedidoError || !pedidoData) {
                setError("No se encontró el pedido");
                setLoading(false);
                return;
            }

            setPedido(pedidoData);

            // NUMEROS
            const { data: numsData, error: numsError } = await supabase
                .from("numeros_asignados")
                .select("numero")
                .eq("pedido_id", pedidoId)
                .order("numero", { ascending: true });

            if (numsError) {
                setError("Error cargando los números");
                setLoading(false);
                return;
            }

            setNumeros(numsData || []);
            setLoading(false);
        };

        cargar();
    }, [pedidoId]);

    if (loading) return <p className="p-4">Cargando...</p>;
    if (error)
        return (
            <main className="p-4 space-y-4">
                <p className="text-sm text-red-400">{error}</p>
                <Link href="/admin/pedidos" className="text-xs text-blue-400 underline">
                    Volver
                </Link>
            </main>
        );

    if (!pedido)
        return (
            <main className="p-4 space-y-4">
                <p className="text-sm text-red-400">Pedido no encontrado</p>
                <Link href="/admin/pedidos" className="text-xs text-blue-400 underline">
                    Volver
                </Link>
            </main>
        );

    return (
        <main className="mx-auto max-w-3xl px-4 py-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-lg md:text-xl font-bold text-slate-50">
                        Números del pedido #{pedido.id}
                    </h1>
                </div>

                <Link
                    href="/admin/pedidos"
                    className="rounded-full border border-white/30 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-100 hover:bg-white/10"
                >
                    Volver
                </Link>
            </div>

            <section className="rounded-2xl bg-[#14151c] border border-white/10 p-4 shadow-lg">
                <h2 className="text-sm font-semibold text-slate-100 mb-3">
                    Números asignados
                </h2>

                {numeros.length === 0 ? (
                    <p className="text-xs text-slate-400">
                        No se encontraron números asignados para este pedido.
                    </p>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {numeros.map((n) => (
                            <span
                                key={n.numero}
                                className="inline-flex items-center justify-center rounded-full border border-white/30 px-3 py-1 text-[11px] text-slate-50"
                            >
                                {n.numero.toString().padStart(5, "0")}
                            </span>
                        ))}
                    </div>
                )}
            </section>
        </main>
    );
}
