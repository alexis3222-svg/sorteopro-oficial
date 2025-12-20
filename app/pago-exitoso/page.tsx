"use client";

type PagoExitosoMode = "OK" | "PENDING";

type Props = {
    mode: PagoExitosoMode;
    title: string;
    message: string;
    numeros?: number[];
};

export default function PagoExitosoClient({
    mode,
    title,
    message,
    numeros = [],
}: Props) {
    return (
        <div className="min-h-screen bg-neutral-950 text-slate-100 flex items-center justify-center px-4">
            <div className="w-full max-w-lg rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6">
                <p className="text-xs uppercase tracking-[0.25em] text-orange-400">
                    SorteoPro
                </p>

                <h1 className="mt-2 text-lg font-semibold">{title}</h1>
                <p className="mt-2 text-sm text-slate-300">{message}</p>

                {mode === "PENDING" && (
                    <div className="mt-4 rounded-xl border border-yellow-900/40 bg-yellow-950/20 p-3">
                        <p className="text-sm text-yellow-200">
                            Estado: <span className="font-semibold">En verificación</span>
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                            Puedes refrescar esta página en unos segundos.
                        </p>
                    </div>
                )}

                {mode === "OK" && (
                    <div className="mt-4 rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-3">
                        <p className="text-sm text-emerald-200">
                            Estado: <span className="font-semibold">Confirmado</span>
                        </p>

                        {numeros.length > 0 && (
                            <div className="mt-3">
                                <p className="text-xs text-slate-400 mb-2">Tus números:</p>
                                <div className="flex flex-wrap gap-2">
                                    {numeros.map((n) => (
                                        <span
                                            key={n}
                                            className="px-2 py-1 rounded-lg bg-neutral-800 text-sm"
                                        >
                                            {n}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
