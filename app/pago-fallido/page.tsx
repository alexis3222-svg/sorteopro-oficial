// app/pago-fallido/page.tsx
"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function PagoFallidoPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-white">
                    <p className="text-sm text-slate-300">Cargando…</p>
                </div>
            }
        >
            <PagoFallidoInner />
        </Suspense>
    );
}

function PagoFallidoInner() {
    const sp = useSearchParams();
    const router = useRouter();

    const tx = sp.get("tx") || "";
    const reason = sp.get("reason") || "unknown";

    const reasonLabel =
        reason === "pedido_not_found"
            ? "No encontramos el pedido asociado a esta transacción."
            : reason === "missing_params"
                ? "Faltan parámetros de retorno del pago."
                : "No se pudo validar el pago.";

    return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-white px-4">
            <div className="w-full max-w-md text-center space-y-3">
                <h1 className="text-xl font-semibold">Pago no confirmado</h1>
                <p className="text-sm text-slate-300">{reasonLabel}</p>

                {tx ? (
                    <p className="text-xs text-slate-500 break-all">
                        Referencia: <span className="text-slate-300">{tx}</span>
                    </p>
                ) : null}

                <div className="pt-4 flex items-center justify-center gap-2">
                    <button
                        onClick={() => router.push("/")}
                        className="px-4 py-2 rounded-lg bg-orange-500 text-black text-sm font-semibold hover:bg-orange-400"
                    >
                        Volver al inicio
                    </button>

                    <button
                        onClick={() => router.back()}
                        className="px-4 py-2 rounded-lg border border-neutral-700 text-sm text-slate-200 hover:bg-neutral-900"
                    >
                        Regresar
                    </button>
                </div>

                <p className="text-[11px] text-slate-600 pt-2">
                    Si ya pagaste y esto aparece, contáctanos con la referencia.
                </p>
            </div>
        </div>
    );
}
