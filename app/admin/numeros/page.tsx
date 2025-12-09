// app/admin/numeros/page.tsx
"use client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
// opcional: export const revalidate = 0;

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

    // 🔹 Leer el ?pedido= desde el navegador, sin useSearchParams
    useEffect(() => {
        if (typeof window === "undefined") return;

        const params = new URLSearchParams(window.location.search);
        const pedidoIdParam = params.get("pedido");

        if (!pedidoIdParam) {
            setError("Falta el parámetro ?pedido en la URL");
            setLoading(false);
            return;
        }

        const idNum = Number(pedidoIdParam);
        if (Number.isNaN(idNum)) {
            setError("El parámetro ?pedido no es un número válido");
            setLoading(false);
            return;
        }

        setPedidoId(idNum);
    }, []);

    // 🔹 Cargar info del pedido + números asignados
    useEffect(() => {
        if (pedidoId == null) return;

        const cargarDatos = async () => {
            setLoading(true);
            setError(null);

            // 1) Info del pedido
            const { data: pedidoData, error: pedidoError } = await supabase
                .from("pedidos")
                .select("id, nombre, telefono, actividad_numero, cantidad_numeros, estado")
                .eq("id", pedidoId)
                .maybeSingle();

            if (pedidoError || !pedidoData) {
                console.error("Error cargando pedido:", pedidoError);
                setError("No se encontró el pedido");
                setLoading(false);
                return;
            }

            setPedido(pedidoData);

            // 2) Números ya asignados
            const { data: numerosData, error: numerosError } = await supabase
                .from("numeros")
                .select("numero")
                .eq("pedido_id", pedidoId)
                .order("numero", { ascending: true });

            if (numerosError) {
                console.error("Error cargando números:", numerosError);
                setError("Error cargando números asignados");
                setLoading(false);
                return;
            }

            setNumeros(numerosData || []);
            setLoading(false);
        };

        cargarDatos();
    }, [pedidoId]);

    if (loading) {
        return <p className="p-4">Cargando...</p>;
    }

    if (error) {
        return (
            <main className="p-4">
                <p className="text-red-600 mb-4">{error}</p>
                <Link href="/admin/pedidos" className="text-blue-600 hover:underline">
                    Volver a pedidos
                </Link>
            </main>
        );
    }

    if (!pedido) {
        return (
            <main className="p-4">
                <p className="mb-4">Pedido no encontrado.</p>
                <Link href="/admin/pedidos" className="text-blue-600 hover:underline">
                    Volver a pedidos
                </Link>
            </main>
        );
    }

    return (
        <main className="p-4 space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold">Números del pedido #{pedido.id}</h1>
                <Link
                    href="/admin/pedidos"
                    className="text-sm text-blue-600 hover:underline"
                >
                    Volver a pedidos
                </Link>
            </div>

            <section className="border rounded-lg p-4 space-y-2 bg-white shadow">
                <p>
                    <strong>Nombre:</strong> {pedido.nombre}
                </p>
                <p>
                    <strong>Teléfono:</strong> {pedido.telefono}
                </p>
                <p>
                    <strong>Actividad:</strong> {pedido.actividad_numero}
                </p>
                <p>
                    <strong>Cantidad de números:</strong> {pedido.cantidad_numeros}
                </p>
                <p>
                    <strong>Estado:</strong>{" "}
                    <span
                        className={
                            pedido.estado === "pagado"
                                ? "text-green-600 font-semibold"
                                : "text-orange-600 font-semibold"
                        }
                    >
                        {pedido.estado}
                    </span>
                </p>
            </section>

            <section className="border rounded-lg p-4 bg-white shadow">
                <h2 className="font-semibold mb-2">Números asignados</h2>
                {numeros.length === 0 ? (
                    <p className="text-gray-500 text-sm">
                        Aún no hay números asignados a este pedido.
                    </p>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {numeros.map((n) => (
                            <span
                                key={n.numero}
                                className="inline-flex items-center justify-center px-3 py-1 rounded-full border text-sm"
                            >
                                {n.numero}
                            </span>
                        ))}
                    </div>
                )}
            </section>
        </main>
    );
}
