import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    const body = await req.json().catch(() => ({} as any));
    const secret = typeof body?.secret === "string" ? body.secret : "";

    const expected =
        process.env.ADMIN_SECRET ||
        process.env.NEXT_PUBLIC_ADMIN_SECRET ||
        "";

    // ✅ DEBUG SEGURO (NO expone secretos)
    const debug = {
        expected_configured: expected.length > 0,
        expected_len: expected.length,
        received_len: secret.length,
        node_env: process.env.NODE_ENV || "",
        // útil para ver si estás en prod/preview
        vercel_env: process.env.VERCEL_ENV || "",
    };

    if (!expected || !secret || secret !== expected) {
        return NextResponse.json(
            { ok: false, error: "Credenciales inválidas", debug },
            { status: 401 }
        );
    }

    const res = NextResponse.json({ ok: true, debug });

    res.cookies.set("admin_session", "1", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 8,
    });

    return res;
}
