// app/api/admin/login/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => ({}));
        const secret = String(body?.secret ?? "").trim();

        const expected =
            (process.env.ADMIN_SECRET ||
                process.env.NEXT_PUBLIC_ADMIN_SECRET ||
                "").trim();

        if (!expected) {
            return NextResponse.json(
                { ok: false, error: "ADMIN_SECRET no configurado" },
                { status: 500 }
            );
        }

        if (!secret || secret !== expected) {
            return NextResponse.json(
                { ok: false, error: "Credenciales inválidas" },
                { status: 401 }
            );
        }

        const res = NextResponse.json({ ok: true });

        // ✅ Cookie persistente (30 días)
        res.cookies.set("admin_session", "1", {
            httpOnly: true,
            secure: true,      // en Vercel siempre https
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24 * 30,
        });

        return res;
    } catch {
        return NextResponse.json(
            { ok: false, error: "Body inválido" },
            { status: 400 }
        );
    }
}
