import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeEmail(value: unknown): string {
    return String(value ?? "")
        .trim()
        .toLowerCase();
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => null);

        const cardId = String(
            body?.cardId ?? ""
        ).trim();

        const ownerEmail = normalizeEmail(
            body?.email
        );

        if (!cardId) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Falta cardId",
                },
                { status: 400 }
            );
        }

        if (!ownerEmail) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Falta correo del propietario",
                },
                { status: 400 }
            );
        }

        /*
         * 1. Leer tarjeta y número asignado.
         */
        const { data: card, error: cardError } =
            await supabaseAdmin
                .from("baruk_cards")
                .select(`
                    id,
                    pedido_id,
                    owner_email,
                    owner_type,
                    estado,
                    revealed,
                    revealed_at,
                    extra_type,
                    sphere_id,
                    prize_id,
                    numero_asignado_id,
                    numeros_asignados!inner(
                        numero
                    )
                `)
                .eq("id", cardId)
                .single();

        if (cardError || !card) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Tarjeta no encontrada",
                },
                { status: 404 }
            );
        }

        /*
         * 2. Validar propietario.
         *
         * Más adelante esta validación se sustituirá
         * por sesión/magic link.
         */
        const storedEmail = normalizeEmail(
            card.owner_email
        );

        if (
            !storedEmail ||
            storedEmail !== ownerEmail
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "No tienes autorización para revelar esta tarjeta",
                },
                { status: 403 }
            );
        }

        if (card.estado === "cancelled") {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Esta tarjeta se encuentra cancelada",
                },
                { status: 409 }
            );
        }

        /*
         * 3. Obtener número.
         */
        const relation =
            card.numeros_asignados as
            | { numero: number }
            | { numero: number }[]
            | null;

        const numero = Array.isArray(relation)
            ? Number(relation[0]?.numero)
            : Number(relation?.numero);

        if (!Number.isFinite(numero)) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "No se pudo obtener el número de participación",
                },
                { status: 500 }
            );
        }

        /*
         * 4. Leer esfera o premio, si existe.
         */
        let sphere = null;
        let prize = null;

        if (
            card.extra_type === "sphere" &&
            card.sphere_id
        ) {
            const { data } =
                await supabaseAdmin
                    .from("spheres")
                    .select(`
                        id,
                        numero,
                        nombre,
                        descripcion,
                        imagen_url
                    `)
                    .eq("id", card.sphere_id)
                    .single();

            sphere = data ?? null;
        }

        if (
            card.extra_type === "prize" &&
            card.prize_id
        ) {
            const { data } =
                await supabaseAdmin
                    .from("card_prizes")
                    .select(`
                        id,
                        nombre,
                        descripcion,
                        tipo,
                        imagen_url,
                        cantidad_cards,
                        valor_referencial
                    `)
                    .eq("id", card.prize_id)
                    .single();

            prize = data ?? null;
        }

        /*
         * 5. Si ya fue revelada, devolvemos exactamente
         * el mismo resultado.
         */
        if (card.revealed) {
            return NextResponse.json({
                ok: true,
                alreadyRevealed: true,
                card: {
                    id: card.id,
                    numero,
                    extraType:
                        card.extra_type,
                    sphere,
                    prize,
                    revealedAt:
                        card.revealed_at,
                },
            });
        }

        /*
         * 6. Registrar revelado.
         */
        const revealedAt =
            new Date().toISOString();

        const { error: revealError } =
            await supabaseAdmin
                .from("baruk_cards")
                .update({
                    revealed: true,
                    revealed_at: revealedAt,
                    estado: "revealed",
                    updated_at:
                        new Date().toISOString(),
                })
                .eq("id", card.id)
                .eq("revealed", false);

        if (revealError) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "No se pudo revelar la tarjeta",
                },
                { status: 500 }
            );
        }

        return NextResponse.json({
            ok: true,
            alreadyRevealed: false,
            card: {
                id: card.id,
                numero,
                extraType:
                    card.extra_type,
                sphere,
                prize,
                revealedAt,
            },
        });
    } catch (error: unknown) {
        console.error(
            "cards/reveal error:",
            error
        );

        return NextResponse.json(
            {
                ok: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Error interno",
            },
            { status: 500 }
        );
    }
}