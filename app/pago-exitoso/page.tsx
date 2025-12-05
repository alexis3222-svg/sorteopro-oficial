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

    const [asignando, setAsignando] = useState(false);
    const [errorAsignacion, setErrorAsignacion] = useState<string | null>(null);
    const [numeros, setNumeros] = useState<number[] | null>(null);

    useEffect(() => {
        if (!tx) return;

        async function asignar() {
            try {
                setAsignando(true);
                setErrorAsignacion(null);

                const res = await fetch("/api/pedidos/asignar", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ tx }),
                });

                const data = await res.json();

                if (!res.ok) {
                    setErrorAsignacion(data.error || "No se pudieron asignar números");
                } else {
                    setNumeros(data.numeros || []);
                }
            } catch (err) {
                setErrorAsignacion("Error de conexión al asignar números");
            } finally {
                setAsignando(false);
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
                        Código de transacción:
                        <span className="font-mono bg-gray-100 px-2 py-1 rounded ml-1">
                            {tx}
                        </span>
                    </p>
                )}

                {asignando && (
                    <p className="text-xs text-gray-500">
                        Asignando tus números en el sorteo...
                    </p>
                )}

                {errorAsignacion && (
                    <p className="text-xs text-red-600">{errorAsignacion}</p>
                )}

                {numeros && numeros.length > 0 && (
                    <div className="mt-4">
                        <p className="text-sm font-semibold">Tus números asignados:</p>
                        <div className="flex flex-wrap justify-center gap-2 mt-2">
                            {numeros.map((n) => (
                                <span
                                    key={n}
                                    className="px-3 py-1 rounded-full bg-[#fff1e6] text-[#ff6600] border border-[#ff6600]/40 text-sm font-semibold shadow-sm"
                                >
                                    #{n}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                <div className="mt-6 flex flex-col gap-2">
                    <button
                        onClick={() => router.push(`/mi-compra?tx=${encodeURIComponent(tx!)}`)}
                        className="w-full bg-[#FF6600] hover:bg-[#ff7f26] text-white font-semibold px-4 py-2 rounded-lg"
                    >
                        Ver mi compra
                    </button>

                    <button
                        onClick={() => router.push(`/`)}
                        className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold px-4 py-2 rounded-lg"
                    >
                        Regresar al inicio
                    </button>
                </div>
            </div>
        </main>
    );
}

export default function PagoExitoso() {
    return (
        <Suspense
            fallback={
                <main className="min-h-screen flex items-center justify-center">
                    Procesando pago...
                </main>
            }
        >
            <PagoExitosoContent />
        </Suspense>
    );
}
