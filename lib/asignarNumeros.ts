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

// Mezcla un array (Fisher–Yates)
function shuffle<T>(array: T[]): T[] {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 👇 Función central que usará tanto /pago-exitoso como el webhook
export async function asignarNumerosPorTx(tx: string): Promise<ResultadoAsignacion> {
  try {
    if (!tx) {
      return {
        ok: false,
        code: "BAD_REQUEST",
        error: "Falta el identificador de transacción (tx)",
      };
    }

    // 1️⃣ Buscar el pedido
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

    // 2️⃣ Marcar como pagado (si no lo está)
    if (pedido.estado !== "pagado") {
      const { error: updateError } = await supabaseAdmin
        .from("pedidos")
        .update({ estado: "pagado" })
        .eq("id", pedido.id);

      if (updateError) {
        console.error("Error actualizando estado del pedido:", updateError);
        return {
          ok: false,
          code: "INTERNAL",
          error: "No se pudo actualizar el estado del pedido",
        };
      }
    }

    // 3️⃣ ¿Ya tiene números? → NO volvemos a asignar
    const { data: existentes, error: existentesError } = await supabaseAdmin
      .from("numeros_asignados")
      .select("numero")
      .eq("pedido_id", pedido.id);

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

    // 4️⃣ Traer la config del sorteo
    const { data: sorteo, error: sorteoError } = await supabaseAdmin
      .from("sorteos")
      .select("id, total_numeros")
      .eq("id", pedido.sorteo_id)
      .single();

    if (sorteoError || !sorteo) {
      console.error("Error obteniendo sorteo:", sorteoError);
      return {
        ok: false,
        code: "INTERNAL",
        error: "No se pudo obtener la configuración del sorteo",
      };
    }

    const totalNumeros = sorteo.total_numeros as number;
    if (!totalNumeros || totalNumeros <= 0) {
      return {
        ok: false,
        code: "INTERNAL",
        error: "El sorteo no tiene total_numeros configurado",
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

    // 5️⃣ Números ya usados en el sorteo
    const { data: usados, error: usadosError } = await supabaseAdmin
      .from("numeros_asignados")
      .select("numero")
      .eq("sorteo_id", pedido.sorteo_id);

    if (usadosError) {
      console.error("Error consultando números usados:", usadosError);
      return {
        ok: false,
        code: "INTERNAL",
        error: "Error consultando números usados",
      };
    }

    const usadosSet = new Set<number>((usados || []).map((n: any) => n.numero));

    // 6️⃣ Lista de disponibles 1..totalNumeros
    const disponibles: number[] = [];
    for (let i = 1; i <= totalNumeros; i++) {
      if (!usadosSet.has(i)) disponibles.push(i);
    }

    if (disponibles.length < cantidad) {
      return {
        ok: false,
        code: "NO_STOCK",
        error: "No hay suficientes números disponibles en el sorteo",
      };
    }

    // 7️⃣ Elegir aleatorios
    const mezclados = shuffle(disponibles);
    const seleccionados = mezclados.slice(0, cantidad);

    // 8️⃣ Insertar en numeros_asignados
    const rows = seleccionados.map((num) => ({
      sorteo_id: pedido.sorteo_id,
      pedido_id: pedido.id,
      numero: num,
    }));

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("numeros_asignados")
      .insert(rows)
      .select("numero");

    if (insertError) {
      console.error("Error insertando numeros_asignados:", insertError);

      // 🔒 Si existe la constraint UNIQUE (sorteo_id, numero)
      // y dos pedidos chocan por concurrencia, caerá aquí con código 23505
      const pgError = insertError as any;

      if (pgError.code === "23505") {
        return {
          ok: false,
          code: "NO_STOCK",
          error:
            "Hubo un conflicto al asignar los números. Intenta nuevamente o contacta soporte.",
        };
      }

      return {
        ok: false,
        code: "INTERNAL",
        error: "No se pudieron asignar los números",
      };
    }

    // 9️⃣ Por si acaso, devolvemos lo que realmente quedó en BD
    const numerosFinales = (inserted ?? []).map(
      (n: any) => n.numero as number
    );

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
