// app/api/payphone/confirmar/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CONFIRM_URL = "https://pay.payphonetodoesposible.com/api/button/V2/Confirm";
const MAX_INTENTOS = 12;
const ESPERA_MS = 2000;

type Preorden = {
    sorteoId: string;
    cantidad: number;
    total: number;
    nombre?: string | null;
    telefono?: string | null;
    correo?: string | null;
    referencia?: string | null;
};

type Body = {
    id: string | number; // PayPhone transaction id
    tx: string; // clientTransactionId
    preorden: Preorden;
};

function supabaseAdmin() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url) throw new Error("Falta NEXT_PUBLIC_SUPABASE_URL en Vercel");
    if (!key) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY en Vercel");

    return createClient(url, key, { auth: { persistSession: false } });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function isApproved(payload: any): boolean {
    const raw =
        payload?.transactionStatus ??
        payload?.status ??
        payload?.data?.transactionStatus ??
        payload?.data?.status ??
        payload?.transaction?.status ??
        payload?.transaction?.transactionStatus ??
        "";
    const s = String(raw).toLowerCase();
    return s.includes("approved") || s.includes("paid") || s.includes("success") || s === "2";
}

async function tryConfirmVariants(token: string, payphoneId: string, tx: string) {
    const idNum = Number(payphoneId);

    const variants: Array<{ auth: string; body: any; label: string }> = [
        { auth: `Bearer ${token}`, body: { id: idNum }, label: "bearer+id" },
        { auth: `Bearer ${token}`, body: { id: idNum, clientTxId: tx }, label: "bearer+id+clientTxId" },
        { auth: token, body: { id: idNum }, label: "raw+id" },
        { auth: token, body: { id: idNum, clientTxId: tx }, label: "raw+id+clientTxId" },
    ];

    let last: any = null;

    for (const v of variants) {
        const resp = await fetch(CONFIRM_URL, {
            method: "POST",
            headers: {
                Authorization: v.auth,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(v.body),
            cache: "no-store",
        });

        const text = await resp.text();
        let json: any = null;
        try {
            json = text ? JSON.parse(text) : null;
        } catch {
            json = { raw: text };
        }

        last = { label: v.label, status: resp.status, ok: resp.ok, json };

        if (resp.ok && isApproved(json)) {
            return { approved: true, payload: json, debug: last };
        }
    }

    return { approved: false, payload: last?.json ?? null, debug: last };
}

export async function POST(req: Request) {
    try {
        const token = process.env.PAYPHONE_TOKEN;
        if (!token) {
            return NextResponse.json({ ok: false, estado: "error", error: "Falta PAYPHONE_TOKEN en Vercel" }, { status: 500 });
        }

        const body = (await req.json()) as Body;

        const payphoneId = body?.id != null ? String(body.id).trim() : "";
        const tx = body?.tx ? String(body.tx).trim() : "";
        const preorden = body?.preorden;

        if (!payphoneId || !tx || !preorden?.sorteoId || !preorden?.cantidad || !preorden?.total) {
            return NextResponse.json(
                { ok: false, estado: "error", error: "Faltan datos obligatorios (id, tx, preorden)" },
                { status: 400 }
            );
        }

        // 1) Confirmar PayPhone (con reintentos)
        let approved = false;
        let lastPayload: any = null;
        let lastDebug: any = null;

        for (let intento = 1; intento <= MAX_INTENTOS; intento++) {
            const r = await tryConfirmVariants(token, payphoneId, tx);
            approved = r.approved;
            lastPayload = r.payload;
            lastDebug = r.debug;

            if (approved) break;
            if (intento < MAX_INTENTOS) await sleep(ESPERA_MS);
        }

        if (!approved) {
            return NextResponse.json(
                {
                    ok: false,
                    estado: "pendiente",
                    error: "Pago aún no confirmado por PayPhone.",
                    payphone: lastPayload,
                    debug: lastDebug, // deja esto para ver qué variante responde
                },
                { status: 200 }
            );
        }

        const sb = supabaseAdmin();

        // 2) Idempotencia por tx (si ya existe pedido, devolverlo)
        const { data: existente, error: exErr } = await sb
            .from("pedidos")
            .select("id")
            .eq("tx", tx)
            .maybeSingle();

        if (exErr) {
            return NextResponse.json({ ok: false, estado: "error", error: exErr.message }, { status: 500 });
        }

        if (existente?.id) {
            return NextResponse.json({ ok: true, estado: "pagado", pedidoId: existente.id, ya_existia: true }, { status: 200 });
        }

        // 3) Crear pedido SOLO aquí (pagado)
        const insertPayload: any = {
            sorteo_id: preorden.sorteoId,
            cantidad_numeros: Number(preorden.cantidad),
            total: Number(preorden.total),
            metodo_pago: "payphone",
            estado: "pagado",
            tx,
            // OJO: NO metas columnas que no existen (payphone_id, referencia, etc.) en este commit estable.
            nombre: preorden.nombre ?? null,
            telefono: preorden.telefono ?? null,
            correo: preorden.correo ?? null,
        };

        const { data: inserted, error: insErr } = await sb.from("pedidos").insert(insertPayload).select("id").single();

        if (insErr) {
            return NextResponse.json(
                { ok: false, estado: "error", error: `No se pudo crear el pedido: ${insErr.message}` },
                { status: 500 }
            );
        }

        return NextResponse.json({ ok: true, estado: "pagado", pedidoId: inserted.id, ya_existia: false }, { status: 200 });
    } catch (e: any) {
        return NextResponse.json({ ok: false, estado: "error", error: e?.message || "Error interno" }, { status: 500 });
    }
}
