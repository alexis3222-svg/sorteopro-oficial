"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function PagoExitosoContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const tx =
        searchParams.get("clientTransactionId") ||
        searchParams.get("tx") ||
        searchParams.get("id");

    return (
        <main className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
            <div
                className="w-full max-w-md rounded-2xl bg-white shadow-lg p-6 text-center"
                style={{ border: "2px solid #FF6600" }}
            >
                <h1
                    className="text-2xl font-bold mb-2"
                    style={{ color: "#FF6600" }}
                >
                    ¡Pago realizado con éxito!
                </h1>

                <p className="text-gray-700 mb-2">
                    Hemos recibido tu pago correctamente.
                </p>

                {tx && (
                    <p className="text-xs text-gray-500 mb-4 break-all">
                        ID de transacción: <span className="font-mono font-semibold">{tx}</span>
                    </p>
                )}

                <button
                    onClick={() => router.push("/")}
                    className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg mb-2 transition-all"
                >
                    Volver al inicio
                </button>

                {tx && (
                    <button
                        onClick={() =>
                            router.push(`/mi-compra?tx=${encodeURIComponent(tx)}`)
                        }
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-4 rounded-lg transition-all"
                    >
                        Ver mi compra
                    </button>
                )}
            </div>
        </main>
    );
}

export default function PagoExitosoPage() {
    return (
        <Suspense
            fallback={
                <main className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
                    <p className="text-sm text-gray-600">
                        Cargando detalle de tu pago...
                    </p>
                </main>
            }
        >
            <PagoExitosoContent />
        </Suspense>
    );
}
