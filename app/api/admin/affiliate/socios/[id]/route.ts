// app/api/admin/affiliate/socios/[id]/route.ts

import {
    NextRequest,
    NextResponse,
} from "next/server";

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


type RouteContext = {
    params: Promise<{
        id: string;
    }>;
};


/* ============================================================
   VALIDAR SESIÓN ADMINISTRATIVA
============================================================ */

async function isAdmin(
    req: NextRequest
): Promise<boolean> {

    const token =
        req.cookies
            .get(
                ADMIN_COOKIE
            )
            ?.value ??
        null;


    return await verifyAdminSessionToken(
        token
    );
}


/* ============================================================
   GET
   DETALLE DEL SOCIO + VENTAS HISTÓRICAS
============================================================ */

export async function GET(
    req: NextRequest,
    ctx: RouteContext
) {

    try {

        /* =====================================================
           1. VALIDAR ADMIN
        ===================================================== */

        const authorized =
            await isAdmin(
                req
            );


        if (
            !authorized
        ) {

            return NextResponse.json(
                {
                    ok:
                        false,

                    error:
                        "No autorizado",
                },
                {
                    status:
                        401,
                }
            );
        }


        /* =====================================================
           2. ID
        ===================================================== */

        const {
            id,
        } =
            await ctx.params;


        const socioId =
            String(
                id ??
                ""
            )
                .trim();


        if (
            !socioId
        ) {

            return NextResponse.json(
                {
                    ok:
                        false,

                    error:
                        "Falta id",
                },
                {
                    status:
                        400,
                }
            );
        }


        /* =====================================================
           3. SOCIO
        ===================================================== */

        const {
            data:
            socio,

            error:
            socioError,
        } =
            await supabaseAdmin
                .from(
                    "affiliates"
                )
                .select(`
                    id,
                    user_id,
                    username,
                    display_name,
                    code,
                    whatsapp,
                    email,
                    status,
                    is_active,
                    commission_rate,
                    created_at,
                    kind
                `)
                .eq(
                    "id",
                    socioId
                )
                .eq(
                    "kind",
                    "socio"
                )
                .maybeSingle();


        if (
            socioError
        ) {

            console.error(
                "Error cargando socio:",
                socioError
            );


            return NextResponse.json(
                {
                    ok:
                        false,

                    error:
                        socioError.message,
                },
                {
                    status:
                        500,
                }
            );
        }


        if (
            !socio
        ) {

            return NextResponse.json(
                {
                    ok:
                        false,

                    error:
                        "Socio no encontrado",
                },
                {
                    status:
                        404,
                }
            );
        }


        /* =====================================================
           4. VENTAS DEL SOCIO

           FUENTE DE VERDAD:
           affiliate_sales

           Aquí quedan congelados históricamente:
           - monto_pedido
           - porcentaje
           - comision
           - status
           - paid_at

           No recalculamos ventas antiguas con el porcentaje
           actual del socio.
        ===================================================== */

        const {
            data:
            ventas,

            error:
            ventasError,
        } =
            await supabaseAdmin
                .from(
                    "affiliate_sales"
                )
                .select(`
                    id,
                    affiliate_id,
                    pedido_id,
                    sorteo_id,
                    monto_pedido,
                    porcentaje,
                    comision,
                    status,
                    created_at,
                    paid_at,
                    reference
                `)
                .eq(
                    "affiliate_id",
                    socioId
                )
                .order(
                    "paid_at",
                    {
                        ascending:
                            false,
                        nullsFirst:
                            false,
                    }
                );


        if (
            ventasError
        ) {

            console.error(
                "Error cargando ventas del socio:",
                ventasError
            );


            return NextResponse.json(
                {
                    ok:
                        false,

                    error:
                        ventasError.message,
                },
                {
                    status:
                        500,
                }
            );
        }


        /* =====================================================
           5. RESPUESTA
        ===================================================== */

        return NextResponse.json({

            ok:
                true,

            socio,

            ventas:
                ventas ??
                [],
        });


    } catch (
    error:
        unknown
    ) {

        console.error(
            "admin affiliate socio GET:",
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

                        : "Error interno",
            },
            {
                status:
                    500,
            }
        );
    }
}


/* ============================================================
   PATCH
   ACTIVAR / SUSPENDER SOCIO
============================================================ */

export async function PATCH(
    req: NextRequest,
    ctx: RouteContext
) {

    try {

        /* =====================================================
           1. VALIDAR ADMIN
        ===================================================== */

        const authorized =
            await isAdmin(
                req
            );


        if (
            !authorized
        ) {

            return NextResponse.json(
                {
                    ok:
                        false,

                    error:
                        "No autorizado",
                },
                {
                    status:
                        401,
                }
            );
        }


        /* =====================================================
           2. ID
        ===================================================== */

        const {
            id,
        } =
            await ctx.params;


        const socioId =
            String(
                id ??
                ""
            )
                .trim();


        if (
            !socioId
        ) {

            return NextResponse.json(
                {
                    ok:
                        false,

                    error:
                        "Falta id",
                },
                {
                    status:
                        400,
                }
            );
        }


        /* =====================================================
           3. ESTADO
        ===================================================== */

        const body =
            await req
                .json()
                .catch(
                    () => ({})
                );


        const nextStatus =
            String(
                body?.status ??
                ""
            )
                .trim()
                .toLowerCase();


        if (
            nextStatus !==
            "active" &&
            nextStatus !==
            "suspended"
        ) {

            return NextResponse.json(
                {
                    ok:
                        false,

                    error:
                        "status inválido (active|suspended)",
                },
                {
                    status:
                        400,
                }
            );
        }


        /* =====================================================
           4. ACTUALIZAR SOCIO
        ===================================================== */

        const {
            data:
            affiliate,

            error:
            updateError,
        } =
            await supabaseAdmin
                .from(
                    "affiliates"
                )
                .update({

                    status:
                        nextStatus,

                    is_active:
                        nextStatus ===
                        "active",
                })
                .eq(
                    "id",
                    socioId
                )
                .eq(
                    "kind",
                    "socio"
                )
                .select(`
                    id,
                    status,
                    is_active
                `)
                .maybeSingle();


        if (
            updateError
        ) {

            console.error(
                "Error actualizando socio:",
                updateError
            );


            return NextResponse.json(
                {
                    ok:
                        false,

                    error:
                        updateError.message,
                },
                {
                    status:
                        500,
                }
            );
        }


        if (
            !affiliate
        ) {

            return NextResponse.json(
                {
                    ok:
                        false,

                    error:
                        "Socio no encontrado",
                },
                {
                    status:
                        404,
                }
            );
        }


        /* =====================================================
           5. RESPUESTA
        ===================================================== */

        return NextResponse.json({

            ok:
                true,

            affiliate,
        });


    } catch (
    error:
        unknown
    ) {

        console.error(
            "admin affiliate socio PATCH:",
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

                        : "Error interno",
            },
            {
                status:
                    500,
            }
        );
    }
}