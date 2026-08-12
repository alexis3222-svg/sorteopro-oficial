import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function nombrePublico(nombre: string | null | undefined) {
    if (!nombre) {
        return "Ganador Baruk593";
    }

    const partes = nombre
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (partes.length === 0) {
        return "Ganador Baruk593";
    }

    const primerNombre = partes[0];

    if (partes.length === 1) {
        return primerNombre;
    }

    const inicialApellido =
        partes[1]?.charAt(0).toUpperCase();

    return `${primerNombre} ${inicialApellido}.`;
}

export async function GET() {
    try {
        // =====================================================
        // 1. SORTEO ACTIVO
        // =====================================================

        const {
            data: sorteo,
            error: sorteoError,
        } = await supabaseAdmin
            .from("sorteos")
            .select("id")
            .eq("estado", "activo")
            .order("created_at", {
                ascending: false,
            })
            .limit(1)
            .maybeSingle();

        if (sorteoError) {
            console.error(
                "Error obteniendo sorteo:",
                sorteoError
            );

            return NextResponse.json(
                {
                    ok: false,
                    error: "No se pudo obtener la actividad.",
                },
                { status: 500 }
            );
        }

        if (!sorteo) {
            return NextResponse.json({
                ok: true,
                premios: [],
                ganadores: [],
            });
        }

        // =====================================================
        // 2. PREMIOS DE LA ACTIVIDAD
        // =====================================================

        const {
            data: premios,
            error: premiosError,
        } = await supabaseAdmin
            .from("card_prizes")
            .select(`
                id,
                nombre,
                descripcion,
                tipo,
                imagen_url,
                cantidad_cards,
                valor_referencial,
                stock_total,
                stock_asignado,
                instrucciones_reclamo,
                activo
            `)
            .eq("sorteo_id", sorteo.id)
            .eq("activo", true)
            .order("peso_asignacion", {
                ascending: false,
            });

        if (premiosError) {
            console.error(
                "Error obteniendo premios:",
                premiosError
            );

            return NextResponse.json(
                {
                    ok: false,
                    error: "No se pudieron obtener los premios.",
                },
                { status: 500 }
            );
        }

        // =====================================================
        // 3. CARDS CON PREMIO QUE YA FUERON REVELADAS
        //
        // IMPORTANTE:
        // No publicamos un ganador solo porque el premio
        // haya sido asignado internamente.
        //
        // Tiene que haber revelado realmente la Baruk Card.
        // =====================================================

        const {
            data: cardsReveladas,
            error: cardsError,
        } = await supabaseAdmin
            .from("baruk_cards")
            .select(`
                id,
                prize_id,
                revealed_at
            `)
            .eq("sorteo_id", sorteo.id)
            .eq("extra_type", "prize")
            .eq("revealed", true)
            .not("prize_id", "is", null)
            .not("revealed_at", "is", null)
            .order("revealed_at", {
                ascending: false,
            })
            .limit(30);

        if (cardsError) {
            console.error(
                "Error obteniendo cards reveladas:",
                cardsError
            );

            return NextResponse.json(
                {
                    ok: false,
                    error: "No se pudo obtener la actividad reciente.",
                },
                { status: 500 }
            );
        }

        const cards = cardsReveladas ?? [];

        // =====================================================
        // 4. BUSCAR LOS RECLAMOS DE ESAS CARDS
        // =====================================================

        let reclamos: Array<{
            card_id: string;
            prize_id: string;
            owner_name: string | null;
            estado: string;
            delivered_at: string | null;
            created_at: string;
        }> = [];

        if (cards.length > 0) {
            const cardIds =
                cards.map((card) => card.id);

            const {
                data: claimsData,
                error: claimsError,
            } = await supabaseAdmin
                .from("prize_claims")
                .select(`
                    card_id,
                    prize_id,
                    owner_name,
                    estado,
                    delivered_at,
                    created_at
                `)
                .in("card_id", cardIds);

            if (claimsError) {
                console.error(
                    "Error obteniendo reclamos:",
                    claimsError
                );
            } else {
                reclamos =
                    (claimsData ?? []) as typeof reclamos;
            }
        }

        // =====================================================
        // 5. ÍNDICES PARA RELACIONAR INFORMACIÓN
        // =====================================================

        const premioMap = new Map(
            (premios ?? []).map((premio) => [
                premio.id,
                premio,
            ])
        );

        const reclamoPorCard = new Map(
            reclamos.map((reclamo) => [
                reclamo.card_id,
                reclamo,
            ])
        );

        // =====================================================
        // 6. GANADORES PÚBLICOS
        //
        // NUNCA enviamos:
        // - email
        // - teléfono
        // - user id
        // =====================================================

        const ganadores = cards
            .map((card) => {
                if (!card.prize_id) {
                    return null;
                }

                const premio =
                    premioMap.get(card.prize_id);

                if (!premio) {
                    return null;
                }

                const reclamo =
                    reclamoPorCard.get(card.id);

                return {
                    premioId: premio.id,

                    premioNombre:
                        premio.nombre,

                    premioTipo:
                        premio.tipo,

                    imagenUrl:
                        premio.imagen_url,

                    ganador:
                        nombrePublico(
                            reclamo?.owner_name
                        ),

                    reveladoAt:
                        card.revealed_at,

                    entregado:
                        reclamo?.estado ===
                        "delivered",
                };
            })
            .filter(Boolean);

        // =====================================================
        // 7. CONTAR CUÁNTAS VECES SE HA REVELADO
        // CADA PREMIO
        // =====================================================

        const reveladosPorPremio =
            new Map<string, number>();

        for (const ganador of ganadores) {
            if (!ganador) continue;

            const actual =
                reveladosPorPremio.get(
                    ganador.premioId
                ) ?? 0;

            reveladosPorPremio.set(
                ganador.premioId,
                actual + 1
            );
        }

        // =====================================================
        // 8. DATOS PÚBLICOS DEL CATÁLOGO
        //
        // No enviamos cantidades de stock.
        // =====================================================

        const premiosPublicos =
            (premios ?? []).map((premio) => {
                const agotado =
                    Number(
                        premio.stock_asignado
                    ) >=
                    Number(
                        premio.stock_total
                    );

                const revelados =
                    reveladosPorPremio.get(
                        premio.id
                    ) ?? 0;

                return {
                    id: premio.id,

                    nombre:
                        premio.nombre,

                    descripcion:
                        premio.descripcion,

                    tipo:
                        premio.tipo,

                    imagenUrl:
                        premio.imagen_url,

                    cantidadCards:
                        premio.cantidad_cards,

                    valorReferencial:
                        premio.valor_referencial,

                    instrucciones:
                        premio.instrucciones_reclamo,

                    agotado,

                    revelados,
                };
            });

        return NextResponse.json(
            {
                ok: true,
                premios: premiosPublicos,
                ganadores,
            },
            {
                headers: {
                    "Cache-Control":
                        "no-store, max-age=0",
                },
            }
        );
    } catch (error) {
        console.error(
            "Error premios instantáneos:",
            error
        );

        return NextResponse.json(
            {
                ok: false,
                error: "Error interno.",
            },
            { status: 500 }
        );
    }
}