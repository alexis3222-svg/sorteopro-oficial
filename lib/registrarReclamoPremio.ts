import { supabaseAdmin } from "@/lib/supabaseAdmin";

type RegistrarReclamoResultado =
    | {
        ok: true;
        claimId: string;
        alreadyExists: boolean;
    }
    | {
        ok: false;
        error: string;
    };

interface CardData {
    id: string;
    prize_id: string | null;

    owner_type: "buyer" | "gift_recipient";
    owner_user_id: string | null;
    owner_email: string;
    owner_phone: string | null;

    pedido_id: number;
    gift_id: string | null;
}

export async function registrarReclamoPremio(
    cardId: string
): Promise<RegistrarReclamoResultado> {
    try {
        /*
         * 1. Consultar la tarjeta ganadora.
         */
        const { data: cardData, error: cardError } =
            await supabaseAdmin
                .from("baruk_cards")
                .select(`
                    id,
                    prize_id,
                    owner_type,
                    owner_user_id,
                    owner_email,
                    owner_phone,
                    pedido_id,
                    gift_id
                `)
                .eq("id", cardId)
                .eq("extra_type", "prize")
                .single();

        if (cardError || !cardData) {
            return {
                ok: false,
                error: "No se encontró la tarjeta premiada",
            };
        }

        const card = cardData as CardData;

        if (!card.prize_id) {
            return {
                ok: false,
                error: "La tarjeta no tiene un premio asociado",
            };
        }

        /*
         * 2. Idempotencia.
         *
         * prize_claims.card_id es UNIQUE.
         */
        const {
            data: existingClaim,
            error: existingClaimError,
        } = await supabaseAdmin
            .from("prize_claims")
            .select("id")
            .eq("card_id", card.id)
            .maybeSingle();

        if (existingClaimError) {
            return {
                ok: false,
                error: existingClaimError.message,
            };
        }

        if (existingClaim) {
            return {
                ok: true,
                claimId: existingClaim.id,
                alreadyExists: true,
            };
        }

        /*
         * 3. Determinar el nombre del propietario.
         *
         * Compra propia:
         * usamos los datos del pedido.
         *
         * Regalo:
         * usamos al destinatario del regalo.
         */
        let ownerName: string | null = null;

        if (
            card.owner_type === "gift_recipient" &&
            card.gift_id
        ) {
            const { data: gift } = await supabaseAdmin
                .from("baruk_gifts")
                .select("destinatario_nombre")
                .eq("id", card.gift_id)
                .maybeSingle();

            ownerName =
                gift?.destinatario_nombre ?? null;
        }

        if (!ownerName) {
            const { data: pedido } =
                await supabaseAdmin
                    .from("pedidos")
                    .select("nombre")
                    .eq("id", card.pedido_id)
                    .maybeSingle();

            ownerName =
                pedido?.nombre ??
                "Ganador Baruk593";
        }

        /*
         * 4. Crear reclamo.
         */
        const {
            data: claim,
            error: claimError,
        } = await supabaseAdmin
            .from("prize_claims")
            .insert({
                card_id: card.id,
                prize_id: card.prize_id,

                owner_user_id:
                    card.owner_user_id,

                owner_name: ownerName,

                owner_email:
                    card.owner_email,

                owner_phone:
                    card.owner_phone,

                estado: "pending_claim",

                entrega_automatica: false,
            })
            .select("id")
            .single();

        if (claimError || !claim) {
            /*
             * Si otro proceso creó el reclamo
             * simultáneamente, intentamos recuperarlo.
             */
            const { data: recovered } =
                await supabaseAdmin
                    .from("prize_claims")
                    .select("id")
                    .eq("card_id", card.id)
                    .maybeSingle();

            if (recovered) {
                return {
                    ok: true,
                    claimId: recovered.id,
                    alreadyExists: true,
                };
            }

            return {
                ok: false,
                error:
                    claimError?.message ??
                    "No se pudo registrar el premio",
            };
        }

        return {
            ok: true,
            claimId: claim.id,
            alreadyExists: false,
        };
    } catch (error: unknown) {
        return {
            ok: false,
            error:
                error instanceof Error
                    ? error.message
                    : "Error interno registrando el premio",
        };
    }
}