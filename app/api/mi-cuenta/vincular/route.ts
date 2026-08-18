import {
    NextRequest,
    NextResponse,
} from "next/server";

import {
    supabaseAdmin,
} from "@/lib/supabaseAdmin";


export const runtime =
    "nodejs";

export const dynamic =
    "force-dynamic";


function normalizeEmail(
    value:
        | string
        | null
        | undefined
) {
    return String(
        value ??
        ""
    )
        .trim()
        .toLowerCase();
}


/* ============================================================
   POST
============================================================ */

export async function POST(
    req: NextRequest
) {

    try {

        /* =====================================================
           1. VALIDAR SESIÓN SUPABASE
        ===================================================== */

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
         * Nunca confiamos en un userId
         * enviado por el navegador.
         */

        const {
            data:
            userData,

            error:
            userError,
        } =
            await supabaseAdmin
                .auth
                .getUser(
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


        const email =
            normalizeEmail(
                user.email
            );


        if (!email) {

            return NextResponse.json(
                {
                    ok: false,

                    error:
                        "La cuenta no tiene un correo válido",
                },
                {
                    status: 400,
                }
            );
        }


        const now =
            new Date()
                .toISOString();


        /* =====================================================
           2. VINCULAR EXPERIENCE PASS
        ===================================================== */

        /*
         * Solo vinculamos tarjetas:
         *
         * - del mismo correo verificado;
         * - que todavía NO tienen owner_user_id.
         *
         * Nunca reasignamos una tarjeta que
         * ya pertenece a otro usuario.
         */

        const {
            data:
            cardsLinked,

            error:
            cardsError,
        } =
            await supabaseAdmin
                .from(
                    "baruk_cards"
                )
                .update({
                    owner_user_id:
                        user.id,

                    updated_at:
                        now,
                })
                .ilike(
                    "owner_email",
                    email
                )
                .is(
                    "owner_user_id",
                    null
                )
                .select(`
                    id,
                    gift_id,
                    owner_type,
                    estado
                `);


        if (
            cardsError
        ) {

            console.error(
                "Error vinculando cards:",
                cardsError
            );


            return NextResponse.json(
                {
                    ok: false,

                    error:
                        "No se pudieron vincular las Experience Pass",
                },
                {
                    status: 500,
                }
            );
        }


        /* =====================================================
           3. ACTIVAR TARJETAS RECIBIDAS COMO REGALO
        ===================================================== */

        /*
         * Cuando el destinatario entra mediante
         * Magic Link ya verificó el correo.
         *
         * Por eso:
         *
         * gift_pending
         *      ↓
         * claimed
         *
         * Todavía NO está revelada.
         */

        const {
            data:
            giftCardsClaimed,

            error:
            giftCardsError,
        } =
            await supabaseAdmin
                .from(
                    "baruk_cards"
                )
                .update({
                    estado:
                        "claimed",

                    updated_at:
                        now,
                })
                .eq(
                    "owner_user_id",
                    user.id
                )
                .eq(
                    "owner_type",
                    "gift_recipient"
                )
                .eq(
                    "estado",
                    "gift_pending"
                )
                .select(`
                    id,
                    gift_id
                `);


        if (
            giftCardsError
        ) {

            console.error(
                "Error reclamando tarjetas de regalo:",
                giftCardsError
            );


            return NextResponse.json(
                {
                    ok: false,

                    error:
                        "Las tarjetas fueron vinculadas, pero no se pudo completar la recepción del regalo",
                },
                {
                    status: 500,
                }
            );
        }


        /* =====================================================
           4. OBTENER TODAS LAS TARJETAS DEL USUARIO
        ===================================================== */

        /*
         * No utilizamos solamente cardsLinked.
         *
         * También puede haber tarjetas que ya
         * estaban vinculadas anteriormente.
         */

        const {
            data:
            ownedCardsData,

            error:
            ownedCardsError,
        } =
            await supabaseAdmin
                .from(
                    "baruk_cards"
                )
                .select(
                    "id"
                )
                .eq(
                    "owner_user_id",
                    user.id
                )
                .neq(
                    "estado",
                    "cancelled"
                );


        if (
            ownedCardsError
        ) {

            console.error(
                "Error leyendo cards vinculadas:",
                ownedCardsError
            );


            return NextResponse.json(
                {
                    ok: false,

                    error:
                        "La cuenta fue vinculada parcialmente, pero no se pudieron validar sus tarjetas",
                },
                {
                    status: 500,
                }
            );
        }


        const ownedCardIds =
            (
                ownedCardsData ??
                []
            )
                .map(
                    (
                        card
                    ) =>
                        String(
                            card.id
                        )
                )
                .filter(
                    Boolean
                );


        /* =====================================================
           5. VINCULAR F1 SPHERE INSTANCES
        ===================================================== */

        /*
         * Las esferas pueden haber sido asignadas
         * cuando la Experience Pass todavía no
         * tenía owner_user_id.
         *
         * Vinculamos SOLAMENTE las instancias
         * cuyo owner_user_id siga en NULL.
         *
         * Esto es fundamental:
         *
         * NO tocamos una esfera que ya fue
         * vendida o transferida a otro usuario.
         */

        let sphereInstancesLinked =
            0;


        if (
            ownedCardIds.length >
            0
        ) {

            /*
             * Procesamos por bloques para evitar
             * una consulta IN excesivamente grande
             * en cuentas con muchas tarjetas.
             */

            const CHUNK_SIZE =
                500;


            for (
                let index =
                    0;

                index <
                ownedCardIds.length;

                index +=
                CHUNK_SIZE
            ) {

                const chunk =
                    ownedCardIds.slice(
                        index,
                        index +
                        CHUNK_SIZE
                    );


                const {
                    data:
                    spheresLinked,

                    error:
                    spheresError,
                } =
                    await supabaseAdmin
                        .from(
                            "sphere_instances"
                        )
                        .update({
                            owner_user_id:
                                user.id,
                        })
                        .in(
                            "origin_card_id",
                            chunk
                        )
                        .is(
                            "owner_user_id",
                            null
                        )
                        .select(
                            "id"
                        );


                if (
                    spheresError
                ) {

                    console.error(
                        "Error vinculando sphere_instances:",
                        spheresError
                    );


                    return NextResponse.json(
                        {
                            ok: false,

                            error:
                                "Las tarjetas fueron vinculadas, pero hubo un problema al vincular tus F1 Spheres",
                        },
                        {
                            status: 500,
                        }
                    );
                }


                sphereInstancesLinked +=
                    spheresLinked
                        ?.length ??
                    0;
            }
        }


        /* =====================================================
           6. VINCULAR RECLAMOS DE PREMIOS INSTANTÁNEOS
        ===================================================== */

        const {
            data:
            claimsLinked,

            error:
            claimsError,
        } =
            await supabaseAdmin
                .from(
                    "prize_claims"
                )
                .update({
                    owner_user_id:
                        user.id,

                    updated_at:
                        now,
                })
                .ilike(
                    "owner_email",
                    email
                )
                .is(
                    "owner_user_id",
                    null
                )
                .select(
                    "id"
                );


        if (
            claimsError
        ) {

            console.error(
                "Error vinculando premios:",
                claimsError
            );


            return NextResponse.json(
                {
                    ok: false,

                    error:
                        "La cuenta fue vinculada parcialmente, pero hubo un problema con tus premios",
                },
                {
                    status: 500,
                }
            );
        }


        /* =====================================================
           7. VINCULAR REGALOS AL DESTINATARIO
        ===================================================== */

        /*
         * El correo del usuario autenticado
         * coincide con destinatario_correo.
         *
         * No reclamamos:
         *
         * - pending_payment
         * - cancelled
         *
         * porque aún no existe un regalo válido
         * para entregar.
         */

        const {
            data:
            giftCandidatesData,

            error:
            giftCandidatesError,
        } =
            await supabaseAdmin
                .from(
                    "baruk_gifts"
                )
                .select(`
                    id,
                    estado,
                    reclamado_at,
                    claimed_by
                `)
                .ilike(
                    "destinatario_correo",
                    email
                )
                .is(
                    "claimed_by",
                    null
                );


        if (
            giftCandidatesError
        ) {

            console.error(
                "Error consultando regalos:",
                giftCandidatesError
            );


            return NextResponse.json(
                {
                    ok: false,

                    error:
                        "La cuenta fue vinculada parcialmente, pero hubo un problema al consultar tus regalos",
                },
                {
                    status: 500,
                }
            );
        }


        const giftCandidates =
            (
                giftCandidatesData ??
                []
            ).filter(
                (
                    gift
                ) =>
                    gift.estado !==
                    "pending_payment" &&
                    gift.estado !==
                    "cancelled"
            );


        let giftsClaimed =
            0;


        for (
            const gift
            of giftCandidates
        ) {

            /*
             * Estados previos al reclamo:
             *
             * paid
             * sent
             * pending_verification
             *
             * pasan a claimed.
             *
             * Si el regalo ya está en:
             *
             * partially_revealed
             * fully_revealed
             *
             * conservamos ese estado y solamente
             * vinculamos claimed_by.
             */

            const nextState =
                gift.estado ===
                    "paid" ||
                    gift.estado ===
                    "sent" ||
                    gift.estado ===
                    "pending_verification"

                    ? "claimed"

                    : gift.estado;


            const {
                data:
                claimedGift,

                error:
                claimedGiftError,
            } =
                await supabaseAdmin
                    .from(
                        "baruk_gifts"
                    )
                    .update({
                        claimed_by:
                            user.id,

                        reclamado_at:
                            gift.reclamado_at ??
                            now,

                        estado:
                            nextState,
                    })
                    .eq(
                        "id",
                        gift.id
                    )
                    .is(
                        "claimed_by",
                        null
                    )
                    .select(
                        "id"
                    )
                    .maybeSingle();


            if (
                claimedGiftError
            ) {

                console.error(
                    `Error reclamando regalo ${gift.id}:`,
                    claimedGiftError
                );


                return NextResponse.json(
                    {
                        ok: false,

                        error:
                            "La cuenta fue vinculada parcialmente, pero no se pudo completar uno de tus regalos",
                    },
                    {
                        status: 500,
                    }
                );
            }


            if (
                claimedGift
            ) {
                giftsClaimed +=
                    1;
            }
        }


        /* =====================================================
           8. VINCULAR PEDIDOS DEL COMPRADOR
        ===================================================== */

        /*
         * Esto es independiente del regalo.
         *
         * pedido
         *    → comprador
         *
         * baruk_cards del regalo
         *    → destinatario
         */

        const {
            data:
            ordersLinked,

            error:
            ordersError,
        } =
            await supabaseAdmin
                .from(
                    "pedidos"
                )
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
                .select(
                    "id"
                );


        if (
            ordersError
        ) {

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


        /* =====================================================
           9. CONTAR TARJETAS DEL USUARIO
        ===================================================== */

        const {
            count:
            totalCards,

            error:
            countError,
        } =
            await supabaseAdmin
                .from(
                    "baruk_cards"
                )
                .select(
                    "id",
                    {
                        count:
                            "exact",

                        head:
                            true,
                    }
                )
                .eq(
                    "owner_user_id",
                    user.id
                )
                .neq(
                    "estado",
                    "cancelled"
                );


        if (
            countError
        ) {

            console.error(
                "Error contando cards:",
                countError
            );
        }


        /* =====================================================
           10. RESPUESTA
        ===================================================== */

        return NextResponse.json({

            ok: true,


            user: {
                id:
                    user.id,

                email,
            },


            linked: {

                cards:
                    cardsLinked
                        ?.length ??
                    0,

                giftCards:
                    giftCardsClaimed
                        ?.length ??
                    0,

                sphereInstances:
                    sphereInstancesLinked,

                claims:
                    claimsLinked
                        ?.length ??
                    0,

                gifts:
                    giftsClaimed,

                orders:
                    ordersLinked
                        ?.length ??
                    0,
            },


            totalCards:
                totalCards ??
                0,
        });


    } catch (
    error:
        unknown
    ) {

        console.error(
            "mi-cuenta/vincular error:",
            error
        );


        return NextResponse.json(
            {
                ok: false,

                error:
                    error instanceof
                        Error
                        ? error.message
                        : "Error interno",
            },
            {
                status: 500,
            }
        );
    }
}