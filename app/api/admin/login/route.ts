// app/api/admin/login/route.ts

import {
    NextRequest,
    NextResponse,
} from "next/server";

import {
    ADMIN_COOKIE,
    SESSION_DURATION_SECONDS,
    createAdminSessionToken,
} from "@/lib/adminSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
    req: NextRequest
) {
    try {
        const body =
            await req
                .json()
                .catch(() => ({}));

        const secret =
            String(
                body?.secret ?? ""
            ).trim();

        /* ========================================================
           ADMIN SECRET
        ======================================================== */

        const expected =
            process.env.ADMIN_SECRET
                ?.trim();

        /*
         * IMPORTANTE:
         *
         * Nunca usamos:
         *
         * NEXT_PUBLIC_ADMIN_SECRET
         *
         * porque un secreto administrativo no debe
         * exponerse al cliente.
         */

        if (!expected) {
            console.error(
                "ADMIN_SECRET no está configurado."
            );

            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Configuración administrativa incompleta.",
                },
                {
                    status: 500,
                }
            );
        }

        /* ========================================================
           VALIDAR CREDENCIALES
        ======================================================== */

        if (
            !secret ||
            secret !== expected
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Credenciales inválidas.",
                },
                {
                    status: 401,
                }
            );
        }

        /* ========================================================
           CREAR SESIÓN FIRMADA
        ======================================================== */

        const sessionToken =
            await createAdminSessionToken();

        const response =
            NextResponse.json({
                ok: true,
            });

        /* ========================================================
           COOKIE
        ======================================================== */

        response.cookies.set(
            ADMIN_COOKIE,
            sessionToken,
            {
                httpOnly: true,

                /*
                 * En Vercel:
                 * HTTPS -> true
                 *
                 * En localhost:
                 * HTTP -> false
                 */
                secure:
                    process.env.NODE_ENV ===
                    "production",

                sameSite: "lax",

                path: "/",

                maxAge:
                    SESSION_DURATION_SECONDS,
            }
        );

        return response;

    } catch (error) {
        console.error(
            "Error login admin:",
            error
        );

        return NextResponse.json(
            {
                ok: false,
                error:
                    "No se pudo iniciar sesión.",
            },
            {
                status: 500,
            }
        );
    }
}