"use client";

import {
    FormEvent,
    useEffect,
    useState,
} from "react";

import { supabaseBrowser } from "@/lib/supabaseClient";
import BarukRevealCard from "@/components/baruk/BarukRevealCard";

type AccountState = {
    email: string;
    totalCards: number;
};

type SphereCollectionItem = {
    id: string;
    number: number;
    name: string;
    obtained: boolean;
    ownedCount: number;
};

type CollectionSummary = {
    totalCards: number;
    revealedCards: number;

    uniqueSpheres: number;
    totalSphereCopies: number;
    sphereGoal: number;

    totalPrizes: number;

    collectionCompleted: boolean;
};

type CollectionReward = {
    id: string;
    name: string;
    description: string | null;
    type: string;

    requiredSpheres: number;
    completed: boolean;

    claim:
    | {
        id: string;
        status: string;

        completedAt:
        | string
        | null;

        verifiedAt:
        | string
        | null;

        scheduledAt:
        | string
        | null;

        deliveredAt:
        | string
        | null;
    }
    | null;
};

type CollectionState = {
    summary: CollectionSummary;

    spheres:
    SphereCollectionItem[];

    reward:
    CollectionReward | null;
};

type AccountCard = {
    id: string;

    pedido_id:
    | number
    | null;

    origin:
    | string
    | null;

    estado:
    | string
    | null;

    revealed:
    boolean;

    revealed_at:
    | string
    | null;

    created_at:
    string;
};

type CardsSummary = {
    total: number;
    revealed: number;
    pending: number;
};

type AccountPrize = {
    cardId: string;

    claimId:
    | string
    | null;

    revealedAt:
    | string
    | null;

    status: string;

    automaticDelivery:
    boolean;

    deliveryOrderId:
    | number
    | null;

    prize:
    | {
        id: string;
        name: string;
        description: string | null;
        type: string;
        imageUrl: string | null;
        cardQuantity: number | null;
        referenceValue: number | null;
    }
    | null;
};

type PrizesSummary = {
    total: number;
    pending: number;
    scheduled: number;
    delivered: number;
};

type Purchase = {
    id: number;

    createdAt:
    | string
    | null;

    quantity: number;
    unitPrice: number;
    total: number;

    paymentMethod:
    | string
    | null;

    status:
    | string
    | null;

    purchaseType:
    | string
    | null;

    cardsProcessingStatus:
    | string
    | null;

    cards: {
        total: number;

        revealed:
        | number
        | null;

        pending:
        | number
        | null;
    };

    transactionId:
    | string
    | null;
};

type PurchasesSummary = {
    totalPurchases: number;
    paidPurchases: number;
    totalInvested: number;
    totalCardsPurchased: number;
};

export default function MiCuentaPage() {
    const [email, setEmail] =
        useState("");

    const [loading, setLoading] =
        useState(false);

    const [sent, setSent] =
        useState(false);

    const [error, setError] =
        useState<string | null>(
            null
        );

    const [
        checkingSession,
        setCheckingSession,
    ] =
        useState(true);

    const [
        account,
        setAccount,
    ] =
        useState<AccountState | null>(
            null
        );

    const [
        collection,
        setCollection,
    ] =
        useState<CollectionState | null>(
            null
        );

    const [
        cards,
        setCards,
    ] =
        useState<AccountCard[]>(
            []
        );

    const [
        cardsSummary,
        setCardsSummary,
    ] =
        useState<CardsSummary>({
            total: 0,
            revealed: 0,
            pending: 0,
        });

    const [
        loadingCards,
        setLoadingCards,
    ] =
        useState(false);

    const [
        prizes,
        setPrizes,
    ] =
        useState<AccountPrize[]>(
            []
        );

    const [
        prizesSummary,
        setPrizesSummary,
    ] =
        useState<PrizesSummary>({
            total: 0,
            pending: 0,
            scheduled: 0,
            delivered: 0,
        });

    const [
        loadingPrizes,
        setLoadingPrizes,
    ] =
        useState(false);

    const [
        purchases,
        setPurchases,
    ] =
        useState<Purchase[]>(
            []
        );

    const [
        purchasesSummary,
        setPurchasesSummary,
    ] =
        useState<PurchasesSummary>({
            totalPurchases: 0,
            paidPurchases: 0,
            totalInvested: 0,
            totalCardsPurchased: 0,
        });

    const [
        loadingPurchases,
        setLoadingPurchases,
    ] =
        useState(false);

    const [
        loadingCollection,
        setLoadingCollection,
    ] =
        useState(false);

    /*
     * =========================================================
     * CARGAR COLECCIÓN DEL USUARIO
     * =========================================================
     */

    async function loadPurchases(
        accessToken: string
    ) {
        setLoadingPurchases(
            true
        );

        try {
            const response =
                await fetch(
                    "/api/mi-cuenta/compras",
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
                    "No se pudieron cargar tus compras"
                );
            }

            setPurchases(
                data.purchases ??
                []
            );

            setPurchasesSummary({
                totalPurchases:
                    Number(
                        data.summary
                            ?.totalPurchases ??
                        0
                    ),

                paidPurchases:
                    Number(
                        data.summary
                            ?.paidPurchases ??
                        0
                    ),

                totalInvested:
                    Number(
                        data.summary
                            ?.totalInvested ??
                        0
                    ),

                totalCardsPurchased:
                    Number(
                        data.summary
                            ?.totalCardsPurchased ??
                        0
                    ),
            });
        } finally {
            setLoadingPurchases(
                false
            );
        }
    }

    async function loadPrizes(
        accessToken: string
    ) {
        setLoadingPrizes(
            true
        );

        try {
            const response =
                await fetch(
                    "/api/mi-cuenta/premios",
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
                    "No se pudieron cargar tus premios"
                );
            }

            setPrizes(
                data.prizes ??
                []
            );

            setPrizesSummary({
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

                scheduled:
                    Number(
                        data.summary
                            ?.scheduled ??
                        0
                    ),

                delivered:
                    Number(
                        data.summary
                            ?.delivered ??
                        0
                    ),
            });
        } finally {
            setLoadingPrizes(
                false
            );
        }
    }

    async function loadCards(
        accessToken: string
    ) {
        setLoadingCards(
            true
        );

        try {
            const response =
                await fetch(
                    "/api/mi-cuenta/cards",
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
                    "No se pudieron cargar tus Baruk Cards"
                );
            }

            setCards(
                data.cards ?? []
            );

            setCardsSummary({
                total:
                    Number(
                        data.summary
                            ?.total ??
                        0
                    ),

                revealed:
                    Number(
                        data.summary
                            ?.revealed ??
                        0
                    ),

                pending:
                    Number(
                        data.summary
                            ?.pending ??
                        0
                    ),
            });
        } finally {
            setLoadingCards(
                false
            );
        }
    }

    async function loadCollection(
        accessToken: string
    ) {
        setLoadingCollection(
            true
        );

        try {
            const response =
                await fetch(
                    "/api/mi-cuenta/coleccion",
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
                    "No se pudo cargar tu colección"
                );
            }

            setCollection({
                summary:
                    data.summary,

                spheres:
                    data.spheres ??
                    [],

                reward:
                    data.reward ??
                    null,
            });

            /*
             * Sincronizamos también
             * el total de Baruk Cards.
             */
            setAccount(
                (
                    current
                ) => {
                    if (
                        !current
                    ) {
                        return current;
                    }

                    return {
                        ...current,

                        totalCards:
                            Number(
                                data
                                    .summary
                                    ?.totalCards ??
                                current.totalCards
                            ),
                    };
                }
            );
        } finally {
            setLoadingCollection(
                false
            );
        }
    }

    /*
     * =========================================================
     * VINCULAR CUENTA DE AUTH CON BARUK CARDS
     * =========================================================
     */

    async function linkAccount(
        accessToken: string
    ) {
        const response =
            await fetch(
                "/api/mi-cuenta/vincular",
                {
                    method:
                        "POST",

                    headers: {
                        Authorization:
                            `Bearer ${accessToken}`,

                        "Content-Type":
                            "application/json",
                    },
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
                "No se pudo preparar tu cuenta"
            );
        }

        setAccount({
            email:
                String(
                    data.user
                        ?.email ??
                    ""
                ),

            totalCards:
                Number(
                    data.totalCards ??
                    0
                ),
        });

        setSent(false);

        /*
         * Una vez vinculadas las tarjetas,
         * cargamos la colección.
         */
        await Promise.all([
            loadCollection(
                accessToken
            ),

            loadCards(
                accessToken
            ),

            loadPrizes(
                accessToken
            ),

            loadPurchases(
                accessToken
            ),
        ]);
    }

    /*
     * =========================================================
     * DETECTAR SESIÓN
     * =========================================================
     */

    useEffect(() => {
        let active =
            true;

        async function initializeSession() {
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
                    session &&
                    active
                ) {
                    await linkAccount(
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
                    err instanceof
                        Error
                        ? err.message
                        : "No se pudo cargar tu cuenta"
                );
            } finally {
                if (active) {
                    setCheckingSession(
                        false
                    );
                }
            }
        }

        initializeSession();

        const {
            data:
            authListener,
        } =
            supabaseBrowser
                .auth
                .onAuthStateChange(
                    (
                        event,
                        session
                    ) => {
                        if (
                            event ===
                            "SIGNED_IN" &&
                            session
                        ) {
                            setTimeout(
                                () => {
                                    if (
                                        !active
                                    ) {
                                        return;
                                    }

                                    linkAccount(
                                        session.access_token
                                    ).catch(
                                        (
                                            err: unknown
                                        ) => {
                                            if (
                                                !active
                                            ) {
                                                return;
                                            }

                                            setError(
                                                err instanceof
                                                    Error
                                                    ? err.message
                                                    : "No se pudo preparar tu cuenta"
                                            );
                                        }
                                    );
                                },
                                0
                            );
                        }

                        if (
                            event ===
                            "SIGNED_OUT"
                        ) {
                            setAccount(null);

                            setCollection(null);

                            setCards([]);

                            setCardsSummary({
                                total: 0,
                                revealed: 0,
                                pending: 0,
                            });

                            setPrizes([]);

                            setPrizesSummary({
                                total: 0,
                                pending: 0,
                                scheduled: 0,
                                delivered: 0,
                            });

                            setPurchases([]);

                            setPurchasesSummary({
                                totalPurchases: 0,
                                paidPurchases: 0,
                                totalInvested: 0,
                                totalCardsPurchased: 0,
                            });

                            setSent(false);
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
    }, []);

    /*
     * =========================================================
     * ENVIAR MAGIC LINK
     * =========================================================
     */

    async function handleSubmit(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        const normalizedEmail =
            email
                .trim()
                .toLowerCase();

        if (
            !normalizedEmail
        ) {
            setError(
                "Ingresa un correo electrónico válido"
            );

            return;
        }

        setLoading(true);
        setError(null);

        try {
            const redirectTo =
                `${window.location.origin}/mi-cuenta`;

            const {
                error:
                signInError,
            } =
                await supabaseBrowser
                    .auth
                    .signInWithOtp(
                        {
                            email:
                                normalizedEmail,

                            options: {
                                emailRedirectTo:
                                    redirectTo,

                                shouldCreateUser:
                                    true,
                            },
                        }
                    );

            if (
                signInError
            ) {
                throw signInError;
            }

            setEmail(
                normalizedEmail
            );

            setSent(true);
        } catch (
        err: unknown
        ) {
            setError(
                err instanceof
                    Error
                    ? err.message
                    : "No se pudo enviar el enlace de acceso"
            );
        } finally {
            setLoading(
                false
            );
        }
    }

    /*
     * =========================================================
     * CERRAR SESIÓN
     * =========================================================
     */

    /*
 * =========================================================
 * ACTUALIZAR MI CUENTA DESPUÉS DE REVELAR UNA CARD
 * =========================================================
 */

    async function handleCardRevealed(
        cardId: string,
        revealedAt: string | null
    ) {
        /*
         * 1. Actualizamos inmediatamente la tarjeta
         * en pantalla.
         */
        setCards((currentCards) =>
            currentCards.map((card) =>
                card.id === cardId
                    ? {
                        ...card,
                        revealed: true,
                        revealed_at:
                            revealedAt ??
                            new Date().toISOString(),
                        estado: "revealed",
                    }
                    : card
            )
        );

        /*
         * 2. Actualizamos los contadores de tarjetas
         * sin necesidad de volver a pedirlas al servidor.
         */
        setCardsSummary((current) => ({
            ...current,

            revealed:
                current.revealed + 1,

            pending:
                Math.max(
                    0,
                    current.pending - 1
                ),
        }));

        /*
         * 3. Recuperamos la sesión para actualizar
         * colección de esferas y premios.
         */
        try {
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
                return;
            }

            /*
             * La API de colección ahora leerá la tarjeta
             * recién revelada.
             *
             * Si contiene esfera:
             *   → aumenta colección.
             *
             * Si contiene premio:
             *   → aumenta premios.
             */
            await Promise.all([
                loadCollection(
                    session.access_token
                ),

                loadPrizes(
                    session.access_token
                ),

                loadPurchases(
                    session.access_token
                ),
            ]);
        } catch (err: unknown) {
            console.error(
                "No se pudo actualizar la colección después del revelado:",
                err
            );
        }
    }

    async function handleLogout() {
        setError(null);

        const {
            error:
            logoutError,
        } =
            await supabaseBrowser
                .auth
                .signOut();

        if (
            logoutError
        ) {
            setError(
                logoutError.message
            );

            return;
        }

        setAccount(null);

        setCollection(null);

        setCards([]);

        setPrizes([]);

        setPurchases([]);

        setPurchasesSummary({
            totalPurchases: 0,
            paidPurchases: 0,
            totalInvested: 0,
            totalCardsPurchased: 0,
        });

        setPrizesSummary({
            total: 0,
            pending: 0,
            scheduled: 0,
            delivered: 0,
        });

        setCardsSummary({
            total: 0,
            revealed: 0,
            pending: 0,
        });

        setSent(false);

        setEmail("");
    }

    /*
     * =========================================================
     * CARGANDO SESIÓN
     * =========================================================
     */

    if (
        checkingSession
    ) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-white px-4">
                <div className="text-center">
                    <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-[#ff6600]" />

                    <p className="mt-4 text-sm font-semibold text-gray-500">
                        Preparando
                        tu cuenta
                        Baruk593...
                    </p>
                </div>
            </main>
        );
    }

    /*
     * =========================================================
     * USUARIO AUTENTICADO
     * =========================================================
     */

    if (account) {
        const summary =
            collection?.summary;

        return (
            <main className="min-h-screen bg-[#f5f6f8] px-4 py-24">
                <div className="mx-auto w-full max-w-6xl">

                    {/* PANEL PRINCIPAL */}

                    <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-xl">

                        <div className="h-2 bg-gradient-to-r from-[#ff6600] to-[#ff9a55]" />

                        <div className="p-7 md:p-10">

                            {/* ENCABEZADO */}

                            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

                                <div>
                                    <p className="text-xs font-black uppercase tracking-[0.25em] text-[#ff6600]">
                                        BARUK593
                                    </p>

                                    <h1 className="mt-2 text-3xl font-black text-gray-900">
                                        Mi cuenta
                                    </h1>

                                    <p className="mt-2 text-sm text-gray-500">
                                        {
                                            account.email
                                        }
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={
                                        handleLogout
                                    }
                                    className="w-fit rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-600 transition hover:bg-gray-50"
                                >
                                    Cerrar sesión
                                </button>
                            </div>

                            {/* ERROR */}

                            {error && (
                                <div className="mt-6 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-600">
                                    {
                                        error
                                    }
                                </div>
                            )}

                            {/* RESUMEN */}

                            <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">

                                {/* CARDS */}

                                <div className="rounded-2xl bg-[#fff6ef] p-6">

                                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                                        Mis Baruk Cards
                                    </p>

                                    <p className="mt-2 text-4xl font-black text-[#ff6600]">
                                        {cardsSummary.total}
                                    </p>

                                    <p className="mt-2 text-xs text-gray-500">
                                        Tarjetas vinculadas a tu cuenta
                                    </p>
                                </div>

                                {/* ESFERAS */}

                                <div className="rounded-2xl bg-gray-50 p-6">

                                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                                        Mi colección
                                    </p>

                                    <div className="mt-2 flex items-end gap-1">

                                        <p className="text-4xl font-black text-gray-900">
                                            {
                                                summary
                                                    ?.uniqueSpheres ??
                                                0
                                            }
                                        </p>

                                        <p className="pb-1 text-lg font-bold text-gray-400">
                                            /7
                                        </p>

                                    </div>

                                    <p className="mt-2 text-xs text-gray-500">
                                        Esferas diferentes encontradas
                                    </p>
                                </div>

                                {/* PREMIOS */}

                                <div className="rounded-2xl bg-gray-50 p-6">

                                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                                        Mis premios
                                    </p>

                                    <p className="mt-2 text-4xl font-black text-gray-900">
                                        {prizesSummary.total}
                                    </p>

                                    <p className="mt-2 text-xs text-gray-500">
                                        Premios instantáneos revelados
                                    </p>
                                </div>
                            </div>

                            {/* =====================================================
    PREMIO POR COMPLETAR LAS 7 ESFERAS
===================================================== */}

                            {summary?.collectionCompleted &&
                                collection?.reward && (

                                    <div className="mt-8 overflow-hidden rounded-3xl border border-orange-200 bg-gradient-to-br from-orange-50 to-white shadow-md">

                                        <div className="h-2 bg-gradient-to-r from-[#ff6600] to-[#ff9a55]" />

                                        <div className="p-7 text-center md:p-9">

                                            <div className="text-4xl">
                                                🏆
                                            </div>

                                            <p className="mt-4 text-xs font-black uppercase tracking-[0.22em] text-[#ff6600]">
                                                Colección completa
                                            </p>

                                            <h2 className="mt-2 text-2xl font-black text-gray-900 md:text-3xl">
                                                ¡Encontraste las 7 esferas!
                                            </h2>

                                            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-gray-600">
                                                Completaste la colección Baruk593 y desbloqueaste
                                                el premio especial.
                                            </p>

                                            {/* PREMIO */}

                                            <div className="mx-auto mt-6 max-w-xl rounded-2xl border border-orange-100 bg-white p-6">

                                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                                                    Premio desbloqueado
                                                </p>

                                                <h3 className="mt-2 text-xl font-black text-gray-900">
                                                    {
                                                        collection.reward.name
                                                    }
                                                </h3>

                                                {collection.reward.description && (
                                                    <p className="mt-3 text-sm leading-6 text-gray-500">
                                                        {
                                                            collection.reward.description
                                                        }
                                                    </p>
                                                )}

                                                {/* ESTADO DEL RECLAMO */}

                                                {collection.reward.claim && (

                                                    <div className="mt-5 border-t border-gray-100 pt-5">

                                                        <p className="text-xs font-semibold text-gray-400">
                                                            Estado del premio
                                                        </p>

                                                        <div className="mt-2">

                                                            {collection.reward.claim.status ===
                                                                "delivered" ? (

                                                                <span className="inline-flex rounded-full bg-emerald-50 px-4 py-2 text-xs font-black uppercase tracking-wider text-emerald-700">
                                                                    ✓ Entregado
                                                                </span>

                                                            ) : collection.reward.claim.status ===
                                                                "scheduled" ? (

                                                                <span className="inline-flex rounded-full bg-blue-50 px-4 py-2 text-xs font-black uppercase tracking-wider text-blue-700">
                                                                    Entrega programada
                                                                </span>

                                                            ) : collection.reward.claim.status ===
                                                                "verified" ? (

                                                                <span className="inline-flex rounded-full bg-violet-50 px-4 py-2 text-xs font-black uppercase tracking-wider text-violet-700">
                                                                    Premio verificado
                                                                </span>

                                                            ) : (

                                                                <span className="inline-flex rounded-full bg-orange-50 px-4 py-2 text-xs font-black uppercase tracking-wider text-[#ff6600]">
                                                                    Pendiente de coordinación
                                                                </span>

                                                            )}

                                                        </div>

                                                        {collection.reward.claim.completedAt && (
                                                            <p className="mt-4 text-[11px] text-gray-400">
                                                                Colección completada el{" "}
                                                                {
                                                                    new Date(
                                                                        collection.reward.claim.completedAt
                                                                    ).toLocaleDateString(
                                                                        "es-EC"
                                                                    )
                                                                }
                                                            </p>
                                                        )}

                                                    </div>
                                                )}

                                            </div>

                                            <p className="mx-auto mt-5 max-w-xl text-xs leading-5 text-gray-400">
                                                El equipo de Baruk593 verificará y coordinará
                                                la entrega de tu experiencia.
                                            </p>

                                        </div>

                                    </div>
                                )}

                            {/* =====================================================
    MIS COMPRAS
===================================================== */}

                            <section
                                id="mis-compras"
                                className="mt-12"
                            >
                                <div className="text-center">
                                    <p className="text-xs font-black uppercase tracking-[0.22em] text-[#ff6600]">
                                        Historial Baruk593
                                    </p>

                                    <h2 className="mt-2 text-2xl font-black text-gray-900 md:text-3xl">
                                        Mis compras
                                    </h2>

                                    <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-gray-500">
                                        Consulta las compras realizadas con tu cuenta
                                        y las Baruk Cards correspondientes.
                                    </p>
                                </div>

                                {/* RESUMEN */}

                                <div className="mx-auto mt-7 grid max-w-4xl grid-cols-2 gap-3 md:grid-cols-4">

                                    <div className="rounded-2xl border border-gray-200 bg-white p-4 text-center">
                                        <p className="text-2xl font-black text-gray-900">
                                            {purchasesSummary.totalPurchases}
                                        </p>

                                        <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                            Compras
                                        </p>
                                    </div>

                                    <div className="rounded-2xl border border-gray-200 bg-white p-4 text-center">
                                        <p className="text-2xl font-black text-emerald-600">
                                            {purchasesSummary.paidPurchases}
                                        </p>

                                        <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                            Pagadas
                                        </p>
                                    </div>

                                    <div className="rounded-2xl border border-gray-200 bg-white p-4 text-center">
                                        <p className="text-2xl font-black text-[#ff6600]">
                                            ${purchasesSummary.totalInvested.toFixed(2)}
                                        </p>

                                        <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                            Comprado
                                        </p>
                                    </div>

                                    <div className="rounded-2xl border border-gray-200 bg-white p-4 text-center">
                                        <p className="text-2xl font-black text-gray-900">
                                            {purchasesSummary.totalCardsPurchased}
                                        </p>

                                        <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                            Cards compradas
                                        </p>
                                    </div>

                                </div>

                                {/* CARGANDO */}

                                {loadingPurchases && (
                                    <div className="mt-10 text-center">
                                        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#ff6600]" />

                                        <p className="mt-3 text-sm font-semibold text-gray-400">
                                            Cargando tus compras...
                                        </p>
                                    </div>
                                )}

                                {/* SIN COMPRAS */}

                                {!loadingPurchases &&
                                    purchases.length === 0 && (

                                        <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-gray-200 bg-gray-50 p-7 text-center">

                                            <p className="font-black text-gray-800">
                                                Todavía no tienes compras registradas.
                                            </p>

                                            <p className="mt-2 text-sm text-gray-500">
                                                Cuando adquieras Baruk Cards,
                                                tus compras aparecerán aquí.
                                            </p>

                                            <a
                                                href="/"
                                                className="mt-5 inline-flex rounded-xl bg-[#ff6600] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#ff7a22]"
                                            >
                                                Conseguir Baruk Cards
                                            </a>

                                        </div>
                                    )}

                                {/* LISTA DE COMPRAS */}

                                {!loadingPurchases &&
                                    purchases.length > 0 && (

                                        <div className="mx-auto mt-10 max-w-4xl space-y-4">

                                            {purchases.map(
                                                (purchase) => {
                                                    const status =
                                                        String(
                                                            purchase.status ??
                                                            ""
                                                        )
                                                            .trim()
                                                            .toLowerCase();

                                                    const paid =
                                                        status ===
                                                        "pagado" ||
                                                        status ===
                                                        "confirmado";

                                                    const isGift =
                                                        purchase.purchaseType ===
                                                        "gift";

                                                    return (
                                                        <article
                                                            key={
                                                                purchase.id
                                                            }
                                                            className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
                                                        >
                                                            <div
                                                                className={`h-1.5 ${paid
                                                                    ? "bg-emerald-500"
                                                                    : "bg-[#ff6600]"
                                                                    }`}
                                                            />

                                                            <div className="p-5 md:p-6">

                                                                {/* CABECERA */}

                                                                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">

                                                                    <div>
                                                                        <div className="flex flex-wrap items-center gap-2">

                                                                            <p className="text-lg font-black text-gray-900">
                                                                                Pedido #{purchase.id}
                                                                            </p>

                                                                            {isGift && (
                                                                                <span className="rounded-full bg-violet-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-violet-700">
                                                                                    Regalo
                                                                                </span>
                                                                            )}

                                                                        </div>

                                                                        <p className="mt-1 text-xs text-gray-400">
                                                                            {purchase.createdAt
                                                                                ? new Date(
                                                                                    purchase.createdAt
                                                                                ).toLocaleString(
                                                                                    "es-EC",
                                                                                    {
                                                                                        dateStyle:
                                                                                            "medium",

                                                                                        timeStyle:
                                                                                            "short",
                                                                                    }
                                                                                )
                                                                                : "Fecha no disponible"}
                                                                        </p>
                                                                    </div>

                                                                    <span
                                                                        className={`w-fit rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-wider ${paid
                                                                            ? "bg-emerald-50 text-emerald-700"
                                                                            : "bg-orange-50 text-[#ff6600]"
                                                                            }`}
                                                                    >
                                                                        {paid
                                                                            ? "Pago confirmado"
                                                                            : status ||
                                                                            "Pendiente"}
                                                                    </span>

                                                                </div>

                                                                {/* DATOS */}

                                                                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">

                                                                    <div className="rounded-xl bg-gray-50 p-3">
                                                                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                                                            Baruk Cards
                                                                        </p>

                                                                        <p className="mt-1 text-lg font-black text-gray-900">
                                                                            {purchase.quantity}
                                                                        </p>
                                                                    </div>

                                                                    <div className="rounded-xl bg-gray-50 p-3">
                                                                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                                                            Unitario
                                                                        </p>

                                                                        <p className="mt-1 font-black text-gray-900">
                                                                            $
                                                                            {purchase.unitPrice.toFixed(
                                                                                2
                                                                            )}
                                                                        </p>
                                                                    </div>

                                                                    <div className="rounded-xl bg-gray-50 p-3">
                                                                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                                                            Total
                                                                        </p>

                                                                        <p className="mt-1 font-black text-[#ff6600]">
                                                                            $
                                                                            {purchase.total.toFixed(
                                                                                2
                                                                            )}
                                                                        </p>
                                                                    </div>

                                                                    <div className="rounded-xl bg-gray-50 p-3">
                                                                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                                                            Método
                                                                        </p>

                                                                        <p className="mt-1 text-sm font-black capitalize text-gray-900">
                                                                            {purchase.paymentMethod ??
                                                                                "—"}
                                                                        </p>
                                                                    </div>

                                                                </div>

                                                                {/* COMPRA PARA EL MISMO USUARIO */}

                                                                {!isGift &&
                                                                    paid && (

                                                                        <div className="mt-5 flex flex-col gap-3 rounded-xl bg-[#fff6ef] p-4 sm:flex-row sm:items-center sm:justify-between">

                                                                            <div>
                                                                                <p className="text-sm font-black text-gray-900">
                                                                                    Tus tarjetas
                                                                                </p>

                                                                                <p className="mt-1 text-xs text-gray-500">
                                                                                    {purchase.cards.revealed ??
                                                                                        0}{" "}
                                                                                    revelada(s) ·{" "}
                                                                                    {purchase.cards.pending ??
                                                                                        0}{" "}
                                                                                    por revelar
                                                                                </p>
                                                                            </div>

                                                                            <a
                                                                                href="#mis-baruk-cards"
                                                                                className="inline-flex items-center justify-center rounded-xl bg-[#ff6600] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#ff7a22]"
                                                                            >
                                                                                Ver mis tarjetas
                                                                            </a>

                                                                        </div>
                                                                    )}

                                                                {/* REGALO */}

                                                                {isGift && (
                                                                    <div className="mt-5 rounded-xl border border-violet-100 bg-violet-50 p-4">

                                                                        <p className="text-sm font-black text-violet-900">
                                                                            Compra realizada como regalo
                                                                        </p>

                                                                        <p className="mt-1 text-xs leading-5 text-violet-700">
                                                                            Las Baruk Cards pertenecen al destinatario.
                                                                            Por privacidad, el estado de revelado
                                                                            de sus tarjetas no se muestra en tu cuenta.
                                                                        </p>

                                                                    </div>
                                                                )}

                                                                {/* PROCESAMIENTO */}

                                                                {paid &&
                                                                    purchase.cardsProcessingStatus &&
                                                                    purchase.cardsProcessingStatus !==
                                                                    "completed" && (

                                                                        <p className="mt-4 text-xs font-semibold text-orange-600">
                                                                            Estado de las tarjetas:{" "}
                                                                            {
                                                                                purchase.cardsProcessingStatus
                                                                            }
                                                                        </p>
                                                                    )}

                                                            </div>
                                                        </article>
                                                    );
                                                }
                                            )}

                                        </div>
                                    )}

                            </section>



                            {/* =====================================================
    MIS BARUK CARDS
===================================================== */}

                            <section
                                id="mis-baruk-cards"
                                className="mt-12"
                            >

                                <div className="text-center">

                                    <p className="text-xs font-black uppercase tracking-[0.22em] text-[#ff6600]">
                                        Mis Baruk Cards
                                    </p>

                                    <h2 className="mt-2 text-2xl font-black text-gray-900 md:text-3xl">
                                        Tus tarjetas
                                    </h2>

                                    <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-gray-500">
                                        Aquí puedes abrir las tarjetas que todavía
                                        tienes pendientes y volver a consultar las
                                        que ya revelaste.
                                    </p>

                                </div>

                                {/* RESUMEN DE TARJETAS */}

                                <div className="mx-auto mt-7 grid max-w-2xl grid-cols-3 gap-3">

                                    <div className="rounded-2xl border border-gray-200 bg-white p-4 text-center">

                                        <p className="text-2xl font-black text-gray-900">
                                            {
                                                cardsSummary.total
                                            }
                                        </p>

                                        <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                            Total
                                        </p>

                                    </div>

                                    <div className="rounded-2xl border border-gray-200 bg-white p-4 text-center">

                                        <p className="text-2xl font-black text-[#ff6600]">
                                            {
                                                cardsSummary.pending
                                            }
                                        </p>

                                        <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                            Por revelar
                                        </p>

                                    </div>

                                    <div className="rounded-2xl border border-gray-200 bg-white p-4 text-center">

                                        <p className="text-2xl font-black text-emerald-600">
                                            {
                                                cardsSummary.revealed
                                            }
                                        </p>

                                        <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                            Reveladas
                                        </p>

                                    </div>

                                </div>

                                {/* CARGANDO */}

                                {loadingCards && (
                                    <div className="mt-10 text-center">

                                        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#ff6600]" />

                                        <p className="mt-3 text-sm font-semibold text-gray-400">
                                            Cargando tus Baruk Cards...
                                        </p>

                                    </div>
                                )}

                                {/* SIN TARJETAS */}

                                {!loadingCards &&
                                    cards.length === 0 && (

                                        <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-gray-200 bg-gray-50 p-7 text-center">

                                            <p className="font-black text-gray-800">
                                                Todavía no tienes Baruk Cards.
                                            </p>

                                            <p className="mt-2 text-sm text-gray-500">
                                                Cuando compres o recibas una tarjeta,
                                                aparecerá automáticamente aquí.
                                            </p>

                                            <a
                                                href="/"
                                                className="mt-5 inline-flex items-center justify-center rounded-xl bg-[#ff6600] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#ff7a22]"
                                            >
                                                Conseguir Baruk Cards
                                            </a>

                                        </div>
                                    )}

                                {/* GRID DE TARJETAS */}

                                {!loadingCards &&
                                    cards.length > 0 && (

                                        <div className="mt-10 grid grid-cols-1 gap-x-8 gap-y-14 md:grid-cols-2 xl:grid-cols-3">

                                            {cards.map(
                                                (
                                                    card,
                                                    index
                                                ) => (

                                                    <div
                                                        key={
                                                            card.id
                                                        }
                                                        className="flex flex-col items-center"
                                                    >

                                                        {/* CABECERA DE CADA CARD */}

                                                        <div className="mb-3 flex flex-wrap items-center justify-center gap-2">

                                                            <div className="rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-500 shadow-sm">
                                                                Baruk Card{" "}
                                                                {
                                                                    index +
                                                                    1
                                                                }
                                                            </div>

                                                            <div
                                                                className={`rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-wider ${card.revealed
                                                                    ? "bg-emerald-50 text-emerald-700"
                                                                    : "bg-orange-50 text-[#ff6600]"
                                                                    }`}
                                                            >
                                                                {
                                                                    card.revealed
                                                                        ? "Revelada"
                                                                        : "Por revelar"
                                                                }
                                                            </div>

                                                        </div>

                                                        {/* TARJETA */}

                                                        <BarukRevealCard
                                                            cardId={
                                                                card.id
                                                            }
                                                            email={
                                                                account.email
                                                            }
                                                            initialRevealed={
                                                                card.revealed
                                                            }
                                                            onRevealed={(
                                                                result
                                                            ) => {
                                                                handleCardRevealed(
                                                                    result.id,
                                                                    result.revealedAt
                                                                );
                                                            }}
                                                        />

                                                        {/* INFORMACIÓN INFERIOR */}

                                                        <div className="mt-3 text-center">

                                                            <p className="text-[11px] text-gray-400">
                                                                {
                                                                    card.origin ===
                                                                        "instant_prize"
                                                                        ? "Tarjeta obtenida como premio"
                                                                        : card.origin ===
                                                                            "gift"
                                                                            ? "Tarjeta recibida como regalo"
                                                                            : "Baruk Card"
                                                                }
                                                            </p>

                                                            {card.revealed &&
                                                                card.revealed_at && (

                                                                    <p className="mt-1 text-[10px] text-gray-400">
                                                                        Revelada el{" "}
                                                                        {
                                                                            new Date(
                                                                                card.revealed_at
                                                                            ).toLocaleDateString(
                                                                                "es-EC"
                                                                            )
                                                                        }
                                                                    </p>
                                                                )}

                                                        </div>

                                                    </div>
                                                )
                                            )}

                                        </div>
                                    )}

                            </section>

                            {/* COLECCIÓN DE ESFERAS */}

                            <section className="mt-10">

                                <div className="text-center">

                                    <p className="text-xs font-black uppercase tracking-[0.22em] text-[#ff6600]">
                                        Colección Baruk593
                                    </p>

                                    <h2 className="mt-2 text-2xl font-black text-gray-900 md:text-3xl">
                                        Las 7 esferas
                                    </h2>

                                    <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-gray-500">
                                        Revela tus Baruk Cards y reúne las siete esferas.
                                        Las esferas repetidas también permanecen en tu cuenta.
                                    </p>

                                </div>

                                {loadingCollection && (
                                    <div className="mt-10 text-center text-sm font-semibold text-gray-400">
                                        Cargando colección...
                                    </div>
                                )}

                                {!loadingCollection &&
                                    collection && (
                                        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">

                                            {collection.spheres.map(
                                                (
                                                    sphere
                                                ) => (
                                                    <div
                                                        key={
                                                            sphere.id
                                                        }
                                                        className={`relative rounded-3xl border p-4 text-center transition ${sphere.obtained
                                                            ? "border-orange-200 bg-orange-50 shadow-md"
                                                            : "border-gray-200 bg-gray-50"
                                                            }`}
                                                    >

                                                        {/* DUPLICADOS */}

                                                        {sphere.ownedCount >
                                                            1 && (
                                                                <div className="absolute right-2 top-2 rounded-full bg-[#ff6600] px-2 py-1 text-[10px] font-black text-white">
                                                                    x
                                                                    {
                                                                        sphere.ownedCount
                                                                    }
                                                                </div>
                                                            )}

                                                        {/* ESFERA */}

                                                        <div
                                                            className={`mx-auto flex aspect-square w-full max-w-[110px] items-center justify-center rounded-full border-4 ${sphere.obtained
                                                                ? "border-orange-200 bg-gradient-to-br from-[#ff6600] via-[#ff8533] to-[#ffb067] shadow-lg"
                                                                : "border-gray-200 bg-gradient-to-br from-gray-100 to-gray-200"
                                                                }`}
                                                        >

                                                            {sphere.obtained ? (
                                                                <div className="text-center text-white">

                                                                    <p className="text-[10px] font-black uppercase tracking-wider opacity-80">
                                                                        Esfera
                                                                    </p>

                                                                    <p className="text-3xl font-black">
                                                                        {
                                                                            sphere.number
                                                                        }
                                                                    </p>

                                                                </div>
                                                            ) : (
                                                                <div className="text-center text-gray-400">

                                                                    <p className="text-2xl">
                                                                        ?
                                                                    </p>

                                                                </div>
                                                            )}

                                                        </div>

                                                        {/* NOMBRE */}

                                                        <p
                                                            className={`mt-4 min-h-[40px] text-xs font-black ${sphere.obtained
                                                                ? "text-gray-900"
                                                                : "text-gray-400"
                                                                }`}
                                                        >
                                                            {
                                                                sphere.obtained
                                                                    ? sphere.name
                                                                    : `Esfera ${sphere.number}`
                                                            }
                                                        </p>

                                                        <p
                                                            className={`mt-2 text-[10px] font-bold uppercase tracking-wider ${sphere.obtained
                                                                ? "text-[#ff6600]"
                                                                : "text-gray-300"
                                                                }`}
                                                        >
                                                            {
                                                                sphere.obtained
                                                                    ? "Encontrada"
                                                                    : "Por descubrir"
                                                            }
                                                        </p>

                                                    </div>
                                                )
                                            )}

                                        </div>
                                    )}

                            </section>

                            {/* PROGRESO */}

                            {summary && (
                                <div className="mt-10 rounded-2xl border border-gray-200 bg-gray-50 p-6">

                                    <div className="flex items-center justify-between gap-4">

                                        <div>
                                            <p className="text-sm font-black text-gray-900">
                                                Progreso de tu colección
                                            </p>

                                            <p className="mt-1 text-xs text-gray-500">
                                                {
                                                    summary.uniqueSpheres
                                                }{" "}
                                                de{" "}
                                                {
                                                    summary.sphereGoal
                                                }{" "}
                                                esferas diferentes
                                            </p>
                                        </div>

                                        <p className="text-lg font-black text-[#ff6600]">
                                            {Math.round(
                                                (
                                                    summary.uniqueSpheres /
                                                    summary.sphereGoal
                                                ) *
                                                100
                                            )}
                                            %
                                        </p>
                                    </div>

                                    <div className="mt-4 h-3 overflow-hidden rounded-full bg-gray-200">

                                        <div
                                            className="h-full rounded-full bg-[#ff6600] transition-all duration-500"
                                            style={{
                                                width: `${Math.min(
                                                    100,
                                                    (
                                                        summary.uniqueSpheres /
                                                        summary.sphereGoal
                                                    ) *
                                                    100
                                                )}%`,
                                            }}
                                        />

                                    </div>

                                    {summary.totalSphereCopies >
                                        summary.uniqueSpheres && (
                                            <p className="mt-4 text-xs text-gray-500">
                                                También tienes{" "}
                                                <strong>
                                                    {
                                                        summary.totalSphereCopies -
                                                        summary.uniqueSpheres
                                                    }
                                                </strong>{" "}
                                                esfera(s) repetida(s).
                                            </p>
                                        )}

                                </div>
                            )}

                            {/* =====================================================
    MIS PREMIOS
===================================================== */}

                            <section className="mt-12">

                                <div className="text-center">

                                    <p className="text-xs font-black uppercase tracking-[0.22em] text-[#ff6600]">
                                        Premios Baruk593
                                    </p>

                                    <h2 className="mt-2 text-2xl font-black text-gray-900 md:text-3xl">
                                        Mis premios
                                    </h2>

                                    <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-gray-500">
                                        Aquí aparecen los premios que ya descubriste
                                        al revelar tus Baruk Cards.
                                    </p>

                                </div>

                                {/* RESUMEN */}

                                <div className="mx-auto mt-7 grid max-w-3xl grid-cols-2 gap-3 md:grid-cols-4">

                                    <div className="rounded-2xl border border-gray-200 bg-white p-4 text-center">
                                        <p className="text-2xl font-black text-gray-900">
                                            {prizesSummary.total}
                                        </p>

                                        <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                            Total
                                        </p>
                                    </div>

                                    <div className="rounded-2xl border border-gray-200 bg-white p-4 text-center">
                                        <p className="text-2xl font-black text-[#ff6600]">
                                            {prizesSummary.pending}
                                        </p>

                                        <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                            Pendientes
                                        </p>
                                    </div>

                                    <div className="rounded-2xl border border-gray-200 bg-white p-4 text-center">
                                        <p className="text-2xl font-black text-blue-600">
                                            {prizesSummary.scheduled}
                                        </p>

                                        <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                            Programados
                                        </p>
                                    </div>

                                    <div className="rounded-2xl border border-gray-200 bg-white p-4 text-center">
                                        <p className="text-2xl font-black text-emerald-600">
                                            {prizesSummary.delivered}
                                        </p>

                                        <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                            Entregados
                                        </p>
                                    </div>

                                </div>

                                {/* CARGANDO */}

                                {loadingPrizes && (
                                    <div className="mt-10 text-center">

                                        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#ff6600]" />

                                        <p className="mt-3 text-sm font-semibold text-gray-400">
                                            Cargando tus premios...
                                        </p>

                                    </div>
                                )}

                                {/* SIN PREMIOS */}

                                {!loadingPrizes &&
                                    prizes.length === 0 && (

                                        <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-gray-200 bg-gray-50 p-7 text-center">

                                            <div className="text-3xl">
                                                🎁
                                            </div>

                                            <p className="mt-3 font-black text-gray-800">
                                                Todavía no tienes premios revelados.
                                            </p>

                                            <p className="mt-2 text-sm leading-6 text-gray-500">
                                                Sigue revelando tus Baruk Cards.
                                                Cuando descubras un premio aparecerá aquí.
                                            </p>

                                        </div>
                                    )}

                                {/* PREMIOS */}

                                {!loadingPrizes &&
                                    prizes.length > 0 && (

                                        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2">

                                            {prizes.map(
                                                (
                                                    item
                                                ) => {

                                                    const statusLabel =
                                                        item.status ===
                                                            "delivered"
                                                            ? "Entregado"
                                                            : item.status ===
                                                                "scheduled"
                                                                ? "Entrega programada"
                                                                : item.status ===
                                                                    "verified"
                                                                    ? "Verificado"
                                                                    : item.status ===
                                                                        "cancelled"
                                                                        ? "Cancelado"
                                                                        : "Pendiente de reclamar";

                                                    const statusClass =
                                                        item.status ===
                                                            "delivered"
                                                            ? "bg-emerald-50 text-emerald-700"
                                                            : item.status ===
                                                                "scheduled"
                                                                ? "bg-blue-50 text-blue-700"
                                                                : item.status ===
                                                                    "verified"
                                                                    ? "bg-violet-50 text-violet-700"
                                                                    : item.status ===
                                                                        "cancelled"
                                                                        ? "bg-red-50 text-red-600"
                                                                        : "bg-orange-50 text-[#ff6600]";

                                                    const typeLabel =
                                                        item.prize
                                                            ?.type ===
                                                            "digital_cards"
                                                            ? "Baruk Cards"
                                                            : item.prize
                                                                ?.type ===
                                                                "cash"
                                                                ? "Premio en efectivo"
                                                                : item.prize
                                                                    ?.type ===
                                                                    "physical"
                                                                    ? "Premio físico"
                                                                    : item.prize
                                                                        ?.type ===
                                                                        "experience"
                                                                        ? "Experiencia"
                                                                        : item.prize
                                                                            ?.type ===
                                                                            "discount"
                                                                            ? "Beneficio"
                                                                            : "Premio";

                                                    return (
                                                        <article
                                                            key={
                                                                item.cardId
                                                            }
                                                            className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm"
                                                        >

                                                            <div className="h-1.5 bg-gradient-to-r from-[#ff6600] to-[#ff9a55]" />

                                                            <div className="p-6">

                                                                <div className="flex items-start justify-between gap-4">

                                                                    <div>

                                                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ff6600]">
                                                                            {
                                                                                typeLabel
                                                                            }
                                                                        </p>

                                                                        <h3 className="mt-2 text-xl font-black text-gray-900">
                                                                            {
                                                                                item.prize
                                                                                    ?.name ??
                                                                                "Premio Baruk593"
                                                                            }
                                                                        </h3>

                                                                    </div>

                                                                    <div
                                                                        className={`shrink-0 rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-wider ${statusClass}`}
                                                                    >
                                                                        {
                                                                            statusLabel
                                                                        }
                                                                    </div>

                                                                </div>

                                                                {item.prize
                                                                    ?.description && (

                                                                        <p className="mt-4 text-sm leading-6 text-gray-500">
                                                                            {
                                                                                item.prize
                                                                                    .description
                                                                            }
                                                                        </p>
                                                                    )}

                                                                {item.prize
                                                                    ?.type ===
                                                                    "digital_cards" &&
                                                                    item.prize
                                                                        .cardQuantity && (

                                                                        <div className="mt-5 rounded-2xl bg-orange-50 p-4">

                                                                            <p className="text-xs font-bold text-gray-500">
                                                                                Tarjetas obtenidas
                                                                            </p>

                                                                            <p className="mt-1 text-2xl font-black text-[#ff6600]">
                                                                                +
                                                                                {
                                                                                    item.prize
                                                                                        .cardQuantity
                                                                                }{" "}
                                                                                Baruk Cards
                                                                            </p>

                                                                        </div>
                                                                    )}

                                                                {item.prize
                                                                    ?.referenceValue !==
                                                                    null &&
                                                                    item.prize
                                                                        ?.referenceValue !==
                                                                    undefined && (

                                                                        <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">

                                                                            <span className="text-xs font-semibold text-gray-400">
                                                                                Valor referencial
                                                                            </span>

                                                                            <span className="font-black text-gray-800">
                                                                                $
                                                                                {Number(
                                                                                    item.prize
                                                                                        .referenceValue
                                                                                ).toFixed(
                                                                                    2
                                                                                )}
                                                                            </span>

                                                                        </div>
                                                                    )}

                                                                {item.revealedAt && (

                                                                    <p className="mt-4 text-[10px] text-gray-400">
                                                                        Premio descubierto el{" "}
                                                                        {
                                                                            new Date(
                                                                                item.revealedAt
                                                                            ).toLocaleDateString(
                                                                                "es-EC"
                                                                            )
                                                                        }
                                                                    </p>
                                                                )}

                                                            </div>

                                                        </article>
                                                    );
                                                }
                                            )}

                                        </div>
                                    )}

                            </section>

                            {/* ACCIONES */}

                            <div className="mt-10 flex flex-col gap-3 sm:flex-row">

                                <a
                                    href="/"
                                    className="inline-flex items-center justify-center rounded-xl bg-[#ff6600] px-6 py-3 font-bold text-white shadow-md transition hover:bg-[#ff7a22]"
                                >
                                    Conseguir más Baruk Cards
                                </a>

                            </div>

                        </div>
                    </div>
                </div>
            </main>
        );
    }

    /*
     * =========================================================
     * MAGIC LINK ENVIADO
     * =========================================================
     */

    if (sent) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-white px-4">

                <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-xl">

                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-orange-50 text-3xl">
                        ✉️
                    </div>

                    <h1 className="mt-5 text-2xl font-black text-gray-900">
                        Revisa tu correo
                    </h1>

                    <p className="mt-3 text-sm leading-6 text-gray-500">
                        Enviamos un enlace seguro de acceso a:
                    </p>

                    <p className="mt-2 break-all font-bold text-[#ff6600]">
                        {email}
                    </p>

                    <p className="mt-4 text-sm leading-6 text-gray-500">
                        Abre el enlace para ingresar a tu cuenta Baruk593.
                        No necesitas contraseña.
                    </p>

                    <p className="mt-4 text-xs leading-5 text-gray-400">
                        Si no encuentras el mensaje, revisa también tu carpeta de correo no deseado.
                    </p>

                    <button
                        type="button"
                        onClick={() => {
                            setSent(
                                false
                            );

                            setError(
                                null
                            );
                        }}
                        className="mt-7 text-sm font-bold text-gray-600 underline"
                    >
                        Usar otro correo
                    </button>

                </div>
            </main>
        );
    }

    /*
     * =========================================================
     * FORMULARIO DE ACCESO
     * =========================================================
     */

    return (
        <main className="flex min-h-screen items-center justify-center bg-white px-4">

            <div className="w-full max-w-md overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-xl">

                <div className="h-2 bg-gradient-to-r from-[#ff6600] to-[#ff9a55]" />

                <div className="p-8">

                    <div className="text-center">

                        <p className="text-xs font-black uppercase tracking-[0.25em] text-[#ff6600]">
                            BARUK593
                        </p>

                        <h1 className="mt-3 text-3xl font-black text-gray-900">
                            Mi cuenta
                        </h1>

                        <p className="mt-3 text-sm leading-6 text-gray-500">
                            Ingresa tu correo para acceder a tus Baruk Cards,
                            esferas, premios y compras.
                        </p>

                    </div>

                    <form
                        onSubmit={
                            handleSubmit
                        }
                        className="mt-8"
                    >

                        <label
                            htmlFor="baruk-email"
                            className="text-sm font-bold text-gray-700"
                        >
                            Correo electrónico
                        </label>

                        <input
                            id="baruk-email"
                            type="email"
                            autoComplete="email"
                            required
                            value={
                                email
                            }
                            onChange={(
                                event
                            ) =>
                                setEmail(
                                    event.target.value
                                )
                            }
                            placeholder="tu@correo.com"
                            className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-[#ff6600] focus:ring-2 focus:ring-[#ff6600]/15"
                        />

                        {error && (
                            <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-600">
                                {
                                    error
                                }
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={
                                loading
                            }
                            className="mt-6 w-full rounded-xl bg-[#ff6600] px-5 py-3.5 font-bold text-white shadow-lg transition hover:bg-[#ff7a22] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {
                                loading
                                    ? "Enviando enlace..."
                                    : "Recibir enlace de acceso"
                            }
                        </button>

                    </form>

                    <p className="mt-6 text-center text-xs leading-5 text-gray-400">
                        El acceso se realiza mediante un enlace seguro enviado a tu correo.
                    </p>

                </div>
            </div>
        </main>
    );
}