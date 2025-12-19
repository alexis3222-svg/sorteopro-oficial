import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { asignarNumerosPorTx } from "@/lib/asignarNumeros";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const PAYPHONE_TOKEN = process.env.PAYPHONE_TOKEN!;

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false },
});

// Helper: fetch JSON y si viene HTML lo reporta claro
async function fetchJsonStrict(url: string, init: RequestInit) {
    const res = await fetch(url, init);
    const contentType = res.headers.get("content-type") || "";
    const raw = await res.text();

    if (!contentType.includes("application/json")) {
        // PayPhone respondió HTML o algo raro -> este es el error que ves en logs
        throw new Error(
            `PayPhone no devolvió JSON (HTTP ${res.status}). content-type=${contentType}. raw=${raw.slice(
                0,
                200
            )}`
        );
    }

    const json = JSON.parse(raw);
    return { res, json };
}

export async function POST(req: NextRequest) {
    try {
        if (!PAYPHONE_TOKEN) {
            return NextResponse.json(
                { ok: false, error: "Falta PAYPHONE_TOKEN en variables de entorno" },
                { status: 500 }
            );
        }

        const body = await req.json().catch(() => null);
        const id = body?.id; // PayPhone transactionId (number/string)
        const tx = body?.tx; // UUID tx generado por backend

        if (!id || !tx) {
            return NextResponse.json(
                { ok: false, error: "Faltan campos: id y tx son obligatorios" },
                { status: 400 }
            );
        }

        // 1) Validar que exista el intent por tx (si no existe, la UI está enviando tx incorrecto)
        const { data: intent, error: intentErr } = await supabaseAdmin
            .from("payphone_intents")
            .select("id, tx, payphone_id, status")
            .eq("tx", tx)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (intentErr) {
            return NextResponse.json(
                { ok: false, error: intentErr.message },
                { status: 500 }
            );
        }

        if (!intent) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "No existe payphone_intents para este tx. El tx en la URL no corresponde a una intención válida.",
                },
                { status: 400 }
            );
        }

        // 2) (Opcional) Guardar payphone_id si no está guardado aún o si cambió
        if (!intent.payphone_id || String(intent.payphone_id) !== String(id)) {
            await supabaseAdmin
                .from("payphone_intents")
                .update({ payphone_id: String(id) })
                .eq("id", intent.id);
        }

        // 3) Consultar estado real a PayPhone
        // ⚠️ IMPORTANTE: aquí es donde te está regresando HTML.
        // Este endpoint/headers deben devolver JSON. Si no, te lo reportamos exacto.
        const url = "https://pay.payphonetodoesposible.com/api/button/V2/Confirm";

        // 1) Primer intento: Bearer (como lo tienes)
        let json: any = null;
        let lastErr: any = null;

        for (const authHeader of [
            `Bearer ${PAYPHONE_TOKEN}`,
            // 2) Segundo intento: token directo (algunos endpoints lo usan así)
            `${PAYPHONE_TOKEN}`,
        ]) {
            try {
                const res = await fetch(url, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: authHeader,
                    },
                    body: JSON.stringify({
                        id: Number(id),
                    }),
                });

                const contentType = res.headers.get("content-type") || "";
                const raw = await res.text();

                // si no es JSON, guardamos el error y probamos siguiente header
                if (!contentType.includes("application/json")) {
                    lastErr = new Error(
                        `PayPhone no devolvió JSON (HTTP ${res.status}). content-type=${contentType}. raw=${raw.slice(
                            0,
                            200
                        )}`
                    );
                    continue;
                }

                json = JSON.parse(raw);
                lastErr = null;
                break;
            } catch (e: any) {
                lastErr = e;
            }
        }

        if (lastErr || !json) {
            throw lastErr || new Error("No se pudo confirmar pago con PayPhone");
        }


        // 4) Normalizar estado de PayPhone
        // Dependiendo del payload, ajustamos campos comunes:
        const statusRaw =
            json?.status ||
            json?.transactionStatus ||
            json?.transactionStatusName ||
            json?.data?.status ||
            json?.data?.transactionStatus;

        const status = String(statusRaw || "").toUpperCase();

        // ✅ aprobados
        const aprobados = ["APPROVED", "APPROVE", "COMPLETED", "PAID", "SUCCESS"];

        if (!aprobados.includes(status)) {
            // actualizar intent para debug
            await supabaseAdmin
                .from("payphone_intents")
                .update({ status })
                .eq("id", intent.id);

            return NextResponse.json({
                ok: true,
                paid: false,
                status,
                raw: json,
            });
        }

        // 5) Pago aprobado -> ejecutar flujo central: crear pedido + asignar números (idempotente)
        const result = await asignarNumerosPorTx(String(tx));

        if (!result.ok) {
            return NextResponse.json(
                { ok: false, error: result.error, code: result.code },
                { status: 500 }
            );
        }

        // actualizar intent como aprobado
        await supabaseAdmin
            .from("payphone_intents")
            .update({ status: "APPROVED" })
            .eq("id", intent.id);

        return NextResponse.json({
            ok: true,
            paid: true,
            alreadyAssigned: result.alreadyAssigned,
            numeros: result.numeros,
        });
    } catch (e: any) {
        console.error("Error /api/payphone/confirmar:", e);

        return NextResponse.json(
            {
                ok: false,
                error: e?.message || "Error interno en confirmar",
            },
            { status: 500 }
        );
    }
}
