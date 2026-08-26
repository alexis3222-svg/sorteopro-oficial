"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
    useEffect,
    useMemo,
    useState,
} from "react";


type Socio = {
    id: string;
    username: string | null;
    display_name: string | null;
    code: string | null;
    whatsapp: string | null;
    email: string | null;
    status: string;
    is_active: boolean;
    commission_rate: number | string | null;
    created_at: string;
};


type Venta = {
    id: string;
    affiliate_id: string;
    pedido_id: number;
    sorteo_id: string | null;
    monto_pedido: number | string;
    porcentaje: number | string;
    comision: number | string;
    status: string;
    created_at: string;
    paid_at: string | null;
    reference: string | null;
};


export default function SocioDetalleClient() {

    const params =
        useParams();


    const socioId =
        (
            params?.id as
            string
        ) ||
        "";


    const [
        loading,
        setLoading,
    ] =
        useState(
            true
        );


    const [
        socio,
        setSocio,
    ] =
        useState<
            Socio | null
        >(
            null
        );


    const [
        ventas,
        setVentas,
    ] =
        useState<
            Venta[]
        >(
            []
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


    /* ============================================================
       CARGAR SOCIO + VENTAS
    ============================================================ */

    useEffect(
        () => {

            if (
                !socioId
            ) {
                return;
            }


            let cancelled =
                false;


            async function cargar() {

                setLoading(
                    true
                );

                setError(
                    null
                );


                try {

                    const res =
                        await fetch(
                            `/api/admin/affiliate/socios/${socioId}`,
                            {
                                method:
                                    "GET",

                                credentials:
                                    "include",

                                cache:
                                    "no-store",
                            }
                        );


                    const data =
                        await res
                            .json()
                            .catch(
                                () => ({})
                            );


                    if (
                        !res.ok
                    ) {

                        throw new Error(
                            data?.error ||
                            `Error ${res.status}`
                        );
                    }


                    if (
                        cancelled
                    ) {
                        return;
                    }


                    setSocio(
                        data.socio ??
                        null
                    );


                    setVentas(
                        Array.isArray(
                            data.ventas
                        )
                            ? data.ventas
                            : []
                    );


                } catch (
                err:
                    unknown
                ) {

                    if (
                        cancelled
                    ) {
                        return;
                    }


                    setError(
                        err instanceof
                            Error

                            ? err.message

                            : "No se pudo cargar el socio"
                    );


                } finally {

                    if (
                        !cancelled
                    ) {

                        setLoading(
                            false
                        );
                    }
                }
            }


            void cargar();


            return () => {

                cancelled =
                    true;
            };

        },
        [
            socioId,
        ]
    );


    /* ============================================================
       RESUMEN HISTÓRICO

       La comisión se suma desde affiliate_sales.
       NO se recalcula usando commission_rate actual.
    ============================================================ */

    const totalVentas =
        ventas.length;


    const totalVendido =
        useMemo(
            () =>
                ventas.reduce(
                    (
                        acc,
                        venta
                    ) =>
                        acc +
                        Number(
                            venta.monto_pedido ??
                            0
                        ),
                    0
                ),
            [
                ventas,
            ]
        );


    const totalComision =
        useMemo(
            () =>
                ventas.reduce(
                    (
                        acc,
                        venta
                    ) =>
                        acc +
                        Number(
                            venta.comision ??
                            0
                        ),
                    0
                ),
            [
                ventas,
            ]
        );


    const commissionRate =
        Number(
            socio
                ?.commission_rate ??
            0.10
        );


    const commissionPercent =
        commissionRate >
            1

            ? commissionRate

            : commissionRate *
            100;


    /* ============================================================
       ID INVÁLIDO
    ============================================================ */

    if (
        !socioId
    ) {

        return (
            <main
                className="
                    min-h-screen
                    bg-black
                    p-6
                    text-slate-200
                "
            >
                <p
                    className="
                        font-semibold
                        text-red-300
                    "
                >
                    ID inválido
                </p>

                <Link
                    className="
                        text-orange-400
                        underline
                    "
                    href="/admin/affiliate/socios"
                >
                    ← Volver
                </Link>
            </main>
        );
    }


    /* ============================================================
       RENDER
    ============================================================ */

    return (
        <main
            className="
                min-h-screen
                bg-black
                text-slate-200
            "
        >
            <div
                className="
                    mx-auto
                    max-w-6xl
                    px-4
                    py-6
                "
            >

                {/* =================================================
                    HEADER
                ================================================= */}

                <div
                    className="
                        mb-4
                        flex
                        items-center
                        justify-between
                        gap-4
                    "
                >
                    <div>
                        <p
                            className="
                                text-xs
                                tracking-widest
                                text-orange-400
                            "
                        >
                            BARUK593 • ADMIN
                        </p>

                        <h1
                            className="
                                text-3xl
                                font-extrabold
                            "
                        >
                            Ventas del socio
                        </h1>
                    </div>


                    <Link
                        href="/admin/affiliate/socios"
                        className="
                            rounded-full
                            border
                            border-slate-700
                            px-3
                            py-2
                            text-sm
                            hover:border-orange-400
                        "
                    >
                        ← Volver
                    </Link>
                </div>


                {/* =================================================
                    ESTADOS
                ================================================= */}

                {loading ? (

                    <p
                        className="
                            text-sm
                            text-slate-400
                        "
                    >
                        Cargando…
                    </p>

                ) : error ? (

                    <div
                        className="
                            rounded-2xl
                            border
                            border-red-500/30
                            bg-red-500/10
                            p-4
                        "
                    >
                        <p
                            className="
                                font-semibold
                                text-red-200
                            "
                        >
                            Error
                        </p>

                        <p
                            className="
                                text-sm
                                text-red-200/80
                            "
                        >
                            {error}
                        </p>
                    </div>

                ) : !socio ? (

                    <p
                        className="
                            text-sm
                            text-slate-400
                        "
                    >
                        No se encontró el socio.
                    </p>

                ) : (

                    <>

                        {/* =================================================
                            CARD SOCIO
                        ================================================= */}

                        <div
                            className="
                                rounded-2xl
                                border
                                border-slate-800
                                bg-slate-900/40
                                p-5
                            "
                        >
                            <div
                                className="
                                    flex
                                    flex-wrap
                                    items-start
                                    justify-between
                                    gap-4
                                "
                            >
                                <div>

                                    <p
                                        className="
                                            text-sm
                                            text-slate-400
                                        "
                                    >
                                        Socio
                                    </p>


                                    <p
                                        className="
                                            text-xl
                                            font-semibold
                                        "
                                    >
                                        {
                                            socio.display_name ??
                                            socio.username ??
                                            socio.email ??
                                            "Socio comercial"
                                        }
                                    </p>


                                    {socio.username && (
                                        <p
                                            className="
                                                mt-1
                                                text-sm
                                                text-slate-400
                                            "
                                        >
                                            @{socio.username}
                                        </p>
                                    )}


                                    {socio.email && (
                                        <p
                                            className="
                                                mt-1
                                                text-xs
                                                text-slate-500
                                            "
                                        >
                                            {socio.email}
                                        </p>
                                    )}

                                </div>


                                <div
                                    className="
                                        text-right
                                    "
                                >

                                    <p
                                        className="
                                            text-sm
                                            text-slate-400
                                        "
                                    >
                                        Código
                                    </p>


                                    <p
                                        className="
                                            text-lg
                                            font-semibold
                                        "
                                    >
                                        {socio.code ?? "—"}
                                    </p>


                                    <p
                                        className="
                                            mt-1
                                            text-sm
                                            text-slate-400
                                        "
                                    >
                                        WhatsApp:{" "}
                                        {socio.whatsapp ?? "—"}
                                    </p>


                                    <p
                                        className="
                                            mt-1
                                            text-sm
                                            text-slate-400
                                        "
                                    >
                                        Comisión actual:{" "}
                                        {commissionPercent.toFixed(0)}%
                                    </p>


                                    <span
                                        className={`
                                            mt-2
                                            inline-flex
                                            rounded-full
                                            px-3
                                            py-1
                                            text-xs

                                            ${socio.is_active

                                                ? "bg-emerald-500/15 text-emerald-300"

                                                : "bg-red-500/15 text-red-300"
                                            }
                                        `}
                                    >
                                        {
                                            socio.is_active
                                                ? "ACTIVO"
                                                : "SUSPENDIDO"
                                        }
                                    </span>

                                </div>
                            </div>
                        </div>


                        {/* =================================================
                            STATS
                        ================================================= */}

                        <div
                            className="
                                mt-4
                                grid
                                gap-3
                                sm:grid-cols-3
                            "
                        >

                            <div
                                className="
                                    rounded-2xl
                                    border
                                    border-slate-800
                                    bg-slate-900/40
                                    p-4
                                "
                            >
                                <p
                                    className="
                                        text-xs
                                        text-slate-400
                                    "
                                >
                                    Ventas acreditadas
                                </p>

                                <p
                                    className="
                                        mt-1
                                        text-2xl
                                        font-bold
                                    "
                                >
                                    {totalVentas}
                                </p>
                            </div>


                            <div
                                className="
                                    rounded-2xl
                                    border
                                    border-slate-800
                                    bg-slate-900/40
                                    p-4
                                "
                            >
                                <p
                                    className="
                                        text-xs
                                        text-slate-400
                                    "
                                >
                                    Total vendido
                                </p>

                                <p
                                    className="
                                        mt-1
                                        text-2xl
                                        font-bold
                                    "
                                >
                                    ${totalVendido.toFixed(2)}
                                </p>
                            </div>


                            <div
                                className="
                                    rounded-2xl
                                    border
                                    border-slate-800
                                    bg-slate-900/40
                                    p-4
                                "
                            >
                                <p
                                    className="
                                        text-xs
                                        text-slate-400
                                    "
                                >
                                    Comisión generada
                                </p>

                                <p
                                    className="
                                        mt-1
                                        text-2xl
                                        font-bold
                                    "
                                >
                                    ${totalComision.toFixed(2)}
                                </p>
                            </div>

                        </div>


                        {/* =================================================
                            TABLA VENTAS
                        ================================================= */}

                        <div
                            className="
                                mt-6
                                overflow-x-auto
                                rounded-2xl
                                border
                                border-slate-800
                                bg-slate-900/60
                            "
                        >
                            <table
                                className="
                                    min-w-full
                                    text-sm
                                "
                            >
                                <thead
                                    className="
                                        border-b
                                        border-slate-800
                                        text-xs
                                        uppercase
                                        text-slate-400
                                    "
                                >
                                    <tr>

                                        <th
                                            className="
                                                px-3
                                                py-2
                                                text-left
                                            "
                                        >
                                            Pedido
                                        </th>

                                        <th
                                            className="
                                                px-3
                                                py-2
                                                text-left
                                            "
                                        >
                                            Fecha
                                        </th>

                                        <th
                                            className="
                                                px-3
                                                py-2
                                                text-left
                                            "
                                        >
                                            Venta
                                        </th>

                                        <th
                                            className="
                                                px-3
                                                py-2
                                                text-left
                                            "
                                        >
                                            %
                                        </th>

                                        <th
                                            className="
                                                px-3
                                                py-2
                                                text-left
                                            "
                                        >
                                            Comisión
                                        </th>

                                        <th
                                            className="
                                                px-3
                                                py-2
                                                text-left
                                            "
                                        >
                                            Estado
                                        </th>

                                    </tr>
                                </thead>


                                <tbody>

                                    {ventas.map(
                                        (
                                            venta
                                        ) => {

                                            const porcentaje =
                                                Number(
                                                    venta.porcentaje ??
                                                    0
                                                );


                                            const porcentajeVisible =
                                                porcentaje >
                                                    1

                                                    ? porcentaje

                                                    : porcentaje *
                                                    100;


                                            const fecha =
                                                venta.paid_at ??
                                                venta.created_at;


                                            return (
                                                <tr
                                                    key={venta.id}
                                                    className="
                                                        border-b
                                                        border-slate-800
                                                        last:border-0
                                                    "
                                                >

                                                    <td
                                                        className="
                                                            px-3
                                                            py-2
                                                            font-medium
                                                        "
                                                    >
                                                        #{venta.pedido_id}
                                                    </td>


                                                    <td
                                                        className="
                                                            px-3
                                                            py-2
                                                            text-xs
                                                            text-slate-400
                                                        "
                                                    >
                                                        {
                                                            new Date(
                                                                fecha
                                                            )
                                                                .toLocaleString(
                                                                    "es-EC"
                                                                )
                                                        }
                                                    </td>


                                                    <td
                                                        className="
                                                            px-3
                                                            py-2
                                                        "
                                                    >
                                                        $
                                                        {
                                                            Number(
                                                                venta.monto_pedido ??
                                                                0
                                                            )
                                                                .toFixed(
                                                                    2
                                                                )
                                                        }
                                                    </td>


                                                    <td
                                                        className="
                                                            px-3
                                                            py-2
                                                        "
                                                    >
                                                        {
                                                            porcentajeVisible
                                                                .toFixed(
                                                                    0
                                                                )
                                                        }
                                                        %
                                                    </td>


                                                    <td
                                                        className="
                                                            px-3
                                                            py-2
                                                            font-semibold
                                                            text-emerald-300
                                                        "
                                                    >
                                                        $
                                                        {
                                                            Number(
                                                                venta.comision ??
                                                                0
                                                            )
                                                                .toFixed(
                                                                    2
                                                                )
                                                        }
                                                    </td>


                                                    <td
                                                        className="
                                                            px-3
                                                            py-2
                                                        "
                                                    >
                                                        <span
                                                            className="
                                                                inline-flex
                                                                rounded-full
                                                                bg-emerald-500/15
                                                                px-2.5
                                                                py-1
                                                                text-[10px]
                                                                font-semibold
                                                                uppercase
                                                                text-emerald-300
                                                            "
                                                        >
                                                            {
                                                                venta.status ===
                                                                    "credited"

                                                                    ? "ACREDITADA"

                                                                    : venta.status
                                                            }
                                                        </span>
                                                    </td>

                                                </tr>
                                            );
                                        }
                                    )}


                                    {ventas.length ===
                                        0 && (

                                            <tr>
                                                <td
                                                    colSpan={6}
                                                    className="
                                                        px-3
                                                        py-6
                                                        text-center
                                                        text-slate-400
                                                    "
                                                >
                                                    Este socio aún no registra ventas acreditadas.
                                                </td>
                                            </tr>
                                        )}

                                </tbody>
                            </table>
                        </div>

                    </>
                )}
            </div>
        </main>
    );
}