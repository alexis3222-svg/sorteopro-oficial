"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function PagoExitosoClient() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const txFromUrl = useMemo(() => {
        return (
            searchParams.get("clientTransactionId") ||
            searchParams.get("tx") ||
            searchParams.get("id")
        );
    }, [searchParams]);

    const [tx, setTx] = useState<string | null>(txFromUrl);

    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [pedidoId, setPedidoId] = useState<number | null>(null);
    const [estado, setEstado] = useState<string | null>(null);

    // ✅ Recuperar tx si PayPhone NO lo mandó en la URL
    useEffect(() => {
        if (txFromUrl) {
            setTx(txFromUrl);
            return;
        }

        try {
            const saved = sessionStorage.getItem("last_payphone_tx");
            if (saved) setTx(saved);
        } catch { }
    }, [txFromUrl]);

    // ✅ Confirmar pago
    useEffect(() => {
        const run = async () => {
            if (!tx) {
                setLoading(false);
                setErrorMsg("No se recibió el código de transacción en la URL.");
                return;
            }

            try {
                setLoading(true);
                setErrorMsg(null);

                const res = await fetch(
                    `/api/payphone/confirmar?tx=${encodeURIComponent(tx)}`,
                    { method: "GET", cache: "no-store" }
                );

                const data = await res.json();

                if (!res.ok || !data?.ok) {
                    setEstado(data?.estado ?? "en_proceso");
                    setPedidoId(data?.pedidoId ?? null);
                    setErrorMsg(data?.error ?? "No se pudo confirmar el pago todavía.");
                    setLoading(false);
                    return;
                }

                setEstado(data?.estado ?? "pagado");
                setPedidoId(data?.pedidoId ?? null);
                setLoading(false);
            } catch (e: any) {
                console.error(e);
                setErrorMsg(e?.message || "Error confirmando el pago.");
                setLoading(false);
            }
        };

        run();
    }, [tx]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                Verificando pago...
            </div>
        );
    }

    return (
        <main className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
            <div className="p-6 w-full max-w-md bg-white rounded-2xl shadow">
                <h1 className="text-xl font-bold text-orange-600">
                    {estado === "pagado" ? "¡Pago confirmado!" : "Pago en verificación"}
                </h1>

                <p className="mt-2 text-gray-700">
                    {estado === "pagado"
                        ? "Tu pago fue confirmado y tus números serán asignados."
                        : "Aún no hay confirmación oficial del pago. Si ya pagaste, espera un momento."}
                </p>

                {errorMsg && <p className="mt-3 text-red-500 text-sm">{errorMsg}</p>}

                <div className="mt-4 text-sm text-slate-600 space-y-1">
                    <div>
                        <strong>Tx:</strong> {tx ?? "-"}
                    </div>
                    {pedidoId && (
                        <div>
                            <strong>Pedido ID:</strong> {pedidoId}
                        </div>
                    )}
                    {estado && (
                        <div>
                            <strong>Estado:</strong> {estado}
                        </div>
                    )}
                </div>

                <button
                    className="mt-5 bg-orange-500 text-white px-4 py-2 rounded-xl w-full font-semibold"
                    onClick={() => router.push(tx ? `/mi-compra?tx=${encodeURIComponent(tx)}` : "/mi-compra")}
                >
                    Ver mi compra
                </button>

                <button
                    className="mt-3 bg-gray-200 px-4 py-2 rounded-xl w-full font-semibold"
                    onClick={() => router.push("/")}
                >
                    Regresar al inicio
                </button>
            </div>
        </main>
    );
}
