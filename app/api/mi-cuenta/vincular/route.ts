import {
    NextRequest,
    NextResponse,
} from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeEmail(
    value: string | null | undefined
) {
    return String(value ?? "")
        .trim()
        .toLowerCase();
}

export async function POST(
    req: NextRequest
) {
    try {
        /*
         * 1. Recibir token de la sesión Supabase.
         */
        const authorization =
            req.headers.get("authorization");

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
                { status: 401 }
            );
        }

        const accessToken =
            authorization
                .replace("Bearer ", "")
                .trim();

        if (!accessToken) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Token de sesión inválido",
                },
                { status: 401 }
            );
        }

        /*
         * 2. Validar el token directamente con Supabase.
         *
         * Nunca confiamos en un userId enviado por
         * el navegador.
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
                { status: 401 }
            );
        }

        const user =
            userData.user;

        const email =
            normalizeEmail(user.email);

        if (!email) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "La cuenta no tiene un correo válido",
                },
                { status: 400 }
            );
        }

        /*
         * 3. Vincular Baruk Cards históricas.
         *
         * Solo vinculamos tarjetas que:
         * - tienen ese mismo correo;
         * - todavía no tienen propietario Auth.
         *
         * Una tarjeta ya vinculada a otro UUID
         * NO se reasigna.
         */
        const {
            data: cardsLinked,
            error: cardsError,
        } =
            await supabaseAdmin
                .from("baruk_cards")
                .update({
                    owner_user_id:
                        user.id,
                    updated_at:
                        new Date().toISOString(),
                })
                .ilike(
                    "owner_email",
                    email
                )
                .is(
                    "owner_user_id",
                    null
                )
                .select("id");

        if (cardsError) {
            console.error(
                "Error vinculando cards:",
                cardsError
            );

            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "No se pudieron vincular las Baruk Cards",
                },
                { status: 500 }
            );
        }

        /*
         * 4. Vincular reclamos de premios.
         */
        const {
            data: claimsLinked,
            error: claimsError,
        } =
            await supabaseAdmin
                .from("prize_claims")
                .update({
                    owner_user_id:
                        user.id,
                    updated_at:
                        new Date().toISOString(),
                })
                .ilike(
                    "owner_email",
                    email
                )
                .is(
                    "owner_user_id",
                    null
                )
                .select("id");

        if (claimsError) {
            console.error(
                "Error vinculando premios:",
                claimsError
            );

            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Las tarjetas fueron vinculadas, pero hubo un problema con los premios",
                },
                { status: 500 }
            );
        }

        /*
         * =========================================================
         * VINCULAR PEDIDOS HISTÓRICOS DEL COMPRADOR
         * =========================================================
         *
         * El pedido pertenece al comprador cuyo correo
         * coincide con el correo verificado en Supabase Auth.
         *
         * Esto NO cambia el propietario de las Baruk Cards.
         * En una compra tipo regalo:
         *
         * pedido          -> comprador
         * baruk_cards     -> destinatario
         */

        const {
            data: ordersLinked,
            error: ordersError,
        } =
            await supabaseAdmin
                .from("pedidos")
                .update({
                    buyer_user_id:
                        user.id,
                })
                .ilike(
                    "correo",
                    email
                )
                .is(
                    "buyer_user_id",
                    null
                )
                .select("id");

        if (ordersError) {
            console.error(
                "Error vinculando pedidos:",
                ordersError
            );

            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "La cuenta fue vinculada parcialmente, pero hubo un problema con tus compras",
                },
                {
                    status: 500,
                }
            );
        }

        /*
         * 5. Contar todas las tarjetas que ahora
         * pertenecen a este usuario.
         */
        const {
            count: totalCards,
            error: countError,
        } =
            await supabaseAdmin
                .from("baruk_cards")
                .select(
                    "id",
                    {
                        count: "exact",
                        head: true,
                    }
                )
                .eq(
                    "owner_user_id",
                    user.id
                );

        if (countError) {
            console.error(
                "Error contando cards:",
                countError
            );
        }

        return NextResponse.json({
            ok: true,

            user: {
                id: user.id,
                email,
            },

            linked: {
                cards:
                    cardsLinked?.length ??
                    0,

                claims:
                    claimsLinked?.length ??
                    0,

                orders:
                    ordersLinked?.length ??
                    0,
            },

            totalCards:
                totalCards ?? 0,
        });
    } catch (error: unknown) {
        console.error(
            "mi-cuenta/vincular error:",
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