"use client";

import {
    type FormEvent,
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    useParams,
    useRouter,
} from "next/navigation";

import type {
    Session,
} from "@supabase/supabase-js";

import {
    supabaseBrowser,
} from "@/lib/supabaseClient";


/* ============================================================
   TIPOS
============================================================ */

type GiftInfo = {
    recipientName: string;
    buyerName: string;
    message:
    | string
    | null;
    quantity: number;
    status: string;
    claimed: boolean;
    claimedAt:
    | string
    | null;
};


type GiftResponse = {
    ok?: boolean;
    error?: string;
    gift?: GiftInfo;
};


/* ============================================================
   COMPONENTE
============================================================ */

export default function RegaloPage() {

    const params =
        useParams<{
            token: string;
        }>();


    const router =
        useRouter();


    const token =
        useMemo(
            () => {

                const rawToken =
                    params?.token;


                return typeof rawToken ===
                    "string"

                    ? rawToken.trim()

                    : "";
            },
            [
                params,
            ]
        );


    const [
        gift,
        setGift,
    ] =
        useState<GiftInfo | null>(
            null
        );


    const [
        session,
        setSession,
    ] =
        useState<Session | null>(
            null
        );


    const [
        loadingGift,
        setLoadingGift,
    ] =
        useState(
            true
        );


    const [
        checkingSession,
        setCheckingSession,
    ] =
        useState(
            true
        );


    const [
        authBusy,
        setAuthBusy,
    ] =
        useState(
            false
        );


    const [
        claimBusy,
        setClaimBusy,
    ] =
        useState(
            false
        );


    const [
        email,
        setEmail,
    ] =
        useState(
            ""
        );


    const [
        otp,
        setOtp,
    ] =
        useState(
            ""
        );


    const [
        otpSent,
        setOtpSent,
    ] =
        useState(
            false
        );


    const [
        resendCooldown,
        setResendCooldown,
    ] =
        useState(
            0
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


    /* ============================================================
       CARGAR REGALO
    ============================================================ */

    useEffect(
        () => {

            if (!token) {

                setLoadingGift(
                    false
                );

                setError(
                    "El enlace del regalo no es válido."
                );

                return;
            }


            let active =
                true;


            async function loadGift() {

                try {

                    setLoadingGift(
                        true
                    );


                    const response =
                        await fetch(
                            `/api/regalo/${encodeURIComponent(
                                token
                            )}`,
                            {
                                method:
                                    "GET",

                                cache:
                                    "no-store",
                            }
                        );


                    const data:
                        GiftResponse =
                        await response
                            .json()
                            .catch(
                                () => ({
                                    ok: false,
                                })
                            );


                    if (!active) {
                        return;
                    }


                    if (
                        !response.ok ||
                        !data.ok ||
                        !data.gift
                    ) {

                        throw new Error(
                            data.error ??
                            "No se pudo cargar el regalo."
                        );
                    }


                    setGift(
                        data.gift
                    );


                } catch (
                err:
                    unknown
                ) {

                    if (!active) {
                        return;
                    }


                    setError(
                        err instanceof
                            Error

                            ? err.message

                            : "No se pudo cargar el regalo."
                    );


                } finally {

                    if (
                        active
                    ) {
                        setLoadingGift(
                            false
                        );
                    }
                }
            }


            void loadGift();


            return () => {
                active =
                    false;
            };
        },
        [
            token,
        ]
    );


    /* ============================================================
       SESIÓN SUPABASE
    ============================================================ */

    useEffect(
        () => {

            let active =
                true;


            async function loadSession() {

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


                    if (
                        active
                    ) {
                        setSession(
                            data.session
                        );
                    }


                } catch (
                err:
                    unknown
                ) {

                    console.error(
                        "No se pudo recuperar la sesión:",
                        err
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


            void loadSession();


            const {
                data:
                authListener,
            } =
                supabaseBrowser
                    .auth
                    .onAuthStateChange(
                        (
                            _event,
                            newSession
                        ) => {

                            if (
                                active
                            ) {
                                setSession(
                                    newSession
                                );
                            }
                        }
                    );


            return () => {

                active =
                    false;

                authListener
                    .subscription
                    .unsubscribe();
            };
        },
        []
    );


    /* ============================================================
       COOLDOWN OTP
    ============================================================ */

    useEffect(
        () => {

            if (
                resendCooldown <=
                0
            ) {
                return;
            }


            const timer =
                window.setInterval(
                    () => {

                        setResendCooldown(
                            (
                                current
                            ) =>
                                Math.max(
                                    0,
                                    current -
                                    1
                                )
                        );
                    },
                    1000
                );


            return () => {

                window.clearInterval(
                    timer
                );
            };
        },
        [
            resendCooldown,
        ]
    );


    /* ============================================================
       GOOGLE
    ============================================================ */

    async function handleGoogleLogin() {

        if (
            !token ||
            authBusy
        ) {
            return;
        }


        setAuthBusy(
            true
        );

        setError(
            null
        );

        setSuccess(
            null
        );


        try {

            const redirectTo =
                `${window.location.origin}/regalo/${encodeURIComponent(
                    token
                )}`;


            const {
                error:
                googleError,
            } =
                await supabaseBrowser
                    .auth
                    .signInWithOAuth({
                        provider:
                            "google",

                        options: {
                            redirectTo,
                        },
                    });


            if (
                googleError
            ) {
                throw googleError;
            }


        } catch (
        err:
            unknown
        ) {

            setError(
                err instanceof
                    Error

                    ? err.message

                    : "No se pudo iniciar sesión con Google."
            );

            setAuthBusy(
                false
            );
        }
    }


    /* ============================================================
       ENVIAR OTP POR CORREO
    ============================================================ */

    async function handleSendOtp(
        event:
            FormEvent<HTMLFormElement>
    ) {

        event.preventDefault();


        const normalizedEmail =
            email
                .trim()
                .toLowerCase();


        if (
            !normalizedEmail ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                normalizedEmail
            )
        ) {

            setError(
                "Ingresa un correo electrónico válido."
            );

            return;
        }


        if (
            resendCooldown >
            0
        ) {
            return;
        }


        setAuthBusy(
            true
        );

        setError(
            null
        );

        setSuccess(
            null
        );


        try {

            const {
                error:
                signInError,
            } =
                await supabaseBrowser
                    .auth
                    .signInWithOtp({
                        email:
                            normalizedEmail,

                        options: {
                            shouldCreateUser:
                                true,
                        },
                    });


            if (
                signInError
            ) {
                throw signInError;
            }


            setEmail(
                normalizedEmail
            );

            setOtp(
                ""
            );

            setOtpSent(
                true
            );

            setResendCooldown(
                60
            );


        } catch (
        err:
            unknown
        ) {

            setError(
                err instanceof
                    Error

                    ? err.message

                    : "No se pudo enviar el código de acceso."
            );


        } finally {

            setAuthBusy(
                false
            );
        }
    }


    /* ============================================================
       VERIFICAR OTP DE 6 DÍGITOS
    ============================================================ */

    async function handleVerifyOtp(
        event:
            FormEvent<HTMLFormElement>
    ) {

        event.preventDefault();


        const normalizedEmail =
            email
                .trim()
                .toLowerCase();


        const normalizedOtp =
            otp
                .replace(
                    /\D/g,
                    ""
                )
                .slice(
                    0,
                    6
                );


        if (
            normalizedOtp.length !==
            6
        ) {

            setError(
                "Ingresa el código de 6 dígitos."
            );

            return;
        }


        setAuthBusy(
            true
        );

        setError(
            null
        );

        setSuccess(
            null
        );


        try {

            const {
                data,
                error:
                verifyError,
            } =
                await supabaseBrowser
                    .auth
                    .verifyOtp({
                        email:
                            normalizedEmail,

                        token:
                            normalizedOtp,

                        type:
                            "email",
                    });


            if (
                verifyError
            ) {
                throw verifyError;
            }


            if (
                !data.session
            ) {

                throw new Error(
                    "No se pudo iniciar la sesión."
                );
            }


            setSession(
                data.session
            );

            setOtpSent(
                false
            );

            setOtp(
                ""
            );


        } catch (
        err:
            unknown
        ) {

            setError(
                err instanceof
                    Error

                    ? err.message

                    : "El código no es válido o ya expiró."
            );


        } finally {

            setAuthBusy(
                false
            );
        }
    }


    /* ============================================================
       RECLAMAR REGALO
    ============================================================ */

    async function handleClaimGift() {

        if (
            !token ||
            claimBusy
        ) {
            return;
        }


        setClaimBusy(
            true
        );

        setError(
            null
        );

        setSuccess(
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


            const currentSession =
                sessionData.session;


            if (
                !currentSession
            ) {

                throw new Error(
                    "Tu sesión expiró. Inicia sesión nuevamente."
                );
            }


            const response =
                await fetch(
                    `/api/regalo/${encodeURIComponent(
                        token
                    )}`,
                    {
                        method:
                            "POST",

                        headers: {
                            Authorization:
                                `Bearer ${currentSession.access_token}`,
                        },

                        cache:
                            "no-store",
                    }
                );


            const data =
                await response
                    .json()
                    .catch(
                        () => null
                    );


            if (
                !response.ok ||
                !data?.ok
            ) {

                throw new Error(
                    data?.error ??
                    "No se pudo reclamar el regalo."
                );
            }


            setGift(
                (
                    current
                ) =>
                    current
                        ? {
                            ...current,

                            status:
                                "claimed",

                            claimed:
                                true,

                            claimedAt:
                                new Date()
                                    .toISOString(),
                        }
                        : current
            );


            setSuccess(
                "¡Listo! Tus Tarjetas de la Suerte ya están vinculadas a tu cuenta Baruk593."
            );


            window.setTimeout(
                () => {

                    router.replace(
                        "/mi-cuenta"
                    );
                },
                1800
            );


        } catch (
        err:
            unknown
        ) {

            setError(
                err instanceof
                    Error

                    ? err.message

                    : "No se pudo reclamar el regalo."
            );


        } finally {

            setClaimBusy(
                false
            );
        }
    }


    /* ============================================================
       CAMBIAR DE CUENTA
    ============================================================ */

    async function handleUseAnotherAccount() {

        setError(
            null
        );

        setSuccess(
            null
        );


        const {
            error:
            signOutError,
        } =
            await supabaseBrowser
                .auth
                .signOut();


        if (
            signOutError
        ) {

            setError(
                signOutError.message
            );

            return;
        }


        setSession(
            null
        );

        setOtpSent(
            false
        );

        setOtp(
            ""
        );
    }


    /* ============================================================
       ESTADOS DE CARGA / ERROR
    ============================================================ */

    if (
        loadingGift ||
        checkingSession
    ) {

        return (
            <main className="flex min-h-screen items-center justify-center bg-[#fafafa] px-4">
                <div className="text-center">

                    <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#F56B2A]" />

                    <p className="mt-4 text-sm font-semibold text-slate-500">
                        Preparando tu regalo...
                    </p>

                </div>
            </main>
        );
    }


    if (
        !gift
    ) {

        return (
            <main className="flex min-h-screen items-center justify-center bg-[#fafafa] px-4">
                <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl">

                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-2xl">
                        🎁
                    </div>

                    <h1 className="mt-5 text-2xl font-black text-[#171717]">
                        No pudimos abrir este regalo
                    </h1>

                    <p className="mt-3 text-sm leading-6 text-slate-500">
                        {error ??
                            "El enlace no es válido o el regalo ya no está disponible."}
                    </p>

                    <button
                        type="button"
                        onClick={() =>
                            router.push(
                                "/"
                            )
                        }
                        className="mt-7 min-h-[48px] w-full rounded-xl bg-[#171717] px-5 text-sm font-black text-white"
                    >
                        Ir a Baruk593
                    </button>

                </div>
            </main>
        );
    }


    const unavailable =
        ![
            "paid",
            "sent",
            "pending_verification",
            "claimed",
        ].includes(
            gift.status
        );


    /* ============================================================
       UI
    ============================================================ */

    return (
        <main className="min-h-screen bg-[#fafafa] px-4 pb-16 pt-12 sm:px-6 sm:pt-20">

            <div className="mx-auto w-full max-w-2xl">

                <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.10)]">

                    <div className="h-2 bg-gradient-to-r from-[#C1317F] via-[#F56B2A] to-[#FFA15C]" />

                    <div className="p-6 sm:p-9">

                        {/* MARCA */}

                        <div className="text-center">

                            <p className="text-[11px] font-black uppercase tracking-[0.34em] text-[#F56B2A]">
                                BARUK593
                            </p>

                            <div className="mx-auto mt-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#C1317F]/[0.07] text-3xl">
                                🎁
                            </div>

                            <h1 className="mt-5 text-3xl font-black tracking-[-0.04em] text-[#171717] sm:text-4xl">
                                ¡{gift.recipientName}, tienes un regalo!
                            </h1>

                            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-500">
                                <strong className="font-black text-[#171717]">
                                    {gift.buyerName}
                                </strong>{" "}
                                te ha regalado{" "}
                                <strong className="font-black text-[#C1317F]">
                                    {gift.quantity}{" "}
                                    {gift.quantity === 1
                                        ? "Tarjeta de la Suerte"
                                        : "Tarjetas de la Suerte"}
                                </strong>
                                .
                            </p>

                        </div>


                        {/* MENSAJE PERSONAL */}

                        {gift.message && (
                            <div className="mt-7 rounded-2xl border border-[#C1317F]/15 bg-[#C1317F]/[0.025] p-5">

                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#C1317F]">
                                    Mensaje especial
                                </p>

                                <p className="mt-3 whitespace-pre-wrap text-sm italic leading-7 text-slate-600">
                                    “{gift.message}”
                                </p>

                            </div>
                        )}


                        {/* ALERTAS */}

                        {error && (
                            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold leading-6 text-red-700">
                                {error}
                            </div>
                        )}


                        {success && (
                            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold leading-6 text-emerald-700">
                                {success}
                            </div>
                        )}


                        {/* YA RECLAMADO */}

                        {gift.claimed && (
                            <div className="mt-7 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">

                                <div className="text-2xl">
                                    ✓
                                </div>

                                <h2 className="mt-2 text-lg font-black text-emerald-800">
                                    Este regalo ya fue reclamado
                                </h2>

                                <p className="mt-2 text-sm leading-6 text-emerald-700/80">
                                    Si este regalo pertenece a tu cuenta, puedes encontrar tus Tarjetas de la Suerte en Mi cuenta.
                                </p>

                                <button
                                    type="button"
                                    onClick={() =>
                                        router.push(
                                            "/mi-cuenta"
                                        )
                                    }
                                    className="mt-5 min-h-[48px] w-full rounded-xl bg-emerald-700 px-5 text-sm font-black text-white"
                                >
                                    Ir a Mi cuenta
                                </button>

                            </div>
                        )}


                        {/* REGALO TODAVÍA NO DISPONIBLE */}

                        {!gift.claimed &&
                            unavailable && (
                                <div className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-center">

                                    <h2 className="text-lg font-black text-amber-800">
                                        El regalo todavía no está disponible
                                    </h2>

                                    <p className="mt-2 text-sm leading-6 text-amber-700/80">
                                        El pago aún no ha sido confirmado. Intenta nuevamente cuando recibas la notificación de Baruk593.
                                    </p>

                                </div>
                            )}


                        {/* SESIÓN YA INICIADA */}

                        {!gift.claimed &&
                            !unavailable &&
                            session && (
                                <div className="mt-7">

                                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">

                                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                                            Vas a reclamar este regalo con
                                        </p>

                                        <p className="mt-2 break-all text-sm font-black text-[#171717]">
                                            {session.user.email}
                                        </p>

                                        <p className="mt-2 text-xs leading-5 text-slate-500">
                                            Las Tarjetas de la Suerte quedarán vinculadas permanentemente a esta cuenta.
                                        </p>

                                    </div>

                                    <button
                                        type="button"
                                        onClick={
                                            handleClaimGift
                                        }
                                        disabled={
                                            claimBusy
                                        }
                                        className="
                                            mt-5
                                            min-h-[54px]
                                            w-full
                                            rounded-xl
                                            bg-[#F56B2A]
                                            px-5
                                            text-sm
                                            font-black
                                            text-white
                                            shadow-[0_12px_28px_rgba(245,107,42,0.24)]
                                            transition
                                            hover:bg-[#e85e1f]
                                            disabled:cursor-not-allowed
                                            disabled:opacity-60
                                        "
                                    >
                                        {claimBusy
                                            ? "Vinculando tus tarjetas..."
                                            : "Reclamar mis Tarjetas de la Suerte"}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={
                                            handleUseAnotherAccount
                                        }
                                        disabled={
                                            claimBusy
                                        }
                                        className="mt-3 min-h-[44px] w-full text-xs font-bold text-slate-500 underline decoration-slate-300 underline-offset-4"
                                    >
                                        Usar otra cuenta
                                    </button>

                                </div>
                            )}


                        {/* AUTENTICACIÓN */}

                        {!gift.claimed &&
                            !unavailable &&
                            !session && (
                                <div className="mt-8">

                                    <div className="text-center">

                                        <h2 className="text-xl font-black text-[#171717]">
                                            Accede para reclamar tu regalo
                                        </h2>

                                        <p className="mt-2 text-sm leading-6 text-slate-500">
                                            Puedes ingresar con Google o usar tu correo para recibir un código de acceso.
                                        </p>

                                    </div>


                                    {/* GOOGLE */}

                                    <button
                                        type="button"
                                        onClick={
                                            handleGoogleLogin
                                        }
                                        disabled={
                                            authBusy
                                        }
                                        className="
                                            mt-6
                                            flex
                                            min-h-[54px]
                                            w-full
                                            items-center
                                            justify-center
                                            gap-3
                                            rounded-xl
                                            border
                                            border-slate-200
                                            bg-white
                                            px-5
                                            text-sm
                                            font-black
                                            text-[#171717]
                                            shadow-sm
                                            transition
                                            hover:bg-slate-50
                                            disabled:cursor-not-allowed
                                            disabled:opacity-60
                                        "
                                    >

                                        <svg
                                            width="22"
                                            height="22"
                                            viewBox="0 0 24 24"
                                            aria-hidden="true"
                                        >
                                            <path
                                                fill="#4285F4"
                                                d="M21.6 12.227c0-.709-.064-1.391-.182-2.045H12v3.868h5.382a4.6 4.6 0 0 1-1.995 3.018v2.51h3.232c1.891-1.741 2.981-4.305 2.981-7.351Z"
                                            />
                                            <path
                                                fill="#34A853"
                                                d="M12 22c2.7 0 4.964-.895 6.619-2.423l-3.232-2.509c-.895.6-2.041.955-3.387.955-2.605 0-4.814-1.759-5.605-4.123H3.055v2.591A10 10 0 0 0 12 22Z"
                                            />
                                            <path
                                                fill="#FBBC05"
                                                d="M6.395 13.9A6.02 6.02 0 0 1 6.082 12c0-.659.114-1.3.313-1.9V7.509h-3.34A10 10 0 0 0 2 12c0 1.614.386 3.141 1.055 4.491L6.395 13.9Z"
                                            />
                                            <path
                                                fill="#EA4335"
                                                d="M12 5.977c1.468 0 2.786.505 3.823 1.496l2.868-2.868C16.959 2.991 14.7 2 12 2a10 10 0 0 0-8.945 5.509l3.34 2.591C7.186 7.736 9.395 5.977 12 5.977Z"
                                            />
                                        </svg>

                                        {authBusy
                                            ? "Conectando..."
                                            : "Continuar con Google"}

                                    </button>


                                    {/* DIVISOR */}

                                    <div className="my-6 flex items-center gap-4">

                                        <div className="h-px flex-1 bg-slate-200" />

                                        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                                            o
                                        </span>

                                        <div className="h-px flex-1 bg-slate-200" />

                                    </div>


                                    {/* CORREO */}

                                    {!otpSent ? (
                                        <form
                                            onSubmit={
                                                handleSendOtp
                                            }
                                        >

                                            <label className="text-xs font-black text-[#171717]">
                                                Correo electrónico
                                            </label>

                                            <input
                                                type="email"
                                                autoComplete="email"
                                                value={
                                                    email
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    setEmail(
                                                        event
                                                            .target
                                                            .value
                                                    )
                                                }
                                                placeholder="tu@correo.com"
                                                className="
                                                    mt-2
                                                    min-h-[52px]
                                                    w-full
                                                    rounded-xl
                                                    border
                                                    border-slate-200
                                                    bg-white
                                                    px-4
                                                    text-sm
                                                    text-[#171717]
                                                    outline-none
                                                    transition
                                                    placeholder:text-slate-300
                                                    focus:border-[#C1317F]
                                                    focus:ring-4
                                                    focus:ring-[#C1317F]/[0.07]
                                                "
                                            />

                                            <button
                                                type="submit"
                                                disabled={
                                                    authBusy ||
                                                    resendCooldown >
                                                    0
                                                }
                                                className="
                                                    mt-4
                                                    min-h-[52px]
                                                    w-full
                                                    rounded-xl
                                                    bg-[#171717]
                                                    px-5
                                                    text-sm
                                                    font-black
                                                    text-white
                                                    transition
                                                    hover:bg-black
                                                    disabled:cursor-not-allowed
                                                    disabled:opacity-60
                                                "
                                            >
                                                {authBusy
                                                    ? "Enviando..."
                                                    : resendCooldown > 0
                                                        ? `Espera ${resendCooldown}s`
                                                        : "Enviar código de acceso"}
                                            </button>

                                        </form>
                                    ) : (
                                        <form
                                            onSubmit={
                                                handleVerifyOtp
                                            }
                                        >

                                            <div className="rounded-xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500">
                                                Enviamos un código de 6 dígitos a{" "}
                                                <strong className="font-black text-[#171717]">
                                                    {email}
                                                </strong>
                                                .
                                            </div>

                                            <label className="mt-5 block text-xs font-black text-[#171717]">
                                                Código de acceso
                                            </label>

                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                autoComplete="one-time-code"
                                                value={
                                                    otp
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    setOtp(
                                                        event
                                                            .target
                                                            .value
                                                            .replace(
                                                                /\D/g,
                                                                ""
                                                            )
                                                            .slice(
                                                                0,
                                                                6
                                                            )
                                                    )
                                                }
                                                placeholder="000000"
                                                maxLength={
                                                    6
                                                }
                                                className="
                                                    mt-2
                                                    min-h-[56px]
                                                    w-full
                                                    rounded-xl
                                                    border
                                                    border-slate-200
                                                    bg-white
                                                    px-4
                                                    text-center
                                                    text-2xl
                                                    font-black
                                                    tracking-[0.35em]
                                                    text-[#171717]
                                                    outline-none
                                                    transition
                                                    placeholder:text-slate-300
                                                    focus:border-[#C1317F]
                                                    focus:ring-4
                                                    focus:ring-[#C1317F]/[0.07]
                                                "
                                            />

                                            <button
                                                type="submit"
                                                disabled={
                                                    authBusy ||
                                                    otp.length !==
                                                    6
                                                }
                                                className="
                                                    mt-4
                                                    min-h-[52px]
                                                    w-full
                                                    rounded-xl
                                                    bg-[#F56B2A]
                                                    px-5
                                                    text-sm
                                                    font-black
                                                    text-white
                                                    transition
                                                    hover:bg-[#e85e1f]
                                                    disabled:cursor-not-allowed
                                                    disabled:opacity-60
                                                "
                                            >
                                                {authBusy
                                                    ? "Verificando..."
                                                    : "Verificar y continuar"}
                                            </button>

                                            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">

                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setOtpSent(
                                                            false
                                                        );
                                                        setOtp(
                                                            ""
                                                        );
                                                        setError(
                                                            null
                                                        );
                                                    }}
                                                    className="text-xs font-bold text-slate-500 underline decoration-slate-300 underline-offset-4"
                                                >
                                                    Cambiar correo
                                                </button>

                                                <button
                                                    type="button"
                                                    disabled={
                                                        resendCooldown >
                                                        0 ||
                                                        authBusy
                                                    }
                                                    onClick={() => {

                                                        if (
                                                            resendCooldown >
                                                            0
                                                        ) {
                                                            return;
                                                        }

                                                        const fakeEvent = {
                                                            preventDefault() {
                                                                // Sin acción.
                                                            },
                                                        } as FormEvent<HTMLFormElement>;

                                                        void handleSendOtp(
                                                            fakeEvent
                                                        );
                                                    }}
                                                    className="text-xs font-bold text-[#C1317F] disabled:opacity-50"
                                                >
                                                    {resendCooldown >
                                                        0
                                                        ? `Reenviar en ${resendCooldown}s`
                                                        : "Reenviar código"}
                                                </button>

                                            </div>

                                        </form>
                                    )}


                                    <p className="mt-6 text-center text-[11px] leading-5 text-slate-400">
                                        🔒 El acceso es seguro. Baruk593 nunca mostrará los números, premios o F1 Spheres del regalo antes de vincularlo a la cuenta correcta.
                                    </p>

                                </div>
                            )}

                    </div>

                </section>


                <p className="mt-5 text-center text-[11px] leading-5 text-slate-400">
                    Baruk593 · Tarjetas de la Suerte
                </p>

            </div>

        </main>
    );
}