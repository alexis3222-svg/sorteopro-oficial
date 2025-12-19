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

function isApproved(payload: any) {
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
    return s.includes("approved") || s.includes("paid") || s.includes("success") || s === "2";
}

function pickTx(payload: any, queryTx: string | null): string | null {
    const v =
        queryTx ||
        payload?.clientTransactionId ||
        payload?.clientTxId ||
        payload?.data?.clientTransactionId ||
        payload?.data?.clientTxId ||
        payload?.transaction?.clientTransactionId ||
        payload?.transaction?.clientTxId ||
        payload?.transaction?.reference ||
        payload?.data?.reference ||
        null;

    const tx = v == null ? null : String(v).trim();
    return tx && tx.length > 0 ? tx : null;
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

    const id = v == null ? null : String(v).trim();
    return id && id.length > 0 ? id : null;
}

// ---- helpers “tolerantes al esquema” ----

async function findPedidoByTx(sb: any, tx: string) {
    // Intentamos por 'tx' y si no existe columna, caemos a 'payphone_client_transaction_id'
    // (PostgREST devuelve error "column ... does not exist" o "schema cache")
    const try1 = await sb.from("pedidos").select("id, estado").eq("tx", tx).maybeSingle();
    if (!try1.error) return { data: try1.data, used: "tx" as const };

    const msg = String(try1.error.message || "");
    if (!msg.toLowerCase().includes("column") && !msg.toLowerCase().includes("schema cache")) {
        return { data: null, used: "tx" as const, hardError: try1.error };
    }

    const try2 = await sb
        .from("pedidos")
        .select("id, estado")
        .eq("payphone_client_transaction_id", tx)
        .maybeSingle();

    if (try2.error) return { data: null, used: "payphone_client_transaction_id" as const, hardError: try2.error };
    return { data: try2.data, used: "payphone_client_transaction_id" as const };
}

async function insertPedidoFromIntent(sb: any, tx: string, intent: any, payphoneId: string | null) {
    // Payload mínimo “seguro”
    const base: any = {
        sorteo_id: intent.sorteo_id,
        cantidad_numeros: Number(intent.cantidad_numeros),
        total: Number(intent.total),
        metodo_pago: "payphone",
        estado: "pagado",
    };

    // Intento 1: usando columna tx
    {
        const payload: any = { ...base, tx };
        // columnas opcionales solo si existen (las probamos sin romper el insert si fallan)
        // NO agregamos referencia/payphone_id porque ya viste que a veces NO existen.
        const res = await sb.from("pedidos").insert(payload).select("id").single();
        if (!res.error) return { id: res.data.id, used: "tx" as const };

        const msg = String(res.error.message || "").toLowerCase();
        if (!msg.includes("column") && !msg.includes("schema cache")) {
            throw res.error;
        }
        // si falla por columna tx inexistente, caemos al intento 2
    }

    // Intento 2: usando payphone_client_transaction_id
    {
        const payload: any = { ...base, payphone_client_transaction_id: tx };
        const res = await sb.from("pedidos").insert(payload).select("id").single();
        if (!res.error) return { id: res.data.id, used: "payphone_client_transaction_id" as const };

        throw res.error;
    }
}

async function markPedidoPagado(sb: any, pedidoId: number) {
    await sb.from("pedidos").update({ estado: "pagado", metodo_pago: "payphone" }).eq("id", pedidoId);
}

async function logWebhook(sb: any, req: Request, payload: any, query: Record<string, any>) {
    // si no existe la tabla, no bloquea el flujo
    try {
        const headersObj: Record<string, string> = {};
        req.headers.forEach((v, k) => (headersObj[k] = v));
        await sb.from("payphone_webhook_logs").insert({
            query,
            headers: headersObj,
            payload,
        });
    } catch {
        // ignore
    }
}

// ---- route ----

export async function POST(req: Request) {
    const sb = supabaseAdmin();

    try {
        // secreto opcional
        if (WEBHOOK_SECRET) {
            const got = req.headers.get("x-webhook-secret") || "";
            if (got !== WEBHOOK_SECRET) {
                return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
            }
        }

        const url = new URL(req.url);
        const queryTx = url.searchParams.get("tx") || url.searchParams.get("clientTransactionId");

        const payload = await req.json().catch(() => null);

        await logWebhook(sb, req, payload, Object.fromEntries(url.searchParams.entries()));

        // solo aprobados
        if (!payload || !isApproved(payload)) {
            return NextResponse.json({ ok: true, ignored: true }, { status: 200 });
        }

        const tx = pickTx(payload, queryTx);
        const payphoneId = pickPayphoneId(payload);

        if (!tx) {
            return NextResponse.json({ ok: false, error: "Aprobado pero sin tx/clientTransactionId" }, { status: 200 });
        }

        // 1) buscar intent (de aquí sale sorteo_id/cantidad/total)
        const { data: intent, error: intentErr } = await sb
            .from("payphone_intents")
            .select("sorteo_id, cantidad_numeros, total")
            .eq("tx", tx)
            .maybeSingle();

        if (intentErr) {
            return NextResponse.json({ ok: false, error: `Error buscando intent: ${intentErr.message}`, tx }, { status: 200 });
        }

        if (!intent?.sorteo_id || !intent?.cantidad_numeros || intent?.total == null) {
            return NextResponse.json({ ok: false, error: "No existe intent para este tx", tx }, { status: 200 });
        }

        // 2) idempotencia: buscar pedido por tx (según tu esquema real)
        const found = await findPedidoByTx(sb, tx);
        if ((found as any).hardError) {
            return NextResponse.json({ ok: false, error: (found as any).hardError.message, tx }, { status: 200 });
        }

        if (found.data?.id) {
            if (norm(found.data.estado) !== "pagado") {
                await markPedidoPagado(sb, found.data.id);
            }

            // asignar números (idempotente)
            const r = await asignarNumerosPorTx(tx, true).catch((e: any) => ({
                ok: false,
                error: e?.message || "Error asignando números",
            }));

            return NextResponse.json(
                { ok: true, ya_existia: true, pedidoId: found.data.id, tx, payphoneId, asignacion: r },
                { status: 200 }
            );
        }

        // 3) crear pedido (desde intent) con fallback de columnas
        const created = await insertPedidoFromIntent(sb, tx, intent, payphoneId);

        // 4) asignar números (solo pagado)
        const result = await asignarNumerosPorTx(tx, true);

        return NextResponse.json(
            { ok: true, ya_existia: false, pedidoId: created.id, tx, payphoneId, asignacion: result },
            { status: 200 }
        );
    } catch (e: any) {
        console.error("💥 WEBHOOK ERROR", e);
        return NextResponse.json({ ok: false, error: e?.message || "Error interno" }, { status: 200 });
    }
}

// Para que abrir /api/payphone/webhook en el navegador NO te muestre “405”
export async function GET(req: Request) {
    return NextResponse.json(
        { ok: true, tip: "Este endpoint es POST (webhook). Usa POST desde PayPhone o Postman." },
        { status: 200 }
    );
}
