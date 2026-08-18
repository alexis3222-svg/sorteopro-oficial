import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { asignarNumerosPorPedidoId } from "@/lib/asignarNumeros";
import { entregarPremioTarjetasDigitales } from "@/lib/entregarPremioTarjetasDigitales";
import { registrarReclamoPremio } from "@/lib/registrarReclamoPremio";
import {
    notificarRegaloPagado,
} from "@/lib/notificarRegaloPagado";

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

    es_pedido_premio: boolean | null;
    claim_origen_id: string | null;
    card_origen_premio_id: string | null;
    prize_generation_depth: number | null;

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
  cards_processing_status,
  es_pedido_premio,
  claim_origen_id,
  card_origen_premio_id,
  prize_generation_depth
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

            origin: pedido.es_pedido_premio
                ? "instant_prize"
                : tipoCompra === "gift"
                    ? "gift"
                    : "purchase",

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
                .select(`
      id,
      extra_type,
      sphere_id,
      prize_id,
      extra_processed_at
    `)
                .eq("pedido_id", pedidoId)
                .order("created_at", {
                    ascending: true,
                });

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
 * 9. Asignar el resultado adicional de cada tarjeta.
 *
 * Si el resultado es un premio digital de Baruk Cards:
 * - crea el reclamo;
 * - crea el pedido gratuito;
 * - procesa sus números y tarjetas;
 * - marca la entrega como completada.
 *
 * Los demás premios crean únicamente un reclamo.
 */
        for (const card of finalCards ?? []) {
            const { data: extraData, error: extraError } =
                await supabaseAdmin.rpc(
                    "assign_baruk_card_extra",
                    {
                        p_card_id: card.id,
                    }
                );

            if (extraError) {
                const message =
                    `No se pudo asignar el resultado de la tarjeta ` +
                    `${card.id}: ${extraError.message}`;

                await markProcessingFailed(
                    pedidoId,
                    message
                );

                return {
                    ok: false,
                    pedidoId,
                    code: "CARDS_FAILED",
                    error: message,
                };
            }

            const extraResult = Array.isArray(extraData)
                ? extraData[0]
                : extraData;

            if (!extraResult) {
                const message =
                    `La asignación de la tarjeta ${card.id} ` +
                    `no devolvió ningún resultado`;

                await markProcessingFailed(
                    pedidoId,
                    message
                );

                return {
                    ok: false,
                    pedidoId,
                    code: "CARDS_FAILED",
                    error: message,
                };
            }

            /*
             * Si no salió premio, no necesitamos hacer nada más.
             */
            if (
                extraResult.extra_type !== "prize" ||
                !extraResult.prize_id
            ) {
                continue;
            }

            /*
             * Consultar información del premio.
             */
            const { data: prizeData, error: prizeError } =
                await supabaseAdmin
                    .from("card_prizes")
                    .select(`
                id,
                tipo,
                cantidad_cards
            `)
                    .eq("id", extraResult.prize_id)
                    .single();

            if (prizeError || !prizeData) {
                const message =
                    `La tarjeta ${card.id} recibió un premio, ` +
                    `pero no fue posible consultar sus datos`;

                await markProcessingFailed(
                    pedidoId,
                    message
                );

                return {
                    ok: false,
                    pedidoId,
                    code: "CARDS_FAILED",
                    error: message,
                };
            }

            /*
             * ========================================================
             * PREMIO DIGITAL: Baruk Cards adicionales
             * ========================================================
             */
            if (prizeData.tipo === "digital_cards") {
                const currentDepth = Number(
                    pedido.prize_generation_depth ?? 0
                );

                /*
                 * Evita cadenas infinitas de tarjetas gratuitas.
                 */
                if (currentDepth >= 2) {
                    console.warn(
                        `La tarjeta ${card.id} ganó tarjetas digitales, ` +
                        `pero alcanzó la profundidad máxima`
                    );

                    /*
                     * Registramos el premio como reclamo pendiente
                     * para que pueda gestionarse manualmente.
                     */
                    const claim =
                        await registrarReclamoPremio(card.id);

                    if (!claim.ok) {
                        const message =
                            `La tarjeta ${card.id} alcanzó la profundidad ` +
                            `máxima y no pudo registrar su reclamo: ` +
                            `${claim.error}`;

                        await markProcessingFailed(
                            pedidoId,
                            message
                        );

                        return {
                            ok: false,
                            pedidoId,
                            code: "CARDS_FAILED",
                            error: message,
                        };
                    }

                    continue;
                }

                const delivery =
                    await entregarPremioTarjetasDigitales(
                        card.id
                    );

                if (
                    !delivery.ok ||
                    !delivery.pedidoEntregaId ||
                    !delivery.claimId
                ) {
                    const message =
                        delivery.error ??
                        `No se pudo entregar el premio digital ` +
                        `de la tarjeta ${card.id}`;

                    await markProcessingFailed(
                        pedidoId,
                        message
                    );

                    return {
                        ok: false,
                        pedidoId,
                        code: "CARDS_FAILED",
                        error: message,
                    };
                }

                /*
                 * Procesar el pedido gratuito:
                 * - asignar números;
                 * - crear tarjetas;
                 * - asignar extras.
                 */
                const childProcessing =
                    await procesarPedidoPagado(
                        delivery.pedidoEntregaId
                    );

                if (!childProcessing.ok) {
                    const message =
                        `Se creó el pedido gratuito ` +
                        `${delivery.pedidoEntregaId}, ` +
                        `pero no pudo procesarse: ` +
                        `${childProcessing.error}`;

                    await markProcessingFailed(
                        pedidoId,
                        message
                    );

                    return {
                        ok: false,
                        pedidoId,
                        code: "CARDS_FAILED",
                        error: message,
                    };
                }

                /*
                 * Marcar reclamo digital como entregado.
                 */
                const { error: deliveredError } =
                    await supabaseAdmin
                        .from("prize_claims")
                        .update({
                            estado: "delivered",
                            delivered_at:
                                new Date().toISOString(),
                            entrega_automatica: true,
                        })
                        .eq("id", delivery.claimId);

                if (deliveredError) {
                    const message =
                        `Las tarjetas gratuitas fueron creadas, ` +
                        `pero no se pudo marcar el reclamo ` +
                        `como entregado: ` +
                        `${deliveredError.message}`;

                    await markProcessingFailed(
                        pedidoId,
                        message
                    );

                    return {
                        ok: false,
                        pedidoId,
                        code: "CARDS_FAILED",
                        error: message,
                    };
                }

                continue;
            }

            /*
             * ========================================================
             * PREMIOS MANUALES
             *
             * physical
             * cash
             * experience
             * discount
             * ========================================================
             */
            const claim =
                await registrarReclamoPremio(card.id);

            if (!claim.ok) {
                const message =
                    `La tarjeta ${card.id} recibió un premio, ` +
                    `pero no pudo registrarse el reclamo: ` +
                    `${claim.error}`;

                await markProcessingFailed(
                    pedidoId,
                    message
                );

                return {
                    ok: false,
                    pedidoId,
                    code: "CARDS_FAILED",
                    error: message,
                };
            }
        }

        /*
  * 10. MARCAR REGALO COMO PAGADO
  *     Y NOTIFICAR AL DESTINATARIO
  */

        if (giftId) {

            const {
                error:
                giftUpdateError,
            } =
                await supabaseAdmin
                    .from(
                        "baruk_gifts"
                    )
                    .update({
                        estado:
                            "paid",
                    })
                    .eq(
                        "id",
                        giftId
                    );


            if (
                giftUpdateError
            ) {

                console.error(
                    "No se pudo actualizar el regalo:",
                    giftUpdateError
                );

            } else {

                /*
                 * El regalo y sus Experience Pass
                 * ya existen correctamente.
                 *
                 * Intentamos enviar el acceso.
                 *
                 * IMPORTANTE:
                 * un fallo de correo NO invalida
                 * el pedido ni elimina las tarjetas.
                 */

                const notification =
                    await notificarRegaloPagado(
                        giftId
                    );


                if (
                    !notification.ok
                ) {

                    console.error(
                        `Regalo ${giftId} pagado pero no notificado:`,
                        notification.error
                    );

                } else {

                    console.log(
                        notification.alreadySent
                            ? `Regalo ${giftId}: correo ya enviado anteriormente.`
                            : `Regalo ${giftId}: correo enviado correctamente.`
                    );
                }
            }
        }

        /*
         * 11. Marcar el pedido como procesado.
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