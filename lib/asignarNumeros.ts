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

// Asigna números a partir del tx de PayPhone usando SOLO la función de BD
export async function asignarNumerosPorTx(tx: string): Promise<ResultadoAsignacion> {
  try {
    if (!tx) {
      return {
        ok: false,
        code: "BAD_REQUEST",
        error: "Falta el identificador de transacción (tx)",
      };
    }

    // 1️⃣ Buscar el pedido por tx
    const { data: pedido, error: pedidoError } = await supabaseAdmin
      .from("pedidos")
      .select("*")
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

    // 2️⃣ ¿Ya tiene números asignados este pedido?
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

    // 3️⃣ Llamar a la función de BD para asignar (secuencial, segura)
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
      // Si viene de falta de stock u otro error de negocio
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

    // 4️⃣ Marcar pedido como pagado (si no lo está)
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
