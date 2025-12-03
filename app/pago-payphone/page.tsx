"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const TOKEN = process.env.NEXT_PUBLIC_PAYPHONE_TOKEN ?? "";
const STORE_ID = process.env.NEXT_PUBLIC_PAYPHONE_STORE_ID ?? "";

declare global {
    interface Window {
        PPaymentButtonBox?: any;
    }
}

// 👇 Page envuelta en Suspense (lo que Next pide)
export default function PagoPayphonePage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center text-slate-700">
                    Cargando pago...
                </div>
            }
        >
            <PagoPayphoneInner />
        </Suspense>
    );
}

function PagoPayphoneInner() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const amountParam = searchParams.get("amount");
    const refParam = searchParams.get("ref");
    const txParam = searchParams.get("tx"); // ID que viene desde el pedido

    const total = amountParam ? Number(amountParam) : null;
    const referencia = refParam ?? "Pago SorteoPro";
    const hasValidAmount = total != null && !isNaN(total);

    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        if (!hasValidAmount) {
            setErrorMsg("No se recibió correctamente el monto del pedido.");
            return;
        }
        if (!TOKEN || !STORE_ID) {
            setErrorMsg("Error de configuración de PayPhone.");
            return;
        }

        // --- 1) Cargar CSS oficial de PayPhone ---
        const existingCss = document.querySelector<HTMLLinkElement>(
            'link[data-payphone-css="1"]'
        );
        if (!existingCss) {
            const link = document.createElement("link");
            link.rel = "stylesheet";
            link.href =
                "https://cdn.payphonetodoesposible.com/box/v1.1/payphone-payment-box.css";
            link.dataset.payphoneCss = "1";
            document.head.appendChild(link);
        }

        // --- 2) Cargar SDK PayPhone ---
        const existingScript = document.querySelector<HTMLScriptElement>(
            'script[data-payphone-sdk="1"]'
        );

        const ensureSdkLoaded = (cb: () => void) => {
            if (window.PPaymentButtonBox) return cb();

            if (existingScript) {
                existingScript.addEventListener("load", () => cb(), { once: true });
                return;
            }

            const script = document.createElement("script");
            script.src =
                "https://cdn.payphonetodoesposible.com/box/v1.1/payphone-payment-box.js";
            script.type = "module";
            script.async = true;
            script.dataset.payphoneSdk = "1";
            script.onload = () => cb();
            document.body.appendChild(script);
        };

        // --- 3) Dibujar la cajita ---
        ensureSdkLoaded(() => {
            try {
                const amountInCents = Math.round(total! * 100);

                const clientTransactionId =
                    (txParam && txParam.length > 0 ? txParam : null) ||
                    `WEB-${Date.now().toString().slice(-10)}`.slice(0, 15);

                const ppb = new window.PPaymentButtonBox({
                    token: TOKEN,
                    clientTransactionId,
                    amount: amountInCents,
                    amountWithoutTax: amountInCents,
                    amountWithTax: 0,
                    tax: 0,
                    service: 0,
                    tip: 0,
                    currency: "USD",
                    storeId: STORE_ID,
                    reference: referencia,
                    lang: "es",
                    defaultMethod: "card",
                    timeZone: -5,
                });

                ppb.render("pp-button");
            } catch (e) {
                console.error(e);
                setErrorMsg("No se pudo inicializar PayPhone.");
            }
        });
    }, [hasValidAmount, total, referencia, txParam]);

    return (
        <div className="min-h-screen bg-gray-100 px-4 py-10 flex justify-center">
            <div className="w-full max-w-md">
                <h1 className="text-center text-xl font-bold text-slate-800">
                    Pago seguro con PayPhone
                </h1>

                {hasValidAmount && (
                    <p className="text-center text-sm text-gray-700 mt-1">
                        Total a pagar:{" "}
                        <span className="font-bold text-green-600">
                            ${total!.toFixed(2)}
                        </span>
                    </p>
                )}

                <p className="text-center text-xs text-gray-500 break-words mt-1">
                    Referencia: {referencia}
                </p>

                <div className="mt-6 rounded-2xl shadow-md bg-white p-4 border border-gray-200">
                    <div id="pp-button" />
                </div>

                {errorMsg && (
                    <p className="mt-4 text-center text-red-500 text-xs">{errorMsg}</p>
                )}

                <button
                    onClick={() => router.push("/")}
                    className="mt-6 w-full border border-gray-400 py-2 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                    Volver al inicio
                </button>
            </div>
        </div>
    );
}
