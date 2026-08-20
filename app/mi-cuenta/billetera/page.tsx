"use client";

import {
    useEffect,
    useState,
} from "react";

import Link from "next/link";

import {
    useRouter,
} from "next/navigation";

import {
    supabaseBrowser,
} from "@/lib/supabaseClient";


type BarukWallet = {
    availableBalance: number;
    pendingBalance: number;
    totalBalance: number;
    updatedAt: string | null;
};


type BarukWalletSettings = {
    marketplaceCommissionRate: number;
    minWithdrawalAmount: number;
};


type BarukWalletSummary = {
    totalIncome: number;
    totalWithdrawn: number;
    totalPendingWithdrawal: number;

    positiveAdjustments: number;
    negativeAdjustments: number;

    marketplace: {
        completedSales: number;
        totalSold: number;
        totalEarned: number;
        platformCommission: number;
    };

    affiliate: {
        commissionsEarned: number;
    };

    prizes: {
        cashEarned: number;
    };
};


type BarukIncomeBreakdown = {
    marketplaceSales: number;
    affiliateCommissions: number;
    cashPrizes: number;
    adjustments: number;
};


type BarukWalletMovement = {
    type:
    | "sale_credit"
    | "affiliate_commission"
    | "cash_prize"
    | "withdrawal"
    | "adjustment"
    | string;

    label: string;

    amount: number;

    direction:
    | "credit"
    | "debit";

    reference:
    | string
    | null;

    description:
    | string
    | null;

    metadata:
    Record<string, unknown>
    | null;

    createdAt: string;
};


type MarketplacePayoutAccount = {
    id: string;

    bankName: string;

    accountType:
    | "savings"
    | "checking"
    | string;

    accountNumberMasked: string;

    accountHolder: string;

    identification: string;

    isDefault: boolean;
};


type MarketplaceWithdrawal = {
    id: string;

    amount: number;

    status: string;

    bankName: string;

    accountType: string;

    accountNumberMasked: string;

    requestedAt: string;

    paidAt: string | null;

    rejectedAt: string | null;

    adminNotes: string | null;
};


export default function MiBilleteraPage() {

    const router =
        useRouter();


    const [
        checkingSession,
        setCheckingSession,
    ] =
        useState(true);


    const [
        loadingWallet,
        setLoadingWallet,
    ] =
        useState(false);


    const [
        wallet,
        setWallet,
    ] =
        useState<BarukWallet | null>(
            null
        );


    const [
        walletSettings,
        setWalletSettings,
    ] =
        useState<BarukWalletSettings | null>(
            null
        );


    const [
        walletSummary,
        setWalletSummary,
    ] =
        useState<BarukWalletSummary | null>(
            null
        );

    const [
        incomeBreakdown,
        setIncomeBreakdown,
    ] =
        useState<BarukIncomeBreakdown | null>(
            null
        );


    const [
        movements,
        setMovements,
    ] =
        useState<BarukWalletMovement[]>(
            []
        );

    const [
        payoutAccount,
        setPayoutAccount,
    ] =
        useState<MarketplacePayoutAccount | null>(
            null
        );


    const [
        withdrawals,
        setWithdrawals,
    ] =
        useState<MarketplaceWithdrawal[]>(
            []
        );


    const [
        showPayoutForm,
        setShowPayoutForm,
    ] =
        useState(false);


    const [
        payoutBankName,
        setPayoutBankName,
    ] =
        useState("");


    const [
        payoutAccountType,
        setPayoutAccountType,
    ] =
        useState<
            "savings" |
            "checking"
        >("savings");


    const [
        payoutAccountNumber,
        setPayoutAccountNumber,
    ] =
        useState("");


    const [
        payoutAccountHolder,
        setPayoutAccountHolder,
    ] =
        useState("");


    const [
        payoutIdentification,
        setPayoutIdentification,
    ] =
        useState("");


    const [
        withdrawalAmount,
        setWithdrawalAmount,
    ] =
        useState("");


    const [
        walletBusy,
        setWalletBusy,
    ] =
        useState<
            "account" |
            "withdraw" |
            null
        >(null);


    const [
        error,
        setError,
    ] =
        useState<string | null>(
            null
        );


    const [
        message,
        setMessage,
    ] =
        useState<string | null>(
            null
        );


    /*
     * =========================================================
     * CARGAR BILLETERA
     * =========================================================
     */

    async function loadWallet(
        accessToken: string
    ) {

        setLoadingWallet(
            true
        );

        try {

            const response =
                await fetch(
                    "/api/marketplace/wallet",
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
                await response.json();


            if (
                !response.ok ||
                !data?.ok
            ) {
                throw new Error(
                    data?.error ??
                    "No se pudo cargar tu billetera."
                );
            }


            setWallet(
                data.wallet ??
                null
            );


            setWalletSettings(
                data.settings ??
                null
            );


            setWalletSummary(
                data.summary ??
                null
            );

            setIncomeBreakdown(
                data.incomeBreakdown ??
                null
            );


            setMovements(
                data.movements ??
                []
            );

            setPayoutAccount(
                data.payoutAccount ??
                null
            );


            setWithdrawals(
                data.withdrawals ??
                []
            );

        } finally {

            setLoadingWallet(
                false
            );
        }
    }


    /*
     * =========================================================
     * SESIÓN
     * =========================================================
     */

    useEffect(() => {

        let active =
            true;


        async function initialize() {

            try {

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
                    sessionData.session;


                if (!session) {

                    router.replace(
                        "/mi-cuenta"
                    );

                    return;
                }


                if (
                    active
                ) {
                    await loadWallet(
                        session.access_token
                    );
                }

            } catch (
            err: unknown
            ) {

                if (!active) {
                    return;
                }


                setError(
                    err instanceof Error
                        ? err.message
                        : "No se pudo cargar tu billetera."
                );

            } finally {

                if (active) {

                    setCheckingSession(
                        false
                    );
                }
            }
        }


        void initialize();


        return () => {

            active =
                false;
        };

    }, [
        router,
    ]);


    /*
     * =========================================================
     * GUARDAR CUENTA BANCARIA
     * =========================================================
     */

    async function handleSavePayoutAccount() {

        if (
            !payoutBankName.trim() ||
            !payoutAccountNumber.trim() ||
            !payoutAccountHolder.trim() ||
            !payoutIdentification.trim()
        ) {

            setError(
                "Completa todos los datos de la cuenta bancaria."
            );

            return;
        }


        setWalletBusy(
            "account"
        );

        setError(
            null
        );

        setMessage(
            null
        );


        try {

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
                sessionData.session;


            if (!session) {

                throw new Error(
                    "Tu sesión ha finalizado."
                );
            }


            const response =
                await fetch(
                    "/api/marketplace/wallet/payout-account",
                    {
                        method:
                            "POST",

                        headers: {

                            Authorization:
                                `Bearer ${session.access_token}`,

                            "Content-Type":
                                "application/json",
                        },

                        body:
                            JSON.stringify({

                                bankName:
                                    payoutBankName,

                                accountType:
                                    payoutAccountType,

                                accountNumber:
                                    payoutAccountNumber,

                                accountHolder:
                                    payoutAccountHolder,

                                identification:
                                    payoutIdentification,
                            }),
                    }
                );


            const data =
                await response.json();


            if (
                !response.ok ||
                !data?.ok
            ) {

                throw new Error(
                    data?.error ??
                    "No se pudo guardar la cuenta bancaria."
                );
            }


            setPayoutBankName(
                ""
            );

            setPayoutAccountNumber(
                ""
            );

            setPayoutAccountHolder(
                ""
            );

            setPayoutIdentification(
                ""
            );

            setShowPayoutForm(
                false
            );


            setMessage(
                "Cuenta bancaria guardada correctamente."
            );


            await loadWallet(
                session.access_token
            );

        } catch (
        err: unknown
        ) {

            setError(
                err instanceof Error
                    ? err.message
                    : "No se pudo guardar la cuenta bancaria."
            );

        } finally {

            setWalletBusy(
                null
            );
        }
    }


    /*
     * =========================================================
     * SOLICITAR RETIRO
     * =========================================================
     */

    async function handleRequestWithdrawal() {

        const amount =
            Number(
                withdrawalAmount
            );


        if (
            !Number.isFinite(
                amount
            ) ||
            amount <= 0
        ) {

            setError(
                "Ingresa un monto válido para retirar."
            );

            return;
        }


        if (
            !payoutAccount
        ) {

            setError(
                "Primero debes registrar una cuenta bancaria."
            );

            return;
        }


        const minimum =
            walletSettings
                ?.minWithdrawalAmount ??
            10;


        if (
            amount <
            minimum
        ) {

            setError(
                `El retiro mínimo es de $${minimum.toFixed(
                    2
                )}.`
            );

            return;
        }


        if (
            amount >
            (
                wallet
                    ?.availableBalance ??
                0
            )
        ) {

            setError(
                "No tienes saldo suficiente para solicitar este retiro."
            );

            return;
        }


        setWalletBusy(
            "withdraw"
        );

        setError(
            null
        );

        setMessage(
            null
        );


        try {

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
                sessionData.session;


            if (!session) {

                throw new Error(
                    "Tu sesión ha finalizado."
                );
            }


            const response =
                await fetch(
                    "/api/marketplace/wallet/withdraw",
                    {
                        method:
                            "POST",

                        headers: {

                            Authorization:
                                `Bearer ${session.access_token}`,

                            "Content-Type":
                                "application/json",
                        },

                        body:
                            JSON.stringify({

                                payoutAccountId:
                                    payoutAccount.id,

                                amount,
                            }),
                    }
                );


            const data =
                await response.json();


            if (
                !response.ok ||
                !data?.ok
            ) {

                throw new Error(
                    data?.error ??
                    "No se pudo solicitar el retiro."
                );
            }


            setWithdrawalAmount(
                ""
            );


            setMessage(
                "Solicitud de retiro registrada correctamente."
            );


            await loadWallet(
                session.access_token
            );

        } catch (
        err: unknown
        ) {

            setError(
                err instanceof Error
                    ? err.message
                    : "No se pudo solicitar el retiro."
            );

        } finally {

            setWalletBusy(
                null
            );
        }
    }


    /*
     * =========================================================
     * CARGANDO
     * =========================================================
     */

    if (
        checkingSession
    ) {

        return (

            <main
                className="
                    flex
                    min-h-screen
                    items-center
                    justify-center
                    bg-white
                    px-4
                "
            >

                <div className="text-center">

                    <div
                        className="
                            mx-auto
                            h-10
                            w-10
                            animate-spin
                            rounded-full
                            border-4
                            border-gray-200
                            border-t-[#C1317F]
                        "
                    />

                    <p
                        className="
                            mt-4
                            text-sm
                            font-semibold
                            text-gray-500
                        "
                    >
                        Preparando tu billetera...
                    </p>

                </div>

            </main>
        );
    }


    const commissionPercent =
        (
            walletSettings
                ?.marketplaceCommissionRate ??
            0.10
        ) *
        100;


    /*
     * =========================================================
     * RENDER
     * =========================================================
     */

    return (

        <main
            className="
                min-h-screen
                bg-[#fafafa]
                px-4
                pb-20
                pt-24

                sm:px-6
                lg:px-8
            "
        >

            <div
                className="
                    mx-auto
                    w-full
                    max-w-6xl
                "
            >

                {/* CABECERA */}

                <div
                    className="
                        flex
                        flex-col
                        gap-5

                        sm:flex-row
                        sm:items-end
                        sm:justify-between
                    "
                >

                    <div>

                        <p
                            className="
                                text-xs
                                font-black
                                uppercase
                                tracking-[0.22em]
                                text-[#C1317F]
                            "
                        >
                            BARUK593
                        </p>

                        <h1
                            className="
                                mt-2
                                text-3xl
                                font-black
                                tracking-[-0.03em]
                                text-[#171717]

                                md:text-4xl
                            "
                        >
                            Mi billetera
                        </h1>

                        <p
                            className="
                                mt-2
                                max-w-xl
                                text-sm
                                leading-6
                                text-slate-500
                            "
                        >
                            Todas tus ganancias en un solo lugar:
                            comisiones de afiliado, ventas de F1 Spheres,
                            premios en efectivo y retiros.
                        </p>

                    </div>


                    <Link
                        href="/mi-cuenta"

                        className="
                            inline-flex
                            min-h-[44px]
                            items-center
                            justify-center
                            rounded-xl
                            border
                            border-slate-200
                            bg-white
                            px-5
                            text-sm
                            font-black
                            text-slate-700
                            transition
                            hover:border-[#C1317F]/30
                            hover:text-[#C1317F]
                        "
                    >
                        ← Volver a Mi cuenta
                    </Link>

                </div>


                {/* ERROR */}

                {error && (

                    <div
                        className="
                            mt-6
                            rounded-xl
                            border
                            border-red-100
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


                {/* ÉXITO */}

                {message && (

                    <div
                        className="
                            mt-6
                            rounded-xl
                            border
                            border-emerald-100
                            bg-emerald-50
                            px-4
                            py-3
                            text-sm
                            font-semibold
                            text-emerald-700
                        "
                    >
                        {message}
                    </div>

                )}


                {/* SALDOS */}

                <div
                    className="
                        mt-8
                        grid
                        grid-cols-1
                        gap-4

                        md:grid-cols-2
                    "
                >

                    <div
                        className="
                            rounded-3xl
                            bg-[#C1317F]
                            p-7
                            text-white
                            shadow-[0_15px_40px_rgba(193,49,127,0.18)]
                        "
                    >

                        <p
                            className="
                                text-[10px]
                                font-black
                                uppercase
                                tracking-[0.18em]
                                text-white/70
                            "
                        >
                            Saldo disponible
                        </p>

                        <p
                            className="
                                mt-3
                                text-5xl
                                font-black
                                tracking-[-0.04em]
                            "
                        >
                            $
                            {Number(
                                wallet
                                    ?.availableBalance ??
                                0
                            ).toFixed(
                                2
                            )}
                        </p>

                        <p
                            className="
                                mt-3
                                text-xs
                                text-white/70
                            "
                        >
                            Dinero disponible para solicitar retiro.
                        </p>

                    </div>


                    <div
                        className="
                            rounded-3xl
                            border
                            border-slate-200
                            bg-white
                            p-7
                        "
                    >

                        <p
                            className="
                                text-[10px]
                                font-black
                                uppercase
                                tracking-[0.18em]
                                text-slate-400
                            "
                        >
                            Saldo en proceso
                        </p>

                        <p
                            className="
                                mt-3
                                text-5xl
                                font-black
                                tracking-[-0.04em]
                                text-[#171717]
                            "
                        >
                            $
                            {Number(
                                wallet
                                    ?.pendingBalance ??
                                0
                            ).toFixed(
                                2
                            )}
                        </p>

                        <p
                            className="
                                mt-3
                                text-xs
                                text-slate-400
                            "
                        >
                            Fondos asociados a retiros pendientes o en proceso.
                        </p>

                    </div>

                </div>


                {/* =====================================================
                    ORIGEN DE TUS GANANCIAS
                ===================================================== */}

                <section className="mt-8">

                    <div>

                        <p
                            className="
                                text-[10px]
                                font-black
                                uppercase
                                tracking-[0.18em]
                                text-[#C1317F]
                            "
                        >
                            Tus ganancias
                        </p>

                        <h2
                            className="
                                mt-2
                                text-2xl
                                font-black
                                text-[#171717]
                            "
                        >
                            ¿De dónde viene tu saldo?
                        </h2>

                    </div>


                    <div
                        className="
                            mt-5
                            grid
                            grid-cols-2
                            gap-3

                            lg:grid-cols-4
                        "
                    >

                        <WalletStat
                            label="Comisiones de afiliado"
                            value={`$${Number(
                                incomeBreakdown
                                    ?.affiliateCommissions ??
                                0
                            ).toFixed(2)}`}
                        />


                        <WalletStat
                            label="Ventas de F1 Sphere"
                            value={`$${Number(
                                incomeBreakdown
                                    ?.marketplaceSales ??
                                0
                            ).toFixed(2)}`}
                        />


                        <WalletStat
                            label="Premios en efectivo"
                            value={`$${Number(
                                incomeBreakdown
                                    ?.cashPrizes ??
                                0
                            ).toFixed(2)}`}
                        />


                        <WalletStat
                            label="Otros ingresos"
                            value={`$${Number(
                                incomeBreakdown
                                    ?.adjustments ??
                                0
                            ).toFixed(2)}`}
                        />

                    </div>


                    <div
                        className="
                            mt-3
                            grid
                            grid-cols-2
                            gap-3

                            lg:grid-cols-4
                        "
                    >

                        <WalletStat
                            label="Ingresos registrados"
                            value={`$${Number(
                                walletSummary
                                    ?.totalIncome ??
                                0
                            ).toFixed(2)}`}
                        />


                        <WalletStat
                            label="Total retirado"
                            value={`$${Number(
                                walletSummary
                                    ?.totalWithdrawn ??
                                0
                            ).toFixed(2)}`}
                        />


                        <WalletStat
                            label="Ventas de esferas"
                            value={
                                String(
                                    walletSummary
                                        ?.marketplace
                                        ?.completedSales ??
                                    0
                                )
                            }
                        />


                        <WalletStat
                            label={`Comisión Marketplace ${commissionPercent.toFixed(
                                0
                            )}%`}
                            value={`$${Number(
                                walletSummary
                                    ?.marketplace
                                    ?.platformCommission ??
                                0
                            ).toFixed(2)}`}
                        />

                    </div>

                </section>


                {/* CUENTA + RETIRO */}

                <div
                    className="
                        mt-8
                        grid
                        grid-cols-1
                        gap-5

                        lg:grid-cols-2
                    "
                >

                    {/* CUENTA BANCARIA */}

                    <section
                        className="
                            rounded-3xl
                            border
                            border-slate-200
                            bg-white
                            p-6

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
                                        tracking-[0.18em]
                                        text-slate-400
                                    "
                                >
                                    Datos bancarios
                                </p>

                                <h2
                                    className="
                                        mt-2
                                        text-xl
                                        font-black
                                        text-[#171717]
                                    "
                                >
                                    Cuenta para retiros
                                </h2>

                            </div>


                            <button
                                type="button"

                                onClick={() => {

                                    setShowPayoutForm(
                                        current =>
                                            !current
                                    );

                                    setError(
                                        null
                                    );

                                    setMessage(
                                        null
                                    );
                                }}

                                className="
                                    shrink-0
                                    rounded-xl
                                    border
                                    border-[#C1317F]/20
                                    bg-[#C1317F]/5
                                    px-4
                                    py-2.5
                                    text-xs
                                    font-black
                                    text-[#C1317F]
                                "
                            >
                                {payoutAccount
                                    ? "Cambiar"
                                    : "Agregar"
                                }
                            </button>

                        </div>


                        {payoutAccount ? (

                            <div
                                className="
                                    mt-5
                                    rounded-2xl
                                    bg-slate-50
                                    p-5
                                "
                            >

                                <p
                                    className="
                                        font-black
                                        text-slate-900
                                    "
                                >
                                    {
                                        payoutAccount
                                            .bankName
                                    }
                                </p>

                                <p
                                    className="
                                        mt-2
                                        text-sm
                                        text-slate-500
                                    "
                                >
                                    {payoutAccount.accountType ===
                                        "savings"
                                        ? "Cuenta de ahorros"
                                        : "Cuenta corriente"
                                    }

                                    {" · "}

                                    {
                                        payoutAccount
                                            .accountNumberMasked
                                    }
                                </p>

                                <p
                                    className="
                                        mt-2
                                        text-xs
                                        text-slate-400
                                    "
                                >
                                    {
                                        payoutAccount
                                            .accountHolder
                                    }
                                </p>

                            </div>

                        ) : (

                            <div
                                className="
                                    mt-5
                                    rounded-2xl
                                    bg-slate-50
                                    p-5
                                    text-sm
                                    text-slate-500
                                "
                            >
                                Todavía no tienes una cuenta bancaria configurada.
                            </div>

                        )}


                        {showPayoutForm && (

                            <div
                                className="
                                    mt-5
                                    grid
                                    grid-cols-1
                                    gap-3
                                    border-t
                                    border-slate-100
                                    pt-5
                                "
                            >

                                <WalletInput
                                    value={
                                        payoutBankName
                                    }

                                    onChange={
                                        setPayoutBankName
                                    }

                                    placeholder="Nombre del banco"
                                />


                                <select
                                    value={
                                        payoutAccountType
                                    }

                                    onChange={(
                                        event
                                    ) =>
                                        setPayoutAccountType(
                                            event.target.value as
                                            "savings" |
                                            "checking"
                                        )
                                    }

                                    className="
                                        min-h-[48px]
                                        rounded-xl
                                        border
                                        border-slate-200
                                        bg-white
                                        px-4
                                        text-sm
                                        text-slate-800
                                        outline-none
                                        focus:border-[#C1317F]
                                    "
                                >

                                    <option value="savings">
                                        Cuenta de ahorros
                                    </option>

                                    <option value="checking">
                                        Cuenta corriente
                                    </option>

                                </select>


                                <WalletInput
                                    value={
                                        payoutAccountNumber
                                    }

                                    onChange={
                                        setPayoutAccountNumber
                                    }

                                    placeholder="Número de cuenta"
                                />


                                <WalletInput
                                    value={
                                        payoutAccountHolder
                                    }

                                    onChange={
                                        setPayoutAccountHolder
                                    }

                                    placeholder="Titular de la cuenta"
                                />


                                <WalletInput
                                    value={
                                        payoutIdentification
                                    }

                                    onChange={
                                        setPayoutIdentification
                                    }

                                    placeholder="Cédula / identificación"
                                />


                                <button
                                    type="button"

                                    disabled={
                                        walletBusy ===
                                        "account"
                                    }

                                    onClick={
                                        handleSavePayoutAccount
                                    }

                                    className="
                                        min-h-[48px]
                                        rounded-xl
                                        bg-[#C1317F]
                                        px-5
                                        text-sm
                                        font-black
                                        text-white
                                        transition
                                        hover:bg-[#ad296f]
                                        disabled:opacity-50
                                    "
                                >
                                    {walletBusy ===
                                        "account"
                                        ? "Guardando..."
                                        : "Guardar cuenta"
                                    }
                                </button>

                            </div>

                        )}

                    </section>


                    {/* SOLICITAR RETIRO */}

                    <section
                        className="
                            rounded-3xl
                            border
                            border-slate-200
                            bg-white
                            p-6

                            md:p-7
                        "
                    >

                        <p
                            className="
                                text-[10px]
                                font-black
                                uppercase
                                tracking-[0.18em]
                                text-slate-400
                            "
                        >
                            Retirar fondos
                        </p>

                        <h2
                            className="
                                mt-2
                                text-xl
                                font-black
                                text-[#171717]
                            "
                        >
                            Solicitar retiro
                        </h2>

                        <p
                            className="
                                mt-2
                                text-sm
                                leading-6
                                text-slate-500
                            "
                        >
                            El monto mínimo de retiro es de{" "}
                            <strong>
                                $
                                {Number(
                                    walletSettings
                                        ?.minWithdrawalAmount ??
                                    10
                                ).toFixed(
                                    2
                                )}
                            </strong>.
                        </p>


                        <div
                            className="
                                mt-5
                                rounded-2xl
                                bg-slate-50
                                p-5
                            "
                        >

                            <label
                                htmlFor="withdrawal-amount"

                                className="
                                    text-xs
                                    font-black
                                    text-slate-700
                                "
                            >
                                Monto a retirar
                            </label>


                            <div
                                className="
                                    mt-2
                                    flex
                                    min-h-[50px]
                                    items-center
                                    rounded-xl
                                    border
                                    border-slate-200
                                    bg-white
                                    px-4
                                "
                            >

                                <span
                                    className="
                                        mr-2
                                        font-black
                                        text-slate-400
                                    "
                                >
                                    $
                                </span>


                                <input
                                    id="withdrawal-amount"

                                    type="number"

                                    min="0"

                                    step="0.01"

                                    value={
                                        withdrawalAmount
                                    }

                                    onChange={(
                                        event
                                    ) =>
                                        setWithdrawalAmount(
                                            event.target.value
                                        )
                                    }

                                    placeholder="0.00"

                                    className="
                                        min-w-0
                                        flex-1
                                        bg-transparent
                                        text-lg
                                        font-black
                                        text-slate-900
                                        outline-none
                                    "
                                />

                            </div>


                            <button
                                type="button"

                                disabled={
                                    walletBusy ===
                                    "withdraw" ||
                                    !payoutAccount ||
                                    (
                                        wallet
                                            ?.availableBalance ??
                                        0
                                    ) <= 0
                                }

                                onClick={
                                    handleRequestWithdrawal
                                }

                                className="
                                    mt-4
                                    min-h-[48px]
                                    w-full
                                    rounded-xl
                                    bg-[#171717]
                                    px-5
                                    text-xs
                                    font-black
                                    uppercase
                                    tracking-[0.05em]
                                    text-white
                                    transition
                                    hover:bg-black
                                    disabled:cursor-not-allowed
                                    disabled:opacity-35
                                "
                            >
                                {walletBusy ===
                                    "withdraw"
                                    ? "Procesando..."
                                    : "Solicitar retiro"
                                }
                            </button>


                            {!payoutAccount && (

                                <p
                                    className="
                                        mt-3
                                        text-center
                                        text-[11px]
                                        text-slate-400
                                    "
                                >
                                    Configura primero una cuenta bancaria.
                                </p>

                            )}

                        </div>

                    </section>

                </div>

                {/* =====================================================
                    MOVIMIENTOS DE BILLETERA
                ===================================================== */}

                <section
                    className="
                        mt-8
                        rounded-3xl
                        border
                        border-slate-200
                        bg-white
                        p-6

                        md:p-7
                    "
                >

                    <div>

                        <p
                            className="
                                text-[10px]
                                font-black
                                uppercase
                                tracking-[0.18em]
                                text-[#C1317F]
                            "
                        >
                            Billetera Baruk593
                        </p>

                        <h2
                            className="
                                mt-2
                                text-xl
                                font-black
                                text-[#171717]
                            "
                        >
                            Movimientos
                        </h2>

                        <p
                            className="
                                mt-2
                                text-sm
                                text-slate-500
                            "
                        >
                            Aquí puedes revisar el origen de tus
                            ingresos y los retiros realizados.
                        </p>

                    </div>


                    {movements.length === 0 ? (

                        <div
                            className="
                                mt-5
                                rounded-2xl
                                bg-slate-50
                                p-6
                                text-center
                            "
                        >

                            <p
                                className="
                                    text-sm
                                    font-bold
                                    text-slate-500
                                "
                            >
                                Todavía no tienes movimientos
                                registrados en tu billetera.
                            </p>

                        </div>

                    ) : (

                        <div className="mt-5 space-y-3">

                            {movements.map(
                                (
                                    movement,
                                    index
                                ) => (

                                    <WalletMovementRow
                                        key={
                                            movement.reference ??
                                            `${movement.type}-${movement.createdAt}-${index}`
                                        }

                                        movement={
                                            movement
                                        }
                                    />

                                )
                            )}

                        </div>

                    )}

                </section>

                {/* HISTORIAL */}

                <section
                    className="
                        mt-8
                        rounded-3xl
                        border
                        border-slate-200
                        bg-white
                        p-6

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
                                    text-[10px]
                                    font-black
                                    uppercase
                                    tracking-[0.18em]
                                    text-slate-400
                                "
                            >
                                Historial
                            </p>

                            <h2
                                className="
                                    mt-2
                                    text-xl
                                    font-black
                                    text-[#171717]
                                "
                            >
                                Mis retiros
                            </h2>

                        </div>


                        {loadingWallet && (

                            <div
                                className="
                                    h-6
                                    w-6
                                    animate-spin
                                    rounded-full
                                    border-4
                                    border-slate-200
                                    border-t-[#C1317F]
                                "
                            />

                        )}

                    </div>


                    {withdrawals.length ===
                        0 ? (

                        <div
                            className="
                                mt-5
                                rounded-2xl
                                bg-slate-50
                                p-6
                                text-center
                            "
                        >

                            <p
                                className="
                                    text-sm
                                    font-bold
                                    text-slate-500
                                "
                            >
                                Todavía no has solicitado retiros.
                            </p>

                        </div>

                    ) : (

                        <div
                            className="
                                mt-5
                                space-y-3
                            "
                        >

                            {withdrawals.map(
                                (
                                    withdrawal
                                ) => (

                                    <WithdrawalRow
                                        key={
                                            withdrawal.id
                                        }

                                        withdrawal={
                                            withdrawal
                                        }
                                    />

                                )
                            )}

                        </div>

                    )}

                </section>

            </div>

        </main>
    );
}


/*
 * =========================================================
 * COMPONENTES PEQUEÑOS
 * =========================================================
 */

function WalletStat({
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
                border-slate-200
                bg-white
                p-4
            "
        >

            <p
                className="
                    text-[9px]
                    font-black
                    uppercase
                    tracking-[0.12em]
                    text-slate-400
                "
            >
                {label}
            </p>

            <p
                className="
                    mt-2
                    text-xl
                    font-black
                    text-[#171717]
                "
            >
                {value}
            </p>

        </div>
    );
}


function WalletInput({
    value,
    onChange,
    placeholder,
}: {
    value: string;
    onChange: (
        value: string
    ) => void;
    placeholder: string;
}) {

    return (

        <input
            type="text"

            value={
                value
            }

            onChange={(
                event
            ) =>
                onChange(
                    event.target.value
                )
            }

            placeholder={
                placeholder
            }

            className="
                min-h-[48px]
                rounded-xl
                border
                border-slate-200
                bg-white
                px-4
                text-sm
                text-slate-900
                outline-none
                transition
                focus:border-[#C1317F]
            "
        />
    );
}

function WalletMovementRow({
    movement,
}: {
    movement:
    BarukWalletMovement;
}) {

    const isCredit =
        Number(
            movement.amount
        ) >= 0;


    const icon =
        movement.type ===
            "affiliate_commission"

            ? "↗"

            : movement.type ===
                "sale_credit"

                ? "◉"

                : movement.type ===
                    "cash_prize"

                    ? "★"

                    : movement.type ===
                        "withdrawal"

                        ? "↓"

                        : "•";


    return (

        <div
            className="
                flex
                items-center
                justify-between
                gap-4
                rounded-2xl
                border
                border-slate-100
                px-4
                py-4

                sm:px-5
            "
        >

            <div
                className="
                    flex
                    min-w-0
                    items-center
                    gap-3
                "
            >

                <div
                    className={`
                        flex
                        h-10
                        w-10
                        shrink-0
                        items-center
                        justify-center
                        rounded-xl
                        text-sm
                        font-black

                        ${isCredit
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }
                    `}
                >
                    {icon}
                </div>


                <div className="min-w-0">

                    <p
                        className="
                            truncate
                            text-sm
                            font-black
                            text-slate-800
                        "
                    >
                        {movement.label}
                    </p>


                    {movement.description && (

                        <p
                            className="
                                mt-0.5
                                truncate
                                text-[11px]
                                text-slate-400
                            "
                        >
                            {movement.description}
                        </p>

                    )}


                    <p
                        className="
                            mt-1
                            text-[10px]
                            text-slate-400
                        "
                    >
                        {new Date(
                            movement.createdAt
                        ).toLocaleDateString(
                            "es-EC"
                        )}
                    </p>

                </div>

            </div>


            <p
                className={`
                    shrink-0
                    text-base
                    font-black

                    ${isCredit
                        ? "text-emerald-600"
                        : "text-slate-700"
                    }
                `}
            >
                {isCredit
                    ? "+"
                    : "-"
                }
                $
                {Math.abs(
                    Number(
                        movement.amount
                    )
                ).toFixed(
                    2
                )}
            </p>

        </div>
    );
}

function WithdrawalRow({
    withdrawal,
}: {
    withdrawal:
    MarketplaceWithdrawal;
}) {

    const status =
        withdrawal.status;


    const label =
        status ===
            "paid"
            ? "Pagado"

            : status ===
                "rejected"
                ? "Rechazado"

                : status ===
                    "processing"
                    ? "Procesando"

                    : status ===
                        "cancelled"
                        ? "Cancelado"

                        : "Pendiente";


    const statusClass =
        status ===
            "paid"
            ? "bg-emerald-50 text-emerald-700"

            : status ===
                "rejected"
                ? "bg-red-50 text-red-600"

                : status ===
                    "processing"
                    ? "bg-blue-50 text-blue-700"

                    : "bg-amber-50 text-amber-700";


    return (

        <div
            className="
                flex
                flex-col
                gap-3
                rounded-2xl
                border
                border-slate-100
                px-5
                py-4

                sm:flex-row
                sm:items-center
                sm:justify-between
            "
        >

            <div>

                <p
                    className="
                        text-lg
                        font-black
                        text-[#171717]
                    "
                >
                    $
                    {Number(
                        withdrawal.amount
                    ).toFixed(
                        2
                    )}
                </p>

                <p
                    className="
                        mt-1
                        text-xs
                        text-slate-400
                    "
                >
                    {
                        withdrawal.bankName
                    }
                    {" · "}
                    {
                        withdrawal
                            .accountNumberMasked
                    }
                </p>

                <p
                    className="
                        mt-1
                        text-[10px]
                        text-slate-400
                    "
                >
                    Solicitado el{" "}
                    {
                        new Date(
                            withdrawal.requestedAt
                        ).toLocaleDateString(
                            "es-EC"
                        )
                    }
                </p>

            </div>


            <span
                className={`
                    inline-flex
                    w-fit
                    rounded-full
                    px-3
                    py-1.5
                    text-[10px]
                    font-black
                    uppercase
                    tracking-wider

                    ${statusClass}
                `}
            >
                {label}
            </span>

        </div>
    );
}