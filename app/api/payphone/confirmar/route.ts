// app/api/payphone/confirmar/route.ts
import { NextRequest, NextResponse } from "next/server";
import { asignarNumerosPorTx } from "@/lib/asignarNumeros";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Resp =
    | { ok: true; paid: true; alreadyAssigned: boolean; numeros: number[] }
    | { ok: true; paid: false; reason: string; details?: any }
    | { ok: false; error: string; details?: any };

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => null);

        const idRaw =
            body?.id || body?.payphoneId || body?.transactionId || body?.payphone_id;
        const tx =
            body?.tx ||
            body?.clientTransactionId ||
            body?.clientTransactionID ||
            body?.clientTxId ||
            body?.reference;

        const id = Number(idRaw);

        if (!id || Number.isNaN(id)) {
            return NextResponse.json<Resp>(
                { ok: false, error: "Falta 'id' (PayPhone ID) válido." },
                { status: 400 }
            );
        }
        if (!tx) {
            return NextResponse.json<Resp>(
                { ok: false, error: "Falta 'tx' (clientTransactionId)." },
                { status: 400 }
            );
        }

        const token = process.env.PAYPHONE_TOKEN || "";
        if (!token) {
            return NextResponse.json<Resp>(
                { ok: false, error: "Falta PAYPHONE_TOKEN en Vercel (Production)." },
                { status: 500 }
            );
        }

        const apiBase = process.env.PAYPHONE_API_URL || "https://pay.payphonetodoesposible.com";
        const url = `${apiBase}/api/button/V2/Confirm`;

        const r = await fetch(url, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify({ id, clientTxId: String(tx) }),
            cache: "no-store",
        });

        const contentType = r.headers.get("content-type") || "";
        const raw = await r.text().catch(() => "");

        if (!contentType.includes("application/json")) {
            console.error("PAYPHONE_CONFIRM_NON_JSON", {
                httpStatus: r.status,
                contentType,
                rawPreview: raw.slice(0, 200),
            });
            return NextResponse.json<Resp>(
                {
                    ok: false,
                    error:
                        "PayPhone devolvió HTML/no-JSON al confirmar (token/endpoint/env incorrecto).",
                    details: { httpStatus: r.status, contentType },
                },
                { status: 502 }
            );
        }

        const data = raw ? JSON.parse(raw) : null;

        const statusCode = Number(data?.statusCode ?? data?.data?.statusCode);
        const approved = statusCode === 3; // en PayPhone: 3 = Aprobada

        if (!approved) {
            return NextResponse.json<Resp>({
                ok: true,
                paid: false,
                reason: `Pago no aprobado aún (statusCode=${statusCode || "?"}).`,
                details: data,
            });
        }

        const result = await asignarNumerosPorTx(String(tx));
        if (!result.ok) {
            return NextResponse.json<Resp>(
                { ok: false, error: result.error, details: result },
                { status: 500 }
            );
        }

        return NextResponse.json<Resp>({
            ok: true,
            paid: true,
            alreadyAssigned: result.alreadyAssigned,
            numeros: result.numeros,
        });
    } catch (e) {
        console.error("CONFIRM_ERROR", e);
        return NextResponse.json<Resp>(
            { ok: false, error: "Error interno en confirmar" },
            { status: 500 }
        );
    }
}
