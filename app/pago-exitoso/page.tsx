"use client";

import { useSearchParams, useRouter } from "next/navigation";

export default function PagoExitosoPage() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const tx =
        searchParams.get("clientTransactionId") ||
        searchParams.get("tx") ||
        searchParams.get("id");

    const entries = Array.from(searchParams.entries());

    return (
        <main className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
            <div className="p-6 max-w-md bg-white rounded-xl shadow">
                <h1 className="text-xl font-bold text-orange-600 mb-2">
                    ¡Pago realizado con éxito!
                </h1>

                {tx ? (
                    <p className="mt-2 text-gray-700">
                        Hemos recibido tu pago correctamente.
                    </p>
                ) : (
                    <p className="mt-2 text-red-600 text-sm">
                        No se recibió el código de transacción en la URL
                        (<code>tx</code>, <code>clientTransactionId</code> ni{" "}
                        <code>id</code>).
                    </p>
                )}

                {/* 🔍 DEBUG: mostrar TODO lo que realmente llega en la URL */}
                <div className="mt-3 text-xs text-gray-600 border-t pt-2">
                    <p className="font-semibold mb-1">Parámetros recibidos:</p>
                    {entries.length === 0 ? (
                        <p className="text-gray-400">No llegó ningún parámetro.</p>
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
                    disabled={!tx}
                    className="mt-4 bg-orange-500 text-white px-4 py-2 rounded w-full disabled:opacity-50"
                    onClick={() => tx && router.push(`/mi-compra?tx=${tx}`)}
                >
                    Ver mi compra
                </button>

                <button
                    className="mt-2 bg-gray-100 text-gray-700 px-4 py-2 rounded w-full border"
                    onClick={() => router.push("/")}
                >
                    Regresar al inicio
                </button>
            </div>
        </main>
    );
}
