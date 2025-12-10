"use client";

import { useSearchParams, useRouter } from "next/navigation";

export default function PagoExitosoPage() {
    const searchParams = useSearchParams();
    const router = useRouter();

    // Acepta TODOS los nombres que PayPhone puede enviar
    const tx =
        searchParams.get("clientTransactionId") ||
        searchParams.get("id") ||
        searchParams.get("transactionId") ||
        searchParams.get("clientTxId") ||
        searchParams.get("tx");

    if (!tx) {
        return (
            <main className="min-h-screen flex items-center justify-center">
                <div className="p-6 max-w-md bg-white rounded-xl shadow">
                    <h2 className="text-xl font-bold text-red-600">
                        Falta el identificador de compra
                    </h2>
                    <p className="mt-2 text-gray-600">
                        No se recibió el código de transacción en la URL.
                    </p>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen flex items-center justify-center">
            <div className="p-6 max-w-md bg-white rounded-xl shadow">
                <h1 className="text-xl font-bold text-orange-600">
                    ¡Pago realizado con éxito!
                </h1>
                <p className="mt-2">Tu compra fue procesada correctamente.</p>

                <button
                    className="mt-4 bg-orange-500 text-white px-4 py-2 rounded"
                    onClick={() => router.push(`/mi-compra?tx=${tx}`)}
                >
                    Ver mi compra
                </button>
            </div>
        </main>
    );
}
