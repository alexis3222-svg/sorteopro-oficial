"use client";
export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
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
};

type SorteoRow = {
  id: string;
  titulo: string | null;
  actividad_numero: number | null;
  precio_numero: number | null;
  imagen_url?: string | null;
};

export default function PagoExitosoPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const tx = sp.get("tx"); // en tu captura viene ?tx=...
  const status = sp.get("status"); // approved, etc. (solo informativo)
  const pedidoIdParam = sp.get("id"); // si también lo envías a veces

  const [loading, setLoading] = useState(true);
  const [pedido, setPedido] = useState<PedidoRow | null>(null);
  const [sorteo, setSorteo] = useState<SorteoRow | null>(null);
  const [numeros, setNumeros] = useState<number[]>([]);
  const [softMsg, setSoftMsg] = useState<string | null>(null);

  const pedidoId = useMemo(() => (pedidoIdParam ? Number(pedidoIdParam) : null), [pedidoIdParam]);

  useEffect(() => {
    let cancelled = false;

    async function cargar() {
      setLoading(true);
      setSoftMsg(null);

      // 1) Resolver pedido
      // Preferencia: si hay pedidoId, úsalo. Si no, intenta por tx (si tu DB lo guarda).
      let pedidoRow: PedidoRow | null = null;

      if (pedidoId) {
        const { data, error } = await supabase
          .from("pedidos")
          .select("id,nombre,telefono,estado,cantidad_numeros,sorteo_id,actividad_numero,metodo_pago,created_at")
          .eq("id", pedidoId)
          .maybeSingle();

        if (!error) pedidoRow = (data as any) ?? null;
      } else if (tx) {
        // Ajusta el nombre de columna si tu tabla usa otra (tx / client_transaction_id / payphone_tx)
        const { data, error } = await supabase
          .from("pedidos")
          .select("id,nombre,telefono,estado,cantidad_numeros,sorteo_id,actividad_numero,metodo_pago,created_at")
          .eq("tx", tx)
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

      // 2) Traer sorteo (para el título grande)
      if (pedidoRow.sorteo_id) {
        const { data } = await supabase
          .from("sorteos")
          .select("id,titulo,actividad_numero,precio_numero,imagen_url")
          .eq("id", pedidoRow.sorteo_id)
          .maybeSingle();

        if (!cancelled) setSorteo((data as any) ?? null);
      }

      // 3) Traer números asignados del pedido
      // (si por alguna razón hay latencia, haremos reintentos suaves)
      await cargarNumerosConRetry(pedidoRow.id);

      if (!cancelled) setLoading(false);
    }

    async function cargarNumerosConRetry(pedidoIdReal: number) {
      // Hasta 6 intentos (≈ 12s) por si hay latencia muy rara
      for (let i = 0; i < 6; i++) {
        const { data, error } = await supabase
          .from("numeros_asignados")
          .select("numero")
          .eq("pedido_id", pedidoIdReal)
          .order("numero", { ascending: true });

        if (cancelled) return;

        if (!error) {
          const nums = (data ?? []).map((r: any) => Number(r.numero)).filter((n) => Number.isFinite(n));
          if (nums.length > 0) {
            setNumeros(nums);
            setSoftMsg(null);
            return;
          }
        }

        // Si aún no hay números, muestra mensaje suave y espera
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
    <div className="min-h-screen bg-neutral-950 text-slate-100">
      {/* Top bar / banda naranja como tu estilo */}
      <div className="w-full bg-[#ff6600] text-black">
        <div className="mx-auto max-w-6xl px-4 py-2 text-center text-[11px] font-bold tracking-[0.35em] uppercase">
          Actividad #{actividadLabel}
        </div>
      </div>

      <div className="mx-auto flex max-w-6xl items-center justify-center px-4 py-10">
        <div className="w-full max-w-4xl rounded-2xl border border-neutral-800 bg-neutral-900/40 shadow-lg">
          {/* Header */}
          <div className="flex flex-col gap-2 border-b border-neutral-800 px-6 py-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-xl font-semibold">
                ¡Pago confirmado! <span className="align-middle">✅</span>
              </h1>
              <p className="mt-1 text-sm text-slate-300">
                Ya estás participando oficialmente. Guarda esta información.
              </p>
            </div>

            <div className="text-xs text-slate-400">
              {status ? (
                <span className="rounded-full border border-neutral-800 bg-neutral-950/40 px-3 py-1">
                  Estado PayPhone: <span className="text-slate-200">{status}</span>
                </span>
              ) : null}
            </div>
          </div>

          {/* Body 2 columnas */}
          <div className="grid gap-6 px-6 py-6 md:grid-cols-2">
            {/* Col izquierda: título grande del sorteo + datos cliente */}
            <div>
              <div className="rounded-xl border border-neutral-800 bg-neutral-950/30 p-5">
                <p className="text-[11px] uppercase tracking-[0.25em] text-orange-400">
                  Premio / Sorteo
                </p>

                <h2 className={`${anton.className} mt-2 text-2xl md:text-3xl uppercase tracking-[0.12em] text-white`}>
                  {tituloGrande}
                </h2>

                <p className="mt-2 text-xs text-slate-400">
                  Si quieres aumentar tus probabilidades, puedes comprar más números desde el inicio.
                </p>

                {sorteo?.imagen_url ? (
                  // Si ya usas next/image puedes cambiarlo, aquí lo dejo simple:
                  <img
                    src={sorteo.imagen_url}
                    alt={tituloGrande}
                    className="mt-4 h-40 w-full rounded-xl object-cover border border-neutral-800"
                  />
                ) : null}
              </div>

              <div className="mt-4 rounded-xl border border-neutral-800 bg-neutral-950/30 p-5">
                <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400">
                  Datos del participante
                </p>

                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <Field label="Nombre" value={pedido?.nombre ?? "—"} />
                  <Field label="Teléfono" value={pedido?.telefono ?? "—"} />
                  <Field label="Pedido" value={pedido ? `#${pedido.id}` : "—"} />
                  <Field label="Paquete" value={pedido?.cantidad_numeros ? `x${pedido.cantidad_numeros}` : "—"} />
                  <Field label="Método" value={pedido?.metodo_pago ?? "PayPhone"} />
                  <Field label="Estado" value={pedido?.estado ?? "—"} />
                </div>
              </div>
            </div>

            {/* Col derecha: números */}
            <div className="rounded-xl border border-neutral-800 bg-neutral-950/30 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.25em] text-emerald-300">
                    Tus números
                  </p>
                  <h3 className="mt-2 text-lg font-semibold">Números asignados</h3>
                  <p className="mt-1 text-xs text-slate-400">
                    Estos números ya están registrados y participan en el sorteo.
                  </p>
                </div>

                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
                  {numeros.length > 0 ? `${numeros.length} números` : "Cargando…"}
                </span>
              </div>

              {/* Mensaje suave / skeleton */}
              {softMsg ? (
                <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-200">
                  {softMsg}
                </div>
              ) : null}

              <div className="mt-4">
                {loading && numeros.length === 0 ? (
                  <div className="grid grid-cols-4 gap-2">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-9 rounded-lg border border-neutral-800 bg-neutral-900/50 animate-pulse"
                      />
                    ))}
                  </div>
                ) : numeros.length === 0 ? (
                  <div className="rounded-lg border border-neutral-800 bg-neutral-900/30 p-4 text-sm text-slate-300">
                    Aún no aparecen tus números. Refresca en unos segundos.
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2 md:grid-cols-5">
                    {numeros.map((n) => (
                      <span
                        key={n}
                        className="inline-flex items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-2 text-sm font-semibold text-white"
                      >
                        {String(n).padStart(3, "0")}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* CTA */}
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  onClick={() => router.push("/")}
                  className="rounded-xl bg-[#ff6600] px-5 py-3 text-sm font-semibold text-black hover:opacity-90"
                >
                  Volver al inicio
                </button>

                <Link
                  href={`/admin/numeros?pedido=${pedido?.id ?? ""}`}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  (Solo admin) Ver en panel
                </Link>
              </div>
            </div>
          </div>

          {/* Footer mini */}
          <div className="border-t border-neutral-800 px-6 py-4 text-xs text-slate-500">
            Si necesitas soporte, conserva el número de pedido.
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/30 p-3">
      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-semibold text-white">{value}</div>
    </div>
  );
}
