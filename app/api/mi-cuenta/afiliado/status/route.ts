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


export async function GET(
    req: NextRequest
) {
    try {

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
                        "La sesión no es válida",
                },
                {
                    status: 401,
                }
            );
        }


        const {
            data:
            affiliate,

            error:
            affiliateError,
        } =
            await supabaseAdmin
                .from(
                    "affiliates"
                )
                .select(`
                    id,
                    status
                `)
                .eq(
                    "user_id",
                    userData.user.id
                )
                .maybeSingle();


        if (
            affiliateError
        ) {
            throw affiliateError;
        }


        const isAffiliate =
            affiliate?.status ===
            "active";


        return NextResponse.json({
            ok: true,

            isAffiliate,

            status:
                affiliate?.status ??
                null,
        });


    } catch (
    error:
        unknown
    ) {

        console.error(
            "affiliate status:",
            error
        );


        return NextResponse.json(
            {
                ok: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "No se pudo consultar el estado de afiliado",
            },
            {
                status: 500,
            }
        );
    }
}