import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    try {
        const { secret } = await req.json();

        const expected =
            process.env.ADMIN_SECRET || process.env.NEXT_PUBLIC_ADMIN_SECRET;

        if (!expected || secret?.trim() !== expected.trim()) {
            return NextResponse.json(
                { ok: false, error: "Credenciales inválidas" },
                { status: 401 }
            );
        }

        // ✅ Cookie admin válida (7 días)
        const res = NextResponse.json({ ok: true });

        res.cookies.set("admin_session", "1", {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: 60 * 60 * 24 * 7, // 7 días
        });

        return res;
    } catch {
        return NextResponse.json(
            { ok: false, error: "Solicitud inválida" },
            { status: 400 }
        );
    }
}
