import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    try {
        /* =====================================================
           1. SORTEO ACTIVO
        ===================================================== */

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
                    error:
                        "No se pudo obtener la actividad.",
                },
                {
                    status: 500,
                }
            );
        }

        if (!sorteo) {
            return NextResponse.json(
                {
                    ok: true,
                    premios: [],

                    /*
                     * Se conserva temporalmente
                     * por compatibilidad con
                     * el componente actual.
                     *
                     * Ya no enviamos datos
                     * personales de ganadores.
                     */
                    ganadores: [],
                },
                {
                    headers: {
                        "Cache-Control":
                            "no-store, max-age=0",
                    },
                }
            );
        }

        /* =====================================================
           2. PREMIOS
        ===================================================== */

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
            .eq(
                "sorteo_id",
                sorteo.id
            )
            .eq(
                "activo",
                true
            )
            .order(
                "peso_asignacion",
                {
                    ascending: false,
                }
            );

        if (premiosError) {
            console.error(
                "Error obteniendo premios:",
                premiosError
            );

            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "No se pudieron obtener los premios.",
                },
                {
                    status: 500,
                }
            );
        }

        /* =====================================================
           3. CARDS CON PREMIO YA REVELADAS

           Solo contamos cantidades.
           No consultamos nombres, correos,
           teléfonos ni datos de propietarios.
        ===================================================== */

        const {
            data: cardsReveladas,
            error: cardsError,
        } = await supabaseAdmin
            .from("baruk_cards")
            .select(`
                id,
                prize_id
            `)
            .eq(
                "sorteo_id",
                sorteo.id
            )
            .eq(
                "extra_type",
                "prize"
            )
            .eq(
                "revealed",
                true
            )
            .not(
                "prize_id",
                "is",
                null
            );

        if (cardsError) {
            console.error(
                "Error obteniendo cards reveladas:",
                cardsError
            );

            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "No se pudo obtener la actividad reciente.",
                },
                {
                    status: 500,
                }
            );
        }

        /* =====================================================
           4. CONTAR REVELADOS POR PREMIO
        ===================================================== */

        const reveladosPorPremio =
            new Map<string, number>();

        for (
            const card of
            cardsReveladas ?? []
        ) {
            if (!card.prize_id) {
                continue;
            }

            const actual =
                reveladosPorPremio.get(
                    card.prize_id
                ) ?? 0;

            reveladosPorPremio.set(
                card.prize_id,
                actual + 1
            );
        }

        /* =====================================================
           5. DATOS PÚBLICOS
        ===================================================== */

        const premiosPublicos =
            (premios ?? []).map(
                (premio) => {
                    const stockTotal =
                        Math.max(
                            0,
                            Number(
                                premio.stock_total ??
                                0
                            )
                        );

                    const stockAsignado =
                        Math.max(
                            0,
                            Number(
                                premio.stock_asignado ??
                                0
                            )
                        );

                    const revelados =
                        reveladosPorPremio.get(
                            premio.id
                        ) ?? 0;

                    const agotado =
                        stockTotal > 0 &&
                        stockAsignado >=
                        stockTotal;

                    return {
                        id:
                            premio.id,

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

                        /*
                         * NUEVOS DATOS PÚBLICOS
                         *
                         * Ejemplo:
                         * stockTotal = 10
                         * stockAsignado = 3
                         *
                         * Home:
                         * "3 de 10 ganados"
                         */
                        stockTotal,

                        stockAsignado,

                        /*
                         * Se mantiene por
                         * compatibilidad.
                         */
                        revelados,

                        agotado,
                    };
                }
            );

        /* =====================================================
           RESPUESTA
        ===================================================== */

        return NextResponse.json(
            {
                ok: true,

                premios:
                    premiosPublicos,

                /*
                 * Ya no publicamos
                 * identidades de ganadores.
                 *
                 * Se conserva [] para no
                 * romper inmediatamente
                 * componentes antiguos.
                 */
                ganadores: [],
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
                error:
                    "Error interno.",
            },
            {
                status: 500,
            }
        );
    }
}