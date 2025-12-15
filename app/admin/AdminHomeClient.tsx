"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

type PedidoRow = {
    id: number;
    created_at: string | null;
    sorteo_id: string | null;
    actividad_numero: number | null;
    cantidad_numeros: number | null;
    precio_unitario: number | null;
    total: number | null;
    metodo_pago: string | null;
    estado: string | null;
    nombre: string | null;
    telefono: string | null;
};

type Stats = {
    totalPedidos: number;
    totalNumeros: number;
    totalRecaudado: number;
    pedidosPendientes: number;
    pedidosPagados: number;
};

type SorteoActivo = any;

const norm = (v: any) => String(v ?? "").trim().toLowerCase();

export default function AdminHomeClient() {
    const [pedidos, setPedidos] = useState<PedidoRow[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [sorteoActivo, setSorteoActivo] = useState<SorteoActivo | null>(null);
    const [loading, setLoading] = useState(true);
    const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
    const [alertas, setAlertas] = useState<string[]>([]);

    const sorteoIdRef = useRef<string | null>(null);
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

    const cargarDashboard = useCallback(async () => {
        setLoading(true);
        setErrorGeneral(null);
        const nuevasAlertas: string[] = [];

        try {
            // 1) Sorteo activo
            const { data: sorteoData, error: sorteoError } = await supabase
                .from("sorteos")
                .select("*")
                .eq("estado", "activo")
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

            if (sorteoError) {
                console.error("Error cargando sorteo activo:", sorteoError);
                nuevasAlertas.push("No se pudo cargar el sorteo activo.");
            }

            if (!sorteoData?.id) {
                setSorteoActivo(null);
                setPedidos([]);
                setStats({
                    totalPedidos: 0,
                    totalNumeros: 0,
                    totalRecaudado: 0,
                    pedidosPendientes: 0,
                    pedidosPagados: 0,
                });
                nuevasAlertas.push("No hay un sorteo activo configurado actualmente.");
                setAlertas(nuevasAlertas);
                setLoading(false);
                return;
            }

            setSorteoActivo(sorteoData);
            const sorteoIdActivo = String(sorteoData.id);
            sorteoIdRef.current = sorteoIdActivo;

            // 2) Pedidos del sorteo activo
            const { data: pedidosData, error: pedidosError } = await supabase
                .from("pedidos")
                .select(
                    `
          id,
          created_at,
          sorteo_id,
          actividad_numero,
          cantidad_numeros,
          precio_unitario,
          total,
          metodo_pago,
          estado,
          nombre,
          telefono
        `
                )
                .eq("sorteo_id", sorteoIdActivo)
                .order("id", { ascending: false });

            if (pedidosError) {
                console.error("Error cargando pedidos:", pedidosError.message);
                setErrorGeneral("No se pudieron cargar los pedidos.");
                setAlertas(nuevasAlertas);
                setLoading(false);
                return;
            }

            const pedidosNorm = (pedidosData || []) as PedidoRow[];
            setPedidos(pedidosNorm);

            // 3) Estados
            const pagadosArr = pedidosNorm.filter((p) => norm(p.estado) === "pagado");
            const pendientesArr = pedidosNorm.filter((p) => norm(p.estado) === "pendiente");
            const enProcesoArr = pedidosNorm.filter((p) => norm(p.estado) === "en_proceso");

            const totalPedidos = pedidosNorm.length;
            const pedidosPagados = pagadosArr.length;
            const pedidosPendientes = pendientesArr.length;

            // 4) Vendidos reales: numeros_asignados SOLO de pedidos pagados + estado asignado
            let totalNumeros = 0;
            const pedidoIdsPagados = pagadosArr.map((p) => p.id);

            if (pedidoIdsPagados.length > 0) {
                const { count, error: countError } = await supabase
                    .from("numeros_asignados")
                    .select("id", { count: "exact", head: true })
                    .eq("sorteo_id", sorteoIdActivo)
                    .eq("estado", "asignado")
                    .in("pedido_id", pedidoIdsPagados);

                if (countError) {
                    console.error("Error contando numeros_asignados:", countError);
                } else {
                    totalNumeros = count ?? 0;
                }
            }

            // 5) Recaudado: SOLO pedidos pagados
            const totalRecaudado = pagadosArr.reduce((acc, p) => acc + Number(p.total ?? 0), 0);

            setStats({
                totalPedidos,
                totalNumeros,
                totalRecaudado,
                pedidosPendientes,
                pedidosPagados,
            });

            // 6) Alertas
            if (pedidosPendientes > 0) {
                nuevasAlertas.push(`Tienes ${pedidosPendientes} pedido(s) pendiente(s) de pago.`);
            }
            if (enProcesoArr.length > 0) {
                nuevasAlertas.push(`Tienes ${enProcesoArr.length} pedido(s) en proceso (PayPhone).`);
            }
            if (totalPedidos === 0) {
                nuevasAlertas.push("Aún no se han registrado pedidos en el sorteo activo.");
            }
        } catch (err: any) {
            console.error(err);
            setErrorGeneral(err?.message || "Ocurrió un error al cargar el panel.");
        } finally {
            setAlertas(nuevasAlertas);
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        cargarDashboard();
    }, [cargarDashboard]);

    useEffect(() => {
        const sorteoId = sorteoIdRef.current;
        if (!sorteoId) return;

        if (channelRef.current) {
            supabase.removeChannel(channelRef.current);
            channelRef.current = null;
        }

        const ch = supabase
            .channel(`admin-dashboard-${sorteoId}`)
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "pedidos", filter: `sorteo_id=eq.${sorteoId}` },
                () => cargarDashboard()
            )
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "numeros_asignados", filter: `sorteo_id=eq.${sorteoId}` },
                () => cargarDashboard()
            )
            .subscribe();

        channelRef.current = ch;

        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
        };
    }, [cargarDashboard, sorteoActivo?.id]);

    const sorteoTitulo: string | null = useMemo(() => (sorteoActivo ? sorteoActivo.titulo || null : null), [sorteoActivo]);
    const sorteoActividadNumero: number | null = useMemo(
        () => (sorteoActivo ? sorteoActivo.actividad_numero ?? null : null),
        [sorteoActivo]
    );

    const sorteoId: string | null = sorteoActivo?.id || null;
    const ultimosPedidos = useMemo(() => pedidos.slice(0, 5), [pedidos]);

    return (
        <main className="min-h-screen bg-[#050608] text-slate-50">
            <div className="mx-auto max-w-6xl px-4 py-8 md:py-12 space-y-8">
                <header className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <div className="text-xs font-semibold tracking-[0.2em] text-orange-400 uppercase">
                                Casa Bikers • Admin
                            </div>
                            <h1 className="text-3xl md:text-4xl font-extrabold tracking-wide">Panel administrativo</h1>
                            <p className="max-w-2xl text-sm text-slate-400">
                                Resumen del sorteo activo. Aquí controlas pedidos, números asignados y estado.
                            </p>
                        </div>

                        <button
                            onClick={cargarDashboard}
                            className="shrink-0 rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-100 hover:border-orange-500 hover:text-orange-200"
                        >
                            Actualizar
                        </button>
                    </div>
                </header>

                {errorGeneral && (
                    <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                        {errorGeneral}
                    </div>
                )}

                {loading ? (
                    <div className="flex items-center justify-center py-16 text-sm text-slate-400">Cargando información del panel...</div>
                ) : (
                    <>
                        {/* ... aquí va TODO tu JSX tal cual lo tenías ... */}
                        {/* Puedes dejarlo igual, no afecta al build */}
                        {/* (si quieres, pega el resto exacto y te lo devuelvo completo 1:1) */}
                    </>
                )}
            </div>
        </main>
    );
}
