import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CONFIRM_URL = "https://pay.payphonetodoesposible.com/api/button/V2/Confirm";
const MAX_INTENTOS = 12;
const ESPERA_MS = 2000;

type Body = {
    id: string | number; // PayPhone transaction id REAL
    tx: string;          // clientTransactionId (TUYO)
};

function supabaseAdmin() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url) throw new Error("Falta NEXT_PUBLIC_SUPABASE_URL");
    if (!key) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY");
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
        "";

    const s = String(raw ?? "").toLowerCase();
    return s.includes("approved") || s.includes("paid") || s.includes("success") || s === "2";
}

export async function POST(req: Request) {
    try {
        const token = process.env.PAYPHONE_TOKEN;
        if (!token) {
            return NextResponse.json({ ok: false, estado: "error", error: "Falta PAYPHONE_TOKEN (privado) en Vercel." }, { status: 500 });
        }

        // leer body 1 vez
        const body = (await req.json().catch(() => null)) as Body | null;
        const payphoneId = body?.id != null ? String(body.id).trim() : "";
        const tx = body?.tx ? String(body.tx).trim() : "";

        if (!payphoneId || !tx) {
            return NextResponse.json({ ok: false, estado: "error", error: "Faltan datos obligatorios (id, tx)." }, { status: 400 });
        }

        const sb = supabaseAdmin();

        // 1) Buscar intent por tx (ya la estás guardando bien)
        const { data: intent, error: intentErr } = await sb
            .from("payphone_intents")
            .select("tx, sorteo_id, cantidad_numeros, total, nombre, telefono, correo")
            .eq("tx", tx)
            .maybeSingle();

        if (intentErr) {
            return NextResponse.json({ ok: false, estado: "error", error: `Error leyendo intent: ${intentErr.message}` }, { status: 500 });
        }
        if (!intent?.sorteo_id || !intent?.cantidad_numeros || intent?.total == null) {
            return NextResponse.json({ ok: false, estado: "error", error: "No existe intent válida para este tx (sorteo_id/cantidad/total)." }, { status: 400 });
        }

        // 2) Confirmar con PayPhone: OJO -> SOLO { id }
        let approved = false;
        let lastPayload: any = null;

        for (let i = 1; i <= MAX_INTENTOS; i++) {
            const resp = await fetch(CONFIRM_URL, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ id: Number(payphoneId) || payphoneId }),
                cache: "no-store",
            });

            const text = await resp.text();
            try {
                lastPayload = text ? JSON.parse(text) : null;
            } catch {
                lastPayload = { raw: text };
            }

            if (resp.ok && isApproved(lastPayload)) {
                approved = true;
                break;
            }

            if (i < MAX_INTENTOS) await sleep(ESPERA_MS);
        }

        if (!approved) {
            return NextResponse.json(
                { ok: false, estado: "no_confirmado", error: "Pago aún no confirmado por PayPhone.", payphone: lastPayload },
                { status: 200 }
            );
        }

        // 3) Idempotencia: si ya existe pedido por tx, devolverlo
        const { data: existing, error: exErr } = await sb
            .from("pedidos")
            .select("id, estado, tx")
            .eq("tx", tx)
            .maybeSingle();

        if (exErr) {
            return NextResponse.json({ ok: false, estado: "error", error: `Error buscando pedido: ${exErr.message}` }, { status: 500 });
        }

        if (existing?.id) {
            // si existía pero no pagado, lo marcamos pagado (solo si columna existe en tu schema)
            if (String(existing.estado ?? "").toLowerCase() !== "pagado") {
                await sb.from("pedidos").update({ estado: "pagado", metodo_pago: "payphone" }).eq("id", existing.id);
            }
            return NextResponse.json({ ok: true, estado: "pagado", pedidoId: existing.id, ya_existia: true }, { status: 200 });
        }

        // 4) Insertar pedido SOLO con columnas que tú sí tienes
        // (Según tus errores anteriores: NO existe payphone_id ni referencia; NO uses esas)
        const insertPayload: any = {
            sorteo_id: intent.sorteo_id,
            cantidad_numeros: Number(intent.cantidad_numeros),
            total: Number(intent.total),
            metodo_pago: "payphone",
            estado: "pagado",
            tx,
            nombre: intent.nombre ?? null,
            telefono: intent.telefono ?? null,
            correo: intent.correo ?? null,
        };

        const { data: inserted, error: insErr } = await sb
            .from("pedidos")
            .insert(insertPayload)
            .select("id")
            .single();

        if (insErr) {
            return NextResponse.json({ ok: false, estado: "error", error: `No se pudo crear pedido: ${insErr.message}` }, { status: 500 });
        }

        // Si aquí quieres asignar números, hazlo en tu endpoint/función actual después (cuando confirm esté OK)

        return NextResponse.json({ ok: true, estado: "pagado", pedidoId: inserted.id, ya_existia: false }, { status: 200 });
    } catch (e: any) {
        console.error("💥 confirmar error", e);
        return NextResponse.json({ ok: false, estado: "error", error: e?.message || "Error interno" }, { status: 500 });
    }
}
