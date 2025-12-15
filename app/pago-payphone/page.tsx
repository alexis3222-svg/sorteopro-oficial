"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const TOKEN = process.env.NEXT_PUBLIC_PAYPHONE_TOKEN ?? "";
const STORE_ID = process.env.NEXT_PUBLIC_PAYPHONE_STORE_ID ?? "";

declare global {
    interface Window {
        PPaymentButtonBox?: any;
    }
}

export default function PagoPayphonePage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center">
                    Cargando pago…
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

    // ✅ Parámetros reales que vienen por URL
    const amountParam = searchParams.get("amount");
    const refParam = searchParams.get("ref");
    const txParam = searchParams.get("tx");

    const sorteoIdParam = searchParams.get("sorteoId");
    const cantidadParam = searchParams.get("cantidad");
    const nombreParam = searchParams.get("nombre");
    const telefonoParam = searchParams.get("telefono");
    const correoParam = searchParams.get("correo");

    const total = amountParam ? Number(amountParam) : null;
    const referencia = refParam ?? "Pago SorteoPro";
    const hasValidAmount = total !== null && !Number.isNaN(total);

    // ✅ Tx estable (si viene por URL se usa; si no, se genera una vez)
    const clientTransactionId = useMemo(() => {
        const base = txParam && txParam.trim().length > 0 ? txParam.trim() : `WEB-${Date.now()}`;
        // PayPhone suele aceptar longitudes limitadas, dejamos 20
        return base.slice(0, 20);
    }, [txParam]);

    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        // =========================
        // 1) Guardar preorden SIEMPRE
        // =========================
        try {
            const preorden = {
                tx: clientTransactionId,
                sorteoId: sorteoIdParam ?? null,
                cantidad: cantidadParam ? Number(cantidadParam) : null,
                nombre: nombreParam ?? null,
                telefono: telefonoParam ?? null,
                correo: correoParam ?? null,
                total: total ?? null,
                referencia,
                metodo_pago: "payphone",
                createdAt: new Date().toISOString(),
            };

            // tests rápidos para confirmar que el código sí corre
            sessionStorage.setItem("pp_test", "ok-" + Date.now());

            sessionStorage.setItem("pp_preorden", JSON.stringify(preorden));
            localStorage.setItem("pp_preorden", JSON.stringify(preorden));
            sessionStorage.setItem("last_payphone_tx", clientTransactionId);

            console.log("✅ pp_test:", sessionStorage.getItem("pp_test"));
            console.log("✅ pp_preorden guardado:", preorden);
        } catch (e) {
            console.error("❌ Error guardando pp_preorden:", e);
        }

        // =========================
        // 2) Validaciones
        // =========================
        if (!hasValidAmount) {
            setErrorMsg("No se recibió correctamente el monto del pedido.");
            return;
        }
        if (!TOKEN || !STORE_ID) {
            setErrorMsg("Error de configuración de PayPhone (TOKEN/STORE_ID).");
            return;
        }

        // =========================
        // 3) Cargar CSS (una sola vez)
        // =========================
        const existingCss = document.querySelector<HTMLLinkElement>('link[data-payphone-css="1"]');
        if (!existingCss) {
            const link = document.createElement("link");
            link.rel = "stylesheet";
            link.href = "https://cdn.payphonetodoesposible.com/box/v1.1/payphone-payment-box.css";
            link.dataset.payphoneCss = "1";
            document.head.appendChild(link);
        }

        // =========================
        // 4) Cargar SDK (una sola vez) y render
        // =========================
        const renderBox = () => {
            try {
                if (!window.PPaymentButtonBox) {
                    setErrorMsg("SDK de PayPhone no disponible todavía.");
                    return;
                }

                const amountInCents = Math.round((total as number) * 100);
                const baseUrl = window.location.origin;

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
                    timeZone: -5,

                    // ✅ Forzamos que vuelva con tx
                    responseUrl: `${baseUrl}/pago-exitoso?tx=${encodeURIComponent(clientTransactionId)}`,
                    cancellationUrl: `${baseUrl}/pago-error`,
                });

                ppb.render("pp-button");
            } catch (e) {
                console.error("❌ Error inicializando PayPhone:", e);
                setErrorMsg("No se pudo inicializar PayPhone.");
            }
        };

        // Si ya está cargado, render directo
        if (window.PPaymentButtonBox) {
            renderBox();
            return;
        }

        // Si no, cargar script una sola vez
        const existingScript = document.querySelector<HTMLScriptElement>('script[data-payphone-sdk="1"]');
        if (existingScript) {
            existingScript.addEventListener("load", renderBox, { once: true });
            return;
        }

        const script = document.createElement("script");
        script.src = "https://cdn.payphonetodoesposible.com/box/v1.1/payphone-payment-box.js";
        script.type = "module";
        script.async = true;
        script.dataset.payphoneSdk = "1";
        script.onload = renderBox;
        script.onerror = () => setErrorMsg("No se pudo cargar el SDK de PayPhone.");
        document.body.appendChild(script);
    }, [
        clientTransactionId,
        hasValidAmount,
        total,
        referencia,
        sorteoIdParam,
        cantidadParam,
        nombreParam,
        telefonoParam,
        correoParam,
    ]);

    return (
        <div className="min-h-screen bg-gray-100 px-4 py-10 flex justify-center">
            <div className="w-full max-w-md">
                <h1 className="text-center text-xl font-bold text-slate-800">Pago seguro con PayPhone</h1>

                {hasValidAmount && (
                    <p className="text-center text-sm text-gray-700 mt-1">
                        Total a pagar:{" "}
                        <span className="font-bold text-green-600">${(total as number).toFixed(2)}</span>
                    </p>
                )}

                <p className="text-center text-xs text-gray-500 break-words mt-1">Referencia: {referencia}</p>

                <div className="mt-6 rounded-2xl shadow-md bg-white p-4 border border-gray-200">
                    <div id="pp-button" />
                </div>

                {errorMsg && <p className="mt-4 text-center text-red-500 text-xs">{errorMsg}</p>}

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
