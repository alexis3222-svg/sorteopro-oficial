// lib/asignarNumeros.ts
import { supabaseAdmin } from "./supabaseAdmin";

type ResultadoAsignacion =
  | {
    ok: true;
    alreadyAssigned: boolean;
    numeros: number[];
  }
  | {
    ok: false;
    code: "BAD_REQUEST" | "NOT_FOUND" | "NO_STOCK" | "INTERNAL" | "NOT_CONFIRMED";
    error: string;
  };

/**
 * ✅ Asigna números a partir del tx SOLO si el pago está confirmado.
 *
 * Regla PRO:
 * - Este helper NO valida PayPhone.
 * - Debe ser llamado ÚNICAMENTE por un endpoint servidor que ya verificó el pago.
 * - Si paidConfirmed === false, no hace nada (reporta NOT_CONFIRMED).
 */
export async function asignarNumerosPorTx(
  tx: string,
  paidConfirmed: boolean
): Promise<ResultadoAsignacion> {
  try {
    if (!tx) {
      return {
        ok: false,
        code: "BAD_REQUEST",
        error: "Falta el identificador de transacción (tx)",
      };
    }

    // 🔒 Blindaje: sin confirmación real, NO asignar jamás
    if (!paidConfirmed) {
      return {
        ok: false,
        code: "NOT_CONFIRMED",
        error: "Pago no confirmado por PayPhone. No se asignarán números.",
      };
    }

    // 1) Buscar el pedido por tx
    const { data: pedido, error: pedidoError } = await supabaseAdmin
      .from("pedidos")
      .select(
        `
          id,
          sorteo_id,
          cantidad_numeros,
          estado,
          metodo_pago,
          payphone_client_transaction_id
        `
      )
      .eq("payphone_client_transaction_id", tx)
      .single();

    if (pedidoError || !pedido) {
      console.error("Pedido no encontrado:", pedidoError);
      return {
        ok: false,
        code: "NOT_FOUND",
        error: "Pedido no encontrado para ese tx",
      };
    }

    // Aseguramos que este helper solo se use para PayPhone
    if (pedido.metodo_pago !== "payphone") {
      return {
        ok: false,
        code: "BAD_REQUEST",
        error: "El pedido no corresponde a un pago PayPhone",
      };
    }

    if (!pedido.sorteo_id) {
      return {
        ok: false,
        code: "BAD_REQUEST",
        error: "El pedido no tiene sorteo_id",
      };
    }

    const cantidad = Number(pedido.cantidad_numeros) || 0;
    if (cantidad <= 0) {
      return {
        ok: false,
        code: "BAD_REQUEST",
        error: "El pedido no tiene cantidad_numeros válida",
      };
    }

    // 2) ¿Ya tiene números asignados este pedido?
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
        numeros: existentes.map((n: any) => n.numero as number),
      };
    }

    // 3) Llamar a la función de BD para asignar (secuencial, segura)
    // ✅ Como ya está confirmado, aquí sí marcamos p_estado="pagado"
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
      typeof n === "number" ? (n as number) : (n.numero as number)
    );

    if (!numerosFinales.length) {
      return {
        ok: false,
        code: "NO_STOCK",
        error:
          "La función de asignación no devolvió números. Verifica el stock o la lógica en la BD.",
      };
    }

    // 4) Asegurar estado pagado (por si tu RPC no lo hace)
    if (pedido.estado !== "pagado") {
      const { error: updateError } = await supabaseAdmin
        .from("pedidos")
        .update({ estado: "pagado" })
        .eq("id", pedido.id);

      if (updateError) {
        console.error("Error actualizando estado del pedido:", updateError);
      }
    }

    return {
      ok: true,
      alreadyAssigned: false,
      numeros: numerosFinales,
    };
  } catch (e: any) {
    console.error("Error inesperado en asignarNumerosPorTx:", e);
    return {
      ok: false,
      code: "INTERNAL",
      error: "Error interno al asignar números",
    };
  }
}
