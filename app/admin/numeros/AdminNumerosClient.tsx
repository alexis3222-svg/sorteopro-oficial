"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient"; // ajusta si tu path es otro

type Props = { pedidoId: number };

export default function AdminNumerosClient({ pedidoId }: Props) {
    // ✅ ya NO uses useSearchParams para leer pedido
    // aquí mantienes tu lógica actual (fetch del pedido / números) usando pedidoId

    // EJEMPLO MINIMO:
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            setLoading(true);
            setError(null);

            // aquí tu lógica real:
            // - leer pedido por pedidoId
            // - leer numeros_asignados por pedidoId
            // - render UI

            setLoading(false);
        })();
    }, [pedidoId]);

    // devuelve tu UI actual (NO la toco)
    return (
        <div className="min-h-screen bg-[#050609] text-slate-100">
            {/* tu UI existente aquí */}
            {loading ? <div className="p-6">Cargando…</div> : null}
            {error ? <div className="p-6 text-red-400">{error}</div> : null}
        </div>
    );
}
