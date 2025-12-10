"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function PagoExitosoPage() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <PagoExitosoInner />
        </Suspense>
    );
}

function PagoExitosoInner() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const tx =
        searchParams.get("clientTransactionId") ||
        searchParams.get("tx") ||
        searchParams.get("id");

    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [pedidoId, setPedidoId] = useState<number | null>(null);

    // 🔥 Aquí insertamos la asignación automática
    useEffect(() => {
        if (!tx) {
            setErrorMsg("No se recibió el código de transacción en la URL.");
            setLoading(false);
            return;
        }

        async function procesarPago() {
            try {
                // 1️⃣ Buscar el pedido por tx
                const { data: pedido, error: pedidoError } = await supabase
                    .from("pedidos")
                    .select("id, estado")
                    .eq("payphone_client_transaction_id", tx)
                    .maybeSingle();

                if (pedidoError || !pedido) {
                    setErrorMsg("No se encontró el pedido asociado a esta transacción.");
                    setLoading(false);
                    return;
                }

                setPedidoId(pedido.id);

                // 2️⃣ Llamar al endpoint que marca como pagado y asigna números
                const res = await fetch("/api/admin/pedidos/marcar-pagado", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ pedidoId: pedido.id })
                });

                const result = await res.json();

                if (!result.ok) {
                    console.error("Error asignando números:", result);
                    setErrorMsg("El pago fue recibido, pero no se pudieron asignar los números.");
                }
            } catch (err) {
                console.error(err);
                setErrorMsg("Ocurrió un error procesando la compra.");
            }

            setLoading(false);
        }

        procesarPago();
    }, [tx]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                Procesando pedido...
            </div>
        );
    }

    return (
        <main className="min-h-screen flex items-center justify-center">
            <div className="p-6 max-w-md bg-white rounded-xl shadow">

                <h1 className="text-xl font-bold text-orange-600">
                    ¡Pago realizado con éxito!
                </h1>

                <p className="mt-2">Hemos recibido tu pago correctamente.</p>

                {errorMsg && (
                    <p className="mt-2 text-red-500 text-sm">{errorMsg}</p>
                )}

                {pedidoId && (
                    <ul className="mt-4 text-sm text-slate-600">
                        <li><strong>clientTransactionId:</strong> {tx}</li>
                        <li><strong>Pedido ID:</strong> {pedidoId}</li>
                    </ul>
                )}

                <button
                    className="mt-4 bg-orange-500 text-white px-4 py-2 rounded w-full"
                    onClick={() => router.push(`/mi-compra?tx=${tx}`)}
                >
                    Ver mi compra
                </button>

                <button
                    className="mt-3 bg-gray-200 px-4 py-2 rounded w-full"
                    onClick={() => router.push("/")}
                >
                    Regresar al inicio
                </button>
            </div>
        </main>
    );
}
