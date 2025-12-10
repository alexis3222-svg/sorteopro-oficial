"use client";

import { useSearchParams, useRouter } from "next/navigation";

export default function PagoExitosoPage() {
    const searchParams = useSearchParams();
    const router = useRouter();

    // Aceptar todas las variantes posibles de PayPhone
    const tx =
        searchParams.get("clientTransactionId") ||
        searchParams.get("id") ||
        searchParams.get("transactionId") ||
        searchParams.get("clientTxId") ||
        searchParams.get("tx");

    const entries = Array.from(searchParams.entries());

    const tieneTx = Boolean(tx);

    return (
        <main className="min-h-screen flex items-center justify-center bg-[#f5f6f8] px-4">
            <div className="w-full max-w-md rounded-3xl bg-white shadow-lg border border-orange-200 p-6">
                <h1 className="text-2xl font-bold text-orange-600 text-center mb-2">
                    ¡Pago realizado con éxito!
                </h1>

                {tieneTx ? (
                    <p className="text-center text-gray-700 mb-2">
                        Hemos recibido tu pago correctamente.
                    </p>
                ) : (
                    <p className="text-center text-red-600 text-sm mb-2">
                        No se recibió el código de transacción en la URL.
                    </p>
                )}

                {/* DEBUG: ver exactamente qué llega en la URL */}
                <div className="mt-3 text-xs text-gray-600 border-t pt-3">
                    <p className="font-semibold mb-1 text-center">
                        Parámetros recibidos:
                    </p>
                    {entries.length === 0 ? (
                        <p className="text-center text-gray-400">
                            No llegó ningún parámetro.
                        </p>
                    ) : (
                        <ul className="list-disc list-inside space-y-0.5">
                            {entries.map(([k, v]) => (
                                <li key={k}>
                                    <strong>{k}</strong>: {v}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <button
                    disabled={!tieneTx}
                    className="mt-5 w-full rounded-full bg-orange-500 text-white font-semibold py-2 disabled:opacity-40 disabled:cursor-not-allowed"
                    onClick={() => tx && router.push(`/mi-compra?tx=${encodeURIComponent(tx)}`)}
                >
                    Ver mi compra
                </button>

                <button
                    className="mt-2 w-full rounded-full bg-gray-100 text-gray-800 font-medium py-2 border border-gray-200"
                    onClick={() => router.push("/")}
                >
                    Regresar al inicio
                </button>
            </div>
        </main>
    );
}
