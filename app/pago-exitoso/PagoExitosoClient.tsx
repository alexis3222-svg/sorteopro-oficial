"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function PagoExitosoClient() {
    const router = useRouter();
    const sp = useSearchParams();

    // PayPhone puede retornar estos params; los mostramos solo informativos
    const payphoneId = useMemo(() => {
        return sp.get("id") || sp.get("payphoneId") || sp.get("transactionId") || "";
    }, [sp]);

    const clientTx = useMemo(() => {
        return (
            sp.get("clientTransactionId") ||
            sp.get("clientTransactionID") ||
            sp.get("tx") ||
            ""
        );
    }, [sp]);

    return (
        <main className="min-h-screen flex items-center justify-center bg-neutral-950 px-4 text-slate-100">
            <div className="w-full max-w-md rounded-2xl bg-neutral-900 border border-neutral-800 p-6 text-center">
                <h1 className="text-2xl font-bold text-orange-400">
                    Pago recibido / En revisión
                </h1>

                <p className="mt-2 text-sm text-neutral-300">
                    Tu pago fue registrado. <b>La confirmación y asignación de números se hará desde el panel Admin.</b>
                </p>

                <div className="mt-4 rounded-xl bg-neutral-950/40 border border-neutral-800 p-4 text-left text-sm">
                    {payphoneId ? (
                        <p className="text-neutral-300 break-all">
                            <span className="text-neutral-500">PayPhone ID:</span> {payphoneId}
                        </p>
                    ) : null}

                    {clientTx ? (
                        <p className="text-neutral-300 break-all">
                            <span className="text-neutral-500">Client Tx:</span> {clientTx}
                        </p>
                    ) : null}

                    <p className="mt-2 text-xs text-neutral-400">
                        Si ya pagaste, solo espera. En Admin se marcará como pagado y se asignarán tus números.
                    </p>
                </div>

                <div className="mt-5 flex flex-col gap-3">
                    <button
                        onClick={() => router.push("/")}
                        className="rounded-xl bg-orange-500 hover:bg-orange-600 py-3 font-semibold text-black"
                    >
                        Regresar al inicio
                    </button>

                    <button
                        onClick={() => router.push("/mi-compra")}
                        className="rounded-xl bg-neutral-800 hover:bg-neutral-700 py-3 font-semibold"
                    >
                        Ver mi compra (si aplica)
                    </button>
                </div>
            </div>
        </main>
    );
}
