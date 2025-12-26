// app/api/payphone/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { asignarNumerosPorPedidoId } from "@/lib/asignarNumeros";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAYPHONE_CONFIRM_URL =
    "https://pay.payphonetodoesposible.com/api/button/V2/Confirm";

function getPayphoneTokenWebServerOnly() {
    // ✅ token WEB pero en variable server-only
    return (process.env.PAYPHONE_TOKEN_LIVE || process.env.PAYPHONE_TOKEN || "")
        .replace(/^"+|"+$/g, "")
        .trim();
}

function parseId(v: unknown) {
    const n = Number(String(v ?? "").trim());
    return !n || Number.isNaN(n) ? null : n;
}

function parseTx(v: unknown) {
    const s = String(v ?? "").trim();
    return s ? s : null;
}

function isApproved(confirmJson: any) {
    const status = String(confirmJson?.transactionStatus ?? "").toLowerCase();
    const code = Number(confirmJson?.statusCode);
    return status === "approved" || code === 3;
}

function html200Redirect(to: string) {
    // ✅ IMPORTANTE: HTTP 200 (no 302), PayPhone lo acepta
    return new NextResponse(
        `<!doctype html>
<html lang="es">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Procesando pago…</title></head>
<body style="font-family:system-ui;padding:24px">
<p>Procesando pago…</p>
<script>
  window.location.replace(${JSON.stringify(to)});
</script>
<noscript>
  <a href="${to}">Continuar</a>
</noscript>
</body></html>`,
        {
            status: 200,
            headers: { "Content-Type": "text/html; charset=utf-8" },
        }
    );
}

async function confirmWithPayPhone(id: number, clientTxId: string) {
    const token = getPayphoneTokenWebServerOnly();
    if (!token) {
        return { ok: false as const, http: 0, data: null, raw: "NO_TOKEN" };
    }

    const resp = await axios.post(
        PAYPHONE_CONFIRM_URL,
        { id, clientTxId },
        {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            timeout: 15000,
            validateStatus: () => true,
        }
    );

    const data = resp.data ?? null;
    const raw =
        typeof data === "string"
            ? data.slice(0, 800)
            : JSON.stringify(data).slice(0, 800);

    if (resp.status !== 200) {
        return { ok: false as const, http: resp.status, data, raw };
    }

    return { ok: true as const, http: resp.status, data, raw };
}

async function processPayment(id: number, clientTxId: string) {
    // 1) Buscar pedido por clientTxId
    const { data: pedido, error: pedidoErr } = await supabaseAdmin
        .from("pedidos")
        .select("id, estado, payphone_id")
        .eq("payphone_client_transaction_id", clientTxId)
        .single();

    if (pedidoErr || !pedido) {
        return { ok: false as const, code: "pedido_not_found" as const };
    }

    // 2) Confirm server-to-server
    const confirm = await confirmWithPayPhone(id, clientTxId);
    if (!confirm.ok) {
        console.log("[payphone-confirm] failed", { http: confirm.http, raw: confirm.raw, pedidoId: pedido.id });
        return { ok: true as const, pending: true as const, approved: false as const };
    }

    const approved = isApproved(confirm.data);
    if (!approved) {
        console.log("[payphone-confirm] not_approved", { pedidoId: pedido.id, raw: confirm.raw });
        return { ok: true as const, pending: true as const, approved: false as const };
    }

    // 3) Marcar pagado + guardar payphone_id (idempotente)
    if (pedido.estado !== "pagado") {
        await supabaseAdmin
            .from("pedidos")
            .update({
                estado: "pagado",
                payphone_id: pedido.payphone_id ?? id,
                aprobado_at: new Date().toISOString(),
            })
            .eq("id", pedido.id);
    } else if (!pedido.payphone_id) {
        await supabaseAdmin.from("pedidos").update({ payphone_id: id }).eq("id", pedido.id);
    }

    // 4) Asignar números (idempotente)
    const assigned = await asignarNumerosPorPedidoId(pedido.id);

    return { ok: true as const, pending: false as const, approved: true as const, pedidoId: pedido.id, assigned };
}

// ✅ PayPhone llega por GET a URL de respuesta
export async function GET(req: NextRequest) {
    const id = parseId(req.nextUrl.searchParams.get("id"));
    const tx = parseTx(req.nextUrl.searchParams.get("clientTransactionId"));

    // Siempre devolver 200 (PayPhone exige 200)
    if (!id || !tx) {
        return html200Redirect(`/pago-fallido?reason=missing_params`);
    }

    const result = await processPayment(id, tx);

    if (!result.ok && result.code === "pedido_not_found") {
        return html200Redirect(`/pago-fallido?tx=${encodeURIComponent(tx)}&reason=pedido_not_found`);
    }

    // approved o pending → mandamos al /pago-exitoso que hace polling
    return html200Redirect(`/pago-exitoso?tx=${encodeURIComponent(tx)}&status=${result.ok && result.pending ? "pending" : "approved"}`);
}

// POST opcional (si lo quieres mantener)
export async function POST(req: NextRequest) {
    const body = await req.json().catch(() => ({} as any));
    const id = parseId(body?.id ?? body?.payphoneId);
    const tx = parseTx(body?.clientTransactionId ?? body?.clientTxId);

    if (!id || !tx) {
        return NextResponse.json({ ok: false, error: "missing_params" }, { status: 200 });
    }

    const result = await processPayment(id, tx);
    // Importante: 200 siempre
    return NextResponse.json(result, { status: 200 });
}
