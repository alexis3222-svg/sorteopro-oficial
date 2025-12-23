"use client";
export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { Anton } from "next/font/google";

const anton = Anton({ subsets: ["latin"], weight: "400" });

type Props = { pedidoId: number };

type PedidoInfo = {
    id: number;
    created_at: string | null;
    actividad_numero: number | null;
    cantidad_numeros: number | null;
    estado: string | null;
    nombre: string | null;
    telefono: string | null;
    metodo_pago: string | null;
    total: number | null;
};

type NumeroAsignado = { numero: number };

export default function AdminNumerosClient({ pedidoId }: Props) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [pedido, setPedido] = useState<PedidoInfo | null>(null);
    const [numeros, setNumeros] = useState<NumeroAsignado[]>([]);

    const estado = useMemo(
        () => (pedido?.estado || "pendiente").toLowerCase(),
        [pedido?.estado]
    );
    const isPagado = estado === "pagado" || estado === "confirmado";

    async function cargar() {
        setLoading(true);
        setError(null);

        // 1) Pedido
        const { data: p, error: pe } = await supabase
            .from("pedidos")
            .select(
                "id, created_at, actividad_numero, cantidad_numeros, estado, nombre, telefono, metodo_pago, total"
            )
            .eq("id", pedidoId)
            .maybeSingle();

        if (pe) {
            console.error("Error leyendo pedido:", pe.message);
            setError("No se pudo leer el pedido.");
            setLoading(false);
            return;
        }

        if (!p) {
            setError("Pedido no encontrado.");
            setLoading(false);
            return;
        }

        setPedido(p as PedidoInfo);

        // 2) Números (SOLO SELECT, nada de RPC)
        const { data: ns, error: ne } = await supabase
            .from("numeros_asignados")
            .select("numero")
            .eq("pedido_id", pedidoId)
            .order("numero", { ascending: true });

        if (ne) {
            console.error("Error leyendo numeros_asignados:", ne.message);
            setError("No se pudieron leer los números asignados.");
            setLoading(false);
            return;
        }

        setNumeros((ns || []) as NumeroAsignado[]);
        setLoading(false);
    }

    useEffect(() => {
        cargar();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pedidoId]);

    const titulo = pedido?.actividad_numero
        ? `Actividad #${pedido.actividad_numero}`
        : "Actividad";

    const fechaLabel = pedido?.created_at
        ? new Date(pedido.created_at).toLocaleString("es-EC")
        : "-";

    const numerosTexto = numeros
        .map((n) => n.numero.toString().padStart(5, "0"))
        .join(", ");

    return (
        <main className="min-h-screen bg-[#050609] text-slate-100">
            <div className="mx-auto max-w-5xl px-4 py-8">
                <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-orange-400">
                            SORTEOPRO • ADMIN
                        </p>
                        <h1 className={`${anton.className} mt-1 text-2xl md:text-3xl tracking-wide`}>
                            Números del pedido #{pedidoId}
                        </h1>
                        <p className="mt-1 text-xs md:text-sm text-slate-400">
                            {titulo} • {fechaLabel}
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Link
                            href="/admin/pedidos"
                            className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] hover:bg-white/10"
                        >
                            ← Volver a pedidos
                        </Link>

                        <button
                            onClick={cargar}
                            className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] hover:bg-white/10"
                        >
                            Recargar
                        </button>
                    </div>
                </header>

                <section className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
                    {loading ? (
                        <p className="text-sm text-slate-400">Cargando…</p>
                    ) : error ? (
                        <p className="text-sm text-red-400">{error}</p>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                                    <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                                        Estado
                                    </p>
                                    <p className="mt-1 text-sm font-semibold">
                                        {isPagado ? "PAGADO" : estado.toUpperCase()}
                                    </p>
                                </div>

                                <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                                    <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                                        Cliente
                                    </p>
                                    <p className="mt-1 text-sm font-semibold">
                                        {pedido?.nombre?.trim() || "—"}
                                    </p>
                                    <p className="text-xs text-slate-400">{pedido?.telefono || ""}</p>
                                </div>

                                <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                                    <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                                        Método
                                    </p>
                                    <p className="mt-1 text-sm font-semibold">
                                        {(pedido?.metodo_pago || "—").toUpperCase()}
                                    </p>
                                </div>

                                <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                                    <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                                        Cantidad
                                    </p>
                                    <p className="mt-1 text-sm font-semibold">
                                        {pedido?.cantidad_numeros ?? "—"}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-6 rounded-2xl border border-white/10 bg-[#14151c] p-4">
                                <h2 className={`${anton.className} text-lg tracking-wide`}>
                                    Números asignados
                                </h2>

                                {!isPagado ? (
                                    <p className="mt-2 text-sm text-yellow-300">
                                        Este pedido aún no está PAGADO. Marca el pedido como{" "}
                                        <span className="font-semibold">PAGADO</span> en{" "}
                                        <Link className="underline" href="/admin/pedidos">
                                            /admin/pedidos
                                        </Link>{" "}
                                        para asignar los números.
                                    </p>
                                ) : numeros.length === 0 ? (
                                    <p className="mt-2 text-sm text-red-300">
                                        El pedido está PAGADO pero aún no hay números asignados.
                                        <br />
                                        Presiona <span className="font-semibold">Recargar</span> o revisa que al marcar PAGADO no haya salido error.
                                    </p>
                                ) : (
                                    <>
                                        <p className="mt-2 text-xs text-slate-400">
                                            Total: <span className="font-semibold text-slate-200">{numeros.length}</span>
                                        </p>

                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {numeros.map((n) => (
                                                <span
                                                    key={n.numero}
                                                    className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold tracking-wide"
                                                >
                                                    {n.numero.toString().padStart(5, "0")}
                                                </span>
                                            ))}
                                        </div>

                                        <div className="mt-4 flex flex-wrap gap-2">
                                            <button
                                                onClick={async () => {
                                                    const text = numerosTexto;
                                                    if (navigator.clipboard?.writeText) {
                                                        await navigator.clipboard.writeText(text);
                                                        alert("Lista de números copiada.");
                                                    } else {
                                                        alert(text);
                                                    }
                                                }}
                                                className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] hover:bg-white/10"
                                            >
                                                Copiar números
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </>
                    )}
                </section>
            </div>
        </main>
    );
}
