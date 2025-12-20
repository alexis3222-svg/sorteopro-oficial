// lib/asignarNumeros.ts
import { supabaseAdmin } from "./supabaseAdmin";

type ResultadoAsignacion =
  | { ok: true; alreadyAssigned: boolean; numeros: number[] }
  | {
    ok: false;
    code: "BAD_REQUEST" | "NOT_FOUND" | "NO_STOCK" | "INTERNAL";
    error: string;
  };

/**
 * ✅ Asigna números por ID de pedido (única vía)
 * - Idempotente: si ya existen números, devuelve los mismos.
 * - Solo se debe llamar cuando el pedido ya está "pagado" o inmediatamente luego de marcarlo pagado.
 */
export async function asignarNumerosPorPedidoId(
  pedidoId: number
): Promise<ResultadoAsignacion> {
  try {
    if (!pedidoId) {
      return { ok: false, code: "BAD_REQUEST", error: "Falta pedidoId" };
    }

    // 1) Obtener pedido
    const { data: pedido, error: pedidoError } = await supabaseAdmin
      .from("pedidos")
      .select("id, sorteo_id, cantidad_numeros")
      .eq("id", pedidoId)
      .single();

    if (pedidoError || !pedido) {
      return { ok: false, code: "NOT_FOUND", error: "Pedido no encontrado" };
    }

    if (!pedido.sorteo_id) {
      return { ok: false, code: "BAD_REQUEST", error: "El pedido no tiene sorteo_id" };
    }

    const cantidad = Number(pedido.cantidad_numeros || 0);
    if (cantidad <= 0) {
      return { ok: false, code: "BAD_REQUEST", error: "cantidad_numeros inválida" };
    }

    // 2) Idempotencia: ¿ya tiene números?
    const { data: existentes, error: existentesError } = await supabaseAdmin
      .from("numeros_asignados")
      .select("numero")
      .eq("pedido_id", pedido.id)
      .order("numero", { ascending: true });

    if (existentesError) {
      return { ok: false, code: "INTERNAL", error: "Error consultando números existentes" };
    }

    if (existentes && existentes.length > 0) {
      return {
        ok: true,
        alreadyAssigned: true,
        numeros: existentes.map((n: any) => Number(n.numero)),
      };
    }

    // 3) RPC (la BD asigna)
    const { data: asignados, error: rpcError } = await supabaseAdmin.rpc(
      "asignar_numeros_sorteo",
      {
        p_sorteo_id: pedido.sorteo_id,
        p_pedido_id: pedido.id,
        p_cantidad: cantidad,
        p_estado: "pagado",
      }
    );

    if (rpcError) {
      return {
        ok: false,
        code: "NO_STOCK",
        error: rpcError.message || "No se pudieron asignar números",
      };
    }

    const numerosFinales: number[] = (asignados ?? []).map((n: any) => Number(n.numero));
    return { ok: true, alreadyAssigned: false, numeros: numerosFinales };
  } catch (e: any) {
    console.error("asignarNumerosPorPedidoId error:", e);
    return { ok: false, code: "INTERNAL", error: "Error interno al asignar números" };
  }
}
