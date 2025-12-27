"use client";

import { useEffect, useMemo, useState } from "react";
import { Anton } from "next/font/google";
import { supabase } from "@/lib/supabaseClient";

const anton = Anton({ subsets: ["latin"], weight: "400" });

type Props = {
    sorteoId?: string | null;
};

type BendecidoRow = {
    numero: number;
    creado_en: string | null;
};

export function PremiosInstantaneos({ sorteoId }: Props) {
    const [loading, setLoading] = useState(true);
    const [bendecidos, setBendecidos] = useState<number[]>([]);
    const [vendidosSet, setVendidosSet] = useState<Set<number>>(new Set());
    const [softMsg, setSoftMsg] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function cargar() {
            setLoading(true);
            setSoftMsg(null);
            setBendecidos([]);
            setVendidosSet(new Set());

            if (!sorteoId) {
                // No ocultamos; solo avisamos suave.
                setSoftMsg("Cargando premios instantáneos…");
                setLoading(false);
                return;
            }

            // 1) leer 10 bendecidos
            const { data: bData, error: bErr } = await supabase
                .from("numeros_bendecidos")
                .select("numero,creado_en")
                .eq("sorteo_id", sorteoId)
                .order("creado_en", { ascending: false })
                .limit(10);

            if (cancelled) return;

            if (bErr) {
                console.error("numeros_bendecidos:", bErr);
                setSoftMsg("No se pudieron cargar los premios instantáneos (permisos o datos).");
                setLoading(false);
                return;
            }

            const nums =
                (bData as BendecidoRow[] | null)
                    ?.map((r) => Number(r.numero))
                    .filter((n) => Number.isFinite(n)) ?? [];

            setBendecidos(nums);

            if (nums.length === 0) {
                setSoftMsg("Aún no hay números bendecidos configurados para este sorteo.");
                setLoading(false);
                return;
            }

            // 2) marcar vendidos (si existe en numeros_asignados)
            const { data: aData, error: aErr } = await supabase
                .from("numeros_asignados")
                .select("numero")
                .eq("sorteo_id", sorteoId)
                .in("numero", nums);

            if (cancelled) return;

            if (aErr) {
                console.error("numeros_asignados:", aErr);
                // No rompemos: solo no tachamos
                setSoftMsg("No se pudo verificar si ya fueron vendidos (permisos).");
                setVendidosSet(new Set());
                setLoading(false);
                return;
            }

            const sold = new Set<number>(
                (aData ?? [])
                    .map((r: any) => Number(r.numero))
                    .filter((n) => Number.isFinite(n))
            );

            setVendidosSet(sold);
            setLoading(false);
        }

        void cargar();

        return () => {
            cancelled = true;
        };
    }, [sorteoId]);

    const items = useMemo(() => {
        return bendecidos.map((n) => ({
            n,
            label: String(n).padStart(5, "0"),
            entregado: vendidosSet.has(n),
        }));
    }, [bendecidos, vendidosSet]);

    return (
        <section className="w-full bg-gray-100 py-10 md:py-14">
            <div className="mx-auto max-w-5xl px-4 text-center">
                <h2 className={`${anton.className} text-lg md:text-2xl uppercase tracking-[0.18em]`}>
                    ¡PREMIOS INSTANTÁNEOS!
                </h2>

                <p className="mt-3 text-sm md:text-base text-gray-600 max-w-3xl mx-auto">
                    ¡Hay 10 números bendecidos con premios en efectivo! Realiza tu compra y revisa si tienes uno de los siguientes números:
                </p>

                {softMsg ? (
                    <p className="mt-4 text-xs md:text-sm text-gray-600">{softMsg}</p>
                ) : null}

                <div className="mt-8 grid grid-cols-2 md:grid-cols-5 gap-x-10 gap-y-6">
                    {loading ? (
                        Array.from({ length: 10 }).map((_, i) => (
                            <div key={i} className="space-y-2">
                                <div className="mx-auto h-8 w-24 rounded bg-gray-200 animate-pulse" />
                                <div className="mx-auto h-4 w-28 rounded bg-gray-200 animate-pulse" />
                            </div>
                        ))
                    ) : items.length === 0 ? (
                        // fallback visual: no desaparece
                        <div className="col-span-2 md:col-span-5 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
                            No hay premios instantáneos configurados todavía.
                        </div>
                    ) : (
                        items.map((it) => (
                            <div key={it.n} className="space-y-1">
                                <p
                                    className={[
                                        anton.className,
                                        "text-2xl md:text-3xl tracking-[0.25em] text-gray-900",
                                        it.entregado ? "line-through opacity-50" : "",
                                    ].join(" ")}
                                >
                                    {it.label}
                                </p>
                                <p className="text-sm text-gray-600">
                                    {it.entregado ? "¡Premio Entregado!" : "\u00A0"}
                                </p>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </section>
    );
}
