"use client";
export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Anton } from "next/font/google";
import { supabase } from "@/lib/supabaseClient";

const anton = Anton({ subsets: ["latin"], weight: "400" });

type PedidoRow = {
    id: number;
    nombre: string | null;
    telefono: string | null;
    estado: string | null;
    cantidad_numeros: number | null;
    sorteo_id: string | null;
    actividad_numero: number | null;
    metodo_pago: string | null;
    created_at: string | null;
    tx?: string | null;
};

type SorteoRow = {
    id: string;
    titulo: string | null;
    actividad_numero: number | null;
    precio_numero: number | null;
    imagen_url?: string | null;
};

export default function PagoExitosoClient() {
    const router = useRouter();
    const sp = useSearchParams();

    const tx = sp.get("tx");
    const status = sp.get("status");
    const pedidoIdParam = sp.get("id");
    const pedidoId = useMemo(
        () => (pedidoIdParam ? Number(pedidoIdParam) : null),
        [pedidoIdParam]
    );

    const [loading, setLoading] = useState(true);
    const [pedido, setPedido] = useState<PedidoRow | null>(null);
    const [sorteo, setSorteo] = useState<SorteoRow | null>(null);
    const [numeros, setNumeros] = useState<number[]>([]);
    const [softMsg, setSoftMsg] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function cargar() {
            setLoading(true);
            setSoftMsg(null);

            // 1) Resolver pedido
            let pedidoRow: PedidoRow | null = null;

            if (pedidoId) {
                const { data, error } = await supabase
                    .from("pedidos")
                    .select(
                        "id,nombre,telefono,estado,cantidad_numeros,sorteo_id,actividad_numero,metodo_pago,created_at"
                    )
                    .eq("id", pedidoId)
                    .maybeSingle();

                if (!error) pedidoRow = (data as any) ?? null;
            } else if (tx) {
                // ✅ Fallback ultra seguro por si la columna NO se llama "tx"
                const candidates = ["tx", "client_transaction_id", "clientTransactionId", "payphone_tx"];

                for (const col of candidates) {
                    const { data, error } = await supabase
                        .from("pedidos")
                        .select(
                            "id,nombre,telefono,estado,cantidad_numeros,sorteo_id,actividad_numero,metodo_pago,created_at"
                        )
                        .filter(col, "eq", tx)

                        .maybeSingle();

                    if (!error && data) {
                        pedidoRow = data as any;
                        break;
                    }
                }
            }

            if (cancelled) return;

            if (!pedidoRow) {
                setPedido(null);
                setSorteo(null);
                setNumeros([]);
                setSoftMsg("No pudimos cargar tu pedido aún. Refresca en unos segundos.");
                setLoading(false);
                return;
            }

            setPedido(pedidoRow);

            // 2) Sorteo (título grande izquierda)
            if (pedidoRow.sorteo_id) {
                const { data } = await supabase
                    .from("sorteos")
                    .select("id,titulo,actividad_numero,precio_numero,imagen_url")
                    .eq("id", pedidoRow.sorteo_id)
                    .maybeSingle();

                if (!cancelled) setSorteo((data as any) ?? null);
            }

            // 3) Números asignados (retry suave por latencia)
            await cargarNumerosConRetry(pedidoRow.id);

            if (!cancelled) setLoading(false);
        }

        async function cargarNumerosConRetry(pedidoIdReal: number) {
            for (let i = 0; i < 6; i++) {
                const { data, error } = await supabase
                    .from("numeros_asignados")
                    .select("numero")
                    .eq("pedido_id", pedidoIdReal)
                    .order("numero", { ascending: true });

                if (cancelled) return;

                if (!error) {
                    const nums = (data ?? [])
                        .map((r: any) => Number(r.numero))
                        .filter((n) => Number.isFinite(n));

                    if (nums.length > 0) {
                        setNumeros(nums);
                        setSoftMsg(null);
                        return;
                    }
                }

                setSoftMsg("Asignando tus números… (esto puede tardar unos segundos)");
                await new Promise((r) => setTimeout(r, 2000));
            }
        }

        void cargar();

        return () => {
            cancelled = true;
        };
    }, [pedidoId, tx]);

    const tituloGrande = sorteo?.titulo ?? "Sorteo activo";
    const actividadLabel = pedido?.actividad_numero ?? sorteo?.actividad_numero ?? "—";

    return (
        <div className="min-h-screen bg-[#F4F4F5] text-neutral-900">
            {/* banda naranja arriba */}
            <div className="w-full bg-[#ff6600] text-black">
                <div className="mx-auto max-w-6xl px-4 py-2 text-center text-[11px] font-bold tracking-[0.35em] uppercase">
                    ACTIVIDAD #{actividadLabel}
                </div>
            </div>

            <div className="mx-auto max-w-6xl px-4 py-10">
                {/* Card blanca centrada */}
                <div className="mx-auto w-full max-w-5xl rounded-2xl bg-white shadow-[0_20px_50px_rgba(0,0,0,0.12)] ring-1 ring-black/5 overflow-hidden">
                    {/* Header */}
                    <div className="flex flex-col gap-2 border-b border-neutral-200 px-6 py-6 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-2xl font-extrabold">
                                ¡Pago confirmado! <span className="align-middle">✅</span>
                            </h1>
                            <p className="mt-1 text-sm text-neutral-600">
                                Ya estás participando oficialmente. Guarda esta información.
                            </p>
                        </div>

                        {status ? (
                            <span className="inline-flex items-center rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs text-neutral-700">
                                Estado PayPhone: <b className="ml-1">{status}</b>
                            </span>
                        ) : null}
                    </div>

                    {/* 2 columnas */}
                    <div className="grid gap-6 px-6 py-6 md:grid-cols-2">
                        {/* Izquierda: premio + datos */}
                        <div className="space-y-5">
                            <div className="rounded-2xl border border-neutral-200 bg-white p-5">
                                <div className="text-[11px] font-bold tracking-[0.35em] uppercase text-[#ff6600]">
                                    PREMIO / SORTEO
                                </div>

                                <h2
                                    className={`${anton.className} mt-3 text-3xl md:text-4xl uppercase tracking-[0.10em] leading-tight`}
                                >
                                    {tituloGrande}
                                </h2>

                                <p className="mt-3 text-sm text-neutral-600">
                                    Mientras más números tengas, más oportunidades tendrás de ganar.
                                </p>

                                {sorteo?.imagen_url ? (
                                    <img
                                        src={sorteo.imagen_url}
                                        alt={tituloGrande}
                                        className="mt-4 h-44 w-full rounded-2xl object-cover border border-neutral-200"
                                    />
                                ) : null}
                            </div>

                            <div className="rounded-2xl border border-neutral-200 bg-white p-5">
                                <div className="text-[11px] font-bold tracking-[0.35em] uppercase text-neutral-500">
                                    DATOS DEL PARTICIPANTE
                                </div>

                                <div className="mt-4 grid grid-cols-2 gap-3">
                                    <FieldLight label="Nombre" value={pedido?.nombre ?? "—"} />
                                    <FieldLight label="Teléfono" value={pedido?.telefono ?? "—"} />
                                    <FieldLight label="Pedido" value={pedido ? `#${pedido.id}` : "—"} />
                                    <FieldLight
                                        label="Paquete"
                                        value={pedido?.cantidad_numeros ? `x${pedido.cantidad_numeros}` : "—"}
                                    />
                                    <FieldLight label="Método" value={pedido?.metodo_pago ?? "PayPhone"} />
                                    <FieldLight label="Estado" value={pedido?.estado ?? "—"} />
                                </div>
                            </div>
                        </div>

                        {/* Derecha: números */}
                        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <div className="text-[11px] font-bold tracking-[0.35em] uppercase text-neutral-500">
                                        TUS NÚMEROS
                                    </div>
                                    <h3 className="mt-2 text-lg font-bold">Números asignados</h3>
                                    <p className="mt-1 text-sm text-neutral-600">
                                        Estos números ya están registrados y participan en el sorteo.
                                    </p>
                                </div>

                                <span className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs text-neutral-700">
                                    {numeros.length > 0 ? `${numeros.length} números` : "Cargando…"}
                                </span>
                            </div>

                            {softMsg ? (
                                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                                    {softMsg}
                                </div>
                            ) : null}

                            <div className="mt-4">
                                {loading && numeros.length === 0 ? (
                                    <div className="grid grid-cols-4 gap-2">
                                        {Array.from({ length: 12 }).map((_, i) => (
                                            <div
                                                key={i}
                                                className="h-10 rounded-xl border border-neutral-200 bg-neutral-100 animate-pulse"
                                            />
                                        ))}
                                    </div>
                                ) : numeros.length === 0 ? (
                                    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
                                        Aún no aparecen tus números. Refresca en unos segundos.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-4 gap-2 md:grid-cols-5">
                                        {numeros.map((n) => (
                                            <span
                                                key={n}
                                                className="inline-flex items-center justify-center rounded-xl border border-neutral-200 bg-white px-2 py-2 text-sm font-extrabold"
                                            >
                                                {String(n).padStart(3, "0")}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <button
                                    onClick={() => router.push("/")}
                                    className="rounded-xl bg-[#ff6600] px-5 py-3 text-sm font-extrabold text-black hover:opacity-90"
                                >
                                    Volver al inicio
                                </button>

                                <button
                                    onClick={() => router.push("/")}
                                    className="rounded-xl border border-neutral-200 bg-white px-5 py-3 text-sm font-semibold hover:bg-neutral-50"
                                >
                                    Comprar más números
                                </button>
                            </div>

                            <p className="mt-4 text-xs text-neutral-500">
                                Tip: haz captura de pantalla para guardar tus números.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function FieldLight({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
            <div className="text-[11px] font-bold tracking-[0.30em] uppercase text-neutral-500">
                {label}
            </div>
            <div className="mt-1 text-sm font-extrabold text-neutral-900">{value}</div>
        </div>
    );
}
