// app/api/payphone/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { asignarNumerosPorPedidoId } from "@/lib/asignarNumeros";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAYPHONE_CONFIRM_URL =
    "https://pay.payphonetodoesposible.com/api/button/V2/Confirm";

function getPayphoneTokenServerOnly() {
    // ✅ server-only (acepta ambos nombres para producción real)
    const tokenRaw =
        process.env.PAYPHONE_TOKEN || process.env.PAYPHONE_TOKEN_LIVE || "";
    return tokenRaw.replace(/^"+|"+$/g, "").trim();
}

function buildRedirect(
    urlBase: URL,
    path: string,
    params: Record<string, string>
) {
    const u = new URL(path, urlBase.origin);
    for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
    return u;
}

function parseId(idRaw: unknown) {
    const n = Number(String(idRaw ?? "").trim());
    if (!n || Number.isNaN(n)) return null;
    return n;
}

function parseTx(txRaw: unknown) {
    const tx = String(txRaw ?? "").trim();
    return tx ? tx : null;
}

// ✅ detector robusto (sin inventar "approved")
function isPayphoneApproved(confirmJson: any): boolean {
    if (!confirmJson) return false;

    // casos comunes
    if (confirmJson.success === true) return true;

    const status =
        confirmJson.transactionStatus ??
        confirmJson.status ??
        confirmJson.data?.transactionStatus ??
        confirmJson.data?.status ??
        confirmJson.state ??
        confirmJson.message ??
        "";

    const s = String(status).toLowerCase();

    if (s.includes("approved")) return true;
    if (s.includes("success")) return true;
    if (s.includes("aprob")) return true;

    // algunos payloads usan statusCode
    if (confirmJson.statusCode === 200) return true;

    return false;
}

async function confirmWithPayPhone(id: number, clientTransactionId: string) {
    const token = getPayphoneTokenServerOnly();
    if (!token) {
        return { ok: false as const, reason: "no_token", httpStatus: 0, json: null };
    }

    const resp = await fetch(PAYPHONE_CONFIRM_URL, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify({
            id,
            clientTxId: clientTransactionId,
        }),
    });

    const text = await resp.text().catch(() => "");
    let json: any = null;
    try {
        json = text ? JSON.parse(text) : null;
    } catch {
        json = null;
    }

    if (!resp.ok || !json) {
        return {
            ok: false as const,
            reason: "confirm_failed",
            httpStatus: resp.status,
            json,
            rawText: text?.slice(0, 500) || "",
        };
    }

    return { ok: true as const, httpStatus: resp.status, json };
}

async function processPayment(id: number, clientTransactionId: string) {
    // 1) Buscar pedido
    const { data: pedido, error: pedidoErr } = await supabaseAdmin
        .from("pedidos")
        .select("id, estado, payphone_id, payphone_client_transaction_id")
        .eq("payphone_client_transaction_id", clientTransactionId)
        .single();

    if (pedidoErr || !pedido) {
        return { ok: false as const, code: "pedido_not_found" as const };
    }

    // 2) Confirm con PayPhone (server-to-server)
    const confirm = await confirmWithPayPhone(id, clientTransactionId);

    if (!confirm.ok) {
        console.log("[payphone-confirm] failed", {
            reason: confirm.reason,
            http: confirm.httpStatus,
            pedidoId: pedido.id,
        });

        return {
            ok: true as const,
            approved: false as const,
            pending: true as const,
            reason: confirm.reason,
            pedidoId: pedido.id,
            payphone_http_status: confirm.httpStatus,
        };
    }

    const approved = isPayphoneApproved(confirm.json);

    if (!approved) {
        console.log("[payphone-confirm] NOT approved", {
            pedidoId: pedido.id,
            http: confirm.httpStatus,
            // recorte para logs:
            preview: JSON.stringify(confirm.json).slice(0, 400),
        });

        return {
            ok: true as const,
            approved: false as const,
            pending: true as const,
            reason: "not_approved",
            pedidoId: pedido.id,
            payphone_http_status: confirm.httpStatus,
        };
    }

    // 3) Marcar pagado (idempotente) + guardar payphone_id juntos
    if (pedido.estado !== "pagado") {
        await supabaseAdmin
            .from("pedidos")
            .update({
                estado: "pagado",
                payphone_id: pedido.payphone_id ?? id,
                aprobado_at: new Date().toISOString(),
                // opcional recomendado si tienes columna jsonb:
                // payphone_confirm_payload: confirm.json,
            })
            .eq("id", pedido.id);
    } else if (!pedido.payphone_id) {
        await supabaseAdmin
            .from("pedidos")
            .update({ payphone_id: id })
            .eq("id", pedido.id);
    }

    // 4) Asignar números (idempotente)
    const assigned = await asignarNumerosPorPedidoId(pedido.id);

    return {
        ok: true as const,
        approved: true as const,
        pending: false as const,
        pedidoId: pedido.id,
        assigned,
    };
}

// ✅ PayPhone llega por GET (Return/Response URL)
export async function GET(req: NextRequest) {
    console.log("[payphone-webhook] HIT", req.nextUrl.toString());

    const id = parseId(req.nextUrl.searchParams.get("id"));
    const tx = parseTx(req.nextUrl.searchParams.get("clientTransactionId"));

    const successURL = (params: Record<string, string>) =>
        NextResponse.redirect(buildRedirect(req.nextUrl, "/pago-exitoso", params), {
            status: 302,
        });

    const failURL = (params: Record<string, string>) =>
        NextResponse.redirect(buildRedirect(req.nextUrl, "/pago-fallido", params), {
            status: 302,
        });

    if (!id || !tx) {
        return failURL({ reason: "missing_params" });
    }

    const result = await processPayment(id, tx);

    if (!result.ok && result.code === "pedido_not_found") {
        return failURL({ tx, reason: "pedido_not_found" });
    }

    if (result.ok && (result.pending || !result.approved)) {
        return successURL({ tx, status: "pending" });
    }

    return successURL({ tx, status: "approved" });
}

// ✅ POST opcional
export async function POST(req: NextRequest) {
    const body = await req.json().catch(() => ({} as any));
    const id = parseId(body?.id ?? body?.payphoneId);
    const tx = parseTx(body?.clientTransactionId ?? body?.clientTxId);

    if (!id || !tx) {
        return NextResponse.json(
            { ok: false, error: "Faltan parámetros: id y/o clientTransactionId" },
            { status: 400 }
        );
    }

    const result = await processPayment(id, tx);
    return NextResponse.json(result, { status: 200 });
}
