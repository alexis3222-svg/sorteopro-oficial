// app/api/mi-compra/route.ts

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


const PEDIDO_SELECT = `
    id,
    nombre,
    telefono,
    correo,
    cantidad_numeros,
    precio_unitario,
    total,
    metodo_pago,
    estado,
    created_at,
    actividad_numero,
    sorteo_id,
    payphone_client_transaction_id,
    tipo_compra,
    cards_processing_status
`;


/* ============================================================
   NORMALIZAR CORREO
============================================================ */

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
   OBTENER USUARIO AUTENTICADO

   Se usa únicamente cuando consultamos por pedido_id
   desde "Mi cuenta > Mis compras".

   El flujo antiguo por tx de PayPhone se conserva.
============================================================ */

async function getAuthenticatedUser(
    req: NextRequest
) {

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
        return null;
    }


    const accessToken =
        authorization
            .replace(
                "Bearer ",
                ""
            )
            .trim();


    if (
        !accessToken
    ) {
        return null;
    }


    const {
        data,
        error,
    } =
        await supabaseAdmin
            .auth
            .getUser(
                accessToken
            );


    if (
        error ||
        !data.user
    ) {
        return null;
    }


    return data.user;
}


/* ============================================================
   GET
============================================================ */

export async function GET(
    req: NextRequest
) {

    try {

        const {
            searchParams,
        } =
            new URL(
                req.url
            );


        const pedidoParam =
            String(
                searchParams.get(
                    "pedido"
                ) ??
                ""
            )
                .trim();


        const tx =
            String(
                searchParams.get(
                    "tx"
                ) ??
                ""
            )
                .trim();


        if (
            !pedidoParam &&
            !tx
        ) {

            return NextResponse.json(
                {
                    ok:
                        false,

                    error:
                        "Falta el identificador de compra",
                },
                {
                    status:
                        400,
                }
            );
        }


        let pedido:
            any =
            null;


        /* =====================================================
           1A. CONSULTA DESDE MI CUENTA POR pedido_id

           A diferencia del tx de PayPhone, el ID de pedido es
           secuencial y no debe quedar expuesto sin validar
           que pertenezca al usuario autenticado.
        ===================================================== */

        if (
            pedidoParam
        ) {

            const pedidoId =
                Number(
                    pedidoParam
                );


            if (
                !Number.isInteger(
                    pedidoId
                ) ||
                pedidoId <=
                0
            ) {

                return NextResponse.json(
                    {
                        ok:
                            false,

                        error:
                            "El número de pedido no es válido",
                    },
                    {
                        status:
                            400,
                    }
                );
            }


            const user =
                await getAuthenticatedUser(
                    req
                );


            if (
                !user
            ) {

                return NextResponse.json(
                    {
                        ok:
                            false,

                        error:
                            "Debes iniciar sesión para consultar este pedido",
                    },
                    {
                        status:
                            401,
                    }
                );
            }


            const {
                data,
                error,
            } =
                await supabaseAdmin
                    .from(
                        "pedidos"
                    )
                    .select(
                        PEDIDO_SELECT
                    )
                    .eq(
                        "id",
                        pedidoId
                    )
                    .maybeSingle();


            if (
                error
            ) {

                console.error(
                    "mi-compra pedido por id error:",
                    error
                );


                return NextResponse.json(
                    {
                        ok:
                            false,

                        error:
                            "No se pudo consultar la compra",
                    },
                    {
                        status:
                            500,
                    }
                );
            }


            if (
                !data
            ) {

                return NextResponse.json(
                    {
                        ok:
                            false,

                        error:
                            "No se encontró este pedido",
                    },
                    {
                        status:
                            404,
                    }
                );
            }


            const pedidoEmail =
                normalizeEmail(
                    data.correo
                );

            const userEmail =
                normalizeEmail(
                    user.email
                );


            /*
             * Actualmente Mi Cuenta relaciona las compras propias
             * con el correo de la cuenta.
             *
             * Esto evita que alguien pueda cambiar ?pedido=31 por
             * otro número y consultar compras ajenas.
             */
            if (
                !pedidoEmail ||
                !userEmail ||
                pedidoEmail !==
                userEmail
            ) {

                return NextResponse.json(
                    {
                        ok:
                            false,

                        error:
                            "Este pedido no pertenece a tu cuenta",
                    },
                    {
                        status:
                            403,
                    }
                );
            }


            pedido =
                data;
        }


        /* =====================================================
           1B. FLUJO EXISTENTE PAYPHONE POR tx

           NO se modifica el comportamiento actual de PayPhone.
        ===================================================== */

        if (
            !pedido &&
            tx
        ) {

            const {
                data,
                error,
            } =
                await supabaseAdmin
                    .from(
                        "pedidos"
                    )
                    .select(
                        PEDIDO_SELECT
                    )
                    .eq(
                        "payphone_client_transaction_id",
                        tx
                    )
                    .maybeSingle();


            if (
                error
            ) {

                console.error(
                    "mi-compra pedido por tx error:",
                    error
                );


                return NextResponse.json(
                    {
                        ok:
                            false,

                        error:
                            "No se pudo consultar la compra",
                    },
                    {
                        status:
                            500,
                    }
                );
            }


            pedido =
                data;
        }


        if (
            !pedido
        ) {

            return NextResponse.json(
                {
                    ok:
                        false,

                    error:
                        "No se encontró una compra para este identificador",
                },
                {
                    status:
                        404,
                }
            );
        }


        /* =====================================================
           2. CONSULTAR TARJETAS DEL PEDIDO

           No enviamos resultados ocultos antes de revelar:
           - numero
           - extra_type
           - sphere_id
           - prize_id
        ===================================================== */

        const {
            data:
            cards,

            error:
            cardsError,
        } =
            await supabaseAdmin
                .from(
                    "baruk_cards"
                )
                .select(`
                    id,
                    revealed,
                    revealed_at,
                    estado,
                    created_at
                `)
                .eq(
                    "pedido_id",
                    pedido.id
                )
                .order(
                    "created_at",
                    {
                        ascending:
                            true,
                    }
                );


        if (
            cardsError
        ) {

            console.error(
                "mi-compra cards error:",
                cardsError
            );


            return NextResponse.json(
                {
                    ok:
                        false,

                    error:
                        "No se pudieron consultar las Tarjetas de la Suerte",
                },
                {
                    status:
                        500,
                }
            );
        }


        /* =====================================================
           3. RESPUESTA
        ===================================================== */

        return NextResponse.json({

            ok:
                true,

            pedido,

            cards:
                cards ??
                [],
        });


    } catch (
    error:
        unknown
    ) {

        console.error(
            "api/mi-compra error:",
            error
        );


        return NextResponse.json(
            {
                ok:
                    false,

                error:
                    error instanceof
                        Error

                        ? error.message

                        : "Error interno al consultar la compra",
            },
            {
                status:
                    500,
            }
        );
    }
}
