

import {
    useEffect,
    useState,
} from "react";

import Link from "next/link";


type Sphere = {
    id: string;

    number: number;

    name: string;

    teamName:
    | string
    | null;

    teamSlug:
    | string
    | null;

    imageUrl:
    | string
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
};


type Reward = {
    name: string;

    description:
    string;

    requiredSpheres:
    number;
};


type CollectionResponse = {
    ok: boolean;

    collectionKey:
    string;

    season:
    number;

    spheres:
    Sphere[];

    reward:
    Reward;
};


/*
 * ============================================================
 * IMAGEN DEL IPHONE
 *
 * Debe ser PNG/WebP transparente.
 * NO debe tener fondo ni tarjeta.
 * ============================================================
 */

const IPHONE_IMAGE =
    "/f1/iphone-18-pro-max-orange.png";


export default function F1SphereHomeSection() {

    const [
        spheres,
        setSpheres,
    ] =
        useState<
            Sphere[]
        >(
            []
        );


    const [
        loading,
        setLoading,
    ] =
        useState(
            true
        );


    /* ========================================================
       CARGAR COLECCIÓN
    ======================================================== */

    useEffect(
        () => {

            let active =
                true;


            async function loadCollection() {

                try {

                    const response =
                        await fetch(
                            "/api/f1-collection/public",
                            {
                                cache:
                                    "no-store",
                            }
                        );


                    const data =
                        (
                            await response
                                .json()
                                .catch(
                                    () =>
                                        null
                                )
                        ) as
                        | CollectionResponse
                        | null;


                    if (
                        !active
                    ) {
                        return;
                    }


                    if (
                        response.ok &&
                        data?.ok
                    ) {

                        setSpheres(
                            data.spheres ??
                            []
                        );


                    }


                } catch (
                error
                ) {

                    console.error(
                        "F1 Sphere Home:",
                        error
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


            void loadCollection();


            return () => {

                active =
                    false;
            };

        },
        []
    );


    return (

        <section
            id="f1-sphere-collection"

            className="
                relative
                w-full
                overflow-hidden
                bg-white
                py-14
                md:py-18
                lg:py-20
            "
        >

            <div
                className="
                    relative
                    z-10
                    mx-auto
                    w-full
                    max-w-7xl
                    px-5
                    sm:px-6                    
                "
            >

                <div
                    className="
                        grid
                        items-center
                        gap-10
                        lg:grid-cols-[minmax(0,1.28fr)_minmax(340px,0.72fr)]
                        lg:gap-6
                    "
                >

                    {/* =================================================
                        IZQUIERDA
                    ================================================= */}

                    <div>

                        {/* ETIQUETA */}

                        <div
                            className="
                                flex
                                items-center
                                gap-3
                            "
                        >

                            <span
                                className="
                                    h-[3px]
                                    w-8
                                    rounded-full
                                    bg-gradient-to-r
                                    from-[#C1317F]
                                    to-[#ff6600]
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


                        {/* =================================================
                            TITULAR
                        ================================================= */}

                        <h2
                            className="
                                mt-5
                                max-w-4xl
                                text-[36px]
                                font-black
                                leading-[0.98]
                                tracking-[-0.055em]
                                text-[#111827]

                                sm:text-[44px]
                                md:text-[52px]
                                lg:text-[56px]
                            "
                        >
                            Colecciona las{" "}

                            <span
                                className="
                                    whitespace-nowrap
                                "
                            >
                                11 esferas
                            </span>{" "}

                            y gana
                        </h2>


                        <p
                            className="
                                mt-2
                                bg-gradient-to-r
                                from-[#ff6600]
                                via-[#ff4e38]
                                to-[#C1317F]
                                bg-clip-text

                                text-[38px]
                                font-black
                                leading-none
                                tracking-[-0.06em]
                                text-transparent

                                sm:text-[48px]
                                md:text-[58px]
                            "
                        >
                            iPhone 18 Pro Max
                        </p>


                        <p
                            className="
                                mt-6
                                max-w-2xl
                                text-sm
                                leading-6
                                text-slate-500
                                sm:text-[15px]
                            "
                        >
                            Cada Tarjeta puede esconder una esfera de la F1.
                            Completa las 11 escuderías diferentes y reclama el
                            premio de la colección.
                        </p>


                        {/* =================================================
                            ESFERAS
                        ================================================= */}

                        <div
                            className="
                                mt-8
                                grid
                                grid-cols-3
                                gap-x-3
                                gap-y-5

                                sm:grid-cols-4
                                md:grid-cols-6
                            "
                        >

                            {loading ? (

                                Array.from({
                                    length:
                                        11,
                                }).map(
                                    (
                                        _,
                                        index
                                    ) => (

                                        <div
                                            key={
                                                index
                                            }
                                            className="
                                                flex
                                                flex-col
                                                items-center
                                            "
                                        >

                                            <div
                                                className="
                                                    aspect-square
                                                    w-full
                                                    max-w-[92px]
                                                    animate-pulse
                                                    rounded-full
                                                    bg-slate-100
                                                "
                                            />


                                            <div
                                                className="
                                                    mt-2
                                                    h-2
                                                    w-12
                                                    animate-pulse
                                                    rounded-full
                                                    bg-slate-100
                                                "
                                            />

                                        </div>
                                    )
                                )

                            ) : (

                                spheres.map(
                                    (
                                        sphere
                                    ) => {

                                        const isFerrari =
                                            sphere.number ===
                                            11 ||
                                            sphere.teamSlug ===
                                            "ferrari";


                                        return (

                                            <div
                                                key={
                                                    sphere.id
                                                }

                                                className="
                                                    group
                                                    flex
                                                    min-w-0
                                                    flex-col
                                                    items-center
                                                    text-center
                                                "
                                            >

                                                {/* ESFERA */}

                                                <div
                                                    className={`
                                                        relative
                                                        flex
                                                        aspect-square
                                                        w-full
                                                        max-w-[105px]
                                                        items-center
                                                        justify-center
                                                        transition
                                                        duration-300

                                                        ${isFerrari
                                                            ? "scale-[1.04]"
                                                            : "group-hover:-translate-y-1"
                                                        }
                                                    `}
                                                >

                                                    {isFerrari && (

                                                        <div
                                                            className="
                                                                absolute
                                                                inset-[8%]
                                                                rounded-full
                                                                bg-[#ff6600]/15
                                                                blur-xl
                                                            "
                                                        />
                                                    )}


                                                    {sphere.imageUrl ? (

                                                        <div
                                                            className="
            relative
            z-10
            h-full
            w-full
            overflow-hidden
            rounded-full
        "
                                                        >
                                                            <img
                                                                src={sphere.imageUrl}

                                                                alt={
                                                                    `F1 Sphere ${sphere.teamName ?? sphere.name}`
                                                                }

                                                                loading="lazy"

                                                                draggable={false}

                                                                className="
                absolute
                left-1/2
                top-1/2

                h-[155%]
                w-[155%]

                max-w-none

                -translate-x-1/2
                -translate-y-[43%]

                object-contain

                transition
                duration-300

                group-hover:scale-[1.04]
            "
                                                            />
                                                        </div>

                                                    ) : (

                                                        <div
                                                            className="
                                                                relative
                                                                z-10
                                                                flex
                                                                h-[82%]
                                                                w-[82%]
                                                                items-center
                                                                justify-center
                                                                rounded-full
                                                                bg-[#171717]
                                                                text-sm
                                                                font-black
                                                                text-white
                                                            "
                                                        >
                                                            {
                                                                String(
                                                                    sphere.number
                                                                ).padStart(
                                                                    2,
                                                                    "0"
                                                                )
                                                            }
                                                        </div>
                                                    )}

                                                </div>


                                                {/* NOMBRE */}

                                                <div
                                                    className="
                                                        mt-1
                                                        flex
                                                        min-w-0
                                                        items-center
                                                        justify-center
                                                        gap-1.5
                                                    "
                                                >

                                                    <span
                                                        className={`
                                                            inline-flex
                                                            h-[18px]
                                                            min-w-[22px]
                                                            items-center
                                                            justify-center
                                                            rounded-full
                                                            px-1.5

                                                            text-[8px]
                                                            font-black

                                                            ${isFerrari
                                                                ? "bg-[#ff6600] text-white"
                                                                : "bg-[#171717] text-white"
                                                            }
                                                        `}
                                                    >
                                                        {
                                                            String(
                                                                sphere.number
                                                            ).padStart(
                                                                2,
                                                                "0"
                                                            )
                                                        }
                                                    </span>


                                                    <span
                                                        className={`
                                                            truncate
                                                            text-[10px]
                                                            font-black

                                                            sm:text-[11px]

                                                            ${isFerrari
                                                                ? "text-[#ff6600]"
                                                                : "text-[#171717]"
                                                            }
                                                        `}
                                                    >
                                                        {
                                                            sphere.teamName ??
                                                            sphere.name
                                                        }
                                                    </span>

                                                </div>

                                            </div>
                                        );
                                    }
                                )
                            )}

                        </div>


                        {/* =================================================
                            BOTONES
                        ================================================= */}

                        <div
                            className="
                                mt-9
                                flex
                                flex-col
                                gap-3
                                sm:flex-row
                            "
                        >

                            <Link
                                href="/mi-cuenta"

                                className="
                                    inline-flex
                                    min-h-[52px]
                                    items-center
                                    justify-center
                                    gap-2
                                    rounded-2xl
                                    bg-[#ff6600]
                                    px-6
                                    text-sm
                                    font-black
                                    text-white
                                    shadow-[0_12px_28px_rgba(255,102,0,0.20)]
                                    transition

                                    hover:-translate-y-0.5
                                    hover:bg-[#e85c00]
                                "
                            >

                                {/* CUBO / COLECCIÓN */}

                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    className="h-5 w-5"
                                >

                                    <path
                                        d="m12 3 7 4-7 4-7-4 7-4Z"
                                        stroke="currentColor"
                                        strokeWidth="1.7"
                                        strokeLinejoin="round"
                                    />

                                    <path
                                        d="m5 7 7 4 7-4v9l-7 5-7-5V7Z"
                                        stroke="currentColor"
                                        strokeWidth="1.7"
                                        strokeLinejoin="round"
                                    />

                                </svg>

                                Ver mi colección

                            </Link>


                            <Link
                                href="/marketplace"

                                className="
                                    inline-flex
                                    min-h-[52px]
                                    items-center
                                    justify-center
                                    gap-3
                                    rounded-2xl
                                    border
                                    border-slate-200
                                    bg-white
                                    px-6
                                    text-sm
                                    font-black
                                    text-[#171717]
                                    shadow-[0_6px_20px_rgba(0,0,0,0.04)]
                                    transition

                                    hover:-translate-y-0.5
                                    hover:border-[#C1317F]/30
                                    hover:text-[#C1317F]
                                "
                            >
                                Ir al Marketplace

                                <span
                                    className="
                                        text-lg
                                        leading-none
                                    "
                                >
                                    →
                                </span>

                            </Link>

                        </div>

                    </div>


                    {/* =================================================
                        DERECHA — IPHONE LIMPIO
                    ================================================= */}

                    <div
                        className="
                            relative
                            flex
                            min-h-[390px]
                            items-center
                            justify-center

                            sm:min-h-[460px]
                            lg:min-h-[610px]
                            lg:justify-end
                        "
                    >

                        {/* IPHONE */}

                        <img
                            src={
                                IPHONE_IMAGE
                            }

                            alt={
                                "iPhone 18 Pro Max, premio F1 Sphere Collection"
                            }

                            draggable={
                                false
                            }

                            className="
                                relative
                                z-10
                                w-[245px]
                                rotate-[7deg]
                                object-contain
                                drop-shadow-[0_30px_28px_rgba(0,0,0,0.22)]

                                transition
                                duration-500

                                hover:rotate-[4deg]
                                hover:scale-[1.02]

                                sm:w-[300px]
                                md:w-[330px]
                                lg:w-[390px]
                                xl:w-[420px]
                            "
                        />



                    </div>

                </div>

            </div>

        </section>
    );
}