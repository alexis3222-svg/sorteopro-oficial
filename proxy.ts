// proxy.ts

import {
    NextResponse,
    type NextRequest,
} from "next/server";

import {
    ADMIN_COOKIE,
    verifyAdminSessionToken,
} from "@/lib/adminSession";

const AFF_COOKIE =
    "affiliate_session";

export async function proxy(
    req: NextRequest
) {
    const { pathname } =
        req.nextUrl;

    /* ============================================================
       AFILIADO
    ============================================================ */

    if (
        pathname.startsWith(
            "/afiliado"
        )
    ) {
        const token =
            req.cookies.get(
                AFF_COOKIE
            )?.value;

        if (
            pathname ===
            "/afiliado/login" ||
            pathname ===
            "/afiliado/cambiar-clave"
        ) {
            return NextResponse.next();
        }

        if (!token) {
            const url =
                req.nextUrl.clone();

            url.pathname =
                "/afiliado/login";

            url.searchParams.set(
                "next",
                pathname
            );

            return NextResponse.redirect(
                url
            );
        }

        return NextResponse.next();
    }

    /* ============================================================
       API ADMIN
    ============================================================ */

    if (
        pathname.startsWith(
            "/api/admin"
        )
    ) {
        /*
         * El login debe ser público.
         */
        if (
            pathname ===
            "/api/admin/login"
        ) {
            return NextResponse.next();
        }

        const token =
            req.cookies.get(
                ADMIN_COOKIE
            )?.value;

        const autorizado =
            await verifyAdminSessionToken(
                token
            );

        if (!autorizado) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "No autorizado.",
                },
                {
                    status: 401,
                }
            );
        }

        return NextResponse.next();
    }

    /* ============================================================
       PÁGINAS ADMIN
    ============================================================ */

    if (
        pathname.startsWith(
            "/admin"
        )
    ) {
        /*
         * Login público.
         */
        if (
            pathname ===
            "/admin/login"
        ) {
            return NextResponse.next();
        }

        const token =
            req.cookies.get(
                ADMIN_COOKIE
            )?.value;

        const autorizado =
            await verifyAdminSessionToken(
                token
            );

        if (!autorizado) {
            const url =
                req.nextUrl.clone();

            url.pathname =
                "/admin/login";

            url.searchParams.set(
                "next",
                pathname
            );

            return NextResponse.redirect(
                url
            );
        }

        return NextResponse.next();
    }

    return NextResponse.next();
}

/* ==============================================================
   MATCHER
================================================================ */

export const config = {
    matcher: [
        "/afiliado/:path*",
        "/admin/:path*",
        "/api/admin/:path*",
    ],
};