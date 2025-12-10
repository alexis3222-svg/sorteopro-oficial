// app/admin/numeros/page.tsx
"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { Anton } from "next/font/google";

const anton = Anton({
    subsets: ["latin"],
    weight: "400",
});

type NumeroAsignado = {
    numero: number;
};

type PedidoInfo = {
    id: number;
    nombre: string | null;
    telefono: string | null;
    actividad_numero: number | null;
    cantidad_numeros: number | null;
    estado: string | null;
};

export default function AdminNumerosPage() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const pedidoParam = searchParams.get("pedido");
    const pedidoId = pedidoParam ? Number(pedidoParam) : null;

    const [loading, setLoading] = useState(true);
    const [pedido, setPedido] = useState<PedidoInfo | null>(null);
    const [numeros, setNumeros] = useState<NumeroAsignado[]>([]);
    const [error, setError] = useState<string | null>(null);

    // Redirigir si el parámetro es inválido
    useEffect(() => {
        if (!pedidoParam || pedidoId === null || Number.isNaN(pedidoId)) {
            router.replace("/admin/pedidos");
        }
    }, [pedidoParam, pedidoId, router]);

    // Cargar datos
    useEffect(() => {
        const cargarDatos = async () => {
            if (!pedidoId || Number.isNaN(pedidoId)) return;

            setLoading(true);
            setError(null);

            // 1) Pedido
            const { data: pedidoData, error: pedidoError } = await supabase
                .from("pedidos")
                .select(
                    `
          id,
          nombre,
          telefono,
          actividad_numero,
          cantidad_numeros,
          estado
        `
                )
                .eq("id", pedidoId)
                .maybeSingle();

            if (pedidoError || !pedidoData) {
                console.error("Error cargando pedido:", pedidoError);
                setError(`No se encontró el pedido #${pedidoId}.`);
                setLoading(false);
                return;
            }

            setPedido(pedidoData as PedidoInfo);

            // 2) Números asignados
            const { data: numerosData, error: numerosError } = await supabase
                .from("numeros_asignados")
                .select("numero")
                .eq("pedido_id", pedidoId)
                .order("numero", { ascending: true });

            if (numerosError) {
                console.error("Error cargando numeros_asignados:", numerosError);
                setError("Ocurrió un error al cargar los números asignados.");
            } else {
                setNumeros((numerosData || []) as NumeroAsignado[]);
            }

            setLoading(false);
        };

        cargarDatos();
    }, [pedidoId]);

    // 🎨 Estilos dinámicos del estado
    const estadoRaw = (pedido?.estado || "").toString();
    const estadoLower = estadoRaw.toLowerCase();
    const estadoLabel = estadoRaw ? estadoRaw.toUpperCase() : "SIN ESTADO";

    let estadoClasses =
        "border-slate-500/40 bg-slate-500/15 text-slate-200";

    if (estadoLower === "pagado" || estadoLower === "confirmado") {
        estadoClasses =
            "border-emerald-400/60 bg-emerald-500/15 text-emerald-200";
    } else if (estadoLower === "pendiente") {
        estadoClasses =
            "border-amber-400/60 bg-amber-500/15 text-amber-200";
    } else if (estadoLower === "cancelado") {
        estadoClasses =
            "border-red-400/60 bg-red-500/15 text-red-200";
    }

    // Pantalla intermedia mientras se hace replace()
    if (!pedidoParam || pedidoId === null || Number.isNaN(pedidoId)) {
        return (
            <main className="min-h-screen bg-[#050609] text-slate-100 flex items-center justify-center">
                <p className="text-xs text-slate-400">
                    Redirigiendo a la lista de pedidos...
                </p>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[#050609] text-slate-100">
            <div className="mx-auto max-w-4xl px-4 py-8 flex flex-col gap-6">
                {/* HEADER ELEGANTE */}
                <header className="mb-2 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-orange-400">
                            SORTEOPRO • ADMIN
                        </p>
                        <h1
                            className={`${anton.className} mt-1 text-2xl md:text-3xl tracking-wide`}
                        >
                            Detalle de pedido
                        </h1>
                        <p className="mt-1 text-xs md:text-sm text-slate-400">
                            Visualiza los números asignados al cliente para esta actividad.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 justify-start md:justify-end">
                        <Link
                            href="/admin/pedidos"
                            className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-100 hover:bg-white/10 transition"
                        >
                            <span className="mr-2 text-lg leading-none">←</span>
                            Volver a pedidos
                        </Link>

                        <Link
                            href="/admin"
                            className="inline-flex items-center rounded-full border border-white/20 bg-white/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-100 hover:bg-white/10 transition"
                        >
                            Panel admin
                        </Link>
                    </div>
                </header>

                {loading ? (
                    <p className="text-sm text-slate-300">Cargando información...</p>
                ) : error ? (
                    <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-6 py-4 text-sm text-red-200">
                        {error}
                    </div>
                ) : !pedido ? (
                    <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-6 py-4 text-sm text-red-200">
                        No se encontró el pedido #{pedidoId}.
                    </div>
                ) : (
                    <>
                        {/* 🔥 Tarjeta del pedido mejorada */}
                        <section className="mb-2 rounded-2xl border border-white/10 bg-gradient-to-br from-[#11121a] via-[#0c0d14] to-[#050609] px-6 py-5 shadow-xl shadow-black/40">
                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                <div>
                                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                                        Pedido #{pedido.id}
                                    </p>
                                    <p className="text-lg font-semibold">
                                        {pedido.nombre || "Cliente sin nombre"}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-400">
                                        Teléfono: {pedido.telefono || "—"}
                                    </p>
                                </div>

                                <span
                                    className={`inline-flex items-center justify-center rounded-full border px-3 py-1 text-[10px] font-semibold tracking-[0.18em] ${estadoClasses}`}
                                >
                                    <span className="mr-1 inline-block h-2 w-2 rounded-full bg-current" />
                                    {estadoLabel}
                                </span>
                            </div>

                            <div className="mt-4 grid grid-cols-1 gap-3 text-[11px] text-slate-300 sm:grid-cols-2 md:grid-cols-4">
                                <div>
                                    <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                                        Actividad
                                    </p>
                                    <p className="mt-1">#{pedido.actividad_numero ?? "—"}</p>
                                </div>

                                <div>
                                    <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                                        Cantidad de números
                                    </p>
                                    <p className="mt-1">
                                        {pedido.cantidad_numeros ?? "—"}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                                        ID de pedido
                                    </p>
                                    <p className="mt-1">{pedido.id}</p>
                                </div>

                                <div>
                                    <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                                        Resumen
                                    </p>
                                    <p className="mt-1">
                                        {pedido.cantidad_numeros
                                            ? `Cliente compró ${pedido.cantidad_numeros} número(s).`
                                            : "Sin detalle de cantidad."}
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* Números asignados */}
                        <section className="rounded-2xl border border-white/10 bg-[#11121a] px-6 py-5 shadow-lg">
                            <h3 className="text-sm font-semibold mb-3">
                                Números asignados
                            </h3>

                            {numeros.length === 0 ? (
                                <p className="text-xs text-slate-400">
                                    No se encontraron números asignados para este pedido.
                                </p>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {numeros.map((item) => (
                                        <span
                                            key={item.numero}
                                            className="px-3 py-1 rounded-full bg-[#fff1e6] text-[#ff6600] border border-[#ff6600]/40 text-xs font-semibold shadow-sm"
                                        >
                                            #{String(item.numero).padStart(5, "0")}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </section>
                    </>
                )}

                <div className="mt-2">
                    <Link
                        href="/admin/pedidos"
                        className="inline-flex items-center rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-100 hover:bg-white/10"
                    >
                        Volver a pedidos
                    </Link>
                </div>
            </div>
        </main>
    );
}
