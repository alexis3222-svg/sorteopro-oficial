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


type MetodoPago =
    | "payphone"
    | "wallet";


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


    /* =========================================================
       ORDEN
    ========================================================= */

    const [
        order,
        setOrder,
    ] =
        useState<
            MarketplacePaymentOrder | null
        >(
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
        useState<
            string | null
        >(
            null
        );


    /* =========================================================
       SESIÓN
    ========================================================= */

    const [
        accessToken,
        setAccessToken,
    ] =
        useState<
            string | null
        >(
            null
        );


    /* =========================================================
       MÉTODO DE PAGO
    ========================================================= */

    const [
        metodoPago,
        setMetodoPago,
    ] =
        useState<
            MetodoPago
        >(
            "payphone"
        );


    /* =========================================================
       PAYPHONE
    ========================================================= */

    const [
        sdkReady,
        setSdkReady,
    ] =
        useState(
            false
        );


    /* =========================================================
       WALLET
    ========================================================= */

    const [
        walletBalance,
        setWalletBalance,
    ] =
        useState<
            number | null
        >(
            null
        );


    const [
        walletLoading,
        setWalletLoading,
    ] =
        useState(
            true
        );


    const [
        walletPaying,
        setWalletPaying,
    ] =
        useState(
            false
        );


    /* =========================================================
       CARGAR ORDEN + BILLETERA
    ========================================================= */

    useEffect(
        () => {

            let active =
                true;


            async function loadData() {

                setLoading(
                    true
                );

                setWalletLoading(
                    true
                );

                setError(
                    null
                );


                try {

                    /* =================================================
                       1. SESIÓN
                    ================================================= */

                    const {
                        data:
                        sessionData,

                        error:
                        sessionError,
                    } =
                        await supabaseBrowser
                            .auth
                            .getSession();


                    if (
                        sessionError
                    ) {
                        throw sessionError;
                    }


                    const session =
                        sessionData
                            .session;


                    if (!session) {

                        router.replace(
                            "/mi-cuenta"
                        );

                        return;
                    }


                    if (!active) {
                        return;
                    }


                    setAccessToken(
                        session
                            .access_token
                    );


                    /* =================================================
                       2. CARGAR ORDEN
                    ================================================= */

                    const orderResponse =
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


                    const orderData =
                        await orderResponse
                            .json()
                            .catch(
                                () =>
                                    null
                            );


                    if (
                        !orderResponse.ok ||
                        !orderData?.ok
                    ) {
                        throw new Error(
                            orderData?.error ??
                            "No se pudo preparar la compra."
                        );
                    }


                    if (!active) {
                        return;
                    }


                    setOrder(
                        orderData
                            .order
                    );


                    /* =================================================
                       3. CONSULTAR BILLETERA

                       Si falla la billetera, PayPhone debe seguir
                       funcionando normalmente.
                    ================================================= */

                    try {

                        const walletResponse =
                            await fetch(
                                "/api/marketplace/wallet",
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


                        const walletData =
                            await walletResponse
                                .json()
                                .catch(
                                    () =>
                                        null
                                );


                        if (
                            active &&
                            walletResponse.ok &&
                            walletData?.ok
                        ) {

                            setWalletBalance(
                                Number(
                                    walletData
                                        .wallet
                                        ?.availableBalance ??
                                    0
                                )
                            );
                        }


                    } catch (
                    walletError
                    ) {

                        console.error(
                            "Marketplace wallet:",
                            walletError
                        );

                    } finally {

                        if (
                            active
                        ) {
                            setWalletLoading(
                                false
                            );
                        }
                    }


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
                            : "No se pudo preparar el pago."
                    );


                    setWalletLoading(
                        false
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


            void loadData();


            return () => {

                active =
                    false;
            };

        },
        [
            orderId,
            router,
        ]
    );


    /* =========================================================
       RENDER PAYPHONE

       SOLO cuando PayPhone está seleccionado.
    ========================================================= */

    useEffect(
        () => {

            /*
             * Si cambia a billetera,
             * limpiamos visualmente la Cajita.
             */
            if (
                metodoPago !==
                "payphone"
            ) {

                const container =
                    document
                        .getElementById(
                            "pp-button"
                        );


                if (
                    container
                ) {

                    container
                        .innerHTML =
                        "";
                }


                return;
            }


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
                    )
                        .PPaymentButtonBox;


                if (
                    !PaymentBox
                ) {

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


                if (
                    container
                ) {

                    container
                        .innerHTML =
                        "";
                }


                /*
                 * IMPORTANTE:
                 *
                 * Esta configuración es la misma
                 * que ya utilizabas.
                 *
                 * NO alteramos token, monto,
                 * Store ID ni callback.
                 */
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

        },
        [
            sdkReady,
            order,
            error,
            metodoPago,
        ]
    );


    /* =========================================================
       PAGAR CON BILLETERA
    ========================================================= */

    const pagarConWallet =
        async () => {

            if (
                !order
            ) {
                return;
            }


            if (
                !accessToken
            ) {

                router.push(
                    "/mi-cuenta"
                );

                return;
            }


            if (
                walletBalance ===
                null
            ) {

                setError(
                    "No se pudo consultar tu saldo Baruk593."
                );

                return;
            }


            if (
                walletBalance <
                order.price
            ) {

                setError(
                    `Saldo insuficiente. Tienes $${walletBalance.toFixed(
                        2
                    )} disponibles y esta compra cuesta $${order.price.toFixed(
                        2
                    )}.`
                );

                return;
            }


            setWalletPaying(
                true
            );

            setError(
                null
            );


            try {

                const response =
                    await fetch(
                        `/api/marketplace/spheres/orders/${order.id}/wallet`,
                        {
                            method:
                                "POST",

                            headers: {
                                Authorization:
                                    `Bearer ${accessToken}`,

                                "Content-Type":
                                    "application/json",
                            },

                            cache:
                                "no-store",
                        }
                    );


                const data =
                    await response
                        .json()
                        .catch(
                            () =>
                                null
                        );


                if (
                    !response.ok ||
                    !data?.ok ||
                    !data
                        ?.paymentConfirmed
                ) {

                    throw new Error(
                        data?.error ??
                        "No se pudo pagar con tu saldo."
                    );
                }


                if (
                    data
                        ?.newBalance !=
                    null
                ) {

                    setWalletBalance(
                        Number(
                            data
                                .newBalance
                        )
                    );
                }


                /*
                 * Reutilizamos la misma pantalla
                 * de resultado que utiliza PayPhone.
                 */
                router.replace(
                    `/marketplace/pago/${order.id}?status=pagado`
                );


            } catch (
            err:
                unknown
            ) {

                console.error(
                    "Marketplace wallet payment:",
                    err
                );


                setError(
                    err instanceof
                        Error
                        ? err.message
                        : "No se pudo pagar con tu saldo."
                );


            } finally {

                setWalletPaying(
                    false
                );
            }
        };


    /* =========================================================
       UI
    ========================================================= */

    return (

        <main
            className="
                min-h-screen
                bg-[#f7f7f8]
                px-4
                pb-16
                pt-28
            "
        >

            {/* =================================================
                CSS OFICIAL PAYPHONE
            ================================================= */}

            <link
                rel="stylesheet"
                href="https://cdn.payphonetodoesposible.com/box/v1.1/payphone-payment-box.css"
            />


            {/* =================================================
                SDK PAYPHONE
            ================================================= */}

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
                    max-w-[520px]
                    overflow-hidden
                    rounded-[28px]
                    border
                    border-black/[0.06]
                    bg-white
                    shadow-[0_25px_80px_rgba(0,0,0,0.12)]
                "
            >

                {/* ACENTO SUPERIOR */}

                <div
                    className="
                        h-1.5
                        w-full
                        bg-gradient-to-r
                        from-[#C1317F]
                        via-[#ff6600]
                        to-[#C1317F]
                    "
                />


                <div
                    className="
                        p-6
                        md:p-7
                    "
                >

                    {/* =================================================
                        CABECERA
                    ================================================= */}

                    <p
                        className="
                            text-center
                            text-[10px]
                            font-black
                            uppercase
                            tracking-[0.22em]
                            text-[#C1317F]
                        "
                    >
                        F1 Sphere Marketplace
                    </p>


                    <h1
                        className="
                            mt-2
                            text-center
                            text-[27px]
                            font-black
                            tracking-[-0.04em]
                            text-[#171717]
                        "
                    >
                        Completa tu compra
                    </h1>


                    <p
                        className="
                            mx-auto
                            mt-2
                            max-w-sm
                            text-center
                            text-xs
                            leading-5
                            text-slate-400
                        "
                    >
                        Elige cómo deseas pagar tu F1 Sphere.
                    </p>


                    {/* =================================================
                        CARGANDO
                    ================================================= */}

                    {loading && (

                        <div
                            className="
                                py-14
                                text-center
                            "
                        >

                            <div
                                className="
                                    mx-auto
                                    h-9
                                    w-9
                                    animate-spin
                                    rounded-full
                                    border-[3px]
                                    border-slate-200
                                    border-t-[#C1317F]
                                "
                            />


                            <p
                                className="
                                    mt-3
                                    text-xs
                                    font-semibold
                                    text-slate-400
                                "
                            >
                                Preparando tu compra...
                            </p>

                        </div>
                    )}


                    {/* =================================================
                        ERROR
                    ================================================= */}

                    {!loading &&
                        error && (

                            <div
                                className="
                                    mt-5
                                    rounded-[16px]
                                    border
                                    border-red-200
                                    bg-red-50
                                    px-4
                                    py-3
                                    text-[11px]
                                    font-semibold
                                    leading-5
                                    text-red-600
                                "
                            >
                                {
                                    error
                                }
                            </div>
                        )}


                    {/* =================================================
                        COMPRA
                    ================================================= */}

                    {!loading &&
                        order && (

                            <>

                                {/* TOTAL */}

                                <div
                                    className="
                                        mt-6
                                        flex
                                        items-center
                                        justify-between
                                        rounded-[20px]
                                        bg-[#171717]
                                        px-5
                                        py-5
                                    "
                                >

                                    <div>

                                        <p
                                            className="
                                                text-[9px]
                                                font-black
                                                uppercase
                                                tracking-[0.16em]
                                                text-white/40
                                            "
                                        >
                                            Tu compra
                                        </p>


                                        <p
                                            className="
                                                mt-1
                                                text-sm
                                                font-black
                                                text-white
                                            "
                                        >
                                            F1 Sphere
                                        </p>

                                    </div>


                                    <div
                                        className="
                                            text-right
                                        "
                                    >

                                        <p
                                            className="
                                                text-[9px]
                                                font-black
                                                uppercase
                                                tracking-[0.16em]
                                                text-white/40
                                            "
                                        >
                                            Total
                                        </p>


                                        <p
                                            className="
                                                mt-1
                                                text-3xl
                                                font-black
                                                tracking-[-0.05em]
                                                text-[#ff6600]
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

                                </div>


                                {/* =================================================
                                    MÉTODO DE PAGO
                                ================================================= */}

                                <div
                                    className="
                                        mt-6
                                    "
                                >

                                    <div
                                        className="
                                            mb-4
                                            flex
                                            items-center
                                            gap-3
                                        "
                                    >

                                        <div
                                            className="
                                                flex
                                                h-8
                                                w-8
                                                items-center
                                                justify-center
                                                rounded-xl
                                                bg-[#C1317F]
                                                text-xs
                                                font-black
                                                text-white
                                            "
                                        >
                                            1
                                        </div>


                                        <div>

                                            <p
                                                className="
                                                    text-sm
                                                    font-black
                                                    text-[#171717]
                                                "
                                            >
                                                Método de pago
                                            </p>


                                            <p
                                                className="
                                                    text-[11px]
                                                    text-slate-400
                                                "
                                            >
                                                Selecciona una opción.
                                            </p>

                                        </div>

                                    </div>


                                    <div
                                        className="
                                            space-y-3
                                        "
                                    >

                                        {/* =========================================
                                            PAYPHONE
                                        ========================================= */}

                                        <label
                                            className={`
                                                flex
                                                cursor-pointer
                                                items-center
                                                gap-3
                                                rounded-[18px]
                                                border
                                                p-4
                                                transition-all

                                                ${metodoPago ===
                                                    "payphone"

                                                    ? "border-[#ff6600] bg-[#ff6600]/[0.04] shadow-[0_0_0_3px_rgba(255,102,0,0.08)]"

                                                    : "border-slate-200 bg-white hover:border-slate-300"
                                                }
                                            `}
                                        >

                                            <input
                                                type="radio"

                                                name="marketplace_payment"

                                                className="
                                                    h-4
                                                    w-4
                                                    accent-[#ff6600]
                                                "

                                                checked={
                                                    metodoPago ===
                                                    "payphone"
                                                }

                                                onChange={() => {

                                                    setMetodoPago(
                                                        "payphone"
                                                    );

                                                    setError(
                                                        null
                                                    );
                                                }}
                                            />


                                            <div
                                                className="
                                                    flex
                                                    h-10
                                                    w-10
                                                    shrink-0
                                                    items-center
                                                    justify-center
                                                    rounded-xl
                                                    bg-[#ff6600]/10
                                                    text-[#ff6600]
                                                "
                                            >

                                                <svg
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    className="h-5 w-5"
                                                >

                                                    <rect
                                                        x="3"
                                                        y="6"
                                                        width="18"
                                                        height="12"
                                                        rx="2.5"
                                                        stroke="currentColor"
                                                        strokeWidth="1.8"
                                                    />

                                                    <path
                                                        d="M3 10h18"
                                                        stroke="currentColor"
                                                        strokeWidth="1.8"
                                                    />

                                                </svg>

                                            </div>


                                            <div
                                                className="
                                                    min-w-0
                                                    flex-1
                                                "
                                            >

                                                <div
                                                    className="
                                                        flex
                                                        items-center
                                                        justify-between
                                                        gap-2
                                                    "
                                                >

                                                    <p
                                                        className="
                                                            text-sm
                                                            font-black
                                                            text-[#171717]
                                                        "
                                                    >
                                                        PayPhone
                                                    </p>


                                                    {metodoPago ===
                                                        "payphone" && (

                                                            <span
                                                                className="
                                                                    rounded-full
                                                                    bg-[#ff6600]
                                                                    px-2
                                                                    py-1
                                                                    text-[9px]
                                                                    font-black
                                                                    uppercase
                                                                    tracking-[0.08em]
                                                                    text-white
                                                                "
                                                            >
                                                                Seleccionado
                                                            </span>
                                                        )}

                                                </div>


                                                <p
                                                    className="
                                                        mt-1
                                                        text-[11px]
                                                        text-slate-400
                                                    "
                                                >
                                                    Tarjeta o PayPhone App.
                                                </p>

                                            </div>

                                        </label>


                                        {/* =========================================
                                            BILLETERA
                                        ========================================= */}

                                        <label
                                            className={`
                                                flex
                                                cursor-pointer
                                                items-center
                                                gap-3
                                                rounded-[18px]
                                                border
                                                p-4
                                                transition-all

                                                ${metodoPago ===
                                                    "wallet"

                                                    ? "border-[#C1317F] bg-[#C1317F]/[0.04] shadow-[0_0_0_3px_rgba(193,49,127,0.08)]"

                                                    : "border-slate-200 bg-white hover:border-slate-300"
                                                }
                                            `}
                                        >

                                            <input
                                                type="radio"

                                                name="marketplace_payment"

                                                className="
                                                    h-4
                                                    w-4
                                                    accent-[#C1317F]
                                                "

                                                checked={
                                                    metodoPago ===
                                                    "wallet"
                                                }

                                                onChange={() => {

                                                    setMetodoPago(
                                                        "wallet"
                                                    );

                                                    setError(
                                                        null
                                                    );
                                                }}
                                            />


                                            <div
                                                className="
                                                    flex
                                                    h-10
                                                    w-10
                                                    shrink-0
                                                    items-center
                                                    justify-center
                                                    rounded-xl
                                                    bg-[#C1317F]/10
                                                    text-[#C1317F]
                                                "
                                            >

                                                <svg
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    className="h-5 w-5"
                                                >

                                                    <path
                                                        d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-9Z"
                                                        stroke="currentColor"
                                                        strokeWidth="1.8"
                                                    />

                                                    <path
                                                        d="M15 10h5v4h-5a2 2 0 1 1 0-4Z"
                                                        stroke="currentColor"
                                                        strokeWidth="1.8"
                                                    />

                                                </svg>

                                            </div>


                                            <div
                                                className="
                                                    min-w-0
                                                    flex-1
                                                "
                                            >

                                                <div
                                                    className="
                                                        flex
                                                        items-center
                                                        justify-between
                                                        gap-2
                                                    "
                                                >

                                                    <p
                                                        className="
                                                            text-sm
                                                            font-black
                                                            text-[#171717]
                                                        "
                                                    >
                                                        Saldo Baruk593
                                                    </p>


                                                    {!walletLoading &&
                                                        walletBalance !==
                                                        null && (

                                                            <span
                                                                className="
                                                                    rounded-full
                                                                    bg-[#C1317F]/10
                                                                    px-2.5
                                                                    py-1
                                                                    text-[10px]
                                                                    font-black
                                                                    text-[#C1317F]
                                                                "
                                                            >
                                                                $
                                                                {
                                                                    walletBalance
                                                                        .toFixed(
                                                                            2
                                                                        )
                                                                }
                                                            </span>
                                                        )}

                                                </div>


                                                <p
                                                    className="
                                                        mt-1
                                                        text-[11px]
                                                        text-slate-400
                                                    "
                                                >
                                                    Usa tus ventas, comisiones o premios.
                                                </p>

                                            </div>

                                        </label>

                                    </div>

                                </div>


                                {/* =================================================
                                    WALLET SELECCIONADA
                                ================================================= */}

                                {metodoPago ===
                                    "wallet" && (

                                        <div
                                            className="
                                                mt-4
                                                rounded-[18px]
                                                border
                                                border-[#C1317F]/15
                                                bg-[#C1317F]/[0.035]
                                                p-4
                                            "
                                        >

                                            {walletLoading ? (

                                                <div
                                                    className="
                                                        flex
                                                        items-center
                                                        gap-2
                                                    "
                                                >

                                                    <div
                                                        className="
                                                            h-4
                                                            w-4
                                                            animate-spin
                                                            rounded-full
                                                            border-2
                                                            border-[#C1317F]/20
                                                            border-t-[#C1317F]
                                                        "
                                                    />


                                                    <p
                                                        className="
                                                            text-[11px]
                                                            font-semibold
                                                            text-slate-500
                                                        "
                                                    >
                                                        Consultando tu saldo...
                                                    </p>

                                                </div>

                                            ) : walletBalance !==
                                                null ? (

                                                <div
                                                    className="
                                                        flex
                                                        items-center
                                                        justify-between
                                                        gap-3
                                                    "
                                                >

                                                    <div>

                                                        <p
                                                            className="
                                                                text-[9px]
                                                                font-black
                                                                uppercase
                                                                tracking-[0.12em]
                                                                text-slate-400
                                                            "
                                                        >
                                                            Disponible
                                                        </p>


                                                        <p
                                                            className="
                                                                mt-1
                                                                text-xl
                                                                font-black
                                                                text-[#171717]
                                                            "
                                                        >
                                                            $
                                                            {
                                                                walletBalance
                                                                    .toFixed(
                                                                        2
                                                                    )
                                                            }
                                                        </p>

                                                    </div>


                                                    {walletBalance >=
                                                        order.price ? (

                                                        <span
                                                            className="
                                                                    rounded-full
                                                                    bg-emerald-50
                                                                    px-3
                                                                    py-1.5
                                                                    text-[10px]
                                                                    font-black
                                                                    text-emerald-700
                                                                "
                                                        >
                                                            ✓ Saldo suficiente
                                                        </span>

                                                    ) : (

                                                        <span
                                                            className="
                                                                    rounded-full
                                                                    bg-amber-50
                                                                    px-3
                                                                    py-1.5
                                                                    text-[10px]
                                                                    font-black
                                                                    text-amber-700
                                                                "
                                                        >
                                                            Saldo insuficiente
                                                        </span>
                                                    )}

                                                </div>

                                            ) : (

                                                <p
                                                    className="
                                                        text-[11px]
                                                        text-slate-500
                                                    "
                                                >
                                                    No se pudo consultar tu saldo.
                                                </p>
                                            )}

                                        </div>
                                    )}


                                {/* =================================================
                                    PAYPHONE CAJITA
                                ================================================= */}

                                {metodoPago ===
                                    "payphone" && (

                                        <div
                                            className="
                                                mt-5
                                                border-t
                                                border-slate-100
                                                pt-5
                                            "
                                        >

                                            <p
                                                className="
                                                    mb-3
                                                    text-[10px]
                                                    font-black
                                                    uppercase
                                                    tracking-[0.14em]
                                                    text-slate-400
                                                "
                                            >
                                                Datos de pago
                                            </p>


                                            <div
                                                id="pp-button"
                                            />

                                        </div>
                                    )}


                                {/* =================================================
                                    BOTÓN WALLET
                                ================================================= */}

                                {metodoPago ===
                                    "wallet" && (

                                        <button
                                            type="button"

                                            onClick={() => {
                                                void pagarConWallet();
                                            }}

                                            disabled={
                                                walletPaying ||
                                                walletLoading ||
                                                walletBalance ===
                                                null ||
                                                walletBalance <
                                                order.price
                                            }

                                            className="
                                                mt-5
                                                min-h-[54px]
                                                w-full
                                                rounded-2xl
                                                bg-[#171717]
                                                px-5
                                                text-sm
                                                font-black
                                                text-white
                                                shadow-[0_12px_30px_rgba(0,0,0,0.15)]
                                                transition
                                                hover:bg-[#C1317F]
                                                disabled:cursor-not-allowed
                                                disabled:opacity-40
                                            "
                                        >
                                            {walletPaying
                                                ? "Procesando pago..."
                                                : `Pagar $${order.price.toFixed(
                                                    2
                                                )} con saldo`}
                                        </button>
                                    )}


                                {/* RESERVA */}

                                <div
                                    className="
                                        mt-5
                                        flex
                                        items-start
                                        gap-2
                                        rounded-[14px]
                                        bg-slate-50
                                        px-3.5
                                        py-3
                                    "
                                >

                                    <span
                                        className="
                                            mt-0.5
                                            text-xs
                                        "
                                    >
                                        🔒
                                    </span>


                                    <p
                                        className="
                                            text-[10px]
                                            leading-4
                                            text-slate-400
                                        "
                                    >
                                        La F1 Sphere permanece reservada temporalmente mientras completas el pago.
                                    </p>

                                </div>

                            </>
                        )}


                    {/* =================================================
                        VOLVER
                    ================================================= */}

                    <button
                        type="button"

                        onClick={() =>
                            router.push(
                                "/marketplace"
                            )
                        }

                        className="
                            mt-5
                            min-h-[44px]
                            w-full
                            rounded-xl
                            text-xs
                            font-bold
                            text-slate-400
                            transition
                            hover:bg-slate-50
                            hover:text-[#171717]
                        "
                    >
                        Volver al Marketplace
                    </button>


                    <p
                        className="
                            mt-2
                            text-center
                            text-[9px]
                            font-semibold
                            text-slate-300
                        "
                    >
                        Pago seguro · Baruk593
                    </p>

                </div>

            </div>

        </main>
    );
}