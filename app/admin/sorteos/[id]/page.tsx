// app/admin/sorteos/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { EditSorteoForm } from "@/components/EditSorteoForm";
import { supabase } from "@/lib/supabaseClient";

export default function EditSorteoPage() {
    const params = useParams<{ id: string }>();
    const id = params?.id;

    const [sorteo, setSorteo] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;

        const fetchSorteo = async () => {
            const { data, error } = await supabase
                .from("sorteos")
                .select("*")
                .eq("id", id)
                .single();

            if (error || !data) {
                console.error(error);
                setErrorMsg("No se pudo cargar la información del sorteo.");
            } else {
                setSorteo(data);
            }
            setLoading(false);
        };

        fetchSorteo();
    }, [id]);

    // Stats del sorteo actual (solo para mostrar, no se guarda aquí)
    const totalNumeros = useMemo(
        () => (sorteo?.total_numeros ? Number(sorteo.total_numeros) : 0),
        [sorteo]
    );
    const numerosVendidos = useMemo(
        () => (sorteo?.numeros_vendidos ? Number(sorteo.numeros_vendidos) : 0),
        [sorteo]
    );
    const precioNumero = useMemo(
        () => (sorteo?.precio_numero ? Number(sorteo.precio_numero) : 0),
        [sorteo]
    );

    const numerosRestantes = Math.max(totalNumeros - numerosVendidos, 0);
    const recaudado = numerosVendidos * precioNumero;
    const progreso =
        totalNumeros > 0 ? (numerosVendidos / totalNumeros) * 100 : 0;

    if (loading) {
        return (
            <main className="min-h-screen bg-[#050608] text-slate-50">
                <div className="mx-auto max-w-5xl px-4 py-10 text-sm text-neutral-300">
                    Cargando datos del sorteo...
                </div>
            </main>
        );
    }

    if (errorMsg || !sorteo) {
        return (
            <main className="min-h-screen bg-[#050608] text-slate-50">
                <div className="mx-auto max-w-5xl px-4 py-10 text-sm text-red-400">
                    {errorMsg ?? "Sorteo no encontrado."}
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[#050608] text-slate-50">
            <div className="mx-auto max-w-5xl px-4 py-8 md:py-10 space-y-6">
                {/* Encabezado similar al dashboard */}
                <header className="space-y-3">
                    <div className="text-xs font-semibold tracking-[0.2em] text-orange-400 uppercase">
                        Casa Bikers • Admin
                    </div>
                    <h1 className="text-3xl md:text-4xl font-extrabold tracking-wide">
                        Editar sorteo
                    </h1>
                    <p className="max-w-2xl text-sm text-slate-400">
                        Actualiza la información del sorteo activo en la plataforma
                        SorteoPro / Casa Bikers.
                    </p>
                </header>

                {/* Resumen del sorteo (cards) */}
                <section className="grid gap-4 md:grid-cols-3">
                    {/* Info principal */}
                    <div className="md:col-span-2 rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 mb-1">
                            Sorteo actual
                        </p>
                        <h2 className="text-lg font-semibold text-slate-50">
                            {sorteo.titulo || "Sorteo sin título"}
                        </h2>
                        <p className="mt-1 text-xs text-slate-400">
                            {sorteo.actividad_numero
                                ? `Actividad #${sorteo.actividad_numero} · Estado: ${sorteo.estado}`
                                : `Estado: ${sorteo.estado}`}
                        </p>

                        {/* Barra de progreso simple */}
                        {totalNumeros > 0 && (
                            <div className="mt-4 space-y-1">
                                <div className="flex justify-between text-[11px] text-slate-400">
                                    <span>Progreso de venta</span>
                                    <span>{progreso.toFixed(2)}%</span>
                                </div>
                                <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                                    <div
                                        className="h-full rounded-full bg-gradient-to-r from-orange-500 to-orange-400"
                                        style={{ width: `${Math.min(progreso, 100)}%` }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* KPIs del sorteo */}
                    <div className="space-y-3">
                        <div className="rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3">
                            <p className="text-[11px] text-slate-400">Números vendidos</p>
                            <p className="mt-1 text-xl font-semibold">
                                {numerosVendidos}{" "}
                                <span className="text-xs text-slate-400">
                                    / {totalNumeros || "—"}
                                </span>
                            </p>
                        </div>
                        <div className="rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3">
                            <p className="text-[11px] text-slate-400">Números restantes</p>
                            <p className="mt-1 text-xl font-semibold">
                                {numerosRestantes}
                            </p>
                        </div>
                        <div className="rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3">
                            <p className="text-[11px] text-slate-400">Recaudado</p>
                            <p className="mt-1 text-xl font-semibold">
                                ${recaudado.toFixed(2)}
                            </p>
                        </div>
                    </div>
                </section>

                {/* Formulario completo (el que ya tienes mejorado) */}
                <EditSorteoForm
                    sorteo={sorteo}
                    galeriaInicial={
                        Array.isArray(sorteo.galeria_urls) ? sorteo.galeria_urls : []
                    }
                />

            </div>
        </main>
    );
}
