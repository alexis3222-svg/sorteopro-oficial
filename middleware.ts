// middleware.ts
import { NextResponse, type NextRequest } from "next/server";

const AFF_COOKIE = "affiliate_session";
const ADMIN_COOKIE = "admin_session";

export function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // =========================
    // AFILIADO
    // =========================
    if (pathname.startsWith("/afiliado")) {
        const token = req.cookies.get(AFF_COOKIE)?.value;

        // ⛔️ NUNCA redirigir desde /afiliado/login
        if (pathname === "/afiliado/login") {
            return NextResponse.next();
        }

        // resto de /afiliado/*
        if (!token) {
            const url = req.nextUrl.clone();
            url.pathname = "/afiliado/login";
            url.searchParams.set("next", pathname);
            return NextResponse.redirect(url);
        }

        return NextResponse.next();
    }

    // =========================
    // ADMIN
    // =========================
    if (pathname.startsWith("/admin")) {
        const token = req.cookies.get(ADMIN_COOKIE)?.value;

        if (pathname === "/admin/login") {
            return NextResponse.next();
        }

        if (token !== "1") {
            const url = req.nextUrl.clone();
            url.pathname = "/admin/login";
            return NextResponse.redirect(url);
        }

        return NextResponse.next();
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/afiliado/:path*", "/admin/:path*"],
};
