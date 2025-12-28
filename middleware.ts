// middleware.ts
import { NextResponse, type NextRequest } from "next/server";

const COOKIE_NAME = "affiliate_session";

export function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // Solo nos interesa /afiliado/*
    if (!pathname.startsWith("/afiliado")) {
        return NextResponse.next();
    }

    const token = req.cookies.get(COOKIE_NAME)?.value;

    // 1) Si intenta ir a /afiliado/login y YA tiene cookie -> manda a /afiliado
    if (pathname === "/afiliado/login") {
        if (token) {
            const url = req.nextUrl.clone();
            url.pathname = "/afiliado";
            return NextResponse.redirect(url);
        }
        return NextResponse.next();
    }

    // 2) Si entra a cualquier /afiliado/* (excepto /afiliado/login) sin cookie -> login
    if (!token) {
        const url = req.nextUrl.clone();
        url.pathname = "/afiliado/login";
        // opcional: para volver después (por si luego quieres)
        url.searchParams.set("next", pathname);
        return NextResponse.redirect(url);
    }

    return NextResponse.next();
}

// matcher para correr SOLO en estas rutas
export const config = {
    matcher: ["/afiliado/:path*"],
};
