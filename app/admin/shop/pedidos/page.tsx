"use client";

import {
    useEffect,
    useMemo,
    useState,
} from "react";

import Link from "next/link";

type ItemPedido = {
    id: string;
    nombre: string;
    sku: string | null;
    precio: number;
    cantidad: number;
    total: number;
};

type Pedido = {
    id: string;
    numero: string;

    cliente: {
        nombre: string;
        email: string;
        telefono: string | null;
        identificacion: string | null;
    };

    entrega: {
        tipo: string;
        provincia: string | null;
        ciudad: string | null;
        direccion: string | null;
        referencia: string | null;
    };

    subtotal: number;
    costoEnvio: number;
    descuento: number;
    total: number;

    metodoPago: string | null;
    estadoPago: string;
    estado: string;

    createdAt: string;

    items: ItemPedido[];
};

type Filtro =
    | "todos"
    | "pendientes"
    | "pagados"
    | "preparando"
    | "enviados"
    | "entregados";

export default function AdminShopPedidosPage() {
    const [
        pedidos,
        setPedidos,
    ] =
        useState<Pedido[]>(
            []
        );

    const [
        loading,
        setLoading,
    ] =
        useState(true);

    const [
        error,
        setError,
    ] =
        useState<string | null>(
            null
        );

    const [
        filtro,
        setFiltro,
    ] =
        useState<Filtro>(
            "todos"
        );

    const [
        busqueda,
        setBusqueda,
    ] =
        useState("");

    const [
        procesandoId,
        setProcesandoId,
    ] =
        useState<string | null>(
            null
        );

    /* ========================================================
       CARGAR
    ======================================================== */

    async function cargarPedidos() {
        try {
            setLoading(
                true
            );

            setError(
                null
            );

            const response =
                await fetch(
                    "/api/admin/shop/orders",
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
                    "No se pudieron cargar los pedidos."
                );
            }

            setPedidos(
                json.pedidos ??
                []
            );
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "No se pudieron cargar los pedidos."
            );
        } finally {
            setLoading(
                false
            );
        }
    }

    useEffect(() => {
        void cargarPedidos();
    }, []);

    /* ========================================================
       ACCIONES
    ======================================================== */

    async function ejecutarAccion(
        pedidoId: string,
        accion: string
    ) {
        if (
            procesandoId
        ) {
            return;
        }

        try {
            setProcesandoId(
                pedidoId
            );

            setError(
                null
            );

            const response =
                await fetch(
                    `/api/admin/shop/orders/${pedidoId}`,
                    {
                        method:
                            "PATCH",

                        headers: {
                            "Content-Type":
                                "application/json",
                        },

                        body:
                            JSON.stringify({
                                accion,
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
                    "No se pudo actualizar el pedido."
                );
            }

            await cargarPedidos();

        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "No se pudo actualizar el pedido."
            );
        } finally {
            setProcesandoId(
                null
            );
        }
    }

    /* ========================================================
       FILTROS
    ======================================================== */

    const pedidosFiltrados =
        useMemo(() => {
            const texto =
                busqueda
                    .trim()
                    .toLowerCase();

            return pedidos.filter(
                (pedido) => {
                    let coincideFiltro =
                        true;

                    if (
                        filtro ===
                        "pendientes"
                    ) {
                        coincideFiltro =
                            pedido.estadoPago !==
                            "pagado" &&
                            pedido.estado !==
                            "cancelado";
                    }

                    if (
                        filtro ===
                        "pagados"
                    ) {
                        coincideFiltro =
                            pedido.estadoPago ===
                            "pagado";
                    }

                    if (
                        filtro ===
                        "preparando"
                    ) {
                        coincideFiltro =
                            pedido.estado ===
                            "preparando";
                    }

                    if (
                        filtro ===
                        "enviados"
                    ) {
                        coincideFiltro =
                            pedido.estado ===
                            "enviado";
                    }

                    if (
                        filtro ===
                        "entregados"
                    ) {
                        coincideFiltro =
                            pedido.estado ===
                            "entregado";
                    }

                    if (
                        !coincideFiltro
                    ) {
                        return false;
                    }

                    if (!texto) {
                        return true;
                    }

                    const searchable =
                        [
                            pedido.numero,
                            pedido.cliente.nombre,
                            pedido.cliente.email,
                            pedido.cliente.telefono,
                            pedido.metodoPago,
                            pedido.estadoPago,
                            pedido.estado,
                            ...pedido.items.map(
                                (item) =>
                                    item.nombre
                            ),
                        ]
                            .filter(
                                Boolean
                            )
                            .join(" ")
                            .toLowerCase();

                    return searchable.includes(
                        texto
                    );
                }
            );
        }, [
            pedidos,
            filtro,
            busqueda,
        ]);

    /* ========================================================
       CONTADORES
    ======================================================== */

    const pendientes =
        pedidos.filter(
            (p) =>
                p.estadoPago !==
                "pagado" &&
                p.estado !==
                "cancelado"
        ).length;

    const pagados =
        pedidos.filter(
            (p) =>
                p.estadoPago ===
                "pagado"
        ).length;

    /* ========================================================
       HELPERS
    ======================================================== */

    function fecha(
        value: string
    ) {
        try {
            return new Intl.DateTimeFormat(
                "es-EC",
                {
                    dateStyle:
                        "medium",

                    timeStyle:
                        "short",
                }
            ).format(
                new Date(
                    value
                )
            );
        } catch {
            return value;
        }
    }

    function labelMetodo(
        value: string | null
    ) {
        if (
            value ===
            "payphone"
        ) {
            return "PayPhone";
        }

        if (
            value ===
            "transferencia"
        ) {
            return "Transferencia";
        }

        return "Sin definir";
    }

    /* ========================================================
       RENDER
    ======================================================== */

    return (
        <div className="min-h-screen bg-[#f7f7f8]">

            <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6">

                {/* HEADER */}

                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">

                    <div>
                        <Link
                            href="/admin/shop"
                            className="text-xs font-bold text-slate-400 hover:text-[#ff6600]"
                        >
                            ← Baruk Shop
                        </Link>

                        <p className="mt-6 text-[10px] font-black uppercase tracking-[0.2em] text-[#ff6600]">
                            Administración
                        </p>

                        <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-[#171717] md:text-4xl">
                            Pedidos
                        </h1>

                        <p className="mt-2 text-sm text-slate-500">
                            Gestiona pagos y entregas de Baruk Shop.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() =>
                            void cargarPedidos()
                        }
                        className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-black text-[#171717]"
                    >
                        Actualizar
                    </button>

                </div>

                {/* STATS */}

                <div className="mt-8 grid gap-4 sm:grid-cols-3">

                    <div className="rounded-2xl border border-slate-200 bg-white p-5">
                        <p className="text-xs font-bold text-slate-400">
                            Pedidos
                        </p>

                        <p className="mt-2 text-3xl font-black text-[#171717]">
                            {pedidos.length}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5">
                        <p className="text-xs font-bold text-slate-400">
                            Pendientes
                        </p>

                        <p className="mt-2 text-3xl font-black text-amber-600">
                            {pendientes}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5">
                        <p className="text-xs font-bold text-slate-400">
                            Pagados
                        </p>

                        <p className="mt-2 text-3xl font-black text-emerald-600">
                            {pagados}
                        </p>
                    </div>

                </div>

                {/* FILTROS */}

                <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">

                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                        <div className="flex flex-wrap gap-2">

                            {(
                                [
                                    [
                                        "todos",
                                        "Todos",
                                    ],
                                    [
                                        "pendientes",
                                        "Pendientes",
                                    ],
                                    [
                                        "pagados",
                                        "Pagados",
                                    ],
                                    [
                                        "preparando",
                                        "Preparando",
                                    ],
                                    [
                                        "enviados",
                                        "Enviados",
                                    ],
                                    [
                                        "entregados",
                                        "Entregados",
                                    ],
                                ] as const
                            ).map(
                                ([
                                    value,
                                    label,
                                ]) => (
                                    <button
                                        key={
                                            value
                                        }
                                        type="button"
                                        onClick={() =>
                                            setFiltro(
                                                value
                                            )
                                        }
                                        className={`
                                            rounded-full
                                            px-4
                                            py-2
                                            text-xs
                                            font-black
                                            transition

                                            ${filtro ===
                                                value
                                                ? "bg-[#171717] text-white"
                                                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                            }
                                        `}
                                    >
                                        {label}
                                    </button>
                                )
                            )}

                        </div>

                        <input
                            value={
                                busqueda
                            }
                            onChange={(
                                e
                            ) =>
                                setBusqueda(
                                    e.target
                                        .value
                                )
                            }
                            placeholder="Buscar pedido, cliente o producto..."
                            className="min-h-[42px] w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-[#ff6600] lg:max-w-sm"
                        />

                    </div>

                </div>

                {/* ERROR */}

                {error && (
                    <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                        {error}
                    </div>
                )}

                {/* LOADING */}

                {loading ? (
                    <div className="py-20 text-center text-sm text-slate-400">
                        Cargando pedidos...
                    </div>
                ) : pedidosFiltrados.length ===
                    0 ? (
                    <div className="mt-6 rounded-2xl border border-slate-200 bg-white py-16 text-center">
                        <p className="font-black text-[#171717]">
                            No hay pedidos
                        </p>

                        <p className="mt-2 text-sm text-slate-400">
                            No encontramos pedidos para este filtro.
                        </p>
                    </div>
                ) : (
                    <div className="mt-6 space-y-4">

                        {pedidosFiltrados.map(
                            (
                                pedido
                            ) => {
                                const procesando =
                                    procesandoId ===
                                    pedido.id;

                                const transferenciaPendiente =
                                    pedido.metodoPago ===
                                    "transferencia" &&
                                    pedido.estadoPago !==
                                    "pagado" &&
                                    pedido.estado !==
                                    "cancelado";

                                return (
                                    <article
                                        key={
                                            pedido.id
                                        }
                                        className="overflow-hidden rounded-[24px] border border-slate-200 bg-white"
                                    >

                                        {/* CABECERA */}

                                        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 md:flex-row md:items-center md:justify-between">

                                            <div>
                                                <div className="flex flex-wrap items-center gap-2">

                                                    <h2 className="font-black text-[#171717]">
                                                        {
                                                            pedido.numero
                                                        }
                                                    </h2>

                                                    <span
                                                        className={`
                                                            rounded-full
                                                            px-2.5
                                                            py-1
                                                            text-[10px]
                                                            font-black
                                                            uppercase

                                                            ${pedido.estadoPago ===
                                                                "pagado"
                                                                ? "bg-emerald-100 text-emerald-700"
                                                                : pedido.estado ===
                                                                    "cancelado"
                                                                    ? "bg-red-100 text-red-600"
                                                                    : "bg-amber-100 text-amber-700"
                                                            }
                                                        `}
                                                    >
                                                        {
                                                            pedido.estadoPago
                                                        }
                                                    </span>

                                                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase text-slate-500">
                                                        {
                                                            pedido.estado
                                                        }
                                                    </span>

                                                </div>

                                                <p className="mt-2 text-xs text-slate-400">
                                                    {fecha(
                                                        pedido.createdAt
                                                    )}
                                                </p>
                                            </div>

                                            <div className="text-left md:text-right">

                                                <p className="text-xs font-bold text-slate-400">
                                                    Total
                                                </p>

                                                <p className="mt-1 text-2xl font-black text-[#171717]">
                                                    $
                                                    {pedido.total.toFixed(
                                                        2
                                                    )}
                                                </p>

                                            </div>

                                        </div>

                                        {/* CUERPO */}

                                        <div className="grid gap-6 p-5 md:grid-cols-3">

                                            {/* CLIENTE */}

                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                                                    Cliente
                                                </p>

                                                <p className="mt-2 font-black text-[#171717]">
                                                    {
                                                        pedido.cliente.nombre
                                                    }
                                                </p>

                                                <p className="mt-1 text-xs text-slate-500">
                                                    {
                                                        pedido.cliente.email
                                                    }
                                                </p>

                                                {pedido
                                                    .cliente
                                                    .telefono && (
                                                        <p className="mt-1 text-xs text-slate-500">
                                                            {
                                                                pedido
                                                                    .cliente
                                                                    .telefono
                                                            }
                                                        </p>
                                                    )}
                                            </div>

                                            {/* PRODUCTOS */}

                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                                                    Productos
                                                </p>

                                                <div className="mt-2 space-y-2">

                                                    {pedido.items.map(
                                                        (
                                                            item
                                                        ) => (
                                                            <div
                                                                key={
                                                                    item.id
                                                                }
                                                                className="flex justify-between gap-3 text-xs"
                                                            >
                                                                <span className="text-slate-600">
                                                                    {
                                                                        item.cantidad
                                                                    }{" "}
                                                                    ×{" "}
                                                                    {
                                                                        item.nombre
                                                                    }
                                                                </span>

                                                                <span className="font-black text-[#171717]">
                                                                    $
                                                                    {item.total.toFixed(
                                                                        2
                                                                    )}
                                                                </span>
                                                            </div>
                                                        )
                                                    )}

                                                </div>
                                            </div>

                                            {/* PAGO */}

                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                                                    Pago
                                                </p>

                                                <p className="mt-2 font-black text-[#171717]">
                                                    {labelMetodo(
                                                        pedido.metodoPago
                                                    )}
                                                </p>

                                                <p className="mt-1 text-xs text-slate-500">
                                                    Estado:{" "}
                                                    {
                                                        pedido.estadoPago
                                                    }
                                                </p>
                                            </div>

                                        </div>

                                        {/* ENTREGA */}

                                        {(pedido
                                            .entrega
                                            .ciudad ||
                                            pedido
                                                .entrega
                                                .direccion) && (
                                                <div className="border-t border-slate-100 px-5 py-4">

                                                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                                                        Entrega
                                                    </p>

                                                    <p className="mt-2 text-xs leading-5 text-slate-600">
                                                        {[
                                                            pedido
                                                                .entrega
                                                                .direccion,
                                                            pedido
                                                                .entrega
                                                                .ciudad,
                                                            pedido
                                                                .entrega
                                                                .provincia,
                                                        ]
                                                            .filter(
                                                                Boolean
                                                            )
                                                            .join(
                                                                ", "
                                                            )}
                                                    </p>

                                                </div>
                                            )}

                                        {/* ACCIONES */}

                                        <div className="flex flex-wrap gap-2 border-t border-slate-100 bg-[#fafafa] p-4">

                                            {transferenciaPendiente && (
                                                <button
                                                    type="button"
                                                    disabled={
                                                        procesando
                                                    }
                                                    onClick={() => {
                                                        const confirmar =
                                                            window.confirm(
                                                                `¿Confirmas que recibiste la transferencia del pedido ${pedido.numero} por $${pedido.total.toFixed(
                                                                    2
                                                                )}?`
                                                            );

                                                        if (
                                                            confirmar
                                                        ) {
                                                            void ejecutarAccion(
                                                                pedido.id,
                                                                "confirmar_transferencia"
                                                            );
                                                        }
                                                    }}
                                                    className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white disabled:opacity-50"
                                                >
                                                    Confirmar pago
                                                </button>
                                            )}

                                            {pedido.estadoPago ===
                                                "pagado" &&
                                                ![
                                                    "preparando",
                                                    "enviado",
                                                    "entregado",
                                                ].includes(
                                                    pedido.estado
                                                ) && (
                                                    <button
                                                        type="button"
                                                        disabled={
                                                            procesando
                                                        }
                                                        onClick={() =>
                                                            void ejecutarAccion(
                                                                pedido.id,
                                                                "preparando"
                                                            )
                                                        }
                                                        className="rounded-xl bg-[#171717] px-4 py-2.5 text-xs font-black text-white disabled:opacity-50"
                                                    >
                                                        Preparando
                                                    </button>
                                                )}

                                            {pedido.estadoPago ===
                                                "pagado" &&
                                                pedido.estado ===
                                                "preparando" && (
                                                    <button
                                                        type="button"
                                                        disabled={
                                                            procesando
                                                        }
                                                        onClick={() =>
                                                            void ejecutarAccion(
                                                                pedido.id,
                                                                "enviado"
                                                            )
                                                        }
                                                        className="rounded-xl bg-[#171717] px-4 py-2.5 text-xs font-black text-white disabled:opacity-50"
                                                    >
                                                        Marcar enviado
                                                    </button>
                                                )}

                                            {pedido.estadoPago ===
                                                "pagado" &&
                                                pedido.estado ===
                                                "enviado" && (
                                                    <button
                                                        type="button"
                                                        disabled={
                                                            procesando
                                                        }
                                                        onClick={() =>
                                                            void ejecutarAccion(
                                                                pedido.id,
                                                                "entregado"
                                                            )
                                                        }
                                                        className="rounded-xl bg-[#171717] px-4 py-2.5 text-xs font-black text-white disabled:opacity-50"
                                                    >
                                                        Marcar entregado
                                                    </button>
                                                )}

                                            {pedido.estadoPago !==
                                                "pagado" &&
                                                pedido.estado !==
                                                "cancelado" && (
                                                    <button
                                                        type="button"
                                                        disabled={
                                                            procesando
                                                        }
                                                        onClick={() => {
                                                            const confirmar =
                                                                window.confirm(
                                                                    `¿Cancelar el pedido ${pedido.numero}?`
                                                                );

                                                            if (
                                                                confirmar
                                                            ) {
                                                                void ejecutarAccion(
                                                                    pedido.id,
                                                                    "cancelar"
                                                                );
                                                            }
                                                        }}
                                                        className="rounded-xl border border-red-200 bg-white px-4 py-2.5 text-xs font-black text-red-500 disabled:opacity-50"
                                                    >
                                                        Cancelar
                                                    </button>
                                                )}

                                            {procesando && (
                                                <span className="flex items-center px-3 text-xs font-bold text-slate-400">
                                                    Procesando...
                                                </span>
                                            )}

                                        </div>

                                    </article>
                                );
                            }
                        )}

                    </div>
                )}

            </div>
        </div>
    );
}