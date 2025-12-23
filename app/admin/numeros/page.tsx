export const dynamic = "force-dynamic";

import AdminNumerosClient from "./AdminNumerosClient";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function Page({
    searchParams,
}: {
    // en algunos runtimes llega como Promise
    searchParams?: SearchParams | Promise<SearchParams>;
}) {
    const sp: SearchParams | undefined =
        searchParams && typeof (searchParams as any).then === "function"
            ? await (searchParams as Promise<SearchParams>)
            : (searchParams as SearchParams | undefined);

    const pedidoRaw = sp?.pedido;
    const pedidoStr = Array.isArray(pedidoRaw) ? pedidoRaw[0] : pedidoRaw;
    const pedidoId = Number(pedidoStr);

    if (!pedidoStr || Number.isNaN(pedidoId) || pedidoId <= 0) {
        return (
            <main className="min-h-screen bg-[#050609] text-slate-100 flex items-center justify-center p-6">
                <div className="text-center">
                    <p className="text-red-400 font-semibold">
                        Falta el parámetro <span className="text-red-300">pedido</span> en la URL.
                    </p>
                    <p className="mt-2 text-xs text-slate-400">
                        Ej: <span className="text-slate-200">/admin/numeros?pedido=310</span>
                    </p>
                </div>
            </main>
        );
    }

    return <AdminNumerosClient pedidoId={pedidoId} />;
}
