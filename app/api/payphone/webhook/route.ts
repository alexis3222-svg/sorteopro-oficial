// app/api/payphone/webhook/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

function pickTx(payload: any, searchParams?: URLSearchParams): string | null {
    const v =
        payload?.clientTransactionId ??
        payload?.clientTxId ??
        payload?.data?.clientTransactionId ??
        payload?.data?.clientTxId ??
        payload?.transaction?.clientTransactionId ??
        payload?.transaction?.clientTxId ??
        payload?.transaction?.reference ??
        payload?.data?.reference ??
        searchParams?.get("clientTransactionId") ??
        searchParams?.get("tx") ??
        null;

    const s = v == null ? "" : String(v).trim();
    return s.length ? s : null;
}

// Para poder abrirlo en navegador sin 405
export async function GET() {
    return NextResponse.json({ ok: true, hint: "Use POST (PayPhone webhook)" }, { status: 200 });
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

        const { searchParams } = new URL(req.url);
        const payload = await req.json().catch(() => null);

        // (Opcional) log de diagnóstico si existe tabla payphone_webhook_logs
        try {
            await sb.from("payphone_webhook_logs").insert({
                query: Object.fromEntries(searchParams.entries()),
                headers: {}, // no guardo headers completos por tamaño
                payload: payload ?? null,
            });
        } catch { }

        // Solo aprobados
        if (!payload || !isApproved(payload)) {
            return NextResponse.json({ ok: true, ignored: true }, { status: 200 });
        }

        const tx = pickTx(payload, searchParams);
        if (!tx) {
            return NextResponse.json({ ok: false, error: "Webhook aprobado pero sin tx" }, { status: 200 });
        }

        // 1) Buscar intent (preorden) por tx
        const { data: intent, error: intentErr } = await sb
            .from("payphone_intents")
            .select("tx, sorteo_id, cantidad_numeros, total, nombre, telefono, correo")
            .eq("tx", tx)
            .maybeSingle();

        if (intentErr) {
            return NextResponse.json({ ok: false, error: `Error buscando intent: ${intentErr.message}`, tx }, { status: 200 });
        }

        if (!intent?.sorteo_id || !intent?.cantidad_numeros || intent?.total == null) {
            return NextResponse.json({ ok: false, error: "No existe intent para este tx", tx }, { status: 200 });
        }

        // 2) Idempotencia: si ya existe pedido, no duplicar
        //    OJO: tu schema puede tener tx o payphone_client_transaction_id
        let existingPedidoId: number | null = null;

        // intento A: por columna tx
        {
            const r = await sb.from("pedidos").select("id").eq("tx", tx).maybeSingle();
            if (!r.error && r.data?.id) existingPedidoId = r.data.id;
        }

        // intento B: por columna payphone_client_transaction_id
        if (!existingPedidoId) {
            const r = await sb.from("pedidos").select("id").eq("payphone_client_transaction_id", tx).maybeSingle();
            if (!r.error && r.data?.id) existingPedidoId = r.data.id;
        }

        if (existingPedidoId) {
            // Asegurar estado pagado
            await sb.from("pedidos").update({ estado: "pagado", metodo_pago: "payphone" }).eq("id", existingPedidoId);
            return NextResponse.json({ ok: true, ya_existia: true, pedidoId: existingPedidoId, tx }, { status: 200 });
        }

        // 3) Insert compatible con tu schema:
        //    - Intento 1: usando tx
        //    - Si falla por “columna no existe”, reintenta con payphone_client_transaction_id
        const basePedido: any = {
            sorteo_id: intent.sorteo_id,
            cantidad_numeros: Number(intent.cantidad_numeros),
            total: Number(intent.total),
            metodo_pago: "payphone",
            estado: "pagado",
            nombre: intent.nombre ?? null,
            telefono: intent.telefono ?? null,
            correo: intent.correo ?? null,
        };

        // intento 1: tx
        let insertedId: number | null = null;
        {
            const { data, error } = await sb
                .from("pedidos")
                .insert({ ...basePedido, tx })
                .select("id")
                .single();

            if (!error) insertedId = data.id;

            // si la columna tx no existe, reintenta abajo
            if (error && /column .*tx.* does not exist/i.test(error.message)) {
                insertedId = null;
            } else if (error) {
                return NextResponse.json({ ok: false, error: `No se pudo crear pedido: ${error.message}`, tx }, { status: 200 });
            }
        }

        // intento 2: payphone_client_transaction_id
        if (!insertedId) {
            const { data, error } = await sb
                .from("pedidos")
                .insert({ ...basePedido, payphone_client_transaction_id: tx })
                .select("id")
                .single();

            if (error) {
                return NextResponse.json({ ok: false, error: `No se pudo crear pedido: ${error.message}`, tx }, { status: 200 });
            }
            insertedId = data.id;
        }

        return NextResponse.json({ ok: true, ya_existia: false, pedidoId: insertedId, tx }, { status: 200 });
    } catch (e: any) {
        console.error("💥 WEBHOOK ERROR", e);
        return NextResponse.json({ ok: false, error: e?.message || "Error interno" }, { status: 200 });
    }
}
