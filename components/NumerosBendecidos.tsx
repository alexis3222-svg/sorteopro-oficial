"use client";

import { useEffect, useState } from "react";
import { Anton } from "next/font/google";
import { supabase } from "../lib/supabaseClient";

const anton = Anton({
    subsets: ["latin"],
    weight: "400",
});

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

            // 1️⃣ Traer los números bendecidos de la tabla nueva
            const { data: bendecidos, error: bendError } = await supabase
                .from("numeros_bendecidos")
                .select("numero")
                .eq("sorteo_id", sorteoId)
                .order("numero", { ascending: true });

            if (bendError) {
                console.error("Error cargando numeros_bendecidos:", bendError);
                setItems([]);
                setLoading(false);
                return;
            }

            if (!bendecidos || bendecidos.length === 0) {
                // No hay números bendecidos aún para este sorteo
                setItems([]);
                setLoading(false);
                return;
            }

            const listaNumeros = bendecidos.map((b) => b.numero as number);

            // 2️⃣ Ver cuáles de esos números YA fueron asignados a alguien
            const { data: asignados, error: asigError } = await supabase
                .from("numeros_asignados")
                .select("numero")
                .eq("sorteo_id", sorteoId)
                .in("numero", listaNumeros);

            if (asigError) {
                console.error("Error cargando numeros_asignados:", asigError);
            }

            const entregadosSet = new Set<number>(
                (asignados || []).map((a) => a.numero as number)
            );

            const lista: Bendecido[] = listaNumeros.map((n) => ({
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
                    ¡Hay números bendecidos con premios en efectivo! Realiza tu compra y
                    revisa si tienes uno de los siguientes números:
                </p>

                {loading ? (
                    <p className="mt-6 text-sm text-gray-500">Cargando...</p>
                ) : items.length === 0 ? (
                    <p className="mt-6 text-sm text-gray-500">
                        Los números bendecidos de esta actividad aún no han sido generados.
                    </p>
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
