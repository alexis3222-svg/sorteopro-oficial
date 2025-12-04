"use client";
export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function PagoExitosoContent() {
    const searchParams = useSearchParams();
    const tx =
        searchParams.get("clientTransactionId") ||
        searchParams.get("tx") ||
        searchParams.get("id");
    const router = useRouter();

    return (
        <main className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
            <div
                className="w-full max-w-md rounded-2xl bg-white shadow-lg p-6 text-center"
                style={{
                    border: "2px solid #FF6600",
                }}
            >
                <h1 className="text-2xl font-bold mb-2" style={{ color: "#FF6600" }}>
                    ¡Pago realizado con éxito!
                </h1>

                <p className="text-gray-700 mb-2">
                    Hemos recibido tu pago correctamente.
                </p>

                {tx && (
                    <p className="text-xs text-gray-500 mb-4">
                        Transacción:{" "}
                        <span className="font-mono break-all">{tx}</span>
                    </p>
                )}

                {/* BOTÓN VOLVER AL INICIO */}
                <button
                    onClick={() => router.push("/")}
                    className="mt-4 w-full rounded-xl px-4 py-2 text-sm font-semibold text-white"
                    style={{ backgroundColor: "#FF6600" }}
                >
                    Volver al inicio
                </button>

                {/* 🔶 BOTÓN NUEVO: VER MI COMPRA */}
                {tx && (
                    <button
                        onClick={() => router.push(`/mi-compra?tx=${tx}`)}
                        className="mt-4 w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-4 rounded-lg transition-all"
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
                <main className="min-h-screen flex items-center justify-center bg-gray-100">
                    <p className="text-sm text-gray-600">Cargando pago...</p>
                </main>
            }
        >
            <PagoExitosoContent />
        </Suspense>
    );
}
