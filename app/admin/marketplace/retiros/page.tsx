"use client";

import {
    useEffect,
    useMemo,
    useState,
} from "react";

import Link from "next/link";

import {
    useRouter,
} from "next/navigation";

import {
    supabaseBrowser,
} from "@/lib/supabaseClient";


type WithdrawalStatus =
    | "pending"
    | "processing"
    | "paid"
    | "rejected"
    | "cancelled";


type Withdrawal = {
    id: string;

    userId: string;

    payoutAccountId:
    | string
    | null;

    amount: number;

    status:
    WithdrawalStatus;

    bankName: string;

    accountType: string;

    accountNumber: string;

    accountHolder: string;

    identification: string;

    adminNotes:
    | string
    | null;

    requestedAt: string;

    processingAt:
    | string
    | null;

    paidAt:
    | string
    | null;

    rejectedAt:
    | string
    | null;

    cancelledAt:
    | string
    | null;

    createdAt: string;

    updatedAt: string;
};


type WithdrawalSummary = {
    total: number;
    pending: number;
    processing: number;
    paid: number;
    rejected: number;

    pendingAmount: number;
    paidAmount: number;
};


type FilterStatus =
    | "all"
    | WithdrawalStatus;


export default function AdminMarketplaceWithdrawalsPage() {

    const router =
        useRouter();


    const [
        withdrawals,
        setWithdrawals,
    ] =
        useState<Withdrawal[]>(
            []
        );


    const [
        summary,
        setSummary,
    ] =
        useState<WithdrawalSummary>({
            total: 0,
            pending: 0,
            processing: 0,
            paid: 0,
            rejected: 0,
            pendingAmount: 0,
            paidAmount: 0,
        });


    const [
        filter,
        setFilter,
    ] =
        useState<FilterStatus>(
            "pending"
        );


    const [
        loading,
        setLoading,
    ] =
        useState(true);


    const [
        busyId,
        setBusyId,
    ] =
        useState<string | null>(
            null
        );


    const [
        error,
        setError,
    ] =
        useState<string | null>(
            null
        );


    const [
        success,
        setSuccess,
    ] =
        useState<string | null>(
            null
        );


    const [
        selectedWithdrawal,
        setSelectedWithdrawal,
    ] =
        useState<Withdrawal | null>(
            null
        );


    const [
        notes,
        setNotes,
    ] =
        useState("");


    /*
     * =========================================================
     * TOKEN ADMIN
     * =========================================================
     */

    async function getAccessToken() {

        const {
            data,
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
            !data.session
        ) {

            router.replace(
                "/admin"
            );

            throw new Error(
                "No existe una sesión administrativa."
            );
        }


        return data
            .session
            .access_token;
    }


    /*
     * =========================================================
     * CARGAR RETIROS
     * =========================================================
     */

    async function loadWithdrawals() {

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
                    "/api/admin/marketplace/withdrawals",
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
                await response
                    .json();


            if (
                !response.ok ||
                !data?.ok
            ) {

                if (
                    response.status ===
                    401 ||
                    response.status ===
                    403
                ) {

                    router.replace(
                        "/admin"
                    );
                }


                throw new Error(
                    data?.error ??
                    "No se pudieron cargar los retiros."
                );
            }


            setWithdrawals(
                data.withdrawals ??
                []
            );


            setSummary({
                total:
                    Number(
                        data.summary
                            ?.total ??
                        0
                    ),

                pending:
                    Number(
                        data.summary
                            ?.pending ??
                        0
                    ),

                processing:
                    Number(
                        data.summary
                            ?.processing ??
                        0
                    ),

                paid:
                    Number(
                        data.summary
                            ?.paid ??
                        0
                    ),

                rejected:
                    Number(
                        data.summary
                            ?.rejected ??
                        0
                    ),

                pendingAmount:
                    Number(
                        data.summary
                            ?.pendingAmount ??
                        0
                    ),

                paidAmount:
                    Number(
                        data.summary
                            ?.paidAmount ??
                        0
                    ),
            });

        } catch (
        err: unknown
        ) {

            setError(
                err instanceof Error
                    ? err.message
                    : "No se pudieron cargar los retiros."
            );

        } finally {

            setLoading(
                false
            );
        }
    }


    /*
     * =========================================================
     * INICIO
     * =========================================================
     */

    useEffect(() => {

        void loadWithdrawals();

    }, []);


    /*
     * =========================================================
     * CAMBIAR ESTADO
     * =========================================================
     */

    async function handleAction(
        withdrawal:
            Withdrawal,

        action:
            "processing" |
            "paid" |
            "rejected"
    ) {

        /*
         * Para rechazar obligamos a
         * indicar un motivo.
         */
        if (
            action ===
            "rejected" &&
            !notes.trim()
        ) {

            setError(
                "Escribe el motivo del rechazo."
            );

            return;
        }


        /*
         * Para marcar pagado queremos una
         * confirmación adicional.
         */
        if (
            action ===
            "paid"
        ) {

            const confirmed =
                window.confirm(
                    `¿Confirmas que ya realizaste la transferencia de $${Number(
                        withdrawal.amount
                    ).toFixed(
                        2
                    )} a ${withdrawal.accountHolder}?`
                );


            if (!confirmed) {
                return;
            }
        }


        setBusyId(
            withdrawal.id
        );

        setError(
            null
        );

        setSuccess(
            null
        );


        try {

            const accessToken =
                await getAccessToken();


            const response =
                await fetch(
                    "/api/admin/marketplace/withdrawals",
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

                                withdrawalId:
                                    withdrawal.id,

                                action,

                                notes:
                                    notes.trim(),
                            }),
                    }
                );


            const data =
                await response
                    .json();


            if (
                !response.ok ||
                !data?.ok
            ) {

                throw new Error(
                    data?.error ??
                    "No se pudo actualizar el retiro."
                );
            }


            setSelectedWithdrawal(
                null
            );

            setNotes(
                ""
            );


            if (
                action ===
                "processing"
            ) {

                setSuccess(
                    "El retiro quedó marcado como En proceso."
                );
            }


            if (
                action ===
                "paid"
            ) {

                setSuccess(
                    "El retiro fue marcado como pagado."
                );
            }


            if (
                action ===
                "rejected"
            ) {

                setSuccess(
                    "El retiro fue rechazado y el saldo regresó a la billetera del usuario."
                );
            }


            await loadWithdrawals();

        } catch (
        err: unknown
        ) {

            setError(
                err instanceof Error
                    ? err.message
                    : "No se pudo actualizar el retiro."
            );

        } finally {

            setBusyId(
                null
            );
        }
    }


    /*
     * =========================================================
     * FILTRO
     * =========================================================
     */

    const filteredWithdrawals =
        useMemo(
            () => {

                if (
                    filter ===
                    "all"
                ) {

                    return withdrawals;
                }


                return withdrawals.filter(
                    item =>
                        item.status ===
                        filter
                );

            },
            [
                withdrawals,
                filter,
            ]
        );


    /*
     * =========================================================
     * RENDER
     * =========================================================
     */

    return (

        <main
            className="
                min-h-screen
                bg-[#0d0d0f]
                px-4
                pb-20
                pt-24
                text-white

                sm:px-6
                lg:px-8
            "
        >

            <div
                className="
                    mx-auto
                    w-full
                    max-w-[1500px]
                "
            >

                {/* =================================================
                    CABECERA
                ================================================= */}

                <div
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
                                text-[10px]
                                font-black
                                uppercase
                                tracking-[0.24em]
                                text-[#C1317F]
                            "
                        >
                            Baruk593 Admin
                        </p>


                        <h1
                            className="
                                mt-2
                                text-3xl
                                font-black
                                tracking-[-0.04em]

                                md:text-4xl
                            "
                        >
                            Retiros Marketplace
                        </h1>


                        <p
                            className="
                                mt-3
                                max-w-2xl
                                text-sm
                                leading-6
                                text-white/45
                            "
                        >
                            Revisa las solicitudes de retiro de los
                            vendedores y registra las transferencias realizadas.
                        </p>

                    </div>


                    <div
                        className="
                            flex
                            flex-wrap
                            gap-3
                        "
                    >

                        <button
                            type="button"

                            onClick={() =>
                                loadWithdrawals()
                            }

                            disabled={
                                loading
                            }

                            className="
                                min-h-[44px]
                                rounded-xl
                                border
                                border-white/10
                                bg-white/5
                                px-5
                                text-xs
                                font-black
                                uppercase
                                tracking-wider
                                text-white
                                transition
                                hover:bg-white/10
                                disabled:opacity-50
                            "
                        >
                            Actualizar
                        </button>


                        <Link
                            href="/admin"

                            className="
                                inline-flex
                                min-h-[44px]
                                items-center
                                justify-center
                                rounded-xl
                                bg-white
                                px-5
                                text-xs
                                font-black
                                uppercase
                                tracking-wider
                                text-black
                            "
                        >
                            ← Panel Admin
                        </Link>

                    </div>

                </div>


                {/* =================================================
                    MENSAJES
                ================================================= */}

                {error && (

                    <div
                        className="
                            mt-6
                            rounded-2xl
                            border
                            border-red-500/20
                            bg-red-500/10
                            px-5
                            py-4
                            text-sm
                            font-bold
                            text-red-300
                        "
                    >
                        {error}
                    </div>

                )}


                {success && (

                    <div
                        className="
                            mt-6
                            rounded-2xl
                            border
                            border-emerald-500/20
                            bg-emerald-500/10
                            px-5
                            py-4
                            text-sm
                            font-bold
                            text-emerald-300
                        "
                    >
                        {success}
                    </div>

                )}


                {/* =================================================
                    RESUMEN
                ================================================= */}

                <div
                    className="
                        mt-8
                        grid
                        grid-cols-2
                        gap-3

                        md:grid-cols-3
                        xl:grid-cols-6
                    "
                >

                    <AdminStat
                        label="Pendientes"
                        value={
                            String(
                                summary.pending
                            )
                        }
                    />

                    <AdminStat
                        label="En proceso"
                        value={
                            String(
                                summary.processing
                            )
                        }
                    />

                    <AdminStat
                        label="Pagados"
                        value={
                            String(
                                summary.paid
                            )
                        }
                    />

                    <AdminStat
                        label="Rechazados"
                        value={
                            String(
                                summary.rejected
                            )
                        }
                    />

                    <AdminStat
                        label="Por pagar"
                        value={`$${Number(
                            summary.pendingAmount
                        ).toFixed(
                            2
                        )}`}
                    />

                    <AdminStat
                        label="Total pagado"
                        value={`$${Number(
                            summary.paidAmount
                        ).toFixed(
                            2
                        )}`}
                    />

                </div>


                {/* =================================================
                    FILTROS
                ================================================= */}

                <div
                    className="
                        mt-8
                        flex
                        flex-wrap
                        gap-2
                    "
                >

                    <FilterButton
                        active={
                            filter ===
                            "pending"
                        }

                        onClick={() =>
                            setFilter(
                                "pending"
                            )
                        }
                    >
                        Pendientes
                    </FilterButton>


                    <FilterButton
                        active={
                            filter ===
                            "processing"
                        }

                        onClick={() =>
                            setFilter(
                                "processing"
                            )
                        }
                    >
                        En proceso
                    </FilterButton>


                    <FilterButton
                        active={
                            filter ===
                            "paid"
                        }

                        onClick={() =>
                            setFilter(
                                "paid"
                            )
                        }
                    >
                        Pagados
                    </FilterButton>


                    <FilterButton
                        active={
                            filter ===
                            "rejected"
                        }

                        onClick={() =>
                            setFilter(
                                "rejected"
                            )
                        }
                    >
                        Rechazados
                    </FilterButton>


                    <FilterButton
                        active={
                            filter ===
                            "all"
                        }

                        onClick={() =>
                            setFilter(
                                "all"
                            )
                        }
                    >
                        Todos
                    </FilterButton>

                </div>


                {/* =================================================
                    CARGANDO
                ================================================= */}

                {loading && (

                    <div
                        className="
                            mt-12
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
                                border-4
                                border-white/10
                                border-t-[#C1317F]
                            "
                        />

                        <p
                            className="
                                mt-4
                                text-sm
                                font-semibold
                                text-white/40
                            "
                        >
                            Cargando solicitudes...
                        </p>

                    </div>

                )}


                {/* =================================================
                    SIN RESULTADOS
                ================================================= */}

                {!loading &&
                    filteredWithdrawals.length ===
                    0 && (

                        <div
                            className="
                                mt-8
                                rounded-3xl
                                border
                                border-white/10
                                bg-white/[0.03]
                                px-6
                                py-14
                                text-center
                            "
                        >

                            <p
                                className="
                                    text-lg
                                    font-black
                                    text-white/70
                                "
                            >
                                No existen retiros en esta categoría.
                            </p>

                        </div>

                    )}


                {/* =================================================
                    RETIROS
                ================================================= */}

                {!loading &&
                    filteredWithdrawals.length >
                    0 && (

                        <div
                            className="
                                mt-6
                                grid
                                grid-cols-1
                                gap-4
                            "
                        >

                            {filteredWithdrawals.map(
                                (
                                    withdrawal
                                ) => (

                                    <WithdrawalCard
                                        key={
                                            withdrawal.id
                                        }

                                        withdrawal={
                                            withdrawal
                                        }

                                        busy={
                                            busyId ===
                                            withdrawal.id
                                        }

                                        onSelect={() => {

                                            setSelectedWithdrawal(
                                                withdrawal
                                            );

                                            setNotes(
                                                withdrawal
                                                    .adminNotes ??
                                                ""
                                            );

                                            setError(
                                                null
                                            );

                                            setSuccess(
                                                null
                                            );
                                        }}
                                    />

                                )
                            )}

                        </div>

                    )}

            </div>


            {/* =====================================================
                MODAL
            ===================================================== */}

            {selectedWithdrawal && (

                <div
                    className="
                        fixed
                        inset-0
                        z-[100]
                        flex
                        items-center
                        justify-center
                        bg-black/80
                        px-4
                        backdrop-blur-sm
                    "
                >

                    <div
                        className="
                            max-h-[90vh]
                            w-full
                            max-w-xl
                            overflow-y-auto
                            rounded-3xl
                            border
                            border-white/10
                            bg-[#17171a]
                            p-6
                            shadow-2xl

                            md:p-7
                        "
                    >

                        <div
                            className="
                                flex
                                items-start
                                justify-between
                                gap-4
                            "
                        >

                            <div>

                                <p
                                    className="
                                        text-[10px]
                                        font-black
                                        uppercase
                                        tracking-[0.2em]
                                        text-[#C1317F]
                                    "
                                >
                                    Solicitud de retiro
                                </p>


                                <h2
                                    className="
                                        mt-2
                                        text-3xl
                                        font-black
                                    "
                                >
                                    $
                                    {Number(
                                        selectedWithdrawal.amount
                                    ).toFixed(
                                        2
                                    )}
                                </h2>

                            </div>


                            <button
                                type="button"

                                onClick={() => {

                                    setSelectedWithdrawal(
                                        null
                                    );

                                    setNotes(
                                        ""
                                    );
                                }}

                                className="
                                    flex
                                    h-10
                                    w-10
                                    items-center
                                    justify-center
                                    rounded-xl
                                    bg-white/5
                                    text-xl
                                    text-white/60
                                    hover:bg-white/10
                                "
                            >
                                ×
                            </button>

                        </div>


                        {/* DATOS BANCARIOS */}

                        <div
                            className="
                                mt-6
                                rounded-2xl
                                border
                                border-white/10
                                bg-white/[0.03]
                                p-5
                            "
                        >

                            <AdminDetail
                                label="Banco"
                                value={
                                    selectedWithdrawal.bankName
                                }
                            />

                            <AdminDetail
                                label="Tipo de cuenta"
                                value={
                                    selectedWithdrawal.accountType ===
                                        "savings"
                                        ? "Ahorros"
                                        : "Corriente"
                                }
                            />

                            <AdminDetail
                                label="Número de cuenta"
                                value={
                                    selectedWithdrawal.accountNumber
                                }
                            />

                            <AdminDetail
                                label="Titular"
                                value={
                                    selectedWithdrawal.accountHolder
                                }
                            />

                            <AdminDetail
                                label="Identificación"
                                value={
                                    selectedWithdrawal.identification
                                }
                            />

                        </div>


                        {/* NOTAS */}

                        <div className="mt-5">

                            <label
                                htmlFor="withdrawal-notes"

                                className="
                                    text-xs
                                    font-black
                                    uppercase
                                    tracking-wider
                                    text-white/50
                                "
                            >
                                Nota administrativa
                            </label>


                            <textarea
                                id="withdrawal-notes"

                                rows={
                                    4
                                }

                                value={
                                    notes
                                }

                                onChange={(
                                    event
                                ) =>
                                    setNotes(
                                        event.target.value
                                    )
                                }

                                placeholder="Ej.: transferencia realizada, motivo de rechazo, referencia bancaria..."

                                className="
                                    mt-2
                                    w-full
                                    resize-none
                                    rounded-xl
                                    border
                                    border-white/10
                                    bg-white/[0.04]
                                    px-4
                                    py-3
                                    text-sm
                                    text-white
                                    outline-none
                                    placeholder:text-white/25
                                    focus:border-[#C1317F]
                                "
                            />

                        </div>


                        {/* ACCIONES */}

                        {(selectedWithdrawal.status ===
                            "pending" ||
                            selectedWithdrawal.status ===
                            "processing") && (

                                <div
                                    className="
                                        mt-6
                                        grid
                                        grid-cols-1
                                        gap-3

                                        sm:grid-cols-2
                                    "
                                >

                                    {selectedWithdrawal.status ===
                                        "pending" && (

                                            <button
                                                type="button"

                                                disabled={
                                                    busyId ===
                                                    selectedWithdrawal.id
                                                }

                                                onClick={() =>
                                                    handleAction(
                                                        selectedWithdrawal,
                                                        "processing"
                                                    )
                                                }

                                                className="
                                                    min-h-[48px]
                                                    rounded-xl
                                                    border
                                                    border-blue-500/30
                                                    bg-blue-500/10
                                                    px-4
                                                    text-xs
                                                    font-black
                                                    uppercase
                                                    tracking-wider
                                                    text-blue-300
                                                    disabled:opacity-50
                                                "
                                            >
                                                En proceso
                                            </button>

                                        )}


                                    <button
                                        type="button"

                                        disabled={
                                            busyId ===
                                            selectedWithdrawal.id
                                        }

                                        onClick={() =>
                                            handleAction(
                                                selectedWithdrawal,
                                                "paid"
                                            )
                                        }

                                        className="
                                            min-h-[48px]
                                            rounded-xl
                                            bg-emerald-500
                                            px-4
                                            text-xs
                                            font-black
                                            uppercase
                                            tracking-wider
                                            text-white
                                            disabled:opacity-50
                                        "
                                    >
                                        Marcar pagado
                                    </button>


                                    <button
                                        type="button"

                                        disabled={
                                            busyId ===
                                            selectedWithdrawal.id
                                        }

                                        onClick={() =>
                                            handleAction(
                                                selectedWithdrawal,
                                                "rejected"
                                            )
                                        }

                                        className="
                                            min-h-[48px]
                                            rounded-xl
                                            border
                                            border-red-500/30
                                            bg-red-500/10
                                            px-4
                                            text-xs
                                            font-black
                                            uppercase
                                            tracking-wider
                                            text-red-300
                                            disabled:opacity-50

                                            sm:col-span-2
                                        "
                                    >
                                        Rechazar retiro
                                    </button>

                                </div>

                            )}

                    </div>

                </div>

            )}

        </main>
    );
}


/*
 * =========================================================
 * COMPONENTES
 * =========================================================
 */

function AdminStat({
    label,
    value,
}: {
    label: string;
    value: string;
}) {

    return (

        <div
            className="
                rounded-2xl
                border
                border-white/10
                bg-white/[0.04]
                p-5
            "
        >

            <p
                className="
                    text-[9px]
                    font-black
                    uppercase
                    tracking-[0.14em]
                    text-white/35
                "
            >
                {label}
            </p>


            <p
                className="
                    mt-2
                    text-2xl
                    font-black
                    text-white
                "
            >
                {value}
            </p>

        </div>
    );
}


function FilterButton({
    active,
    onClick,
    children,
}: {
    active: boolean;

    onClick: () => void;

    children:
    React.ReactNode;
}) {

    return (

        <button
            type="button"

            onClick={
                onClick
            }

            className={`
                rounded-xl
                border
                px-4
                py-2.5
                text-xs
                font-black
                transition

                ${active
                    ? "border-[#C1317F] bg-[#C1317F] text-white"
                    : "border-white/10 bg-white/[0.03] text-white/50 hover:bg-white/[0.06]"
                }
            `}
        >
            {children}
        </button>
    );
}


function WithdrawalCard({
    withdrawal,
    busy,
    onSelect,
}: {
    withdrawal: Withdrawal;

    busy: boolean;

    onSelect:
    () => void;
}) {

    const statusData =
        getStatusData(
            withdrawal.status
        );


    return (

        <article
            className="
                rounded-3xl
                border
                border-white/10
                bg-white/[0.035]
                p-5

                md:p-6
            "
        >

            <div
                className="
                    flex
                    flex-col
                    gap-5

                    lg:flex-row
                    lg:items-center
                    lg:justify-between
                "
            >

                <div
                    className="
                        grid
                        flex-1
                        grid-cols-1
                        gap-4

                        sm:grid-cols-2
                        lg:grid-cols-4
                    "
                >

                    <div>

                        <p className="text-[9px] font-black uppercase text-white/30">
                            Valor
                        </p>

                        <p className="mt-1 text-2xl font-black">
                            $
                            {Number(
                                withdrawal.amount
                            ).toFixed(
                                2
                            )}
                        </p>

                    </div>


                    <div>

                        <p className="text-[9px] font-black uppercase text-white/30">
                            Banco
                        </p>

                        <p className="mt-1 text-sm font-black text-white/80">
                            {withdrawal.bankName}
                        </p>

                        <p className="mt-1 text-xs text-white/40">
                            {withdrawal.accountNumber}
                        </p>

                    </div>


                    <div>

                        <p className="text-[9px] font-black uppercase text-white/30">
                            Titular
                        </p>

                        <p className="mt-1 text-sm font-black text-white/80">
                            {withdrawal.accountHolder}
                        </p>

                        <p className="mt-1 text-xs text-white/40">
                            {withdrawal.identification}
                        </p>

                    </div>


                    <div>

                        <p className="text-[9px] font-black uppercase text-white/30">
                            Solicitud
                        </p>

                        <p className="mt-1 text-sm font-bold text-white/70">
                            {new Date(
                                withdrawal.requestedAt
                            ).toLocaleDateString(
                                "es-EC"
                            )}
                        </p>

                    </div>

                </div>


                <div
                    className="
                        flex
                        items-center
                        gap-3
                    "
                >

                    <span
                        className={`
                            rounded-full
                            px-3
                            py-2
                            text-[9px]
                            font-black
                            uppercase
                            tracking-wider

                            ${statusData.className}
                        `}
                    >
                        {statusData.label}
                    </span>


                    <button
                        type="button"

                        disabled={
                            busy
                        }

                        onClick={
                            onSelect
                        }

                        className="
                            min-h-[42px]
                            rounded-xl
                            bg-white
                            px-4
                            text-xs
                            font-black
                            text-black
                            transition
                            hover:bg-white/90
                            disabled:opacity-50
                        "
                    >
                        Revisar
                    </button>

                </div>

            </div>

        </article>
    );
}


function AdminDetail({
    label,
    value,
}: {
    label: string;

    value:
    string |
    null |
    undefined;
}) {

    return (

        <div
            className="
                flex
                items-start
                justify-between
                gap-4
                border-b
                border-white/[0.06]
                py-3
                first:pt-0
                last:border-0
                last:pb-0
            "
        >

            <span
                className="
                    text-xs
                    font-semibold
                    text-white/35
                "
            >
                {label}
            </span>


            <span
                className="
                    text-right
                    text-sm
                    font-black
                    text-white/85
                "
            >
                {value || "—"}
            </span>

        </div>
    );
}


function getStatusData(
    status:
        WithdrawalStatus
) {

    if (
        status ===
        "paid"
    ) {

        return {
            label:
                "Pagado",

            className:
                "bg-emerald-500/15 text-emerald-300",
        };
    }


    if (
        status ===
        "processing"
    ) {

        return {
            label:
                "En proceso",

            className:
                "bg-blue-500/15 text-blue-300",
        };
    }


    if (
        status ===
        "rejected"
    ) {

        return {
            label:
                "Rechazado",

            className:
                "bg-red-500/15 text-red-300",
        };
    }


    if (
        status ===
        "cancelled"
    ) {

        return {
            label:
                "Cancelado",

            className:
                "bg-white/10 text-white/50",
        };
    }


    return {
        label:
            "Pendiente",

        className:
            "bg-amber-500/15 text-amber-300",
    };
}