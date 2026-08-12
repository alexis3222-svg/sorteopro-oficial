"use client";

import {
    FormEvent,
    useState,
} from "react";

import Link from "next/link";
import {
    useRouter,
} from "next/navigation";

import {
    useBarukCart,
} from "@/components/baruk/shop/BarukCartProvider";

export default function CheckoutPage() {
    const router =
        useRouter();

    const {
        items,
        totalItems,
        subtotal,
    } = useBarukCart();

    const [
        nombre,
        setNombre,
    ] = useState("");

    const [
        email,
        setEmail,
    ] = useState("");

    const [
        telefono,
        setTelefono,
    ] = useState("");

    const [
        identificacion,
        setIdentificacion,
    ] = useState("");

    const [
        provincia,
        setProvincia,
    ] = useState("");

    const [
        ciudad,
        setCiudad,
    ] = useState("");

    const [
        direccion,
        setDireccion,
    ] = useState("");

    const [
        referencia,
        setReferencia,
    ] = useState("");

    const [
        notas,
        setNotas,
    ] = useState("");

    const [
        loading,
        setLoading,
    ] = useState(false);

    const [
        error,
        setError,
    ] =
        useState<string | null>(
            null
        );

    const onSubmit =
        async (
            event:
                FormEvent<HTMLFormElement>
        ) => {
            event.preventDefault();

            if (
                loading ||
                items.length === 0
            ) {
                return;
            }

            setError(null);
            setLoading(true);

            try {
                const response =
                    await fetch(
                        "/api/shop/orders",
                        {
                            method:
                                "POST",

                            headers: {
                                "Content-Type":
                                    "application/json",
                            },

                            body:
                                JSON.stringify({
                                    clienteNombre:
                                        nombre,

                                    clienteEmail:
                                        email,

                                    clienteTelefono:
                                        telefono,

                                    identificacion,

                                    provincia,

                                    ciudad,

                                    direccion,

                                    referencia,

                                    notasCliente:
                                        notas,

                                    /*
                                     * Solo enviamos
                                     * ID + cantidad.
                                     *
                                     * NO enviamos precios.
                                     */
                                    items:
                                        items.map(
                                            (
                                                item
                                            ) => ({
                                                productId:
                                                    item.id,

                                                cantidad:
                                                    item.cantidad,
                                            })
                                        ),
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
                        "No se pudo crear el pedido."
                    );
                }

                /*
                 * Todavía no vaciamos
                 * el carrito.
                 *
                 * Lo haremos cuando
                 * el pago quede confirmado.
                 */

                router.push(
                    `/tienda/pago/${json.pedido.id}`
                );

            } catch (err) {
                console.error(
                    err
                );

                setError(
                    err instanceof Error
                        ? err.message
                        : "No se pudo crear el pedido."
                );

            } finally {
                setLoading(
                    false
                );
            }
        };

    if (
        items.length === 0
    ) {
        return (
            <div
                className="
                    flex
                    min-h-[55vh]
                    items-center
                    justify-center
                    text-center
                "
            >
                <div>

                    <h1
                        className="
                            text-2xl
                            font-black
                            text-[#171717]
                        "
                    >
                        Tu carrito está vacío
                    </h1>

                    <p
                        className="
                            mt-2
                            text-sm
                            text-slate-500
                        "
                    >
                        Agrega productos antes
                        de continuar.
                    </p>

                    <Link
                        href="/tienda"
                        className="
                            mt-6
                            inline-flex
                            rounded-xl
                            bg-[#ff6600]
                            px-5
                            py-3
                            text-sm
                            font-black
                            text-white
                        "
                    >
                        Volver a Baruk Shop
                    </Link>

                </div>
            </div>
        );
    }

    return (
        <div className="w-full">

            <div className="py-6">

                <Link
                    href="/tienda/carrito"
                    className="
                        text-xs
                        font-semibold
                        text-slate-400
                        hover:text-[#ff6600]
                    "
                >
                    ← Volver al carrito
                </Link>

                <p
                    className="
                        mt-6
                        text-[10px]
                        font-black
                        uppercase
                        tracking-[0.2em]
                        text-[#ff6600]
                    "
                >
                    Baruk Shop
                </p>

                <h1
                    className="
                        mt-2
                        text-3xl
                        font-black
                        tracking-[-0.04em]
                        text-[#171717]

                        md:text-4xl
                    "
                >
                    Finalizar compra
                </h1>

                <p
                    className="
                        mt-3
                        max-w-xl
                        text-sm
                        leading-6
                        text-slate-500
                    "
                >
                    Completa tus datos para
                    preparar tu pedido.
                </p>

            </div>

            {error && (
                <div
                    className="
                        mb-6
                        rounded-xl
                        border
                        border-red-200
                        bg-red-50
                        px-4
                        py-3
                        text-sm
                        font-semibold
                        text-red-600
                    "
                >
                    {error}
                </div>
            )}

            <form
                onSubmit={onSubmit}
                className="
                    grid
                    gap-8
                    pb-16

                    lg:grid-cols-[1fr_360px]
                "
            >

                {/* DATOS */}

                <div className="space-y-6">

                    <section
                        className="
                            rounded-[24px]
                            border
                            border-slate-200
                            bg-white
                            p-5

                            md:p-6
                        "
                    >
                        <h2
                            className="
                                text-lg
                                font-black
                                text-[#171717]
                            "
                        >
                            Tus datos
                        </h2>

                        <div
                            className="
                                mt-5
                                grid
                                gap-4

                                sm:grid-cols-2
                            "
                        >

                            <div className="sm:col-span-2">
                                <label className="text-xs font-bold text-slate-600">
                                    Nombre completo *
                                </label>

                                <input
                                    value={nombre}
                                    onChange={(e) =>
                                        setNombre(
                                            e.target.value
                                        )
                                    }
                                    required
                                    className="mt-2 min-h-[48px] w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-[#ff6600]"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-600">
                                    Correo *
                                </label>

                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) =>
                                        setEmail(
                                            e.target.value
                                        )
                                    }
                                    required
                                    className="mt-2 min-h-[48px] w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-[#ff6600]"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-600">
                                    Teléfono *
                                </label>

                                <input
                                    type="tel"
                                    value={telefono}
                                    onChange={(e) =>
                                        setTelefono(
                                            e.target.value
                                        )
                                    }
                                    required
                                    className="mt-2 min-h-[48px] w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-[#ff6600]"
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <label className="text-xs font-bold text-slate-600">
                                    Cédula / RUC
                                </label>

                                <input
                                    value={
                                        identificacion
                                    }
                                    onChange={(e) =>
                                        setIdentificacion(
                                            e.target.value
                                        )
                                    }
                                    className="mt-2 min-h-[48px] w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-[#ff6600]"
                                />
                            </div>

                        </div>
                    </section>

                    {/* ENTREGA */}

                    <section
                        className="
                            rounded-[24px]
                            border
                            border-slate-200
                            bg-white
                            p-5

                            md:p-6
                        "
                    >
                        <h2 className="text-lg font-black text-[#171717]">
                            Dirección de entrega
                        </h2>

                        <div
                            className="
                                mt-5
                                grid
                                gap-4

                                sm:grid-cols-2
                            "
                        >

                            <div>
                                <label className="text-xs font-bold text-slate-600">
                                    Provincia *
                                </label>

                                <input
                                    value={provincia}
                                    onChange={(e) =>
                                        setProvincia(
                                            e.target.value
                                        )
                                    }
                                    required
                                    className="mt-2 min-h-[48px] w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-[#ff6600]"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-600">
                                    Ciudad *
                                </label>

                                <input
                                    value={ciudad}
                                    onChange={(e) =>
                                        setCiudad(
                                            e.target.value
                                        )
                                    }
                                    required
                                    className="mt-2 min-h-[48px] w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-[#ff6600]"
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <label className="text-xs font-bold text-slate-600">
                                    Dirección *
                                </label>

                                <input
                                    value={direccion}
                                    onChange={(e) =>
                                        setDireccion(
                                            e.target.value
                                        )
                                    }
                                    required
                                    placeholder="Calle, sector, número, etc."
                                    className="mt-2 min-h-[48px] w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-[#ff6600]"
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <label className="text-xs font-bold text-slate-600">
                                    Referencia
                                </label>

                                <input
                                    value={referencia}
                                    onChange={(e) =>
                                        setReferencia(
                                            e.target.value
                                        )
                                    }
                                    className="mt-2 min-h-[48px] w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-[#ff6600]"
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <label className="text-xs font-bold text-slate-600">
                                    Nota para el pedido
                                </label>

                                <textarea
                                    value={notas}
                                    onChange={(e) =>
                                        setNotas(
                                            e.target.value
                                        )
                                    }
                                    rows={3}
                                    className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#ff6600]"
                                />
                            </div>

                        </div>
                    </section>

                </div>

                {/* RESUMEN */}

                <aside>
                    <div
                        className="
                            sticky
                            top-[140px]
                            rounded-[24px]
                            border
                            border-slate-200
                            bg-[#fafafa]
                            p-5

                            md:p-6
                        "
                    >
                        <h2 className="text-lg font-black text-[#171717]">
                            Tu pedido
                        </h2>

                        <div className="mt-5 space-y-3">

                            {items.map(
                                (item) => (
                                    <div
                                        key={
                                            item.id
                                        }
                                        className="
                                            flex
                                            justify-between
                                            gap-4
                                            text-xs
                                        "
                                    >
                                        <span className="text-slate-500">
                                            {item.cantidad} ×{" "}
                                            {item.nombre}
                                        </span>

                                        <span className="shrink-0 font-bold text-[#171717]">
                                            $
                                            {(
                                                item.precio *
                                                item.cantidad
                                            ).toFixed(
                                                2
                                            )}
                                        </span>
                                    </div>
                                )
                            )}

                        </div>

                        <div
                            className="
                                mt-5
                                border-t
                                border-slate-200
                                pt-5
                            "
                        >
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">
                                    Productos
                                </span>

                                <span className="font-bold">
                                    {totalItems}
                                </span>
                            </div>

                            <div className="mt-3 flex items-end justify-between">
                                <span className="font-black text-[#171717]">
                                    Subtotal
                                </span>

                                <span
                                    className="
                                        text-2xl
                                        font-black
                                        tracking-[-0.04em]
                                        text-[#171717]
                                    "
                                >
                                    $
                                    {subtotal.toFixed(
                                        2
                                    )}
                                </span>
                            </div>

                            <p
                                className="
                                    mt-2
                                    text-right
                                    text-[9px]
                                    text-slate-400
                                "
                            >
                                El servidor verificará
                                nuevamente precio y stock.
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`
                                mt-6
                                min-h-[52px]
                                w-full
                                rounded-xl
                                px-5
                                text-sm
                                font-black
                                text-white
                                transition

                                ${loading
                                    ? "cursor-not-allowed bg-slate-400"
                                    : "bg-[#ff6600] hover:bg-[#e85d00]"
                                }
                            `}
                        >
                            {loading
                                ? "Validando pedido..."
                                : "Continuar al pago"}
                        </button>

                    </div>
                </aside>

            </form>

        </div>
    );
}