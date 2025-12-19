"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function PagoExitosoClient() {
    const router = useRouter();
    const sp = useSearchParams();

    // PayPhone devuelve diferentes params según el flujo
    const tx = useMemo(() => {
        return (
            sp.get("tx") ||
            sp.get("clientTransactionId") ||
            sp.get("clientTransactionID") ||
            sp.get("reference") ||
            ""
        );
    }, [sp]);

    const payphoneId =
        sp.get("id") || sp.get("payphoneId") || sp.get("transactionId") || "";

    return (
        <main className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
            <div
                className="w-full max-w-md rounded-2xl bg-white shadow-lg p-6 text-center"
                style={{ border: "2px solid #FF6600" }}
            >
                <h1 className="text-2xl font-bold mb-2" style={{ color: "#FF6600" }}>
                    Pago recibido
                </h1>

                <p className="text-gray-700 mb-3">
                    Si completaste el pago en PayPhone, tu pedido quedó <b>registrado</b> y
                    pasará a revisión.
                </p>

                <div className="mt-3 rounded-xl bg-gray-50 border border-gray-200 p-4 text-left text-sm">
                    {payphoneId ? (
                        <p className="text-gray-700">
                            <span className="text-gray-500">PayPhone ID:</span> {payphoneId}
                        </p>
                    ) : null}

                    {tx ? (
                        <p className="text-gray-700 break-all">
                            <span className="text-gray-500">Tx:</span> {tx}
                        </p>
                    ) : (
                        <p className="text-gray-700">
                            <span className="text-gray-500">Tx:</span> (no disponible)
                        </p>
                    )}

                    <p className="mt-2 text-xs text-gray-500">
                        Importante: Los números se asignarán cuando el administrador confirme
                        el pago desde el panel.
                    </p>
                </div>

                <div className="mt-5 flex flex-col gap-3">
                    <button
                        onClick={() => router.push("/")}
                        className="rounded-xl bg-[#FF7F00] hover:bg-[#ff6600] py-3 font-semibold text-black"
                    >
                        Regresar al inicio
                    </button>

                    <button
                        onClick={() => router.push("/mi-compra")}
                        className="rounded-xl bg-gray-200 hover:bg-gray-300 py-3 font-semibold text-gray-800"
                    >
                        Ver mi compra
                    </button>
                </div>
            </div>
        </main>
    );
}
