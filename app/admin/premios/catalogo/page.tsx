// app/admin/premios/catalogo/page.tsx

"use client";

import {
    useEffect,
    useMemo,
    useState,
} from "react";

import type {
    ChangeEvent,
} from "react";

import Link from "next/link";

import {
    supabaseBrowser,
} from "@/lib/supabaseClient";


type Sorteo = {
    id: string;
    activityNumber: number;
    name: string;
    status: string | null;
    totalNumbers: number;
    createdAt: string | null;
};


type Prize = {
    id: string;
    sorteoId: string;

    name: string;
    description: string;

    type: string;

    imageUrl: string;

    cardQuantity: number;

    referenceValue: number;

    weight: number;

    stockTotal: number;
    stockAssigned: number;
    stockScheduled: number;
    stockRemaining: number;

    claimInstructions: string;

    active: boolean;

    startAt: string | null;
    endAt: string | null;

    createdAt: string | null;
    updatedAt: string | null;
};


type ApiResponse = {
    ok: boolean;

    sorteos?: Sorteo[];

    prizes?: Prize[];

    prizeId?: string;

    error?: string;
};


type FormState = {
    prizeId: string | null;

    sorteoId: string;

    name: string;

    description: string;

    type: string;

    imageUrl: string;

    cardQuantity: number;

    referenceValue: number;

    weight: number;

    stockTotal: number;

    claimInstructions: string;

    active: boolean;
};


const EMPTY_FORM: FormState = {

    prizeId:
        null,

    sorteoId:
        "",

    name:
        "",

    description:
        "",

    type:
        "physical",

    imageUrl:
        "",

    cardQuantity:
        0,

    referenceValue:
        0,

    weight:
        1,

    stockTotal:
        1,

    claimInstructions:
        "",

    active:
        true,
};


function typeLabel(
    type: string
) {

    switch (
    type
    ) {

        case "physical":
            return "Premio físico";

        case "experience":
            return "Experiencia";

        case "cash":
            return "Efectivo";

        case "digital":
            return "Digital";

        case "digital_cards":
            return "Tarjetas de la Suerte";

        default:
            return type;
    }
}


function formatMoney(
    value: number
) {

    return new Intl
        .NumberFormat(
            "es-EC",
            {
                style:
                    "currency",

                currency:
                    "USD",
            }
        )
        .format(
            Number(
                value ??
                0
            )
        );
}


export default function AdminPrizeCatalogPage() {

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
        sorteos,
        setSorteos,
    ] =
        useState<
            Sorteo[]
        >(
            []
        );


    const [
        prizes,
        setPrizes,
    ] =
        useState<
            Prize[]
        >(
            []
        );


    const [
        selectedSorteoId,
        setSelectedSorteoId,
    ] =
        useState(
            ""
        );


    const [
        showForm,
        setShowForm,
    ] =
        useState(
            false
        );


    const [
        form,
        setForm,
    ] =
        useState<FormState>(
            EMPTY_FORM
        );


    const [
        imageFile,
        setImageFile,
    ] =
        useState<File | null>(
            null
        );


    const [
        imagePreview,
        setImagePreview,
    ] =
        useState<string | null>(
            null
        );


    const [
        removeImage,
        setRemoveImage,
    ] =
        useState(
            false
        );


    const [
        imageError,
        setImageError,
    ] =
        useState(
            false
        );


    const imageShown =
        imagePreview ??
        (
            !removeImage
                ? form.imageUrl
                : ""
        );


    useEffect(
        () => {

            return () => {

                if (
                    imagePreview
                ) {

                    URL.revokeObjectURL(
                        imagePreview
                    );
                }
            };

        },
        [
            imagePreview,
        ]
    );


    function selectImage(
        event:
            ChangeEvent<HTMLInputElement>
    ) {

        const file =
            event.target.files?.[0] ??
            null;


        setImageFile(
            file
        );

        setRemoveImage(
            false
        );

        setImageError(
            false
        );


        if (
            file
        ) {

            setImagePreview(
                URL.createObjectURL(
                    file
                )
            );

        } else {

            setImagePreview(
                null
            );
        }
    }


    function clearImage() {

        setImageFile(
            null
        );

        setImagePreview(
            null
        );

        setRemoveImage(
            true
        );

        setImageError(
            false
        );
    }


    function resetImageEditor() {

        setImageFile(
            null
        );

        setImagePreview(
            null
        );

        setRemoveImage(
            false
        );

        setImageError(
            false
        );
    }


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


        if (
            !sessionData
                .session
        ) {

            throw new Error(
                "No existe una sesión administrativa activa."
            );
        }


        return sessionData
            .session
            .access_token;
    }


    /*
     * =========================================================
     * CARGAR
     * =========================================================
     */

    async function loadCatalog() {

        setLoading(
            true
        );

        setError(
            null
        );


        try {

            const token =
                await getAccessToken();


            const response =
                await fetch(
                    "/api/admin/premios/catalogo",
                    {
                        method:
                            "GET",

                        headers: {
                            Authorization:
                                `Bearer ${token}`,
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
                !data.ok
            ) {

                throw new Error(
                    data.error ??
                    "No se pudo cargar el catálogo."
                );
            }


            const nextSorteos =
                data.sorteos ??
                [];


            const nextPrizes =
                data.prizes ??
                [];


            setSorteos(
                nextSorteos
            );


            setPrizes(
                nextPrizes
            );


            if (
                !selectedSorteoId &&
                nextSorteos.length >
                0
            ) {

                setSelectedSorteoId(
                    nextSorteos[0].id
                );
            }

        } catch (
        err:
            unknown
        ) {

            setError(
                err instanceof Error
                    ? err.message
                    : "No se pudo cargar el catálogo."
            );

        } finally {

            setLoading(
                false
            );
        }
    }


    useEffect(
        () => {

            loadCatalog();

        },
        []
    );


    /*
     * =========================================================
     * FILTRAR POR ACTIVIDAD
     * =========================================================
     */

    const filteredPrizes =
        useMemo(
            () => {

                if (
                    !selectedSorteoId
                ) {

                    return prizes;
                }


                return prizes.filter(
                    (
                        prize
                    ) =>
                        prize.sorteoId ===
                        selectedSorteoId
                );

            },
            [
                prizes,
                selectedSorteoId,
            ]
        );


    /*
     * =========================================================
     * NUEVO PREMIO
     * =========================================================
     */

    function openCreateForm() {

        setError(
            null
        );

        setSuccess(
            null
        );


        resetImageEditor();


        setForm({
            ...EMPTY_FORM,

            sorteoId:
                selectedSorteoId ||
                sorteos[0]?.id ||
                "",
        });


        setShowForm(
            true
        );
    }


    /*
     * =========================================================
     * EDITAR PREMIO
     * =========================================================
     */

    function openEditForm(
        prize: Prize
    ) {

        setError(
            null
        );

        setSuccess(
            null
        );


        resetImageEditor();


        setForm({

            prizeId:
                prize.id,

            sorteoId:
                prize.sorteoId,

            name:
                prize.name,

            description:
                prize.description,

            type:
                prize.type,

            imageUrl:
                prize.imageUrl,

            cardQuantity:
                prize.cardQuantity,

            referenceValue:
                prize.referenceValue,

            weight:
                prize.weight,

            stockTotal:
                prize.stockTotal,

            claimInstructions:
                prize.claimInstructions,

            active:
                prize.active,
        });


        setShowForm(
            true
        );


        window.scrollTo({
            top:
                0,

            behavior:
                "smooth",
        });
    }


    /*
     * =========================================================
     * GUARDAR
     * =========================================================
     */

    async function savePrize() {

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
            !form.sorteoId
        ) {

            setError(
                "Selecciona una actividad."
            );

            return;
        }


        if (
            !form.name.trim()
        ) {

            setError(
                "Ingresa el nombre del premio."
            );

            return;
        }


        if (
            !Number.isInteger(
                form.stockTotal
            ) ||
            form.stockTotal <
            0
        ) {

            setError(
                "El stock debe ser un número entero válido."
            );

            return;
        }


        if (
            form.type ===
            "cash" &&
            form.referenceValue <=
            0
        ) {

            setError(
                "El premio en efectivo debe tener un valor mayor a $0."
            );

            return;
        }


        if (
            form.type ===
            "digital_cards" &&
            form.cardQuantity <=
            0
        ) {

            setError(
                "Indica cuántas Tarjetas entrega el premio."
            );

            return;
        }


        setSaving(
            true
        );


        try {

            const token =
                await getAccessToken();


            const isEditing =
                Boolean(
                    form.prizeId
                );


            const formData =
                new FormData();


            if (
                form.prizeId
            ) {

                formData.set(
                    "prizeId",
                    form.prizeId
                );
            }


            formData.set(
                "sorteoId",
                form.sorteoId
            );

            formData.set(
                "name",
                form.name
            );

            formData.set(
                "description",
                form.description
            );

            formData.set(
                "type",
                form.type
            );

            formData.set(
                "cardQuantity",
                String(
                    form.cardQuantity
                )
            );

            formData.set(
                "referenceValue",
                String(
                    form.referenceValue
                )
            );

            formData.set(
                "weight",
                String(
                    form.weight
                )
            );

            formData.set(
                "stockTotal",
                String(
                    form.stockTotal
                )
            );

            formData.set(
                "claimInstructions",
                form.claimInstructions
            );

            formData.set(
                "active",
                String(
                    form.active
                )
            );

            formData.set(
                "removeImage",
                String(
                    removeImage
                )
            );


            if (
                imageFile
            ) {

                formData.set(
                    "image",
                    imageFile
                );
            }


            const response =
                await fetch(
                    "/api/admin/premios/catalogo",
                    {
                        method:
                            isEditing
                                ? "PATCH"
                                : "POST",

                        headers: {
                            Authorization:
                                `Bearer ${token}`,
                        },

                        body:
                            formData,
                    }
                );


            const data =
                (
                    await response
                        .json()
                ) as ApiResponse;


            if (
                !response.ok ||
                !data.ok
            ) {

                throw new Error(
                    data.error ??
                    "No se pudo guardar el premio."
                );
            }


            setSuccess(
                isEditing
                    ? "Premio actualizado correctamente."
                    : "Premio creado correctamente."
            );


            setShowForm(
                false
            );


            setForm(
                EMPTY_FORM
            );


            resetImageEditor();


            await loadCatalog();

        } catch (
        err:
            unknown
        ) {

            setError(
                err instanceof Error
                    ? err.message
                    : "No se pudo guardar el premio."
            );

        } finally {

            setSaving(
                false
            );
        }
    }


    /*
     * =========================================================
     * ACTIVAR / DESACTIVAR
     * =========================================================
     */

    async function togglePrize(
        prize: Prize
    ) {

        setError(
            null
        );

        setSuccess(
            null
        );


        try {

            const token =
                await getAccessToken();


            const formData =
                new FormData();


            formData.set(
                "prizeId",
                prize.id
            );

            formData.set(
                "name",
                prize.name
            );

            formData.set(
                "description",
                prize.description
            );

            formData.set(
                "type",
                prize.type
            );

            formData.set(
                "cardQuantity",
                String(
                    prize.cardQuantity
                )
            );

            formData.set(
                "referenceValue",
                String(
                    prize.referenceValue
                )
            );

            formData.set(
                "weight",
                String(
                    prize.weight
                )
            );

            formData.set(
                "stockTotal",
                String(
                    prize.stockTotal
                )
            );

            formData.set(
                "claimInstructions",
                prize.claimInstructions
            );

            formData.set(
                "active",
                String(
                    !prize.active
                )
            );

            formData.set(
                "removeImage",
                "false"
            );


            const response =
                await fetch(
                    "/api/admin/premios/catalogo",
                    {
                        method:
                            "PATCH",

                        headers: {
                            Authorization:
                                `Bearer ${token}`,
                        },

                        body:
                            formData,
                    }
                );


            const data =
                (
                    await response
                        .json()
                ) as ApiResponse;


            if (
                !response.ok ||
                !data.ok
            ) {

                throw new Error(
                    data.error ??
                    "No se pudo actualizar el premio."
                );
            }


            setSuccess(
                prize.active
                    ? "Premio desactivado."
                    : "Premio activado."
            );


            await loadCatalog();

        } catch (
        err:
            unknown
        ) {

            setError(
                err instanceof Error
                    ? err.message
                    : "No se pudo actualizar el premio."
            );
        }
    }


    /*
 * =========================================================
 * ELIMINAR PREMIO
 * =========================================================
 */

    async function deletePrize(
        prize: Prize
    ) {
        setError(
            null
        );

        setSuccess(
            null
        );

        /*
         * Si ya tiene historial, ni siquiera
         * intentamos borrarlo desde la interfaz.
         */
        if (
            prize.stockAssigned > 0 ||
            prize.stockScheduled > 0
        ) {
            setError(
                `No se puede eliminar "${prize.name}" porque ya tiene ${prize.stockAssigned} unidad(es) asignada(s) y ${prize.stockScheduled} programada(s). Puedes mantenerlo desactivado para conservar el historial.`
            );

            return;
        }

        const confirmed =
            window.confirm(
                `¿Eliminar definitivamente "${prize.name}"?\n\nEsta acción no se puede deshacer.`
            );

        if (!confirmed) {
            return;
        }

        try {
            const token =
                await getAccessToken();

            const response =
                await fetch(
                    "/api/admin/premios/catalogo",
                    {
                        method:
                            "DELETE",

                        headers: {
                            Authorization:
                                `Bearer ${token}`,

                            "Content-Type":
                                "application/json",
                        },

                        body:
                            JSON.stringify({
                                prizeId:
                                    prize.id,
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
                !data.ok
            ) {
                throw new Error(
                    data.error ??
                    "No se pudo eliminar el premio."
                );
            }

            setSuccess(
                `"${prize.name}" fue eliminado correctamente.`
            );

            await loadCatalog();

        } catch (
        err: unknown
        ) {
            setError(
                err instanceof Error
                    ? err.message
                    : "No se pudo eliminar el premio."
            );
        }
    }


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
                    max-w-7xl
                    space-y-7
                    px-4
                    py-8

                    md:py-12
                "
            >

                {/* =================================================
                    HEADER
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
                                font-black

                                md:text-4xl
                            "
                        >
                            Catálogo de premios
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
                            Crea y administra los premios
                            instantáneos disponibles para cada actividad.
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
                                loadCatalog
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
                                font-bold
                                transition

                                hover:border-orange-500
                            "
                        >
                            Actualizar
                        </button>


                        <button
                            type="button"

                            onClick={
                                openCreateForm
                            }

                            className="
                                rounded-full
                                bg-orange-500
                                px-4
                                py-2
                                text-xs
                                font-black
                                text-black
                                transition

                                hover:bg-orange-400
                            "
                        >
                            + Crear premio
                        </button>


                        <Link
                            href="/admin/premios"

                            className="
                                rounded-full
                                border
                                border-slate-700
                                bg-slate-900
                                px-4
                                py-2
                                text-xs
                                font-bold
                                transition

                                hover:border-orange-500
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
                    FORMULARIO
                ================================================= */}

                {showForm && (

                    <section
                        className="
                            rounded-3xl
                            border
                            border-orange-500/30
                            bg-slate-900/80
                            p-5

                            md:p-7
                        "
                    >

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
                                        text-xs
                                        font-black
                                        uppercase
                                        tracking-[0.18em]
                                        text-orange-400
                                    "
                                >
                                    {
                                        form.prizeId
                                            ? "Editar premio"
                                            : "Nuevo premio"
                                    }
                                </p>


                                <h2
                                    className="
                                        mt-1
                                        text-xl
                                        font-black
                                    "
                                >
                                    Configuración
                                </h2>

                            </div>


                            <button
                                type="button"

                                onClick={
                                    () =>
                                        setShowForm(
                                            false
                                        )
                                }

                                className="
                                    rounded-full
                                    border
                                    border-slate-700
                                    px-3
                                    py-1.5
                                    text-xs
                                    text-slate-300
                                "
                            >
                                Cerrar
                            </button>

                        </div>


                        <div
                            className="
                                mt-6
                                grid
                                gap-5

                                md:grid-cols-2
                            "
                        >

                            {/* ACTIVIDAD */}

                            <div>

                                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                    Actividad
                                </label>


                                <select
                                    value={
                                        form.sorteoId
                                    }

                                    disabled={
                                        Boolean(
                                            form.prizeId
                                        )
                                    }

                                    onChange={(
                                        event
                                    ) =>
                                        setForm(
                                            (
                                                current
                                            ) => ({
                                                ...current,

                                                sorteoId:
                                                    event.target.value,
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
                                        outline-none

                                        focus:border-orange-500

                                        disabled:opacity-60
                                    "
                                >

                                    <option value="">
                                        Selecciona una actividad
                                    </option>


                                    {sorteos.map(
                                        (
                                            sorteo
                                        ) => (

                                            <option
                                                key={
                                                    sorteo.id
                                                }

                                                value={
                                                    sorteo.id
                                                }
                                            >
                                                {
                                                    sorteo.activityNumber >
                                                        0
                                                        ? `#${sorteo.activityNumber} · `
                                                        : ""
                                                }

                                                {sorteo.name}
                                            </option>

                                        )
                                    )}

                                </select>

                            </div>


                            {/* TIPO */}

                            <div>

                                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                    Tipo
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
                                                    event.target.value,
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
                                        outline-none

                                        focus:border-orange-500
                                    "
                                >

                                    <option value="physical">
                                        Premio físico
                                    </option>

                                    <option value="experience">
                                        Experiencia
                                    </option>

                                    <option value="cash">
                                        Efectivo
                                    </option>

                                    <option value="digital">
                                        Digital
                                    </option>

                                    <option value="digital_cards">
                                        Tarjetas Gratis
                                    </option>

                                </select>

                            </div>


                            {/* NOMBRE */}

                            <div className="md:col-span-2">

                                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                    Nombre
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
                                                    event.target.value,
                                            })
                                        )
                                    }

                                    placeholder="Ej.: Casco LS2"

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
                                        outline-none

                                        focus:border-orange-500
                                    "
                                />

                            </div>


                            {/* DESCRIPCIÓN */}

                            <div className="md:col-span-2">

                                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                    Descripción
                                </label>


                                <textarea
                                    rows={
                                        3
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
                                                    event.target.value,
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
                                        outline-none

                                        focus:border-orange-500
                                    "
                                />

                            </div>


                            {/* IMAGEN */}

                            <div className="md:col-span-2">

                                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                    Imagen del premio
                                </label>


                                <div
                                    className="
                                        mt-2
                                        overflow-hidden
                                        rounded-2xl
                                        border
                                        border-slate-700
                                        bg-slate-950
                                    "
                                >

                                    <div className="flex min-h-[240px] items-center justify-center p-4">

                                        {imageShown &&
                                            !imageError ? (

                                            <img
                                                src={
                                                    imageShown
                                                }

                                                alt={
                                                    form.name ||
                                                    "Vista previa del premio"
                                                }

                                                onError={
                                                    () =>
                                                        setImageError(
                                                            true
                                                        )
                                                }

                                                className="
                                                    max-h-[320px]
                                                    w-full
                                                    object-contain
                                                "
                                            />

                                        ) : (

                                            <div className="px-5 py-16 text-center text-sm text-slate-500">
                                                Sin imagen del premio
                                            </div>
                                        )}

                                    </div>

                                </div>


                                <input
                                    type="file"

                                    accept="image/webp,image/png,image/jpeg"

                                    onChange={
                                        selectImage
                                    }

                                    className="
                                        mt-4
                                        block
                                        w-full
                                        text-xs
                                        text-slate-400

                                        file:mr-3
                                        file:rounded-full
                                        file:border-0
                                        file:bg-orange-500
                                        file:px-4
                                        file:py-2
                                        file:text-xs
                                        file:font-black
                                        file:text-black
                                    "
                                />


                                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">

                                    <p className="text-[11px] leading-5 text-slate-500">
                                        WEBP, PNG o JPG. Máximo 5 MB.
                                        La imagen se guardará en Supabase Storage.
                                    </p>


                                    {(form.imageUrl ||
                                        imagePreview) &&
                                        !removeImage && (

                                            <button
                                                type="button"

                                                onClick={
                                                    clearImage
                                                }

                                                className="
                                                text-[11px]
                                                font-bold
                                                text-red-300
                                                transition

                                                hover:text-red-200
                                            "
                                            >
                                                Quitar imagen
                                            </button>
                                        )}

                                </div>


                                {removeImage && (

                                    <p className="mt-3 text-[11px] font-semibold text-yellow-300">
                                        La imagen actual se eliminará al guardar los cambios.
                                    </p>
                                )}

                            </div>


                            {/* STOCK */}

                            <div>

                                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                    Stock total
                                </label>


                                <input
                                    type="number"

                                    min="0"

                                    step="1"

                                    value={
                                        form.stockTotal
                                    }

                                    onChange={(
                                        event
                                    ) =>
                                        setForm(
                                            (
                                                current
                                            ) => ({
                                                ...current,

                                                stockTotal:
                                                    Number(
                                                        event.target.value
                                                    ),
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
                                        font-black
                                        outline-none

                                        focus:border-orange-500
                                    "
                                />

                            </div>


                            {/* VALOR */}

                            <div>

                                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                    Valor referencial $
                                </label>


                                <input
                                    type="number"

                                    min="0"

                                    step="0.01"

                                    value={
                                        form.referenceValue
                                    }

                                    onChange={(
                                        event
                                    ) =>
                                        setForm(
                                            (
                                                current
                                            ) => ({
                                                ...current,

                                                referenceValue:
                                                    Number(
                                                        event.target.value
                                                    ),
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
                                        outline-none

                                        focus:border-orange-500
                                    "
                                />

                            </div>


                            {/* CANTIDAD CARDS */}

                            {form.type ===
                                "digital_cards" && (

                                    <div>

                                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                            Tarjetas entregadas
                                        </label>


                                        <input
                                            type="number"

                                            min="1"

                                            step="1"

                                            value={
                                                form.cardQuantity
                                            }

                                            onChange={(
                                                event
                                            ) =>
                                                setForm(
                                                    (
                                                        current
                                                    ) => ({
                                                        ...current,

                                                        cardQuantity:
                                                            Number(
                                                                event.target.value
                                                            ),
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
                                            outline-none

                                            focus:border-orange-500
                                        "
                                        />

                                    </div>

                                )}


                            {/* PESO */}

                            <div>

                                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                    Peso de asignación
                                </label>


                                <input
                                    type="number"

                                    min="0"

                                    step="0.01"

                                    value={
                                        form.weight
                                    }

                                    onChange={(
                                        event
                                    ) =>
                                        setForm(
                                            (
                                                current
                                            ) => ({
                                                ...current,

                                                weight:
                                                    Number(
                                                        event.target.value
                                                    ),
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
                                        outline-none

                                        focus:border-orange-500
                                    "
                                />


                                <p className="mt-2 text-[11px] leading-5 text-slate-500">
                                    0 significa que no saldrá aleatoriamente.
                                    Puede seguir utilizándose como premio programado.
                                </p>

                            </div>


                            {/* INSTRUCCIONES */}

                            <div className="md:col-span-2">

                                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                    Instrucciones de reclamo
                                </label>


                                <textarea
                                    rows={
                                        3
                                    }

                                    value={
                                        form.claimInstructions
                                    }

                                    onChange={(
                                        event
                                    ) =>
                                        setForm(
                                            (
                                                current
                                            ) => ({
                                                ...current,

                                                claimInstructions:
                                                    event.target.value,
                                            })
                                        )
                                    }

                                    placeholder="Ej.: El equipo de Baruk593 coordinará la entrega."

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
                                        outline-none

                                        focus:border-orange-500
                                    "
                                />

                            </div>

                        </div>


                        {/* ACTIVO */}

                        <div
                            className="
                                mt-6
                                flex
                                items-center
                                justify-between
                                gap-4
                                rounded-2xl
                                border
                                border-slate-800
                                bg-black/20
                                p-4
                            "
                        >

                            <div>

                                <p className="text-sm font-black">
                                    Premio activo
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                    Si está inactivo no podrá asignarse a nuevas Tarjetas.
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
                                                    !current.active,
                                            })
                                        )
                                }

                                className={`
                                    rounded-full
                                    px-5
                                    py-2
                                    text-xs
                                    font-black

                                    ${form.active
                                        ? "bg-emerald-500 text-black"
                                        : "bg-slate-700 text-slate-300"
                                    }
                                `}
                            >
                                {
                                    form.active
                                        ? "ACTIVO"
                                        : "INACTIVO"
                                }
                            </button>

                        </div>


                        {/* GUARDAR */}

                        <div
                            className="
                                mt-7
                                flex
                                justify-end
                            "
                        >

                            <button
                                type="button"

                                onClick={
                                    savePrize
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

                                    hover:bg-orange-400

                                    disabled:opacity-50
                                "
                            >
                                {
                                    saving
                                        ? "Guardando..."
                                        : form.prizeId
                                            ? "Guardar cambios"
                                            : "Crear premio"
                                }
                            </button>

                        </div>

                    </section>

                )}


                {/* =================================================
                    FILTRO ACTIVIDAD
                ================================================= */}

                <section
                    className="
                        rounded-2xl
                        border
                        border-slate-800
                        bg-slate-900/60
                        p-4
                    "
                >

                    <label className="text-xs font-black uppercase tracking-wider text-slate-400">
                        Actividad
                    </label>


                    <select
                        value={
                            selectedSorteoId
                        }

                        onChange={(
                            event
                        ) =>
                            setSelectedSorteoId(
                                event.target.value
                            )
                        }

                        className="
                            mt-2
                            w-full
                            max-w-xl
                            rounded-xl
                            border
                            border-slate-700
                            bg-slate-950
                            px-4
                            py-3
                            text-sm
                            outline-none

                            focus:border-orange-500
                        "
                    >

                        {sorteos.map(
                            (
                                sorteo
                            ) => (

                                <option
                                    key={
                                        sorteo.id
                                    }

                                    value={
                                        sorteo.id
                                    }
                                >
                                    {
                                        sorteo.activityNumber >
                                            0
                                            ? `#${sorteo.activityNumber} · `
                                            : ""
                                    }

                                    {sorteo.name}
                                </option>

                            )
                        )}

                    </select>

                </section>


                {/* =================================================
                    LISTADO
                ================================================= */}

                {loading ? (

                    <div className="py-20 text-center text-sm text-slate-400">
                        Cargando catálogo...
                    </div>

                ) : filteredPrizes.length ===
                    0 ? (

                    <div
                        className="
                            rounded-3xl
                            border
                            border-dashed
                            border-slate-700
                            py-16
                            text-center
                        "
                    >

                        <p className="font-black text-slate-300">
                            No hay premios configurados
                        </p>

                        <p className="mt-2 text-sm text-slate-500">
                            Crea el primer premio para esta actividad.
                        </p>

                    </div>

                ) : (

                    <section
                        className="
                            grid
                            gap-4

                            lg:grid-cols-2
                        "
                    >

                        {filteredPrizes.map(
                            (
                                prize
                            ) => (

                                <article
                                    key={
                                        prize.id
                                    }

                                    className="
                                        overflow-hidden
                                        rounded-3xl
                                        border
                                        border-slate-800
                                        bg-slate-900/70
                                    "
                                >

                                    <div
                                        className={`
                                            h-1

                                            ${prize.active
                                                ? "bg-orange-500"
                                                : "bg-slate-700"
                                            }
                                        `}
                                    />


                                    <div className="p-5">

                                        <div
                                            className="
                                                flex
                                                items-start
                                                justify-between
                                                gap-4
                                            "
                                        >

                                            <div>

                                                <div className="flex flex-wrap gap-2">

                                                    <span
                                                        className="
                                                            rounded-full
                                                            border
                                                            border-slate-700
                                                            bg-slate-950
                                                            px-2.5
                                                            py-1
                                                            text-[10px]
                                                            font-black
                                                            uppercase
                                                            tracking-wider
                                                            text-slate-300
                                                        "
                                                    >
                                                        {typeLabel(
                                                            prize.type
                                                        )}
                                                    </span>


                                                    <span
                                                        className={`
                                                            rounded-full
                                                            px-2.5
                                                            py-1
                                                            text-[10px]
                                                            font-black
                                                            uppercase

                                                            ${prize.active
                                                                ? "bg-emerald-500/15 text-emerald-300"
                                                                : "bg-red-500/15 text-red-300"
                                                            }
                                                        `}
                                                    >
                                                        {
                                                            prize.active
                                                                ? "Activo"
                                                                : "Inactivo"
                                                        }
                                                    </span>

                                                </div>


                                                <h2
                                                    className="
                                                        mt-3
                                                        text-xl
                                                        font-black
                                                        text-white
                                                    "
                                                >
                                                    {prize.name}
                                                </h2>


                                                {prize.description && (

                                                    <p
                                                        className="
                                                            mt-2
                                                            text-sm
                                                            leading-6
                                                            text-slate-400
                                                        "
                                                    >
                                                        {prize.description}
                                                    </p>

                                                )}

                                            </div>

                                        </div>


                                        <div
                                            className="
                                                mt-5
                                                grid
                                                grid-cols-2
                                                gap-3

                                                sm:grid-cols-4
                                            "
                                        >

                                            <div className="rounded-xl bg-black/25 p-3">

                                                <p className="text-[10px] font-bold uppercase text-slate-500">
                                                    Total
                                                </p>

                                                <p className="mt-1 text-lg font-black">
                                                    {prize.stockTotal}
                                                </p>

                                            </div>


                                            <div className="rounded-xl bg-black/25 p-3">

                                                <p className="text-[10px] font-bold uppercase text-slate-500">
                                                    Asignados
                                                </p>

                                                <p className="mt-1 text-lg font-black">
                                                    {prize.stockAssigned}
                                                </p>

                                            </div>


                                            <div className="rounded-xl bg-black/25 p-3">

                                                <p className="text-[10px] font-bold uppercase text-slate-500">
                                                    Programados
                                                </p>

                                                <p className="mt-1 text-lg font-black">
                                                    {prize.stockScheduled}
                                                </p>

                                            </div>


                                            <div className="rounded-xl bg-orange-500/10 p-3">

                                                <p className="text-[10px] font-bold uppercase text-orange-300">
                                                    Disponibles
                                                </p>

                                                <p className="mt-1 text-lg font-black text-orange-300">
                                                    {prize.stockRemaining}
                                                </p>

                                            </div>

                                        </div>


                                        {(prize.type ===
                                            "cash" ||
                                            prize.referenceValue >
                                            0) && (

                                                <p
                                                    className="
                                                    mt-4
                                                    text-sm
                                                    font-black
                                                    text-emerald-300
                                                "
                                                >
                                                    Valor: {
                                                        formatMoney(
                                                            prize.referenceValue
                                                        )
                                                    }
                                                </p>

                                            )}


                                        {prize.type ===
                                            "digital_cards" && (

                                                <p
                                                    className="
                                                    mt-4
                                                    text-sm
                                                    font-bold
                                                    text-blue-300
                                                "
                                                >
                                                    Entrega {
                                                        prize.cardQuantity
                                                    } Tarjetas
                                                </p>

                                            )}


                                        <p
                                            className="
                                                mt-3
                                                text-xs
                                                text-slate-500
                                            "
                                        >
                                            Peso aleatorio: {
                                                prize.weight
                                            }
                                        </p>


                                        <div
                                            className="
                                                mt-5
                                                flex
                                                flex-wrap
                                                gap-2
                                                border-t
                                                border-slate-800
                                                pt-4
                                            "
                                        >

                                            <button
                                                type="button"

                                                onClick={
                                                    () =>
                                                        openEditForm(
                                                            prize
                                                        )
                                                }

                                                className="
                                                    rounded-lg
                                                    border
                                                    border-slate-700
                                                    px-4
                                                    py-2
                                                    text-xs
                                                    font-bold

                                                    hover:border-orange-500
                                                "
                                            >
                                                Editar
                                            </button>


                                            <button
                                                type="button"

                                                onClick={
                                                    () =>
                                                        togglePrize(
                                                            prize
                                                        )
                                                }

                                                className={`
                                                    rounded-lg
                                                    px-4
                                                    py-2
                                                    text-xs
                                                    font-black

                                                    ${prize.active
                                                        ? "bg-red-500/10 text-red-300"
                                                        : "bg-emerald-500/10 text-emerald-300"
                                                    }
                                                `}
                                            >
                                                {
                                                    prize.active
                                                        ? "Desactivar"
                                                        : "Activar"
                                                }
                                            </button>

                                            <button
                                                type="button"

                                                onClick={
                                                    () =>
                                                        deletePrize(
                                                            prize
                                                        )
                                                }

                                                className="
        rounded-lg
        border
        border-red-500/30
        bg-red-500/10
        px-4
        py-2
        text-xs
        font-black
        text-red-300
        transition

        hover:border-red-500
        hover:bg-red-500/20
    "
                                            >
                                                Eliminar
                                            </button>

                                        </div>

                                    </div>

                                </article>

                            )
                        )}

                    </section>

                )}

            </div>

        </main>
    );
}