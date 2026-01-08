// middleware.ts
import { NextResponse, type NextRequest } from "next/server";

const AFF_COOKIE = "affiliate_session";
const AFF_FORCE_COOKIE = "affiliate_must_change";
const ADMIN_COOKIE = "admin_session";

export function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // =========================
    // ✅ AFILIADO
    // =========================
    if (pathname.startsWith("/afiliado")) {
        const token = req.cookies.get(AFF_COOKIE)?.value;
        const mustChange = req.cookies.get(AFF_FORCE_COOKIE)?.value === "1";

        // ✅ SIEMPRE permitir estas rutas (evita loops)
        if (
            pathname === "/afiliado/login" ||
            pathname === "/afiliado/cambiar-clave" ||
            pathname.startsWith("/api/affiliate")
        ) {
            // si entra a login ya logueado => manda al destino correcto
            if (pathname === "/afiliado/login" && token) {
                const url = req.nextUrl.clone();
                url.pathname = mustChange ? "/afiliado/cambiar-clave" : "/afiliado";
                return NextResponse.redirect(url);
            }
            return NextResponse.next();
        }

        // si NO hay sesión -> login
        if (!token) {
            const url = req.nextUrl.clone();
            url.pathname = "/afiliado/login";
            url.searchParams.set("next", pathname);
            return NextResponse.redirect(url);
        }

        // si está forzado a cambiar -> cambiar-clave
        if (mustChange) {
            const url = req.nextUrl.clone();
            url.pathname = "/afiliado/cambiar-clave";
            return NextResponse.redirect(url);
        }

        return NextResponse.next();
    }

    // =========================
    // ✅ ADMIN
    // =========================
    if (pathname.startsWith("/admin")) {
        const token = req.cookies.get(ADMIN_COOKIE)?.value;

        if (pathname === "/admin/login") return NextResponse.next();

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
