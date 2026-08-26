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


/* ============================================================
   TIPOS
============================================================ */

type RouteContext = {
    params:
    Promise<{
        token: string;
    }>;
};


type AuthenticatedUser = {
    id: string;
    email: string;
};


/* ============================================================
   HELPERS
============================================================ */

function normalizeToken(
    value:
        | string
        | null
        | undefined
): string {

    return String(
        value ?? ""
    )
        .trim();
}


function normalizeEmail(
    value:
        | string
        | null
        | undefined
): string {

    return String(
        value ?? ""
    )
        .trim()
        .toLowerCase();
}


async function getAuthenticatedUser(
    req: NextRequest
): Promise<AuthenticatedUser | null> {

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


    if (!accessToken) {
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


    const email =
        normalizeEmail(
            data.user.email
        );


    if (!email) {
        return null;
    }


    return {
        id:
            data.user.id,

        email,
    };
}


function getFriendlyClaimError(
    rawMessage: unknown
) {

    const message =
        String(
            rawMessage ?? ""
        );


    if (
        message.includes(
            "GIFT_NOT_FOUND"
        )
    ) {
        return {
            status: 404,
            code:
                "GIFT_NOT_FOUND",
            error:
                "No encontramos este regalo.",
        };
    }


    if (
        message.includes(
            "GIFT_CANCELLED"
        )
    ) {
        return {
            status: 410,
            code:
                "GIFT_CANCELLED",
            error:
                "Este regalo fue cancelado y ya no está disponible.",
        };
    }


    if (
        message.includes(
            "GIFT_NOT_AVAILABLE"
        )
    ) {
        return {
            status: 409,
            code:
                "GIFT_NOT_AVAILABLE",
            error:
                "Este regalo todavía no está disponible para reclamar.",
        };
    }


    if (
        message.includes(
            "GIFT_ALREADY_CLAIMED"
        )
    ) {
        return {
            status: 409,
            code:
                "GIFT_ALREADY_CLAIMED",
            error:
                "Este regalo ya fue reclamado por otra cuenta.",
        };
    }


    if (
        message.includes(
            "GIFT_CARD_OWNER_CONFLICT"
        ) ||
        message.includes(
            "GIFT_SPHERE_OWNER_CONFLICT"
        )
    ) {
        return {
            status: 409,
            code:
                "GIFT_OWNER_CONFLICT",
            error:
                "No se pudo vincular el regalo porque existe un conflicto de propiedad.",
        };
    }


    if (
        message.includes(
            "INVALID_GIFT_TOKEN"
        )
    ) {
        return {
            status: 400,
            code:
                "INVALID_GIFT_TOKEN",
            error:
                "El enlace del regalo no es válido.",
        };
    }


    if (
        message.includes(
            "INVALID_USER"
        ) ||
        message.includes(
            "INVALID_USER_EMAIL"
        )
    ) {
        return {
            status: 401,
            code:
                "INVALID_USER",
            error:
                "Tu sesión no es válida. Inicia sesión nuevamente.",
        };
    }


    return {
        status: 500,
        code:
            "GIFT_CLAIM_ERROR",
        error:
            "No se pudo reclamar el regalo. Intenta nuevamente.",
    };
}


/* ============================================================
   GET
   INFORMACIÓN PÚBLICA Y SEGURA DEL REGALO

   IMPORTANTE:
   - No devuelve números asignados.
   - No devuelve premios.
   - No devuelve esferas.
   - No devuelve correo ni teléfono del destinatario.
============================================================ */

export async function GET(
    _req: NextRequest,
    context: RouteContext
) {

    try {

        const {
            token:
            rawToken,
        } =
            await context.params;


        const token =
            normalizeToken(
                rawToken
            );


        if (!token) {

            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "El enlace del regalo no es válido.",
                },
                {
                    status: 400,
                }
            );
        }


        const {
            data:
            gift,
            error:
            giftError,
        } =
            await supabaseAdmin
                .from(
                    "baruk_gifts"
                )
                .select(`
                    id,
                    pedido_id,
                    estado,
                    comprador_nombre,
                    destinatario_nombre,
                    mensaje,
                    reclamado_at,
                    created_at
                `)
                .eq(
                    "token_reclamo",
                    token
                )
                .maybeSingle();


        if (
            giftError ||
            !gift
        ) {

            if (giftError) {
                console.error(
                    "Error consultando regalo:",
                    giftError
                );
            }


            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "No encontramos este regalo.",
                },
                {
                    status: 404,
                }
            );
        }


        const pedidoId =
            Number(
                gift.pedido_id
            );


        let cantidad =
            0;


        if (
            Number.isInteger(
                pedidoId
            ) &&
            pedidoId > 0
        ) {

            const {
                data:
                pedido,
                error:
                pedidoError,
            } =
                await supabaseAdmin
                    .from(
                        "pedidos"
                    )
                    .select(`
                        cantidad_numeros,
                        estado,
                        tipo_compra
                    `)
                    .eq(
                        "id",
                        pedidoId
                    )
                    .maybeSingle();


            if (pedidoError) {

                console.error(
                    "Error consultando pedido del regalo:",
                    pedidoError
                );

            } else if (
                pedido
            ) {

                cantidad =
                    Number(
                        pedido
                            .cantidad_numeros ??
                        0
                    );
            }
        }


        return NextResponse.json({
            ok: true,

            gift: {
                recipientName:
                    gift
                        .destinatario_nombre,

                buyerName:
                    gift
                        .comprador_nombre,

                message:
                    gift
                        .mensaje ??
                    null,

                quantity:
                    Number.isFinite(
                        cantidad
                    )
                        ? cantidad
                        : 0,

                status:
                    gift.estado,

                claimed:
                    gift.estado ===
                    "claimed",

                claimedAt:
                    gift
                        .reclamado_at ??
                    null,
            },
        });


    } catch (
    error:
        unknown
    ) {

        console.error(
            "GET /api/regalo/[token]:",
            error
        );


        return NextResponse.json(
            {
                ok: false,
                error:
                    "No se pudo consultar el regalo.",
            },
            {
                status: 500,
            }
        );
    }
}


/* ============================================================
   POST
   RECLAMAR REGALO

   Requiere sesión Supabase válida.
============================================================ */

export async function POST(
    req: NextRequest,
    context: RouteContext
) {

    try {

        const {
            token:
            rawToken,
        } =
            await context.params;


        const token =
            normalizeToken(
                rawToken
            );


        if (!token) {

            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "El enlace del regalo no es válido.",
                },
                {
                    status: 400,
                }
            );
        }


        const user =
            await getAuthenticatedUser(
                req
            );


        if (!user) {

            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Debes iniciar sesión para reclamar este regalo.",
                },
                {
                    status: 401,
                }
            );
        }


        const {
            data:
            claimData,
            error:
            claimError,
        } =
            await supabaseAdmin
                .rpc(
                    "claim_baruk_gift",
                    {
                        p_token:
                            token,

                        p_user_id:
                            user.id,

                        p_user_email:
                            user.email,
                    }
                );


        if (
            claimError
        ) {

            console.error(
                "Error reclamando regalo:",
                claimError
            );


            const friendly =
                getFriendlyClaimError(
                    claimError.message
                );


            return NextResponse.json(
                {
                    ok: false,
                    code:
                        friendly.code,
                    error:
                        friendly.error,
                },
                {
                    status:
                        friendly.status,
                }
            );
        }


        const result =
            (
                claimData &&
                typeof claimData ===
                "object"
            )
                ? claimData
                : {
                    ok: true,
                };


        return NextResponse.json({
            ok: true,

            gift: result,

            user: {
                id:
                    user.id,
                email:
                    user.email,
            },
        });


    } catch (
    error:
        unknown
    ) {

        console.error(
            "POST /api/regalo/[token]:",
            error
        );


        return NextResponse.json(
            {
                ok: false,
                error:
                    "No se pudo reclamar el regalo.",
            },
            {
                status: 500,
            }
        );
    }
}