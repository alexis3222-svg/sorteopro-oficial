"use client";

import {
    useEffect,
    useRef,
    useState,
} from "react";

import Link from "next/link";

import {
    useParams,
    useSearchParams,
} from "next/navigation";

import PayphoneShopBox from "@/components/baruk/shop/PayphoneShopBox";

import {
    useBarukCart,
} from "@/components/baruk/shop/BarukCartProvider";

import {
    supabaseBrowser,
} from "@/lib/supabaseClient";


type MetodoPago =
    | "payphone"
    | "wallet"
    | "transferencia"
    | null;


type Pedido = {
    id: string;

    numero: string;

    subtotal: number;
    costoEnvio: number;
    descuento: number;
    total: number;

    metodoPago:
    | string
    | null;

    estado: string;

    estadoPago: string;

    clientTransactionId:
    | string
    | null;
};


type ItemPedido = {
    id: string;

    nombre: string;

    sku:
    | string
    | null;

    precio: number;

    cantidad: number;

    total: number;
};


export default function PagoBarukShopPage() {

    const params =
        useParams();


    const searchParams =
        useSearchParams();


    const {
        vaciarCarrito,
    } =
        useBarukCart();


    const carritoVaciado =
        useRef(
            false
        );


    const idParam =
        params.id;


    const orderId =
        Array.isArray(
            idParam
        )
            ? idParam[0]
            : String(
                idParam ??
                ""
            );


    const status =
        searchParams.get(
            "status"
        );


    /* ========================================================
       PEDIDO
    ======================================================== */

    const [
        pedido,
        setPedido,
    ] =
        useState<
            Pedido | null
        >(
            null
        );


    const [
        items,
        setItems,
    ] =
        useState<
            ItemPedido[]
        >(
            []
        );


    /* ========================================================
       MÉTODO
    ======================================================== */

    const [
        metodo,
        setMetodo,
    ] =
        useState<
            MetodoPago
        >(
            null
        );


    /* ========================================================
       ESTADOS GENERALES
    ======================================================== */

    const [
        loading,
        setLoading,
    ] =
        useState(
            true
        );


    const [
        procesando,
        setProcesando,
    ] =
        useState(
            false
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


    /* ========================================================
       BILLETERA BARUK593
    ======================================================== */

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
            false
        );


    const [
        walletPaying,
        setWalletPaying,
    ] =
        useState(
            false
        );


    const [
        walletAccessToken,
        setWalletAccessToken,
    ] =
        useState<
            string | null
        >(
            null
        );


    const [
        walletSessionEmail,
        setWalletSessionEmail,
    ] =
        useState<
            string | null
        >(
            null
        );


    /* ========================================================
       DATOS BANCARIOS
    ======================================================== */

    const banco =
        process.env
            .NEXT_PUBLIC_SHOP_BANK_NAME ??
        "";


    const cuenta =
        process.env
            .NEXT_PUBLIC_SHOP_BANK_ACCOUNT ??
        "";


    const tipoCuenta =
        process.env
            .NEXT_PUBLIC_SHOP_BANK_ACCOUNT_TYPE ??
        "";


    const titular =
        process.env
            .NEXT_PUBLIC_SHOP_BANK_HOLDER ??
        "";


    const identificacion =
        process.env
            .NEXT_PUBLIC_SHOP_BANK_ID ??
        "";


    const whatsapp =
        process.env
            .NEXT_PUBLIC_SHOP_WHATSAPP ??
        "";


    /* ========================================================
       CARGAR PEDIDO
    ======================================================== */

    useEffect(
        () => {

            if (!orderId) {
                return;
            }


            async function cargarPedido() {

                try {

                    setLoading(
                        true
                    );

                    setError(
                        null
                    );


                    const response =
                        await fetch(
                            `/api/shop/orders/${orderId}/payment`,
                            {
                                cache:
                                    "no-store",
                            }
                        );


                    const json =
                        await response
                            .json()
                            .catch(
                                () =>
                                    null
                            );


                    if (
                        !response.ok ||
                        !json?.ok
                    ) {

                        throw new Error(
                            json?.error ||
                            "No se pudo cargar el pedido."
                        );
                    }


                    setPedido(
                        json.pedido
                    );


                    setItems(
                        json.items ??
                        []
                    );


                    /*
                     * Si el usuario ya había elegido
                     * transferencia previamente,
                     * conservamos esa vista.
                     */
                    if (
                        json.pedido
                            ?.metodoPago ===
                        "transferencia"
                    ) {

                        setMetodo(
                            "transferencia"
                        );
                    }


                } catch (
                err
                ) {

                    setError(
                        err instanceof
                            Error
                            ? err.message
                            : "No se pudo cargar el pedido."
                    );


                } finally {

                    setLoading(
                        false
                    );
                }
            }


            void cargarPedido();


        },
        [
            orderId,
        ]
    );


    /* ========================================================
       PAGO CONFIRMADO → VACIAR CARRITO
    ======================================================== */

    useEffect(
        () => {

            const pagado =
                pedido
                    ?.estadoPago ===
                "pagado" ||
                status ===
                "pagado";


            if (
                pagado &&
                !carritoVaciado
                    .current
            ) {

                carritoVaciado
                    .current =
                    true;


                vaciarCarrito();
            }


        },
        [
            pedido?.estadoPago,
            status,
            vaciarCarrito,
        ]
    );


    /* ========================================================
       SELECCIONAR PAYPHONE
    ======================================================== */

    function seleccionarPayPhone() {

        setMetodo(
            "payphone"
        );

        setError(
            null
        );
    }


    /* ========================================================
       SELECCIONAR BILLETERA
    ======================================================== */

    async function seleccionarWallet() {

        setMetodo(
            "wallet"
        );


        setError(
            null
        );


        setWalletLoading(
            true
        );


        setWalletBalance(
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

                setWalletAccessToken(
                    null
                );


                setWalletSessionEmail(
                    null
                );


                return;
            }


            const email =
                String(
                    session
                        .user
                        .email ??
                    ""
                )
                    .trim()
                    .toLowerCase();


            setWalletAccessToken(
                session
                    .access_token
            );


            setWalletSessionEmail(
                email ||
                null
            );


            /* =================================================
               2. CONSULTAR SALDO
            ================================================= */

            const response =
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


            const json =
                await response
                    .json()
                    .catch(
                        () =>
                            null
                    );


            if (
                !response.ok ||
                !json?.ok
            ) {

                throw new Error(
                    json?.error ||
                    "No se pudo consultar tu saldo."
                );
            }


            setWalletBalance(
                Number(
                    json.wallet
                        ?.availableBalance ??
                    0
                )
            );


        } catch (
        err
        ) {

            console.error(
                "Baruk Shop wallet:",
                err
            );


            setError(
                err instanceof
                    Error
                    ? err.message
                    : "No se pudo consultar tu Billetera Baruk593."
            );


        } finally {

            setWalletLoading(
                false
            );
        }
    }


    /* ========================================================
       PAGAR CON BILLETERA
    ======================================================== */

    async function pagarConWallet() {

        if (
            !pedido ||
            walletPaying
        ) {

            return;
        }


        if (
            !walletAccessToken
        ) {

            setError(
                "Debes iniciar sesión en Mi Cuenta para pagar con tu saldo Baruk593."
            );

            return;
        }


        if (
            walletBalance ===
            null
        ) {

            setError(
                "No se pudo consultar tu saldo disponible."
            );

            return;
        }


        if (
            walletBalance <
            pedido.total
        ) {

            setError(
                `Saldo insuficiente. Tienes $${walletBalance.toFixed(
                    2
                )} disponibles y este pedido cuesta $${pedido.total.toFixed(
                    2
                )}.`
            );

            return;
        }


        try {

            setWalletPaying(
                true
            );


            setError(
                null
            );


            const response =
                await fetch(
                    `/api/shop/orders/${pedido.id}/wallet`,
                    {
                        method:
                            "POST",

                        headers: {
                            Authorization:
                                `Bearer ${walletAccessToken}`,

                            "Content-Type":
                                "application/json",
                        },

                        cache:
                            "no-store",
                    }
                );


            const json =
                await response
                    .json()
                    .catch(
                        () =>
                            null
                    );


            if (
                !response.ok ||
                !json?.ok ||
                !json
                    ?.paymentConfirmed
            ) {

                throw new Error(
                    json?.error ||
                    "No se pudo procesar el pago con tu saldo."
                );
            }


            if (
                json
                    ?.newBalance !=
                null
            ) {

                setWalletBalance(
                    Number(
                        json
                            .newBalance
                    )
                );
            }


            /*
             * Actualizamos localmente el pedido.
             * Esto activa inmediatamente la pantalla
             * de compra confirmada.
             */
            setPedido(
                (
                    actual
                ) =>

                    actual
                        ? {
                            ...actual,

                            metodoPago:
                                "wallet",

                            estadoPago:
                                "pagado",

                            estado:
                                "confirmado",
                        }
                        : actual
            );


        } catch (
        err
        ) {

            console.error(
                "Baruk Shop wallet payment:",
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
    }


    /* ========================================================
       ELEGIR TRANSFERENCIA
    ======================================================== */

    async function seleccionarTransferencia() {

        if (
            !pedido ||
            procesando
        ) {

            return;
        }


        try {

            setProcesando(
                true
            );


            setError(
                null
            );


            const response =
                await fetch(
                    `/api/shop/orders/${pedido.id}/payment`,
                    {
                        method:
                            "POST",

                        headers: {
                            "Content-Type":
                                "application/json",
                        },

                        body:
                            JSON.stringify({
                                metodo:
                                    "transferencia",
                            }),
                    }
                );


            const json =
                await response
                    .json()
                    .catch(
                        () =>
                            null
                    );


            if (
                !response.ok ||
                !json?.ok
            ) {

                throw new Error(
                    json?.error ||
                    "No se pudo seleccionar transferencia."
                );
            }


            setMetodo(
                "transferencia"
            );


            setPedido(
                (
                    actual
                ) =>

                    actual
                        ? {
                            ...actual,

                            metodoPago:
                                "transferencia",

                            estadoPago:
                                "pendiente",
                        }
                        : actual
            );


            /*
             * La orden queda registrada.
             * El carrito se puede limpiar para el comprador.
             */
            if (
                !carritoVaciado
                    .current
            ) {

                carritoVaciado
                    .current =
                    true;


                vaciarCarrito();
            }


        } catch (
        err
        ) {

            setError(
                err instanceof
                    Error
                    ? err.message
                    : "No se pudo seleccionar transferencia."
            );


        } finally {

            setProcesando(
                false
            );
        }
    }


    /* ========================================================
       LOADING
    ======================================================== */

    if (
        loading
    ) {

        return (

            <div
                className="
                    flex
                    min-h-[65vh]
                    items-center
                    justify-center
                "
            >

                <div
                    className="
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
                            mt-4
                            text-xs
                            font-semibold
                            text-slate-400
                        "
                    >
                        Preparando tu pedido...
                    </p>

                </div>

            </div>
        );
    }


    /* ========================================================
       ERROR SIN PEDIDO
    ======================================================== */

    if (
        error &&
        !pedido
    ) {

        return (

            <div
                className="
                    flex
                    min-h-[65vh]
                    items-center
                    justify-center
                    px-4
                    text-center
                "
            >

                <div
                    className="
                        max-w-md
                    "
                >

                    <div
                        className="
                            mx-auto
                            flex
                            h-14
                            w-14
                            items-center
                            justify-center
                            rounded-2xl
                            bg-red-50
                            text-xl
                            font-black
                            text-red-500
                        "
                    >
                        !
                    </div>


                    <h1
                        className="
                            mt-5
                            text-2xl
                            font-black
                            tracking-[-0.04em]
                            text-[#171717]
                        "
                    >
                        Pedido no disponible
                    </h1>


                    <p
                        className="
                            mt-3
                            text-sm
                            leading-6
                            text-slate-500
                        "
                    >
                        {
                            error
                        }
                    </p>


                    <Link
                        href="/tienda"

                        className="
                            mt-6
                            inline-flex
                            min-h-[48px]
                            items-center
                            justify-center
                            rounded-xl
                            bg-[#171717]
                            px-6
                            text-sm
                            font-black
                            text-white
                            transition
                            hover:bg-[#C1317F]
                        "
                    >
                        Volver a Baruk Shop
                    </Link>

                </div>

            </div>
        );
    }


    if (
        !pedido
    ) {

        return null;
    }


    /* ========================================================
       VARIABLES
    ======================================================== */

    const pagado =
        pedido
            .estadoPago ===
        "pagado" ||
        status ===
        "pagado";


    const payphoneAmount =
        Math.round(
            pedido.total *
            100
        );


    /* ========================================================
       COMPRA COMPLETADA
    ======================================================== */

    if (
        pagado
    ) {

        return (

            <div
                className="
                    flex
                    min-h-[70vh]
                    items-center
                    justify-center
                    bg-[#f7f7f8]
                    px-4
                    py-12
                    text-center
                "
            >

                <div
                    className="
                        w-full
                        max-w-[520px]
                        overflow-hidden
                        rounded-[28px]
                        border
                        border-black/[0.06]
                        bg-white
                        shadow-[0_25px_80px_rgba(0,0,0,0.10)]
                    "
                >

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
                            p-7
                            md:p-9
                        "
                    >

                        <div
                            className="
                                mx-auto
                                flex
                                h-16
                                w-16
                                items-center
                                justify-center
                                rounded-2xl
                                bg-emerald-50
                                text-2xl
                                font-black
                                text-emerald-600
                            "
                        >
                            ✓
                        </div>


                        <p
                            className="
                                mt-6
                                text-[10px]
                                font-black
                                uppercase
                                tracking-[0.2em]
                                text-[#C1317F]
                            "
                        >
                            Pago confirmado
                        </p>


                        <h1
                            className="
                                mt-2
                                text-3xl
                                font-black
                                tracking-[-0.045em]
                                text-[#171717]
                            "
                        >
                            ¡Compra realizada!
                        </h1>


                        <p
                            className="
                                mt-3
                                text-sm
                                leading-6
                                text-slate-500
                            "
                        >
                            Tu pedido{" "}
                            <strong
                                className="
                                    text-[#171717]
                                "
                            >
                                {
                                    pedido.numero
                                }
                            </strong>{" "}
                            fue confirmado correctamente.
                        </p>


                        {pedido.metodoPago ===
                            "wallet" && (

                                <div
                                    className="
                                        mt-5
                                        rounded-[16px]
                                        border
                                        border-[#C1317F]/15
                                        bg-[#C1317F]/[0.035]
                                        px-4
                                        py-3
                                    "
                                >

                                    <p
                                        className="
                                            text-xs
                                            font-bold
                                            text-[#C1317F]
                                        "
                                    >
                                        Pagado con Saldo Baruk593
                                    </p>

                                </div>
                            )}


                        <Link
                            href="/tienda"

                            className="
                                mt-7
                                inline-flex
                                min-h-[52px]
                                w-full
                                items-center
                                justify-center
                                rounded-2xl
                                bg-[#171717]
                                px-6
                                text-sm
                                font-black
                                text-white
                                shadow-[0_10px_25px_rgba(0,0,0,0.12)]
                                transition
                                hover:bg-[#C1317F]
                            "
                        >
                            Volver a Baruk Shop
                        </Link>

                    </div>

                </div>

            </div>
        );
    }


    /* ========================================================
       PÁGINA DE PAGO
    ======================================================== */

    return (

        <main
            className="
                min-h-screen
                bg-[#f7f7f8]
                pb-16
            "
        >

            <div
                className="
                    mx-auto
                    w-full
                    max-w-6xl
                    px-4
                    py-8
                    sm:px-6
                    md:py-10
                "
            >

                {/* =================================================
                    HEADER
                ================================================= */}

                <div
                    className="
                        mb-7
                    "
                >

                    <Link
                        href="/tienda/carrito"

                        className="
                            inline-flex
                            items-center
                            gap-2
                            text-xs
                            font-bold
                            text-slate-400
                            transition
                            hover:text-[#C1317F]
                        "
                    >
                        ← Volver al carrito
                    </Link>


                    <div
                        className="
                            mt-6
                            flex
                            flex-col
                            gap-4
                            md:flex-row
                            md:items-end
                            md:justify-between
                        "
                    >

                        <div>

                            <p
                                className="
                                    text-[10px]
                                    font-black
                                    uppercase
                                    tracking-[0.22em]
                                    text-[#C1317F]
                                "
                            >
                                Baruk Shop
                            </p>


                            <h1
                                className="
                                    mt-2
                                    text-3xl
                                    font-black
                                    tracking-[-0.045em]
                                    text-[#171717]
                                    md:text-4xl
                                "
                            >
                                Completa tu compra
                            </h1>


                            <p
                                className="
                                    mt-2
                                    text-sm
                                    text-slate-500
                                "
                            >
                                Pedido{" "}
                                <strong
                                    className="
                                        text-[#171717]
                                    "
                                >
                                    {
                                        pedido.numero
                                    }
                                </strong>
                            </p>

                        </div>


                        <div
                            className="
                                rounded-2xl
                                border
                                border-slate-200
                                bg-white
                                px-5
                                py-3
                                shadow-sm
                            "
                        >

                            <p
                                className="
                                    text-[9px]
                                    font-black
                                    uppercase
                                    tracking-[0.14em]
                                    text-slate-400
                                "
                            >
                                Total a pagar
                            </p>


                            <p
                                className="
                                    mt-1
                                    text-2xl
                                    font-black
                                    tracking-[-0.04em]
                                    text-[#171717]
                                "
                            >
                                $
                                {
                                    pedido.total
                                        .toFixed(
                                            2
                                        )
                                }
                            </p>

                        </div>

                    </div>

                </div>


                {/* ERROR */}

                {error && (

                    <div
                        className="
                            mb-5
                            rounded-[16px]
                            border
                            border-red-200
                            bg-red-50
                            px-4
                            py-3
                            text-xs
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


                <div
                    className="
                        grid
                        gap-7
                        lg:grid-cols-[minmax(0,1fr)_360px]
                    "
                >

                    {/* =================================================
                        IZQUIERDA
                    ================================================= */}

                    <section
                        className="
                            overflow-hidden
                            rounded-[28px]
                            border
                            border-black/[0.06]
                            bg-white
                            shadow-[0_18px_60px_rgba(0,0,0,0.07)]
                        "
                    >

                        {/* ACENTO */}

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
                                p-5
                                md:p-7
                            "
                        >

                            <div
                                className="
                                    flex
                                    items-center
                                    gap-3
                                "
                            >

                                <div
                                    className="
                                        flex
                                        h-9
                                        w-9
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

                                    <h2
                                        className="
                                            text-lg
                                            font-black
                                            tracking-[-0.025em]
                                            text-[#171717]
                                        "
                                    >
                                        Método de pago
                                    </h2>


                                    <p
                                        className="
                                            mt-0.5
                                            text-[11px]
                                            text-slate-400
                                        "
                                    >
                                        Elige cómo deseas pagar tu pedido.
                                    </p>

                                </div>

                            </div>


                            {/* =================================================
                                MÉTODOS
                            ================================================= */}

                            <div
                                className="
                                    mt-6
                                    space-y-3
                                "
                            >

                                {/* =============================================
                                    PAYPHONE
                                ============================================= */}

                                <button
                                    type="button"

                                    onClick={
                                        seleccionarPayPhone
                                    }

                                    className={`
                                        flex
                                        w-full
                                        items-center
                                        gap-3
                                        rounded-[18px]
                                        border
                                        p-4
                                        text-left
                                        transition-all

                                        ${metodo ===
                                            "payphone"

                                            ? "border-[#ff6600] bg-[#ff6600]/[0.04] shadow-[0_0_0_3px_rgba(255,102,0,0.08)]"

                                            : "border-slate-200 bg-white hover:border-slate-300"
                                        }
                                    `}
                                >

                                    <span
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

                                    </span>


                                    <span
                                        className="
                                            min-w-0
                                            flex-1
                                        "
                                    >

                                        <span
                                            className="
                                                flex
                                                items-center
                                                justify-between
                                                gap-3
                                            "
                                        >

                                            <span
                                                className="
                                                    text-sm
                                                    font-black
                                                    text-[#171717]
                                                "
                                            >
                                                PayPhone
                                            </span>


                                            {metodo ===
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

                                        </span>


                                        <span
                                            className="
                                                mt-1
                                                block
                                                text-[11px]
                                                text-slate-400
                                            "
                                        >
                                            Débito, crédito o PayPhone App.
                                        </span>

                                    </span>

                                </button>


                                {/* =============================================
                                    WALLET
                                ============================================= */}

                                <button
                                    type="button"

                                    onClick={() => {
                                        void seleccionarWallet();
                                    }}

                                    className={`
                                        flex
                                        w-full
                                        items-center
                                        gap-3
                                        rounded-[18px]
                                        border
                                        p-4
                                        text-left
                                        transition-all

                                        ${metodo ===
                                            "wallet"

                                            ? "border-[#C1317F] bg-[#C1317F]/[0.04] shadow-[0_0_0_3px_rgba(193,49,127,0.08)]"

                                            : "border-slate-200 bg-white hover:border-slate-300"
                                        }
                                    `}
                                >

                                    <span
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

                                    </span>


                                    <span
                                        className="
                                            min-w-0
                                            flex-1
                                        "
                                    >

                                        <span
                                            className="
                                                flex
                                                items-center
                                                justify-between
                                                gap-3
                                            "
                                        >

                                            <span
                                                className="
                                                    text-sm
                                                    font-black
                                                    text-[#171717]
                                                "
                                            >
                                                Saldo Baruk593
                                            </span>


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

                                        </span>


                                        <span
                                            className="
                                                mt-1
                                                block
                                                text-[11px]
                                                text-slate-400
                                            "
                                        >
                                            Usa comisiones, ventas o premios disponibles.
                                        </span>

                                    </span>

                                </button>


                                {/* =============================================
                                    TRANSFERENCIA
                                ============================================= */}

                                <button
                                    type="button"

                                    onClick={() => {
                                        void seleccionarTransferencia();
                                    }}

                                    disabled={
                                        procesando
                                    }

                                    className={`
                                        flex
                                        w-full
                                        items-center
                                        gap-3
                                        rounded-[18px]
                                        border
                                        p-4
                                        text-left
                                        transition-all

                                        disabled:cursor-not-allowed
                                        disabled:opacity-60

                                        ${metodo ===
                                            "transferencia"

                                            ? "border-[#171717] bg-[#171717]/[0.025] shadow-[0_0_0_3px_rgba(23,23,23,0.05)]"

                                            : "border-slate-200 bg-white hover:border-slate-300"
                                        }
                                    `}
                                >

                                    <span
                                        className="
                                            flex
                                            h-10
                                            w-10
                                            shrink-0
                                            items-center
                                            justify-center
                                            rounded-xl
                                            bg-slate-100
                                            text-[#171717]
                                        "
                                    >

                                        <svg
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            className="h-5 w-5"
                                        >

                                            <path
                                                d="M3 9h18M5 9V19M9 9V19M15 9V19M19 9V19M3 19h18M12 4 3 8h18L12 4Z"
                                                stroke="currentColor"
                                                strokeWidth="1.6"
                                                strokeLinejoin="round"
                                            />

                                        </svg>

                                    </span>


                                    <span
                                        className="
                                            min-w-0
                                            flex-1
                                        "
                                    >

                                        <span
                                            className="
                                                text-sm
                                                font-black
                                                text-[#171717]
                                            "
                                        >
                                            Transferencia bancaria
                                        </span>


                                        <span
                                            className="
                                                mt-1
                                                block
                                                text-[11px]
                                                text-slate-400
                                            "
                                        >
                                            {procesando
                                                ? "Preparando transferencia..."
                                                : "Pago manual mediante tu banco."}
                                        </span>

                                    </span>

                                </button>

                            </div>


                            {/* =================================================
                                PAYPHONE
                            ================================================= */}

                            {metodo ===
                                "payphone" && (

                                    <div
                                        className="
                                            mt-6
                                            border-t
                                            border-slate-100
                                            pt-6
                                        "
                                    >

                                        <p
                                            className="
                                                text-[10px]
                                                font-black
                                                uppercase
                                                tracking-[0.15em]
                                                text-[#ff6600]
                                            "
                                        >
                                            Pago seguro con PayPhone
                                        </p>


                                        <p
                                            className="
                                                mt-2
                                                text-xs
                                                leading-5
                                                text-slate-400
                                            "
                                        >
                                            Completa los datos de tu tarjeta o utiliza PayPhone App.
                                        </p>


                                        {pedido
                                            .clientTransactionId ? (

                                            <PayphoneShopBox
                                                amount={
                                                    payphoneAmount
                                                }

                                                refId={
                                                    pedido
                                                        .clientTransactionId
                                                }
                                            />

                                        ) : (

                                            <p
                                                className="
                                                    mt-4
                                                    rounded-xl
                                                    border
                                                    border-red-200
                                                    bg-red-50
                                                    px-4
                                                    py-3
                                                    text-xs
                                                    font-semibold
                                                    text-red-500
                                                "
                                            >
                                                No se pudo preparar PayPhone.
                                            </p>
                                        )}

                                    </div>
                                )}


                            {/* =================================================
                                WALLET
                            ================================================= */}

                            {metodo ===
                                "wallet" && (

                                    <div
                                        className="
                                            mt-5
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
                                                    gap-3
                                                "
                                            >

                                                <div
                                                    className="
                                                        h-5
                                                        w-5
                                                        animate-spin
                                                        rounded-full
                                                        border-2
                                                        border-[#C1317F]/20
                                                        border-t-[#C1317F]
                                                    "
                                                />


                                                <p
                                                    className="
                                                        text-xs
                                                        font-semibold
                                                        text-slate-500
                                                    "
                                                >
                                                    Consultando tu saldo...
                                                </p>

                                            </div>

                                        ) : !walletSessionEmail ? (

                                            <div>

                                                <p
                                                    className="
                                                        text-xs
                                                        font-bold
                                                        text-[#171717]
                                                    "
                                                >
                                                    Inicia sesión para utilizar tu saldo
                                                </p>


                                                <p
                                                    className="
                                                        mt-1
                                                        text-[11px]
                                                        leading-5
                                                        text-slate-500
                                                    "
                                                >
                                                    La Billetera Baruk593 está vinculada a tu cuenta.
                                                </p>


                                                <Link
                                                    href="/mi-cuenta"

                                                    className="
                                                        mt-3
                                                        inline-flex
                                                        min-h-[40px]
                                                        items-center
                                                        justify-center
                                                        rounded-xl
                                                        bg-[#C1317F]
                                                        px-4
                                                        text-xs
                                                        font-black
                                                        text-white
                                                    "
                                                >
                                                    Ir a Mi Cuenta
                                                </Link>

                                            </div>

                                        ) : walletBalance !==
                                            null ? (

                                            <>

                                                <div
                                                    className="
                                                        flex
                                                        items-center
                                                        justify-between
                                                        gap-4
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
                                                            Saldo disponible
                                                        </p>


                                                        <p
                                                            className="
                                                                mt-1
                                                                text-2xl
                                                                font-black
                                                                tracking-[-0.04em]
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
                                                        pedido.total ? (

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


                                                <div
                                                    className="
                                                        mt-4
                                                        flex
                                                        items-center
                                                        justify-between
                                                        border-t
                                                        border-[#C1317F]/10
                                                        pt-4
                                                    "
                                                >

                                                    <span
                                                        className="
                                                            text-xs
                                                            text-slate-500
                                                        "
                                                    >
                                                        Esta compra
                                                    </span>


                                                    <span
                                                        className="
                                                            text-sm
                                                            font-black
                                                            text-[#171717]
                                                        "
                                                    >
                                                        $
                                                        {
                                                            pedido.total
                                                                .toFixed(
                                                                    2
                                                                )
                                                        }
                                                    </span>

                                                </div>


                                                <button
                                                    type="button"

                                                    onClick={() => {
                                                        void pagarConWallet();
                                                    }}

                                                    disabled={
                                                        walletPaying ||
                                                        walletBalance <
                                                        pedido.total
                                                    }

                                                    className="
                                                        mt-4
                                                        min-h-[52px]
                                                        w-full
                                                        rounded-2xl
                                                        bg-[#171717]
                                                        px-5
                                                        text-sm
                                                        font-black
                                                        text-white
                                                        shadow-[0_10px_25px_rgba(0,0,0,0.12)]
                                                        transition
                                                        hover:bg-[#C1317F]
                                                        disabled:cursor-not-allowed
                                                        disabled:opacity-40
                                                    "
                                                >
                                                    {walletPaying
                                                        ? "Procesando pago..."
                                                        : `Pagar $${pedido.total.toFixed(
                                                            2
                                                        )} con saldo`}
                                                </button>

                                            </>

                                        ) : (

                                            <p
                                                className="
                                                    text-xs
                                                    text-slate-500
                                                "
                                            >
                                                No se pudo consultar tu saldo.
                                            </p>
                                        )}

                                    </div>
                                )}


                            {/* =================================================
                                TRANSFERENCIA
                            ================================================= */}

                            {metodo ===
                                "transferencia" && (

                                    <div
                                        className="
                                            mt-6
                                            border-t
                                            border-slate-100
                                            pt-6
                                        "
                                    >

                                        <div
                                            className="
                                                flex
                                                items-center
                                                gap-3
                                            "
                                        >

                                            <div
                                                className="
                                                    flex
                                                    h-10
                                                    w-10
                                                    items-center
                                                    justify-center
                                                    rounded-xl
                                                    bg-emerald-50
                                                    text-sm
                                                    font-black
                                                    text-emerald-600
                                                "
                                            >
                                                ✓
                                            </div>


                                            <div>

                                                <p
                                                    className="
                                                        text-xs
                                                        font-black
                                                        text-emerald-700
                                                    "
                                                >
                                                    Pedido registrado
                                                </p>


                                                <p
                                                    className="
                                                        mt-0.5
                                                        text-[11px]
                                                        text-slate-400
                                                    "
                                                >
                                                    Realiza la transferencia para completar el pago.
                                                </p>

                                            </div>

                                        </div>


                                        {/* DATOS BANCARIOS */}

                                        <div
                                            className="
                                                mt-5
                                                rounded-[18px]
                                                border
                                                border-slate-200
                                                bg-[#fafafa]
                                                p-5
                                            "
                                        >

                                            <p
                                                className="
                                                    text-[10px]
                                                    font-black
                                                    uppercase
                                                    tracking-[0.15em]
                                                    text-[#C1317F]
                                                "
                                            >
                                                Datos bancarios
                                            </p>


                                            <div
                                                className="
                                                    mt-4
                                                    space-y-3
                                                "
                                            >

                                                <div
                                                    className="
                                                        flex
                                                        justify-between
                                                        gap-4
                                                    "
                                                >

                                                    <span
                                                        className="
                                                            text-xs
                                                            text-slate-400
                                                        "
                                                    >
                                                        Banco
                                                    </span>


                                                    <span
                                                        className="
                                                            text-right
                                                            text-xs
                                                            font-black
                                                            text-[#171717]
                                                        "
                                                    >
                                                        {
                                                            banco ||
                                                            "—"
                                                        }
                                                    </span>

                                                </div>


                                                <div
                                                    className="
                                                        flex
                                                        justify-between
                                                        gap-4
                                                    "
                                                >

                                                    <span
                                                        className="
                                                            text-xs
                                                            text-slate-400
                                                        "
                                                    >
                                                        Cuenta
                                                    </span>


                                                    <span
                                                        className="
                                                            text-right
                                                            text-xs
                                                            font-black
                                                            text-[#171717]
                                                        "
                                                    >
                                                        {
                                                            cuenta ||
                                                            "—"
                                                        }
                                                    </span>

                                                </div>


                                                {tipoCuenta && (

                                                    <div
                                                        className="
                                                            flex
                                                            justify-between
                                                            gap-4
                                                        "
                                                    >

                                                        <span
                                                            className="
                                                                text-xs
                                                                text-slate-400
                                                            "
                                                        >
                                                            Tipo
                                                        </span>


                                                        <span
                                                            className="
                                                                text-right
                                                                text-xs
                                                                font-black
                                                                text-[#171717]
                                                            "
                                                        >
                                                            {
                                                                tipoCuenta
                                                            }
                                                        </span>

                                                    </div>
                                                )}


                                                <div
                                                    className="
                                                        h-px
                                                        bg-slate-200
                                                    "
                                                />


                                                <div>

                                                    <span
                                                        className="
                                                            text-xs
                                                            text-slate-400
                                                        "
                                                    >
                                                        Titular
                                                    </span>


                                                    <p
                                                        className="
                                                            mt-1
                                                            text-xs
                                                            font-black
                                                            text-[#171717]
                                                        "
                                                    >
                                                        {
                                                            titular ||
                                                            "—"
                                                        }
                                                    </p>


                                                    {identificacion && (

                                                        <p
                                                            className="
                                                                mt-1
                                                                text-[10px]
                                                                text-slate-400
                                                            "
                                                        >
                                                            C.I./RUC:{" "}
                                                            {
                                                                identificacion
                                                            }
                                                        </p>
                                                    )}

                                                </div>


                                                <div
                                                    className="
                                                        border-t
                                                        border-slate-200
                                                        pt-4
                                                    "
                                                >

                                                    <p
                                                        className="
                                                            text-[9px]
                                                            font-black
                                                            uppercase
                                                            tracking-[0.12em]
                                                            text-slate-400
                                                        "
                                                    >
                                                        Valor a transferir
                                                    </p>


                                                    <p
                                                        className="
                                                            mt-1
                                                            text-2xl
                                                            font-black
                                                            tracking-[-0.04em]
                                                            text-[#171717]
                                                        "
                                                    >
                                                        $
                                                        {
                                                            pedido.total
                                                                .toFixed(
                                                                    2
                                                                )
                                                        }
                                                    </p>

                                                </div>

                                            </div>

                                        </div>


                                        {/* WHATSAPP */}

                                        {whatsapp && (

                                            <a
                                                href={
                                                    `https://wa.me/${String(
                                                        whatsapp
                                                    )
                                                        .replace(
                                                            /\D/g,
                                                            ""
                                                        )
                                                        .replace(
                                                            /^0/,
                                                            "593"
                                                        )}`
                                                }

                                                target="_blank"

                                                rel="noreferrer"

                                                className="
                                                    mt-4
                                                    flex
                                                    min-h-[50px]
                                                    w-full
                                                    items-center
                                                    justify-center
                                                    rounded-2xl
                                                    bg-emerald-500
                                                    px-5
                                                    text-sm
                                                    font-black
                                                    text-white
                                                    transition
                                                    hover:bg-emerald-600
                                                "
                                            >
                                                Enviar comprobante por WhatsApp
                                            </a>
                                        )}


                                        <Link
                                            href="/tienda"

                                            className="
                                                mt-2
                                                flex
                                                min-h-[46px]
                                                w-full
                                                items-center
                                                justify-center
                                                rounded-xl
                                                text-xs
                                                font-bold
                                                text-slate-400
                                                transition
                                                hover:bg-slate-50
                                                hover:text-[#171717]
                                            "
                                        >
                                            Finalizar
                                        </Link>

                                    </div>
                                )}

                        </div>

                    </section>


                    {/* =================================================
                        RESUMEN
                    ================================================= */}

                    <aside>

                        <div
                            className="
                                sticky
                                top-[120px]
                                overflow-hidden
                                rounded-[24px]
                                border
                                border-slate-200
                                bg-white
                                shadow-[0_12px_40px_rgba(0,0,0,0.05)]
                            "
                        >

                            <div
                                className="
                                    bg-[#171717]
                                    px-5
                                    py-4
                                "
                            >

                                <p
                                    className="
                                        text-[9px]
                                        font-black
                                        uppercase
                                        tracking-[0.16em]
                                        text-[#C1317F]
                                    "
                                >
                                    Baruk Shop
                                </p>


                                <h2
                                    className="
                                        mt-1
                                        text-lg
                                        font-black
                                        text-white
                                    "
                                >
                                    Resumen del pedido
                                </h2>

                            </div>


                            <div
                                className="
                                    p-5
                                "
                            >

                                <div
                                    className="
                                        space-y-4
                                    "
                                >

                                    {items.map(
                                        (
                                            item
                                        ) => (

                                            <div
                                                key={
                                                    item.id
                                                }

                                                className="
                                                    flex
                                                    justify-between
                                                    gap-4
                                                "
                                            >

                                                <div
                                                    className="
                                                        min-w-0
                                                    "
                                                >

                                                    <p
                                                        className="
                                                            text-xs
                                                            font-bold
                                                            leading-5
                                                            text-[#171717]
                                                        "
                                                    >
                                                        {
                                                            item.nombre
                                                        }
                                                    </p>


                                                    <p
                                                        className="
                                                            mt-0.5
                                                            text-[10px]
                                                            text-slate-400
                                                        "
                                                    >
                                                        Cantidad:{" "}
                                                        {
                                                            item.cantidad
                                                        }
                                                    </p>

                                                </div>


                                                <span
                                                    className="
                                                        shrink-0
                                                        text-xs
                                                        font-black
                                                        text-[#171717]
                                                    "
                                                >
                                                    $
                                                    {
                                                        item.total
                                                            .toFixed(
                                                                2
                                                            )
                                                    }
                                                </span>

                                            </div>
                                        )
                                    )}

                                </div>


                                <div
                                    className="
                                        mt-5
                                        border-t
                                        border-slate-100
                                        pt-5
                                    "
                                >

                                    <div
                                        className="
                                            flex
                                            justify-between
                                            text-xs
                                        "
                                    >

                                        <span
                                            className="
                                                text-slate-400
                                            "
                                        >
                                            Subtotal
                                        </span>


                                        <span
                                            className="
                                                font-bold
                                                text-[#171717]
                                            "
                                        >
                                            $
                                            {
                                                pedido.subtotal
                                                    .toFixed(
                                                        2
                                                    )
                                            }
                                        </span>

                                    </div>


                                    {pedido.descuento >
                                        0 && (

                                            <div
                                                className="
                                                mt-3
                                                flex
                                                justify-between
                                                text-xs
                                            "
                                            >

                                                <span
                                                    className="
                                                    text-slate-400
                                                "
                                                >
                                                    Descuento
                                                </span>


                                                <span
                                                    className="
                                                    font-bold
                                                    text-emerald-600
                                                "
                                                >
                                                    -$
                                                    {
                                                        pedido.descuento
                                                            .toFixed(
                                                                2
                                                            )
                                                    }
                                                </span>

                                            </div>
                                        )}


                                    <div
                                        className="
                                            mt-3
                                            flex
                                            justify-between
                                            text-xs
                                        "
                                    >

                                        <span
                                            className="
                                                text-slate-400
                                            "
                                        >
                                            Envío
                                        </span>


                                        <span
                                            className="
                                                font-bold
                                                text-[#171717]
                                            "
                                        >
                                            {pedido.costoEnvio >
                                                0
                                                ? `$${pedido.costoEnvio.toFixed(
                                                    2
                                                )}`
                                                : "Por coordinar"}
                                        </span>

                                    </div>


                                    <div
                                        className="
                                            mt-5
                                            border-t
                                            border-slate-100
                                            pt-5
                                        "
                                    >

                                        <div
                                            className="
                                                flex
                                                items-end
                                                justify-between
                                                gap-4
                                            "
                                        >

                                            <span
                                                className="
                                                    text-sm
                                                    font-black
                                                    text-[#171717]
                                                "
                                            >
                                                Total
                                            </span>


                                            <span
                                                className="
                                                    text-3xl
                                                    font-black
                                                    tracking-[-0.05em]
                                                    text-[#ff6600]
                                                "
                                            >
                                                $
                                                {
                                                    pedido.total
                                                        .toFixed(
                                                            2
                                                        )
                                                }
                                            </span>

                                        </div>

                                    </div>

                                </div>


                                <div
                                    className="
                                        mt-5
                                        flex
                                        items-start
                                        gap-2
                                        rounded-xl
                                        bg-[#fafafa]
                                        px-3
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
                                        Tu compra se procesa de forma segura dentro de Baruk593.
                                    </p>

                                </div>

                            </div>

                        </div>

                    </aside>

                </div>

            </div>

        </main>
    );
}