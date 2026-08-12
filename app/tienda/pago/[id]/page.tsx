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

type MetodoPago =
    | "payphone"
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
    sku: string | null;

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
    } = useBarukCart();

    const carritoVaciado =
        useRef(false);

    const idParam =
        params.id;

    const orderId =
        Array.isArray(idParam)
            ? idParam[0]
            : String(
                idParam ?? ""
            );

    const status =
        searchParams.get(
            "status"
        );

    const [
        pedido,
        setPedido,
    ] =
        useState<Pedido | null>(
            null
        );

    const [
        items,
        setItems,
    ] =
        useState<ItemPedido[]>(
            []
        );

    const [
        metodo,
        setMetodo,
    ] =
        useState<MetodoPago>(
            null
        );

    const [
        loading,
        setLoading,
    ] =
        useState(true);

    const [
        procesando,
        setProcesando,
    ] =
        useState(false);

    const [
        error,
        setError,
    ] =
        useState<string | null>(
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

    useEffect(() => {
        if (!orderId) {
            return;
        }

        async function cargarPedido() {
            try {
                setLoading(true);
                setError(null);

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

                if (
                    json.pedido
                        ?.metodoPago ===
                    "transferencia"
                ) {
                    setMetodo(
                        "transferencia"
                    );
                }

            } catch (err) {
                setError(
                    err instanceof Error
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

    }, [
        orderId,
    ]);

    /* ========================================================
       PAGO CONFIRMADO
    ======================================================== */

    useEffect(() => {
        const pagado =
            pedido?.estadoPago ===
            "pagado" ||
            status ===
            "pagado";

        if (
            pagado &&
            !carritoVaciado.current
        ) {
            carritoVaciado.current =
                true;

            vaciarCarrito();
        }

    }, [
        pedido?.estadoPago,
        status,
        vaciarCarrito,
    ]);

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
                (actual) =>
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
             * Para el comprador,
             * la compra ya quedó
             * registrada.
             */
            if (
                !carritoVaciado.current
            ) {
                carritoVaciado.current =
                    true;

                vaciarCarrito();
            }

        } catch (err) {
            setError(
                err instanceof Error
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

    if (loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <p className="text-sm font-semibold text-slate-400">
                    Cargando pedido...
                </p>
            </div>
        );
    }

    if (
        error &&
        !pedido
    ) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center px-4 text-center">

                <div>
                    <h1 className="text-2xl font-black text-[#171717]">
                        Pedido no disponible
                    </h1>

                    <p className="mt-3 text-sm text-slate-500">
                        {error}
                    </p>

                    <Link
                        href="/tienda"
                        className="mt-6 inline-flex rounded-xl bg-[#ff6600] px-6 py-3 text-sm font-black text-white"
                    >
                        Volver a Baruk Shop
                    </Link>
                </div>

            </div>
        );
    }

    if (!pedido) {
        return null;
    }

    const pagado =
        pedido.estadoPago ===
        "pagado" ||
        status ===
        "pagado";

    const payphoneAmount =
        Math.round(
            pedido.total *
            100
        );

    /* ========================================================
       PAGO PAYPHONE COMPLETADO
    ======================================================== */

    if (pagado) {
        return (
            <div className="flex min-h-[65vh] items-center justify-center px-4 text-center">

                <div className="max-w-lg">

                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-2xl font-black text-emerald-600">
                        ✓
                    </div>

                    <p className="mt-6 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">
                        Pago confirmado
                    </p>

                    <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-[#171717]">
                        ¡Gracias por tu compra!
                    </h1>

                    <p className="mt-3 text-sm leading-6 text-slate-500">
                        Tu pedido{" "}
                        <strong>
                            {
                                pedido.numero
                            }
                        </strong>{" "}
                        fue pagado correctamente.
                    </p>

                    <Link
                        href="/tienda"
                        className="mt-7 inline-flex rounded-xl bg-[#ff6600] px-6 py-3 text-sm font-black text-white"
                    >
                        Volver a Baruk Shop
                    </Link>

                </div>

            </div>
        );
    }

    /* ========================================================
       PÁGINA
    ======================================================== */

    return (
        <div className="w-full pb-16">

            {/* HEADER */}

            <div className="py-6">

                <Link
                    href="/tienda/carrito"
                    className="text-xs font-semibold text-slate-400 transition hover:text-[#ff6600]"
                >
                    ← Volver
                </Link>

                <p className="mt-6 text-[10px] font-black uppercase tracking-[0.2em] text-[#ff6600]">
                    Baruk Shop
                </p>

                <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-[#171717] md:text-4xl">
                    Elige cómo pagar
                </h1>

                <p className="mt-3 text-sm text-slate-500">
                    Pedido{" "}
                    <strong>
                        {
                            pedido.numero
                        }
                    </strong>
                </p>

            </div>

            {error && (
                <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                    {error}
                </div>
            )}

            <div className="grid gap-8 lg:grid-cols-[1fr_360px]">

                {/* =================================================
                    MÉTODOS
                ================================================= */}

                <div>

                    {/* =================================================
                        SIN MÉTODO SELECCIONADO
                    ================================================= */}

                    {!metodo && (
                        <div className="grid gap-4 md:grid-cols-2">

                            {/* PAYPHONE */}

                            <button
                                type="button"
                                onClick={() =>
                                    setMetodo(
                                        "payphone"
                                    )
                                }
                                className="
                                    rounded-[24px]
                                    border
                                    border-slate-200
                                    bg-white
                                    p-6
                                    text-left
                                    transition
                                    hover:border-[#ff6600]
                                    hover:shadow-sm
                                "
                            >
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#ff6600]">
                                    Pago en línea
                                </p>

                                <h2 className="mt-3 text-2xl font-black text-[#171717]">
                                    PayPhone
                                </h2>

                                <p className="mt-3 text-sm leading-6 text-slate-500">
                                    Pago inmediato y confirmación automática.
                                </p>

                                <span className="mt-6 inline-flex text-sm font-black text-[#ff6600]">
                                    Elegir PayPhone →
                                </span>
                            </button>

                            {/* TRANSFERENCIA */}

                            <button
                                type="button"
                                onClick={
                                    seleccionarTransferencia
                                }
                                disabled={
                                    procesando
                                }
                                className="
                                    rounded-[24px]
                                    border
                                    border-slate-200
                                    bg-white
                                    p-6
                                    text-left
                                    transition
                                    hover:border-[#ff6600]
                                    hover:shadow-sm
                                    disabled:cursor-not-allowed
                                    disabled:opacity-60
                                "
                            >
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#ff6600]">
                                    Pago manual
                                </p>

                                <h2 className="mt-3 text-2xl font-black text-[#171717]">
                                    Transferencia
                                </h2>

                                <p className="mt-3 text-sm leading-6 text-slate-500">
                                    Realiza la transferencia desde tu aplicación bancaria.
                                </p>

                                <span className="mt-6 inline-flex text-sm font-black text-[#ff6600]">
                                    {procesando
                                        ? "Preparando..."
                                        : "Elegir transferencia →"}
                                </span>
                            </button>

                        </div>
                    )}

                    {/* =================================================
                        PAYPHONE
                    ================================================= */}

                    {metodo ===
                        "payphone" && (
                            <section className="rounded-[24px] border border-slate-200 bg-white p-6">

                                <button
                                    type="button"
                                    onClick={() =>
                                        setMetodo(
                                            null
                                        )
                                    }
                                    className="text-xs font-bold text-slate-400 hover:text-[#ff6600]"
                                >
                                    ← Cambiar método
                                </button>

                                <p className="mt-6 text-[10px] font-black uppercase tracking-[0.18em] text-[#ff6600]">
                                    Pago en línea
                                </p>

                                <h2 className="mt-2 text-2xl font-black text-[#171717]">
                                    PayPhone
                                </h2>

                                <p className="mt-2 text-sm leading-6 text-slate-500">
                                    Completa el pago mediante PayPhone.
                                </p>

                                {pedido.clientTransactionId ? (
                                    <div className="mt-7">

                                        <PayphoneShopBox
                                            amount={payphoneAmount}
                                            refId={pedido.clientTransactionId}
                                        />

                                    </div>
                                ) : (
                                    <p className="mt-5 text-sm font-semibold text-red-500">
                                        No se pudo preparar PayPhone.
                                    </p>
                                )}

                            </section>
                        )}

                    {/* =================================================
                        TRANSFERENCIA
                    ================================================= */}

                    {metodo ===
                        "transferencia" && (
                            <section className="rounded-[24px] border border-slate-200 bg-white p-6">

                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-600">
                                    Pedido registrado
                                </p>

                                <h2 className="mt-2 text-2xl font-black text-[#171717]">
                                    Realiza tu transferencia
                                </h2>

                                <p className="mt-3 text-sm leading-6 text-slate-500">
                                    Tu pedido ya quedó registrado. Realiza la transferencia desde tu aplicación bancaria.
                                </p>

                                <div className="mt-6 rounded-2xl bg-[#fafafa] p-5">

                                    <div className="space-y-5">

                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                                                Banco
                                            </p>

                                            <p className="mt-1 font-black text-[#171717]">
                                                {
                                                    banco
                                                }
                                            </p>
                                        </div>

                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                                                Cuenta
                                            </p>

                                            <p className="mt-1 font-black text-[#171717]">
                                                {
                                                    cuenta
                                                }
                                            </p>

                                            {tipoCuenta && (
                                                <p className="mt-1 text-xs text-slate-500">
                                                    {
                                                        tipoCuenta
                                                    }
                                                </p>
                                            )}
                                        </div>

                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                                                Titular
                                            </p>

                                            <p className="mt-1 font-black text-[#171717]">
                                                {
                                                    titular
                                                }
                                            </p>

                                            {identificacion && (
                                                <p className="mt-1 text-xs text-slate-500">
                                                    C.I./RUC:{" "}
                                                    {
                                                        identificacion
                                                    }
                                                </p>
                                            )}
                                        </div>

                                        <div className="border-t border-slate-200 pt-5">

                                            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                                                Valor a transferir
                                            </p>

                                            <p className="mt-1 text-3xl font-black tracking-[-0.04em] text-[#171717]">
                                                $
                                                {pedido.total.toFixed(
                                                    2
                                                )}
                                            </p>

                                        </div>

                                    </div>

                                </div>

                                <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-5">

                                    <p className="font-black text-emerald-700">
                                        Comparte tu comprobante
                                    </p>

                                    <p className="mt-2 text-sm leading-6 text-emerald-700/80">
                                        Después de realizar la transferencia, utiliza la opción de compartir comprobante de tu aplicación bancaria y envíalo al WhatsApp de Baruk593.
                                    </p>

                                    {whatsapp && (
                                        <p className="mt-3 font-black text-emerald-800">
                                            WhatsApp:{" "}
                                            {
                                                whatsapp
                                            }
                                        </p>
                                    )}

                                </div>

                                <Link
                                    href="/tienda"
                                    className="mt-6 flex min-h-[52px] w-full items-center justify-center rounded-xl bg-[#171717] px-5 text-sm font-black text-white"
                                >
                                    Finalizar compra
                                </Link>

                            </section>
                        )}

                </div>

                {/* =================================================
                    RESUMEN
                ================================================= */}

                <aside>

                    <div className="sticky top-[140px] rounded-[24px] border border-slate-200 bg-[#fafafa] p-6">

                        <h2 className="text-lg font-black text-[#171717]">
                            Resumen del pedido
                        </h2>

                        <div className="mt-5 space-y-3">

                            {items.map(
                                (item) => (
                                    <div
                                        key={
                                            item.id
                                        }
                                        className="flex justify-between gap-4 text-xs"
                                    >
                                        <span className="text-slate-500">
                                            {item.cantidad} ×{" "}
                                            {
                                                item.nombre
                                            }
                                        </span>

                                        <span className="shrink-0 font-black text-[#171717]">
                                            $
                                            {item.total.toFixed(
                                                2
                                            )}
                                        </span>
                                    </div>
                                )
                            )}

                        </div>

                        <div className="mt-5 border-t border-slate-200 pt-5">

                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">
                                    Subtotal
                                </span>

                                <span>
                                    $
                                    {pedido.subtotal.toFixed(
                                        2
                                    )}
                                </span>
                            </div>

                            <div className="mt-3 flex justify-between text-sm">

                                <span className="text-slate-500">
                                    Envío
                                </span>

                                <span className="font-semibold">
                                    Por coordinar
                                </span>

                            </div>

                            <div className="mt-5 border-t border-slate-200 pt-5">

                                <div className="flex items-end justify-between">

                                    <span className="font-black text-[#171717]">
                                        Total
                                    </span>

                                    <span className="text-2xl font-black tracking-[-0.04em] text-[#171717]">
                                        $
                                        {pedido.total.toFixed(
                                            2
                                        )}
                                    </span>

                                </div>

                            </div>

                        </div>

                    </div>

                </aside>

            </div>

        </div>
    );
}