// app/admin/numeros/page.tsx
import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type SearchParams = {
    pedido?: string | string[];
};

export default async function AdminNumerosPage({
    searchParams,
}: {
    searchParams: SearchParams;
}) {
    const pedidoParam = searchParams?.pedido;
    const pedidoId = Array.isArray(pedidoParam)
        ? Number(pedidoParam[0])
        : Number(pedidoParam);

    if (!pedidoId || Number.isNaN(pedidoId)) {
        return (
            <main className="min-h-screen bg-[#050609] text-slate-100">
                <div className="mx-auto max-w-4xl px-4 py-10">
                    <h1 className="text-xs font-semibold uppercase tracking-[0.3em] text-orange-400 mb-2">
                        SORTEOPRO • ADMIN
                    </h1>
                    <h2 className="text-2xl font-bold mb-6">
                        Panel de administración
                    </h2>

                    <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-6 py-4 text-sm text-red-200">
                        Falta un parámetro <code>?pedido</code> válido en la URL.
                    </div>

                    <div className="mt-4">
                        <Link
                            href="/admin/pedidos"
                            className="text-sm text-orange-400 hover:underline"
                        >
                            Volver a pedidos
                        </Link>
                    </div>
                </div>
            </main>
        );
    }

    // 1) Obtener info del pedido
    const { data: pedido, error: pedidoError } = await supabaseAdmin
        .from("pedidos")
        .select(
            `
        id,
        nombre,
        telefono,
        actividad_numero,
        cantidad_numeros,
        estado
      `
        )
        .eq("id", pedidoId)
        .maybeSingle();

    if (pedidoError || !pedido) {
        console.error("Error cargando pedido:", pedidoError);
        return (
            <main className="min-h-screen bg-[#050609] text-slate-100">
                <div className="mx-auto max-w-4xl px-4 py-10">
                    <h1 className="text-xs font-semibold uppercase tracking-[0.3em] text-orange-400 mb-2">
                        SORTEOPRO • ADMIN
                    </h1>
                    <h2 className="text-2xl font-bold mb-6">
                        Panel de administración
                    </h2>

                    <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-6 py-4 text-sm text-red-200">
                        No se encontró el pedido #{pedidoId}.
                    </div>

                    <div className="mt-4">
                        <Link
                            href="/admin/pedidos"
                            className="text-sm text-orange-400 hover:underline"
                        >
                            Volver a pedidos
                        </Link>
                    </div>
                </div>
            </main>
        );
    }

    // 2) Obtener números asignados
    const { data: numeros, error: numerosError } = await supabaseAdmin
        .from("numeros_asignados")
        .select("numero")
        .eq("pedido_id", pedidoId)
        .order("numero", { ascending: true });

    if (numerosError) {
        console.error("Error cargando numeros_asignados:", numerosError);
    }

    const lista = numeros || [];

    return (
        <main className="min-h-screen bg-[#050609] text-slate-100">
            <div className="mx-auto max-w-4xl px-4 py-10">
                <h1 className="text-xs font-semibold uppercase tracking-[0.3em] text-orange-400 mb-2">
                    SORTEOPRO • ADMIN
                </h1>
                <h2 className="text-2xl font-bold mb-6">
                    Panel de administración
                </h2>

                {/* Tarjeta del pedido */}
                <section className="mb-6 rounded-2xl border border-white/10 bg-[#11121a] px-6 py-5 shadow-lg">
                    <p className="text-sm font-semibold mb-1">
                        Pedido #{pedido.id} · {pedido.nombre || "Sin nombre"}
                    </p>
                    <p className="text-xs text-slate-400">
                        Teléfono: {pedido.telefono || "—"}
                    </p>
                    <p className="text-xs text-slate-400">
                        Actividad #{pedido.actividad_numero ?? "—"} · Cantidad:{" "}
                        {pedido.cantidad_numeros ?? "—"}
                    </p>
                    <p className="mt-1 text-xs font-semibold">
                        Estado:{" "}
                        <span className="inline-flex rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-emerald-300">
                            {String(pedido.estado || "").toUpperCase() || "—"}
                        </span>
                    </p>
                </section>

                {/* Números asignados */}
                <section className="rounded-2xl border border-white/10 bg-[#11121a] px-6 py-5 shadow-lg">
                    <h3 className="text-sm font-semibold mb-3">
                        Números asignados
                    </h3>

                    {lista.length === 0 ? (
                        <p className="text-xs text-slate-400">
                            No se encontraron números asignados para este pedido.
                        </p>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {lista.map((item) => (
                                <span
                                    key={item.numero}
                                    className="px-3 py-1 rounded-full bg-[#fff1e6] text-[#ff6600] border border-[#ff6600]/40 text-xs font-semibold shadow-sm"
                                >
                                    #{String(item.numero).padStart(5, "0")}
                                </span>
                            ))}
                        </div>
                    )}
                </section>

                <div className="mt-6">
                    <Link
                        href="/admin/pedidos"
                        className="inline-flex items-center rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-100 hover:bg-white/10"
                    >
                        Volver a pedidos
                    </Link>
                </div>
            </div>
        </main>
    );
}
