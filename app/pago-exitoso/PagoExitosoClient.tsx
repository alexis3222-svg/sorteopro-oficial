"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type EstadoPagoResp = {
    ok: boolean;
    paid?: boolean; // true si ya está confirmado en BD
    estado?: string; // "pagado" | "pendiente" | etc (si tu API lo manda)
    alreadyAssigned?: boolean;
    numeros?: number[];
    reason?: string;
    error?: string;
};

export default function PagoExitosoClient() {
    const router = useRouter();
    const sp = useSearchParams();

    const tx = useMemo(() => {
        return (
            sp.get("tx") ||
            sp.get("clientTransactionId") ||
            sp.get("clientTransactionID") ||
            ""
        );
    }, [sp]);


    const payphoneId =
        sp.get("payphoneId") || sp.get("payphone_id") || sp.get("transactionId") || "";

    const [attempt, setAttempt] = useState(1);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<"verificando" | "confirmado" | "pendiente" | "error">(
        "verificando"
    );
    const [message, setMessage] = useState<string>("");
    const [numeros, setNumeros] = useState<number[]>([]);

    // Evitar setState después de confirmar
    const stopRef = useRef(false);

    // Normalizador: acepta varias formas de respuesta
    function normalize(resp: any): EstadoPagoResp {
        if (!resp || typeof resp !== "object") return { ok: false, error: "Respuesta inválida" };

        // Caso ideal: { ok, paid, ... }
        if (typeof resp.ok === "boolean") {
            const paid =
                resp.paid === true ||
                String(resp.estado || "").toLowerCase() === "pagado" ||
                String(resp.status || "").toLowerCase() === "pagado";

            return {
                ok: resp.ok,
                paid,
                estado: resp.estado ?? resp.status,
                alreadyAssigned: resp.alreadyAssigned ?? false,
                numeros: Array.isArray(resp.numeros) ? resp.numeros : [],
                reason: resp.reason,
                error: resp.error,
            };
        }

        // Caso raro: no trae ok, asumimos error
        return { ok: false, error: "Respuesta sin campo ok" };
    }

    async function confirmar() {
        if (stopRef.current) return;

        if (!tx) {
            setStatus("error");
            setMessage("No se encontró el tx en la URL. No puedo verificar el pago.");
            return;
        }

        setLoading(true);
        setMessage("");

        try {
            const res = await fetch(`/api/payphone/estado?tx=${encodeURIComponent(tx)}`, {
                method: "GET",
                cache: "no-store",
            });

            const raw = await res.json().catch(() => null);
            const data = normalize(raw);

            if (!res.ok || !data.ok) {
                setStatus("error");
                setMessage(data.error || `Error verificando (HTTP ${res.status}). Revisa logs.`);
                return;
            }

            if (data.paid) {
                stopRef.current = true;
                setStatus("confirmado");
                setNumeros(data.numeros || []);
                setMessage(
                    data.alreadyAssigned
                        ? "Pago confirmado. Los números ya estaban asignados."
                        : "Pago confirmado. Números asignados correctamente."
                );
                return;
            }

            // ok pero aún no pagado
            setStatus("pendiente");
            setMessage(data.reason || "Pago aún no confirmado. Si ya pagaste, espera un momento.");
        } catch (e: any) {
            setStatus("error");
            setMessage(e?.message || "Error inesperado verificando el pago.");
        } finally {
            setLoading(false);
        }
    }

    // Auto-intentos (12)
    useEffect(() => {
        stopRef.current = false;

        confirmar(); // intento 1 al cargar

        const max = 12;
        const id = setInterval(() => {
            setAttempt((prev) => {
                if (stopRef.current) {
                    clearInterval(id);
                    return prev;
                }
                const next = prev + 1;
                if (next > max) {
                    clearInterval(id);
                    return prev;
                }
                return next;
            });
        }, 2500);

        return () => clearInterval(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tx]);

    // Cuando attempt sube, re-confirmar hasta 12
    useEffect(() => {
        if (attempt <= 1) return;
        if (attempt > 12) return;
        if (status === "confirmado") return;
        confirmar();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [attempt]);

    return (
        <main className="min-h-screen flex items-center justify-center bg-neutral-950 px-4 text-slate-100">
            <div className="w-full max-w-md rounded-2xl bg-neutral-900 border border-neutral-800 p-6 text-center">
                <h1 className="text-2xl font-bold text-orange-400">
                    {status === "confirmado"
                        ? "Pago confirmado"
                        : status === "error"
                            ? "Ocurrió un error"
                            : "Pago en verificación"}
                </h1>

                <p className="mt-2 text-sm text-neutral-300">
                    {status === "confirmado"
                        ? "Listo. Ya registramos tu compra."
                        : "Si ya pagaste, espera un momento. Estamos verificando tu compra."}
                </p>

                <div className="mt-4 rounded-xl bg-neutral-950/40 border border-neutral-800 p-4 text-left text-sm">
                    {payphoneId ? (
                        <p className="text-neutral-300">
                            <span className="text-neutral-500">PayPhone ID:</span> {payphoneId}
                        </p>
                    ) : null}

                    <p className="text-neutral-300 break-all">
                        <span className="text-neutral-500">Tx:</span> {tx || "(sin tx)"}
                    </p>

                    <p className="text-neutral-300">
                        <span className="text-neutral-500">Estado:</span> {status}
                    </p>

                    {status !== "confirmado" && (
                        <p className="text-neutral-300">
                            <span className="text-neutral-500">Intento:</span> {Math.min(attempt, 12)} de 12
                        </p>
                    )}

                    {message ? <p className="mt-2 text-xs text-neutral-400">{message}</p> : null}

                    {status === "confirmado" && numeros.length > 0 ? (
                        <p className="mt-3 text-xs text-neutral-300">
                            <span className="text-neutral-500">Números:</span> {numeros.join(", ")}
                        </p>
                    ) : null}
                </div>

                <div className="mt-5 flex flex-col gap-3">
                    <button
                        onClick={() => confirmar()}
                        disabled={loading}
                        className="rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-60 py-3 font-semibold text-black"
                    >
                        {loading ? "Verificando..." : "Reintentar ahora"}
                    </button>

                    <button
                        onClick={() => router.push("/")}
                        className="rounded-xl bg-neutral-800 hover:bg-neutral-700 py-3 font-semibold"
                    >
                        Regresar al inicio
                    </button>
                </div>
            </div>
        </main>
    );
}
