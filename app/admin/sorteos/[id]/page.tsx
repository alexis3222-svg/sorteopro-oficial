// app/admin/sorteos/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { EditSorteoForm } from "@/components/EditSorteoForm";
import { supabase } from "@/lib/supabaseClient";

type SorteoRow = {
    id: string;
    titulo: string | null;
    actividad_numero: number | null;
    estado: string | null;
    total_numeros: number | null;
    precio_numero: number | null;
    galeria_urls?: string[] | null;

    // 🔥 Campos que vienen de la vista sorteos_con_estadisticas
    numeros_vendidos_reales: number;
    ultimo_numero_asignado_real: number;
    porcentaje_vendido: number;
};

export default function EditSorteoPage() {
    const params = useParams<{ id: string }>();
    const id = params?.id;

    const [sorteo, setSorteo] = useState<SorteoRow | null>(null);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // recaudación real desde pedidos
    const [recaudadoReal, setRecaudadoReal] = useState<number | null>(null);
    const [resetting, setResetting] = useState(false);

    useEffect(() => {
        if (!id) return;

        const fetchAll = async () => {
            setLoading(true);
            setErrorMsg(null);

            // 1) leer el sorteo DESDE LA VISTA con stats reales
            const { data: sorteoData, error: sorteoError } = await supabase
                .from("sorteos_con_estadisticas") // 👈 vista, no la tabla sorteos
                .select("*")
                .eq("id", id)
                .single();

            if (sorteoError || !sorteoData) {
                console.error("Error cargando sorteo:", sorteoError);
                setErrorMsg("No se pudo cargar la información del sorteo.");
                setLoading(false);
                return;
            }

            setSorteo(sorteoData as SorteoRow);

            // 2) sumar recaudado real desde pedidos pagados/confirmados
            const { data: pedidosPagados, error: pedidosError } = await supabase
                .from("pedidos")
                .select("total")
                .eq("sorteo_id", id)
                .in("estado", ["pagado", "confirmado"]);

            if (pedidosError) {
                console.error("Error leyendo pedidos pagados:", pedidosError);
            } else {
                const totalRecaudado =
                    pedidosPagados?.reduce(
                        (acc: number, p: any) => acc + (p.total ?? 0),
                        0
                    ) ?? 0;
                setRecaudadoReal(totalRecaudado);
            }

            setLoading(false);
        };

        fetchAll();
    }, [id]);

    // Stats del sorteo actual (mostradas en las cards)
    const totalNumeros = useMemo(
        () => (sorteo?.total_numeros ? Number(sorteo.total_numeros) : 0),
        [sorteo]
    );

    // 🔥 Siempre usamos el valor real que viene de la vista
    const numerosVendidos = useMemo(
        () =>
            sorteo?.numeros_vendidos_reales != null
                ? Number(sorteo.numeros_vendidos_reales)
                : 0,
        [sorteo]
    );

    const precioNumero = useMemo(
        () => (sorteo?.precio_numero ? Number(sorteo.precio_numero) : 0),
        [sorteo]
    );

    // recaudado real (o calculado como respaldo)
    const recaudado = useMemo(() => {
        if (recaudadoReal != null) return recaudadoReal;
        return numerosVendidos * precioNumero;
    }, [recaudadoReal, numerosVendidos, precioNumero]);

    const numerosRestantes = Math.max(totalNumeros - numerosVendidos, 0);
    const progreso =
        totalNumeros > 0 ? (numerosVendidos / totalNumeros) * 100 : 0;

    const handleResetSorteo = async () => {
        if (!sorteo) return;

        const confirmar = window.confirm(
            "¿Seguro que quieres resetear este sorteo?\n\nSe borrarán TODOS los pedidos y números asignados de esta actividad. Esta acción es solo para pruebas."
        );

        if (!confirmar) return;

        try {
            setResetting(true);

            const res = await fetch("/api/admin/reset-sorteo", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sorteoId: sorteo.id }),
            });

            const data = await res.json();

            if (!res.ok || !data.ok) {
                alert(
                    "No se pudo resetear el sorteo: " +
                    (data?.error || res.statusText || "Error desconocido")
                );
                return;
            }

            alert(
                "Sorteo reseteado correctamente. Se borraron pedidos y números asignados."
            );
            window.location.reload();
        } catch (e) {
            console.error("Error reseteando sorteo:", e);
            alert("Ocurrió un error al resetear el sorteo.");
        } finally {
            setResetting(false);
        }
    };

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
                <header className="space-y-3 md:space-y-0 md:flex md:items-center md:justify-between">
                    <div>
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
                    </div>

                    <button
                        onClick={handleResetSorteo}
                        disabled={resetting}
                        className="mt-3 md:mt-0 rounded-full border border-red-500/60 bg-red-500/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-red-300 hover:bg-red-500/20 disabled:opacity-40"
                    >
                        {resetting ? "Reseteando..." : "Resetear sorteo (pruebas)"}
                    </button>
                </header>

                {/* Resumen del sorteo (card grande + card lateral) */}
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

                    {/* Tarjeta lateral con KPIs (una sola card) */}
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-4 flex flex-col justify-between">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 mb-2">
                            Resumen de números
                        </p>

                        <div className="space-y-3 text-sm">
                            <div className="flex items-baseline justify-between">
                                <span className="text-slate-400 text-xs">
                                    Números vendidos
                                </span>
                                <span className="font-semibold text-base">
                                    {numerosVendidos}{" "}
                                    <span className="text-xs text-slate-400">
                                        / {totalNumeros || "—"}
                                    </span>
                                </span>
                            </div>

                            <div className="flex items-baseline justify-between">
                                <span className="text-slate-400 text-xs">
                                    Números restantes
                                </span>
                                <span className="font-semibold text-base">
                                    {numerosRestantes}
                                </span>
                            </div>

                            <div className="flex items-baseline justify-between">
                                <span className="text-slate-400 text-xs">Recaudado</span>
                                <span className="font-semibold text-base">
                                    ${recaudado.toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Formulario completo */}
                <EditSorteoForm
                    sorteo={sorteo as any}
                    galeriaInicial={
                        Array.isArray(sorteo.galeria_urls) ? sorteo.galeria_urls : []
                    }
                />
            </div>
        </main>
    );
}
