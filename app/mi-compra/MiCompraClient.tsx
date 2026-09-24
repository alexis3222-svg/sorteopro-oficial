"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import BarukRevealCard from "@/components/baruk/BarukRevealCard";
import { supabaseBrowser } from "@/lib/supabaseClient";

type Pedido = {
    id: number;
    nombre: string | null;
    telefono: string | null;
    correo: string | null;

    cantidad_numeros: number | null;
    precio_unitario: number | null;
    total: number | null;

    metodo_pago: string | null;
    estado: string | null;

    created_at: string;

    actividad_numero: number | null;
    sorteo_id: string | null;

    payphone_client_transaction_id: string | null;

    tipo_compra: "self" | "gift" | null;

    cards_processing_status:
    | "pending"
    | "processing"
    | "completed"
    | "failed"
    | "cancelled"
    | null;
};

type BarukCardSummary = {
    id: string;
    revealed: boolean;
    revealed_at: string | null;
    estado: string;
    created_at: string;
};

type MiCompraResponse = {
    ok: boolean;
    pedido?: Pedido;
    cards?: BarukCardSummary[];
    error?: string;
};

export default function MiCompraClient() {
    const searchParams = useSearchParams();

    const pedidoId =
        searchParams.get("pedido") ||
        "";

    const tx =
        searchParams.get("tx") ||
        searchParams.get("clientTransactionId") ||
        searchParams.get("id") ||
        "";

    const purchaseIdentifier =
        pedidoId ||
        tx;

    const [loading, setLoading] = useState(true);

    const [pedido, setPedido] =
        useState<Pedido | null>(null);

    const [cards, setCards] =
        useState<BarukCardSummary[]>([]);

    const [error, setError] =
        useState<string | null>(null);

    useEffect(() => {
        if (!purchaseIdentifier) {
            setLoading(false);
            return;
        }

        let cancelled = false;

        async function loadData() {
            try {
                setLoading(true);
                setError(null);

                const headers:
                    Record<string, string> =
                    {};

                let apiUrl =
                    "";

                /*
                 * Desde "Mis compras" usamos pedido_id.
                 * Ese modo requiere la sesión del usuario
                 * para comprobar que el pedido le pertenece.
                 *
                 * El flujo PayPhone conserva ?tx=...
                 * exactamente como antes.
                 */
                if (pedidoId) {
                    const {
                        data: sessionData,
                        error: sessionError,
                    } =
                        await supabaseBrowser
                            .auth
                            .getSession();

                    if (sessionError) {
                        throw sessionError;
                    }

                    const session =
                        sessionData.session;

                    if (!session) {
                        throw new Error(
                            "Debes iniciar sesión para consultar este pedido."
                        );
                    }

                    headers.Authorization =
                        `Bearer ${session.access_token}`;

                    apiUrl =
                        `/api/mi-compra?pedido=${encodeURIComponent(
                            pedidoId
                        )}`;
                } else {
                    apiUrl =
                        `/api/mi-compra?tx=${encodeURIComponent(
                            tx
                        )}`;
                }

                const response =
                    await fetch(
                        apiUrl,
                        {
                            method: "GET",
                            headers,
                            cache: "no-store",
                        }
                    );

                const data =
                    (await response.json()) as MiCompraResponse;

                if (
                    !response.ok ||
                    !data.ok ||
                    !data.pedido
                ) {
                    throw new Error(
                        data.error ??
                        "No se pudo cargar la compra"
                    );
                }

                if (cancelled) {
                    return;
                }

                setPedido(data.pedido);
                setCards(data.cards ?? []);
            } catch (err: unknown) {
                if (cancelled) {
                    return;
                }

                setPedido(null);
                setCards([]);

                setError(
                    err instanceof Error
                        ? err.message
                        : "No se pudo cargar la compra"
                );
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        loadData();

        return () => {
            cancelled = true;
        };
    }, [
        pedidoId,
        tx,
        purchaseIdentifier,
    ]);

    /*
     * No existe identificador en la URL.
     */
    if (!purchaseIdentifier) {
        return (
            <div className="flex items-center justify-center px-4 pt-32 pb-12">
                <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-lg">
                    <h1 className="mb-2 text-xl font-bold text-red-600">
                        Falta el identificador de compra
                    </h1>

                    <p className="text-sm text-gray-600">
                        No se encontró el identificador
                        de la compra en la URL.
                    </p>

                    <a
                        href="/"
                        className="mt-6 inline-block rounded-xl bg-[#ff6600] px-6 py-3 font-semibold text-white transition hover:bg-[#ff7f26]"
                    >
                        Regresar al inicio
                    </a>
                </div>
            </div>
        );
    }

    /*
     * Cargando.
     */
    if (loading) {
        return (
            <div className="flex items-center justify-center px-4 pt-32 pb-12">
                <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-md">
                    <p className="text-sm text-gray-700">
                        Cargando tus Tarjetas de la Suerte...
                    </p>
                </div>
            </div>
        );
    }

    /*
     * Compra no encontrada.
     */
    if (!pedido) {
        return (
            <div className="flex items-center justify-center px-4 pt-32 pb-12">
                <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-lg">
                    <h1 className="mb-2 text-xl font-bold text-red-600">
                        Compra no encontrada
                    </h1>

                    <p className="text-sm text-gray-600">
                        {error ??
                            "No fue posible encontrar esta compra."}
                    </p>

                    <p className="mt-3 break-all rounded bg-gray-100 px-3 py-2 font-mono text-xs">
                        {pedidoId
                            ? `Pedido #${pedidoId}`
                            : tx}
                    </p>

                    <a
                        href="/"
                        className="mt-6 inline-block rounded-xl bg-[#ff6600] px-6 py-3 font-semibold text-white transition hover:bg-[#ff7f26]"
                    >
                        Regresar al inicio
                    </a>
                </div>
            </div>
        );
    }

    const total =
        pedido.total !== null
            ? Number(pedido.total).toFixed(2)
            : "-";

    const precioUnitario =
        pedido.precio_unitario !== null
            ? Number(
                pedido.precio_unitario
            ).toFixed(2)
            : "-";

    const pedidoPagado =
        pedido.estado === "pagado";

    const cardsCompleted =
        pedido.cards_processing_status ===
        "completed";

    const cardsReady =
        pedidoPagado &&
        cardsCompleted &&
        cards.length > 0;

    return (
        <div className="px-4 pt-24 pb-16">
            <div className="mx-auto w-full max-w-6xl">
                {/* CABECERA */}

                <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-xl">
                    <div className="h-2 bg-gradient-to-r from-[#ff6600] to-[#ff8f3d]" />

                    <div className="p-6 md:p-10">
                        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#ff6600]">
                                    Baruk593
                                </p>

                                <h1 className="mt-2 text-3xl font-extrabold text-gray-900 md:text-4xl">
                                    Tus Tarjetas de la Suerte
                                </h1>

                                <p className="mt-2 max-w-2xl text-sm text-gray-500">
                                    Cada tarjeta contiene
                                    un número de
                                    participación y puede
                                    incluir una esfera o
                                    un premio instantáneo.
                                </p>
                            </div>

                            <div
                                className={`inline-flex w-fit items-center rounded-full px-4 py-2 text-sm font-bold ${pedidoPagado
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-amber-50 text-amber-700"
                                    }`}
                            >
                                {pedidoPagado
                                    ? "✓ Pago confirmado"
                                    : "Pago pendiente"}
                            </div>
                        </div>

                        {/* RESUMEN */}

                        <div className="mt-8 grid grid-cols-1 gap-6 rounded-2xl bg-gray-50 p-5 md:grid-cols-2 lg:grid-cols-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                                    Cliente
                                </p>

                                <p className="mt-1 font-bold text-gray-900">
                                    {pedido.nombre || "-"}
                                </p>

                                <p className="mt-1 text-xs text-gray-500">
                                    {pedido.correo}
                                </p>
                            </div>

                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                                    Tarjetas de la Suerte
                                </p>

                                <p className="mt-1 text-2xl font-black text-[#ff6600]">
                                    {pedido.cantidad_numeros ??
                                        cards.length}
                                </p>
                            </div>

                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                                    Valor unitario
                                </p>

                                <p className="mt-1 font-bold text-gray-900">
                                    ${precioUnitario}
                                </p>
                            </div>

                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                                    Total
                                </p>

                                <p className="mt-1 text-xl font-black text-gray-900">
                                    ${total}
                                </p>
                            </div>
                        </div>

                        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-xs text-gray-500">
                            <span>
                                Pedido #{pedido.id}
                            </span>

                            <span>
                                Método:{" "}
                                {pedido.metodo_pago ||
                                    "-"}
                            </span>

                            <span>
                                {new Date(
                                    pedido.created_at
                                ).toLocaleString(
                                    "es-EC"
                                )}
                            </span>
                        </div>
                    </div>
                </div>

                {/* TARJETAS */}

                <section className="mt-10">
                    <div className="mb-8 text-center">
                        <h2 className="text-2xl font-black text-gray-900 md:text-3xl">
                            Revela tus tarjetas
                        </h2>

                        <p className="mt-2 text-sm text-gray-500">
                            Haz clic sobre cada Tarjeta
                            para conocer tu
                            resultado.
                        </p>
                    </div>

                    {!pedidoPagado && (
                        <div className="mx-auto max-w-xl rounded-2xl border border-amber-200 bg-amber-50 p-5 text-center">
                            <p className="font-bold text-amber-800">
                                Tu pago todavía está
                                pendiente.
                            </p>

                            <p className="mt-1 text-sm text-amber-700">
                                Tus tarjetas estarán
                                disponibles cuando el
                                pago sea confirmado.
                            </p>
                        </div>
                    )}

                    {pedidoPagado &&
                        !cardsCompleted && (
                            <div className="mx-auto max-w-xl rounded-2xl border border-blue-200 bg-blue-50 p-5 text-center">
                                <p className="font-bold text-blue-800">
                                    Estamos preparando
                                    tus Tarjetas de la Suerte.
                                </p>

                                <p className="mt-1 text-sm text-blue-700">
                                    Actualiza esta página
                                    en unos segundos.
                                </p>
                            </div>
                        )}

                    {pedidoPagado &&
                        cardsCompleted &&
                        cards.length === 0 && (
                            <div className="mx-auto max-w-xl rounded-2xl border border-gray-200 bg-white p-5 text-center shadow-sm">
                                <p className="font-bold text-gray-800">
                                    No encontramos
                                    tarjetas asociadas a
                                    esta compra.
                                </p>
                            </div>
                        )}

                    {cardsReady && (
                        <div className="grid grid-cols-1 gap-x-8 gap-y-14 md:grid-cols-2 xl:grid-cols-3">
                            {cards.map(
                                (card, index) => (
                                    <div
                                        key={card.id}
                                        className="flex flex-col items-center"
                                    >
                                        <div className="mb-3 inline-flex items-center rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-500 shadow-sm">
                                            Tarjeta de la Suerte{" "}
                                            {index + 1} de{" "}
                                            {cards.length}
                                        </div>

                                        <BarukRevealCard
                                            cardId={card.id}
                                            email={pedido.correo ?? ""}
                                            initialRevealed={card.revealed}
                                        />
                                    </div>
                                )
                            )}
                        </div>
                    )}
                </section>

                <div className="mt-14 text-center">
                    <a
                        href="/"
                        className="inline-flex items-center justify-center rounded-xl bg-[#ff6600] px-8 py-3 font-semibold text-white shadow-lg transition hover:bg-[#ff7f26]"
                    >
                        Regresar al inicio
                    </a>
                </div>
            </div>
        </div>
    );
}