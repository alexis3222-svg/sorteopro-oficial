"use client";

import {
    useParams,
    useRouter,
    useSearchParams,
} from "next/navigation";


export default function MarketplacePagoResultadoPage() {

    const router =
        useRouter();

    const params =
        useParams<{
            orderId: string;
        }>();

    const searchParams =
        useSearchParams();


    const status =
        searchParams.get(
            "status"
        ) ??
        "pendiente";


    const approved =
        status ===
        "pagado";


    const failed =
        status ===
        "fallido" ||
        status ===
        "reversado";


    return (

        <main
            className="
                flex
                min-h-screen
                items-center
                justify-center

                bg-slate-50

                px-4
            "
        >

            <div
                className="
                    w-full
                    max-w-md

                    rounded-3xl

                    border
                    border-slate-200

                    bg-white

                    p-8

                    text-center

                    shadow-xl
                "
            >

                <div className="text-4xl">

                    {
                        approved
                            ? "✓"
                            : failed
                                ? "!"
                                : "◷"
                    }

                </div>


                <h1
                    className="
                        mt-4
                        text-2xl
                        font-black
                        text-slate-900
                    "
                >

                    {
                        approved
                            ? "¡F1 Sphere comprada!"
                            : failed
                                ? "No se completó la compra"
                                : "Estamos verificando el pago"
                    }

                </h1>


                <p
                    className="
                        mt-3
                        text-sm
                        leading-6
                        text-slate-500
                    "
                >

                    {
                        approved
                            ? "La esfera ya fue transferida a tu colección."
                            : failed
                                ? "La esfera no fue transferida. Puedes volver al Marketplace e intentarlo nuevamente."
                                : "Tu transacción todavía se encuentra en proceso de verificación."
                    }

                </p>


                <p
                    className="
                        mt-4
                        break-all
                        text-[10px]
                        text-slate-300
                    "
                >
                    Orden:
                    {" "}
                    {
                        params.orderId
                    }
                </p>


                {approved && (

                    <button
                        type="button"

                        onClick={() =>
                            router.push(
                                "/mi-cuenta"
                            )
                        }

                        className="
                            mt-7
                            w-full
                            rounded-xl
                            bg-[#C1317F]
                            px-5
                            py-3
                            text-sm
                            font-black
                            text-white
                        "
                    >
                        Ver mi colección
                    </button>
                )}


                <button
                    type="button"

                    onClick={() =>
                        router.push(
                            "/marketplace"
                        )
                    }

                    className="
                        mt-3
                        w-full
                        rounded-xl
                        border
                        border-slate-200
                        px-5
                        py-3
                        text-sm
                        font-bold
                        text-slate-600
                    "
                >
                    Volver al Marketplace
                </button>

            </div>

        </main>
    );
}