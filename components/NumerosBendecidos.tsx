"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Lista de números bendecidos
const NUMEROS_BENDECIDOS = [
    1734, 12845, 23956, 30487, 41878,
    52789, 60312, 74979, 85634, 77
];

type Bendecido = {
    numero: number;
    entregado: boolean;
};

interface Props {
    sorteoId: string;
}

export function NumerosBendecidos({ sorteoId }: Props) {
    const [items, setItems] = useState<Bendecido[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            if (!sorteoId) return;

            setLoading(true);

            const { data, error } = await supabase
                .from("numeros_asignados")
                .select("numero")
                .eq("sorteo_id", sorteoId)
                .in("numero", NUMEROS_BENDECIDOS);

            if (error) {
                console.error("Error cargando bendecidos:", error);
                setLoading(false);
                return;
            }

            const entregados = new Set((data || []).map((r) => r.numero));

            const lista = NUMEROS_BENDECIDOS.map((num) => ({
                numero: num,
                entregado: entregados.has(num),
            }));

            setItems(lista);
            setLoading(false);
        }

        load();
    }, [sorteoId]);

    return (
        <section className="py-10 md:py-14 bg-white">
            <div className="max-w-4xl mx-auto px-4 text-center">

                <h2 className="text-2xl md:text-3xl font-extrabold tracking-wide uppercase mb-3">
                    ¡Premios Instantáneos!
                </h2>

                <p className="text-sm md:text-base text-gray-700 mb-8">
                    Hay números bendecidos con premios instantáneos. Revisa si tienes uno:
                </p>

                {loading ? (
                    <p className="text-sm text-gray-500">Cargando...</p>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-y-8 gap-x-4 md:gap-x-8">
                        {items.map((item) => {
                            const num = item.numero.toString().padStart(5, "0");

                            return (
                                <div key={item.numero} className="flex flex-col items-center">

                                    {/* Número */}
                                    <p
                                        className={
                                            "text-xl md:text-2xl font-extrabold tracking-wide" +
                                            (item.entregado ? " underline decoration-2 underline-offset-4" : "")
                                        }
                                    >
                                        {num}
                                    </p>

                                    {/* Texto solo si entregado */}
                                    {item.entregado && (
                                        <p className="text-xs md:text-sm font-semibold text-green-600 mt-1">
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
