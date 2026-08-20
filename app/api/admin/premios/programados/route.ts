// app/api/admin/premios/programados/route.ts

import {
    NextRequest,
    NextResponse,
} from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";


/*
 * =========================================================
 * UTILIDADES
 * =========================================================
 */

function normalizeEmail(
    value: unknown
) {
    return String(value ?? "")
        .trim()
        .toLowerCase();
}


function normalizeText(
    value: unknown
) {
    const text =
        String(value ?? "")
            .trim();

    return text || null;
}


function getSorteoName(
    row: any
) {
    const directName =
        row?.nombre ??
        row?.titulo ??
        row?.name ??
        row?.campaign_name ??
        null;

    if (directName) {
        return String(
            directName
        );
    }

    if (
        row?.actividad_numero !=
        null
    ) {
        return `Actividad ${row.actividad_numero}`;
    }

    return `Actividad Baruk593`;
}


/*
 * =========================================================
 * VALIDAR ADMINISTRADOR
 * =========================================================
 */

async function getAdminUser(
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
        return {
            ok: false as const,
            status: 401,
            error:
                "No existe una sesión administrativa válida",
        };
    }


    const accessToken =
        authorization
            .replace(
                "Bearer ",
                ""
            )
            .trim();


    if (!accessToken) {
        return {
            ok: false as const,
            status: 401,
            error:
                "Token administrativo inválido",
        };
    }


    const {
        data: userData,
        error: userError,
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
        return {
            ok: false as const,
            status: 401,
            error:
                "La sesión administrativa ha expirado",
        };
    }


    const adminUserId =
        String(
            process.env.ADMIN_UUID ??
            process.env
                .SUPABASE_ADMIN_USER_ID ??
            ""
        ).trim();


    if (!adminUserId) {
        console.error(
            "Falta ADMIN_UUID / SUPABASE_ADMIN_USER_ID"
        );

        return {
            ok: false as const,
            status: 500,
            error:
                "No está configurado el administrador del sistema",
        };
    }


    if (
        userData.user.id !==
        adminUserId
    ) {
        return {
            ok: false as const,
            status: 403,
            error:
                "No tienes permisos de administrador",
        };
    }


    return {
        ok: true as const,

        user: {
            id:
                userData.user.id,

            email:
                normalizeEmail(
                    userData.user.email
                ),
        },
    };
}


/*
 * =========================================================
 * TRADUCIR ERRORES SQL
 * =========================================================
 */

function getFriendlyRpcError(
    errorMessage: unknown
) {
    const message =
        String(
            errorMessage ??
            ""
        );


    if (
        message.includes(
            "NUMBER_ALREADY_ASSIGNED"
        )
    ) {
        return "Ese número ya fue asignado a un comprador.";
    }

    if (
        message.includes(
            "EVENT_START_REQUIRED"
        )
    ) {
        return "Selecciona la fecha y hora de inicio del evento.";
    }


    if (
        message.includes(
            "EVENT_END_REQUIRED"
        )
    ) {
        return "Selecciona la fecha y hora de finalización del evento.";
    }


    if (
        message.includes(
            "INVALID_EVENT_WINDOW"
        )
    ) {
        return "La hora de finalización debe ser posterior a la hora de inicio.";
    }


    if (
        message.includes(
            "EVENT_ALREADY_FINISHED"
        )
    ) {
        return "No puedes programar un evento cuya fecha de finalización ya pasó.";
    }

    if (
        message.includes(
            "NUMBER_ALREADY_HAS_PROGRAMMED_PRIZE"
        )
    ) {
        return "Ese número ya tiene un premio programado.";
    }


    if (
        message.includes(
            "NUMBER_OUT_OF_RANGE"
        )
    ) {
        return "El número seleccionado no pertenece al rango de esta actividad.";
    }


    if (
        message.includes(
            "PRIZE_STOCK_UNAVAILABLE"
        )
    ) {
        return "No existe stock disponible para reservar este premio.";
    }


    if (
        message.includes(
            "PRIZE_NOT_FOUND_OR_INACTIVE"
        )
    ) {
        return "El premio no existe, está inactivo o pertenece a otra actividad.";
    }


    if (
        message.includes(
            "EVENT_NAME_REQUIRED"
        )
    ) {
        return "Para un evento en vivo debes indicar el nombre del evento.";
    }


    if (
        message.includes(
            "PROGRAMMED_PRIZE_NOT_FOUND"
        )
    ) {
        return "No se encontró el premio programado.";
    }


    if (
        message.includes(
            "PROGRAMMED_PRIZE_CANNOT_BE_CANCELLED"
        )
    ) {
        return "Este premio ya fue asignado o revelado y ya no puede cancelarse.";
    }


    if (
        message.includes(
            "PROGRAMMED_PRIZE_STOCK_INCONSISTENT"
        )
    ) {
        return "Existe una inconsistencia en el stock reservado del premio.";
    }


    if (
        message.includes(
            "SORTEO_NOT_FOUND"
        )
    ) {
        return "No se encontró la actividad seleccionada.";
    }


    return (
        message ||
        "No se pudo realizar la operación"
    );
}


/*
 * =========================================================
 * GET
 *
 * CARGAR:
 * - ACTIVIDADES
 * - CATÁLOGO DE PREMIOS
 * - PREMIOS PROGRAMADOS
 * =========================================================
 */

export async function GET(
    req: NextRequest
) {
    try {

        // =====================================================
        // 1. VALIDAR ADMIN
        // =====================================================

        const admin =
            await getAdminUser(
                req
            );


        if (!admin.ok) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        admin.error,
                },
                {
                    status:
                        admin.status,
                }
            );
        }


        // =====================================================
        // 2. CONSULTAS
        // =====================================================

        const [
            sorteosResult,
            catalogResult,
            programmedResult,
        ] =
            await Promise.all([

                supabaseAdmin
                    .from(
                        "sorteos"
                    )
                    .select("*"),


                supabaseAdmin
                    .from(
                        "card_prizes"
                    )
                    .select(`
                        id,
                        sorteo_id,
                        nombre,
                        descripcion,
                        tipo,
                        imagen_url,
                        cantidad_cards,
                        valor_referencial,
                        peso_asignacion,
                        stock_total,
                        stock_asignado,
                        stock_programado,
                        activo,
                        fecha_inicio,
                        fecha_fin,
                        created_at,
                        updated_at
                    `)
                    .eq(
                        "activo",
                        true
                    )
                    .order(
                        "nombre",
                        {
                            ascending:
                                true,
                        }
                    ),


                supabaseAdmin
                    .from(
                        "premios_instantaneos"
                    )
                    .select(`
                        id,
                        sorteo_id,
                        numero,
                        descripcion,
                        estado,
                        prize_id,
                        modo,
                        evento_nombre,
event_start_at,
event_end_at,
notas,
scheduled_by,
                        scheduled_at,
                        locked_at,
                        assigned_at,
                        revealed_at,
                        cancelled_at,
                        cancelled_by,
                        assigned_card_id,
                        assigned_order_id,
                        assigned_owner_user_id,
                        assigned_owner_email,
                        created_at,
                        updated_at
                    `)
                    .order(
                        "scheduled_at",
                        {
                            ascending:
                                false,
                        }
                    ),
            ]);


        // =====================================================
        // 3. ERRORES
        // =====================================================

        if (
            sorteosResult.error
        ) {
            console.error(
                "Error leyendo sorteos:",
                sorteosResult.error
            );

            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "No se pudieron consultar las actividades",
                },
                {
                    status: 500,
                }
            );
        }


        if (
            catalogResult.error
        ) {
            console.error(
                "Error leyendo card_prizes:",
                catalogResult.error
            );

            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "No se pudo consultar el catálogo de premios",
                },
                {
                    status: 500,
                }
            );
        }


        if (
            programmedResult.error
        ) {
            console.error(
                "Error leyendo premios programados:",
                programmedResult.error
            );

            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "No se pudieron consultar los premios programados",
                },
                {
                    status: 500,
                }
            );
        }


        const sorteosRaw =
            sorteosResult.data ??
            [];

        const catalogRaw =
            catalogResult.data ??
            [];

        const programmedRaw =
            programmedResult.data ??
            [];


        // =====================================================
        // 4. MAPA DE ACTIVIDADES
        // =====================================================

        const sorteoById =
            new Map<
                string,
                any
            >();


        for (
            const row
            of sorteosRaw
        ) {
            sorteoById.set(
                row.id,
                row
            );
        }


        const sorteos =
            sorteosRaw.map(
                (
                    row: any
                ) => ({
                    id:
                        row.id,

                    name:
                        getSorteoName(
                            row
                        ),

                    totalNumbers:
                        Number(
                            row.total_numeros ??
                            0
                        ),

                    activityNumber:
                        row.actividad_numero ??
                        null,

                    status:
                        row.estado ??
                        null,
                })
            );


        // =====================================================
        // 5. CATÁLOGO DE PREMIOS
        // =====================================================

        const prizeById =
            new Map<
                string,
                any
            >();


        const catalog =
            catalogRaw.map(
                (
                    row: any
                ) => {

                    const stockTotal =
                        Number(
                            row.stock_total ??
                            0
                        );

                    const stockAssigned =
                        Number(
                            row.stock_asignado ??
                            0
                        );

                    const stockProgrammed =
                        Number(
                            row.stock_programado ??
                            0
                        );

                    const availableStock =
                        Math.max(
                            0,

                            stockTotal -
                            stockAssigned -
                            stockProgrammed
                        );


                    const item = {
                        id:
                            row.id,

                        sorteoId:
                            row.sorteo_id,

                        sorteoName:
                            getSorteoName(
                                sorteoById.get(
                                    row.sorteo_id
                                )
                            ),

                        name:
                            row.nombre,

                        description:
                            row.descripcion ??
                            null,

                        type:
                            row.tipo,

                        imageUrl:
                            row.imagen_url ??
                            null,

                        cardQuantity:
                            row.cantidad_cards ??
                            null,

                        referenceValue:
                            row.valor_referencial !=
                                null
                                ? Number(
                                    row.valor_referencial
                                )
                                : null,

                        weight:
                            row.peso_asignacion !=
                                null
                                ? Number(
                                    row.peso_asignacion
                                )
                                : 0,

                        stockTotal,

                        stockAssigned,

                        stockProgrammed,

                        availableStock,

                        active:
                            Boolean(
                                row.activo
                            ),

                        startsAt:
                            row.fecha_inicio ??
                            null,

                        endsAt:
                            row.fecha_fin ??
                            null,
                    };


                    prizeById.set(
                        row.id,
                        item
                    );


                    return item;
                }
            );


        // =====================================================
        // 6. PREMIOS PROGRAMADOS
        // =====================================================

        const programmedPrizes =
            programmedRaw.map(
                (
                    row: any
                ) => {

                    const prize =
                        row.prize_id
                            ? prizeById.get(
                                row.prize_id
                            ) ??
                            null
                            : null;


                    const sorteo =
                        sorteoById.get(
                            row.sorteo_id
                        ) ??
                        null;


                    return {
                        id:
                            row.id,

                        sorteoId:
                            row.sorteo_id,

                        sorteoName:
                            getSorteoName(
                                sorteo
                            ),

                        number:
                            Number(
                                row.numero
                            ),

                        description:
                            row.descripcion ??
                            null,

                        status:
                            row.estado,

                        mode:
                            row.modo,

                        eventName:
                            row.evento_nombre ??
                            null,

                        eventStartAt:
                            row.event_start_at ??
                            null,

                        eventEndAt:
                            row.event_end_at ??
                            null,

                        notes:
                            row.notas ??
                            null,

                        scheduledBy:
                            row.scheduled_by ??
                            null,

                        scheduledAt:
                            row.scheduled_at ??
                            null,

                        lockedAt:
                            row.locked_at ??
                            null,

                        assignedAt:
                            row.assigned_at ??
                            null,

                        revealedAt:
                            row.revealed_at ??
                            null,

                        cancelledAt:
                            row.cancelled_at ??
                            null,

                        cancelledBy:
                            row.cancelled_by ??
                            null,

                        assignedCardId:
                            row.assigned_card_id ??
                            null,

                        assignedOrderId:
                            row.assigned_order_id ??
                            null,

                        assignedOwnerUserId:
                            row.assigned_owner_user_id ??
                            null,

                        assignedOwnerEmail:
                            row.assigned_owner_email ??
                            null,

                        createdAt:
                            row.created_at ??
                            null,

                        updatedAt:
                            row.updated_at ??
                            null,

                        prize,
                    };
                }
            );


        // =====================================================
        // 7. RESUMEN
        // =====================================================

        const summary = {

            total:
                programmedPrizes.length,

            scheduled:
                programmedPrizes.filter(
                    (
                        item
                    ) =>
                        item.status ===
                        "scheduled"
                ).length,

            assigned:
                programmedPrizes.filter(
                    (
                        item
                    ) =>
                        item.status ===
                        "assigned"
                ).length,

            revealed:
                programmedPrizes.filter(
                    (
                        item
                    ) =>
                        item.status ===
                        "revealed"
                ).length,

            delivered:
                programmedPrizes.filter(
                    (
                        item
                    ) =>
                        item.status ===
                        "delivered"
                ).length,

            cancelled:
                programmedPrizes.filter(
                    (
                        item
                    ) =>
                        item.status ===
                        "cancelled"
                ).length,
        };


        // =====================================================
        // 8. RESPUESTA
        // =====================================================

        return NextResponse.json({
            ok: true,

            summary,

            sorteos,

            catalog,

            programmedPrizes,
        });

    } catch (
    error: unknown
    ) {

        console.error(
            "api/admin/premios/programados GET:",
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
            {
                status: 500,
            }
        );
    }
}


/*
 * =========================================================
 * POST
 *
 * PROGRAMAR Y BLOQUEAR PREMIO
 * =========================================================
 */

export async function POST(
    req: NextRequest
) {
    try {

        // =====================================================
        // 1. VALIDAR ADMIN
        // =====================================================

        const admin =
            await getAdminUser(
                req
            );


        if (!admin.ok) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        admin.error,
                },
                {
                    status:
                        admin.status,
                }
            );
        }


        // =====================================================
        // 2. BODY
        // =====================================================

        const body =
            await req.json().catch(
                () => null
            );


        const sorteoId =
            normalizeText(
                body?.sorteoId
            );


        const prizeId =
            normalizeText(
                body?.prizeId
            );


        const mode =
            String(
                body?.mode ??
                "number"
            )
                .trim()
                .toLowerCase();


        const eventName =
            normalizeText(
                body?.eventName
            );

        const eventStartAt =
            normalizeText(
                body?.eventStartAt
            );

        const eventEndAt =
            normalizeText(
                body?.eventEndAt
            );

        const notes =
            normalizeText(
                body?.notes
            );


        const rawNumber =
            body?.number;


        const number =
            Number(
                rawNumber
            );


        // =====================================================
        // 3. VALIDACIONES
        // =====================================================

        if (!sorteoId) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Selecciona una actividad",
                },
                {
                    status: 400,
                }
            );
        }


        if (!prizeId) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Selecciona un premio",
                },
                {
                    status: 400,
                }
            );
        }


        if (
            !Number.isInteger(
                number
            ) ||
            number < 0
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Ingresa un número válido",
                },
                {
                    status: 400,
                }
            );
        }


        if (
            mode !== "number" &&
            mode !== "live_event"
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Modalidad de premio inválida",
                },
                {
                    status: 400,
                }
            );
        }


        if (
            mode ===
            "live_event"
        ) {
            if (!eventName) {
                return NextResponse.json(
                    {
                        ok: false,
                        error:
                            "Ingresa el nombre del evento en vivo",
                    },
                    {
                        status: 400,
                    }
                );
            }

            if (!eventStartAt) {
                return NextResponse.json(
                    {
                        ok: false,
                        error:
                            "Selecciona la fecha y hora de inicio del evento",
                    },
                    {
                        status: 400,
                    }
                );
            }

            if (!eventEndAt) {
                return NextResponse.json(
                    {
                        ok: false,
                        error:
                            "Selecciona la fecha y hora de finalización del evento",
                    },
                    {
                        status: 400,
                    }
                );
            }

            const startDate =
                new Date(
                    eventStartAt
                );

            const endDate =
                new Date(
                    eventEndAt
                );

            if (
                Number.isNaN(
                    startDate.getTime()
                ) ||
                Number.isNaN(
                    endDate.getTime()
                )
            ) {
                return NextResponse.json(
                    {
                        ok: false,
                        error:
                            "Las fechas del evento no son válidas",
                    },
                    {
                        status: 400,
                    }
                );
            }

            if (
                endDate.getTime() <=
                startDate.getTime()
            ) {
                return NextResponse.json(
                    {
                        ok: false,
                        error:
                            "La finalización del evento debe ser posterior al inicio",
                    },
                    {
                        status: 400,
                    }
                );
            }
        }


        // =====================================================
        // 4. PROGRAMAR DE FORMA ATÓMICA
        // =====================================================

        const {
            data,
            error,
        } =
            await (
                supabaseAdmin as any
            ).rpc(
                "admin_program_prize_by_number",
                {
                    p_sorteo_id:
                        sorteoId,

                    p_prize_id:
                        prizeId,

                    p_numero:
                        number,

                    p_modo:
                        mode,

                    p_evento_nombre:
                        eventName,

                    p_event_start_at:
                        mode === "live_event"
                            ? eventStartAt
                            : null,

                    p_event_end_at:
                        mode === "live_event"
                            ? eventEndAt
                            : null,

                    p_notas:
                        notes,

                    p_admin_user_id:
                        admin.user.id,
                }
            );


        if (error) {
            console.error(
                "Error programando premio:",
                error
            );


            return NextResponse.json(
                {
                    ok: false,

                    error:
                        getFriendlyRpcError(
                            error.message
                        ),
                },
                {
                    status: 400,
                }
            );
        }


        // =====================================================
        // 5. RESPUESTA
        // =====================================================

        return NextResponse.json({
            ok: true,

            programmedPrize:
                data,
        });

    } catch (
    error: unknown
    ) {

        console.error(
            "api/admin/premios/programados POST:",
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
            {
                status: 500,
            }
        );
    }
}


/*
 * =========================================================
 * PATCH
 *
 * CANCELAR PREMIO PROGRAMADO
 * =========================================================
 */

export async function PATCH(
    req: NextRequest
) {
    try {

        // =====================================================
        // 1. VALIDAR ADMIN
        // =====================================================

        const admin =
            await getAdminUser(
                req
            );


        if (!admin.ok) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        admin.error,
                },
                {
                    status:
                        admin.status,
                }
            );
        }


        // =====================================================
        // 2. BODY
        // =====================================================

        const body =
            await req.json().catch(
                () => null
            );


        const action =
            String(
                body?.action ??
                ""
            )
                .trim()
                .toLowerCase();


        const programmedPrizeId =
            normalizeText(
                body?.programmedPrizeId
            );


        const reason =
            normalizeText(
                body?.reason
            );


        // =====================================================
        // 3. VALIDACIONES
        // =====================================================

        if (
            action !==
            "cancel"
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Acción administrativa inválida",
                },
                {
                    status: 400,
                }
            );
        }


        if (
            !programmedPrizeId
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Falta el premio programado",
                },
                {
                    status: 400,
                }
            );
        }


        // =====================================================
        // 4. CANCELACIÓN ATÓMICA
        // =====================================================

        const {
            data,
            error,
        } =
            await (
                supabaseAdmin as any
            ).rpc(
                "admin_cancel_programmed_prize",
                {
                    p_programmed_id:
                        programmedPrizeId,

                    p_admin_user_id:
                        admin.user.id,

                    p_reason:
                        reason,
                }
            );


        if (error) {
            console.error(
                "Error cancelando premio programado:",
                error
            );


            return NextResponse.json(
                {
                    ok: false,

                    error:
                        getFriendlyRpcError(
                            error.message
                        ),
                },
                {
                    status: 400,
                }
            );
        }


        // =====================================================
        // 5. RESPUESTA
        // =====================================================

        return NextResponse.json({
            ok: true,

            programmedPrize:
                data,
        });

    } catch (
    error: unknown
    ) {

        console.error(
            "api/admin/premios/programados PATCH:",
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
            {
                status: 500,
            }
        );
    }
}