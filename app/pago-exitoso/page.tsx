"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function PagoExitosoContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const tx =
        searchParams.get("clientTransactionId") ||
        searchParams.get("tx") ||
        searchParams.get("id");

    const [loadingAsignacion, setLoadingAsignacion] = useState(false);
    const [errorAsignacion, setErrorAsignacion] = useState<string | null>(null);

    useEffect(() => {
        if (!tx) return;

        async function asignar() {
            try {
                setLoadingAsignacion(true);
                setErrorAsignacion(null);

                const res = await fetch("/api/pedidos/asignar", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ tx }),
                });

                const data = await res.json();

                if (!res.ok) {
                    console.error("Error asignando números:", data);
                    setErrorAsignacion(
                        data.error || "No se pudieron asignar los números"
                    );
                }
            } catch (e) {
                console.error(e);
                setErrorAsignacion("Error de conexión al asignar números");
            } finally {
                setLoadingAsignacion(false);
            }
        }

        asignar();
    }, [tx]);

    return (
        <main className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
            <div
                className="w-full max-w-md rounded-2xl bg-white shadow-lg p-6 text-center"
                style={{ border: "2px solid #FF6600" }}
            >
                <h1 className="text-2xl font-bold mb-2" style={{ color: "#FF6600" }}>
                    ¡Pago realizado con éxito!
                </h1>

                <p className="text-gray-700 mb-2">
                    Hemos recibido tu pago correctamente.
                </p>

                {tx && (
                    <p className="text-xs text-gray-500 mb-4">
                        Código de transacción:{" "}
                        <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                            {tx}
                        </span>
                    </p>
                )}

                {loadingAsignacion && (
                    <p className="text-xs text-gray-500 mb-2">
                        Asignando tus números en el sorteo...
                    </p>
                )}

                {errorAsignacion && (
                    <p className="text-xs text-red-600 mb-2">
                        {errorAsignacion}
                    </p>
                )}

                <div className="mt-4 flex flex-col gap-2">
                    <button
                        onClick={() => {
                            if (!tx) return;
                            router.push(`/mi-compra?tx=${encodeURIComponent(tx)}`);
                        }}
                        className="w-full bg-[#FF6600] hover:bg-[#ff7f26] text-white font-semibold px-4 py-2 rounded-lg"
                    >
                        Ver mi compra
                    </button>

                    <button
                        onClick={() => router.push("/")}
                        className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold px-4 py-2 rounded-lg"
                    >
                        Regresar al inicio
                    </button>
                </div>
            </div>
        </main>
    );
}

export default function PagoExitosoPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Procesando pago...</div>}>
            <PagoExitosoContent />
        </Suspense>
    );
}
