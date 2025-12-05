"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Pedido = {
    id: number;
    nombre: string | null;
    telefono: string | null;
    correo: string | null;
    cantidad_numeros: number | null;
    precio_unitario: number | null;
    total: number | null;
    metodo_pago: string | null;
    estado: string | null;
    created_at: string;
    actividad_numero: number | null;
    sorteo_id: string | null;
    payphone_client_transaction_id: string | null;
};

export default function MiCompraClient() {
    const searchParams = useSearchParams();
    const tx =
        searchParams.get("tx") ||
        searchParams.get("clientTransactionId") ||
        searchParams.get("id");

    const [loading, setLoading] = useState(true);
    const [pedido, setPedido] = useState<Pedido | null>(null);
    const [numeros, setNumeros] = useState<number[]>([]);

    useEffect(() => {
        if (!tx) return;

        async function loadData() {
            setLoading(true);

            // 1️⃣ Buscar el pedido
            const { data: pedidoData, error: pedidoErr } = await supabase
                .from("pedidos")
                .select("*")
                .eq("payphone_client_transaction_id", tx)
                .single();

            if (pedidoErr || !pedidoData) {
                setPedido(null);
                setLoading(false);
                return;
            }

            setPedido(pedidoData as Pedido);

            // 2️⃣ Buscar los números asignados para ese pedido
            const { data: numerosData, error: numerosErr } = await supabase
                .from("numeros_asignados")
                .select("numero")
                .eq("pedido_id", pedidoData.id)
                .order("numero", { ascending: true });

            if (!numerosErr && numerosData) {
                const lista = numerosData.map((n) => n.numero);
                setNumeros(lista);
            }

            setLoading(false);
        }

        loadData();
    }, [tx]);

    // 👉 Si no viene tx en la URL
    if (!tx) {
        return (
            <div className="flex items-center justify-center px-4 pt-32 pb-12">
                <div className="w-full max-w-md rounded-2xl bg-white shadow-lg p-6 text-center">
                    <h1 className="text-xl font-bold mb-2 text-red-600">
                        Falta el identificador de compra
                    </h1>
                    <p>No se encontró el parámetro tx en la URL.</p>
                </div>
            </div>
        );
    }

    // 👉 Cargando
    if (loading) {
        return (
            <div className="flex items-center justify-center px-4 pt-32 pb-12">
                <div className="w-full max-w-md rounded-2xl bg-white shadow-md p-6 text-center">
                    <p className="text-gray-700 text-sm">Cargando detalle de compra...</p>
                </div>
            </div>
        );
    }

    // 👉 Pedido no encontrado
    if (!pedido) {
        return (
            <div className="flex items-center justify-center px-4 pt-32 pb-12">
                <div className="w-full max-w-md rounded-2xl bg-white shadow-lg p-6 text-center">
                    <h1 className="text-xl font-bold mb-2 text-red-600">Compra no encontrada</h1>
                    <p>No existe una compra para el código:</p>

                    <p className="font-mono text-xs bg-gray-100 px-3 py-2 rounded mt-3 break-all">
                        {tx}
                    </p>

                    <a
                        href="/"
                        className="mt-6 inline-block bg-[#ff6600] hover:bg-[#ff7f26] text-white font-semibold px-6 py-2 rounded-lg"
                    >
                        Regresar al inicio
                    </a>
                </div>
            </div>
        );
    }

    const total = pedido.total ? Number(pedido.total).toFixed(2) : "-";

    return (
        <div className="flex justify-center px-4 pt-24 pb-12">
            <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden">

                {/* Encabezado Moderno */}
                <div className="h-2 bg-gradient-to-r from-[#ff6600] to-[#ff8f3d]" />

                <div className="p-6 md:p-10">
                    <h1 className="text-3xl font-extrabold text-gray-900">Detalle de tu compra</h1>

                    <p className="text-sm text-gray-500 mt-1">
                        ID transacción:{" "}
                        <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs">
                            {pedido.payphone_client_transaction_id || tx}
                        </span>
                    </p>

                    {/* Diseño en dos columnas */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">

                        {/* Info del cliente */}
                        <div className="space-y-3 text-sm">
                            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                                Datos del cliente
                            </h2>

                            <p><strong>Nombre:</strong> {pedido.nombre}</p>
                            <p><strong>Teléfono:</strong> {pedido.telefono}</p>
                            <p><strong>Email:</strong> {pedido.correo}</p>

                            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mt-6">
                                Detalle de compra
                            </h2>

                            <p><strong>Cantidad de números:</strong> {pedido.cantidad_numeros}</p>
                            <p><strong>Precio unitario:</strong> ${pedido.precio_unitario}</p>
                            <p><strong>Total pagado:</strong> <span className="font-bold">${total}</span></p>
                            <p><strong>Método de pago:</strong> {pedido.metodo_pago}</p>
                            <p>
                                <strong>Fecha:</strong>{" "}
                                {new Date(pedido.created_at).toLocaleString("es-EC")}
                            </p>
                        </div>

                        {/* Números asignados */}
                        <div>
                            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
                                Números asignados
                            </h2>

                            {numeros.length > 0 ? (
                                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
                                    <p className="text-xs text-gray-500 mb-2">
                                        Estos son tus números que participan en el sorteo:
                                    </p>

                                    <div className="flex flex-wrap gap-2">
                                        {numeros.map((n) => (
                                            <span
                                                key={n}
                                                className="px-3 py-1 rounded-full bg-[#fff1e6] text-[#ff6600] font-semibold border border-[#ff6600]/40 shadow-sm text-sm"
                                            >
                                                #{n}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500">
                                    Aún no se han asignado números a esta compra.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Botón regreso */}
                    <div className="mt-10 text-center">
                        <a
                            href="/"
                            className="bg-[#ff6600] hover:bg-[#ff7f26] text-white font-semibold px-8 py-3 rounded-xl shadow-lg"
                        >
                            Regresar al inicio
                        </a>
                    </div>

                </div>
            </div>
        </div>
    );
}
