import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Si alguien abre esto en navegador (GET), redirigimos a la página correcta
export async function GET(req: Request) {
    const url = new URL(req.url);
    const id = url.searchParams.get("id") || "";
    const tx =
        url.searchParams.get("tx") ||
        url.searchParams.get("clientTransactionId") ||
        "";

    const to = new URL("/pago-exitoso", url.origin);
    if (id) to.searchParams.set("id", id);
    if (tx) to.searchParams.set("tx", tx);

    return NextResponse.redirect(to, 302);
}

// POST lo puedes usar para logs si PayPhone pega POST, pero NO es necesario para crear pedido
export async function POST() {
    return NextResponse.json({ ok: true }, { status: 200 });
}
