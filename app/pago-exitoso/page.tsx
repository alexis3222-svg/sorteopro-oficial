// app/pago-exitoso/page.tsx
"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

type EstadoResp = {
    ok: boolean;
    tx?: string;
    paid?: boolean;
    pedido?: { id: number; estado: string | null } | null;
    intent?: { id: number; status: string | null; payphone_id: string | null } | null;
    error?: string;
};

export default function PagoExitosoPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Verificando pago…</div>}>
            <PagoExitosoClient />
        </Suspense>
    );
}

function PagoExitosoClient() {
    const sp = useSearchParams();
    const router = useRouter();

    // tx viene desde /pago-payphone?tx=...
    const tx =
        sp.get("tx") ||
        sp.get("clientTransactionId") ||
        sp.get("clientTransactionID");

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<EstadoResp | null>(null);
    const [tries, setTries] = useState(0);

    useEffect(() => {
        if (!tx) {
            setLoading(false);
            setData({ ok: false, error: "No se encontró TX en la URL. Vuelve a intentar el pago." });
            return;
        }

        let cancelled = false;

        const tick = async () => {
            try {
                const r = await fetch(`/api/payphone/estado?tx=${encodeURIComponent(tx)}`, {
                    method: "GET",
                    cache: "no-store",
                });
                const j = (await r.json().catch(() => null)) as EstadoResp | null;

                if (cancelled) return;

                if (!j || !j.ok) {
                    setData(j || { ok: false, error: `Error consultando estado (HTTP ${r.status})` });
                } else {
                    setData(j);

                    // ✅ Si ya está pagado, terminamos
                    if (j.paid) {
                        setLoading(false);
                        return;
                    }
                }
            } catch (e: any) {
                if (cancelled) return;
                setData({ ok: false, error: e?.message || "Error consultando estado" });
            } finally {
                if (cancelled) return;
                setTries((t) => t + 1);
            }
        };

        // primer golpe inmediato
        tick();

        // luego polling cada 2s, máximo 12 intentos (~24s)
        const id = setInterval(() => {
            tick();
        }, 2000);

        const timeout = setTimeout(() => {
            clearInterval(id);
            setLoading(false);
        }, 24000);

        return () => {
            cancelled = true;
            clearInterval(id);
            clearTimeout(timeout);
        };
    }, [tx]);

    const paid = !!data?.paid;

    return (
        <main className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
            <div
                className="w-full max-w-md rounded-2xl bg-white shadow-lg p-6 text-center"
                style={{ border: "2px solid #FF6600" }}
            >
                <h1 className="text-2xl font-bold mb-2" style={{ color: "#FF6600" }}>
                    {paid ? "¡Pago confirmado!" : "Pago en verificación…"}
                </h1>

                {!tx && (
                    <p className="text-sm text-red-600">
                        No llegó TX en la URL. Vuelve a intentar el pago desde el inicio.
                    </p>
                )}

                {tx && (
                    <p className="text-xs text-gray-600 mb-3">
                        TX: <span className="font-mono">{tx}</span>
                    </p>
                )}

                {data?.error && (
                    <p className="text-sm text-red-600 mb-3">{data.error}</p>
                )}

                {tx && !paid && (
                    <>
                        <p className="text-gray-700 mb-2">
                            Estamos esperando que el sistema marque tu pedido como <b>pagado</b>.
                        </p>
                        <p className="text-xs text-gray-500">
                            Intento {Math.min(tries, 12)} / 12
                        </p>

                        <div className="mt-4 text-left text-xs text-gray-600 space-y-1">
                            <div>
                                <b>Pedido:</b>{" "}
                                {data?.pedido ? `#${data.pedido.id} (${data.pedido.estado ?? "—"})` : "No encontrado aún"}
                            </div>
                            <div>
                                <b>Intent:</b>{" "}
                                {data?.intent ? `${data.intent.status ?? "—"} (id ${data.intent.id})` : "No encontrado"}
                            </div>
                        </div>

                        <div className="mt-5 flex flex-col gap-2">
                            <button
                                className="w-full rounded-xl bg-[#FF7F00] px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-[#ff6600]"
                                onClick={() => window.location.reload()}
                            >
                                Reintentar verificación
                            </button>

                            <button
                                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                onClick={() => router.push("/")}
                            >
                                Volver al inicio
                            </button>
                        </div>
                    </>
                )}

                {paid && (
                    <div className="mt-5 flex flex-col gap-2">
                        <p className="text-gray-700">
                            Tu pago ya fue confirmado. ¡Gracias por participar!
                        </p>
                        <button
                            className="w-full rounded-xl bg-[#FF7F00] px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-[#ff6600]"
                            onClick={() => router.push("/")}
                        >
                            Ir al inicio
                        </button>
                    </div>
                )}
            </div>
        </main>
    );
}
