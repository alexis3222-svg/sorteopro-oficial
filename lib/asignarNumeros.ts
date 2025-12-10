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
    code: "BAD_REQUEST" | "NOT_FOUND" | "NO_STOCK" | "INTERNAL";
    error: string;
  };

/**
 * Asigna números a partir del tx de PayPhone usando SOLO la función de BD.
 * - Solo funciona para pedidos con método de pago "payphone".
 * - Si el pedido ya tiene números asignados, NO vuelve a asignar.
 * - Si asigna, también marca el pedido como "pagado".
 *
 * ⚠️ IMPORTANTE:
 * La lógica de que los números sean ALEATORIOS está en la función
 * de BD `asignar_numeros_para_pedido(p_pedido_id integer)` que debe
 * hacer `ORDER BY random()` al escoger los números disponibles.
 */
export async function asignarNumerosPorTx(
  tx: string
): Promise<ResultadoAsignacion> {
  try {
    if (!tx) {
      return {
        ok: false,
        code: "BAD_REQUEST",
        error: "Falta el identificador de transacción (tx)",
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

    const cantidad = (pedido.cantidad_numeros as number) || 0;
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
      // Ya tenía números → no volvemos a asignar
      return {
        ok: true,
        alreadyAssigned: true,
        numeros: existentes.map((n: any) => n.numero as number),
      };
    }

    // 3) Llamar a la función de BD para asignar ALEATORIO
    //    Esta función debe implementar la lógica:
    //    - leer actividad, cantidad y total de números
    //    - elegir entre los disponibles con ORDER BY random()
    //    - insertar en numeros_asignados y devolver los números
    const { data: asignados, error: rpcError } = await supabaseAdmin.rpc(
      "asignar_numeros_para_pedido",
      {
        p_pedido_id: pedido.id,
      }
    );

    if (rpcError) {
      console.error("Error en asignar_numeros_para_pedido:", rpcError);
      return {
        ok: false,
        code: "NO_STOCK",
        error:
          rpcError.message ||
          "No se pudieron asignar los números (sin stock o error de BD)",
      };
    }

    const numerosFinales: number[] = (asignados ?? []).map(
      (n: any) => n.numero as number
    );

    // Seguridad extra: si por alguna razón la función no devolvió nada
    if (!numerosFinales.length) {
      return {
        ok: false,
        code: "NO_STOCK",
        error:
          "La función de asignación no devolvió números. Verifica el stock o la lógica en la BD.",
      };
    }

    // 4) Marcar pedido como pagado (si no lo está)
    if (pedido.estado !== "pagado") {
      const { error: updateError } = await supabaseAdmin
        .from("pedidos")
        .update({ estado: "pagado" })
        .eq("id", pedido.id);

      if (updateError) {
        console.error("Error actualizando estado del pedido:", updateError);
        // No rompemos la asignación, solo avisamos
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
