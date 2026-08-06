import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { asignarNumerosPorPedidoId } from "@/lib/asignarNumeros";

type ProcesarPedidoPagadoResultado =
    | {
        ok: true;
        pedidoId: number;
        alreadyProcessed: boolean;
        numeros: number[];
        cardsCreated: number;
        giftId: string | null;
    }
    | {
        ok: false;
        pedidoId: number;
        code:
        | "NOT_FOUND"
        | "NOT_PAID"
        | "ASSIGNMENT_FAILED"
        | "OWNER_MISSING"
        | "CARDS_FAILED"
        | "INTERNAL";
        error: string;
    };

interface PedidoProcesable {
    id: number;
    estado: string | null;
    sorteo_id: string | null;
    cantidad_numeros: number | null;

    nombre: string | null;
    correo: string | null;
    telefono: string | null;

    tipo_compra: "self" | "gift" | null;
    card_design_id: string | null;

    cards_processing_status:
    | "pending"
    | "processing"
    | "completed"
    | "failed"
    | "cancelled"
    | null;
}

interface GiftOwner {
    id: string;
    destinatario_nombre: string;
    destinatario_correo: string;
    destinatario_telefono: string;
}

function normalizeEmail(value: string | null | undefined): string {
    return String(value ?? "")
        .trim()
        .toLowerCase();
}

function normalizePhone(value: string | null | undefined): string | null {
    const normalized = String(value ?? "")
        .trim()
        .replace(/[^\d+]/g, "");

    return normalized || null;
}

async function markProcessingFailed(
    pedidoId: number,
    message: string,
): Promise<void> {
    const { error } = await supabaseAdmin
        .from("pedidos")
        .update({
            cards_processing_status: "failed",
            cards_processing_error: message.slice(0, 1500),
        })
        .eq("id", pedidoId);

    if (error) {
        console.error(
            "No se pudo marcar procesamiento como fallido:",
            error,
        );
    }
}

export async function procesarPedidoPagado(
    pedidoId: number,
): Promise<ProcesarPedidoPagadoResultado> {
    try {
        if (!Number.isInteger(pedidoId) || pedidoId <= 0) {
            return {
                ok: false,
                pedidoId,
                code: "NOT_FOUND",
                error: "pedidoId inválido",
            };
        }

        /*
         * 1. Leer el pedido.
         */

        const { data: pedidoData, error: pedidoError } =
            await supabaseAdmin
                .from("pedidos")
                .select(`
          id,
          estado,
          sorteo_id,
          cantidad_numeros,
          nombre,
          correo,
          telefono,
          tipo_compra,
          card_design_id,
          cards_processing_status
        `)
                .eq("id", pedidoId)
                .single();

        if (pedidoError || !pedidoData) {
            return {
                ok: false,
                pedidoId,
                code: "NOT_FOUND",
                error: "Pedido no encontrado",
            };
        }

        const pedido = pedidoData as PedidoProcesable;

        if (pedido.estado !== "pagado") {
            return {
                ok: false,
                pedidoId,
                code: "NOT_PAID",
                error:
                    "El pedido no está pagado y no puede generar tarjetas",
            };
        }

        if (!pedido.sorteo_id) {
            return {
                ok: false,
                pedidoId,
                code: "INTERNAL",
                error: "El pedido no tiene sorteo_id",
            };
        }

        /*
         * 2. Idempotencia general.
         *
         * Si el pedido ya está completado, devolvemos las tarjetas
         * existentes sin volver a crear nada.
         */

        if (pedido.cards_processing_status === "completed") {
            const { data: existingCards, error: existingCardsError } =
                await supabaseAdmin
                    .from("baruk_cards")
                    .select(`
            id,
            numeros_asignados!inner(numero)
          `)
                    .eq("pedido_id", pedidoId);

            if (existingCardsError) {
                return {
                    ok: false,
                    pedidoId,
                    code: "INTERNAL",
                    error:
                        "No se pudieron consultar las tarjetas existentes",
                };
            }

            const numeros = (existingCards ?? [])
                .map((card: any) =>
                    Number(card.numeros_asignados?.numero),
                )
                .filter((numero) => Number.isFinite(numero));

            return {
                ok: true,
                pedidoId,
                alreadyProcessed: true,
                numeros,
                cardsCreated: existingCards?.length ?? 0,
                giftId: null,
            };
        }

        /*
         * 3. Tomar el procesamiento.
         */

        const { error: processingError } = await supabaseAdmin
            .from("pedidos")
            .update({
                cards_processing_status: "processing",
                cards_processing_error: null,
            })
            .eq("id", pedidoId)
            .neq("cards_processing_status", "completed");

        if (processingError) {
            return {
                ok: false,
                pedidoId,
                code: "INTERNAL",
                error: "No se pudo iniciar el procesamiento",
            };
        }

        /*
         * 4. Asignar números mediante la lógica actual.
         */

        const assignment = await asignarNumerosPorPedidoId(pedidoId);

        if (!assignment.ok) {
            await markProcessingFailed(
                pedidoId,
                assignment.error,
            );

            return {
                ok: false,
                pedidoId,
                code: "ASSIGNMENT_FAILED",
                error: assignment.error,
            };
        }

        /*
         * 5. Leer registros completos de números asignados.
         */

        const { data: assignedRows, error: assignedRowsError } =
            await supabaseAdmin
                .from("numeros_asignados")
                .select("id, numero, sorteo_id, pedido_id")
                .eq("pedido_id", pedidoId)
                .order("id", { ascending: true });

        if (
            assignedRowsError ||
            !assignedRows ||
            assignedRows.length === 0
        ) {
            const message =
                "No se encontraron números asignados para crear tarjetas";

            await markProcessingFailed(pedidoId, message);

            return {
                ok: false,
                pedidoId,
                code: "ASSIGNMENT_FAILED",
                error: message,
            };
        }

        /*
         * 6. Determinar al verdadero propietario.
         */

        let ownerType: "buyer" | "gift_recipient" = "buyer";
        let ownerEmail = normalizeEmail(pedido.correo);
        let ownerPhone = normalizePhone(pedido.telefono);
        let giftId: string | null = null;

        const tipoCompra =
            pedido.tipo_compra === "gift" ? "gift" : "self";

        if (tipoCompra === "gift") {
            const { data: giftData, error: giftError } =
                await supabaseAdmin
                    .from("baruk_gifts")
                    .select(`
            id,
            destinatario_nombre,
            destinatario_correo,
            destinatario_telefono
          `)
                    .eq("pedido_id", pedidoId)
                    .single();

            if (giftError || !giftData) {
                const message =
                    "El pedido es un regalo, pero no existe el destinatario";

                await markProcessingFailed(pedidoId, message);

                return {
                    ok: false,
                    pedidoId,
                    code: "OWNER_MISSING",
                    error: message,
                };
            }

            const gift = giftData as GiftOwner;

            ownerType = "gift_recipient";
            ownerEmail = normalizeEmail(
                gift.destinatario_correo,
            );
            ownerPhone = normalizePhone(
                gift.destinatario_telefono,
            );
            giftId = gift.id;
        }

        if (!ownerEmail) {
            const message =
                "No existe un correo válido para el propietario";

            await markProcessingFailed(pedidoId, message);

            return {
                ok: false,
                pedidoId,
                code: "OWNER_MISSING",
                error: message,
            };
        }

        /*
         * 7. Crear una tarjeta por cada número.
         *
         * En esta etapa inicial:
         * extra_type = none
         *
         * La restricción unique de numero_asignado_id evita duplicados.
         */

        const cardsPayload = assignedRows.map((assigned) => ({
            pedido_id: pedidoId,
            numero_asignado_id: assigned.id,
            sorteo_id: assigned.sorteo_id ?? pedido.sorteo_id,

            design_id: pedido.card_design_id,
            gift_id: giftId,

            owner_type: ownerType,
            owner_user_id: null,
            owner_email: ownerEmail,
            owner_phone: ownerPhone,

            origin:
                tipoCompra === "gift" ? "gift" : "purchase",

            extra_type: "none",
            sphere_id: null,
            prize_id: null,

            estado:
                tipoCompra === "gift"
                    ? "gift_pending"
                    : "available",

            revealed: false,
            revealed_at: null,
            revealed_by: null,
        }));

        const { error: cardsError } = await supabaseAdmin
            .from("baruk_cards")
            .upsert(cardsPayload, {
                onConflict: "numero_asignado_id",
                ignoreDuplicates: true,
            });

        if (cardsError) {
            await markProcessingFailed(
                pedidoId,
                cardsError.message,
            );

            return {
                ok: false,
                pedidoId,
                code: "CARDS_FAILED",
                error:
                    cardsError.message ||
                    "No se pudieron crear las tarjetas",
            };
        }

        /*
         * 8. Verificar cuántas tarjetas existen realmente.
         */

        const { data: finalCards, error: finalCardsError } =
            await supabaseAdmin
                .from("baruk_cards")
                .select("id")
                .eq("pedido_id", pedidoId);

        if (finalCardsError) {
            await markProcessingFailed(
                pedidoId,
                finalCardsError.message,
            );

            return {
                ok: false,
                pedidoId,
                code: "CARDS_FAILED",
                error:
                    "Las tarjetas fueron creadas, pero no pudieron verificarse",
            };
        }

        const expectedCount = Number(
            pedido.cantidad_numeros ?? assignedRows.length,
        );

        const actualCount = finalCards?.length ?? 0;

        if (actualCount !== expectedCount) {
            const message =
                `Cantidad incorrecta de tarjetas. ` +
                `Esperadas: ${expectedCount}. Creadas: ${actualCount}.`;

            await markProcessingFailed(pedidoId, message);

            return {
                ok: false,
                pedidoId,
                code: "CARDS_FAILED",
                error: message,
            };
        }

        /*
         * 9. Marcar regalo como pagado.
         *
         * El envío por WhatsApp y correo se integrará después.
         */

        if (giftId) {
            const { error: giftUpdateError } = await supabaseAdmin
                .from("baruk_gifts")
                .update({
                    estado: "paid",
                })
                .eq("id", giftId);

            if (giftUpdateError) {
                console.error(
                    "No se pudo actualizar el regalo:",
                    giftUpdateError,
                );
            }
        }

        /*
         * 10. Marcar el pedido como procesado.
         */

        const processedAt = new Date().toISOString();

        const { error: completeError } = await supabaseAdmin
            .from("pedidos")
            .update({
                cards_processing_status: "completed",
                cards_processed_at: processedAt,
                cards_processing_error: null,
            })
            .eq("id", pedidoId);

        if (completeError) {
            await markProcessingFailed(
                pedidoId,
                completeError.message,
            );

            return {
                ok: false,
                pedidoId,
                code: "INTERNAL",
                error:
                    "Las tarjetas se crearon, pero el pedido no pudo marcarse como completado",
            };
        }

        return {
            ok: true,
            pedidoId,
            alreadyProcessed:
                assignment.alreadyAssigned &&
                actualCount === expectedCount,
            numeros: assignment.numeros,
            cardsCreated: actualCount,
            giftId,
        };
    } catch (error: unknown) {
        console.error(
            "procesarPedidoPagado error:",
            error,
        );

        const message =
            error instanceof Error
                ? error.message
                : "Error interno al procesar el pedido";

        await markProcessingFailed(pedidoId, message);

        return {
            ok: false,
            pedidoId,
            code: "INTERNAL",
            error: message,
        };
    }
}