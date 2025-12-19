// app/api/payphone/confirmar/route.ts
import { NextRequest, NextResponse } from "next/server";
import { asignarNumerosPorTx } from "@/lib/asignarNumeros";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ConfirmResp =
    | { ok: true; paid: true; alreadyAssigned: boolean; numeros: number[] }
    | { ok: true; paid: false; reason: string; details?: any }
    | { ok: false; error: string; details?: any };

function upper(v: any) {
    return String(v ?? "").trim().toUpperCase();
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => null);

        // ✅ PayPhone devuelve estos 2 parámetros en la URL de respuesta:
        // - id (PayPhone ID) -> entero
        // - clientTransactionId (tu tx) -> string
        // (en tu UI se ven ambos)
        const idRaw =
            body?.id ||
            body?.payphoneId ||
            body?.transactionId ||
            body?.payphone_id;

        const tx =
            body?.tx ||
            body?.clientTransactionId ||
            body?.clientTransactionID ||
            body?.clientTxId ||
            body?.reference;

        const id = Number(idRaw);

        if (!id || Number.isNaN(id)) {
            return NextResponse.json<ConfirmResp>(
                { ok: false, error: "Falta 'id' (PayPhone ID) válido para confirmar." },
                { status: 400 }
            );
        }
        if (!tx) {
            return NextResponse.json<ConfirmResp>(
                { ok: false, error: "Falta 'tx' (clientTransactionId) para confirmar." },
                { status: 400 }
            );
        }

        const token =
            process.env.PAYPHONE_TOKEN ||
            process.env.PAYPHONE_API_TOKEN ||
            process.env.NEXT_PUBLIC_PAYPHONE_TOKEN ||
            "";

        if (!token) {
            return NextResponse.json<ConfirmResp>(
                { ok: false, error: "Falta PAYPHONE_TOKEN en variables de entorno." },
                { status: 500 }
            );
        }

        // ✅ Endpoint correcto de confirmación (Botón/Cajita):
        const url = "https://pay.payphonetodoesposible.com/api/button/V2/Confirm";

        const r = await fetch(url, {
            method: "POST",
            headers: {
                // OJO: docs usan "bearer" (minúscula) y funciona igual con Bearer,
                // pero lo dejamos igual que la doc.
                Authorization: `bearer ${token}`,
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify({ id, clientTxId: String(tx) }),
            cache: "no-store",
        });

        const contentType = r.headers.get("content-type") || "";
        const raw = await r.text().catch(() => "");

        // Si por algún motivo PayPhone no devuelve JSON, lo reportamos claro
        if (!contentType.includes("application/json")) {
            console.error("PAYPHONE CONFIRM no-json", {
                httpStatus: r.status,
                contentType,
                rawPreview: raw.slice(0, 200),
            });

            return NextResponse.json<ConfirmResp>(
                {
                    ok: false,
                    error:
                        "PayPhone respondió no-JSON al confirmar. Revisa token, endpoint o credenciales.",
                },
                { status: 502 }
            );
        }

        const data = raw ? JSON.parse(raw) : null;

        // Según docs: statusCode 3 = Aprobada; 2 = Cancelado
        const statusCode = Number(data?.statusCode ?? data?.data?.statusCode);
        const transactionStatus = upper(
            data?.transactionStatus ?? data?.data?.transactionStatus
        );

        const approved =
            statusCode === 3 || transactionStatus === "APPROVED" || transactionStatus === "APPROVE";

        if (!approved) {
            return NextResponse.json<ConfirmResp>({
                ok: true,
                paid: false,
                reason: `Pago no aprobado aún (statusCode=${statusCode || "?"}, transactionStatus=${transactionStatus || "?"})`,
                details: data,
            });
        }

        // ✅ Confirmado → ejecutar lógica idempotente central
        const result = await asignarNumerosPorTx(String(tx));

        if (!result.ok) {
            return NextResponse.json<ConfirmResp>(
                { ok: false, error: result.error, details: result },
                { status: 500 }
            );
        }

        return NextResponse.json<ConfirmResp>({
            ok: true,
            paid: true,
            alreadyAssigned: result.alreadyAssigned,
            numeros: result.numeros,
        });
    } catch (e) {
        console.error("Error /api/payphone/confirmar:", e);
        return NextResponse.json<ConfirmResp>(
            { ok: false, error: "Error interno en confirmar" },
            { status: 500 }
        );
    }
}
