"use client";

import Link from "next/link";

export default function PagoExitosoClient() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-950 px-4">
            <div className="max-w-md w-full rounded-xl border border-neutral-800 bg-neutral-900 p-8 text-center">
                <h1 className="text-xl font-semibold text-orange-400">
                    Pedido recibido
                </h1>

                <p className="mt-4 text-sm text-neutral-300">
                    Tu pedido ha sido registrado correctamente.
                </p>

                <p className="mt-2 text-sm text-neutral-400">
                    El pago será revisado por un administrador.
                    Una vez confirmado, se asignarán tus números.
                </p>

                <div className="mt-6 flex flex-col gap-3">
                    <Link
                        href="/"
                        className="rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-black hover:bg-orange-400"
                    >
                        Volver al inicio
                    </Link>

                    <Link
                        href="/mis-pedidos"
                        className="rounded-md border border-neutral-700 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800"
                    >
                        Ver mis pedidos
                    </Link>
                </div>
            </div>
        </div>
    );
}
