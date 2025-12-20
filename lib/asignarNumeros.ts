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
 * - 🔒 Candado PRO-1: SOLO asigna si pedido.estado === "pagado"
 * - Tolerante a concurrencia: si el RPC falla por UNIQUE, re-lee existentes y devuelve.
 */
export async function asignarNumerosPorPedidoId(
  pedidoId: number
): Promise<ResultadoAsignacion> {
  try {
    if (!pedidoId) {
      return { ok: false, code: "BAD_REQUEST", error: "Falta pedidoId" };
    }

    // 1) Obtener pedido (incluye estado para candado PRO-1)
    const { data: pedido, error: pedidoError } = await supabaseAdmin
      .from("pedidos")
      .select("id, estado, sorteo_id, cantidad_numeros")
      .eq("id", pedidoId)
      .single();

    if (pedidoError || !pedido) {
      return { ok: false, code: "NOT_FOUND", error: "Pedido no encontrado" };
    }

    // 🔒 Candado definitivo: no asignar si NO está pagado
    if (pedido.estado !== "pagado") {
      return {
        ok: false,
        code: "BAD_REQUEST",
        error: "Pedido no está pagado: no se pueden asignar números",
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
    if (cantidad <= 0) {
      return {
        ok: false,
        code: "BAD_REQUEST",
        error: "cantidad_numeros inválida",
      };
    }

    // 2) Idempotencia: ¿ya tiene números?
    const leerExistentes = async () => {
      const { data, error } = await supabaseAdmin
        .from("numeros_asignados")
        .select("numero")
        .eq("pedido_id", pedido.id)
        .order("numero", { ascending: true });

      if (error) {
        return { ok: false as const, error };
      }
      return { ok: true as const, data: data ?? [] };
    };

    const existentesRes = await leerExistentes();
    if (!existentesRes.ok) {
      return {
        ok: false,
        code: "INTERNAL",
        error: "Error consultando números existentes",
      };
    }

    if (existentesRes.data.length > 0) {
      return {
        ok: true,
        alreadyAssigned: true,
        numeros: existentesRes.data.map((n: any) => Number(n.numero)),
      };
    }

    // 3) RPC (la BD asigna) - debe ser atómico del lado BD
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
      // ✅ Tolerancia a concurrencia:
      // Si otro proceso asignó al mismo tiempo, puede fallar por UNIQUE.
      // Re-leemos existentes y si ya están, devolvemos OK idempotente.
      const recheck = await leerExistentes();
      if (recheck.ok && recheck.data.length > 0) {
        return {
          ok: true,
          alreadyAssigned: true,
          numeros: recheck.data.map((n: any) => Number(n.numero)),
        };
      }

      return {
        ok: false,
        code: "NO_STOCK",
        error: rpcError.message || "No se pudieron asignar números",
      };
    }

    const numerosFinales: number[] = (asignados ?? []).map((n: any) =>
      Number(n.numero)
    );

    // Si por alguna razón el RPC devolvió vacío, intentamos leer una vez (defensivo)
    if (numerosFinales.length === 0) {
      const recheck = await leerExistentes();
      if (recheck.ok && recheck.data.length > 0) {
        return {
          ok: true,
          alreadyAssigned: true,
          numeros: recheck.data.map((n: any) => Number(n.numero)),
        };
      }
    }

    return { ok: true, alreadyAssigned: false, numeros: numerosFinales };
  } catch (e: any) {
    console.error("asignarNumerosPorPedidoId error:", e);
    return {
      ok: false,
      code: "INTERNAL",
      error: "Error interno al asignar números",
    };
  }
}
