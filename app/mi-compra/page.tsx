// app/mi-compra/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type Compra = {
    nombre: string;
    telefono: string;
    email: string;
    estado: string;
    metodoPago: string;
    total: number;
    fecha: string;
    boletos: string[];
};

export default function MiCompraPage() {
    const searchParams = useSearchParams();
    const tx = searchParams.get("tx") || "";

    const [compra, setCompra] = useState<Compra | null>(null);
    const [loading, setLoading] = useState<boolean>(!!tx);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!tx) return;

        setLoading(true);
        setError(null);

        fetch(`/api/mi-compra?tx=${encodeURIComponent(tx)}`)
            .then(async (res) => {
                if (!res.ok) {
                    const data = await res.json().catch(() => ({}));
                    throw new Error(data.error || "No se encontró la compra");
                }
                return res.json();
            })
            .then((data) => {
                const compraNormalizada: Compra = {
                    nombre: data.nombre || "",
                    telefono: data.telefono || "",
                    email: data.email || "",
                    estado: data.estado || "pagado",
                    metodoPago: data.metodoPago || "payphone",
                    total: data.total || 0,
                    fecha: data.fecha || "",
                    boletos: data.boletos || [],
                };
                setCompra(compraNormalizada);
            })
            .catch((err: any) => {
                console.error(err);
                setError(err.message || "Ocurrió un error al cargar la compra");
            })
            .finally(() => {
                setLoading(false);
            });
    }, [tx]);

    if (!tx) {
        return (
            <main className="min-h-screen bg-gray-100 px-4 py-8">
                <div className="mx-auto w-full max-w-2xl">
                    <div className="rounded-2xl bg-white shadow-lg border-2 p-6 md:p-8 border-orange-500">
                        <h1 className="text-2xl md:text-3xl font-bold mb-2 text-orange-500">
                            Resumen de tu compra
                        </h1>
                        <p className="text-sm text-gray-600">
                            No se encontró el identificador de transacción en la URL.
                        </p>
                    </div>
                </div>
            </main>
        );
    }

    const estadoColor =
        compra?.estado === "pagado" || compra?.estado === "Confirmado"
            ? "bg-green-100 text-green-700 border-green-300"
            : compra?.estado === "Pendiente"
                ? "bg-yellow-100 text-yellow-700 border-yellow-300"
                : "bg-red-100 text-red-700 border-red-300";

    return (
        <main className="min-h-screen bg-gray-100 px-4 py-8">
            <div className="mx-auto w-full max-w-2xl">
                <div
                    className="rounded-2xl bg-white shadow-lg border-2 p-6 md:p-8"
                    style={{ borderColor: "#FF6600" }}
                >
                    <h1
                        className="text-2xl md:text-3xl font-bold mb-2"
                        style={{ color: "#FF6600" }}
                    >
                        Resumen de tu compra
                    </h1>

                    <p className="text-sm text-gray-600 mb-4">
                        Gracias por participar en el sorteo. Aquí tienes el detalle de tu compra.
                    </p>

                    {/* ID de transacción */}
                    <div className="mb-4 rounded-lg bg-gray-50 px-4 py-3 border border-dashed border-gray-300">
                        <p className="text-xs text-gray-500">ID de transacción</p>
                        <p className="font-mono text-sm font-semibold text-gray-800 break-all">
                            {tx}
                        </p>
                    </div>

                    {/* Estados de carga / error */}
                    {loading && (
                        <p className="text-sm text-gray-500 mb-4">
                            Cargando información de tu compra...
                        </p>
                    )}

                    {error && (
                        <p className="text-sm text-red-600 mb-4">{error}</p>
                    )}

                    {/* Solo mostramos datos si compra existe */}
                    {compra && !loading && !error && (
                        <>
                            {/* Estado + método de pago */}
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
                                <div
                                    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${estadoColor}`}
                                >
                                    <span className="w-2 h-2 rounded-full bg-current mr-2" />
                                    Estado: {compra.estado}
                                </div>

                                <div className="text-xs text-gray-600 text-right md:text-left">
                                    <p>
                                        <span className="font-semibold">Método de pago:</span>{" "}
                                        {compra.metodoPago}
                                    </p>
                                    <p>
                                        <span className="font-semibold">Fecha:</span>{" "}
                                        {compra.fecha}
                                    </p>
                                </div>
                            </div>

                            {/* Datos del participante */}
                            <div className="mb-6">
                                <h2 className="text-sm font-semibold text-gray-800 mb-2">
                                    Datos del participante
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <p className="text-gray-500 text-xs">Nombre completo</p>
                                        <p className="font-medium text-gray-900">
                                            {compra.nombre}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500 text-xs">Teléfono</p>
                                        <p className="font-medium text-gray-900">
                                            {compra.telefono}
                                        </p>
                                    </div>
                                    <div className="md:col-span-2">
                                        <p className="text-gray-500 text-xs">
                                            Correo electrónico
                                        </p>
                                        <p className="font-medium text-gray-900">
                                            {compra.email}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Boletos (de momento puede estar vacío) */}
                            <div className="mb-6">
                                <h2 className="text-sm font-semibold text-gray-800 mb-2">
                                    Números de tu boleto
                                </h2>

                                {compra.boletos.length === 0 ? (
                                    <p className="text-xs text-gray-500">
                                        (Los números se mostrarán aquí cuando los conectemos desde
                                        la tabla de boletos.)
                                    </p>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {compra.boletos.map((boleto) => (
                                            <div
                                                key={boleto}
                                                className="rounded-xl border border-gray-300 bg-gray-50 px-4 py-2 text-sm font-mono font-semibold text-gray-800 shadow-sm"
                                            >
                                                Nº {boleto}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Total */}
                            <div className="flex items-center justify-between border-t pt-4 mt-4">
                                <span className="text-sm font-semibold text-gray-700">
                                    Total pagado
                                </span>
                                <span
                                    className="text-lg font-extrabold"
                                    style={{ color: "#FF6600" }}
                                >
                                    ${compra.total.toFixed(2)}
                                </span>
                            </div>
                        </>
                    )}

                    {/* Botones */}
                    <div className="mt-6 flex flex-col md:flex-row gap-3">
                        <a
                            href="/"
                            className="flex-1 inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
                        >
                            Volver al inicio
                        </a>
                        <button
                            onClick={() => window.print()}
                            className="flex-1 inline-flex items-center justify-center rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 transition"
                        >
                            Imprimir comprobante
                        </button>
                    </div>
                </div>
            </div>
        </main>
    );
}
