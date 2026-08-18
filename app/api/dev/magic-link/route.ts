import {
    NextRequest,
    NextResponse,
} from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEV_EMAIL =
    "alexis3222@hotmail.com";

export async function GET(
    req: NextRequest
) {
    try {
        /*
         * =====================================================
         * 1. BLOQUEAR COMPLETAMENTE EN PRODUCCIÓN
         * =====================================================
         */

        if (
            process.env.NODE_ENV ===
            "production"
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Ruta no disponible",
                },
                {
                    status: 404,
                }
            );
        }

        /*
         * =====================================================
         * 2. ASEGURAR QUE SE USE DESDE LOCALHOST
         * =====================================================
         */

        const hostname =
            req.nextUrl.hostname;

        if (
            hostname !==
            "localhost" &&
            hostname !==
            "127.0.0.1"
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Esta ruta solo funciona en desarrollo local.",
                },
                {
                    status: 403,
                }
            );
        }

        /*
         * =====================================================
         * 3. GENERAR MAGIC LINK ADMIN
         * =====================================================
         */

        const redirectTo =
            `${req.nextUrl.origin}/mi-cuenta`;

        const {
            data,
            error,
        } =
            await supabaseAdmin
                .auth
                .admin
                .generateLink({
                    type:
                        "magiclink",

                    email:
                        DEV_EMAIL,

                    options: {
                        redirectTo,
                    },
                });

        if (error) {
            console.error(
                "DEV generateLink error:",
                error
            );

            return NextResponse.json(
                {
                    ok: false,
                    error:
                        error.message,
                },
                {
                    status: 500,
                }
            );
        }

        const actionLink =
            data.properties
                ?.action_link;

        if (!actionLink) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Supabase no devolvió el enlace de acceso.",
                },
                {
                    status: 500,
                }
            );
        }

        /*
         * =====================================================
         * 4. REDIRIGIR DIRECTAMENTE AL MAGIC LINK
         * =====================================================
         */

        return NextResponse.redirect(
            actionLink
        );

    } catch (
    error: unknown
    ) {
        console.error(
            "DEV magic-link error:",
            error
        );

        return NextResponse.json(
            {
                ok: false,

                error:
                    error instanceof
                        Error
                        ? error.message
                        : "No se pudo generar el acceso temporal.",
            },
            {
                status: 500,
            }
        );
    }
}