"use client";

export const dynamic = "force-dynamic";

import {
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import {
    useRouter,
    useSearchParams,
} from "next/navigation";

import {
    Anton,
} from "next/font/google";

import {
    supabase,
} from "@/lib/supabaseClient";

import {
    trackPurchase,
} from "@/lib/metaPixel";


const anton = Anton({
    subsets: [
        "latin",
    ],

    weight:
        "400",
});


type PedidoRow = {
    id: number;

    nombre:
    | string
    | null;

    telefono:
    | string
    | null;

    estado:
    | string
    | null;

    cantidad_numeros:
    | number
    | null;

    sorteo_id:
    | string
    | null;

    actividad_numero:
    | number
    | null;

    metodo_pago: string | null;

    tipo_compra:
    | "self"
    | "gift"
    | null;

    created_at:
    | string
    | null;

    payphone_client_transaction_id?:
    | string
    | null;
};


type SorteoRow = {
    id: string;

    titulo:
    | string
    | null;

    actividad_numero:
    | number
    | null;

    precio_numero:
    | number
    | null;

    imagen_url?:
    | string
    | null;
};


export default function PagoExitosoClient() {

    const router =
        useRouter();


    const sp =
        useSearchParams();


    const tx =
        sp.get(
            "tx"
        );


    const status =
        sp.get(
            "status"
        );


    const pedidoIdParam =
        sp.get(
            "id"
        );


    const pedidoId =
        useMemo(
            () =>
                pedidoIdParam
                    ? Number(
                        pedidoIdParam
                    )
                    : null,

            [
                pedidoIdParam,
            ]
        );


    const [
        loading,
        setLoading,
    ] =
        useState(
            true
        );


    const [
        pedido,
        setPedido,
    ] =
        useState<
            PedidoRow | null
        >(
            null
        );


    const [
        sorteo,
        setSorteo,
    ] =
        useState<
            SorteoRow | null
        >(
            null
        );


    /*
     * IMPORTANTE:
     *
     * Seguimos consultando los números
     * únicamente para comprobar que
     * la asignación terminó.
     *
     * YA NO SE MUESTRAN EN ESTA PÁGINA.
     */
    const [
        numeros,
        setNumeros,
    ] =
        useState<
            number[]
        >(
            []
        );


    const [
        softMsg,
        setSoftMsg,
    ] =
        useState<
            string | null
        >(
            null
        );


    const purchaseSentRef =
        useRef(
            false
        );


    /* ============================================================
       CARGAR PEDIDO
    ============================================================ */

    useEffect(
        () => {

            let cancelled =
                false;


            async function cargar() {

                setLoading(
                    true
                );


                setSoftMsg(
                    null
                );


                let pedidoRow:
                    PedidoRow | null =
                    null;


                /* =================================================
                   1. PEDIDO POR ID
                ================================================= */

                if (
                    pedidoId
                ) {

                    const {
                        data,
                        error,
                    } =
                        await supabase
                            .from(
                                "pedidos"
                            )
                            .select(
                                "id,nombre,telefono,estado,cantidad_numeros,sorteo_id,actividad_numero,metodo_pago,tipo_compra,created_at,payphone_client_transaction_id")
                            .eq(
                                "id",
                                pedidoId
                            )
                            .maybeSingle();


                    if (
                        !error
                    ) {

                        pedidoRow =
                            (
                                data as
                                any
                            ) ??
                            null;
                    }
                }


                /* =================================================
                   2. PEDIDO POR TX PAYPHONE
                ================================================= */

                if (
                    !pedidoRow &&
                    tx
                ) {

                    const {
                        data,
                        error,
                    } =
                        await supabase
                            .from(
                                "pedidos"
                            )
                            .select(
                                "id,nombre,telefono,estado,cantidad_numeros,sorteo_id,actividad_numero,metodo_pago,tipo_compra,created_at,payphone_client_transaction_id")
                            .eq(
                                "payphone_client_transaction_id",
                                tx
                            )
                            .maybeSingle();


                    if (
                        !error
                    ) {

                        pedidoRow =
                            (
                                data as
                                any
                            ) ??
                            null;
                    }
                }


                if (
                    cancelled
                ) {
                    return;
                }


                /* =================================================
                   PEDIDO TODAVÍA NO DISPONIBLE
                ================================================= */

                if (
                    !pedidoRow
                ) {

                    setPedido(
                        null
                    );


                    setSorteo(
                        null
                    );


                    setNumeros(
                        []
                    );


                    setSoftMsg(
                        "Estamos terminando de procesar tu compra. Refresca en unos segundos."
                    );


                    setLoading(
                        false
                    );


                    return;
                }


                setPedido(
                    pedidoRow
                );


                /* =================================================
                   3. SORTEO
                ================================================= */

                if (
                    pedidoRow
                        .sorteo_id
                ) {

                    const {
                        data,
                    } =
                        await supabase
                            .from(
                                "sorteos"
                            )
                            .select(
                                "id,titulo,actividad_numero,precio_numero,imagen_url"
                            )
                            .eq(
                                "id",
                                pedidoRow
                                    .sorteo_id
                            )
                            .maybeSingle();


                    if (
                        !cancelled
                    ) {

                        setSorteo(
                            (
                                data as
                                any
                            ) ??
                            null
                        );
                    }
                }


                /* =================================================
                   4. CONFIRMAR QUE LOS NÚMEROS FUERON ASIGNADOS
                ================================================= */

                await cargarNumerosConRetry(
                    pedidoRow.id
                );


                if (
                    !cancelled
                ) {

                    setLoading(
                        false
                    );
                }
            }


            async function cargarNumerosConRetry(
                pedidoIdReal:
                    number
            ) {

                for (
                    let i = 0;
                    i < 6;
                    i++
                ) {

                    const {
                        data,
                        error,
                    } =
                        await supabase
                            .from(
                                "numeros_asignados"
                            )
                            .select(
                                "numero"
                            )
                            .eq(
                                "pedido_id",
                                pedidoIdReal
                            )
                            .order(
                                "numero",
                                {
                                    ascending:
                                        true,
                                }
                            );


                    if (
                        cancelled
                    ) {
                        return;
                    }


                    if (
                        !error
                    ) {

                        const nums =
                            (
                                data ??
                                []
                            )
                                .map(
                                    (
                                        row:
                                            any
                                    ) =>
                                        Number(
                                            row.numero
                                        )
                                )
                                .filter(
                                    (
                                        numero
                                    ) =>
                                        Number
                                            .isFinite(
                                                numero
                                            )
                                );


                        if (
                            nums.length >
                            0
                        ) {

                            setNumeros(
                                nums
                            );


                            setSoftMsg(
                                null
                            );


                            return;
                        }
                    }


                    setSoftMsg(
                        "Preparando tus Experience Pass…"
                    );


                    await new Promise(
                        (
                            resolve
                        ) =>
                            setTimeout(
                                resolve,
                                2000
                            )
                    );
                }
            }


            void cargar();


            return () => {

                cancelled =
                    true;
            };

        },
        [
            pedidoId,
            tx,
        ]
    );


    /* ============================================================
       META PURCHASE
    ============================================================ */

    useEffect(
        () => {

            if (
                purchaseSentRef
                    .current
            ) {
                return;
            }


            if (
                !pedido
            ) {
                return;
            }


            /*
             * Esperamos a que existan números
             * para confirmar que la compra
             * realmente terminó de procesarse.
             */
            if (
                numeros.length ===
                0
            ) {
                return;
            }


            const cantidad =
                Number(
                    pedido
                        .cantidad_numeros ??
                    0
                );


            const precioUnitario =
                Number(
                    sorteo
                        ?.precio_numero ??
                    0
                );


            const total =
                cantidad >
                    0 &&
                    precioUnitario >
                    0

                    ? cantidad *
                    precioUnitario

                    : 0;


            trackPurchase({

                value:
                    total,

                currency:
                    "USD",

                content_name:
                    sorteo
                        ?.titulo ??
                    "Compra Experience Pass Baruk593",

                content_category:
                    "sorteo",

                content_ids: [
                    tx ??
                    String(
                        pedido.id
                    ),
                ],

                content_type:
                    "product",

                num_items:
                    cantidad,
            });


            purchaseSentRef
                .current =
                true;

        },
        [
            pedido,
            sorteo,
            numeros,
            tx,
        ]
    );


    /* ============================================================
       DATOS VISUALES
    ============================================================ */

    const tituloGrande =
        sorteo
            ?.titulo ??
        "Sorteo activo";


    const actividadLabel =
        pedido
            ?.actividad_numero ??
        sorteo
            ?.actividad_numero ??
        "—";

    const isGift =
        pedido?.tipo_compra ===
        "gift";

    const cantidadExperiencePass =
        Number(
            pedido
                ?.cantidad_numeros ??
            numeros.length ??
            0
        );


    const asignacionCompleta =
        numeros.length >
        0;


    /* ============================================================
       RENDER
    ============================================================ */

    return (

        <div
            className="
                min-h-screen
                bg-white
                text-neutral-900
            "
        >

            <div
                className="
                    mx-auto
                    max-w-5xl
                    px-4
                    py-6
                "
            >

                <div
                    className="
                        overflow-hidden
                        rounded-3xl
                        border
                        border-neutral-200
                        bg-white
                    "
                >

                    {/* =================================================
                        HEADER
                    ================================================= */}

                    <div
                        className="
                            px-6
                            pb-5
                            pt-7
                        "
                    >

                        <div
                            className="
                                flex
                                flex-col
                                gap-3

                                md:flex-row
                                md:items-start
                                md:justify-between
                            "
                        >

                            <div
                                className="
                                    flex
                                    items-start
                                    gap-3
                                "
                            >

                                <div
                                    className="
                                        mt-1
                                        inline-flex
                                        h-10
                                        w-10
                                        items-center
                                        justify-center
                                        rounded-2xl
                                        bg-emerald-50
                                        ring-1
                                        ring-emerald-100
                                    "
                                >

                                    <span
                                        className="
                                            text-lg
                                            text-emerald-700
                                        "
                                    >
                                        ✓
                                    </span>

                                </div>


                                <div>

                                    <h1
                                        className="
        text-2xl
        font-extrabold
        tracking-tight
    "
                                    >
                                        {
                                            isGift
                                                ? "¡Tu regalo está listo! 🎁"
                                                : "¡Pago confirmado!"
                                        }
                                    </h1>


                                    <p
                                        className="
        mt-1
        text-sm
        text-neutral-600
    "
                                    >
                                        {
                                            isGift
                                                ? "El pago fue confirmado y las Experience Pass fueron asignadas al destinatario."
                                                : "Tu compra fue procesada correctamente."
                                        }
                                    </p>


                                    <div
                                        className="
                                            mt-3
                                            flex
                                            flex-wrap
                                            items-center
                                            gap-2
                                        "
                                    >

                                        <Chip>
                                            Actividad #{actividadLabel}
                                        </Chip>


                                        {status ? (

                                            <Chip>
                                                PayPhone: {status}
                                            </Chip>

                                        ) : null}


                                        {pedido?.id ? (

                                            <Chip>
                                                Pedido #{pedido.id}
                                            </Chip>

                                        ) : null}

                                    </div>

                                </div>

                            </div>
                        </div>

                        <div
                            className="
                                    flex
                                    flex-wrap
                                    gap-2

                                    md:justify-end
                                "
                        >

                            <div
                                className="
        flex
        flex-wrap
        gap-2

        md:justify-end
    "
                            >

                                {!isGift ? (

                                    <button
                                        type="button"

                                        onClick={
                                            () =>
                                                router.push(
                                                    "/mi-cuenta"
                                                )
                                        }

                                        className="
                rounded-2xl
                bg-black
                px-4
                py-2
                text-sm
                font-semibold
                text-white
                transition

                hover:opacity-90
            "
                                    >
                                        Revelar mis Experience Pass
                                    </button>

                                ) : (

                                    <button
                                        type="button"

                                        onClick={
                                            () =>
                                                router.push(
                                                    "/mi-cuenta"
                                                )
                                        }

                                        className="
                rounded-2xl
                bg-black
                px-4
                py-2
                text-sm
                font-semibold
                text-white
                transition

                hover:opacity-90
            "
                                    >
                                        Ver mis compras
                                    </button>

                                )}


                                <button
                                    type="button"

                                    onClick={
                                        () =>
                                            router.push(
                                                "/"
                                            )
                                    }

                                    className="
            rounded-2xl
            border
            border-neutral-200
            bg-white
            px-4
            py-2
            text-sm
            font-semibold
            transition

            hover:bg-neutral-50
        "
                                >
                                    Volver al inicio
                                </button>

                            </div>

                        </div>

                    </div>


                    <div
                        className="
                            h-px
                            bg-neutral-100
                        "
                    />


                    {/* =================================================
                        BODY
                    ================================================= */}

                    <div
                        className="
                            grid
                            gap-6
                            px-6
                            py-6

                            md:grid-cols-2
                        "
                    >

                        {/* =================================================
                            IZQUIERDA
                        ================================================= */}

                        <div
                            className="
                                space-y-4
                            "
                        >

                            {/* SORTEO */}

                            <div
                                className="
                                    rounded-2xl
                                    border
                                    border-neutral-200
                                    bg-white
                                    p-5
                                "
                            >

                                <div
                                    className="
                                        text-[11px]
                                        font-bold
                                        uppercase
                                        tracking-[0.35em]
                                        text-neutral-500
                                    "
                                >
                                    Premio / Sorteo
                                </div>


                                <h2
                                    className={`
                                        ${anton.className}
                                        mt-3
                                        uppercase
                                        leading-snug

                                        ${tituloGrande.length >
                                            40

                                            ? "text-xl md:text-2xl tracking-[0.06em]"

                                            : "text-2xl md:text-3xl tracking-[0.08em]"
                                        }
                                    `}
                                >
                                    {tituloGrande}
                                </h2>


                                {sorteo?.imagen_url ? (

                                    <img
                                        src={
                                            sorteo
                                                .imagen_url
                                        }

                                        alt={
                                            tituloGrande
                                        }

                                        className="
                                            mt-4
                                            h-44
                                            w-full
                                            rounded-2xl
                                            border
                                            border-neutral-200
                                            object-cover
                                        "
                                    />

                                ) : null}


                                <p
                                    className="
        mt-4
        text-sm
        text-neutral-600
    "
                                >
                                    {
                                        isGift
                                            ? "Las participaciones del destinatario ya están registradas para el sorteo."
                                            : "Tus participaciones ya están registradas para el sorteo."
                                    }
                                </p>

                            </div>


                            {/* DATOS PARTICIPANTE */}

                            <div
                                className="
                                    rounded-2xl
                                    border
                                    border-neutral-200
                                    bg-white
                                    p-5
                                "
                            >

                                <div
                                    className="
        text-[11px]
        font-bold
        uppercase
        tracking-[0.35em]
        text-neutral-500
    "
                                >
                                    {
                                        isGift
                                            ? "Datos de la compra"
                                            : "Datos del participante"
                                    }
                                </div>


                                <div
                                    className="
                                        mt-4
                                        grid
                                        grid-cols-2
                                        gap-3
                                    "
                                >

                                    <FieldLight
                                        label="Nombre"

                                        value={
                                            pedido
                                                ?.nombre ??
                                            "—"
                                        }
                                    />


                                    <FieldLight
                                        label="Teléfono"

                                        value={
                                            pedido
                                                ?.telefono ??
                                            "—"
                                        }
                                    />


                                    <FieldLight
                                        label="Método"

                                        value={
                                            pedido
                                                ?.metodo_pago ??
                                            "PayPhone"
                                        }
                                    />


                                    <FieldLight
                                        label="Estado"

                                        value={
                                            pedido
                                                ?.estado ??
                                            "—"
                                        }
                                    />


                                    <FieldLight
                                        label="Paquete"

                                        value={
                                            pedido
                                                ?.cantidad_numeros

                                                ? `x${pedido.cantidad_numeros}`

                                                : "—"
                                        }
                                    />


                                    <FieldLight
                                        label="Tx"

                                        value={
                                            tx

                                                ? `${tx.slice(
                                                    0,
                                                    10
                                                )}…`

                                                : "—"
                                        }
                                    />

                                </div>

                            </div>

                        </div>


                        {/* =================================================
                            DERECHA
                            EXPERIENCE PASS
                        ================================================= */}

                        <div
                            className="
                                rounded-2xl
                                border
                                border-neutral-200
                                bg-white
                                p-5
                            "
                        >

                            <div
                                className="
                                    flex
                                    items-start
                                    justify-between
                                    gap-3
                                "
                            >

                                <div>

                                    <div
                                        className="
        text-[11px]
        font-bold
        uppercase
        tracking-[0.35em]
        text-neutral-500
    "
                                    >
                                        {
                                            isGift
                                                ? "Tu regalo Baruk593"
                                                : "Tus Experience Pass"
                                        }
                                    </div>


                                    <h3
                                        className="
        mt-2
        text-xl
        font-extrabold
    "
                                    >
                                        {
                                            cantidadExperiencePass >
                                                0

                                                ? isGift

                                                    ? `${cantidadExperiencePass} Experience Pass ${cantidadExperiencePass === 1
                                                        ? "asignada"
                                                        : "asignadas"
                                                    } al destinatario`

                                                    : `${cantidadExperiencePass} Experience Pass ${cantidadExperiencePass === 1
                                                        ? "lista"
                                                        : "listas"
                                                    } para revelar`

                                                : isGift

                                                    ? "Experience Pass asignadas al destinatario"

                                                    : "Experience Pass listas para revelar"
                                        }
                                    </h3>


                                    <p
                                        className="
        mt-2
        text-sm
        leading-6
        text-neutral-600
    "
                                    >
                                        {
                                            isGift
                                                ? "Los números permanecerán ocultos hasta que el destinatario revele sus Experience Pass desde su propia cuenta."
                                                : "Tus números permanecen ocultos hasta que reveles cada Experience Pass en Mi Cuenta."
                                        }
                                    </p>

                                </div>


                                <span
                                    className="
                                        rounded-full
                                        border
                                        border-neutral-200
                                        bg-neutral-50
                                        px-3
                                        py-1
                                        text-xs
                                        font-semibold
                                        text-neutral-700
                                    "
                                >
                                    {
                                        asignacionCompleta

                                            ? "✓ Listas"

                                            : "Preparando…"
                                    }
                                </span>

                            </div>


                            {/* MENSAJE DE PROCESAMIENTO */}

                            {softMsg ? (

                                <div
                                    className="
                                        mt-4
                                        rounded-2xl
                                        border
                                        border-neutral-200
                                        bg-neutral-50
                                        p-3
                                        text-sm
                                        text-neutral-700
                                    "
                                >
                                    {softMsg}
                                </div>

                            ) : null}


                            {/* =================================================
                                BLOQUE DE REVELADO
                            ================================================= */}

                            <div
                                className="
                                    mt-6
                                    rounded-3xl
                                    border
                                    border-neutral-200
                                    bg-neutral-50
                                    p-5
                                "
                            >

                                <div
                                    className="
                                        flex
                                        h-12
                                        w-12
                                        items-center
                                        justify-center
                                        rounded-2xl
                                        bg-black
                                        text-xl
                                        text-white
                                    "
                                >
                                    ✦
                                </div>


                                <h4
                                    className="
        mt-4
        text-lg
        font-extrabold
        text-neutral-900
    "
                                >
                                    {
                                        isGift
                                            ? "La sorpresa ahora es del destinatario"
                                            : "Descubre qué te tocó"
                                    }
                                </h4>


                                <p
                                    className="
        mt-2
        text-sm
        leading-6
        text-neutral-600
    "
                                >
                                    {
                                        isGift
                                            ? "Los números permanecerán ocultos hasta que el destinatario revele sus Experience Pass desde su propia cuenta."
                                            : "Tus números permanecen ocultos hasta que reveles cada Experience Pass en Mi Cuenta."
                                    }
                                </p>


                                <p
                                    className="
        mt-3
        text-sm
        font-semibold
        leading-6
        text-neutral-900
    "
                                >
                                    {
                                        isGift
                                            ? "Si alguna Experience Pass contiene una F1 Sphere o un premio instantáneo, también pertenecerá al destinatario."
                                            : "Además de tu número para el sorteo, una Experience Pass puede sorprenderte con una F1 Sphere o un premio instantáneo."
                                    }
                                </p>


                                {!isGift && (

                                    <button
                                        type="button"

                                        onClick={
                                            () =>
                                                router.push(
                                                    "/mi-cuenta"
                                                )
                                        }

                                        disabled={
                                            loading
                                        }

                                        className="
            mt-6
            w-full
            rounded-2xl
            bg-black
            px-5
            py-3
            text-sm
            font-extrabold
            text-white
            transition

            hover:opacity-90

            disabled:cursor-not-allowed
            disabled:opacity-50
        "
                                    >
                                        {
                                            loading
                                                ? "Preparando Experience Pass…"
                                                : "Revelar mis Experience Pass"
                                        }
                                    </button>

                                )}

                                {isGift && (

                                    <div
                                        className="
            mt-6
            rounded-2xl
            border
            border-emerald-200
            bg-emerald-50
            p-4
        "
                                    >

                                        <p
                                            className="
                text-sm
                font-extrabold
                text-emerald-900
            "
                                        >
                                            ✓ El regalo fue registrado correctamente
                                        </p>


                                        <p
                                            className="
                mt-1
                text-xs
                leading-5
                text-emerald-800
            "
                                        >
                                            Tú realizaste la compra, pero el destinatario
                                            es el propietario de estas Experience Pass y
                                            será quien pueda revelarlas.
                                        </p>

                                    </div>

                                )}

                            </div>


                            {/* GARANTÍAS */}

                            <div
                                className="
                                    mt-5
                                    space-y-3
                                "
                            >

                                <StatusItem
                                    text="Pago confirmado"
                                />


                                <StatusItem
                                    text={
                                        isGift
                                            ? "Regalo registrado"
                                            : "Participación registrada"
                                    }
                                />


                                <StatusItem
                                    text={
                                        asignacionCompleta

                                            ? isGift
                                                ? "Experience Pass asignadas al destinatario"
                                                : "Experience Pass asignadas correctamente"

                                            : "Preparando Experience Pass"
                                    }
                                />


                                <StatusItem
                                    text={
                                        isGift
                                            ? "Números protegidos hasta que el destinatario los revele"
                                            : "Números protegidos hasta el revelado"
                                    }
                                />

                            </div>


                            <p
                                className="
        mt-5
        text-xs
        leading-5
        text-neutral-500
    "
                            >
                                {
                                    isGift
                                        ? "El destinatario podrá descubrir y consultar sus números desde su propia cuenta Baruk593."
                                        : "No necesitas guardar una captura de tus números. Podrás consultarlos después de revelar tus Experience Pass desde Mi Cuenta."
                                }
                            </p>

                        </div>

                    </div>


                    <div
                        className="
                            h-px
                            bg-neutral-100
                        "
                    />


                    <div
                        className="
                            px-6
                            py-4
                            text-xs
                            text-neutral-500
                        "
                    >
                        Si necesitas soporte, conserva tu número de pedido.
                    </div>

                </div>

            </div>

        </div>
    );
}


/* ============================================================
   COMPONENTES
============================================================ */

function Chip({
    children,
}: {
    children:
    React.ReactNode;
}) {

    return (

        <span
            className="
                inline-flex
                items-center
                rounded-full
                border
                border-neutral-200
                bg-neutral-50
                px-3
                py-1
                text-xs
                font-semibold
                text-neutral-700
            "
        >
            {children}
        </span>
    );
}


function FieldLight({
    label,
    value,
}: {
    label:
    string;

    value:
    string;
}) {

    return (

        <div
            className="
                rounded-2xl
                border
                border-neutral-200
                bg-neutral-50
                p-3
            "
        >

            <div
                className="
                    text-[11px]
                    font-bold
                    uppercase
                    tracking-[0.30em]
                    text-neutral-500
                "
            >
                {label}
            </div>


            <div
                className="
                    mt-1
                    break-words
                    text-sm
                    font-extrabold
                    text-neutral-900
                "
            >
                {value}
            </div>

        </div>
    );
}


function StatusItem({
    text,
}: {
    text:
    string;
}) {

    return (

        <div
            className="
                flex
                items-center
                gap-3
            "
        >

            <span
                className="
                    inline-flex
                    h-6
                    w-6
                    shrink-0
                    items-center
                    justify-center
                    rounded-full
                    bg-emerald-50
                    text-xs
                    font-black
                    text-emerald-700
                    ring-1
                    ring-emerald-100
                "
            >
                ✓
            </span>


            <span
                className="
                    text-sm
                    font-medium
                    text-neutral-700
                "
            >
                {text}
            </span>

        </div>
    );
}