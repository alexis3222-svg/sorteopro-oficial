"use client";

import { useEffect, useState } from "react";
import { Anton } from "next/font/google";
import { supabase } from "../lib/supabaseClient";

const anton = Anton({
    subsets: ["latin"],
    weight: "400",
});

type BendecidoRow = {
    id: number;
    numero: number | string | null;
};

interface NumerosBendecidosProps {
    sorteoId: string;
}

function NumerosBendecidos({ sorteoId }: NumerosBendecidosProps) {
    const [numeros, setNumeros] = useState<BendecidoRow[]>([]);
    const [entregadosSet, setEntregadosSet] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBendecidos = async () => {
            if (!sorteoId) return;
            setLoading(true);

            // 1️⃣ Números bendecidos del sorteo
            const { data: bendecidos, error: bendecidosError } = await supabase
                .from("numeros_bendecidos")
                .select("id, numero")
                .eq("sorteo_id", sorteoId)
                .order("numero", { ascending: true });

            if (bendecidosError) {
                console.error(
                    "Error cargando números bendecidos:",
                    bendecidosError.message
                );
                setNumeros([]);
                setEntregadosSet(new Set());
                setLoading(false);
                return;
            }

            const listaBendecidos = (bendecidos || []) as BendecidoRow[];
            setNumeros(listaBendecidos);

            if (!listaBendecidos.length) {
                // no hay números bendecidos → nada más que hacer
                setEntregadosSet(new Set());
                setLoading(false);
                return;
            }

            // 2️⃣ Pedidos PAGADOS de este sorteo
            const { data: pedidosPagados, error: pedidosError } = await supabase
                .from("pedidos")
                .select("id")
                .eq("sorteo_id", sorteoId)
                .eq("estado", "pagado");

            if (pedidosError) {
                console.error(
                    "Error cargando pedidos pagados:",
                    pedidosError.message
                );
                setEntregadosSet(new Set());
                setLoading(false);
                return;
            }

            const idsPagados = (pedidosPagados || []).map((p: any) => p.id) as number[];

            if (!idsPagados.length) {
                // no hay pedidos pagados → ningún premio entregado
                setEntregadosSet(new Set());
                setLoading(false);
                return;
            }

            // 3️⃣ Números asignados a esos pedidos pagados
            const { data: asignados, error: asignadosError } = await supabase
                .from("numeros_asignados")
                .select("numero, pedido_id")
                .eq("sorteo_id", sorteoId)
                .in("pedido_id", idsPagados);

            if (asignadosError) {
                console.error(
                    "Error cargando números asignados:",
                    asignadosError.message
                );
                setEntregadosSet(new Set());
                setLoading(false);
                return;
            }

            // 4️⃣ Set de números que YA fueron entregados (asignados a un pedido pagado)
            const entregados = new Set<string>(
                (asignados || [])
                    .map((n: any) => n.numero)
                    .filter((n: any) => n !== null && n !== undefined)
                    .map((n: any) => String(n))
            );

            setEntregadosSet(entregados);
            setLoading(false);
        };

        fetchBendecidos();
    }, [sorteoId]);

    if (loading) {
        return (
            <p className="text-center text-xs text-slate-500">
                Cargando premios instantáneos...
            </p>
        );
    }

    if (!numeros.length) {
        // si no hay bendecidos, no mostramos nada
        return null;
    }

    return (
        <div className="space-y-4 text-center">
            <p className="text-xs md:text-sm text-slate-600">
                ¡Hay {numeros.length} números bendecidos con premios en efectivo!
                Revisa si tienes uno de los siguientes números:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 justify-items-center">
                {numeros.map((n) => {
                    const numStr =
                        n.numero !== null && n.numero !== undefined
                            ? String(n.numero).padStart(5, "0")
                            : "--";

                    const entregado = entregadosSet.has(String(n.numero ?? ""));

                    return (
                        <div
                            key={n.id}
                            className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm min-w-[90px]"
                        >
                            {/* Número bendecido */}
                            <span
                                className={`${anton.className} text-lg md:text-xl tracking-[0.18em] text-slate-900`}
                            >
                                {numStr}
                            </span>

                            {/* Solo si el número está en un pedido pagado → mostrar 'Premio Entregado' */}
                            {entregado && (
                                <span className="mt-1 text-[10px] md:text-xs text-slate-700 underline">
                                    ¡Premio Entregado!
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default NumerosBendecidos;
