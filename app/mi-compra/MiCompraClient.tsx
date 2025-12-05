"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Pedido = {
    id: number;
    sorteo_id: string | null;
    actividad_numero: number | null;
    cantidad_numeros: number | null;
    precio_unitario: number | null;
    total: number | null;
    metodo_pago: string | null;
    nombre: string | null;
    telefono: string | null;
    correo: string | null;
    estado: string | null;
    created_at: string;
    payphone_client_transaction_id: string | null;
    // 👇 ajusta el nombre si tu columna se llama diferente
    numeros_asignados?: string[] | string | null;
};

export default function MiCompraClient() {
    const searchParams = useSearchParams();
    const tx =
        searchParams.get("tx") ||
        searchParams.get("clientTransactionId") ||
        searchParams.get("id");

    const [loading, setLoading] = useState(true);
    const [pedido, setPedido] = useState<Pedido | null>(null);

    useEffect(() => {
        if (!tx) return;

        async function loadData() {
            setLoading(true);

            const { data, error } = await supabase
                .from("pedidos")
                .select("*")
                .eq("payphone_client_transaction_id", tx)
                .single();

            if (error) {
                console.error("Error cargando pedido:", error);
                setPedido(null);
            } else {
                setPedido(data as Pedido);
            }

            setLoading(false);
        }

        loadData();
    }, [tx]);

    // 👉 Caso: no vino tx en la URL
    if (!tx) {
        return (
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
        );
    }

    // 👉 Caso: cargando desde Supabase
    if (loading) {
        return (
            <div className="flex items-center justify-center px-4 pt-32 pb-12">
                <div className="w-full max-w-md rounded-2xl bg-white shadow-md p-6 text-center bg-white/80">
                    <p className="text-gray-700 text-sm">Buscando tu compra...</p>
                </div>
            </div>
        );
    }

    // 👉 Caso: no se encontró el pedido
    if (!pedido) {
        return (
            <div className="flex items-center justify-center px-4 pt-32 pb-12">
                <div className="w-full max-w-md rounded-2xl bg-white shadow-lg p-6 text-center">
                    <h1 className="text-xl font-bold mb-2 text-red-600">
                        Compra no encontrada
                    </h1>
                    <p className="text-gray-700 text-sm">
                        No existe ninguna compra registrada con el código:
                    </p>
                    <p className="font-mono text-xs bg-gray-100 px-3 py-2 rounded mt-3 break-all">
                        {tx}
                    </p>

                    <div className="mt-6 flex justify-center">
                        <a
                            href="/"
                            className="bg-[#ff6600] hover:bg-[#ff7f26] text-white font-semibold px-6 py-2 rounded-lg shadow"
                        >
                            Regresar al inicio
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    // 👉 Procesar los números asignados
    let numeros: string[] = [];
    if (pedido.numeros_asignados) {
        if (Array.isArray(pedido.numeros_asignados)) {
            numeros = pedido.numeros_asignados.map(String);
        } else if (typeof pedido.numeros_asignados === "string") {
            numeros = pedido.numeros_asignados
                .split(",")
                .map((n) => n.trim())
                .filter(Boolean);
        }
    }

    const totalFormateado =
        pedido.total != null ? Number(pedido.total).toFixed(2) : "-";

    return (
        <div className="flex items-center justify-center px-4 pt-28 pb-12">
            <div className="w-full max-w-3xl">
                {/* Tarjeta grande y moderna */}
                <div className="relative overflow-hidden rounded-3xl bg-white shadow-2xl border border-gray-200">
                    {/* Banda superior con gradiente */}
                    <div className="h-2 bg-gradient-to-r from-[#ff6600] via-[#ff9a3c] to-[#ff6600]" />

                    <div className="p-6 md:p-8">
                        {/* Header */}
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
                            <div>
                                <p className="text-xs font-semibold tracking-[0.2em] text-gray-400 uppercase">
                                    Casa Bikers • Sorteos
                                </p>
                                <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 mt-1">
                                    Detalle de tu compra
                                </h1>
                                <p className="text-xs md:text-sm text-gray-500 mt-1">
                                    ID de transacción:
                                    <span className="font-mono text-[11px] md:text-xs bg-gray-100 px-2 py-1 rounded ml-1">
                                        {pedido.payphone_client_transaction_id || tx}
                                    </span>
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-[11px] uppercase text-gray-400 font-semibold">
                                    Estado
                                </p>
                                <span
                                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${pedido.estado === "PAGADO" ||
                                            pedido.estado === "APROBADO" ||
                                            pedido.estado === "COMPLETADO"
                                            ? "bg-green-100 text-green-700"
                                            : "bg-yellow-100 text-yellow-700"
                                        }`}
                                >
                                    {pedido.estado || "PENDIENTE"}
                                </span>
                            </div>
                        </div>

                        {/* Contenido en 2 columnas */}
                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Columna izquierda: datos de cliente y compra */}
                            <div className="space-y-4 text-sm">
                                <div>
                                    <h2 className="text-xs font-semibold tracking-[0.18em] text-gray-400 uppercase mb-2">
                                        Datos del cliente
                                    </h2>
                                    <div className="space-y-1.5">
                                        <p>
                                            <span className="font-semibold text-gray-700">
                                                Nombre:
                                            </span>{" "}
                                            <span className="text-gray-800">{pedido.nombre}</span>
                                        </p>
                                        <p>
                                            <span className="font-semibold text-gray-700">
                                                Teléfono:
                                            </span>{" "}
                                            <span className="text-gray-800">{pedido.telefono}</span>
                                        </p>
                                        <p>
                                            <span className="font-semibold text-gray-700">
                                                Email:
                                            </span>{" "}
                                            <span className="text-gray-800">{pedido.correo}</span>
                                        </p>
                                    </div>
                                </div>

                                <div>
                                    <h2 className="text-xs font-semibold tracking-[0.18em] text-gray-400 uppercase mb-2">
                                        Resumen de compra
                                    </h2>
                                    <div className="space-y-1.5">
                                        {pedido.actividad_numero != null && (
                                            <p>
                                                <span className="font-semibold text-gray-700">
                                                    Actividad N°:
                                                </span>{" "}
                                                <span className="text-gray-800">
                                                    {pedido.actividad_numero}
                                                </span>
                                            </p>
                                        )}
                                        <p>
                                            <span className="font-semibold text-gray-700">
                                                Cantidad de números:
                                            </span>{" "}
                                            <span className="text-gray-800">
                                                {pedido.cantidad_numeros}
                                            </span>
                                        </p>
                                        <p>
                                            <span className="font-semibold text-gray-700">
                                                Precio unitario:
                                            </span>{" "}
                                            <span className="text-gray-800">
                                                $
                                                {pedido.precio_unitario != null
                                                    ? Number(pedido.precio_unitario).toFixed(2)
                                                    : "-"}
                                            </span>
                                        </p>
                                        <p>
                                            <span className="font-semibold text-gray-700">
                                                Total pagado:
                                            </span>{" "}
                                            <span className="text-gray-900 font-bold">
                                                ${totalFormateado}
                                            </span>
                                        </p>
                                        <p>
                                            <span className="font-semibold text-gray-700">
                                                Método de pago:
                                            </span>{" "}
                                            <span className="text-gray-800">
                                                {pedido.metodo_pago || "PayPhone"}
                                            </span>
                                        </p>
                                        <p>
                                            <span className="font-semibold text-gray-700">
                                                Fecha:
                                            </span>{" "}
                                            <span className="text-gray-800">
                                                {pedido.created_at
                                                    ? new Date(pedido.created_at).toLocaleString("es-EC")
                                                    : "-"}
                                            </span>
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Columna derecha: números asignados */}
                            <div className="space-y-3 text-sm">
                                <h2 className="text-xs font-semibold tracking-[0.18em] text-gray-400 uppercase">
                                    Números asignados
                                </h2>

                                {numeros.length > 0 ? (
                                    <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-3 md:p-4">
                                        <p className="text-xs text-gray-500 mb-2">
                                            Estos son los números que participan en el sorteo:
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {numeros.map((n) => (
                                                <span
                                                    key={n}
                                                    className="inline-flex items-center justify-center rounded-full border border-[#ff6600]/40 bg-[#fff5ec] px-3 py-1 text-xs font-semibold text-[#ff6600] shadow-sm"
                                                >
                                                    #{n}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-3 md:p-4">
                                        <p className="text-xs text-gray-500">
                                            Aún no se han registrado los números asignados para esta
                                            compra. Si ya realizaste el pago, tus números se
                                            confirmarán en breve.
                                        </p>
                                    </div>
                                )}

                                <div className="pt-2">
                                    <p className="text-[11px] text-gray-400">
                                        Te recomendamos hacer una captura de pantalla o guardar
                                        esta página como comprobante.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Footer con botón de retorno */}
                        <div className="mt-8 flex justify-center">
                            <a
                                href="/"
                                className="inline-flex items-center gap-2 bg-[#ff6600] hover:bg-[#ff7f26] text-white font-semibold px-7 py-2.5 rounded-full shadow-lg text-sm transition"
                            >
                                Regresar al inicio
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
