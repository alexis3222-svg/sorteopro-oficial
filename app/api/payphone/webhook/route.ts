// app/api/payphone/webhook/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { asignarNumerosPorTx } from "@/lib/asignarNumeros";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WEBHOOK_SECRET = process.env.PAYPHONE_WEBHOOK_SECRET || "";

function supabaseAdmin() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url) throw new Error("Falta NEXT_PUBLIC_SUPABASE_URL");
    if (!key) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY");
    return createClient(url, key, { auth: { persistSession: false } });
}

const norm = (v: any) => String(v ?? "").trim().toLowerCase();

function isApproved(payload: any): boolean {
    const status =
        payload?.status ??
        payload?.transactionStatus ??
        payload?.data?.status ??
        payload?.data?.transactionStatus ??
        payload?.transaction?.status ??
        payload?.transaction?.transactionStatus ??
        payload?.response?.status ??
        "";

    const s = norm(status);
    return (
        s === "approved" ||
        s === "paid" ||
        s === "success" ||
        s === "2" ||
        s.includes("approved") ||
        s.includes("paid") ||
        s.includes("success")
    );
}

function pickTx(payload: any): string | null {
    const v =
        payload?.clientTransactionId ??
        payload?.clientTxId ??
        payload?.data?.clientTransactionId ??
        payload?.data?.clientTxId ??
        payload?.transaction?.clientTransactionId ??
        payload?.transaction?.clientTxId ??
        payload?.transaction?.reference ??
        payload?.data?.reference ??
        null;

    const s = v == null ? "" : String(v).trim();
    return s ? s : null;
}

function pickPayphoneId(payload: any): string | null {
    const v =
        payload?.id ??
        payload?.transactionId ??
        payload?.data?.id ??
        payload?.data?.transactionId ??
        payload?.transaction?.id ??
        payload?.transaction?.transactionId ??
        null;
    const s = v == null ? "" : String(v).trim();
    return s ? s : null;
}

// Para que al abrir /api/payphone/webhook en navegador no te asuste el 405
export async function GET() {
    return NextResponse.json({ ok: true, message: "PayPhone webhook endpoint (POST only)" }, { status: 200 });
}

export async function POST(req: Request) {
    const sb = supabaseAdmin();

    try {
        // (Opcional) secreto
        if (WEBHOOK_SECRET) {
            const got = req.headers.get("x-webhook-secret") || "";
            if (got !== WEBHOOK_SECRET) {
                return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
            }
        }

        const payload = await req.json().catch(() => null);

        // Log opcional a BD (si existe la tabla)
        try {
            await sb.from("payphone_webhook_logs").insert({
                query: Object.fromEntries(new URL(req.url).searchParams.entries()),
                headers: Object.fromEntries(req.headers.entries()),
                payload,
            });
        } catch {
            // si la tabla no existe o no tiene columnas, no rompemos el flujo
        }

        // Solo aprobados
        if (!payload || !isApproved(payload)) {
            return NextResponse.json({ ok: true, ignored: true }, { status: 200 });
        }

        const tx = pickTx(payload);
        const payphoneId = pickPayphoneId(payload);

        if (!tx) {
            return NextResponse.json(
                { ok: false, error: "Webhook aprobado pero sin clientTransactionId (tx)", payphoneId },
                { status: 200 }
            );
        }

        // 1) Buscar pedido por tx (compatibilidad con tu schema cambiante)
        // - primero por tx
        // - luego por payphone_client_transaction_id (si ese es el que estás usando)
        let pedido: any = null;

        const r1 = await sb
            .from("pedidos")
            .select("id, estado, tx, payphone_client_transaction_id")
            .eq("tx", tx)
            .maybeSingle();

        if (r1.error) {
            return NextResponse.json({ ok: false, error: `Error buscando pedido por tx: ${r1.error.message}` }, { status: 200 });
        }
        pedido = r1.data;

        if (!pedido) {
            const r2 = await sb
                .from("pedidos")
                .select("id, estado, tx, payphone_client_transaction_id")
                .eq("payphone_client_transaction_id", tx)
                .maybeSingle();

            if (r2.error) {
                return NextResponse.json(
                    { ok: false, error: `Error buscando pedido por payphone_client_transaction_id: ${r2.error.message}` },
                    { status: 200 }
                );
            }
            pedido = r2.data;
        }

        if (!pedido?.id) {
            // Aquí está la clave: si no existe pedido, NO inventamos nada.
            // El siguiente paso será crear el pedido EN_PROCESO antes de pagar (intent).
            return NextResponse.json(
                {
                    ok: false,
                    error: "No existe pedido para este tx. Debes crear pedido en_proceso antes del pago.",
                    tx,
                    payphoneId,
                },
                { status: 200 }
            );
        }

        // 2) Marcar pagado (idempotente)
        if (norm(pedido.estado) !== "pagado") {
            const up = await sb.from("pedidos").update({ estado: "pagado", metodo_pago: "payphone" }).eq("id", pedido.id);
            if (up.error) {
                return NextResponse.json({ ok: false, error: `No se pudo marcar pagado: ${up.error.message}` }, { status: 200 });
            }
        }

        // 3) Asignar números SOLO pagado
        // Tu función debe ser idempotente: si ya asignó, retorna alreadyAssigned
        const asign = await asignarNumerosPorTx(tx, true);

        if (!asign.ok) {
            return NextResponse.json(
                { ok: false, pedidoId: pedido.id, tx, error: asign.error },
                { status: 200 }
            );
        }

        return NextResponse.json(
            {
                ok: true,
                pedidoId: pedido.id,
                tx,
                payphoneId,
                numeros: asign.numeros,
                alreadyAssigned: asign.alreadyAssigned,
            },
            { status: 200 }
        );
    } catch (e: any) {
        console.error("💥 WEBHOOK ERROR", e);
        return NextResponse.json({ ok: false, error: e?.message || "Error interno" }, { status: 200 });
    }
}
