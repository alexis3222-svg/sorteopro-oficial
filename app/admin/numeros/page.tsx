// app/admin/numeros/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

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
    const router = useRouter();

    const [pedidoId, setPedidoId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [pedido, setPedido] = useState<PedidoInfo | null>(null);
    const [numeros, setNumeros] = useState<NumeroAsignado[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Leer ?pedido= desde la URL en el cliente (sin useSearchParams)
        if (typeof window === "undefined") return;

        const params = new URLSearchParams(window.location.search);
        const pedidoParam = params.get("pedido");

        if (!pedidoParam) {
            setError("Falta el ID de pedido en la URL.");
            setLoading(false);
            return;
        }

        const id = Number(pedidoParam);
        if (!id || Number.isNaN(id)) {
            setError("El ID de pedido en la URL no es válido.");
            setLoading(false);
            return;
        }

        setPedidoId(id);

        async function load(idNum: number) {
            try {
                setLoading(true);
                setError(null);

                // 1) Traer datos del pedido (solo lectura)
                const { data: pedidoData, error: pedidoError } = await supabase
                    .from("pedidos")
                    .select(
                        "id, nombre, telefono, actividad_numero, cantidad_numeros, estado"
                    )
                    .eq("id", idNum)
                    .single();

                if (pedidoError || !pedidoData) {
                    console.error("Error leyendo pedido:", pedidoError);
                    setError("No se encontró el pedido.");
                    setLoading(false);
                    return;
                }

                setPedido(pedidoData as PedidoInfo);

                // 2) Traer números YA asignados (solo lectura)
                const { data: nums, error: numsError } = await supabase
                    .from("numeros_asignados")
                    .select("numero")
                    .eq("pedido_id", idNum)
                    .order("numero", { ascending: true });

                if (numsError) {
                    console.error("Error leyendo numeros_asignados:", numsError);
                    setError("Error leyendo los números asignados.");
                    setLoading(false);
                    return;
                }

                setNumeros((nums || []) as NumeroAsignado[]);
            } catch (err: any) {
                console.error("Error inesperado en /admin/numeros:", err);
                setError(
                    err?.message || "Error inesperado al cargar los números."
                );
            } finally {
                setLoading(false);
            }
        }

        load(id);
    }, []);

    if (loading) {
        return (
            <div className="mx-auto max-w-3xl px-4 py-8 text-center text-sm text-slate-200">
                Cargando números del pedido{" "}
                {pedidoId ? `#${pedidoId}` : "..."}...
            </div>
        );
    }

    if (error) {
        return (
            <div className="mx-auto max-w-3xl px-4 py-8 text-center text-sm text-red-400">
                <p>{error}</p>
                <Link
                    href="/admin/pedidos"
                    className="mt-4 inline-block text-[#ff9933] underline"
                >
                    ← Volver a pedidos
                </Link>
            </div>
        );
    }

    const estado = (pedido?.estado || "pendiente").toLowerCase();
    const isPagado = estado === "pagado" || estado === "confirmado";

    return (
        <div className="mx-auto max-w-3xl px-4 py-8 text-slate-100">
            <div className="mb-4">
                <button
                    onClick={() => router.back()}
                    className="mb-4 rounded-full border border-white/30 px-3 py-1 text-[11px] uppercase tracking-[0.15em] text-slate-100 hover:bg-white/10"
                >
                    ← Volver
                </button>

                <h1 className="text-xl font-bold">
                    Números del pedido #{pedido?.id}
                </h1>
                <p className="text-sm text-slate-400 mt-1">
                    Cliente: {pedido?.nombre || "Sin nombre"} · Teléfono:{" "}
                    {pedido?.telefono || "-"}
                </p>
                <p className="text-sm text-slate-400">
                    Actividad #{pedido?.actividad_numero || "-"} · Cantidad de
                    números: {pedido?.cantidad_numeros ?? "-"} · Estado:{" "}
                    <span
                        className={
                            isPagado ? "text-emerald-300" : "text-yellow-300"
                        }
                    >
                        {estado.toUpperCase()}
                    </span>
                </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#14151c] p-4">
                {numeros.length === 0 ? (
                    <p className="text-sm text-slate-400">
                        Este pedido aún no tiene números asignados.
                        {isPagado
                            ? " Revisa que la asignación se haya ejecutado correctamente en el botón PAGADO."
                            : " Marca el pedido como PAGADO en la tabla de pedidos para asignarlos."}
                    </p>
                ) : (
                    <>
                        <p className="text-sm text-slate-400 mb-2">
                            Números asignados ({numeros.length}):
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {numeros.map((n) => (
                                <span
                                    key={n.numero}
                                    className="px-3 py-1 rounded-full bg-[#fff1e6] text-[#ff6600] font-semibold border border-[#ff6600]/40 shadow-sm text-sm"
                                >
                                    #{n.numero}
                                </span>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
