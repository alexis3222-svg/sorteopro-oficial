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

    // ✅ tu columna real
    payphone_client_transaction_id?: string | null;
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

            let pedidoRow: PedidoRow | null = null;

            // 1) pedido por id (si viene)
            if (pedidoId) {
                const { data, error } = await supabase
                    .from("pedidos")
                    .select(
                        "id,nombre,telefono,estado,cantidad_numeros,sorteo_id,actividad_numero,metodo_pago,created_at,payphone_client_transaction_id"
                    )
                    .eq("id", pedidoId)
                    .maybeSingle();

                if (!error) pedidoRow = (data as any) ?? null;
            }

            // 2) pedido por tx (PayPhone) -> ✅ columna real
            if (!pedidoRow && tx) {
                const { data, error } = await supabase
                    .from("pedidos")
                    .select(
                        "id,nombre,telefono,estado,cantidad_numeros,sorteo_id,actividad_numero,metodo_pago,created_at,payphone_client_transaction_id"
                    )
                    .eq("payphone_client_transaction_id", tx)
                    .maybeSingle();

                if (!error) pedidoRow = (data as any) ?? null;
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

            // 3) sorteo (para título grande)
            if (pedidoRow.sorteo_id) {
                const { data } = await supabase
                    .from("sorteos")
                    .select("id,titulo,actividad_numero,precio_numero,imagen_url")
                    .eq("id", pedidoRow.sorteo_id)
                    .maybeSingle();

                if (!cancelled) setSorteo((data as any) ?? null);
            }

            // 4) números asignados (retry suave)
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

                setSoftMsg("Asignando tus números…");
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
        <div className="min-h-screen bg-neutral-50 text-neutral-900">
            <div className="mx-auto max-w-5xl px-4 py-10">
                {/* Card única */}
                <div className="rounded-3xl bg-white shadow-[0_18px_60px_rgba(0,0,0,0.10)] ring-1 ring-black/5 overflow-hidden">
                    {/* Header minimal */}
                    <div className="px-6 pt-7 pb-5">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div className="flex items-start gap-3">
                                <div className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 ring-1 ring-emerald-100">
                                    <span className="text-emerald-700 text-lg">✓</span>
                                </div>

                                <div>
                                    <h1 className="text-2xl font-extrabold tracking-tight">
                                        Pago confirmado
                                    </h1>
                                    <p className="mt-1 text-sm text-neutral-600">
                                        Ya estás participando oficialmente. Guarda esta información.
                                    </p>

                                    <div className="mt-3 flex flex-wrap items-center gap-2">
                                        <Chip>Actividad #{actividadLabel}</Chip>
                                        {status ? <Chip>PayPhone: {status}</Chip> : null}
                                        {pedido?.id ? <Chip>Pedido #{pedido.id}</Chip> : null}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2 md:justify-end">
                                <button
                                    onClick={() => router.push("/")}
                                    className="rounded-2xl bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                                >
                                    Volver al inicio
                                </button>
                                <button
                                    onClick={() => router.push("/")}
                                    className="rounded-2xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-neutral-50"
                                >
                                    Comprar más
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-neutral-100" />

                    {/* Body 2 columnas minimal */}
                    <div className="grid gap-6 px-6 py-6 md:grid-cols-2">
                        {/* Izq: premio + datos */}
                        <div className="space-y-4">
                            <div className="rounded-2xl border border-neutral-200 bg-white p-5">
                                <div className="text-[11px] font-bold tracking-[0.35em] uppercase text-neutral-500">
                                    Premio / Sorteo
                                </div>

                                <h2
                                    className={`${anton.className} mt-3 text-3xl md:text-4xl uppercase tracking-[0.10em] leading-tight`}
                                >
                                    {tituloGrande}
                                </h2>

                                {sorteo?.imagen_url ? (
                                    <img
                                        src={sorteo.imagen_url}
                                        alt={tituloGrande}
                                        className="mt-4 h-44 w-full rounded-2xl object-cover border border-neutral-200"
                                    />
                                ) : null}

                                <p className="mt-4 text-sm text-neutral-600">
                                    Mientras más números tengas, más oportunidades tendrás de ganar.
                                </p>
                            </div>

                            <div className="rounded-2xl border border-neutral-200 bg-white p-5">
                                <div className="text-[11px] font-bold tracking-[0.35em] uppercase text-neutral-500">
                                    Datos del participante
                                </div>

                                <div className="mt-4 grid grid-cols-2 gap-3">
                                    <FieldLight label="Nombre" value={pedido?.nombre ?? "—"} />
                                    <FieldLight label="Teléfono" value={pedido?.telefono ?? "—"} />
                                    <FieldLight label="Método" value={pedido?.metodo_pago ?? "PayPhone"} />
                                    <FieldLight label="Estado" value={pedido?.estado ?? "—"} />
                                    <FieldLight label="Paquete" value={pedido?.cantidad_numeros ? `x${pedido.cantidad_numeros}` : "—"} />
                                    <FieldLight label="Tx" value={tx ? `${tx.slice(0, 10)}…` : "—"} />
                                </div>
                            </div>
                        </div>

                        {/* Der: números */}
                        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <div className="text-[11px] font-bold tracking-[0.35em] uppercase text-neutral-500">
                                        Tus números
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
                                <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">
                                    {softMsg}
                                </div>
                            ) : null}

                            <div className="mt-4">
                                {loading && numeros.length === 0 ? (
                                    <div className="grid grid-cols-5 gap-2">
                                        {Array.from({ length: 15 }).map((_, i) => (
                                            <div
                                                key={i}
                                                className="h-10 rounded-2xl border border-neutral-200 bg-neutral-100 animate-pulse"
                                            />
                                        ))}
                                    </div>
                                ) : numeros.length === 0 ? (
                                    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
                                        Aún no aparecen tus números. Refresca en unos segundos.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-5 gap-2 md:grid-cols-6">
                                        {numeros.map((n) => (
                                            <span
                                                key={n}
                                                className="inline-flex items-center justify-center rounded-2xl border border-neutral-200 bg-white px-2 py-2 text-sm font-extrabold"
                                            >
                                                {String(n).padStart(3, "0")}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <p className="mt-4 text-xs text-neutral-500">
                                Tip: haz una captura de pantalla para guardar tus números.
                            </p>
                        </div>
                    </div>

                    <div className="h-px bg-neutral-100" />

                    <div className="px-6 py-4 text-xs text-neutral-500">
                        Si necesitas soporte, conserva tu número de pedido.
                    </div>
                </div>
            </div>
        </div>
    );
}

function Chip({ children }: { children: React.ReactNode }) {
    return (
        <span className="inline-flex items-center rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-semibold text-neutral-700">
            {children}
        </span>
    );
}

function FieldLight({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
            <div className="text-[11px] font-bold tracking-[0.30em] uppercase text-neutral-500">
                {label}
            </div>
            <div className="mt-1 text-sm font-extrabold text-neutral-900">{value}</div>
        </div>
    );
}
