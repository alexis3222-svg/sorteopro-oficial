import { supabaseAdmin } from "./supabaseAdmin";

type ResultadoAsignacion =
  | { ok: true; alreadyAssigned: boolean; numeros: number[] }
  | {
    ok: false;
    code: "BAD_REQUEST" | "NOT_FOUND" | "NO_STOCK" | "INTERNAL";
    error: string;
  };

/**
 * ✅ ADMIN-ONLY: asigna números por pedidoId
 * Reglas:
 * - Solo asigna si el pedido está en estado "pagado"
 * - Si ya tiene números asignados, NO reasigna (idempotente)
 * - Usa RPC asignar_numeros_sorteo
 */
export async function asignarNumerosPorPedidoId(
  pedidoId: number
): Promise<ResultadoAsignacion> {
  try {
    if (!pedidoId) {
      return { ok: false, code: "BAD_REQUEST", error: "Falta pedidoId" };
    }

    // 1) Leer pedido
    const { data: pedido, error: pedidoError } = await supabaseAdmin
      .from("pedidos")
      .select("id, sorteo_id, cantidad_numeros, estado")
      .eq("id", pedidoId)
      .single();

    if (pedidoError || !pedido) {
      console.error("Pedido no encontrado:", pedidoError);
      return { ok: false, code: "NOT_FOUND", error: "Pedido no encontrado" };
    }

    // ✅ Regla dura del modelo ADMIN-ONLY
    if (pedido.estado !== "pagado") {
      return {
        ok: false,
        code: "BAD_REQUEST",
        error: 'El pedido no está "pagado". Solo el ADMIN puede asignar al marcar pagado.',
      };
    }

    if (!pedido.sorteo_id) {
      return {
        ok: false,
        code: "BAD_REQUEST",
        error: "El pedido no tiene sorteo_id",
      };
    }

    const cantidad = Number(pedido.cantidad_numeros || 0);
    if (!cantidad || cantidad <= 0) {
      return {
        ok: false,
        code: "BAD_REQUEST",
        error: "El pedido no tiene cantidad_numeros válida",
      };
    }

    // 2) Idempotencia: si ya hay asignados → devolverlos
    const { data: existentes, error: existentesError } = await supabaseAdmin
      .from("numeros_asignados")
      .select("numero")
      .eq("pedido_id", pedido.id)
      .order("numero", { ascending: true });

    if (existentesError) {
      console.error("Error consultando numeros_asignados:", existentesError);
      return {
        ok: false,
        code: "INTERNAL",
        error: "Error consultando números existentes",
      };
    }

    if (existentes && existentes.length > 0) {
      return {
        ok: true,
        alreadyAssigned: true,
        numeros: existentes.map((n: any) => Number(n.numero)),
      };
    }

    // 3) RPC: asignación en BD (segura)
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
      console.error("Error en asignar_numeros_sorteo:", rpcError);
      return {
        ok: false,
        code: "NO_STOCK",
        error:
          rpcError.message ||
          "No se pudieron asignar los números (sin stock o error de BD)",
      };
    }

    const numerosFinales: number[] = (asignados ?? []).map((n: any) =>
      Number(n.numero)
    );

    return { ok: true, alreadyAssigned: false, numeros: numerosFinales };
  } catch (e: any) {
    console.error("Error inesperado en asignarNumerosPorPedidoId:", e);
    return {
      ok: false,
      code: "INTERNAL",
      error: "Error interno al asignar números",
    };
  }
}
