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


type AffiliateProfile = {
    id: string;
    userId: string | null;
    displayName: string | null;
    code: string;
    whatsapp: string | null;
    email: string | null;
    status: string;
    isActive: boolean;
    commissionRate: number;
    createdAt: string | null;
};


type AffiliateState = {
    active: boolean;

    suspended?: boolean;

    affiliate:
    | AffiliateProfile
    | null;

    referralUrl:
    | string
    | null;

    sales: {
        totalSales: number;
        totalGenerated: number;
        totalCommission: number;
    };

    wallet: {
        availableBalance: number;
        pendingBalance: number;
        updatedAt: string | null;
    };
};


export default function MiAfiliadoPage() {

    const router =
        useRouter();


    const [
        checkingSession,
        setCheckingSession,
    ] =
        useState(true);


    const [
        loading,
        setLoading,
    ] =
        useState(false);


    const [
        affiliateState,
        setAffiliateState,
    ] =
        useState<AffiliateState | null>(
            null
        );


    const [
        displayName,
        setDisplayName,
    ] =
        useState("");


    const [
        whatsapp,
        setWhatsapp,
    ] =
        useState("");


    const [
        activating,
        setActivating,
    ] =
        useState(false);


    const [
        showQr,
        setShowQr,
    ] =
        useState(false);


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


    /* =========================================================
       CARGAR AFILIADO
    ========================================================= */

    async function loadAffiliate(
        accessToken: string
    ) {

        setLoading(
            true
        );


        try {

            const response =
                await fetch(
                    "/api/affiliate/me",
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
                    "No se pudo cargar tu perfil."
                );
            }


            setAffiliateState({

                active:
                    Boolean(
                        data.active
                    ),

                suspended:
                    Boolean(
                        data.suspended
                    ),

                affiliate:
                    data.affiliate ??
                    null,

                referralUrl:
                    data.referralUrl ??
                    null,

                sales: {

                    totalSales:
                        Number(
                            data.sales
                                ?.totalSales ??
                            0
                        ),

                    totalGenerated:
                        Number(
                            data.sales
                                ?.totalGenerated ??
                            0
                        ),

                    totalCommission:
                        Number(
                            data.sales
                                ?.totalCommission ??
                            0
                        ),
                },

                wallet: {

                    availableBalance:
                        Number(
                            data.wallet
                                ?.availableBalance ??
                            0
                        ),

                    pendingBalance:
                        Number(
                            data.wallet
                                ?.pendingBalance ??
                            0
                        ),

                    updatedAt:
                        data.wallet
                            ?.updatedAt ??
                        null,
                },
            });


            if (
                data.affiliate
                    ?.displayName
            ) {

                setDisplayName(
                    data.affiliate
                        .displayName
                );
            }


            if (
                data.affiliate
                    ?.whatsapp
            ) {

                setWhatsapp(
                    data.affiliate
                        .whatsapp
                );
            }

        } finally {

            setLoading(
                false
            );
        }
    }


    /* =========================================================
       SESIÓN
    ========================================================= */

    useEffect(() => {

        let active =
            true;


        async function initialize() {

            try {

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


                const session =
                    data.session;


                if (
                    !session
                ) {

                    router.replace(
                        "/mi-cuenta"
                    );

                    return;
                }


                if (
                    active
                ) {

                    await loadAffiliate(
                        session.access_token
                    );
                }

            } catch (
            err:
                unknown
            ) {

                if (
                    !active
                ) {
                    return;
                }


                setError(
                    err instanceof
                        Error

                        ? err.message

                        : "No se pudo preparar tu perfil."
                );

            } finally {

                if (
                    active
                ) {

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


    /* =========================================================
       ACTIVAR
    ========================================================= */

    async function handleActivate() {

        const normalizedName =
            displayName
                .trim();


        const normalizedWhatsapp =
            whatsapp
                .trim();


        if (
            !normalizedName
        ) {

            setError(
                "Ingresa tu nombre."
            );

            return;
        }


        if (
            !/^09\d{8}$/.test(
                normalizedWhatsapp
            )
        ) {

            setError(
                "Ingresa un WhatsApp válido. Ejemplo: 0991234567."
            );

            return;
        }


        setActivating(
            true
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


            if (
                !session
            ) {

                throw new Error(
                    "Tu sesión ha finalizado."
                );
            }


            const response =
                await fetch(
                    "/api/affiliate/register",
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

                                displayName:
                                    normalizedName,

                                whatsapp:
                                    normalizedWhatsapp,
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
                    "No se pudo activar tu perfil."
                );
            }


            setMessage(
                "Tu perfil de afiliado está activo."
            );


            await loadAffiliate(
                session.access_token
            );

        } catch (
        err:
            unknown
        ) {

            setError(
                err instanceof
                    Error

                    ? err.message

                    : "No se pudo activar tu perfil."
            );

        } finally {

            setActivating(
                false
            );
        }
    }


    /* =========================================================
       COPIAR
    ========================================================= */

    async function handleCopy() {

        const link =
            affiliateState
                ?.referralUrl;


        if (
            !link
        ) {
            return;
        }


        await navigator
            .clipboard
            .writeText(
                link
            );


        setMessage(
            "Enlace copiado."
        );
    }


    /* =========================================================
       COMPARTIR
    ========================================================= */

    async function handleShare() {

        const link =
            affiliateState
                ?.referralUrl;


        if (
            !link
        ) {
            return;
        }


        if (
            navigator.share
        ) {

            try {

                await navigator.share({

                    title:
                        "Baruk593",

                    text:
                        "Descubre Baruk593 y consigue tus Experience Pass.",

                    url:
                        link,
                });

            } catch {
                // Usuario cerró compartir.
            }

            return;
        }


        await handleCopy();
    }


    /* =========================================================
       CARGANDO
    ========================================================= */

    if (
        checkingSession
    ) {

        return (

            <main className="flex min-h-screen items-center justify-center bg-white">

                <div className="text-center">

                    <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-[#C1317F]" />

                    <p className="mt-4 text-sm font-semibold text-gray-500">
                        Preparando tu perfil...
                    </p>

                </div>

            </main>
        );
    }


    /* =========================================================
       RENDER
    ========================================================= */

    return (

        <main className="min-h-screen bg-[#fafafa] px-4 pb-20 pt-24 sm:px-6 lg:px-8">

            <div className="mx-auto w-full max-w-5xl">

                {/* ENCABEZADO */}

                <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">

                    <div>

                        <p className="text-xs font-black uppercase tracking-[0.22em] text-[#C1317F]">
                            BARUK593
                        </p>

                        <h1 className="mt-2 text-3xl font-black tracking-[-0.03em] text-[#171717] md:text-4xl">
                            Gana con Baruk593
                        </h1>

                        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                            Comparte tu enlace o QR y recibe comisión
                            por las compras realizadas con tu referencia.
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
                        "
                    >
                        ← Volver a Mi cuenta
                    </Link>

                </div>


                {error && (

                    <div className="mt-6 rounded-xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-600">
                        {error}
                    </div>

                )}


                {message && (

                    <div className="mt-6 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
                        {message}
                    </div>

                )}


                {loading ? (

                    <div className="mt-10 text-center">

                        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#C1317F]" />

                    </div>

                ) : affiliateState?.suspended ? (

                    <div className="mt-8 rounded-3xl border border-amber-200 bg-amber-50 p-7 text-amber-700">
                        Tu perfil está temporalmente suspendido.
                    </div>

                ) : !affiliateState?.active ? (

                    /* =========================================
                       ACTIVACIÓN
                    ========================================= */

                    <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 md:p-8">

                        <h2 className="text-2xl font-black text-[#171717]">
                            Activa tu perfil
                        </h2>

                        <p className="mt-2 text-sm leading-6 text-slate-500">
                            No necesitas crear otro usuario ni otra contraseña.
                            Utilizaremos tu misma cuenta Baruk593.
                        </p>


                        <div className="mt-6 grid max-w-xl gap-4">

                            <input
                                type="text"

                                value={
                                    displayName
                                }

                                onChange={(
                                    event
                                ) =>
                                    setDisplayName(
                                        event.target.value
                                    )
                                }

                                placeholder="Tu nombre"

                                className="min-h-[48px] rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-[#C1317F]"
                            />


                            <input
                                type="tel"

                                value={
                                    whatsapp
                                }

                                onChange={(
                                    event
                                ) =>
                                    setWhatsapp(
                                        event.target.value
                                    )
                                }

                                placeholder="WhatsApp 0991234567"

                                className="min-h-[48px] rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-[#C1317F]"
                            />


                            <button
                                type="button"

                                disabled={
                                    activating
                                }

                                onClick={
                                    handleActivate
                                }

                                className="min-h-[48px] rounded-xl bg-[#C1317F] px-5 text-sm font-black text-white disabled:opacity-50"
                            >
                                {activating
                                    ? "Activando..."
                                    : "Activar mi perfil"
                                }
                            </button>

                        </div>

                    </section>

                ) : (

                    /* =========================================
                       AFILIADO ACTIVO
                    ========================================= */

                    <>

                        <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">

                            <AffiliateStat
                                label="Código"
                                value={
                                    affiliateState
                                        .affiliate
                                        ?.code ??
                                    "-"
                                }
                            />

                            <AffiliateStat
                                label="Comisión"
                                value={`${Math.round(
                                    (
                                        affiliateState
                                            .affiliate
                                            ?.commissionRate ??
                                        0.10
                                    ) *
                                    100
                                )}%`}
                            />

                            <AffiliateStat
                                label="Ventas"
                                value={
                                    String(
                                        affiliateState
                                            .sales
                                            .totalSales
                                    )
                                }
                            />

                            <AffiliateStat
                                label="Comisiones"
                                value={`$${affiliateState
                                    .sales
                                    .totalCommission
                                    .toFixed(
                                        2
                                    )}`}
                            />

                        </div>


                        {/* ENLACE */}

                        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 md:p-8">

                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#C1317F]">
                                Tu enlace personal
                            </p>


                            <p className="mt-3 break-all text-sm font-bold text-slate-700">
                                {
                                    affiliateState
                                        .referralUrl
                                }
                            </p>


                            <div className="mt-5 flex flex-wrap gap-3">

                                <button
                                    type="button"
                                    onClick={
                                        handleCopy
                                    }
                                    className="min-h-[44px] rounded-xl border border-[#C1317F]/20 bg-[#C1317F]/5 px-5 text-xs font-black text-[#C1317F]"
                                >
                                    Copiar enlace
                                </button>


                                <button
                                    type="button"
                                    onClick={
                                        handleShare
                                    }
                                    className="min-h-[44px] rounded-xl bg-[#C1317F] px-5 text-xs font-black text-white"
                                >
                                    Compartir
                                </button>


                                <button
                                    type="button"

                                    onClick={() =>
                                        setShowQr(
                                            current =>
                                                !current
                                        )
                                    }

                                    className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-5 text-xs font-black text-slate-700"
                                >
                                    {showQr
                                        ? "Ocultar QR"
                                        : "Ver QR"
                                    }
                                </button>

                            </div>


                            {showQr &&
                                affiliateState.referralUrl && (

                                    <div className="mt-6 border-t border-slate-100 pt-6 text-center">

                                        <div className="mx-auto max-w-[280px] rounded-2xl border border-slate-200 bg-white p-4">

                                            <img
                                                src={`https://api.qrserver.com/v1/create-qr-code/?size=420x420&data=${encodeURIComponent(
                                                    affiliateState
                                                        .referralUrl
                                                )}`}

                                                alt="QR Baruk593"

                                                className="h-auto w-full"
                                            />

                                        </div>

                                    </div>

                                )}

                        </section>


                        {/* BILLETERA */}

                        <section className="mt-6 flex flex-col gap-5 rounded-3xl bg-[#171717] p-7 text-white sm:flex-row sm:items-center sm:justify-between">

                            <div>

                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/50">
                                    Mi Billetera Baruk593
                                </p>

                                <p className="mt-2 text-4xl font-black">
                                    $
                                    {affiliateState
                                        .wallet
                                        .availableBalance
                                        .toFixed(
                                            2
                                        )}
                                </p>

                                <p className="mt-2 text-xs text-white/50">
                                    Saldo disponible
                                </p>

                            </div>


                            <Link
                                href="/mi-cuenta/billetera"

                                className="inline-flex min-h-[46px] items-center justify-center rounded-xl bg-white px-5 text-sm font-black text-[#171717]"
                            >
                                Ver mi billetera →
                            </Link>

                        </section>

                    </>

                )}

            </div>

        </main>
    );
}


function AffiliateStat({
    label,
    value,
}: {
    label: string;
    value: string;
}) {

    return (

        <div className="rounded-2xl border border-slate-200 bg-white p-5">

            <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
                {label}
            </p>

            <p className="mt-2 truncate text-xl font-black text-[#171717]">
                {value}
            </p>

        </div>
    );
}