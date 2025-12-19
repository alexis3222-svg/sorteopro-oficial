// app/api/payphone/confirmar/route.ts
import { NextRequest, NextResponse } from "next/server";
import { asignarNumerosPorTx } from "@/lib/asignarNumeros";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ConfirmResult =
    | { ok: true; paid: true; alreadyAssigned: boolean; numeros: number[] }
    | { ok: true; paid: false; reason: string }
    | { ok: false; error: string };

function normalizeStatus(raw: any) {
    return String(raw ?? "")
        .trim()
        .toUpperCase();
}

function isApprovedStatus(status: string) {
    // Lista flexible (PayPhone a veces varía nombres)
    const approved = new Set([
        "APPROVED",
        "APPROVE",
        "COMPLETED",
        "PAID",
        "SUCCESS",
        "OK",
        "CONFIRMED",
    ]);
    return approved.has(status);
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => null);

        const tx =
            body?.tx ||
            body?.clientTransactionId ||
            body?.clientTransactionID ||
            body?.id ||
            body?.reference;

        if (!tx) {
            return NextResponse.json<ConfirmResult>(
                { ok: false, error: "Falta tx (clientTransactionId)" },
                { status: 400 }
            );
        }

        // 🔐 Token server-side (NO uses NEXT_PUBLIC_ aquí)
        const token =
            process.env.PAYPHONE_TOKEN ||
            process.env.PAYPHONE_API_TOKEN ||
            process.env.NEXT_PUBLIC_PAYPHONE_TOKEN || "";

        if (!token) {
            return NextResponse.json<ConfirmResult>(
                { ok: false, error: "Falta PAYPHONE_TOKEN en variables de entorno" },
                { status: 500 }
            );
        }

        // ✅ Consultar estado a PayPhone
        // NOTA: Si tu endpoint exacto es otro, lo ajustamos en el siguiente mensaje.
        const url = `https://pay.payphonetodoesposible.com/api/Sale/${encodeURIComponent(
            tx
        )}`;

        const r = await fetch(url, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
            },
            cache: "no-store",
        });

        // Si PayPhone devuelve HTML, aquí lo detectamos y devolvemos error legible
        const contentType = r.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
            const raw = await r.text().catch(() => "");
            console.error("PayPhone confirmar: respuesta NO JSON", {
                status: r.status,
                contentType,
                rawPreview: raw.slice(0, 200),
            });

            return NextResponse.json<ConfirmResult>(
                {
                    ok: false,
                    error:
                        "PayPhone respondió HTML/no-JSON al confirmar. Revisa token/endpoint.",
                },
                { status: 502 }
            );
        }

        const data = await r.json().catch(() => null);

        // Intentar leer status desde varias rutas posibles
        const statusRaw =
            data?.status ||
            data?.transactionStatus ||
            data?.transactionStatusName ||
            data?.data?.status ||
            data?.data?.transactionStatus ||
            data?.data?.transactionStatusName;

        const status = normalizeStatus(statusRaw);

        if (!isApprovedStatus(status)) {
            return NextResponse.json<ConfirmResult>({
                ok: true,
                paid: false,
                reason: `Estado no aprobado: ${status || "DESCONOCIDO"}`,
            });
        }

        // ✅ Pago confirmado → asignar números y crear/actualizar pedido desde la lógica central
        const result = await asignarNumerosPorTx(String(tx));

        if (!result.ok) {
            return NextResponse.json<ConfirmResult>(
                { ok: false, error: result.error },
                { status: 500 }
            );
        }

        return NextResponse.json<ConfirmResult>({
            ok: true,
            paid: true,
            alreadyAssigned: result.alreadyAssigned,
            numeros: result.numeros,
        });
    } catch (e) {
        console.error("Error /api/payphone/confirmar:", e);
        return NextResponse.json<ConfirmResult>(
            { ok: false, error: "Error interno en confirmar" },
            { status: 500 }
        );
    }
}
