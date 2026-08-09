// app/api/mi-cuenta/cards/route.ts

import {
    NextRequest,
    NextResponse,
} from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
    req: NextRequest
) {
    try {
        /*
         * =====================================================
         * 1. LEER TOKEN DE AUTENTICACIÓN
         * =====================================================
         */

        const authorization =
            req.headers.get(
                "authorization"
            );

        if (
            !authorization ||
            !authorization.startsWith(
                "Bearer "
            )
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "No existe una sesión válida",
                },
                {
                    status: 401,
                }
            );
        }

        const accessToken =
            authorization
                .replace(
                    "Bearer ",
                    ""
                )
                .trim();

        if (!accessToken) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Token de sesión inválido",
                },
                {
                    status: 401,
                }
            );
        }

        /*
         * =====================================================
         * 2. VALIDAR USUARIO CON SUPABASE
         * =====================================================
         */

        const {
            data: userData,
            error: userError,
        } =
            await supabaseAdmin.auth.getUser(
                accessToken
            );

        if (
            userError ||
            !userData.user
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "La sesión no es válida o ha expirado",
                },
                {
                    status: 401,
                }
            );
        }

        const user =
            userData.user;

        /*
         * =====================================================
         * 3. CONSULTAR TARJETAS DEL PROPIETARIO
         * =====================================================
         *
         * IMPORTANTE:
         *
         * NO enviamos:
         * - extra_type
         * - sphere_id
         * - prize_id
         * - número de participación
         *
         * porque esos datos pertenecen al resultado oculto.
         */

        const {
            data: cards,
            error: cardsError,
        } =
            await supabaseAdmin
                .from("baruk_cards")
                .select(`
                    id,
                    pedido_id,
                    origin,
                    estado,
                    revealed,
                    revealed_at,
                    created_at
                `)
                .eq(
                    "owner_user_id",
                    user.id
                )
                .neq(
                    "estado",
                    "cancelled"
                )
                .order(
                    "created_at",
                    {
                        ascending: false,
                    }
                );

        if (cardsError) {
            console.error(
                "Error consultando Baruk Cards:",
                cardsError
            );

            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "No se pudieron consultar tus Baruk Cards",
                },
                {
                    status: 500,
                }
            );
        }

        /*
         * =====================================================
         * 4. RESUMEN
         * =====================================================
         */

        const safeCards =
            cards ?? [];

        const revealed =
            safeCards.filter(
                (card) =>
                    card.revealed ===
                    true
            ).length;

        const pending =
            safeCards.length -
            revealed;

        /*
         * =====================================================
         * 5. RESPUESTA
         * =====================================================
         */

        return NextResponse.json({
            ok: true,

            summary: {
                total:
                    safeCards.length,

                revealed,

                pending,
            },

            cards:
                safeCards,
        });
    } catch (
    error: unknown
    ) {
        console.error(
            "mi-cuenta/cards error:",
            error
        );

        return NextResponse.json(
            {
                ok: false,
                error:
                    error instanceof
                        Error
                        ? error.message
                        : "Error interno al consultar tus Baruk Cards",
            },
            {
                status: 500,
            }
        );
    }
}