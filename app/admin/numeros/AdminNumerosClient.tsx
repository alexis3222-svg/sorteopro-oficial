"use client";

import { useSearchParams } from "next/navigation";
import NumerosClient from "./NumerosClient";

export default function AdminNumerosClient() {
    const sp = useSearchParams();
    const pedidoId = Number(sp.get("pedido") ?? "");

    if (!pedidoId || Number.isNaN(pedidoId)) {
        return (
            <main className="min-h-screen flex items-center justify-center p-6 text-center">
                <div>
                    <p className="text-sm text-red-400">
                        Falta el parámetro <b>pedido</b> en la URL.
                    </p>
                    <p className="text-xs text-slate-400 mt-2">Ej: /admin/numeros?pedido=310</p>
                </div>
            </main>
        );
    }

    return <NumerosClient pedidoId={pedidoId} />;
}
