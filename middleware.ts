// middleware.ts
import { NextResponse, type NextRequest } from "next/server";

const AFF_COOKIE = "affiliate_session";
const ADMIN_COOKIE = "admin_session";

function cleanPath(pathname: string) {
    // normaliza: quita trailing slash excepto "/"
    if (pathname.length > 1 && pathname.endsWith("/")) return pathname.slice(0, -1);
    return pathname;
}

export function middleware(req: NextRequest) {
    const pathname = cleanPath(req.nextUrl.pathname);

    // =========================
    // ✅ AFILIADO (/afiliado/*)
    // =========================
    if (pathname === "/afiliado" || pathname.startsWith("/afiliado/")) {
        const token = req.cookies.get(AFF_COOKIE)?.value;

        // permitir SIEMPRE el login
        if (pathname === "/afiliado/login") {
            // si ya está logueado -> /afiliado
            if (token) {
                const url = req.nextUrl.clone();
                url.pathname = "/afiliado";
                url.search = ""; // evita arrastrar querys viejas
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
    if (pathname === "/admin" || pathname.startsWith("/admin/")) {
        const token = req.cookies.get(ADMIN_COOKIE)?.value;

        // permitir acceso a /admin/login sin cookie
        if (pathname === "/admin/login") {
            if (token === "1") {
                const url = req.nextUrl.clone();
                url.pathname = "/admin";
                url.search = "";
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
    // ✅ Match exacto + subrutas; evita problemas con "/afiliado" (sin slash)
    matcher: ["/afiliado", "/afiliado/:path*", "/admin", "/admin/:path*"],
};
