// app/pago-exitoso/page.tsx
"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type EstadoUI = "creando" | "creado" | "error";

type Preorden = {
    sorteoId: string;
    cantidad: number;
    total: number;
    nombre?: string | null;
    telefono?: string | null;
    correo?: string | null;
};

function PagoExitosoInner() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const tx = useMemo(() => {
        return (
            searchParams.get("clientTransactionId") ||
            searchParams.get("tx") ||
            ""
        ).trim();
    }, [searchParams]);

    const [estado, setEstado] = useState<EstadoUI>("creando");
    const [detalle, setDetalle] = useState<string>("");
    const [pedidoId, setPedidoId] = useState<number | null>(null);

    const leerPreorden = useCallback((): Preorden | null => {
        const read = (k: string) => {
            try {
                const raw = k === "session" ? sessionStorage.getItem("pp_preorden") : localStorage.getItem("pp_preorden");
                if (!raw) return null;
                const obj = JSON.parse(raw);

                const pre: Preorden = {
                    sorteoId: obj.sorteoId ?? obj.sorteo_id,
                    cantidad: Number(obj.cantidad ?? obj.cantidad_numeros),
                    total: Number(obj.total),
                    nombre: obj.nombre ?? null,
                    telefono: obj.telefono ?? null,
                    correo: obj.correo ?? null,
                };

                if (!pre.sorteoId || !pre.cantidad || pre.total == null) return null;
                return pre;
            } catch {
                return null;
            }
        };

        return read("session") || read("local");
    }, []);

    useEffect(() => {
        let cancelled = false;

        async function run() {
            try {
                if (!tx) {
                    setEstado("error");
                    setDetalle("Falta tx en la URL. Regresa e intenta de nuevo.");
                    return;
                }

                const preorden = leerPreorden();
                if (!preorden) {
                    setEstado("error");
                    setDetalle("No existe pp_preorden (session/local). Regresa al inicio y compra nuevamente.");
                    return;
                }

                setEstado("creando");
                const res = await fetch("/api/payphone/crear-en-proceso", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ tx, preorden }),
                });

                const data = await res.json().catch(() => null);

                if (cancelled) return;

                if (!data?.ok) {
                    setEstado("error");
                    setDetalle(data?.error || "No se pudo crear el pedido.");
                    return;
                }

                setPedidoId(data?.pedidoId ?? null);
                setEstado("creado");
                setDetalle(data?.ya_existia ? "Pedido ya existía. Estado actualizado." : "Pedido creado en proceso.");
            } catch (e: any) {
                if (cancelled) return;
                setEstado("error");
                setDetalle(e?.message || "Error interno creando pedido.");
            }
        }

        run();
        return () => {
            cancelled = true;
        };
    }, [tx, leerPreorden]);

    return (
        <main className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-lg p-6 text-center" style={{ border: "2px solid #FF6600" }}>
                <h1 className="text-2xl font-bold mb-2" style={{ color: "#FF6600" }}>
                    {estado === "creado" ? "Pago recibido" : "Procesando..."}
                </h1>

                {estado === "creando" && (
                    <p className="text-blue-600 font-semibold mb-2">Creando tu pedido en proceso…</p>
                )}

                {estado === "creado" && (
                    <p className="text-green-600 font-semibold mb-2">
                        Pedido creado (EN_PROCESO). Un administrador lo marcará como PAGADO para asignar números.
                    </p>
                )}

                {estado === "error" && (
                    <p className="text-red-600 font-semibold mb-2">Error: {detalle || "No se pudo procesar."}</p>
                )}

                {detalle && estado !== "error" && <p className="text-xs text-gray-600 mt-2">Detalle: {detalle}</p>}

                <div className="text-xs text-gray-600 mt-4 space-y-1">
                    <div>Tx: {tx || "-"}</div>
                    <div>Pedido ID: {pedidoId ?? "-"}</div>
                    <div>Estado: <span className="font-semibold">{estado}</span></div>
                </div>

                <button
                    onClick={() => router.push("/mi-compra")}
                    className="mt-6 w-full rounded-xl py-3 font-semibold text-white"
                    style={{ background: "#FF6600" }}
                >
                    Ver mi compra
                </button>

                <button
                    onClick={() => router.push("/")}
                    className="mt-3 w-full rounded-xl py-3 font-semibold bg-gray-200 text-gray-800"
                >
                    Regresar al inicio
                </button>
            </div>
        </main>
    );
}

export default function PagoExitosoPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Cargando…</div>}>
            <PagoExitosoInner />
        </Suspense>
    );
}
