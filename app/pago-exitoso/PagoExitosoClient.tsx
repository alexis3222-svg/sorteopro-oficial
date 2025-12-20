"use client";

import Link from "next/link";

export default function PagoExitosoClient() {
    return (
        <main className="min-h-screen flex items-center justify-center bg-neutral-950 px-4 text-slate-100">
            <div className="w-full max-w-md rounded-2xl bg-neutral-900 border border-neutral-800 p-6 text-center">
                <h1 className="text-2xl font-bold text-orange-400">
                    Pedido recibido
                </h1>

                <p className="mt-3 text-sm text-neutral-300">
                    Tu pedido fue registrado correctamente.
                </p>

                <p className="mt-2 text-sm text-neutral-400">
                    El pago será revisado por un administrador. <br />
                    Una vez confirmado, se asignarán tus números automáticamente.
                </p>

                <div className="mt-6 flex flex-col gap-3">
                    <Link
                        href="/"
                        className="rounded-xl bg-orange-500 hover:bg-orange-600 py-3 font-semibold text-black"
                    >
                        Volver al inicio
                    </Link>

                    <Link
                        href="/mi-compra"
                        className="rounded-xl bg-neutral-800 hover:bg-neutral-700 py-3 font-semibold"
                    >
                        Ver mi compra
                    </Link>
                </div>
            </div>
        </main>
    );
}
