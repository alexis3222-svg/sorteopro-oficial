// app/admin/premios/coleccion/page.tsx

"use client";

import {
    useEffect,
    useState,
} from "react";

import Link from "next/link";

import {
    supabaseBrowser,
} from "@/lib/supabaseClient";


type Reward = {
    id: string;

    sorteoId:
    string;

    collectionKey:
    string;

    name:
    string;

    description:
    string;

    type:
    string;

    requiredSpheres:
    number;

    stockTotal:
    number;

    stockClaimed:
    number;

    stockRemaining:
    number;

    active:
    boolean;

    createdAt?:
    string | null;

    updatedAt?:
    string | null;
};


type ApiResponse = {
    ok: boolean;

    reward?:
    Reward;

    error?:
    string;
};


type FormState = {
    name:
    string;

    description:
    string;

    type:
    string;

    requiredSpheres:
    number;

    stockTotal:
    number;

    active:
    boolean;
};


const INITIAL_FORM:
    FormState = {

    name:
        "",

    description:
        "",

    type:
        "physical",

    requiredSpheres:
        11,

    stockTotal:
        0,

    active:
        true,
};


function formatDate(
    value:
        | string
        | null
        | undefined
) {

    if (!value) {
        return "—";
    }


    const date =
        new Date(
            value
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return value;
    }


    return date.toLocaleString(
        "es-EC",
        {
            dateStyle:
                "short",

            timeStyle:
                "short",
        }
    );
}


export default function AdminCollectionRewardPage() {

    const [
        loading,
        setLoading,
    ] =
        useState(
            true
        );


    const [
        saving,
        setSaving,
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


    const [
        success,
        setSuccess,
    ] =
        useState<
            string | null
        >(
            null
        );


    const [
        reward,
        setReward,
    ] =
        useState<
            Reward | null
        >(
            null
        );


    const [
        form,
        setForm,
    ] =
        useState<FormState>(
            INITIAL_FORM
        );


    /*
     * =========================================================
     * TOKEN ADMIN
     * =========================================================
     */

    async function getAccessToken() {

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

            throw new Error(
                "No existe una sesión administrativa activa."
            );
        }


        return session
            .access_token;
    }


    /*
     * =========================================================
     * CARGAR CONFIGURACIÓN
     * =========================================================
     */

    async function loadReward() {

        setLoading(
            true
        );

        setError(
            null
        );


        try {

            const accessToken =
                await getAccessToken();


            const response =
                await fetch(
                    "/api/admin/premios/coleccion",
                    {
                        method:
                            "GET",

                        headers: {
                            Authorization:
                                `Bearer ${accessToken}`,
                        },

                        cache:
                            "no-store",
                    }
                );


            const data =
                (
                    await response
                        .json()
                ) as ApiResponse;


            if (
                !response.ok ||
                !data.ok ||
                !data.reward
            ) {

                throw new Error(
                    data.error ??
                    "No se pudo cargar la configuración."
                );
            }


            const nextReward =
                data.reward;


            setReward(
                nextReward
            );


            setForm({

                name:
                    nextReward
                        .name,

                description:
                    nextReward
                        .description ??
                    "",

                type:
                    nextReward
                        .type,

                requiredSpheres:
                    nextReward
                        .requiredSpheres,

                stockTotal:
                    nextReward
                        .stockTotal,

                active:
                    nextReward
                        .active,
            });

        } catch (
        err:
            unknown
        ) {

            setError(
                err instanceof
                    Error
                    ? err.message
                    : "No se pudo cargar la configuración."
            );

        } finally {

            setLoading(
                false
            );
        }
    }


    /*
     * =========================================================
     * GUARDAR
     * =========================================================
     */

    async function saveReward() {

        if (
            saving
        ) {
            return;
        }


        setError(
            null
        );

        setSuccess(
            null
        );


        if (
            !form
                .name
                .trim()
        ) {

            setError(
                "Ingresa el nombre del premio."
            );

            return;
        }


        if (
            !Number
                .isInteger(
                    form.stockTotal
                ) ||
            form.stockTotal <
            0
        ) {

            setError(
                "La cantidad de premios debe ser un número entero válido."
            );

            return;
        }


        if (
            reward &&
            form.stockTotal <
            reward.stockClaimed
        ) {

            setError(
                `No puedes reducir la cantidad a ${form.stockTotal} porque ya existen ${reward.stockClaimed} premios reclamados.`
            );

            return;
        }


        setSaving(
            true
        );


        try {

            const accessToken =
                await getAccessToken();


            const response =
                await fetch(
                    "/api/admin/premios/coleccion",
                    {
                        method:
                            "PATCH",

                        headers: {

                            Authorization:
                                `Bearer ${accessToken}`,

                            "Content-Type":
                                "application/json",
                        },

                        body:
                            JSON.stringify({

                                name:
                                    form.name,

                                description:
                                    form.description,

                                type:
                                    form.type,

                                requiredSpheres:
                                    form.requiredSpheres,

                                stockTotal:
                                    form.stockTotal,

                                active:
                                    form.active,
                            }),
                    }
                );


            const data =
                (
                    await response
                        .json()
                ) as ApiResponse;


            if (
                !response.ok ||
                !data.ok ||
                !data.reward
            ) {

                throw new Error(
                    data.error ??
                    "No se pudo guardar la configuración."
                );
            }


            setReward(
                data.reward
            );


            setForm({

                name:
                    data
                        .reward
                        .name,

                description:
                    data
                        .reward
                        .description ??
                    "",

                type:
                    data
                        .reward
                        .type,

                requiredSpheres:
                    data
                        .reward
                        .requiredSpheres,

                stockTotal:
                    data
                        .reward
                        .stockTotal,

                active:
                    data
                        .reward
                        .active,
            });


            setSuccess(
                "Configuración guardada correctamente."
            );

        } catch (
        err:
            unknown
        ) {

            setError(
                err instanceof
                    Error
                    ? err.message
                    : "No se pudo guardar la configuración."
            );

        } finally {

            setSaving(
                false
            );
        }
    }


    /*
     * =========================================================
     * CARGA INICIAL
     * =========================================================
     */

    useEffect(
        () => {

            loadReward();

        },
        []
    );


    const previewStockRemaining =
        reward
            ? Math.max(
                0,

                Number(
                    form.stockTotal
                ) -
                Number(
                    reward.stockClaimed
                )
            )
            : 0;


    return (

        <main
            className="
                min-h-screen
                bg-[#050608]
                text-slate-50
            "
        >

            <div
                className="
                    mx-auto
                    max-w-6xl
                    space-y-8
                    px-4
                    py-8

                    md:py-12
                "
            >

                {/* =================================================
                    ENCABEZADO
                ================================================= */}

                <header
                    className="
                        flex
                        flex-col
                        gap-5

                        lg:flex-row
                        lg:items-end
                        lg:justify-between
                    "
                >

                    <div>

                        <p
                            className="
                                text-xs
                                font-semibold
                                uppercase
                                tracking-[0.22em]
                                text-orange-400
                            "
                        >
                            Baruk593 • Admin
                        </p>


                        <h1
                            className="
                                mt-2
                                text-3xl
                                font-extrabold
                                tracking-wide

                                md:text-4xl
                            "
                        >
                            Configurar F1 Collection
                        </h1>


                        <p
                            className="
                                mt-3
                                max-w-2xl
                                text-sm
                                leading-6
                                text-slate-400
                            "
                        >
                            Configura el premio especial que recibe
                            un usuario al completar las 11 F1 Spheres
                            diferentes.
                        </p>

                    </div>


                    <div
                        className="
                            flex
                            flex-wrap
                            gap-2
                        "
                    >

                        <button
                            type="button"

                            onClick={
                                loadReward
                            }

                            disabled={
                                loading
                            }

                            className="
                                rounded-full
                                border
                                border-slate-700
                                bg-slate-900
                                px-4
                                py-2
                                text-xs
                                font-semibold
                                text-slate-100
                                transition

                                hover:border-orange-500
                                hover:text-orange-200

                                disabled:opacity-50
                            "
                        >
                            Actualizar
                        </button>


                        <Link
                            href="/admin/premios"

                            className="
                                rounded-full
                                border
                                border-orange-500/60
                                bg-orange-500/10
                                px-4
                                py-2
                                text-xs
                                font-semibold
                                text-orange-200
                                transition

                                hover:bg-orange-500/20
                            "
                        >
                            ← Premios Baruk
                        </Link>

                    </div>

                </header>


                {/* =================================================
                    MENSAJES
                ================================================= */}

                {error && (

                    <div
                        className="
                            rounded-xl
                            border
                            border-red-500/40
                            bg-red-500/10
                            px-4
                            py-3
                            text-sm
                            text-red-200
                        "
                    >
                        {error}
                    </div>

                )}


                {success && (

                    <div
                        className="
                            rounded-xl
                            border
                            border-emerald-500/40
                            bg-emerald-500/10
                            px-4
                            py-3
                            text-sm
                            font-semibold
                            text-emerald-200
                        "
                    >
                        ✓ {success}
                    </div>

                )}


                {/* =================================================
                    CARGANDO
                ================================================= */}

                {loading ? (

                    <div
                        className="
                            flex
                            items-center
                            justify-center
                            py-24
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
                                    h-10
                                    w-10
                                    animate-spin
                                    rounded-full
                                    border-4
                                    border-slate-700
                                    border-t-orange-500
                                "
                            />


                            <p
                                className="
                                    mt-4
                                    text-sm
                                    text-slate-400
                                "
                            >
                                Cargando configuración...
                            </p>

                        </div>

                    </div>

                ) : (

                    <>

                        {/* =================================================
                            RESUMEN
                        ================================================= */}

                        {reward && (

                            <section
                                className="
                                    grid
                                    gap-4

                                    sm:grid-cols-2
                                    lg:grid-cols-4
                                "
                            >

                                <div
                                    className="
                                        rounded-2xl
                                        border
                                        border-slate-800
                                        bg-slate-900/70
                                        p-5
                                    "
                                >

                                    <p
                                        className="
                                            text-xs
                                            font-semibold
                                            uppercase
                                            tracking-wider
                                            text-slate-400
                                        "
                                    >
                                        Premios configurados
                                    </p>


                                    <p
                                        className="
                                            mt-3
                                            text-3xl
                                            font-black
                                            text-white
                                        "
                                    >
                                        {form.stockTotal}
                                    </p>

                                </div>


                                <div
                                    className="
                                        rounded-2xl
                                        border
                                        border-blue-500/30
                                        bg-blue-500/10
                                        p-5
                                    "
                                >

                                    <p
                                        className="
                                            text-xs
                                            font-semibold
                                            uppercase
                                            tracking-wider
                                            text-blue-200
                                        "
                                    >
                                        Reclamados
                                    </p>


                                    <p
                                        className="
                                            mt-3
                                            text-3xl
                                            font-black
                                            text-blue-300
                                        "
                                    >
                                        {reward.stockClaimed}
                                    </p>

                                </div>


                                <div
                                    className="
                                        rounded-2xl
                                        border
                                        border-orange-500/30
                                        bg-orange-500/10
                                        p-5
                                    "
                                >

                                    <p
                                        className="
                                            text-xs
                                            font-semibold
                                            uppercase
                                            tracking-wider
                                            text-orange-200
                                        "
                                    >
                                        Disponibles
                                    </p>


                                    <p
                                        className="
                                            mt-3
                                            text-3xl
                                            font-black
                                            text-orange-300
                                        "
                                    >
                                        {previewStockRemaining}
                                    </p>

                                </div>


                                <div
                                    className={`
                                        rounded-2xl
                                        border
                                        p-5

                                        ${form.active
                                            ? "border-emerald-500/30 bg-emerald-500/10"
                                            : "border-red-500/30 bg-red-500/10"
                                        }
                                    `}
                                >

                                    <p
                                        className="
                                            text-xs
                                            font-semibold
                                            uppercase
                                            tracking-wider
                                            text-slate-300
                                        "
                                    >
                                        Estado
                                    </p>


                                    <p
                                        className={`
                                            mt-3
                                            text-xl
                                            font-black

                                            ${form.active
                                                ? "text-emerald-300"
                                                : "text-red-300"
                                            }
                                        `}
                                    >
                                        {
                                            form.active
                                                ? "ACTIVO"
                                                : "INACTIVO"
                                        }
                                    </p>

                                </div>

                            </section>

                        )}


                        {/* =================================================
                            FORMULARIO
                        ================================================= */}

                        <section
                            className="
                                overflow-hidden
                                rounded-3xl
                                border
                                border-slate-800
                                bg-slate-900/70
                            "
                        >

                            <div
                                className="
                                    h-1
                                    bg-gradient-to-r
                                    from-orange-500
                                    to-orange-300
                                "
                            />


                            <div
                                className="
                                    p-5

                                    md:p-8
                                "
                            >

                                <div
                                    className="
                                        flex
                                        flex-col
                                        gap-2

                                        sm:flex-row
                                        sm:items-start
                                        sm:justify-between
                                    "
                                >

                                    <div>

                                        <p
                                            className="
                                                text-xs
                                                font-black
                                                uppercase
                                                tracking-[0.2em]
                                                text-orange-400
                                            "
                                        >
                                            F1 Sphere Collection · 2026
                                        </p>


                                        <h2
                                            className="
                                                mt-2
                                                text-2xl
                                                font-black
                                                text-white
                                            "
                                        >
                                            Premio de colección
                                        </h2>

                                    </div>


                                    <span
                                        className="
                                            inline-flex
                                            w-fit
                                            rounded-full
                                            border
                                            border-slate-700
                                            bg-slate-950
                                            px-3
                                            py-1.5
                                            text-[10px]
                                            font-black
                                            uppercase
                                            tracking-wider
                                            text-slate-300
                                        "
                                    >
                                        11 escuderías
                                    </span>

                                </div>


                                <div
                                    className="
                                        mt-8
                                        grid
                                        gap-6

                                        lg:grid-cols-2
                                    "
                                >

                                    {/* NOMBRE */}

                                    <div
                                        className="
                                            lg:col-span-2
                                        "
                                    >

                                        <label
                                            className="
                                                text-xs
                                                font-bold
                                                uppercase
                                                tracking-wider
                                                text-slate-400
                                            "
                                        >
                                            Nombre del premio
                                        </label>


                                        <input
                                            type="text"

                                            value={
                                                form.name
                                            }

                                            onChange={(
                                                event
                                            ) =>
                                                setForm(
                                                    (
                                                        current
                                                    ) => ({
                                                        ...current,

                                                        name:
                                                            event
                                                                .target
                                                                .value,
                                                    })
                                                )
                                            }

                                            placeholder="Ej.: iPhone 17 Pro Max 256 GB"

                                            className="
                                                mt-2
                                                w-full
                                                rounded-xl
                                                border
                                                border-slate-700
                                                bg-slate-950
                                                px-4
                                                py-3
                                                text-sm
                                                text-white
                                                outline-none

                                                placeholder:text-slate-600

                                                focus:border-orange-500
                                            "
                                        />

                                    </div>


                                    {/* DESCRIPCIÓN */}

                                    <div
                                        className="
                                            lg:col-span-2
                                        "
                                    >

                                        <label
                                            className="
                                                text-xs
                                                font-bold
                                                uppercase
                                                tracking-wider
                                                text-slate-400
                                            "
                                        >
                                            Descripción
                                        </label>


                                        <textarea
                                            rows={
                                                4
                                            }

                                            value={
                                                form.description
                                            }

                                            onChange={(
                                                event
                                            ) =>
                                                setForm(
                                                    (
                                                        current
                                                    ) => ({
                                                        ...current,

                                                        description:
                                                            event
                                                                .target
                                                                .value,
                                                    })
                                                )
                                            }

                                            placeholder="Describe el premio que recibirá quien complete la colección."

                                            className="
                                                mt-2
                                                w-full
                                                resize-y
                                                rounded-xl
                                                border
                                                border-slate-700
                                                bg-slate-950
                                                px-4
                                                py-3
                                                text-sm
                                                leading-6
                                                text-white
                                                outline-none

                                                placeholder:text-slate-600

                                                focus:border-orange-500
                                            "
                                        />

                                    </div>


                                    {/* TIPO */}

                                    <div>

                                        <label
                                            className="
                                                text-xs
                                                font-bold
                                                uppercase
                                                tracking-wider
                                                text-slate-400
                                            "
                                        >
                                            Tipo de premio
                                        </label>


                                        <select
                                            value={
                                                form.type
                                            }

                                            onChange={(
                                                event
                                            ) =>
                                                setForm(
                                                    (
                                                        current
                                                    ) => ({
                                                        ...current,

                                                        type:
                                                            event
                                                                .target
                                                                .value,
                                                    })
                                                )
                                            }

                                            className="
                                                mt-2
                                                w-full
                                                rounded-xl
                                                border
                                                border-slate-700
                                                bg-slate-950
                                                px-4
                                                py-3
                                                text-sm
                                                font-semibold
                                                text-white
                                                outline-none

                                                focus:border-orange-500
                                            "
                                        >

                                            <option
                                                value="physical"
                                            >
                                                Premio físico
                                            </option>

                                            <option
                                                value="experience"
                                            >
                                                Experiencia
                                            </option>

                                            <option
                                                value="cash"
                                            >
                                                Premio en efectivo
                                            </option>

                                            <option
                                                value="digital"
                                            >
                                                Premio digital
                                            </option>

                                        </select>

                                    </div>


                                    {/* ESFERAS */}

                                    <div>

                                        <label
                                            className="
                                                text-xs
                                                font-bold
                                                uppercase
                                                tracking-wider
                                                text-slate-400
                                            "
                                        >
                                            Esferas diferentes requeridas
                                        </label>


                                        <input
                                            type="number"

                                            value={
                                                form.requiredSpheres
                                            }

                                            readOnly

                                            className="
                                                mt-2
                                                w-full
                                                cursor-not-allowed
                                                rounded-xl
                                                border
                                                border-slate-800
                                                bg-black/30
                                                px-4
                                                py-3
                                                text-sm
                                                font-black
                                                text-slate-400
                                                outline-none
                                            "
                                        />


                                        <p
                                            className="
                                                mt-2
                                                text-[11px]
                                                leading-5
                                                text-slate-500
                                            "
                                        >
                                            La colección F1 2026 está formada por
                                            11 escuderías, por eso este valor está protegido.
                                        </p>

                                    </div>


                                    {/* STOCK TOTAL */}

                                    <div>

                                        <label
                                            className="
                                                text-xs
                                                font-bold
                                                uppercase
                                                tracking-wider
                                                text-slate-400
                                            "
                                        >
                                            Cantidad total de premios
                                        </label>


                                        <input
                                            type="number"

                                            min={
                                                reward
                                                    ?.stockClaimed ??
                                                0
                                            }

                                            step="1"

                                            value={
                                                form.stockTotal
                                            }

                                            onChange={(
                                                event
                                            ) => {

                                                const value =
                                                    Number(
                                                        event
                                                            .target
                                                            .value
                                                    );


                                                setForm(
                                                    (
                                                        current
                                                    ) => ({
                                                        ...current,

                                                        stockTotal:
                                                            Number
                                                                .isFinite(
                                                                    value
                                                                )
                                                                ? value
                                                                : 0,
                                                    })
                                                );
                                            }}

                                            className="
                                                mt-2
                                                w-full
                                                rounded-xl
                                                border
                                                border-slate-700
                                                bg-slate-950
                                                px-4
                                                py-3
                                                text-sm
                                                font-black
                                                text-white
                                                outline-none

                                                focus:border-orange-500
                                            "
                                        />


                                        <p
                                            className="
                                                mt-2
                                                text-[11px]
                                                leading-5
                                                text-slate-500
                                            "
                                        >
                                            No puede ser menor a la cantidad
                                            de premios que ya fueron reclamados.
                                        </p>

                                    </div>


                                    {/* RECLAMADOS */}

                                    <div>

                                        <label
                                            className="
                                                text-xs
                                                font-bold
                                                uppercase
                                                tracking-wider
                                                text-slate-400
                                            "
                                        >
                                            Premios ya reclamados
                                        </label>


                                        <div
                                            className="
                                                mt-2
                                                rounded-xl
                                                border
                                                border-slate-800
                                                bg-black/30
                                                px-4
                                                py-3
                                                text-sm
                                                font-black
                                                text-slate-300
                                            "
                                        >
                                            {
                                                reward
                                                    ?.stockClaimed ??
                                                0
                                            }
                                        </div>


                                        <p
                                            className="
                                                mt-2
                                                text-[11px]
                                                leading-5
                                                text-slate-500
                                            "
                                        >
                                            Este valor lo controla automáticamente
                                            Baruk593 y no puede editarse manualmente.
                                        </p>

                                    </div>

                                </div>


                                {/* =================================================
                                    ACTIVO / INACTIVO
                                ================================================= */}

                                <div
                                    className="
                                        mt-8
                                        rounded-2xl
                                        border
                                        border-slate-800
                                        bg-black/20
                                        p-5
                                    "
                                >

                                    <div
                                        className="
                                            flex
                                            flex-col
                                            gap-4

                                            sm:flex-row
                                            sm:items-center
                                            sm:justify-between
                                        "
                                    >

                                        <div>

                                            <p
                                                className="
                                                    text-sm
                                                    font-black
                                                    text-white
                                                "
                                            >
                                                Estado de la colección
                                            </p>


                                            <p
                                                className="
                                                    mt-1
                                                    max-w-xl
                                                    text-xs
                                                    leading-5
                                                    text-slate-500
                                                "
                                            >
                                                Si la desactivas, los usuarios no
                                                podrán reclamar el premio hasta que
                                                vuelvas a activarla.
                                            </p>

                                        </div>


                                        <button
                                            type="button"

                                            onClick={
                                                () =>
                                                    setForm(
                                                        (
                                                            current
                                                        ) => ({
                                                            ...current,

                                                            active:
                                                                !current
                                                                    .active,
                                                        })
                                                    )
                                            }

                                            className={`
                                                relative
                                                h-8
                                                w-16
                                                rounded-full
                                                transition

                                                ${form.active
                                                    ? "bg-emerald-500"
                                                    : "bg-slate-700"
                                                }
                                            `}
                                        >

                                            <span
                                                className={`
                                                    absolute
                                                    top-1
                                                    h-6
                                                    w-6
                                                    rounded-full
                                                    bg-white
                                                    shadow
                                                    transition-all

                                                    ${form.active
                                                        ? "left-9"
                                                        : "left-1"
                                                    }
                                                `}
                                            />

                                        </button>

                                    </div>

                                </div>


                                {/* =================================================
                                    INFORMACIÓN DE CONTROL
                                ================================================= */}

                                {reward && (

                                    <div
                                        className="
                                            mt-6
                                            grid
                                            gap-3

                                            sm:grid-cols-3
                                        "
                                    >

                                        <div
                                            className="
                                                rounded-xl
                                                bg-slate-950/70
                                                p-4
                                            "
                                        >

                                            <p
                                                className="
                                                    text-[10px]
                                                    font-bold
                                                    uppercase
                                                    tracking-wider
                                                    text-slate-500
                                                "
                                            >
                                                Reclamados
                                            </p>


                                            <p
                                                className="
                                                    mt-2
                                                    text-lg
                                                    font-black
                                                    text-white
                                                "
                                            >
                                                {
                                                    reward
                                                        .stockClaimed
                                                }
                                            </p>

                                        </div>


                                        <div
                                            className="
                                                rounded-xl
                                                bg-slate-950/70
                                                p-4
                                            "
                                        >

                                            <p
                                                className="
                                                    text-[10px]
                                                    font-bold
                                                    uppercase
                                                    tracking-wider
                                                    text-slate-500
                                                "
                                            >
                                                Disponibles
                                            </p>


                                            <p
                                                className="
                                                    mt-2
                                                    text-lg
                                                    font-black
                                                    text-orange-300
                                                "
                                            >
                                                {
                                                    previewStockRemaining
                                                }
                                            </p>

                                        </div>


                                        <div
                                            className="
                                                rounded-xl
                                                bg-slate-950/70
                                                p-4
                                            "
                                        >

                                            <p
                                                className="
                                                    text-[10px]
                                                    font-bold
                                                    uppercase
                                                    tracking-wider
                                                    text-slate-500
                                                "
                                            >
                                                Última actualización
                                            </p>


                                            <p
                                                className="
                                                    mt-2
                                                    text-xs
                                                    font-semibold
                                                    text-slate-300
                                                "
                                            >
                                                {
                                                    formatDate(
                                                        reward
                                                            .updatedAt
                                                    )
                                                }
                                            </p>

                                        </div>

                                    </div>

                                )}


                                {/* =================================================
                                    GUARDAR
                                ================================================= */}

                                <div
                                    className="
                                        mt-8
                                        flex
                                        flex-col
                                        gap-3
                                        border-t
                                        border-slate-800
                                        pt-6

                                        sm:flex-row
                                        sm:items-center
                                        sm:justify-between
                                    "
                                >

                                    <p
                                        className="
                                            max-w-xl
                                            text-[11px]
                                            leading-5
                                            text-slate-500
                                        "
                                    >
                                        Los cambios afectan la configuración
                                        del premio F1 Sphere Collection.
                                        Los reclamos ya realizados no se modifican.
                                    </p>


                                    <button
                                        type="button"

                                        onClick={
                                            saveReward
                                        }

                                        disabled={
                                            saving
                                        }

                                        className="
                                            rounded-xl
                                            bg-orange-500
                                            px-6
                                            py-3
                                            text-sm
                                            font-black
                                            text-black
                                            transition

                                            hover:bg-orange-400

                                            disabled:cursor-not-allowed
                                            disabled:opacity-50
                                        "
                                    >
                                        {
                                            saving
                                                ? "Guardando..."
                                                : "Guardar configuración"
                                        }
                                    </button>

                                </div>

                            </div>

                        </section>

                    </>

                )}

            </div>

        </main>
    );
}