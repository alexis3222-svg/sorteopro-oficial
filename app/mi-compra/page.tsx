"use client";

import { useSearchParams } from "next/navigation";

export default function MiCompraPage() {
    const searchParams = useSearchParams();

    // Aceptamos varias posibles keys:
    const tx =
        searchParams.get("tx") ||
        searchParams.get("clientTransactionId") ||
        searchParams.get("id");

    if (!tx) {
        return (
            <main className="min-h-screen bg-[#f3f4f6]">
                {/* Header gris/naranja ya viene de tu layout */}
                <div className="flex items-center justify-center px-4 pt-32 pb-12">
                    <div className="w-full max-w-md rounded-2xl bg-white shadow-lg p-6 text-center">
                        <h1 className="text-xl font-bold mb-2 text-red-600">
                            Falta el identificador de compra
                        </h1>
                        <p className="text-gray-700 text-sm">
                            No se encontró el parámetro <code>tx</code> en la URL.
                        </p>
                    </div>
                </div>
            </main>
        );
    }

    // Por ahora solo mostramos el tx. Luego aquí conectamos Supabase.
    return (
        <main className="min-h-screen bg-[#f3f4f6]">
            {/* Header gris/naranja ya viene de tu layout */}
            <div className="flex items-center justify-center px-4 pt-32 pb-12">
                <div className="w-full max-w-md rounded-2xl bg-white shadow-lg p-6 text-center">
                    <h1 className="text-2xl font-bold mb-2 text-[#ff6600]">
                        Detalle de tu compra
                    </h1>
                    <p className="text-gray-700 mb-3 text-sm">
                        Este es el código de tu transacción:
                    </p>
                    <p className="font-mono text-xs bg-gray-100 px-3 py-2 rounded mb-4 break-all">
                        {tx}
                    </p>
                    <p className="text-gray-500 text-xs">
                        Más adelante aquí cargaremos los datos desde Supabase
                        usando este identificador.
                    </p>
                </div>
            </div>
        </main>
    );
}
