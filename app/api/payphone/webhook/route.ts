// @ts-nocheck
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    try {
        // Solo para verificar que llega algo
        const body = await req.json().catch(() => null);
        console.log("Webhook PayPhone recibido (stub prod):", body);

        // Por ahora solo devolvemos 200 OK
        return NextResponse.json({ ok: true }, { status: 200 });
    } catch (err) {
        console.error("Error en webhook PayPhone (stub):", err);
        return NextResponse.json({ ok: false }, { status: 500 });
    }
}
