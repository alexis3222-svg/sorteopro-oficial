// middleware.ts
import { NextResponse, type NextRequest } from "next/server";

const AFF_COOKIE = "affiliate_session";
const ADMIN_COOKIE = "admin_session";

export function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // =========================
    // ✅ AFILIADO (/afiliado/*)
    // =========================
    if (pathname.startsWith("/afiliado")) {
        const token = req.cookies.get(AFF_COOKIE)?.value;

        // /afiliado/login: si ya está logueado -> /afiliado
        if (pathname === "/afiliado/login") {
            if (token) {
                const url = req.nextUrl.clone();
                url.pathname = "/afiliado";
                return NextResponse.redirect(url);
            }
            return NextResponse.next();
        }

        // resto de /afiliado/*: si no hay cookie -> /afiliado/login
        if (!token) {
            const url = req.nextUrl.clone();
            url.pathname = "/afiliado/login";
            url.searchParams.set("next", pathname);
            return NextResponse.redirect(url);
        }

        return NextResponse.next();
    }

    // =====================
    // ✅ ADMIN (/admin/*)
    // =====================
    if (pathname.startsWith("/admin")) {
        const token = req.cookies.get(ADMIN_COOKIE)?.value;

        // permitir acceso a /admin/login sin cookie
        if (pathname === "/admin/login") {
            if (token === "1") {
                const url = req.nextUrl.clone();
                url.pathname = "/admin";
                return NextResponse.redirect(url);
            }
            return NextResponse.next();
        }

        // proteger TODO lo demás en /admin/*
        if (token !== "1") {
            const url = req.nextUrl.clone();
            url.pathname = "/admin/login";
            url.searchParams.set("next", pathname);
            return NextResponse.redirect(url);
        }

        return NextResponse.next();
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/afiliado/:path*", "/admin/:path*"],
};
