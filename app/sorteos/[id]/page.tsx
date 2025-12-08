"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type EstadoSorteo = "activo" | "pausado" | "finalizado";

interface Sorteo {
    id: string;
    titulo: string;
    descripcion: string | null;
    imagen_url: string | null;
    total_numeros: number;
    precio_numero: number;
    estado: EstadoSorteo;

    // 🔥 Campos reales que vienen desde la vista:
    numeros_vendidos_reales: number;
    ultimo_numero_asignado_real: number;
    porcentaje_vendido: number;
}

export default function PublicSorteoPage() {
    const params = useParams<{ id: string }>();
    const id = params?.id;

    const [sorteo, setSorteo] = useState<Sorteo | null>(null);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;

        const fetchSorteo = async () => {
            setLoading(true);
            setErrorMsg(null);

            try {
                // 🔥 OBTENER DELA VISTA, NO DE LA TABLA
                const { data, error } = await supabase
                    .from("sorteos_con_estadisticas")
                    .select("*")
                    .eq("id", id)
                    .single();

                if (error || !data) {
                    setErrorMsg(error?.message || "No se encontró este sorteo.");
                    setSorteo(null);
                } else {
                    setSorteo(data as Sorteo);
                }
            } catch (err: any) {
                setErrorMsg(
                    err?.message || "Ocurrió un error al cargar el sorteo."
                );
                setSorteo(null);
            } finally {
                setLoading(false);
            }
        };

        fetchSorteo();
    }, [id]);

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-neutral-950">
                <p className="text-sm text-neutral-300">Cargando sorteo...</p>
            </div>
        );
    }

    if (errorMsg || !sorteo) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-neutral-950">
                <p className="rounded-lg border border-red-500/60 bg-red-500/10 px-4 py-2 text-sm text-red-200">
                    {errorMsg ?? "Sorteo no encontrado."}
                </p>
            </div>
        );
    }

    // 🔥 Ahora usamos los datos REALES desde la vista
    const vendidos = sorteo.numeros_vendidos_reales;
    const total = sorteo.total_numeros;
    const progreso = sorteo.porcentaje_vendido;

    return (
        <div className="min-h-screen bg-neutral-950 text-white">
            <main className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-8">
                {/* Título */}
                <header className="space-y-2 text-center">
                    <p className="text-xs uppercase tracking-[0.25em] text-neutral-400">
                        Sorteo activo
                    </p>
                    <h1 className="text-3xl font-bold md:text-4xl">
                        {sorteo.titulo}
                    </h1>
                </header>

                {/* Imagen principal */}
                <section className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/60">
                    {sorteo.imagen_url ? (
                        <img
                            src={sorteo.imagen_url}
                            alt={sorteo.titulo}
                            className="h-72 w-full object-cover md:h-96"
                        />
                    ) : (
                        <div className="flex h-72 w-full items-center justify-center text-sm text-neutral-400 md:h-96">
                            Sin imagen
                        </div>
                    )}
                </section>

                {/* Info principal */}
                <section className="grid gap-6 md:grid-cols-[2fr,1.3fr]">
                    {/* Descripción */}
                    <div className="space-y-4 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5">
                        <h2 className="text-lg font-semibold">Descripción</h2>
                        <p className="text-sm leading-relaxed text-neutral-200">
                            {sorteo.descripcion}
                        </p>
                    </div>

                    {/* Datos del sorteo */}
                    <div className="space-y-4 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5">
                        <h2 className="text-lg font-semibold">Detalles del sorteo</h2>

                        {/* Precio */}
                        <div className="flex items-baseline justify-between">
                            <span className="text-sm text-neutral-400">
                                Precio por número
                            </span>
                            <span className="text-2xl font-bold text-orange-400">
                                ${Number(sorteo.precio_numero).toFixed(2)}
                            </span>
                        </div>

                        {/* Progreso */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs text-neutral-400">
                                <span>
                                    Vendidos:{" "}
                                    <span className="font-semibold text-neutral-100">
                                        {vendidos}/{total}
                                    </span>
                                </span>
                                <span className="font-semibold text-orange-400">
                                    {progreso}%
                                </span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-neutral-800">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400"
                                    style={{ width: `${progreso}%` }}
                                />
                            </div>
                        </div>

                        {/* Estado */}
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-neutral-400">Estado</span>
                            <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${sorteo.estado === "activo"
                                        ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/40"
                                        : sorteo.estado === "pausado"
                                            ? "bg-yellow-500/10 text-yellow-300 border border-yellow-500/40"
                                            : "bg-red-500/10 text-red-300 border border-red-500/40"
                                    }`}
                            >
                                {sorteo.estado.toUpperCase()}
                            </span>
                        </div>

                        {/* CTA */}
                        <button
                            disabled={sorteo.estado !== "activo"}
                            className="mt-4 w-full rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-400"
                        >
                            {sorteo.estado === "activo"
                                ? "¡Quiero mi número!"
                                : "Sorteo no disponible"}
                        </button>

                        <p className="text-[11px] text-neutral-500">
                            Próximo paso: integración de selección de números y pago.
                        </p>
                    </div>
                </section>
            </main>
        </div>
    );
}
