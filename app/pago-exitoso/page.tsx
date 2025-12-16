"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

type EstadoUI = "verificando" | "confirmado" | "no_confirmado";

type Preorden = {
    tx: string;
    sorteoId: string | null;
    cantidad: number | null;
    nombre: string | null;
    telefono: string | null;
    correo: string | null;
    total: number | null;
    referencia: string | null;
    metodo_pago?: string | null;
    createdAt?: string | null;
};

function leerPreorden(): Preorden | null {
    const tryParse = (raw: string | null) => {
        if (!raw) return null;
        try {
            return JSON.parse(raw) as Preorden;
        } catch {
            return null;
        }
    };

    const s = typeof window !== "undefined" ? sessionStorage.getItem("pp_preorden") : null;
    const l = typeof window !== "undefined" ? localStorage.getItem("pp_preorden") : null;

    return tryParse(s) || tryParse(l);
}

export default function PagoExitosoPage() {
    return (
        <Suspense
            fallback={
                <main className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
                    <div className="w-full max-w-md rounded-2xl bg-white shadow-lg p-6 text-center">
                        <h1 className="text-xl font-bold text-orange-600">Cargando…</h1>
                        <p className="text-gray-700 mt-2 text-sm">Preparando verificación del pago…</p>
                    </div>
                </main>
            }
        >
            <PagoExitosoInner />
        </Suspense>
    );
}

function PagoExitosoInner() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const id = (searchParams.get("id") || "").trim(); // ✅ id real PayPhone si viene
    const clientTx = (searchParams.get("clientTransactionId") || searchParams.get("tx") || "").trim();

    // Preferimos id para confirmar; si no hay id, usamos tx como respaldo
    const identifier = id || clientTx;

    const [estado, setEstado] = useState<EstadoUI>("verificando");
    const [intentos, setIntentos] = useState(0);
    const [errorExtra, setErrorExtra] = useState<string | null>(null);

    const INTERVAL_MS = 5000;
    const MAX_INTENTOS = 12;

    async function confirmarYCrearPedido() {
        if (!identifier) return false;

        const preorden = leerPreorden();
        if (!preorden) {
            setErrorExtra("No se encontró la preorden (pp_preorden).");
            setEstado("no_confirmado");
            return false;
        }

        const payload = {
            ...preorden,
            tx: clientTx || preorden.tx, // tu tx
            id: id || null,              // ✅ id real de PayPhone
            metodo_pago: "payphone",
        };

        try {
            const res = await fetch(`/api/payphone/confirmar`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                cache: "no-store",
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (data?.ok) {
                setEstado("confirmado");
                setErrorExtra(null);
                return true;
            }

            setEstado("no_confirmado");
            setErrorExtra(data?.error || "Pago no confirmado todavía.");
            return false;
        } catch (e: any) {
            setEstado("no_confirmado");
            setErrorExtra(e?.message || "Error consultando el backend.");
            return false;
        }
    }

    useEffect(() => {
        if (!identifier) {
            setEstado("no_confirmado");
            setErrorExtra("Falta id/tx en la URL.");
            return;
        }

        if (estado === "confirmado") return;
        if (intentos >= MAX_INTENTOS) return;

        const t = setTimeout(async () => {
            const ok = await confirmarYCrearPedido();
            if (!ok) setIntentos((i) => i + 1);
        }, INTERVAL_MS);

        return () => clearTimeout(t);
    }, [identifier, estado, intentos]);

    const titulo = estado === "confirmado" ? "¡Pago confirmado!" : "Pago en verificación";

    const mensaje =
        estado === "confirmado"
            ? "Tu pago fue confirmado por PayPhone. Ya puedes ver tus números."
            : "Aún no hay confirmación oficial del pago. Si ya pagaste, espera un momento.";

    return (
        <main className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-lg p-6 text-center">
                <h1 className="text-2xl font-bold mb-2 text-orange-600">{titulo}</h1>
                <p className="text-gray-700 mb-3">{mensaje}</p>

                {estado !== "confirmado" && (
                    <p className="text-sm text-red-600 mb-3">
                        Pago no confirmado por PayPhone. No se asignarán números todavía.
                    </p>
                )}

                {errorExtra && (
                    <p className="text-[11px] text-slate-500 mb-3 break-words">Detalle: {errorExtra}</p>
                )}

                <div className="text-xs text-gray-500 mb-5 space-y-1">
                    <div>
                        PayPhone ID: <span className="font-mono">{id || "—"}</span>
                    </div>
                    <div>
                        Tx: <span className="font-mono">{clientTx || "—"}</span>
                    </div>
                    <div>
                        Estado: <b>{estado}</b>
                    </div>
                    {estado !== "confirmado" && (
                        <div>
                            Intento {Math.min(intentos + 1, MAX_INTENTOS)} de {MAX_INTENTOS}
                        </div>
                    )}
                </div>

                <div className="space-y-3">
                    {estado === "confirmado" ? (
                        <button
                            onClick={() =>
                                router.push(`/mis-numeros?tx=${encodeURIComponent(clientTx || identifier)}`)
                            }
                            className="w-full rounded-xl bg-orange-500 py-2 font-semibold text-white hover:bg-orange-400"
                        >
                            Ver mis números
                        </button>
                    ) : (
                        <button
                            onClick={async () => {
                                setEstado("verificando");
                                setIntentos(0);
                                await confirmarYCrearPedido();
                            }}
                            className="w-full rounded-xl bg-orange-500 py-2 font-semibold text-white hover:bg-orange-400"
                        >
                            Reintentar ahora
                        </button>
                    )}

                    <button
                        onClick={() => router.push("/")}
                        className="w-full rounded-xl bg-gray-200 py-2 font-semibold text-gray-700 hover:bg-gray-300"
                    >
                        Regresar al inicio
                    </button>
                </div>
            </div>
        </main>
    );
}
