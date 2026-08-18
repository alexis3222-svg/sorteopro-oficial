"use client";

import {
    useEffect,
    useMemo,
    useState,
} from "react";

import F1Sphere3D from "@/components/baruk/F1Sphere3D";

import {
    useRouter,
} from "next/navigation";

import {
    supabaseBrowser,
} from "@/lib/supabaseClient";

type SphereRarity =
    | "common"
    | "rare"
    | "epic"
    | "legendary";


type MarketplaceListing = {
    listingId: string;

    instanceId: string;

    price: number;

    currency: string;

    listedAt: string;

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

        collectionKey:
        | string
        | null;
    };
};


type SortMode =
    | "newest"
    | "price-low"
    | "price-high"
    | "number";


export default function MarketplacePage() {

    const router =
        useRouter();

    const [
        buyingListingId,
        setBuyingListingId,
    ] =
        useState<string | null>(
            null
        );

    const [
        buyError,
        setBuyError,
    ] =
        useState<string | null>(
            null
        );

    const [
        listings,
        setListings,
    ] =
        useState<MarketplaceListing[]>(
            []
        );

    const [
        loading,
        setLoading,
    ] =
        useState(true);

    const [
        error,
        setError,
    ] =
        useState<string | null>(
            null
        );

    const [
        sortMode,
        setSortMode,
    ] =
        useState<SortMode>(
            "newest"
        );


    /* =========================================================
       CARGAR MARKETPLACE
    ========================================================= */

    useEffect(() => {

        let active =
            true;


        async function loadMarketplace() {

            setLoading(
                true
            );

            setError(
                null
            );

            try {

                const response =
                    await fetch(
                        "/api/marketplace/spheres",
                        {
                            method:
                                "GET",

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
                        "No se pudo cargar el Marketplace"
                    );
                }


                if (!active) {
                    return;
                }


                setListings(
                    data.listings ??
                    []
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
                        : "No se pudo cargar el Marketplace"
                );


            } finally {

                if (
                    active
                ) {
                    setLoading(
                        false
                    );
                }
            }
        }


        loadMarketplace();

        return () => {

            active =
                false;
        };

    }, []);

    async function handleBuySphere(
        listingId: string
    ) {
        setBuyingListingId(
            listingId
        );

        setBuyError(
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


            if (sessionError) {
                throw sessionError;
            }


            const session =
                sessionData.session;


            if (!session) {

                router.push(
                    "/mi-cuenta"
                );

                return;
            }


            const response =
                await fetch(
                    "/api/marketplace/spheres/buy",
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
                    "No se pudo iniciar la compra"
                );
            }


            router.push(
                data.paymentUrl
            );


        } catch (
        err:
            unknown
        ) {

            setBuyError(
                err instanceof
                    Error
                    ? err.message
                    : "No se pudo iniciar la compra"
            );

        } finally {

            setBuyingListingId(
                null
            );
        }
    }

    /* =========================================================
       ORDENAR
    ========================================================= */

    const sortedListings =
        useMemo(
            () => {

                const copy =
                    [
                        ...listings,
                    ];


                if (
                    sortMode ===
                    "price-low"
                ) {

                    return copy.sort(
                        (
                            a,
                            b
                        ) =>
                            a.price -
                            b.price
                    );
                }


                if (
                    sortMode ===
                    "price-high"
                ) {

                    return copy.sort(
                        (
                            a,
                            b
                        ) =>
                            b.price -
                            a.price
                    );
                }


                if (
                    sortMode ===
                    "number"
                ) {

                    return copy.sort(
                        (
                            a,
                            b
                        ) =>
                            a.sphere.number -
                            b.sphere.number
                    );
                }


                return copy.sort(
                    (
                        a,
                        b
                    ) =>
                        new Date(
                            b.listedAt
                        ).getTime() -
                        new Date(
                            a.listedAt
                        ).getTime()
                );

            },
            [
                listings,
                sortMode,
            ]
        );


    return (

        <main className="min-h-screen bg-white pb-24 pt-28">


            {/* =================================================
                HERO
            ================================================= */}

            <section
                className="
                    border-b
                    border-slate-100

                    px-4
                    pb-10

                    sm:px-6
                    lg:px-8
                "
            >

                <div className="mx-auto max-w-[1500px]">


                    <div
                        className="
                            flex
                            flex-col
                            gap-7

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
                                        w-8
                                        bg-[#C1317F]
                                    "
                                />

                                <p
                                    className="
                                        text-[10px]
                                        font-black
                                        uppercase
                                        tracking-[0.24em]
                                        text-[#C1317F]
                                    "
                                >
                                    F1 Sphere Collection · 2026
                                </p>

                            </div>


                            <h1
                                className="
                                    mt-4

                                    max-w-3xl

                                    text-3xl
                                    font-black
                                    tracking-[-0.045em]
                                    text-[#171717]

                                    sm:text-4xl
                                    lg:text-5xl
                                "
                            >
                                Marketplace de Esferas
                            </h1>


                            <p
                                className="
                                    mt-4
                                    max-w-2xl

                                    text-sm
                                    leading-6
                                    text-slate-500

                                    sm:text-base
                                "
                            >
                                Encuentra F1 Spheres de otros
                                coleccionistas y completa tu
                                parrilla de la temporada 2026.
                            </p>

                        </div>


                        {/* RESUMEN */}

                        <div
                            className="
                                inline-flex
                                w-fit
                                items-center
                                gap-4

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
                                        text-[9px]
                                        font-black
                                        uppercase
                                        tracking-[0.15em]
                                        text-slate-400
                                    "
                                >
                                    Disponibles
                                </p>

                                <p
                                    className="
                                        mt-0.5

                                        text-2xl
                                        font-black
                                        text-[#171717]
                                    "
                                >
                                    {
                                        listings.length
                                    }
                                </p>

                            </div>


                            <div className="h-9 w-px bg-slate-200" />


                            <div>

                                <p
                                    className="
                                        text-[9px]
                                        font-black
                                        uppercase
                                        tracking-[0.15em]
                                        text-slate-400
                                    "
                                >
                                    Colección
                                </p>

                                <p
                                    className="
                                        mt-0.5
                                        text-sm
                                        font-black
                                        text-[#C1317F]
                                    "
                                >
                                    11 F1 Spheres
                                </p>

                            </div>

                        </div>

                    </div>

                </div>

            </section>


            {/* =================================================
                CONTENIDO
            ================================================= */}

            <section
                className="
                    px-4
                    pt-8

                    sm:px-6
                    lg:px-8
                "
            >

                <div className="mx-auto max-w-[1500px]">


                    {/* BARRA SUPERIOR */}

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

                            <p className="text-sm font-black text-slate-900">
                                Esferas publicadas
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                                Cada publicación corresponde a
                                una F1 Sphere individual.
                            </p>

                        </div>


                        <select
                            value={
                                sortMode
                            }

                            onChange={(
                                event
                            ) =>
                                setSortMode(
                                    event.target
                                        .value as SortMode
                                )
                            }

                            className="
                                min-h-[42px]

                                rounded-xl

                                border
                                border-slate-200

                                bg-white

                                px-4

                                text-xs
                                font-bold
                                text-slate-700

                                outline-none

                                focus:border-[#C1317F]
                            "
                        >

                            <option value="newest">
                                Más recientes
                            </option>

                            <option value="price-low">
                                Precio: menor a mayor
                            </option>

                            <option value="price-high">
                                Precio: mayor a menor
                            </option>

                            <option value="number">
                                Número de colección
                            </option>

                        </select>

                    </div>

                    {buyError && (

                        <div
                            className="
            mt-5
            rounded-xl
            border
            border-red-100
            bg-red-50
            p-4
            text-sm
            font-semibold
            text-red-600
        "
                        >
                            {buyError}
                        </div>
                    )}

                    {/* =================================================
                        CARGANDO
                    ================================================= */}

                    {loading && (

                        <div className="py-24 text-center">

                            <div
                                className="
                                    mx-auto

                                    h-10
                                    w-10

                                    animate-spin

                                    rounded-full

                                    border-4
                                    border-slate-200
                                    border-t-[#C1317F]
                                "
                            />

                            <p
                                className="
                                    mt-4

                                    text-sm
                                    font-semibold
                                    text-slate-400
                                "
                            >
                                Cargando Marketplace...
                            </p>

                        </div>
                    )}


                    {/* =================================================
                        ERROR
                    ================================================= */}

                    {!loading &&
                        error && (

                            <div
                                className="
                                    mt-8

                                    rounded-2xl

                                    border
                                    border-red-100

                                    bg-red-50

                                    p-6

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


                    {/* =================================================
                        MARKETPLACE VACÍO
                    ================================================= */}

                    {!loading &&
                        !error &&
                        sortedListings.length ===
                        0 && (

                            <div
                                className="
                                    mt-10

                                    rounded-3xl

                                    border
                                    border-slate-200

                                    bg-slate-50

                                    px-6
                                    py-16

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

                                        rounded-full

                                        bg-white

                                        text-2xl

                                        shadow-sm
                                    "
                                >
                                    ◯
                                </div>


                                <h2
                                    className="
                                        mt-5

                                        text-xl
                                        font-black
                                        text-slate-900
                                    "
                                >
                                    Todavía no hay F1 Spheres publicadas
                                </h2>


                                <p
                                    className="
                                        mx-auto
                                        mt-2
                                        max-w-lg

                                        text-sm
                                        leading-6
                                        text-slate-500
                                    "
                                >
                                    Cuando un coleccionista publique
                                    una esfera disponible, aparecerá
                                    automáticamente aquí.
                                </p>


                                <a
                                    href="/mi-cuenta"

                                    className="
                                        mt-6

                                        inline-flex
                                        min-h-[44px]

                                        items-center
                                        justify-center

                                        rounded-xl

                                        bg-[#C1317F]

                                        px-5

                                        text-xs
                                        font-black
                                        text-white

                                        transition

                                        hover:bg-[#ad296f]
                                    "
                                >
                                    Ver mi colección
                                </a>

                            </div>
                        )}


                    {/* =================================================
                        GRID
                    ================================================= */}

                    {!loading &&
                        !error &&
                        sortedListings.length >
                        0 && (

                            <div
                                className="
        mt-8

        grid

        grid-cols-1
        gap-x-5
        gap-y-8

        sm:grid-cols-2
        md:grid-cols-3
        lg:grid-cols-4
        xl:grid-cols-5
    "
                            >

                                {sortedListings.map(
                                    (
                                        listing
                                    ) => (

                                        <article
                                            key={
                                                listing.listingId
                                            }

                                            className="
        flex
        w-full
        min-w-0
        max-w-[280px]
        flex-col
        justify-self-center

        rounded-3xl

        border
        border-slate-200

        bg-white

        p-3

        shadow-[0_12px_35px_rgba(15,23,42,0.04)]
    "
                                        >


                                            {/* TARJETA */}

                                            <F1Sphere3D

                                                number={
                                                    listing
                                                        .sphere
                                                        .number
                                                }

                                                teamName={
                                                    listing
                                                        .sphere
                                                        .teamName ??
                                                    listing
                                                        .sphere
                                                        .name
                                                }

                                                teamSlug={
                                                    listing
                                                        .sphere
                                                        .teamSlug
                                                }

                                                season={
                                                    listing
                                                        .sphere
                                                        .season
                                                }

                                                rarity={
                                                    listing
                                                        .sphere
                                                        .rarity
                                                }

                                                primaryColor={
                                                    listing
                                                        .sphere
                                                        .primaryColor
                                                }

                                                secondaryColor={
                                                    listing
                                                        .sphere
                                                        .secondaryColor
                                                }

                                                accentColor={
                                                    listing
                                                        .sphere
                                                        .accentColor
                                                }

                                                carImageUrl={
                                                    listing
                                                        .sphere
                                                        .carImageUrl
                                                }

                                                obtained={
                                                    true
                                                }

                                                ownedCount={
                                                    1
                                                }
                                            />


                                            {/* INFORMACIÓN */}

                                            <div className="px-2 pb-2 pt-4">

                                                <div
                                                    className="
                                                        flex
                                                        items-end
                                                        justify-between
                                                        gap-3
                                                    "
                                                >

                                                    <div>

                                                        <p
                                                            className="
                                                                text-[9px]
                                                                font-black
                                                                uppercase
                                                                tracking-[0.17em]
                                                                text-slate-400
                                                            "
                                                        >
                                                            Precio
                                                        </p>

                                                        <p
                                                            className="
                                                                mt-1

                                                                text-2xl
                                                                font-black
                                                                tracking-[-0.03em]
                                                                text-[#171717]
                                                            "
                                                        >
                                                            $
                                                            {
                                                                Number(
                                                                    listing.price
                                                                ).toFixed(
                                                                    2
                                                                )
                                                            }
                                                        </p>

                                                    </div>


                                                    <div className="text-right">

                                                        <p
                                                            className="
                                                                text-[9px]
                                                                font-black
                                                                uppercase
                                                                tracking-[0.14em]
                                                                text-[#C1317F]
                                                            "
                                                        >
                                                            F1 Sphere
                                                        </p>

                                                        <p
                                                            className="
                                                                mt-1

                                                                text-xs
                                                                font-black
                                                                text-slate-600
                                                            "
                                                        >
                                                            #
                                                            {
                                                                String(
                                                                    listing
                                                                        .sphere
                                                                        .number
                                                                )
                                                                    .padStart(
                                                                        2,
                                                                        "0"
                                                                    )
                                                            }
                                                        </p>

                                                    </div>

                                                </div>


                                                {/* COMPRA */}

                                                <button
                                                    type="button"

                                                    disabled={
                                                        buyingListingId ===
                                                        listing.listingId
                                                    }

                                                    onClick={() =>
                                                        handleBuySphere(
                                                            listing.listingId
                                                        )
                                                    }

                                                    className="
        mt-4

        w-full

        rounded-xl

        bg-[#C1317F]

        px-4
        py-3

        text-xs
        font-black
        text-white

        transition

        hover:bg-[#ad296f]

        disabled:cursor-not-allowed
        disabled:opacity-50
    "
                                                >
                                                    {buyingListingId ===
                                                        listing.listingId
                                                        ? "Preparando compra..."
                                                        : "Comprar F1 Sphere"
                                                    }
                                                </button>

                                            </div>

                                        </article>
                                    )
                                )}

                            </div>
                        )}

                </div>

            </section>

        </main>
    );
}