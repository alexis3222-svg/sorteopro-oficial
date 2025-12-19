export const dynamic = "force-dynamic";

export default function PagoExitosoPage() {
    return (
        <main className="min-h-screen flex items-center justify-center bg-neutral-950 px-4 text-slate-100">
            <div className="w-full max-w-md rounded-2xl bg-neutral-900 border border-neutral-800 p-6 text-center">
                <h1 className="text-2xl font-bold text-orange-400">
                    Pago recibido
                </h1>

                <p className="mt-3 text-sm text-neutral-300">
                    Hemos recibido tu comprobante de pago.
                </p>

                <p className="mt-2 text-xs text-neutral-400">
                    Tu pedido será validado manualmente por el administrador.
                    Una vez confirmado, tus números serán asignados.
                </p>

                <button
                    onClick={() => window.location.href = "/"}
                    className="mt-6 w-full rounded-xl bg-orange-500 hover:bg-orange-600 py-3 font-semibold text-black"
                >
                    Volver al inicio
                </button>
            </div>
        </main>
    );
}
