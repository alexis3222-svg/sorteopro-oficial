"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Anton } from "next/font/google";

const anton = Anton({
    subsets: ["latin"],
    weight: "400",
});

type Premio = {
    numero: number;
};

export function PremiosInstantaneos() {
    const [premios, setPremios] = useState<Premio[]>([]);
    const [entregados, setEntregados] = useState<Set<number>>(new Set());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const cargar = async () => {
            setLoading(true);

            // 1️⃣ Obtener sorteo activo REAL
            const { data: sorteo, error: sorteoError } = await supabase
                .from("sorteos")
                .select("id")
                .eq("estado", "activo")
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

            if (sorteoError || !sorteo) {
                setPremios([]);
                setLoading(false);
                return;
            }

            // 2️⃣ Obtener números bendecidos
            const { data: bendecidos } = await supabase
                .from("numeros_bendecidos")
                .select("numero")
                .eq("sorteo_id", sorteo.id)
                .order("numero", { ascending: true });

            // 3️⃣ Obtener números ya asignados (vendidos)
            const { data: asignados } = await supabase
                .from("numeros_asignados")
                .select("numero")
                .eq("sorteo_id", sorteo.id);

            const vendidos = new Set(
                (asignados ?? []).map((n) => Number(n.numero))
            );

            setPremios(bendecidos ?? []);
            setEntregados(vendidos);
            setLoading(false);
        };

        cargar();
    }, []);

    return (
        <section className="w-full bg-gray-100 py-10 md:py-14">
            <div className="mx-auto max-w-5xl px-4 text-center">
                <h2
                    className={`${anton.className} text-lg md:text-2xl uppercase tracking-[0.18em]`}
                >
                    ¡PREMIOS INSTANTÁNEOS!
                </h2>

                <p className="mt-3 text-sm md:text-base text-gray-600 max-w-3xl mx-auto">
                    ¡Hay 10 números bendecidos con premios en efectivo! Realiza tu compra y
                    revisa si tienes uno de los siguientes números:
                </p>

                {loading ? (
                    <p className="mt-6 text-sm text-slate-500">
                        Cargando premios instantáneos...
                    </p>
                ) : premios.length === 0 ? (
                    <div className="mt-6 rounded-xl border border-slate-200 bg-white px-6 py-4 text-sm text-slate-600">
                        No hay premios instantáneos configurados todavía.
                    </div>
                ) : (
                    <div className="mt-8 grid grid-cols-2 md:grid-cols-5 gap-x-10 gap-y-6">
                        {premios.map(({ numero }) => {
                            const entregado = entregados.has(numero);

                            return (
                                <div key={numero} className="space-y-1">
                                    <p
                                        className={`${anton.className} text-2xl md:text-3xl tracking-[0.25em] ${entregado
                                                ? "line-through text-slate-400"
                                                : "text-slate-900"
                                            }`}
                                    >
                                        {String(numero).padStart(5, "0")}
                                    </p>

                                    {entregado && (
                                        <p className="text-sm text-slate-500">
                                            ¡Premio Entregado!
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </section>
    );
}
