"use client";

import Link from "next/link";

export default function PagoExitosoClient(props: {
    mode: "OK" | "PENDING";
    title: string;
    message: string;
    numeros?: number[];
}) {
    const numeros = props.numeros ?? [];

    return (
        <main className="min-h-screen flex items-center justify-center bg-neutral-950 px-4 text-slate-100">
            <div className="w-full max-w-md rounded-2xl bg-neutral-900 border border-neutral-800 p-6 text-center">
                <h1 className="text-2xl font-bold text-orange-400">{props.title}</h1>

                <p className="mt-3 text-sm text-neutral-300">{props.message}</p>

                {props.mode === "OK" && numeros.length > 0 ? (
                    <div className="mt-5 rounded-xl bg-neutral-950/40 border border-neutral-800 p-4 text-left">
                        <p className="text-sm text-neutral-300 font-semibold mb-2">Tus números:</p>
                        <div className="flex flex-wrap gap-2">
                            {numeros.map((n) => (
                                <span
                                    key={n}
                                    className="px-3 py-1 rounded-lg bg-neutral-800 border border-neutral-700 text-sm"
                                >
                                    {n}
                                </span>
                            ))}
                        </div>
                    </div>
                ) : null}

                <div className="mt-6 flex flex-col gap-3">
                    <Link
                        href="/mi-compra"
                        className="rounded-xl bg-orange-500 hover:bg-orange-600 py-3 font-semibold text-black"
                    >
                        Ver mi compra
                    </Link>

                    <Link
                        href="/"
                        className="rounded-xl bg-neutral-800 hover:bg-neutral-700 py-3 font-semibold"
                    >
                        Volver al inicio
                    </Link>
                </div>
            </div>
        </main>
    );
}
