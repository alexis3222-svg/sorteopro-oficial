"use client";

import { useEffect, useMemo, useState } from "react";
import { Anton } from "next/font/google";
import { supabase } from "@/lib/supabaseClient";

const anton = Anton({
    subsets: ["latin"],
    weight: "400",
});

type SorteoActivo = {
    id: string;
    actividad_numero: number | null;
};

type BendecidoRow = {
    numero: number;
    creado_en: string | null;
};

export function PremiosInstantaneos() {
    const [loading, setLoading] = useState(true);
    const [actividad, setActividad] = useState<number | null>(null);
    const [numeros, setNumeros] = useState<number[]>([]);
    const [vendidos, setVendidos] = useState<Set<number>>(new Set());
    const [softMsg, setSoftMsg] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function cargar() {
            setLoading(true);
            setSoftMsg(null);

            // 1) Sorteo activo (igual que tu Home)
            const { data: sorteo, error: sorteoErr } = await supabase
                .from("sorteos")
                .select("id,actividad_numero")
                .eq("estado", "activo")
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

            if (cancelled) return;

            if (sorteoErr || !sorteo?.id) {
                // Si no hay sorteo activo, ocultamos la sección silenciosamente (PF vibe).
                setNumeros([]);
                setVendidos(new Set());
                setLoading(false);
                return;
            }

            const sorteoActivo = sorteo as SorteoActivo;
            setActividad(sorteoActivo.actividad_numero ?? null);

            // 2) Traer los 10 números bendecidos elegidos por ti (BD)
            const { data: bend, error: bendErr } = await supabase
                .from("numeros_bendecidos")
                .select("numero,creado_en")
                .eq("sorteo_id", sorteoActivo.id)
                .order("creado_en", { ascending: false })
                .limit(10);

            if (cancelled) return;

            if (bendErr) {
                console.error("numeros_bendecidos error:", bendErr.message);
                setSoftMsg("No se pudieron cargar los premios instantáneos.");
                setNumeros([]);
                setVendidos(new Set());
                setLoading(false);
                return;
            }

            const nums = (bend as BendecidoRow[] | null)
                ?.map((r) => Number(r.numero))
                .filter((n) => Number.isFinite(n)) ?? [];

            setNumeros(nums);

            // 3) Detectar cuáles ya están vendidos (numeros_asignados)
            if (nums.length > 0) {
                const { data: asig, error: asigErr } = await supabase
                    .from("numeros_asignados")
                    .select("numero")
                    .eq("sorteo_id", sorteoActivo.id)
                    .in("numero", nums);

                if (cancelled) return;

                if (asigErr) {
                    console.error("numeros_asignados error:", asigErr.message);
                    // No rompemos UI: solo no tachamos
                    setVendidos(new Set());
                } else {
                    const set = new Set<number>(
                        (asig ?? [])
                            .map((r: any) => Number(r.numero))
                            .filter((n) => Number.isFinite(n))
                    );
                    setVendidos(set);
                }
            } else {
                setVendidos(new Set());
            }

            if (!cancelled) setLoading(false);
        }

        void cargar();

        return () => {
            cancelled = true;
        };
    }, []);

    const items = useMemo(() => {
        return numeros.map((n) => ({
            key: n,
            label: String(n).padStart(5, "0"),
            entregado: vendidos.has(n),
        }));
    }, [numeros, vendidos]);

    // Si no hay data y no está cargando, ocultamos la sección
    if (!loading && items.length === 0) return null;

    return (
        <section className="w-full bg-gray-100 py-10 md:py-14">
            <div className="mx-auto max-w-5xl px-4 text-center">
                {/* TÍTULO */}
                <h2 className={`${anton.className} text-lg md:text-2xl uppercase tracking-[0.18em]`}>
                    ¡PREMIOS INSTANTÁNEOS!
                </h2>

                {/* TEXTO */}
                <p className="mt-3 text-sm md:text-base text-gray-600 max-w-3xl mx-auto">
                    Hay 10 números bendecidos con premios en efectivo. Revisa si tienes uno de los siguientes números
                    {actividad ? ` para la actividad #${actividad}` : ""}.
                </p>

                {/* Estado suave */}
                {softMsg ? (
                    <p className="mt-4 text-sm text-gray-600">{softMsg}</p>
                ) : null}

                {/* GRID */}
                <div className="mt-8 grid grid-cols-2 md:grid-cols-5 gap-x-10 gap-y-6">
                    {loading
                        ? Array.from({ length: 10 }).map((_, i) => (
                            <div key={i} className="space-y-2">
                                <div className="mx-auto h-8 w-28 rounded bg-gray-200 animate-pulse" />
                                <div className="mx-auto h-4 w-24 rounded bg-gray-200 animate-pulse" />
                            </div>
                        ))
                        : items.map((it) => (
                            <div key={it.key} className="space-y-1">
                                <p
                                    className={[
                                        anton.className,
                                        "text-2xl md:text-3xl tracking-[0.25em] text-gray-900",
                                        it.entregado ? "line-through opacity-45" : "",
                                    ].join(" ")}
                                >
                                    {it.label}
                                </p>

                                {/* Estilo PF: solo mostrar texto cuando está entregado */}
                                {it.entregado ? (
                                    <p className="text-sm text-gray-600">¡Premio Entregado!</p>
                                ) : (
                                    <p className="text-sm text-gray-600">&nbsp;</p>
                                )}
                            </div>
                        ))}
                </div>
            </div>
        </section>
    );
}
