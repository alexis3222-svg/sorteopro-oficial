// app/api/admin/regalos/route.ts

import {
    NextRequest,
    NextResponse,
} from "next/server";

import {
    cookies,
} from "next/headers";

import {
    supabaseAdmin,
} from "@/lib/supabaseAdmin";

import {
    ADMIN_COOKIE,
    verifyAdminSessionToken,
} from "@/lib/adminSession";


export const runtime =
    "nodejs";

export const dynamic =
    "force-dynamic";


type GiftRow = {
    id: string;
    pedido_id: number | null;
    comprador_nombre: string | null;
    destinatario_nombre: string | null;
    destinatario_correo: string | null;
    destinatario_telefono: string | null;
    mensaje: string | null;
    token_reclamo: string | null;
    estado: string | null;
    whatsapp_status: string | null;
    whatsapp_message_sid: string | null;
    whatsapp_error_code: string | null;
    whatsapp_error_message: string | null;
    whatsapp_status_updated_at: string | null;
    whatsapp_delivered_at: string | null;
    whatsapp_read_at: string | null;
    whatsapp_failed_at: string | null;
    enviado_at: string | null;
    reclamado_at: string | null;
    claimed_by: string | null;
    created_at: string | null;
    updated_at: string | null;
};

type PedidoRow = {
    id: number;
    cantidad_numeros: number | null;
    total: number | null;
    metodo_pago: string | null;
    estado: string | null;
};


async function isAuthorizedAdmin(
    req: NextRequest
): Promise<boolean> {

    const cookieStore =
        await cookies();

    const adminToken =
        cookieStore
            .get(
                ADMIN_COOKIE
            )
            ?.value;

    if (
        await verifyAdminSessionToken(
            adminToken
        )
    ) {
        return true;
    }

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
        return false;
    }

    const accessToken =
        authorization
            .replace(
                "Bearer ",
                ""
            )
            .trim();

    if (!accessToken) {
        return false;
    }

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
        return false;
    }

    const adminUserId =
        String(
            process.env
                .ADMIN_UUID ??
            process.env
                .SUPABASE_ADMIN_USER_ID ??
            ""
        )
            .trim();

    if (!adminUserId) {
        return false;
    }

    return (
        userData.user.id ===
        adminUserId
    );
}


function normalizeStatus(
    value: unknown
): string {

    return String(
        value ?? ""
    )
        .trim()
        .toLowerCase();
}


function getSiteUrl(): string {

    return (
        process.env
            .NEXT_PUBLIC_SITE_URL ??
        "https://www.baruk593.com"
    )
        .trim()
        .replace(
            /\/+$/,
            ""
        );
}


export async function GET(
    req: NextRequest
) {

    try {

        const authorized =
            await isAuthorizedAdmin(
                req
            );

        if (!authorized) {

            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "No existe una sesión administrativa válida.",
                },
                {
                    status: 401,
                }
            );
        }

        const requestedStatus =
            normalizeStatus(
                req.nextUrl
                    .searchParams
                    .get(
                        "status"
                    )
            );

        const limitParam =
            Number(
                req.nextUrl
                    .searchParams
                    .get(
                        "limit"
                    ) ??
                200
            );

        const limit =
            Number.isInteger(
                limitParam
            )
                ? Math.min(
                    Math.max(
                        limitParam,
                        1
                    ),
                    500
                )
                : 200;

        let query =
            supabaseAdmin
                .from(
                    "baruk_gifts"
                )
                .select(`
                    id,
                    pedido_id,
                    comprador_nombre,
                    destinatario_nombre,
                    destinatario_correo,
                    destinatario_telefono,
                    mensaje,
                    token_reclamo,
                    estado,
                    whatsapp_status,
                    whatsapp_message_sid,
                    whatsapp_error_code,
                    whatsapp_error_message,
                    whatsapp_status_updated_at,
                    whatsapp_delivered_at,
                    whatsapp_read_at,
                    whatsapp_failed_at,
                    enviado_at,
                    reclamado_at,
                    claimed_by,
                    created_at,
                    updated_at
                `)
                .order(
                    "created_at",
                    {
                        ascending:
                            false,
                    }
                )
                .limit(
                    limit
                );

        if (
            requestedStatus &&
            requestedStatus !==
            "all"
        ) {

            query =
                query.eq(
                    "whatsapp_status",
                    requestedStatus
                );
        }

        const {
            data:
            giftsData,

            error:
            giftsError,
        } =
            await query;

        if (giftsError) {

            console.error(
                "GET /api/admin/regalos gifts:",
                giftsError
            );

            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "No se pudieron consultar los regalos.",
                },
                {
                    status: 500,
                }
            );
        }

        const gifts =
            (
                giftsData ??
                []
            ) as GiftRow[];

        const pedidoIds =
            Array.from(
                new Set(
                    gifts
                        .map(
                            (
                                gift
                            ) =>
                                Number(
                                    gift
                                        .pedido_id ??
                                    0
                                )
                        )
                        .filter(
                            (
                                pedidoId
                            ) =>
                                Number.isInteger(
                                    pedidoId
                                ) &&
                                pedidoId >
                                0
                        )
                )
            );

        const pedidosById =
            new Map<
                number,
                PedidoRow
            >();

        if (
            pedidoIds.length >
            0
        ) {

            const {
                data:
                pedidosData,

                error:
                pedidosError,
            } =
                await supabaseAdmin
                    .from(
                        "pedidos"
                    )
                    .select(`
                        id,
                        cantidad_numeros,
                        total,
                        metodo_pago,
                        estado
                    `)
                    .in(
                        "id",
                        pedidoIds
                    );

            if (pedidosError) {

                console.error(
                    "GET /api/admin/regalos pedidos:",
                    pedidosError
                );

            } else {

                for (
                    const pedido of
                    (
                        pedidosData ??
                        []
                    ) as PedidoRow[]
                ) {

                    pedidosById.set(
                        Number(
                            pedido.id
                        ),
                        pedido
                    );
                }
            }
        }

        const siteUrl =
            getSiteUrl();

        const rows =
            gifts.map(
                (
                    gift
                ) => {

                    const pedidoId =
                        Number(
                            gift.pedido_id ??
                            0
                        );

                    const pedido =
                        pedidosById.get(
                            pedidoId
                        ) ??
                        null;

                    const token =
                        String(
                            gift.token_reclamo ??
                            ""
                        )
                            .trim();

                    return {

                        id:
                            gift.id,

                        pedidoId:
                            Number.isInteger(
                                pedidoId
                            ) &&
                                pedidoId >
                                0
                                ? pedidoId
                                : null,

                        buyerName:
                            gift.comprador_nombre ??
                            "",

                        recipientName:
                            gift.destinatario_nombre ??
                            "",

                        recipientEmail:
                            gift.destinatario_correo ??
                            null,

                        recipientPhone:
                            gift.destinatario_telefono ??
                            "",

                        message:
                            gift.mensaje ??
                            null,

                        giftStatus:
                            gift.estado ??
                            null,

                        claimed:
                            gift.estado ===
                            "claimed",

                        claimedAt:
                            gift.reclamado_at ??
                            null,

                        whatsappStatus:
                            gift.whatsapp_status ??
                            "pending",

                        whatsappMessageSid:
                            gift.whatsapp_message_sid ??
                            null,

                        whatsappErrorCode:
                            gift.whatsapp_error_code ??
                            null,

                        whatsappErrorMessage:
                            gift.whatsapp_error_message ??
                            null,

                        whatsappStatusUpdatedAt:
                            gift.whatsapp_status_updated_at ??
                            null,

                        sentAt:
                            gift.enviado_at ??
                            null,

                        deliveredAt:
                            gift.whatsapp_delivered_at ??
                            null,

                        readAt:
                            gift.whatsapp_read_at ??
                            null,

                        failedAt:
                            gift.whatsapp_failed_at ??
                            null,

                        createdAt:
                            gift.created_at ??
                            null,

                        quantity:
                            Number(
                                pedido
                                    ?.cantidad_numeros ??
                                0
                            ),

                        orderStatus:
                            pedido
                                ?.estado ??
                            null,

                        paymentMethod:
                            pedido
                                ?.metodo_pago ??
                            null,

                        total:
                            Number(
                                pedido
                                    ?.total ??
                                0
                            ),

                        claimUrl:
                            token
                                ? `${siteUrl}/regalo/${encodeURIComponent(
                                    token
                                )}`
                                : null,
                    };
                }
            );

        const summary = {

            total:
                rows.length,

            read:
                rows.filter(
                    (
                        row
                    ) =>
                        row.whatsappStatus ===
                        "read"
                ).length,

            delivered:
                rows.filter(
                    (
                        row
                    ) =>
                        row.whatsappStatus ===
                        "delivered"
                ).length,

            undelivered:
                rows.filter(
                    (
                        row
                    ) =>
                        row.whatsappStatus ===
                        "undelivered"
                ).length,

            failed:
                rows.filter(
                    (
                        row
                    ) =>
                        row.whatsappStatus ===
                        "failed"
                ).length,

            pendingClaim:
                rows.filter(
                    (
                        row
                    ) =>
                        !row.claimed &&
                        row.giftStatus ===
                        "paid"
                ).length,
        };

        return NextResponse.json({

            ok: true,

            rows,

            summary,
        });

    } catch (
    error:
        unknown
    ) {

        console.error(
            "GET /api/admin/regalos:",
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
