// app/mi-compra/MiCompraClient.tsx
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
    sorteo_id: string | null;
    actividad_numero: number | null;
    cantidad_numeros: number | null;
    precio_unitario: number | null;
    total: number | null;
    metodo_pago: string | null;
    nombre: string | null;
    telefono: string | null;
    correo: string | null;
    estado: string | null;
    created_at: string;
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

    useEffect(() => {
        if (!tx) return;

        async function loadData() {
            setLoading(true);

            const { data, error } = await supabase
                .from("pedidos") // 👈 tabla real en Supabase
                .select("*")
                .eq("payphone_client_transaction_id", tx)
                .single();

            if (error) {
                console.error("Error cargando pedido:", error);
                setPedido(null);
            } else {
                setPedido(data as Pedido);
            }

            setLoading(false);
        }

        loadData();
    }, [tx]);

    // 👉 Caso: no vino tx en la URL
    if (!tx) {
        return (
            <div className="flex items-center justify-center px-4 pt-32 pb-12">
                <div className="w-full max-w-md rounded-2xl bg-white shadow-lg p-6 text-center">
                    <h1 className="text-xl font-bold mb-2 text-red-600">
                        Falta el identificador de compra
                    </h1>
                    <p className="text-gray-700 text-sm">
                        No se encontró el parámetro <code>tx</code> en la URL.
                    </p>
                </div>
            </div>
        );
    }

    // 👉 Caso: cargando desde Supabase
    if (loading) {
        return (
            <div className="flex items-center justify-center px-4 pt-32 pb-12">
                <p className="text-gray-600 text-sm">Buscando tu compra...</p>
            </div>
        );
    }

    // 👉 Caso: no se encontró el pedido
    if (!pedido) {
        return (
            <div className="flex items-center justify-center px-4 pt-32 pb-12">
                <div className="w-full max-w-md rounded-2xl bg-white shadow-lg p-6 text-center">
                    <h1 className="text-xl font-bold mb-2 text-red-600">
                        Compra no encontrada
                    </h1>
                    <p className="text-gray-700 text-sm">
                        No existe ninguna compra registrada con el código:
                    </p>
                    <p className="font-mono text-xs bg-gray-100 px-3 py-2 rounded mt-3 break-all">
                        {tx}
                    </p>

                    <div className="mt-6 flex justify-center">
                        <a
                            href="/"
                            className="bg-[#ff6600] hover:bg-[#ff7f26] text-white font-semibold px-6 py-2 rounded-lg shadow"
                        >
                            Regresar al sorteo
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    // 👉 Caso: pedido encontrado ✅
    const totalFormateado =
        pedido.total != null ? Number(pedido.total).toFixed(2) : "-";

    return (
        <div className="flex items-center justify-center px-4 pt-32 pb-12">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-lg p-6">
                <h1 className="text-2xl font-bold mb-4 text-[#ff6600]">
                    Detalle de tu compra
                </h1>

                <div className="space-y-2 text-sm">
                    <p>
                        <strong>Nombre:</strong> {pedido.nombre}
                    </p>
                    <p>
                        <strong>Teléfono:</strong> {pedido.telefono}
                    </p>
                    <p>
                        <strong>Email:</strong> {pedido.correo}
                    </p>
                    <p>
                        <strong>Cantidad de números:</strong> {pedido.cantidad_numeros}
                    </p>
                    <p>
                        <strong>Total:</strong> ${totalFormateado}
                    </p>
                    <p>
                        <strong>Método de pago:</strong> {pedido.metodo_pago}
                    </p>
                    <p>
                        <strong>Estado:</strong> {pedido.estado}
                    </p>
                    <p>
                        <strong>Fecha:</strong>{" "}
                        {pedido.created_at
                            ? new Date(pedido.created_at).toLocaleString("es-EC")
                            : "-"}
                    </p>

                    <div className="pt-2">
                        <p className="font-semibold text-xs mb-1">
                            ID de transacción PayPhone:
                        </p>
                        <p className="font-mono text-[11px] bg-gray-100 px-3 py-2 rounded break-all">
                            {pedido.payphone_client_transaction_id}
                        </p>
                    </div>
                </div>

                {/* 🔙 Botón de retorno */}
                <div className="mt-6 flex justify-center">
                    <a
                        href="/"
                        className="bg-[#ff6600] hover:bg-[#ff7f26] text-white font-semibold px-6 py-2 rounded-lg shadow"
                    >
                        Regresar al sorteo
                    </a>
                </div>
            </div>
        </div>
    );
}
