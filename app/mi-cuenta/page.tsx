"use client";

import {
    type ClipboardEvent,
    type FormEvent,
    type KeyboardEvent,
    useEffect,
    useRef,
    useState,
} from "react";

import { supabaseBrowser } from "@/lib/supabaseClient";
import BarukRevealCard from "@/components/baruk/BarukRevealCard";
import F1Sphere3D from "@/components/baruk/F1Sphere3D";

type AccountState = {
    email: string;
    totalCards: number;
};

type SphereRarity =
    | "common"
    | "rare"
    | "epic"
    | "legendary";

type SphereCollectionItem = {
    id: string;

    number: number;

    name: string;

    description:
    | string
    | null;

    collectionKey:
    | string
    | null;

    teamName:
    | string
    | null;

    teamSlug:
    | string
    | null;

    season:
    | number
    | null;

    rarity:
    | SphereRarity
    | null;

    primaryColor:
    | string
    | null;

    secondaryColor:
    | string
    | null;

    accentColor:
    | string
    | null;

    imageUrl:
    | string
    | null;

    carImageUrl:
    | string
    | null;

    active: boolean;

    marketplaceEnabled: boolean;

    stockTotal:
    | number
    | null;

    stockAssigned: number;

    obtained: boolean;

    ownedCount: number;

    availableCount: number;
    listedCount: number;
};

type CollectionInfo = {
    key: string;
    name: string;
    season: number;
    totalSpheres: number;
};

type CollectionSummary = {
    totalCards: number;
    revealedCards: number;

    uniqueSpheres: number;
    totalSphereCopies: number;

    totalAvailableSphereCopies: number;
    totalListedSphereCopies: number;

    sphereGoal: number;

    totalPrizes: number;

    collectionCompleted: boolean;
    canClaimReward: boolean;
};

type CollectionRewardClaim = {
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
};


type CollectionReward = {
    id: string;
    name: string;
    description: string | null;
    type: string;

    requiredSpheres: number;


    /*
     * Stock global del premio.
     */
    stockTotal: number;
    stockClaimed: number;
    stockRemaining: number;
    soldOut: boolean;


    completed: boolean;

    canClaim: boolean;

    totalClaims: number;

    claim:
    | CollectionRewardClaim
    | null;

    claims:
    CollectionRewardClaim[];
};

type CollectionState = {
    info: CollectionInfo;

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
    kind:
    | "instant"
    | "collection";
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

    createdAt:
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

    collection?:
    {
        uniqueSpheres: number;
        requiredSpheres: number;
    };

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

type SphereInventoryItem = {
    instanceId: string;

    originCardId: string;

    status:
    | "available"
    | "listed";

    createdAt: string;

    listedAt:
    | string
    | null;

    canSell: boolean;

    listing:
    | {
        id: string;
        price: number;
        currency: string;
        createdAt: string;
    }
    | null;

    sphere: {
        id: string;

        number: number;

        name: string;

        teamName:
        | string
        | null;

        teamSlug:
        | string
        | null;

        season:
        | number
        | null;

        rarity:
        | SphereRarity
        | null;

        primaryColor:
        | string
        | null;

        secondaryColor:
        | string
        | null;

        accentColor:
        | string
        | null;

        imageUrl:
        | string
        | null;

        carImageUrl:
        | string
        | null;
    };
};


export default function MiCuentaPage() {
    const [email, setEmail] =
        useState("");

    const [loading, setLoading] =
        useState(false);

    const [sent, setSent] =
        useState(false);

    /*
     * Código OTP de 6 dígitos.
     */
    const [
        otpDigits,
        setOtpDigits,
    ] =
        useState<string[]>([
            "",
            "",
            "",
            "",
            "",
            "",
        ]);

    const [
        verifyingOtp,
        setVerifyingOtp,
    ] =
        useState(false);

    const [
        resendCooldown,
        setResendCooldown,
    ] =
        useState(0);

    const otpRefs =
        useRef<
            Array<HTMLInputElement | null>
        >([]);

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
        showCards,
        setShowCards,
    ] =
        useState(false);

    const [
        cardsLoaded,
        setCardsLoaded,
    ] =
        useState(false);

    const [
        showAllCards,
        setShowAllCards,
    ] =
        useState(false);

    const [
        sessionRevealedCardIds,
        setSessionRevealedCardIds,
    ] =
        useState<string[]>(
            []
        );

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

    const [
        sphereInventory,
        setSphereInventory,
    ] =
        useState<SphereInventoryItem[]>(
            []
        );

    const [
        loadingSphereInventory,
        setLoadingSphereInventory,
    ] =
        useState(false);

    const [
        sellingInstanceId,
        setSellingInstanceId,
    ] =
        useState<string | null>(
            null
        );

    const [
        sellPrice,
        setSellPrice,
    ] =
        useState("");

    const [
        marketplaceBusy,
        setMarketplaceBusy,
    ] =
        useState<string | null>(
            null
        );

    const [
        claimingReward,
        setClaimingReward,
    ] =
        useState(false);

    const [
        showRewardCelebration,
        setShowRewardCelebration,
    ] =
        useState(false);

    const [
        rewardMessage,
        setRewardMessage,
    ] =
        useState<string | null>(
            null
        );

    const [
        claimRequestId,
        setClaimRequestId,
    ] =
        useState<string | null>(
            null
        );

    const [
        activatingAll,
        setActivatingAll,
    ] =
        useState(false);

    const [
        activatingProgress,
        setActivatingProgress,
    ] =
        useState({
            current: 0,
            total: 0,
        });

    const [
        isAffiliate,
        setIsAffiliate,
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
                info:
                    data.collection ?? {
                        key:
                            "f1-2026",

                        name:
                            "F1 Sphere Collection",

                        season:
                            2026,

                        totalSpheres:
                            11,
                    },

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
             * el total de Tarjetas.
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

    async function loadAffiliateStatus(
        accessToken: string
    ) {
        try {

            const response =
                await fetch(
                    "/api/mi-cuenta/afiliado/status",
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
                    .json()
                    .catch(
                        () =>
                            null
                    );


            if (
                !response.ok ||
                !data?.ok
            ) {
                setIsAffiliate(
                    false
                );

                return;
            }


            setIsAffiliate(
                Boolean(
                    data.isAffiliate
                )
            );


        } catch (
        error
        ) {

            console.error(
                "Affiliate status:",
                error
            );


            setIsAffiliate(
                false
            );
        }
    }

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

        setCardsSummary({
            total:
                Number(
                    data.totalCards ??
                    0
                ),

            revealed: 0,

            pending: 0,
        });

        setSent(false);

        /*
         * Una vez vinculadas las tarjetas,
         * cargamos la colección.
         */
        await Promise.all([
            loadCards(
                accessToken
            ),

            loadCollection(
                accessToken
            ),

            loadPrizes(
                accessToken
            ),

            loadPurchases(
                accessToken
            ),

            loadSphereInventory(
                accessToken
            ),

            loadAffiliateStatus(
                accessToken
            ),
        ]);

        setCardsLoaded(
            true
        );

        setShowCards(
            true
        );
    }

    async function loadSphereInventory(
        accessToken: string
    ) {
        setLoadingSphereInventory(
            true
        );

        try {

            const response =
                await fetch(
                    "/api/marketplace/spheres/my-inventory",
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
                    "No se pudo cargar tu inventario de F1 Spheres"
                );
            }

            setSphereInventory(
                data.instances ??
                []
            );

        } finally {

            setLoadingSphereInventory(
                false
            );
        }
    }

    async function handleClaimCollectionReward() {

        if (
            claimingReward ||
            !collection?.summary
                .canClaimReward
        ) {
            return;
        }


        setClaimingReward(
            true
        );

        setError(
            null
        );

        setRewardMessage(
            null
        );


        /*
         * Si estamos reintentando una solicitud
         * cuyo resultado pudo haberse perdido,
         * utilizamos el mismo UUID.
         */
        const requestId =
            claimRequestId ??
            crypto.randomUUID();


        if (
            !claimRequestId
        ) {
            setClaimRequestId(
                requestId
            );
        }


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
                    "Tu sesión ha finalizado. Vuelve a iniciar sesión."
                );
            }


            const response =
                await fetch(
                    "/api/mi-cuenta/coleccion/reclamar",
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
                                claimRequestId:
                                    requestId,
                            }),

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
                    "No se pudo reclamar el premio."
                );
            }


            /*
             * El servidor confirmó que la operación
             * fue procesada.
             *
             * Podemos liberar el UUID.
             */
            setClaimRequestId(
                null
            );


            setRewardMessage(
                data.alreadyProcessed
                    ? "Este reclamo ya había sido procesado correctamente."
                    : "¡Premio reclamado correctamente! Las 11 F1 Spheres utilizadas fueron registradas."
            );

            setShowRewardCelebration(
                true
            );


            window.setTimeout(
                () => {

                    setShowRewardCelebration(
                        false
                    );

                },
                4500
            );

            /*
             * Las 11 utilizadas ahora están redeemed.
             *
             * Recargamos colección e inventario
             * para reflejar inmediatamente el cambio.
             */
            await Promise.all([

                loadCollection(
                    session.access_token
                ),

                loadSphereInventory(
                    session.access_token
                ),

                loadPrizes(
                    session.access_token
                ),
            ]);


        } catch (
        err: unknown
        ) {

            /*
             * NO limpiamos claimRequestId aquí.
             *
             * Si el servidor alcanzó a procesar el
             * reclamo pero la respuesta se perdió,
             * el siguiente intento reutilizará
             * exactamente el mismo UUID.
             */
            setError(
                err instanceof Error
                    ? err.message
                    : "No se pudo reclamar el premio."
            );

        } finally {

            setClaimingReward(
                false
            );
        }
    }

    function handleToggleCards() {

        setShowAllCards(
            (
                current
            ) =>
                !current
        );
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

                            setSphereInventory([]);

                            setSellingInstanceId(
                                null
                            );

                            setIsAffiliate(false);

                            setSellPrice(
                                ""
                            );

                            setClaimingReward(false);
                            setRewardMessage(null);
                            setClaimRequestId(null);

                            setMarketplaceBusy(
                                null
                            );

                            setCards([]);

                            setShowCards(false);
                            setCardsLoaded(false);

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
     * OTP DE 6 DÍGITOS
     * =========================================================
     */

    useEffect(() => {
        if (
            resendCooldown <= 0
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
                                current - 1
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
    }, [
        resendCooldown,
    ]);


    function limpiarOtp() {
        setOtpDigits([
            "",
            "",
            "",
            "",
            "",
            "",
        ]);
    }


    async function enviarCodigoOtp(
        normalizedEmail: string
    ) {
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
                        /*
                         * Conservamos el comportamiento
                         * actual de Baruk593:
                         * si todavía no existe una cuenta
                         * Auth para ese correo, Supabase
                         * puede crearla.
                         */
                        shouldCreateUser:
                            true,
                    },
                });


        if (
            signInError
        ) {
            throw signInError;
        }
    }

    async function handleGoogleLogin() {
        setLoading(true);
        setError(null);

        try {
            const redirectTo =
                `${window.location.origin}/mi-cuenta`;

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
        err: unknown
        ) {

            setError(
                err instanceof Error
                    ? err.message
                    : "No se pudo iniciar sesión con Google."
            );

            setLoading(
                false
            );
        }
    }

    async function handleSubmit(
        event: FormEvent<HTMLFormElement>
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


        setLoading(
            true
        );

        setError(
            null
        );


        try {

            await enviarCodigoOtp(
                normalizedEmail
            );


            setEmail(
                normalizedEmail
            );

            limpiarOtp();

            setSent(
                true
            );

            /*
             * Supabase limita por defecto
             * las solicitudes de OTP por correo.
             * Mostramos el mismo tiempo para
             * evitar reintentos innecesarios.
             */
            setResendCooldown(
                60
            );


            window.setTimeout(
                () => {
                    otpRefs
                        .current[0]
                        ?.focus();
                },
                120
            );


        } catch (
        err: unknown
        ) {

            setError(
                err instanceof
                    Error
                    ? err.message
                    : "No se pudo enviar el código de acceso."
            );


        } finally {

            setLoading(
                false
            );
        }
    }


    function handleOtpChange(
        index: number,
        value: string
    ) {

        const digits =
            value
                .replace(
                    /\D/g,
                    ""
                )
                .slice(
                    0,
                    6
                );


        if (
            digits.length >
            1
        ) {

            setOtpDigits(
                (
                    current
                ) => {

                    const next =
                        [
                            ...current,
                        ];


                    digits
                        .split(
                            ""
                        )
                        .forEach(
                            (
                                digit,
                                offset
                            ) => {

                                const targetIndex =
                                    index +
                                    offset;


                                if (
                                    targetIndex <
                                    6
                                ) {

                                    next[
                                        targetIndex
                                    ] =
                                        digit;
                                }
                            }
                        );


                    return next;
                }
            );


            setError(
                null
            );


            const nextFocus =
                Math.min(
                    index +
                    digits.length,
                    5
                );


            window.setTimeout(
                () => {

                    otpRefs
                        .current[
                        nextFocus
                    ]
                        ?.focus();

                },
                0
            );


            return;
        }


        const digit =
            digits
                .slice(
                    -1
                );


        setOtpDigits(
            (
                current
            ) => {

                const next =
                    [
                        ...current,
                    ];

                next[index] =
                    digit;

                return next;
            }
        );


        setError(
            null
        );


        if (
            digit &&
            index < 5
        ) {

            otpRefs
                .current[
                index + 1
            ]
                ?.focus();
        }
    }


    function handleOtpKeyDown(
        index: number,
        event:
            KeyboardEvent<HTMLInputElement>
    ) {

        if (
            event.key ===
            "Backspace" &&
            !otpDigits[index] &&
            index > 0
        ) {

            otpRefs
                .current[
                index - 1
            ]
                ?.focus();
        }


        if (
            event.key ===
            "ArrowLeft" &&
            index > 0
        ) {

            event
                .preventDefault();

            otpRefs
                .current[
                index - 1
            ]
                ?.focus();
        }


        if (
            event.key ===
            "ArrowRight" &&
            index < 5
        ) {

            event
                .preventDefault();

            otpRefs
                .current[
                index + 1
            ]
                ?.focus();
        }
    }


    function handleOtpPaste(
        event:
            ClipboardEvent<HTMLInputElement>
    ) {

        event
            .preventDefault();


        const digits =
            event
                .clipboardData
                .getData(
                    "text"
                )
                .replace(
                    /\D/g,
                    ""
                )
                .slice(
                    0,
                    6
                )
                .split(
                    ""
                );


        if (
            digits.length ===
            0
        ) {
            return;
        }


        const next =
            Array.from(
                {
                    length: 6,
                },
                (
                    _,
                    index
                ) =>
                    digits[index] ??
                    ""
            );


        setOtpDigits(
            next
        );

        setError(
            null
        );


        const focusIndex =
            Math.min(
                digits.length,
                6
            ) - 1;


        window.setTimeout(
            () => {

                otpRefs
                    .current[
                    focusIndex
                ]
                    ?.focus();

            },
            0
        );
    }


    async function handleVerifyOtp(
        event:
            FormEvent<HTMLFormElement>
    ) {

        event
            .preventDefault();


        const normalizedEmail =
            email
                .trim()
                .toLowerCase();


        const token =
            otpDigits
                .join(
                    ""
                );


        if (
            !/^\d{6}$/.test(
                token
            )
        ) {

            setError(
                "Ingresa los 6 dígitos del código."
            );

            return;
        }


        setVerifyingOtp(
            true
        );

        setError(
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

                        token,

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
                    "No se pudo iniciar la sesión. Solicita un nuevo código."
                );
            }


            /*
             * verifyOtp crea la sesión.
             * El listener SIGNED_IN que ya existe
             * en esta página ejecutará linkAccount()
             * y cargará compras, tarjetas, colección,
             * premios e inventario.
             */
            limpiarOtp();


        } catch (
        err: unknown
        ) {

            setError(
                err instanceof
                    Error
                    ? err.message
                    : "El código ingresado no es válido o ya expiró."
            );


        } finally {

            setVerifyingOtp(
                false
            );
        }
    }


    async function handleResendOtp() {

        if (
            loading ||
            resendCooldown >
            0
        ) {
            return;
        }


        const normalizedEmail =
            email
                .trim()
                .toLowerCase();


        setLoading(
            true
        );

        setError(
            null
        );


        try {

            await enviarCodigoOtp(
                normalizedEmail
            );


            limpiarOtp();

            setResendCooldown(
                60
            );


            window.setTimeout(
                () => {

                    otpRefs
                        .current[0]
                        ?.focus();

                },
                100
            );


        } catch (
        err: unknown
        ) {

            setError(
                err instanceof
                    Error
                    ? err.message
                    : "No se pudo reenviar el código."
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
         * La tarjeta que acabamos de revelar
         * permanecerá visible para que el usuario
         * pueda ver tranquilamente el resultado.
         */
        setSessionRevealedCardIds(
            (
                current
            ) => {

                if (
                    current.includes(
                        cardId
                    )
                ) {
                    return current;
                }

                return [
                    ...current,
                    cardId,
                ];
            }
        );


        /*
         * Actualizamos SOLO esa tarjeta localmente.
         *
         * NO volvemos a cargar todas las tarjetas.
         */
        setCards(
            (
                currentCards
            ) =>
                currentCards.map(
                    (
                        card
                    ) =>
                        card.id ===
                            cardId

                            ? {
                                ...card,

                                revealed:
                                    true,

                                revealed_at:
                                    revealedAt ??
                                    new Date()
                                        .toISOString(),

                                estado:
                                    "revealed",
                            }

                            : card
                )
        );


        /*
         * Actualizar contadores localmente.
         */
        setCardsSummary(
            (
                current
            ) => ({
                ...current,

                revealed:
                    current.revealed +
                    1,

                pending:
                    Math.max(
                        0,
                        current.pending -
                        1
                    ),
            })
        );


        /*
         * Actualizamos únicamente la información
         * que puede haber cambiado por el revelado:
         *
         * - colección F1
         * - premios
         * - compras
         * - inventario de esferas
         *
         * IMPORTANTE:
         * NO llamamos loadCards().
         */
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
                return;
            }


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

                loadSphereInventory(
                    session.access_token
                ),
            ]);

        } catch (
        err:
            unknown
        ) {

            console.error(
                "No se pudo actualizar la cuenta después del revelado:",
                err
            );
        }
    }

    async function handleActivateAll() {
        if (
            activatingAll ||
            cardsSummary.pending <= 0
        ) {
            return;
        }

        setActivatingAll(
            true
        );

        setError(
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
                    "Tu sesión ha finalizado. Vuelve a iniciar sesión."
                );
            }

            const pendientes =
                cards.filter(
                    (
                        card
                    ) =>
                        !card.revealed
                );

            if (
                pendientes.length ===
                0
            ) {
                return;
            }

            setActivatingProgress({
                current: 0,
                total:
                    pendientes.length,
            });

            const activadas: {
                id: string;
                revealedAt: string | null;
            }[] = [];

            /*
             * Activamos una por una para evitar
             * lanzar 20, 30 o 50 solicitudes
             * simultáneamente.
             */
            for (
                let index = 0;
                index <
                pendientes.length;
                index++
            ) {
                const card =
                    pendientes[index];

                const response =
                    await fetch(
                        "/api/cards/reveal",
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
                                    cardId:
                                        card.id,
                                }),

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
                        "No se pudo activar una de tus tarjetas."
                    );
                }

                activadas.push({
                    id:
                        data.card.id,

                    revealedAt:
                        data.card
                            .revealedAt ??
                        new Date()
                            .toISOString(),
                });

                setActivatingProgress({
                    current:
                        index + 1,

                    total:
                        pendientes.length,
                });
            }

            /*
             * Actualizamos las tarjetas
             * inmediatamente en pantalla.
             */

            const activadasMap =
                new Map(
                    activadas.map(
                        (
                            item
                        ) => [
                                item.id,
                                item.revealedAt,
                            ]
                    )
                );

            setCards(
                (
                    currentCards
                ) =>
                    currentCards.map(
                        (
                            card
                        ) => {
                            if (
                                !activadasMap.has(
                                    card.id
                                )
                            ) {
                                return card;
                            }

                            return {
                                ...card,

                                revealed:
                                    true,

                                revealed_at:
                                    activadasMap.get(
                                        card.id
                                    ) ??
                                    new Date()
                                        .toISOString(),

                                estado:
                                    "revealed",
                            };
                        }
                    )
            );

            /*
             * Actualizamos resumen.
             */

            setCardsSummary(
                (
                    current
                ) => ({
                    ...current,

                    revealed:
                        current.revealed +
                        activadas.length,

                    pending:
                        Math.max(
                            0,
                            current.pending -
                            activadas.length
                        ),
                })
            );

            /*
             * Después de activar todas,
             * volvemos a consultar colección,
             * premios y compras.
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

                loadSphereInventory(
                    session.access_token
                ),
            ]);

        } catch (
        err: unknown
        ) {
            setError(
                err instanceof Error
                    ? err.message
                    : "No se pudieron activar todas las tarjetas."
            );

            /*
             * Volvemos a consultar las tarjetas,
             * por si algunas sí alcanzaron a
             * activarse antes del error.
             */

            try {
                const {
                    data:
                    sessionData,
                } =
                    await supabaseBrowser
                        .auth
                        .getSession();

                if (
                    sessionData.session
                ) {
                    await loadCards(
                        sessionData
                            .session
                            .access_token
                    );
                }
            } catch {
                // No hacemos nada adicional.
            }

        } finally {
            setActivatingAll(
                false
            );

            setActivatingProgress({
                current: 0,
                total: 0,
            });
        }
    }

    async function handleListSphere(
        instanceId: string
    ) {
        const normalizedPrice =
            Number(
                sellPrice
            );

        if (
            !Number.isFinite(
                normalizedPrice
            ) ||
            normalizedPrice <= 0
        ) {
            setError(
                "Ingresa un precio válido para la F1 Sphere."
            );

            return;
        }

        setMarketplaceBusy(
            instanceId
        );

        setError(
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
                    "/api/marketplace/spheres/list",
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
                                sphereInstanceId:
                                    instanceId,

                                price:
                                    normalizedPrice,
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
                    "No se pudo publicar la F1 Sphere."
                );
            }

            setSellingInstanceId(
                null
            );

            setSellPrice(
                ""
            );

            await Promise.all([
                loadSphereInventory(
                    session.access_token
                ),

                loadCollection(
                    session.access_token
                ),
            ]);

        } catch (
        err:
            unknown
        ) {

            setError(
                err instanceof
                    Error
                    ? err.message
                    : "No se pudo publicar la F1 Sphere."
            );

        } finally {

            setMarketplaceBusy(
                null
            );
        }
    }

    async function handleCancelSphereListing(
        listingId: string,
        instanceId: string
    ) {
        setMarketplaceBusy(
            instanceId
        );

        setError(
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
                    "/api/marketplace/spheres/cancel",
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
                                listingId,
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
                    "No se pudo retirar la publicación."
                );
            }

            await Promise.all([
                loadSphereInventory(
                    session.access_token
                ),

                loadCollection(
                    session.access_token
                ),
            ]);

        } catch (
        err:
            unknown
        ) {

            setError(
                err instanceof
                    Error
                    ? err.message
                    : "No se pudo retirar la F1 Sphere."
            );

        } finally {

            setMarketplaceBusy(
                null
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
        setSphereInventory([]);
        setSellingInstanceId(null);
        setSellPrice("");
        setMarketplaceBusy(null);

        setClaimingReward(false);
        setRewardMessage(null);
        setClaimRequestId(null);

        setCards([]);

        setShowCards(false);
        setCardsLoaded(false);

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

        limpiarOtp();

        setVerifyingOtp(
            false
        );

        setResendCooldown(
            0
        );

        setEmail("");

        setIsAffiliate(false);
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

        const visibleCards =
            showAllCards

                ? cards

                : cards.filter(
                    (
                        card
                    ) =>
                        !card.revealed ||
                        sessionRevealedCardIds.includes(
                            card.id
                        )
                );

        return (
            <main className="min-h-screen w-full bg-white px-4 pb-20 pt-24 sm:px-6 lg:px-8 xl:px-10">
                <div className="w-full">

                    <div className="w-full">

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

                            <div className="flex flex-wrap items-center gap-3">

                                <a
                                    href="/mi-cuenta/compras"
                                    className="
        inline-flex
        min-h-[46px]
        items-center
        justify-center

        rounded-xl

        border
        border-[#C1317F]/20

        bg-[#C1317F]/5

        px-5

        text-sm
        font-black
        text-[#C1317F]

        transition-all

        hover:border-[#C1317F]/40
        hover:bg-[#C1317F]/10
    "
                                >
                                    Mis compras

                                </a>

                                <a
                                    href="/mi-cuenta/afiliado"
                                    className="
        inline-flex
        min-h-[46px]
        items-center
        justify-center
        rounded-xl
        border
        border-[#C1317F]/20
        bg-[#C1317F]
        px-5
        text-sm
        font-black
        text-white
        transition-all
        hover:bg-[#ad296f]
    "
                                >
                                    {isAffiliate
                                        ? "Afiliado"
                                        : "Gana con Baruk593"}

                                </a>

                                <a
                                    href="/mi-cuenta/billetera"
                                    className="
        inline-flex
        min-h-[46px]
        items-center
        justify-center

        rounded-xl

        border
        border-[#C1317F]/20

        bg-white

        px-5

        text-sm
        font-black
        text-[#C1317F]

        transition-all

        hover:border-[#C1317F]/40
        hover:bg-[#C1317F]/5
    "
                                >
                                    Mi billetera

                                </a>

                                <button
                                    type="button"
                                    onClick={
                                        handleLogout
                                    }
                                    className="
        min-h-[46px]

        rounded-xl

        border
        border-gray-200

        bg-white

        px-5

        text-sm
        font-bold
        text-gray-600

        transition

        hover:bg-gray-50
    "
                                >
                                    Cerrar sesión
                                </button>

                            </div>
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
                                    Mis Tarjetas
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
                                        /
                                        {
                                            summary
                                                ?.sphereGoal ??
                                            11
                                        }
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
    PREMIO F1 SPHERE COLLECTION
===================================================== */}

                        {collection?.reward &&
                            (
                                summary?.canClaimReward ||
                                showRewardCelebration
                            ) && (

                                <div
                                    className="
                mt-8
                overflow-hidden
                rounded-3xl
                border
                border-orange-200
                bg-gradient-to-br
                from-orange-50
                to-white
                shadow-md
            "
                                >

                                    <div
                                        className="
                    h-2
                    bg-gradient-to-r
                    from-[#ff6600]
                    to-[#ff9a55]
                "
                                    />


                                    <div
                                        className="
                    p-7
                    text-center

                    md:p-9
                "
                                    >

                                        <div className="text-4xl">
                                            🏆
                                        </div>


                                        <p
                                            className="
                        mt-4
                        text-xs
                        font-black
                        uppercase
                        tracking-[0.22em]
                        text-[#ff6600]
                    "
                                        >
                                            F1 Sphere Collection
                                        </p>


                                        {summary?.collectionCompleted ? (

                                            <>
                                                <h2
                                                    className="
                                mt-2
                                text-2xl
                                font-black
                                text-gray-900

                                md:text-3xl
                            "
                                                >
                                                    ¡Completaste las{" "}
                                                    {summary.sphereGoal}{" "}
                                                    F1 Spheres!
                                                </h2>


                                                <p
                                                    className="
                                mx-auto
                                mt-3
                                max-w-2xl
                                text-sm
                                leading-6
                                text-gray-600
                            "
                                                >
                                                    Completaste la parrilla de escuderías.
                                                    Puedes utilizar una esfera de cada equipo
                                                    para reclamar el premio especial.
                                                </p>
                                            </>

                                        ) : (

                                            <>
                                                <h2
                                                    className="
                                mt-2
                                text-2xl
                                font-black
                                text-gray-900

                                md:text-3xl
                            "
                                                >
                                                    Premio de colección
                                                </h2>


                                                <p
                                                    className="
                                mx-auto
                                mt-3
                                max-w-2xl
                                text-sm
                                leading-6
                                text-gray-600
                            "
                                                >
                                                    Ya reclamaste esta colección anteriormente.
                                                    Sigue coleccionando para completar nuevamente
                                                    las 11 F1 Spheres y volver a ganar.
                                                </p>
                                            </>

                                        )}

                                        {/* =====================================================
    PREMIO DE COLECCIÓN AGOTADO
===================================================== */}

                                        {collection?.reward &&
                                            summary?.collectionCompleted &&
                                            collection.reward.soldOut &&
                                            !showRewardCelebration && (

                                                <div
                                                    className="
                mt-8
                rounded-3xl
                border
                border-amber-200
                bg-amber-50
                p-6
                text-center
            "
                                                >

                                                    <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-600">
                                                        F1 Sphere Collection
                                                    </p>


                                                    <h3 className="mt-2 text-xl font-black text-gray-900">
                                                        Premios de esta colección agotados
                                                    </h3>


                                                    <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-gray-600">
                                                        Completaste las 11 F1 Spheres, pero los premios disponibles
                                                        para esta colección ya fueron reclamados.
                                                    </p>


                                                    <p className="mx-auto mt-2 max-w-xl text-xs leading-5 text-gray-500">
                                                        Tus F1 Spheres no serán consumidas y permanecerán en tu colección.
                                                    </p>

                                                </div>

                                            )}

                                        {/* =================================================
                    PREMIO
                ================================================= */}

                                        <div
                                            className="
                        mx-auto
                        mt-6
                        max-w-xl
                        rounded-2xl
                        border
                        border-orange-100
                        bg-white
                        p-6
                    "
                                        >

                                            <p
                                                className="
                            text-[10px]
                            font-black
                            uppercase
                            tracking-[0.2em]
                            text-gray-400
                        "
                                            >
                                                Premio de colección
                                            </p>


                                            <h3
                                                className="
                            mt-2
                            text-xl
                            font-black
                            text-gray-900
                        "
                                            >
                                                {
                                                    collection.reward.name
                                                }
                                            </h3>


                                            {collection.reward.description && (

                                                <p
                                                    className="
                                mt-3
                                text-sm
                                leading-6
                                text-gray-500
                            "
                                                >
                                                    {
                                                        collection.reward
                                                            .description
                                                    }
                                                </p>

                                            )}


                                            {/* TOTAL DE PREMIOS GANADOS */}

                                            {collection.reward.totalClaims >
                                                0 && (

                                                    <div
                                                        className="
                                    mt-5
                                    rounded-xl
                                    bg-orange-50
                                    px-4
                                    py-3
                                "
                                                    >

                                                        <p
                                                            className="
                                        text-[10px]
                                        font-black
                                        uppercase
                                        tracking-wider
                                        text-orange-400
                                    "
                                                        >
                                                            Premios obtenidos
                                                        </p>


                                                        <p
                                                            className="
                                        mt-1
                                        text-2xl
                                        font-black
                                        text-[#ff6600]
                                    "
                                                        >
                                                            {
                                                                collection.reward
                                                                    .totalClaims
                                                            }
                                                        </p>

                                                    </div>

                                                )}


                                            {/* MENSAJE DE ÉXITO */}

                                            {rewardMessage && (

                                                <div
                                                    className="
                                mt-5
                                rounded-xl
                                border
                                border-emerald-100
                                bg-emerald-50
                                px-4
                                py-3
                                text-sm
                                font-bold
                                text-emerald-700
                            "
                                                >
                                                    {rewardMessage}
                                                </div>

                                            )}


                                            {/* =================================================
                        BOTÓN RECLAMAR
                    ================================================= */}

                                            {summary?.canClaimReward && (

                                                <button
                                                    type="button"

                                                    onClick={
                                                        handleClaimCollectionReward
                                                    }

                                                    disabled={
                                                        claimingReward
                                                    }

                                                    className="
                                mt-6
                                inline-flex
                                min-h-[50px]
                                w-full
                                items-center
                                justify-center
                                rounded-xl
                                bg-[#ff6600]
                                px-6
                                text-sm
                                font-black
                                uppercase
                                tracking-[0.06em]
                                text-white
                                shadow-lg
                                transition
                                hover:bg-[#ff7a22]
                                disabled:cursor-not-allowed
                                disabled:opacity-60
                            "
                                                >

                                                    {claimingReward
                                                        ? "Reclamando premio..."
                                                        : "🏆 Reclamar premio"
                                                    }

                                                </button>

                                            )}


                                            {/* =================================================
                        ESFERAS PUBLICADAS
                    ================================================= */}

                                            {summary?.collectionCompleted &&
                                                !summary.canClaimReward &&
                                                summary.totalListedSphereCopies >
                                                0 && (

                                                    <div
                                                        className="
                                    mt-5
                                    rounded-xl
                                    border
                                    border-amber-200
                                    bg-amber-50
                                    px-4
                                    py-3
                                    text-sm
                                    font-semibold
                                    leading-6
                                    text-amber-700
                                "
                                                    >
                                                        Tienes una o más F1 Spheres publicadas
                                                        en Marketplace. Retira las necesarias
                                                        para disponer de una esfera de cada
                                                        escudería antes de reclamar.
                                                    </div>

                                                )}


                                            {/* =================================================
                        ÚLTIMO PREMIO
                    ================================================= */}

                                            {collection.reward.claim && (

                                                <div
                                                    className="
                                mt-6
                                border-t
                                border-gray-100
                                pt-5
                            "
                                                >

                                                    <p
                                                        className="
                                    text-xs
                                    font-semibold
                                    text-gray-400
                                "
                                                    >
                                                        Estado del último premio
                                                    </p>


                                                    <div className="mt-2">

                                                        {collection.reward.claim.status ===
                                                            "delivered" ? (

                                                            <span
                                                                className="
                                            inline-flex
                                            rounded-full
                                            bg-emerald-50
                                            px-4
                                            py-2
                                            text-xs
                                            font-black
                                            uppercase
                                            tracking-wider
                                            text-emerald-700
                                        "
                                                            >
                                                                ✓ Entregado
                                                            </span>

                                                        ) : collection.reward.claim.status ===
                                                            "scheduled" ? (

                                                            <span
                                                                className="
                                            inline-flex
                                            rounded-full
                                            bg-blue-50
                                            px-4
                                            py-2
                                            text-xs
                                            font-black
                                            uppercase
                                            tracking-wider
                                            text-blue-700
                                        "
                                                            >
                                                                Entrega programada
                                                            </span>

                                                        ) : collection.reward.claim.status ===
                                                            "verified" ? (

                                                            <span
                                                                className="
                                            inline-flex
                                            rounded-full
                                            bg-violet-50
                                            px-4
                                            py-2
                                            text-xs
                                            font-black
                                            uppercase
                                            tracking-wider
                                            text-violet-700
                                        "
                                                            >
                                                                Premio verificado
                                                            </span>

                                                        ) : (

                                                            <span
                                                                className="
                                            inline-flex
                                            rounded-full
                                            bg-orange-50
                                            px-4
                                            py-2
                                            text-xs
                                            font-black
                                            uppercase
                                            tracking-wider
                                            text-[#ff6600]
                                        "
                                                            >
                                                                Pendiente de coordinación
                                                            </span>

                                                        )}

                                                    </div>


                                                    {collection.reward.claim
                                                        .completedAt && (

                                                            <p
                                                                className="
                                            mt-4
                                            text-[11px]
                                            text-gray-400
                                        "
                                                            >
                                                                Último premio reclamado el{" "}
                                                                {
                                                                    new Date(
                                                                        collection.reward
                                                                            .claim
                                                                            .completedAt
                                                                    ).toLocaleDateString(
                                                                        "es-EC"
                                                                    )
                                                                }
                                                            </p>

                                                        )}

                                                </div>

                                            )}


                                            {/* =================================================
                        HISTORIAL
                    ================================================= */}

                                            {collection.reward.claims.length >
                                                1 && (

                                                    <div
                                                        className="
                                    mt-6
                                    border-t
                                    border-gray-100
                                    pt-5
                                    text-left
                                "
                                                    >

                                                        <p
                                                            className="
                                        text-xs
                                        font-black
                                        uppercase
                                        tracking-wider
                                        text-gray-400
                                    "
                                                        >
                                                            Historial de premios
                                                        </p>


                                                        <div
                                                            className="
                                        mt-3
                                        space-y-2
                                    "
                                                        >

                                                            {collection.reward.claims.map(
                                                                (
                                                                    claim,
                                                                    index
                                                                ) => (

                                                                    <div
                                                                        key={
                                                                            claim.id
                                                                        }

                                                                        className="
                                                    flex
                                                    items-center
                                                    justify-between
                                                    gap-4
                                                    rounded-xl
                                                    bg-gray-50
                                                    px-4
                                                    py-3
                                                "
                                                                    >

                                                                        <div>

                                                                            <p
                                                                                className="
                                                            text-sm
                                                            font-black
                                                            text-gray-800
                                                        "
                                                                            >
                                                                                Premio #
                                                                                {
                                                                                    collection.reward!
                                                                                        .totalClaims -
                                                                                    index
                                                                                }
                                                                            </p>


                                                                            {claim.completedAt && (

                                                                                <p
                                                                                    className="
                                                                mt-1
                                                                text-[10px]
                                                                text-gray-400
                                                            "
                                                                                >
                                                                                    {
                                                                                        new Date(
                                                                                            claim.completedAt
                                                                                        ).toLocaleDateString(
                                                                                            "es-EC"
                                                                                        )
                                                                                    }
                                                                                </p>

                                                                            )}

                                                                        </div>


                                                                        <span
                                                                            className="
                                                        rounded-full
                                                        bg-white
                                                        px-3
                                                        py-1.5
                                                        text-[10px]
                                                        font-black
                                                        uppercase
                                                        text-gray-500
                                                    "
                                                                        >
                                                                            {claim.status ===
                                                                                "delivered"
                                                                                ? "Entregado"
                                                                                : claim.status ===
                                                                                    "scheduled"
                                                                                    ? "Programado"
                                                                                    : claim.status ===
                                                                                        "verified"
                                                                                        ? "Verificado"
                                                                                        : "Pendiente"
                                                                            }
                                                                        </span>

                                                                    </div>

                                                                )
                                                            )}

                                                        </div>

                                                    </div>

                                                )}

                                        </div>


                                        <p
                                            className="
                        mx-auto
                        mt-5
                        max-w-xl
                        text-xs
                        leading-5
                        text-gray-400
                    "
                                        >
                                            Cada reclamo utiliza una F1 Sphere de cada
                                            escudería. Las esferas repetidas que no formen
                                            parte del reclamo permanecen en tu colección.
                                        </p>

                                    </div>

                                </div>

                            )}

                        {/* =====================================================
    MIS TARJETAS TARJETAS DE LA SUERTE
===================================================== */}

                        <section
                            id="mis-baruk-cards"
                            className="mt-12"
                        >

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
                                        Tarjetas de la Suerte
                                    </p>

                                    <h2
                                        className="
            mt-2

            text-2xl
            font-black
            text-gray-900

            md:text-3xl
        "
                                    >
                                        Tus tarjetas
                                    </h2>

                                    <p
                                        className="
            mt-2
            max-w-xl

            text-sm
            leading-6
            text-gray-500
        "
                                    >
                                        Activa tus tarjetas y descubre
                                        tus números, esferas o premios.
                                    </p>

                                </div>

                                <div className="flex flex-wrap items-center gap-3">

                                    {/* VER / OCULTAR TARJETAS */}

                                    <button
                                        type="button"
                                        onClick={
                                            handleToggleCards
                                        }
                                        disabled={
                                            loadingCards
                                        }
                                        className="
            inline-flex
            min-h-[46px]
            items-center
            justify-center

            rounded-xl

            border
            border-slate-200

            bg-white

            px-5

            text-xs
            font-black
            uppercase
            tracking-[0.06em]
            text-slate-700

            transition-all
            duration-300

            hover:border-[#C1317F]/30
            hover:bg-[#C1317F]/5
            hover:text-[#C1317F]

            disabled:cursor-not-allowed
            disabled:opacity-60
        "
                                    >
                                        {loadingCards
                                            ? "Cargando..."
                                            : showAllCards
                                                ? `Ver solo por revelar (${cardsSummary.pending})`
                                                : `Ver todas las Experience Pass (${cardsSummary.total})`
                                        }

                                        {!loadingCards && (
                                            <span className="ml-2">
                                                {showAllCards
                                                    ? "↑"
                                                    : "↓"
                                                }
                                            </span>
                                        )}
                                    </button>


                                    {/* ACTIVAR TODAS */}

                                    {showCards &&
                                        cardsLoaded &&
                                        cardsSummary.pending >
                                        0 && (

                                            <button
                                                type="button"

                                                onClick={
                                                    handleActivateAll
                                                }

                                                disabled={
                                                    activatingAll
                                                }

                                                className="
                    inline-flex
                    min-h-[46px]
                    shrink-0
                    items-center
                    justify-center

                    rounded-xl

                    bg-[#C1317F]

                    px-5

                    text-xs
                    font-black
                    uppercase
                    tracking-[0.06em]
                    text-white

                    shadow-[0_7px_20px_rgba(193,49,127,0.22)]

                    transition-all
                    duration-300

                    hover:-translate-y-[1px]
                    hover:bg-[#ad296f]

                    disabled:cursor-not-allowed
                    disabled:opacity-60
                "
                                            >
                                                {activatingAll
                                                    ? `Activando ${activatingProgress.current}/${activatingProgress.total}`
                                                    : `Activar todas (${cardsSummary.pending})`
                                                }


                                            </button>
                                        )}

                                </div>
                            </div>

                            {/* RESUMEN DE TARJETAS */}

                            {showCards && (
                                <>

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
                                                Cargando tus Tarjetas...
                                            </p>

                                        </div>
                                    )}

                                    {/* SIN TARJETAS */}

                                    {!loadingCards &&
                                        cards.length === 0 && (

                                            <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-gray-200 bg-gray-50 p-7 text-center">

                                                <p className="font-black text-gray-800">
                                                    Todavía no tienes Tarjetas.
                                                </p>

                                                <p className="mt-2 text-sm text-gray-500">
                                                    Cuando compres o recibas una tarjeta,
                                                    aparecerá automáticamente aquí.
                                                </p>

                                                <a
                                                    href="/"
                                                    className="mt-5 inline-flex items-center justify-center rounded-xl bg-[#ff6600] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#ff7a22]"
                                                >
                                                    Conseguir Tarjetas de la suerte
                                                </a>

                                            </div>
                                        )}

                                    {/* GRID DE TARJETAS */}

                                    {!loadingCards &&
                                        visibleCards.length > 0 && (

                                            <div
                                                className="
    mt-10
    grid
    grid-cols-[repeat(auto-fit,minmax(280px,1fr))]
    gap-x-6
    gap-y-14
    "
                                            >
                                                {visibleCards.map((
                                                    card
                                                ) => (

                                                    <div
                                                        key={
                                                            card.id
                                                        }
                                                        className="flex flex-col items-center"
                                                    >

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

                                                    </div>
                                                )
                                                )}

                                            </div>
                                        )}
                                </>
                            )}

                        </section>

                        {/* =====================================================
    F1 SPHERE COLLECTION
===================================================== */}

                        <section className="mt-14">

                            {/* CABECERA */}

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

                                    <div className="flex items-center gap-3">

                                        <span
                                            className="
                    h-[2px]
                    w-7
                    bg-[#C1317F]
                "
                                        />

                                        <p
                                            className="
                    text-[10px]
                    font-black
                    uppercase
                    tracking-[0.22em]
                    text-[#C1317F]
                "
                                        >
                                            F1 Sphere Collection · 2026
                                        </p>

                                    </div>

                                    <h2
                                        className="
                mt-3

                text-2xl
                font-black
                tracking-[-0.035em]
                text-[#171717]

                md:text-3xl
            "
                                    >
                                        Completa la parrilla
                                    </h2>

                                    <p
                                        className="
                mt-2
                max-w-2xl

                text-sm
                leading-6
                text-slate-500
            "
                                    >
                                        Colecciona las 11 esferas de las escuderías
                                        de la temporada 2026. Las repetidas permanecen
                                        en tu inventario para el futuro marketplace.
                                    </p>

                                </div>

                                {/* PROGRESO COMPACTO */}

                                <div
                                    className="
            flex
            items-center
            gap-3

            rounded-2xl

            border
            border-slate-200

            bg-white

            px-5
            py-3
        "
                                >

                                    <div>

                                        <p
                                            className="
                    text-[8px]
                    font-black
                    uppercase
                    tracking-[0.14em]
                    text-slate-400
                "
                                        >
                                            Colección
                                        </p>

                                        <p
                                            className="
                    mt-0.5

                    text-xl
                    font-black
                    text-[#171717]
                "
                                        >
                                            {summary?.uniqueSpheres ?? 0}
                                            <span className="text-slate-300">
                                                /
                                                {summary?.sphereGoal ?? 11}
                                            </span>
                                        </p>

                                    </div>

                                    <div
                                        className="
                h-9
                w-px
                bg-slate-200
            "
                                    />

                                    <div>

                                        <p
                                            className="
                    text-[8px]
                    font-black
                    uppercase
                    tracking-[0.14em]
                    text-slate-400
                "
                                        >
                                            Progreso
                                        </p>

                                        <p
                                            className="
                    mt-0.5

                    text-xl
                    font-black
                    text-[#C1317F]
                "
                                        >
                                            {summary
                                                ? Math.round(
                                                    (
                                                        summary.uniqueSpheres /
                                                        Math.max(
                                                            summary.sphereGoal,
                                                            1
                                                        )
                                                    ) *
                                                    100
                                                )
                                                : 0}
                                            %
                                        </p>

                                    </div>

                                </div>

                            </div>

                            {/* CARGANDO */}

                            {loadingCollection && (

                                <div className="mt-10 text-center">

                                    <div
                                        className="
                mx-auto

                h-8
                w-8

                animate-spin

                rounded-full

                border-4
                border-slate-200

                border-t-[#C1317F]
            "
                                    />

                                    <p
                                        className="
                mt-3
                text-sm
                font-semibold
                text-slate-400
            "
                                    >
                                        Cargando F1 Sphere Collection...
                                    </p>

                                </div>

                            )}

                            {/* =====================================================
    GRID DE LAS 11 ESCUDERÍAS
===================================================== */}

                            {!loadingCollection &&
                                collection && (

                                    <div
                                        className="
        mt-9

        grid

        grid-cols-[repeat(auto-fit,minmax(190px,1fr))]

        gap-5
    "
                                    >

                                        {collection.spheres.map(
                                            (
                                                sphere
                                            ) => {

                                                const instances =
                                                    sphereInventory.filter(
                                                        (
                                                            item
                                                        ) =>
                                                            item.sphere.id ===
                                                            sphere.id
                                                    );

                                                const availableInstance =
                                                    instances.find(
                                                        (
                                                            item
                                                        ) =>
                                                            item.status ===
                                                            "available"
                                                    );

                                                const listedInstances =
                                                    instances.filter(
                                                        (
                                                            item
                                                        ) =>
                                                            item.status ===
                                                            "listed" &&
                                                            item.listing
                                                    );

                                                return (

                                                    <div
                                                        key={
                                                            sphere.id
                                                        }
                                                        className="flex flex-col"
                                                    >

                                                        {/* TARJETA F1 */}

                                                        <F1Sphere3D

                                                            number={
                                                                sphere.number
                                                            }

                                                            teamName={
                                                                sphere.teamName ??
                                                                sphere.name
                                                            }

                                                            teamSlug={
                                                                sphere.teamSlug
                                                            }

                                                            season={
                                                                sphere.season
                                                            }

                                                            rarity={
                                                                sphere.rarity
                                                            }

                                                            primaryColor={
                                                                sphere.primaryColor
                                                            }

                                                            secondaryColor={
                                                                sphere.secondaryColor
                                                            }

                                                            accentColor={
                                                                sphere.accentColor
                                                            }

                                                            carImageUrl={
                                                                sphere.carImageUrl
                                                            }

                                                            obtained={
                                                                sphere.obtained
                                                            }

                                                            ownedCount={
                                                                sphere.ownedCount
                                                            }
                                                        />


                                                        {/* CONTROLES MARKETPLACE */}

                                                        {sphere.obtained && (

                                                            <div className="mt-3">

                                                                {/* COPIAS */}

                                                                {sphere.ownedCount > 1 && (

                                                                    <p className="mb-2 text-center text-[11px] font-bold text-slate-400">

                                                                        Tienes{" "}
                                                                        {sphere.ownedCount}{" "}
                                                                        copias

                                                                    </p>
                                                                )}


                                                                {/* DISPONIBLE PARA VENDER */}

                                                                {availableInstance &&
                                                                    sellingInstanceId !==
                                                                    availableInstance.instanceId && (

                                                                        <button
                                                                            type="button"

                                                                            onClick={() => {

                                                                                setSellingInstanceId(
                                                                                    availableInstance.instanceId
                                                                                );

                                                                                setSellPrice(
                                                                                    ""
                                                                                );

                                                                                setError(
                                                                                    null
                                                                                );
                                                                            }}

                                                                            className="
                                    w-full
                                    rounded-xl
                                    border
                                    border-[#C1317F]/20
                                    bg-[#C1317F]/5
                                    px-4
                                    py-2.5
                                    text-xs
                                    font-black
                                    text-[#C1317F]
                                    transition
                                    hover:bg-[#C1317F]/10
                                "
                                                                        >
                                                                            Vender en Marketplace
                                                                        </button>
                                                                    )}


                                                                {/* FORMULARIO PRECIO */}

                                                                {availableInstance &&
                                                                    sellingInstanceId ===
                                                                    availableInstance.instanceId && (

                                                                        <div
                                                                            className="
                                    rounded-xl
                                    border
                                    border-slate-200
                                    bg-white
                                    p-3
                                "
                                                                        >

                                                                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                                                                Precio de venta
                                                                            </p>

                                                                            <div className="mt-2 flex gap-2">

                                                                                <div className="flex min-w-0 flex-1 items-center rounded-lg border border-slate-200 bg-white px-3">

                                                                                    <span className="mr-1 text-sm font-bold text-slate-400">
                                                                                        $
                                                                                    </span>

                                                                                    <input
                                                                                        type="number"

                                                                                        min="0.01"

                                                                                        step="0.01"

                                                                                        value={
                                                                                            sellPrice
                                                                                        }

                                                                                        onChange={(
                                                                                            event
                                                                                        ) =>
                                                                                            setSellPrice(
                                                                                                event.target.value
                                                                                            )
                                                                                        }

                                                                                        placeholder="0.00"

                                                                                        className="
                                                min-w-0
                                                flex-1
                                                bg-transparent
                                                py-2
                                                text-sm
                                                font-bold
                                                text-slate-900
                                                outline-none
                                            "
                                                                                    />

                                                                                </div>

                                                                                <button
                                                                                    type="button"

                                                                                    disabled={
                                                                                        marketplaceBusy ===
                                                                                        availableInstance.instanceId
                                                                                    }

                                                                                    onClick={() =>
                                                                                        handleListSphere(
                                                                                            availableInstance.instanceId
                                                                                        )
                                                                                    }

                                                                                    className="
                                            rounded-lg
                                            bg-[#C1317F]
                                            px-4
                                            py-2
                                            text-xs
                                            font-black
                                            text-white
                                            disabled:opacity-50
                                        "
                                                                                >
                                                                                    {marketplaceBusy ===
                                                                                        availableInstance.instanceId
                                                                                        ? "..."
                                                                                        : "Publicar"
                                                                                    }
                                                                                </button>

                                                                            </div>

                                                                            <button
                                                                                type="button"

                                                                                onClick={() => {

                                                                                    setSellingInstanceId(
                                                                                        null
                                                                                    );

                                                                                    setSellPrice(
                                                                                        ""
                                                                                    );
                                                                                }}

                                                                                className="mt-2 w-full text-[11px] font-bold text-slate-400"
                                                                            >
                                                                                Cancelar
                                                                            </button>

                                                                        </div>
                                                                    )}


                                                                {/* PUBLICACIONES ACTIVAS */}

                                                                {listedInstances.map(
                                                                    (
                                                                        item
                                                                    ) => (

                                                                        <div
                                                                            key={
                                                                                item.instanceId
                                                                            }

                                                                            className="
                                    mt-2
                                    rounded-xl
                                    border
                                    border-emerald-200
                                    bg-emerald-50
                                    p-3
                                "
                                                                        >

                                                                            <div className="flex items-center justify-between gap-2">

                                                                                <div>

                                                                                    <p className="text-[9px] font-black uppercase tracking-wider text-emerald-600">
                                                                                        En Marketplace
                                                                                    </p>

                                                                                    <p className="mt-1 text-sm font-black text-emerald-800">
                                                                                        $
                                                                                        {Number(
                                                                                            item.listing
                                                                                                ?.price ??
                                                                                            0
                                                                                        ).toFixed(
                                                                                            2
                                                                                        )}
                                                                                    </p>

                                                                                </div>

                                                                                {item.listing && (

                                                                                    <button
                                                                                        type="button"

                                                                                        disabled={
                                                                                            marketplaceBusy ===
                                                                                            item.instanceId
                                                                                        }

                                                                                        onClick={() =>
                                                                                            handleCancelSphereListing(
                                                                                                item.listing!.id,
                                                                                                item.instanceId
                                                                                            )
                                                                                        }

                                                                                        className="
                                                rounded-lg
                                                border
                                                border-emerald-300
                                                bg-white
                                                px-3
                                                py-2
                                                text-[10px]
                                                font-black
                                                text-emerald-700
                                                disabled:opacity-50
                                            "
                                                                                    >
                                                                                        {marketplaceBusy ===
                                                                                            item.instanceId
                                                                                            ? "..."
                                                                                            : "Retirar"
                                                                                        }
                                                                                    </button>
                                                                                )}

                                                                            </div>

                                                                        </div>
                                                                    )
                                                                )}

                                                            </div>
                                                        )}

                                                    </div>
                                                );
                                            }
                                        )}

                                    </div>

                                )}

                            {/* PROGRESO */}

                            {summary && (
                                <div className="mt-10 rounded-2xl border border-gray-200 bg-gray-50 p-6">

                                    <div className="flex items-center justify-between gap-4">

                                        <div>
                                            <p className="text-sm font-black text-gray-900">
                                                Progreso de tu colección
                                            </p>

                                            <p className="mt-1 text-xs text-gray-500">
                                                {summary.uniqueSpheres}{" "}
                                                de{" "}
                                                {summary.sphereGoal}{" "}
                                                esferas diferentes
                                            </p>
                                        </div>

                                        <p className="text-lg font-black text-[#C1317F]">
                                            {Math.round(
                                                (
                                                    summary.uniqueSpheres /
                                                    Math.max(
                                                        summary.sphereGoal,
                                                        1
                                                    )
                                                ) *
                                                100
                                            )}
                                            %
                                        </p>

                                    </div>

                                    <div className="mt-4 h-3 overflow-hidden rounded-full bg-gray-200">

                                        <div
                                            className="h-full rounded-full bg-[#C1317F] transition-all duration-500"
                                            style={{
                                                width: `${Math.min(
                                                    100,
                                                    (
                                                        summary.uniqueSpheres /
                                                        Math.max(
                                                            summary.sphereGoal,
                                                            1
                                                        )
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

                        </section>

                        {/* =====================================================
    MIS PREMIOS
===================================================== */}

                        <section className="mt-12">

                            <div className="text-center">

                                <h2 className="mt-2 text-2xl font-black text-gray-900 md:text-3xl">
                                    Mis premios
                                </h2>

                                <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-gray-500">
                                    Aquí aparecen todos los premios que has obtenido en Baruk593.
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
                                            Sigue revelando tus Tarjetas.
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
                                                    item.kind ===
                                                        "collection"

                                                        ? "Premio de colección"

                                                        : item.prize
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
                                Conseguir tarjetas
                            </a>

                        </div>

                    </div>
                </div>

            </main >
        );
    }

    /*
     * =========================================================
     * CÓDIGO OTP ENVIADO
     * =========================================================
     */

    if (sent) {

        return (

            <main
                className="
                    flex
                    min-h-screen
                    items-center
                    justify-center
                    bg-white
                    px-4
                    py-24
                "
            >

                <div
                    className="
                        w-full
                        max-w-md
                        overflow-hidden
                        rounded-3xl
                        border
                        border-gray-200
                        bg-white
                        shadow-xl
                    "
                >

                    <div
                        className="
                            h-2
                            bg-gradient-to-r
                            from-[#C1317F]
                            via-[#ff6600]
                            to-[#ff9a55]
                        "
                    />


                    <div
                        className="
                            p-7
                            sm:p-8
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
                                    flex
                                    h-16
                                    w-16
                                    items-center
                                    justify-center
                                    rounded-2xl
                                    bg-[#ff6600]/10
                                    text-[#ff6600]
                                "
                            >

                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    className="h-7 w-7"
                                >

                                    <rect
                                        x="3"
                                        y="5"
                                        width="18"
                                        height="14"
                                        rx="3"
                                        stroke="currentColor"
                                        strokeWidth="1.8"
                                    />

                                    <path
                                        d="m5 8 7 5 7-5"
                                        stroke="currentColor"
                                        strokeWidth="1.8"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />

                                </svg>

                            </div>


                            <p
                                className="
                                    mt-5
                                    text-[10px]
                                    font-black
                                    uppercase
                                    tracking-[0.22em]
                                    text-[#C1317F]
                                "
                            >
                                Acceso seguro
                            </p>


                            <h1
                                className="
                                    mt-2
                                    text-2xl
                                    font-black
                                    tracking-[-0.035em]
                                    text-gray-900
                                "
                            >
                                Ingresa tu código
                            </h1>


                            <p
                                className="
                                    mt-3
                                    text-sm
                                    leading-6
                                    text-gray-500
                                "
                            >
                                Enviamos un código de 6 dígitos a:
                            </p>


                            <p
                                className="
                                    mt-1
                                    break-all
                                    text-sm
                                    font-black
                                    text-[#ff6600]
                                "
                            >
                                {
                                    email
                                }
                            </p>

                        </div>

                        <form
                            onSubmit={
                                handleVerifyOtp
                            }
                            className="
                                mt-7
                            "
                        >

                            <div
                                className="
                                    grid
                                    grid-cols-6
                                    gap-2

                                    sm:gap-3
                                "
                            >

                                {otpDigits.map(
                                    (
                                        digit,
                                        index
                                    ) => (

                                        <input
                                            key={
                                                index
                                            }

                                            ref={(
                                                element
                                            ) => {
                                                otpRefs
                                                    .current[
                                                    index
                                                ] =
                                                    element;
                                            }}

                                            type="text"

                                            inputMode="numeric"

                                            autoComplete={
                                                index ===
                                                    0
                                                    ? "one-time-code"
                                                    : "off"
                                            }

                                            maxLength={
                                                6
                                            }

                                            value={
                                                digit
                                            }

                                            onChange={(
                                                event
                                            ) =>
                                                handleOtpChange(
                                                    index,
                                                    event
                                                        .target
                                                        .value
                                                )
                                            }

                                            onKeyDown={(
                                                event
                                            ) =>
                                                handleOtpKeyDown(
                                                    index,
                                                    event
                                                )
                                            }

                                            onPaste={
                                                handleOtpPaste
                                            }

                                            aria-label={
                                                `Dígito ${index + 1} del código`
                                            }

                                            className="
                                                aspect-square
                                                min-w-0
                                                rounded-xl

                                                border
                                                border-gray-200

                                                bg-[#fafafa]

                                                text-center
                                                text-xl
                                                font-black
                                                text-[#171717]

                                                outline-none

                                                transition-all

                                                focus:border-[#C1317F]
                                                focus:bg-white
                                                focus:shadow-[0_0_0_4px_rgba(193,49,127,0.08)]

                                                sm:text-2xl
                                            "
                                        />
                                    )
                                )}

                            </div>


                            {error && (

                                <div
                                    className="
                                        mt-4
                                        rounded-xl
                                        border
                                        border-red-100
                                        bg-red-50
                                        p-3
                                        text-sm
                                        font-semibold
                                        text-red-600
                                    "
                                >
                                    {
                                        error
                                    }
                                </div>
                            )}


                            <button
                                type="submit"

                                disabled={
                                    verifyingOtp ||
                                    otpDigits
                                        .join(
                                            ""
                                        )
                                        .length !==
                                    6
                                }

                                className="
                                    mt-6
                                    min-h-[52px]
                                    w-full
                                    rounded-xl
                                    bg-[#171717]
                                    px-5
                                    text-sm
                                    font-black
                                    text-white
                                    shadow-[0_10px_25px_rgba(0,0,0,0.12)]
                                    transition

                                    hover:bg-[#C1317F]

                                    disabled:cursor-not-allowed
                                    disabled:opacity-40
                                "
                            >
                                {
                                    verifyingOtp
                                        ? "Ingresando..."
                                        : "Ingresar a Mi Cuenta"
                                }
                            </button>

                        </form>


                        <div
                            className="
                                mt-6
                                border-t
                                border-gray-100
                                pt-5
                                text-center
                            "
                        >

                            <p
                                className="
                                    text-xs
                                    text-gray-400
                                "
                            >
                                ¿No recibiste el código?
                            </p>


                            <button
                                type="button"

                                onClick={
                                    handleResendOtp
                                }

                                disabled={
                                    loading ||
                                    resendCooldown >
                                    0
                                }

                                className="
                                    mt-2
                                    text-xs
                                    font-black
                                    text-[#C1317F]
                                    transition

                                    hover:text-[#ad296f]

                                    disabled:cursor-not-allowed
                                    disabled:text-gray-300
                                "
                            >
                                {
                                    loading
                                        ? "Reenviando..."
                                        : resendCooldown >
                                            0
                                            ? `Reenviar en ${resendCooldown}s`
                                            : "Reenviar código"
                                }
                            </button>


                            <button
                                type="button"

                                onClick={() => {

                                    setSent(
                                        false
                                    );

                                    limpiarOtp();

                                    setError(
                                        null
                                    );

                                    setResendCooldown(
                                        0
                                    );
                                }}

                                className="
                                    mt-4
                                    block
                                    w-full
                                    text-xs
                                    font-bold
                                    text-gray-400
                                    underline
                                    underline-offset-4
                                    transition

                                    hover:text-gray-700
                                "
                            >
                                Usar otro correo
                            </button>

                        </div>


                        <p
                            className="
                                mt-5
                                text-center
                                text-[10px]
                                leading-5
                                text-gray-400
                            "
                        >
                            Si no encuentras el mensaje, revisa también
                            la carpeta de correo no deseado.
                        </p>

                    </div>

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

        <main
            className="
                flex
                min-h-screen
                items-center
                justify-center
                bg-white
                px-4
                py-24
            "
        >

            <div
                className="
                    w-full
                    max-w-md
                    overflow-hidden
                    rounded-3xl
                    border
                    border-gray-200
                    bg-white
                    shadow-xl
                "
            >

                <div
                    className="
                        h-2
                        bg-gradient-to-r
                        from-[#C1317F]
                        via-[#ff6600]
                        to-[#ff9a55]
                    "
                />


                <div
                    className="
                        p-8
                    "
                >

                    <div
                        className="
                            text-center
                        "
                    >

                        <p
                            className="
                                text-xs
                                font-black
                                uppercase
                                tracking-[0.25em]
                                text-[#ff6600]
                            "
                        >
                            BARUK593
                        </p>


                        <h1
                            className="
                                mt-3
                                text-3xl
                                font-black
                                tracking-[-0.04em]
                                text-gray-900
                            "
                        >
                            Mi cuenta
                        </h1>


                        <p
                            className="
                                mt-3
                                text-sm
                                leading-6
                                text-gray-500
                            "
                        >
                            Accede con Google o usa tu correo para ingresar a tus
                            Tarjetas de la Suerte, F1 Spheres, premios, compras y billetera.
                        </p>

                    </div>


                    <div className="mt-8">

                        <button
                            type="button"

                            onClick={
                                handleGoogleLogin
                            }

                            disabled={
                                loading
                            }

                            className="
            flex
            min-h-[52px]
            w-full
            items-center
            justify-center
            gap-3

            rounded-xl

            border
            border-gray-200

            bg-white

            px-5

            text-sm
            font-black
            text-gray-800

            shadow-sm

            transition-all

            hover:border-gray-300
            hover:bg-gray-50
            hover:shadow-md

            disabled:cursor-not-allowed
            disabled:opacity-60
        "
                        >

                            <svg
                                width="21"
                                height="21"
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


                            {loading
                                ? "Conectando..."
                                : "Continuar con Google"
                            }

                        </button>


                        <div className="my-6 flex items-center gap-4">

                            <div className="h-px flex-1 bg-gray-200" />

                            <span
                                className="
                text-[10px]
                font-black
                uppercase
                tracking-[0.18em]
                text-gray-400
            "
                            >
                                o
                            </span>

                            <div className="h-px flex-1 bg-gray-200" />

                        </div>

                    </div>

                    <form
                        onSubmit={
                            handleSubmit
                        }

                        className="
                            mt-0
                        "
                    >

                        <label
                            htmlFor="baruk-email"

                            className="
                                text-sm
                                font-bold
                                text-gray-700
                            "
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
                                    event
                                        .target
                                        .value
                                )
                            }

                            placeholder="tu@correo.com"

                            className="
                                mt-2
                                min-h-[50px]
                                w-full
                                rounded-xl

                                border
                                border-gray-300

                                bg-white

                                px-4

                                text-gray-900

                                outline-none

                                transition

                                placeholder:text-gray-300

                                focus:border-[#C1317F]
                                focus:ring-2
                                focus:ring-[#C1317F]/15
                            "
                        />


                        {error && (

                            <div
                                className="
                                    mt-4
                                    rounded-xl
                                    bg-red-50
                                    p-3
                                    text-sm
                                    font-semibold
                                    text-red-600
                                "
                            >
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

                            className="
                                mt-6
                                min-h-[52px]
                                w-full
                                rounded-xl
                                bg-[#ff6600]
                                px-5
                                text-sm
                                font-black
                                text-white
                                shadow-lg
                                transition

                                hover:bg-[#ed5d00]

                                disabled:cursor-not-allowed
                                disabled:opacity-60
                            "
                        >
                            {
                                loading
                                    ? "Enviando código..."
                                    : "Enviar código de acceso"
                            }
                        </button>

                    </form>


                    <div
                        className="
                            mt-6
                            flex
                            items-center
                            justify-center
                            gap-2
                            text-center
                            text-xs
                            text-gray-400
                        "
                    >
                        <span>
                            🔒
                        </span>

                        <span>
                            Acceso sin contraseña mediante código de un solo uso.
                        </span>
                    </div>

                </div>

            </div>

        </main>
    );
}