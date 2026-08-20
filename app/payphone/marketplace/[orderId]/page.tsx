"use client";

import {
    useEffect,
    useState,
} from "react";

import Script from "next/script";

import {
    useParams,
    useRouter,
} from "next/navigation";

import {
    supabaseBrowser,
} from "@/lib/supabaseClient";


const TOKEN =
    process.env
        .NEXT_PUBLIC_PAYPHONE_TOKEN ??
    "";

const STORE_ID =
    process.env
        .NEXT_PUBLIC_PAYPHONE_STORE_ID ??
    "";


type MarketplacePaymentOrder = {
    id: string;

    price: number;

    amountInCents: number;

    currency: string;

    clientTransactionId: string;

    reservedUntil:
    | string
    | null;
};


export default function MarketplacePayphonePage() {

    const router =
        useRouter();

    const params =
        useParams<{
            orderId: string;
        }>();


    const orderId =
        params.orderId;


    const [
        order,
        setOrder,
    ] =
        useState<MarketplacePaymentOrder | null>(
            null
        );


    const [
        loading,
        setLoading,
    ] =
        useState(
            true
        );


    const [
        error,
        setError,
    ] =
        useState<string | null>(
            null
        );


    const [
        sdkReady,
        setSdkReady,
    ] =
        useState(
            false
        );


    /* =========================================================
       CARGAR ORDEN SEGURA DESDE EL SERVIDOR
    ========================================================= */

    useEffect(() => {

        let active =
            true;


        async function loadOrder() {

            try {

                const {
                    data:
                    sessionData,
                } =
                    await supabaseBrowser
                        .auth
                        .getSession();


                const session =
                    sessionData.session;


                if (!session) {

                    router.replace(
                        "/mi-cuenta"
                    );

                    return;
                }


                const response =
                    await fetch(
                        `/api/marketplace/spheres/orders/${orderId}/payphone`,
                        {
                            method:
                                "GET",

                            headers: {
                                Authorization:
                                    `Bearer ${session.access_token}`,
                            },

                            cache:
                                "no-store",
                        }
                    );


                const data =
                    await response.json();


                if (
                    !response.ok ||
                    !data?.ok
                ) {
                    throw new Error(
                        data?.error ??
                        "No se pudo preparar el pago"
                    );
                }


                if (!active) {
                    return;
                }


                setOrder(
                    data.order
                );


            } catch (
            err:
                unknown
            ) {

                if (!active) {
                    return;
                }


                setError(
                    err instanceof
                        Error
                        ? err.message
                        : "No se pudo preparar el pago"
                );


            } finally {

                if (
                    active
                ) {
                    setLoading(
                        false
                    );
                }
            }
        }


        loadOrder();


        return () => {

            active =
                false;
        };

    }, [
        orderId,
        router,
    ]);


    /* =========================================================
       RENDER PAYPHONE
    ========================================================= */

    useEffect(() => {

        if (
            !sdkReady ||
            !order ||
            error
        ) {
            return;
        }


        try {

            const PaymentBox =
                (
                    window as any
                ).PPaymentButtonBox;


            if (!PaymentBox) {

                setError(
                    "No se pudo cargar PayPhone."
                );

                return;
            }


            if (
                !TOKEN ||
                !STORE_ID
            ) {

                setError(
                    "PayPhone no está configurado."
                );

                return;
            }


            const container =
                document
                    .getElementById(
                        "pp-button"
                    );


            if (container) {

                container.innerHTML =
                    "";
            }


            const ppb =
                new PaymentBox({

                    token:
                        TOKEN,

                    clientTransactionId:
                        order
                            .clientTransactionId,

                    amount:
                        order
                            .amountInCents,

                    amountWithoutTax:
                        order
                            .amountInCents,

                    amountWithTax:
                        0,

                    tax:
                        0,

                    service:
                        0,

                    tip:
                        0,

                    currency:
                        order.currency ||
                        "USD",

                    storeId:
                        STORE_ID,

                    reference:
                        `Marketplace F1 Sphere - ${order.id.slice(
                            0,
                            8
                        )}`,

                    lang:
                        "es",

                    defaultMethod:
                        "card",

                    timeZone:
                        -5,
                });


            ppb.render(
                "pp-button"
            );


        } catch (
        err:
            unknown
        ) {

            console.error(
                "Marketplace PayPhone:",
                err
            );


            setError(
                "No se pudo iniciar PayPhone."
            );
        }

    }, [
        sdkReady,
        order,
        error,
    ]);


    return (

        <main
            className="
                min-h-screen
                bg-slate-50
                px-4
                pb-16
                pt-28
            "
        >

            <link
                rel="stylesheet"
                href="https://cdn.payphonetodoesposible.com/box/v1.1/payphone-payment-box.css"
            />

            <Script
                src="https://cdn.payphonetodoesposible.com/box/v1.1/payphone-payment-box.js"

                type="module"

                strategy="afterInteractive"

                onLoad={() =>
                    setSdkReady(
                        true
                    )
                }
            />


            <div
                className="
                    mx-auto
                    w-full
                    max-w-md

                    overflow-hidden

                    rounded-3xl

                    border
                    border-slate-200

                    bg-white

                    shadow-xl
                "
            >

                <div className="h-1.5 bg-[#C1317F]" />


                <div className="p-6">

                    <p
                        className="
                            text-center
                            text-[10px]
                            font-black
                            uppercase
                            tracking-[0.2em]
                            text-[#C1317F]
                        "
                    >
                        F1 Sphere Marketplace
                    </p>


                    <h1
                        className="
                            mt-2
                            text-center
                            text-2xl
                            font-black
                            text-slate-900
                        "
                    >
                        Pago seguro
                    </h1>


                    {loading && (

                        <div className="py-12 text-center">

                            <div
                                className="
                                    mx-auto
                                    h-9
                                    w-9
                                    animate-spin
                                    rounded-full
                                    border-4
                                    border-slate-200
                                    border-t-[#C1317F]
                                "
                            />

                            <p className="mt-3 text-sm text-slate-400">
                                Preparando tu compra...
                            </p>

                        </div>
                    )}


                    {!loading &&
                        error && (

                            <div
                                className="
                                    mt-6
                                    rounded-xl
                                    bg-red-50
                                    p-4
                                    text-sm
                                    font-semibold
                                    text-red-600
                                "
                            >
                                {
                                    error
                                }
                            </div>
                        )}


                    {!loading &&
                        !error &&
                        order && (

                            <>

                                <div
                                    className="
                                        mt-6
                                        rounded-2xl
                                        bg-slate-50
                                        p-5
                                        text-center
                                    "
                                >

                                    <p
                                        className="
                                            text-[10px]
                                            font-black
                                            uppercase
                                            tracking-wider
                                            text-slate-400
                                        "
                                    >
                                        Total a pagar
                                    </p>


                                    <p
                                        className="
                                            mt-1
                                            text-4xl
                                            font-black
                                            text-slate-900
                                        "
                                    >
                                        $
                                        {
                                            order
                                                .price
                                                .toFixed(
                                                    2
                                                )
                                        }
                                    </p>

                                </div>


                                <div
                                    id="pp-button"
                                    className="mt-5"
                                />


                                <p
                                    className="
                                        mt-4
                                        text-center
                                        text-xs
                                        leading-5
                                        text-slate-400
                                    "
                                >
                                    La esfera queda reservada
                                    temporalmente mientras completas
                                    el pago.
                                </p>

                            </>
                        )}


                    <button
                        type="button"

                        onClick={() =>
                            router.push(
                                "/marketplace"
                            )
                        }

                        className="
                            mt-5
                            w-full
                            rounded-xl
                            border
                            border-slate-200
                            py-3
                            text-sm
                            font-bold
                            text-slate-600
                        "
                    >
                        Volver al Marketplace
                    </button>

                </div>

            </div>

        </main>
    );
}