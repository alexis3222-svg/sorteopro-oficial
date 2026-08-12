"use client";

import Link from "next/link";

import {
    useBarukCart,
} from "@/components/baruk/shop/BarukCartProvider";

import {
    getBarukShopImageUrl,
} from "@/lib/barukShopImage";

export default function CarritoPage() {
    const {
        items,
        totalItems,
        subtotal,
        actualizarCantidad,
        eliminarProducto,
        vaciarCarrito,
    } = useBarukCart();

    return (
        <div className="w-full">

            {/* HEADER */}

            <div className="py-6">

                <Link
                    href="/tienda"
                    className="
                        text-xs
                        font-semibold
                        text-slate-400
                        transition
                        hover:text-[#ff6600]
                    "
                >
                    ← Continuar comprando
                </Link>

                <div
                    className="
                        mt-6
                        flex
                        flex-col
                        gap-3
                        sm:flex-row
                        sm:items-end
                        sm:justify-between
                    "
                >
                    <div>

                        <p
                            className="
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
                            Tu carrito
                        </h1>

                        <p className="mt-2 text-sm text-slate-500">
                            {totalItems}{" "}
                            {totalItems === 1
                                ? "producto"
                                : "productos"}
                        </p>

                    </div>

                    {items.length > 0 && (
                        <button
                            type="button"
                            onClick={vaciarCarrito}
                            className="
                                text-xs
                                font-bold
                                text-slate-400
                                transition
                                hover:text-red-500
                            "
                        >
                            Vaciar carrito
                        </button>
                    )}

                </div>

            </div>

            {/* VACÍO */}

            {items.length === 0 ? (
                <section
                    className="
                        flex
                        min-h-[420px]
                        items-center
                        justify-center
                        rounded-[28px]
                        border
                        border-slate-200
                        bg-[#fafafa]
                        px-6
                        text-center
                    "
                >
                    <div>

                        <div
                            className="
                                mx-auto
                                flex
                                h-16
                                w-16
                                items-center
                                justify-center
                                rounded-full
                                bg-white
                                text-2xl
                                shadow-sm
                            "
                        >
                            🛍️
                        </div>

                        <h2
                            className="
                                mt-5
                                text-xl
                                font-black
                                text-[#171717]
                            "
                        >
                            Tu carrito está vacío
                        </h2>

                        <p
                            className="
                                mx-auto
                                mt-2
                                max-w-sm
                                text-sm
                                leading-6
                                text-slate-500
                            "
                        >
                            Explora Baruk Shop y agrega los
                            productos que quieras comprar.
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
                                transition
                                hover:bg-[#e85d00]
                            "
                        >
                            Explorar Baruk Shop
                        </Link>

                    </div>
                </section>
            ) : (
                <div
                    className="
                        grid
                        gap-8
                        pb-16
                        lg:grid-cols-[1fr_360px]
                    "
                >

                    {/* PRODUCTOS */}

                    <section className="space-y-4">

                        {items.map((item) => {
                            const imageUrl =
                                getBarukShopImageUrl(
                                    item.imagen
                                );

                            return (
                                <article
                                    key={item.id}
                                    className="
                                        flex
                                        gap-4
                                        rounded-[22px]
                                        border
                                        border-slate-200
                                        bg-white
                                        p-4
                                    "
                                >

                                    {/* FOTO */}

                                    <Link
                                        href={`/tienda/${item.slug}`}
                                        className="
                                            flex
                                            h-24
                                            w-24
                                            shrink-0
                                            items-center
                                            justify-center
                                            overflow-hidden
                                            rounded-2xl
                                            bg-[#f7f7f7]
                                        "
                                    >
                                        {imageUrl ? (
                                            <img
                                                src={imageUrl}
                                                alt={item.nombre}
                                                className="
                                                    h-full
                                                    w-full
                                                    object-contain
                                                    p-2
                                                "
                                            />
                                        ) : (
                                            <span className="text-xs text-slate-300">
                                                Baruk
                                            </span>
                                        )}
                                    </Link>

                                    {/* INFO */}

                                    <div
                                        className="
                                            flex
                                            min-w-0
                                            flex-1
                                            flex-col
                                            justify-between
                                        "
                                    >

                                        <div>

                                            <Link
                                                href={`/tienda/${item.slug}`}
                                                className="
                                                    line-clamp-2
                                                    text-sm
                                                    font-black
                                                    text-[#171717]
                                                    transition
                                                    hover:text-[#ff6600]
                                                "
                                            >
                                                {item.nombre}
                                            </Link>

                                            {item.sku && (
                                                <p
                                                    className="
                                                        mt-1
                                                        text-[9px]
                                                        font-semibold
                                                        text-slate-400
                                                    "
                                                >
                                                    SKU: {item.sku}
                                                </p>
                                            )}

                                            <p
                                                className="
                                                    mt-2
                                                    text-base
                                                    font-black
                                                    text-[#171717]
                                                "
                                            >
                                                ${item.precio.toFixed(2)}
                                            </p>

                                        </div>

                                        <div
                                            className="
                                                mt-4
                                                flex
                                                flex-wrap
                                                items-center
                                                justify-between
                                                gap-3
                                            "
                                        >

                                            {/* CANTIDAD */}

                                            <div
                                                className="
                                                    flex
                                                    items-center
                                                    overflow-hidden
                                                    rounded-lg
                                                    border
                                                    border-slate-200
                                                "
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        actualizarCantidad(
                                                            item.id,
                                                            item.cantidad - 1
                                                        )
                                                    }
                                                    className="
                                                        flex
                                                        h-8
                                                        w-8
                                                        items-center
                                                        justify-center
                                                        font-bold
                                                        hover:bg-slate-50
                                                    "
                                                >
                                                    −
                                                </button>

                                                <span
                                                    className="
                                                        flex
                                                        h-8
                                                        min-w-[38px]
                                                        items-center
                                                        justify-center
                                                        border-x
                                                        border-slate-200
                                                        text-xs
                                                        font-black
                                                    "
                                                >
                                                    {item.cantidad}
                                                </span>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        actualizarCantidad(
                                                            item.id,
                                                            item.cantidad + 1
                                                        )
                                                    }
                                                    disabled={
                                                        item.cantidad >=
                                                        item.stock
                                                    }
                                                    className="
                                                        flex
                                                        h-8
                                                        w-8
                                                        items-center
                                                        justify-center
                                                        font-bold
                                                        hover:bg-slate-50
                                                        disabled:text-slate-300
                                                    "
                                                >
                                                    +
                                                </button>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    eliminarProducto(
                                                        item.id
                                                    )
                                                }
                                                className="
                                                    text-[10px]
                                                    font-bold
                                                    text-slate-400
                                                    transition
                                                    hover:text-red-500
                                                "
                                            >
                                                Eliminar
                                            </button>

                                        </div>

                                    </div>

                                </article>
                            );
                        })}

                    </section>

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
                            <h2
                                className="
                                    text-lg
                                    font-black
                                    text-[#171717]
                                "
                            >
                                Resumen
                            </h2>

                            <div
                                className="
                                    mt-6
                                    space-y-3
                                    text-sm
                                "
                            >
                                <div
                                    className="
                                        flex
                                        justify-between
                                        text-slate-500
                                    "
                                >
                                    <span>
                                        Productos
                                    </span>

                                    <span>
                                        {totalItems}
                                    </span>
                                </div>

                                <div
                                    className="
                                        flex
                                        justify-between
                                        text-slate-500
                                    "
                                >
                                    <span>
                                        Envío
                                    </span>

                                    <span>
                                        Por definir
                                    </span>
                                </div>

                            </div>

                            <div
                                className="
                                    mt-5
                                    border-t
                                    border-slate-200
                                    pt-5
                                "
                            >
                                <div
                                    className="
                                        flex
                                        items-end
                                        justify-between
                                    "
                                >
                                    <span
                                        className="
                                            text-sm
                                            font-black
                                            text-[#171717]
                                        "
                                    >
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
                                        ${subtotal.toFixed(2)}
                                    </span>
                                </div>
                            </div>

                            <Link
                                href="/tienda/checkout"
                                className="
        mt-6
        flex
        min-h-[52px]
        w-full
        items-center
        justify-center
        rounded-xl
        bg-[#ff6600]
        px-5
        text-sm
        font-black
        text-white
        transition
        hover:bg-[#e85d00]
    "
                            >
                                Continuar al pago
                            </Link>

                            <p
                                className="
        mt-3
        text-center
        text-[10px]
        leading-5
        text-slate-400
    "
                            >
                                El precio y el stock se verificarán antes de generar el pedido.
                            </p>

                        </div>
                    </aside>

                </div>
            )}

        </div>
    );
}