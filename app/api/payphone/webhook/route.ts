// app/api/payphone/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { asignarNumerosPorPedidoId } from "@/lib/asignarNumeros";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getPayphoneToken() {
    // ✅ token server-only recomendado: PAYPHONE_TOKEN
    // (si no lo tienes aún, usa el NEXT_PUBLIC como fallback para no frenarte)
    return (
        process.env.PAYPHONE_TOKEN ||
        process.env.NEXT_PUBLIC_PAYPHONE_TOKEN ||
        ""
    )
        .replace(/^"+|"+$/g, "")
        .trim();
}

async function handle(idRaw: string | null, clientTransactionIdRaw: string | null) {
    const id = Number(String(idRaw || "").trim());
    const clientTransactionId = String(clientTransactionIdRaw || "").trim();

    if (!id || Number.isNaN(id) || !clientTransactionId) {
        return NextResponse.json(
            { ok: false, error: "Faltan parámetros: id y/o clientTransactionId" },
            { status: 400 }
        );
    }

    // 1) Buscar pedido por clientTransactionId
    const { data: pedido, error: pedidoErr } = await supabaseAdmin
        .from("pedidos")
        .select("id, estado, payphone_id, payphone_client_transaction_id")
        .eq("payphone_client_transaction_id", clientTransactionId)
        .single();

    if (pedidoErr || !pedido) {
        // Importante: responder 200 para que PayPhone no reintente eternamente con error
        return NextResponse.json({ ok: true, ignored: true, reason: "pedido_not_found" }, { status: 200 });
    }

    // 2) Guardar payphone_id si no está
    if (!pedido.payphone_id) {
        await supabaseAdmin.from("pedidos").update({ payphone_id: id }).eq("id", pedido.id);
    }

    // 3) Intentar Confirm (según doc oficial: body usa clientTxId) :contentReference[oaicite:1]{index=1}
    const token = getPayphoneToken();
    if (!token) {
        // sin token no podemos confirmar: no marcamos pagado
        return NextResponse.json({ ok: true, pending: true, reason: "no_token" }, { status: 200 });
    }

    const resp = await fetch("https://pay.payphonetodoesposible.com/api/button/V2/Confirm", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify({
            id,
            clientTxId: clientTransactionId, // ✅ así lo pide PayPhone
        }),
    });

    const rawText = await resp.text().catch(() => "");
    let confirmJson: any = null;
    try {
        confirmJson = rawText ? JSON.parse(rawText) : null;
    } catch {
        confirmJson = null;
    }

    // Si PayPhone responde error (a veces devuelve HTML runtime), NO marcamos pagado
    if (!resp.ok || !confirmJson) {
        return NextResponse.json(
            {
                ok: true,
                pending: true,
                reason: "confirm_failed",
                payphone_http_status: resp.status,
            },
            { status: 200 }
        );
    }

    // 4) Detectar aprobado (tolerante)
    const statusValue =
        confirmJson?.transactionStatus ??
        confirmJson?.status ??
        confirmJson?.data?.status ??
        confirmJson?.data?.transactionStatus ??
        confirmJson?.detail?.status ??
        null;

    const statusStr = String(statusValue ?? "").toLowerCase();
    const raw = JSON.stringify(confirmJson).toLowerCase();

    const isApproved =
        statusStr === "approved" ||
        statusStr === "success" ||
        statusStr === "2" ||
        raw.includes('"approved"') ||
        raw.includes('"status":2') ||
        raw.includes('"status":"2"');

    if (!isApproved) {
        // No aprobado: no marcamos pagado
        return NextResponse.json({ ok: true, pending: true, reason: "not_approved" }, { status: 200 });
    }

    // 5) Marcar pagado (idempotente)
    if (pedido.estado !== "pagado") {
        await supabaseAdmin
            .from("pedidos")
            .update({ estado: "pagado", aprobado_at: new Date().toISOString() })
            .eq("id", pedido.id);
    }

    // 6) Asignar números (idempotente interno)
    const assigned = await asignarNumerosPorPedidoId(pedido.id);

    return NextResponse.json(
        {
            ok: true,
            status: assigned.ok
                ? assigned.alreadyAssigned
                    ? "APPROVED_ALREADY_ASSIGNED"
                    : "APPROVED_ASSIGNED"
                : "APPROVED_BUT_ASSIGN_FAILED",
            pedidoId: pedido.id,
            numeros: assigned.ok ? assigned.numeros : [],
        },
        { status: 200 }
    );
}

// ✅ PayPhone llega por GET con query params
export async function GET(req: NextRequest) {
    const id = req.nextUrl.searchParams.get("id");
    const clientTransactionId = req.nextUrl.searchParams.get("clientTransactionId");
    return handle(id, clientTransactionId);
}

// ✅ Si alguna integración te manda POST, también lo soportamos
export async function POST(req: NextRequest) {
    const body = await req.json().catch(() => ({} as any));
    const id = String(body?.id ?? body?.payphoneId ?? "");
    const clientTransactionId = String(body?.clientTransactionId ?? body?.clientTxId ?? "");
    return handle(id, clientTransactionId);
}
