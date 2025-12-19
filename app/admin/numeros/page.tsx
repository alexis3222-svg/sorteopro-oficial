import { Suspense } from "react";
import NumerosClient from "./NumerosClient";

export const dynamic = "force-dynamic";

export default function AdminNumerosPage({
    searchParams,
}: {
    searchParams: { pedido?: string };
}) {
    const pedidoId = Number(searchParams?.pedido ?? "");

    if (!pedidoId || Number.isNaN(pedidoId)) {
        return (
            <main className="min-h-screen flex items-center justify-center p-6 text-center">
                <div>
                    <p className="text-sm text-red-400">Falta el parámetro <b>pedido</b> en la URL.</p>
                    <p className="text-xs text-slate-400 mt-2">Ej: /admin/numeros?pedido=310</p>
                </div>
            </main>
        );
    }

    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Cargando…</div>}>
            <NumerosClient pedidoId={pedidoId} />
        </Suspense>
    );
}
