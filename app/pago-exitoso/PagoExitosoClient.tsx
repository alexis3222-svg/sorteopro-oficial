"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function PagoExitosoClient() {
    const router = useRouter();
    const sp = useSearchParams();

    // PayPhone puede devolver el tx en varias keys según flujo / versión
    const tx = useMemo(() => {
        return (
            sp.get("tx") ||
            sp.get("clientTransactionId") ||
            sp.get("clientTransactionID") ||
            sp.get("reference") ||
            ""
        );
    }, [sp]);

    const payphoneId = useMemo(() => {
        return (
            sp.get("id") ||
            sp.get("payphoneId") ||
            sp.get("payphone_id") ||
            sp.get("transactionId") ||
            ""
        );
    }, [sp]);

    return (
        <main className="min-h-screen flex items-center justify-center bg-neutral-950 px-4 text-slate-100">
            <div className="w-full max-w-md rounded-2xl bg-neutral-900 border border-neutral-800 p-6 text-center">
                <h1 className="text-2xl font-bold text-orange-400">
                    Pedido recibido
                </h1>

                <p className="mt-2 text-sm text-neutral-300">
                    Tu pago fue registrado en PayPhone. <br />
                    <span className="text-neutral-200 font-semibold">
                        Los números se asignarán cuando el administrador confirme el pago.
                    </span>
                </p>

                <div className="mt-4 rounded-xl bg-neutral-950/40 border border-neutral-800 p-4 text-left text-sm">
                    {payphoneId ? (
                        <p className="text-neutral-300 break-all">
                            <span className="text-neutral-500">PayPhone ID:</span> {payphoneId}
                        </p>
                    ) : null}

                    <p className="text-neutral-300 break-all">
                        <span className="text-neutral-500">Tx:</span>{" "}
                        {tx || "(sin tx en la URL)"}
                    </p>

                    <p className="mt-2 text-xs text-neutral-400">
                        Estado: <span className="text-neutral-200">pendiente de validación (admin)</span>
                    </p>
                </div>

                <div className="mt-5 flex flex-col gap-3">
                    <button
                        onClick={() => router.push("/")}
                        className="rounded-xl bg-orange-500 hover:bg-orange-600 py-3 font-semibold text-black"
                    >
                        Volver al inicio
                    </button>

                    <button
                        onClick={() => router.push("/")}
                        className="rounded-xl bg-neutral-800 hover:bg-neutral-700 py-3 font-semibold"
                    >
                        Salir
                    </button>
                </div>
            </div>
        </main>
    );
}
