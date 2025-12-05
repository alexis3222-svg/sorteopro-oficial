"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Anton } from "next/font/google";

const anton = Anton({
    subsets: ["latin"],
    weight: "400",
});

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// misma lista que usabas antes, pero como números
const NUMEROS_BENDECIDOS = [
    7, 10101, 22267, 36836, 44498,
    55286, 68397, 72564, 89990, 3030,
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
        if (!sorteoId) return;

        async function load() {
            setLoading(true);

            const { data, error } = await supabase
                .from("numeros_asignados")
                .select("numero")
                .eq("sorteo_id", sorteoId)
                .in("numero", NUMEROS_BENDECIDOS);

            if (error) {
                console.error("Error cargando bendecidos:", error);
                setItems(
                    NUMEROS_BENDECIDOS.map((n) => ({ numero: n, entregado: false }))
                );
                setLoading(false);
                return;
            }

            const entregadosSet = new Set<number>(
                (data || []).map((r: any) => r.numero as number)
            );

            const lista = NUMEROS_BENDECIDOS.map((n) => ({
                numero: n,
                entregado: entregadosSet.has(n),
            }));

            setItems(lista);
            setLoading(false);
        }

        load();
    }, [sorteoId]);

    return (
        <section className="w-full py-6 md:py-8">
            <div className="mx-auto max-w-5xl px-4 text-center">
                <h2
                    className={`${anton.className} text-lg md:text-2xl uppercase tracking-[0.18em] text-[#2b2b2b]`}
                >
                    ¡PREMIOS INSTANTÁNEOS!
                </h2>

                <p className="mt-3 text-sm md:text-base text-gray-600 max-w-3xl mx-auto">
                    ¡Hay 10 números bendecidos con premios en efectivo! Realiza tu compra
                    y revisa si tienes uno de los siguientes números:
                </p>

                {loading ? (
                    <p className="mt-6 text-sm text-gray-500">Cargando...</p>
                ) : (
                    <div className="mt-8 grid grid-cols-2 md:grid-cols-5 gap-x-10 gap-y-6">
                        {items.map((item) => {
                            const num = item.numero.toString().padStart(5, "0");

                            return (
                                <div key={item.numero} className="space-y-1">
                                    <p
                                        className={`${anton.className} text-xl md:text-xl tracking-[0.10em] text-gray-600${item.entregado
                                                ? " underline decoration-2 underline-offset-4"
                                                : ""
                                            }`}
                                    >
                                        {num}
                                    </p>

                                    {item.entregado && (
                                        <p className="text-sm text-green-600 font-semibold">
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
