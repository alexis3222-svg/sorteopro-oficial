"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
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
    const [fase, setFase] = useState<string>("render");
    const [pedido, setPedido] = useState<PedidoInfo | null>(null);
    const [numeros, setNumeros] = useState<NumeroAsignado[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            setFase("useEffect: start");
            setError(null);

            console.log("[AdminNumerosClient] pedidoId =", pedidoId);

            // 1) Pedido
            setFase("fetch pedido...");
            const { data: p, error: pe } = await supabase
                .from("pedidos")
                .select(
                    "id, created_at, actividad_numero, cantidad_numeros, estado, nombre, telefono, metodo_pago, total"
                )
                .eq("id", pedidoId)
                .maybeSingle();

            if (pe) {
                console.error("[AdminNumerosClient] pedidos error:", pe);
                setError("pedidos: " + (pe.message || "error"));
                setFase("error en pedido");
                return;
            }
            if (!p) {
                setError("Pedido no encontrado en pedidos");
                setFase("pedido null");
                return;
            }
            setPedido(p as PedidoInfo);

            // 2) Números
            setFase("fetch numeros_asignados...");
            const { data: ns, error: ne } = await supabase
                .from("numeros_asignados")
                .select("numero")
                .eq("pedido_id", pedidoId)
                .order("numero", { ascending: true });

            if (ne) {
                console.error("[AdminNumerosClient] numeros_asignados error:", ne);
                setError("numeros_asignados: " + (ne.message || "error"));
                setFase("error en numeros");
                return;
            }

            setNumeros((ns || []) as NumeroAsignado[]);
            setFase("ok");
        })();
    }, [pedidoId]);

    return (
        <main className="min-h-screen bg-[#050609] text-slate-100 p-6">
            <div className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-white/5 p-4">
                <h1 className="text-lg font-semibold">DEBUG /admin/numeros</h1>

                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                        <p className="text-slate-400">pedidoId</p>
                        <p className="text-slate-100 font-semibold">{pedidoId}</p>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                        <p className="text-slate-400">fase</p>
                        <p className="text-slate-100 font-semibold">{fase}</p>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                        <p className="text-slate-400">pedido cargado</p>
                        <p className="text-slate-100 font-semibold">
                            {pedido ? `sí (estado: ${pedido.estado})` : "no"}
                        </p>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                        <p className="text-slate-400">números encontrados</p>
                        <p className="text-slate-100 font-semibold">{numeros.length}</p>
                    </div>
                </div>

                {error ? (
                    <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                        {error}
                    </div>
                ) : null}

                {numeros.length ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                        {numeros.map((n) => (
                            <span
                                key={n.numero}
                                className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold"
                            >
                                {String(n.numero).padStart(5, "0")}
                            </span>
                        ))}
                    </div>
                ) : (
                    <p className="mt-4 text-sm text-slate-400">
                        (Si aquí sigue en 0 pero en la BD sí hay, veremos el error arriba o en consola.)
                    </p>
                )}
            </div>
        </main>
    );
}
