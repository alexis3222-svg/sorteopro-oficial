import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    const { secret } = await req.json().catch(() => ({ secret: "" }));

    const expected =
        process.env.ADMIN_SECRET ||
        process.env.NEXT_PUBLIC_ADMIN_SECRET ||
        "";

    if (!expected || !secret || secret !== expected) {
        return NextResponse.json({ ok: false, error: "Credenciales inválidas" }, { status: 401 });
    }

    const res = NextResponse.json({ ok: true });

    // ✅ cookie solo server (HttpOnly) + segura en prod
    res.cookies.set("admin_session", "1", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 8, // 8 horas
    });

    return res;
}
