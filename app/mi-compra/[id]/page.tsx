"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function MiCompraPage() {
    const searchParams = useSearchParams();
    const trx = searchParams.get("trx");

    const [pedido, setPedido] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!trx) return;

        async function fetchPedido() {
            const { data, error } = await supabase
                .from("pedidos")
                .select("*")
                .eq("client_transaction_id", trx)
                .single();

            if (!error && data) {
                setPedido(data);
            }

            setLoading(false);
        }

        fetchPedido();
    }, [trx]);

    if (loading) {
        return (
            <div className="p-10 text-center text-lg font-semibold">
                Cargando información de tu compra...
            </div>
        );
    }

    if (!pedido) {
        return (
            <div className="p-10 text-center text-lg font-semibold text-red-600">
                No se encontró información de esta transacción.
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-xl rounded-xl border border-[#FF6600] bg-white p-6 shadow-md mt-10">
            <h1 className="text-center text-2xl font-bold text-[#FF6600]">
                Detalle de tu compra
            </h1>

            <div className="mt-6 space-y-3 text-gray-700">
                <p><strong>Cliente:</strong> {pedido.nombre}</p>
                <p><strong>Teléfono:</strong> {pedido.telefono}</p>
                <p><strong>Pedido #:</strong> {pedido.id}</p>
                <p><strong>Transacción:</strong> {pedido.client_transaction_id}</p>
                <p><strong>Estado del pago:</strong> {pedido.estado}</p>

                <p>
                    <strong>Números comprados:</strong><br />
                    <span className="font-mono">{pedido.numeros.join(", ")}</span>
                </p>

                <p><strong>Monto pagado:</strong> ${pedido.total.toFixed(2)}</p>
            </div>

            <a
                href="/"
                className="mt-6 block rounded-lg bg-[#FF6600] px-6 py-3 text-center text-white font-semibold"
            >
                Volver al inicio
            </a>
        </div>
    );
}
