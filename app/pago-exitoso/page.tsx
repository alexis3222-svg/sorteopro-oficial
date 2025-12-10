"use client";

import { useSearchParams, useRouter } from "next/navigation";

export default function PagoExitosoPage() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const tx =
        searchParams.get("clientTransactionId") ||
        searchParams.get("tx") ||
        searchParams.get("id");

    if (!tx) {
        const entries = Array.from(searchParams.entries());

        return (
            <main className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
                <div className="p-6 max-w-md bg-white rounded-xl shadow">
                    <h2 className="text-xl font-bold text-red-600 mb-2">
                        Falta el identificador de compra
                    </h2>
                    <p className="mt-2 text-gray-600 mb-4">
                        No se encontró el parámetro <code>tx</code> (ni
                        <code>clientTransactionId</code> ni <code>id</code>) en la URL.
                    </p>

                    {entries.length > 0 && (
                        <div className="text-xs text-gray-500 border-t pt-3">
                            <p className="font-semibold mb-1">
                                Parámetros recibidos en la URL:
                            </p>
                            <ul className="list-disc list-inside">
                                {entries.map(([k, v]) => (
                                    <li key={k}>
                                        <strong>{k}</strong>: {v}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <button
                        className="mt-4 bg-orange-500 text-white px-4 py-2 rounded w-full"
                        onClick={() => router.push("/")}
                    >
                        Regresar al inicio
                    </button>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
            <div className="p-6 max-w-md bg-white rounded-xl shadow">
                <h1 className="text-xl font-bold text-orange-600 mb-2">
                    ¡Pago realizado con éxito!
                </h1>
                <p className="mt-2 text-gray-700">
                    Hemos recibido tu pago correctamente.
                </p>

                <button
                    className="mt-4 bg-orange-500 text-white px-4 py-2 rounded w-full"
                    onClick={() => router.push(`/mi-compra?tx=${tx}`)}
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
