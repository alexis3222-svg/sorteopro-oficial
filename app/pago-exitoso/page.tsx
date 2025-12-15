"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function PagoExitosoPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Cargando...</div>}>
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

    const safeTx = tx ?? ""; // ✅ siempre string (para TS)

    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [pedidoId, setPedidoId] = useState<number | null>(null);
    const [estado, setEstado] = useState<string | null>(null);

    useEffect(() => {
        const run = async () => {
            if (!tx) return; // ✅ evita null

            try {
                const res = await fetch(
                    `/api/payphone/confirmar?tx=${encodeURIComponent(tx)}`,
                    { method: "GET", cache: "no-store" }
                );

                const data = await res.json();
                // ... tu lógica actual
            } catch (e) {
                console.error(e);
            }
        };

        run();
    }, [tx]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                Verificando pago...
            </div>
        );
    }

    return (
        <main className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
            <div className="p-6 w-full max-w-md bg-white rounded-2xl shadow">
                <h1 className="text-xl font-bold text-orange-600">
                    {estado === "pagado" ? "¡Pago confirmado!" : "Pago en verificación"}
                </h1>

                <p className="mt-2 text-gray-700">
                    {estado === "pagado"
                        ? "Tu pago fue confirmado y tus números serán asignados."
                        : "Aún no hay confirmación oficial del pago. Si ya pagaste, espera un momento."}
                </p>

                {errorMsg && <p className="mt-3 text-red-500 text-sm">{errorMsg}</p>}

                <div className="mt-4 text-sm text-slate-600 space-y-1">
                    <div>
                        <strong>Tx:</strong> {tx}
                    </div>
                    {pedidoId && (
                        <div>
                            <strong>Pedido ID:</strong> {pedidoId}
                        </div>
                    )}
                    {estado && (
                        <div>
                            <strong>Estado:</strong> {estado}
                        </div>
                    )}
                </div>

                <button
                    className="mt-5 bg-orange-500 text-white px-4 py-2 rounded-xl w-full font-semibold disabled:opacity-50"
                    disabled={!tx} // ✅ no permite click si no hay tx
                    onClick={() => router.push(`/mi-compra?tx=${encodeURIComponent(safeTx)}`)}
                >
                    Ver mi compra
                </button>

                <button
                    className="mt-3 bg-gray-200 px-4 py-2 rounded-xl w-full font-semibold"
                    onClick={() => router.push("/")}
                >
                    Regresar al inicio
                </button>
            </div>
        </main>
    );
}
