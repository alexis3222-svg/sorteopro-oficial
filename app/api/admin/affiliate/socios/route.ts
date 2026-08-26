// app/api/admin/affiliate/socios/route.ts

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
   LISTADO DE SOCIOS COMERCIALES
============================================================ */

export async function GET(
    req: NextRequest
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
           2. FILTRO
        ===================================================== */

        const status =
            (
                req.nextUrl
                    .searchParams
                    .get(
                        "status"
                    ) ??
                "all"
            )
                .trim()
                .toLowerCase();


        const allowedStatuses =
            new Set([
                "all",
                "active",
                "suspended",
            ]);


        const normalizedStatus =
            allowedStatuses.has(
                status
            )
                ? status
                : "all";


        /* =====================================================
           3. CONSULTA DE SOCIOS
        ===================================================== */

        let query =
            supabaseAdmin
                .from(
                    "affiliates"
                )
                .select(`
                    id,
                    username,
                    display_name,
                    code,
                    whatsapp,
                    email,
                    status,
                    is_active,
                    commission_rate,
                    created_at
                `)
                .eq(
                    "kind",
                    "socio"
                )
                .order(
                    "created_at",
                    {
                        ascending:
                            false,
                    }
                );


        if (
            normalizedStatus ===
            "active"
        ) {

            query =
                query.eq(
                    "status",
                    "active"
                );
        }


        if (
            normalizedStatus ===
            "suspended"
        ) {

            query =
                query.eq(
                    "status",
                    "suspended"
                );
        }


        const {
            data:
            affiliates,

            error:
            affiliatesError,
        } =
            await query;


        if (
            affiliatesError
        ) {

            console.error(
                "Error cargando socios:",
                affiliatesError
            );


            return NextResponse.json(
                {
                    ok:
                        false,

                    error:
                        affiliatesError.message,
                },
                {
                    status:
                        500,
                }
            );
        }


        /* =====================================================
           4. CONTADORES GLOBALES
        ===================================================== */

        const [
            totalResult,
            activeResult,
            suspendedResult,
        ] =
            await Promise.all([

                supabaseAdmin
                    .from(
                        "affiliates"
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
                        "kind",
                        "socio"
                    ),


                supabaseAdmin
                    .from(
                        "affiliates"
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
                        "kind",
                        "socio"
                    )
                    .eq(
                        "status",
                        "active"
                    ),


                supabaseAdmin
                    .from(
                        "affiliates"
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
                        "kind",
                        "socio"
                    )
                    .eq(
                        "status",
                        "suspended"
                    ),
            ]);


        if (
            totalResult.error ||
            activeResult.error ||
            suspendedResult.error
        ) {

            console.error(
                "Error cargando contadores de socios:",
                {
                    total:
                        totalResult.error,

                    active:
                        activeResult.error,

                    suspended:
                        suspendedResult.error,
                }
            );
        }


        /* =====================================================
           5. RESPUESTA
        ===================================================== */

        return NextResponse.json({

            ok:
                true,

            affiliates:
                affiliates ??
                [],

            counts: {

                total:
                    totalResult.count ??
                    0,

                active:
                    activeResult.count ??
                    0,

                suspended:
                    suspendedResult.count ??
                    0,
            },
        });


    } catch (
    error:
        unknown
    ) {

        console.error(
            "admin affiliate socios GET:",
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