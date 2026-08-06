import { supabaseAdmin } from "@/lib/supabaseAdmin";

interface EntregaPremioDigitalResultado {
    ok: boolean;
    alreadyDelivered: boolean;
    claimId: string | null;
    pedidoEntregaId: number | null;
    cantidadCards: number;
    error?: string;
}

interface CardPremiada {
    id: string;
    pedido_id: number;
    sorteo_id: string;
    design_id: string | null;
    gift_id: string | null;

    owner_type: "buyer" | "gift_recipient";
    owner_user_id: string | null;
    owner_email: string;
    owner_phone: string | null;

    prize_id: string;
}

interface PremioDigital {
    id: string;
    nombre: string;
    tipo: string;
    cantidad_cards: number | null;
}

interface PedidoOrigen {
    id: number;
    actividad_numero: number | null;
    nombre: string | null;
    correo: string | null;
    telefono: string | null;
    ciudad: string | null;
    prize_generation_depth: number | null;
}

export async function entregarPremioTarjetasDigitales(
    cardId: string
): Promise<EntregaPremioDigitalResultado> {
    try {
        /*
         * 1. Leer la tarjeta premiada y el premio asignado.
         */
        const { data: cardData, error: cardError } =
            await supabaseAdmin
                .from("baruk_cards")
                .select(`
                    id,
                    pedido_id,
                    sorteo_id,
                    design_id,
                    gift_id,
                    owner_type,
                    owner_user_id,
                    owner_email,
                    owner_phone,
                    prize_id
                `)
                .eq("id", cardId)
                .eq("extra_type", "prize")
                .single();

        if (cardError || !cardData) {
            return {
                ok: false,
                alreadyDelivered: false,
                claimId: null,
                pedidoEntregaId: null,
                cantidadCards: 0,
                error: "La tarjeta premiada no fue encontrada",
            };
        }

        const card = cardData as CardPremiada;

        if (!card.prize_id) {
            return {
                ok: false,
                alreadyDelivered: false,
                claimId: null,
                pedidoEntregaId: null,
                cantidadCards: 0,
                error: "La tarjeta no tiene un premio asociado",
            };
        }

        /*
         * 2. Comprobar si ya existe una entrega.
         */
        const { data: existingClaim, error: existingClaimError } =
            await supabaseAdmin
                .from("prize_claims")
                .select(`
                    id,
                    pedido_entrega_id,
                    estado
                `)
                .eq("card_id", card.id)
                .maybeSingle();

        if (existingClaimError) {
            return {
                ok: false,
                alreadyDelivered: false,
                claimId: null,
                pedidoEntregaId: null,
                cantidadCards: 0,
                error: existingClaimError.message,
            };
        }

        if (existingClaim?.pedido_entrega_id) {
            return {
                ok: true,
                alreadyDelivered: true,
                claimId: existingClaim.id,
                pedidoEntregaId: Number(
                    existingClaim.pedido_entrega_id
                ),
                cantidadCards: 0,
            };
        }

        /*
         * 3. Leer el premio.
         */
        const { data: premioData, error: premioError } =
            await supabaseAdmin
                .from("card_prizes")
                .select(`
                    id,
                    nombre,
                    tipo,
                    cantidad_cards
                `)
                .eq("id", card.prize_id)
                .single();

        if (premioError || !premioData) {
            return {
                ok: false,
                alreadyDelivered: false,
                claimId: null,
                pedidoEntregaId: null,
                cantidadCards: 0,
                error: "No se encontró el premio asociado",
            };
        }

        const premio = premioData as PremioDigital;

        if (
            premio.tipo !== "digital_cards" ||
            !premio.cantidad_cards ||
            premio.cantidad_cards <= 0
        ) {
            return {
                ok: false,
                alreadyDelivered: false,
                claimId: null,
                pedidoEntregaId: null,
                cantidadCards: 0,
                error:
                    "El premio no corresponde a tarjetas digitales",
            };
        }

        /*
         * 4. Leer el pedido original.
         */
        const { data: pedidoData, error: pedidoError } =
            await supabaseAdmin
                .from("pedidos")
                .select(`
                    id,
                    actividad_numero,
                    nombre,
                    correo,
                    telefono,
                    ciudad,
                    prize_generation_depth
                `)
                .eq("id", card.pedido_id)
                .single();

        if (pedidoError || !pedidoData) {
            return {
                ok: false,
                alreadyDelivered: false,
                claimId: null,
                pedidoEntregaId: null,
                cantidadCards: premio.cantidad_cards,
                error: "No se encontró el pedido original",
            };
        }

        const pedidoOrigen =
            pedidoData as PedidoOrigen;

        const currentDepth = Number(
            pedidoOrigen.prize_generation_depth ?? 0
        );

        /*
         * Evita una cadena ilimitada de tarjetas gratuitas.
         */
        if (currentDepth >= 2) {
            return {
                ok: false,
                alreadyDelivered: false,
                claimId: null,
                pedidoEntregaId: null,
                cantidadCards: premio.cantidad_cards,
                error:
                    "Se alcanzó la profundidad máxima de premios digitales",
            };
        }

        /*
         * 5. Crear o recuperar el reclamo.
         *
         * prize_claims.card_id es UNIQUE, por lo que no puede
         * generarse dos veces el mismo reclamo.
         */
        let claimId = existingClaim?.id ?? null;

        if (!claimId) {
            const { data: claim, error: claimError } =
                await supabaseAdmin
                    .from("prize_claims")
                    .insert({
                        card_id: card.id,
                        prize_id: premio.id,

                        owner_user_id:
                            card.owner_user_id,

                        owner_name:
                            pedidoOrigen.nombre,

                        owner_email:
                            card.owner_email,

                        owner_phone:
                            card.owner_phone,

                        estado: "verified",
                        verified_at:
                            new Date().toISOString(),

                        entrega_automatica: true,
                    })
                    .select("id")
                    .single();

            if (claimError || !claim) {
                /*
                 * Otro proceso pudo crear el reclamo al mismo tiempo.
                 */
                const { data: recoveredClaim } =
                    await supabaseAdmin
                        .from("prize_claims")
                        .select("id, pedido_entrega_id")
                        .eq("card_id", card.id)
                        .maybeSingle();

                if (!recoveredClaim) {
                    return {
                        ok: false,
                        alreadyDelivered: false,
                        claimId: null,
                        pedidoEntregaId: null,
                        cantidadCards:
                            premio.cantidad_cards,
                        error:
                            claimError?.message ??
                            "No se pudo crear el reclamo",
                    };
                }

                claimId = recoveredClaim.id;

                if (recoveredClaim.pedido_entrega_id) {
                    return {
                        ok: true,
                        alreadyDelivered: true,
                        claimId,
                        pedidoEntregaId: Number(
                            recoveredClaim.pedido_entrega_id
                        ),
                        cantidadCards:
                            premio.cantidad_cards,
                    };
                }
            } else {
                claimId = claim.id;
            }
        }

        if (!claimId) {
            return {
                ok: false,
                alreadyDelivered: false,
                claimId: null,
                pedidoEntregaId: null,
                cantidadCards: premio.cantidad_cards,
                error: "No se pudo determinar el reclamo",
            };
        }

        /*
         * 6. Crear el pedido interno de valor $0.
         */
        const { data: pedidoEntrega, error: pedidoEntregaError } =
            await supabaseAdmin
                .from("pedidos")
                .insert({
                    sorteo_id: card.sorteo_id,

                    actividad_numero:
                        pedidoOrigen.actividad_numero,

                    cantidad_numeros:
                        premio.cantidad_cards,

                    precio_unitario: 0,
                    total: 0,

                    metodo_pago: "premio_digital",

                    nombre:
                        pedidoOrigen.nombre ??
                        "Ganador Baruk593",

                    telefono:
                        card.owner_phone ??
                        pedidoOrigen.telefono,

                    correo: card.owner_email,
                    ciudad: pedidoOrigen.ciudad,

                    estado: "pagado",

                    tipo_compra: "self",
                    card_design_id: card.design_id,

                    cards_processing_status: "pending",
                    cards_processed_at: null,
                    cards_processing_error: null,

                    es_pedido_premio: true,
                    claim_origen_id: claimId,
                    card_origen_premio_id: card.id,

                    prize_generation_depth:
                        currentDepth + 1,
                })
                .select("id")
                .single();

        if (pedidoEntregaError || !pedidoEntrega) {
            /*
             * Puede existir ya por la restricción única del claim.
             */
            const { data: recoveredPedido } =
                await supabaseAdmin
                    .from("pedidos")
                    .select("id")
                    .eq("claim_origen_id", claimId)
                    .maybeSingle();

            if (!recoveredPedido) {
                return {
                    ok: false,
                    alreadyDelivered: false,
                    claimId,
                    pedidoEntregaId: null,
                    cantidadCards: premio.cantidad_cards,
                    error:
                        pedidoEntregaError?.message ??
                        "No se pudo crear el pedido de entrega",
                };
            }

            return {
                ok: true,
                alreadyDelivered: true,
                claimId,
                pedidoEntregaId: Number(
                    recoveredPedido.id
                ),
                cantidadCards: premio.cantidad_cards,
            };
        }

        const pedidoEntregaId = Number(
            pedidoEntrega.id
        );

        /*
         * 7. Vincular el reclamo con el pedido creado.
         */
        const { error: claimUpdateError } =
            await supabaseAdmin
                .from("prize_claims")
                .update({
                    pedido_entrega_id:
                        pedidoEntregaId,

                    estado: "scheduled",
                    scheduled_at:
                        new Date().toISOString(),
                })
                .eq("id", claimId);

        if (claimUpdateError) {
            return {
                ok: false,
                alreadyDelivered: false,
                claimId,
                pedidoEntregaId,
                cantidadCards: premio.cantidad_cards,
                error:
                    "Se creó el pedido, pero no pudo vincularse al reclamo",
            };
        }

        return {
            ok: true,
            alreadyDelivered: false,
            claimId,
            pedidoEntregaId,
            cantidadCards: premio.cantidad_cards,
        };
    } catch (error: unknown) {
        return {
            ok: false,
            alreadyDelivered: false,
            claimId: null,
            pedidoEntregaId: null,
            cantidadCards: 0,
            error:
                error instanceof Error
                    ? error.message
                    : "Error interno entregando tarjetas digitales",
        };
    }
}