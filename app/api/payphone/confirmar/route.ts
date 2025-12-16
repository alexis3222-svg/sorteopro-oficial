import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { asignarNumerosPorTx } from "@/lib/asignarNumeros";

export const dynamic = "force-dynamic";

const PAYPHONE_TOKEN =
    process.env.PAYPHONE_TOKEN ??
    process.env.NEXT_PUBLIC_PAYPHONE_TOKEN ??
    "";

async function fetchJson(url: string, options: RequestInit) {
    const r = await fetch(url, options);
    const text = await r.text();
    let json: any = null;
    try {
        json = JSON.parse(text);
    } catch { }
    return { ok: r.ok, status: r.status, json, text };
}

async function confirmarPayphone(identifier: string) {
    const confirmUrl =
        "https://pay.payphonetodoesposible.com/api/button/V2/Confirm";

    const resp = await fetchJson(confirmUrl, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${PAYPHONE_TOKEN}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: identifier }),
        cache: "no-store",
    });

    if (!resp.ok) {
        return { ok: false, approved: false, data: resp.json, debug: resp.text };
    }

    const data = resp.json ?? {};
    const statusRaw =
        data?.transactionStatus ??
        data?.data?.transactionStatus ??
        data?.status ??
        data?.data?.status ??
        "";

    const status = String(statusRaw).toLowerCase();
    const approved =
        status === "approved" ||
        status.includes("approved") ||
        status.includes("paid") ||
        status.includes("success");

    const clientTransactionId =
        data?.clientTransactionId ??
        data?.data?.clientTransactionId ??
        null;

    return { ok: true, approved, data, clientTransactionId };
}

// ✅ GET: solo confirma (mantener compatibilidad)
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const tx = searchParams.get("tx")?.trim() || null;
        const id = searchParams.get("id")?.trim() || null;
        const identifier = id || tx;

        if (!identifier) {
            return NextResponse.json({ ok: false, error: "Falta tx o id" }, { status: 400 });
        }
        if (!PAYPHONE_TOKEN) {
            return NextResponse.json({ ok: false, error: "Falta PAYPHONE_TOKEN" }, { status: 500 });
        }

        const conf = await confirmarPayphone(identifier);

        if (!conf.ok || !conf.approved) {
            return NextResponse.json(
                { ok: false, estado: "no_confirmado", payphone: conf.data, debug: conf.debug?.slice(0, 250) },
                { status: 200 }
            );
        }

        // ✅ Si está aprobado, aquí NO creamos pedido en GET (solo confirmación)
        return NextResponse.json(
            { ok: true, estado: "pagado", tx: conf.clientTransactionId ?? tx ?? identifier, payphone: conf.data },
            { status: 200 }
        );
    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ ok: false, error: e?.message || "Error interno" }, { status: 500 });
    }
}

// ✅ POST: confirma + crea pedido + asigna números
export async function POST(req: Request) {
    try {
        if (!PAYPHONE_TOKEN) {
            return NextResponse.json({ ok: false, error: "Falta PAYPHONE_TOKEN" }, { status: 500 });
        }

        const body = await req.json().catch(() => null);

        const tx = String(body?.tx ?? "").trim();
        const id = String(body?.id ?? "").trim(); // opcional
        const identifier = id || tx;

        if (!identifier) {
            return NextResponse.json({ ok: false, error: "Falta tx o id" }, { status: 400 });
        }

        // datos de la preorden (del navegador)
        const sorteoId = body?.sorteoId ?? null;
        const cantidad = body?.cantidad ?? null;
        const nombre = body?.nombre ?? null;
        const telefono = body?.telefono ?? null;
        const correo = body?.correo ?? null;
        const total = body?.total ?? null;
        const referencia = body?.referencia ?? null;

        if (!sorteoId || !cantidad || !total) {
            return NextResponse.json(
                { ok: false, error: "Faltan datos de preorden (sorteoId/cantidad/total)" },
                { status: 400 }
            );
        }

        // 1) confirmar PayPhone
        const conf = await confirmarPayphone(identifier);

        if (!conf.ok || !conf.approved) {
            return NextResponse.json(
                { ok: false, estado: "no_confirmado", payphone: conf.data, debug: conf.debug?.slice(0, 250) },
                { status: 200 }
            );
        }

        const clientTransactionId = conf.clientTransactionId ?? tx ?? identifier;

        // 2) obtener actividad_numero y precio_unitario desde sorteos (para pedido coherente)
        const { data: sorteoRow } = await supabaseAdmin
            .from("sorteos")
            .select("actividad_numero, precio_numero")
            .eq("id", sorteoId)
            .maybeSingle();

        const actividad_numero = sorteoRow?.actividad_numero ?? null;
        const precio_unitario =
            sorteoRow?.precio_numero ?? (cantidad ? Number(total) / Number(cantidad) : null);

        // 3) crear pedido SOLO AHORA (pagado)
        // Nota: intentamos guardar tx en un campo si existe. Si no existe, igual crea pedido.
        const basePedido: any = {
            sorteo_id: sorteoId,
            actividad_numero,
            cantidad_numeros: Number(cantidad),
            precio_unitario: precio_unitario ?? null,
            total: Number(total),
            metodo_pago: "payphone",
            estado: "pagado",
            nombre,
            telefono,
            correo,
            referencia,
        };

        let inserted: any = null;

        // intento 1: con columna tx
        {
            const payload = { ...basePedido, tx: clientTransactionId };
            const { data, error } = await supabaseAdmin
                .from("pedidos")
                .insert(payload)
                .select("id")
                .single();

            if (!error) inserted = data;
            else {
                // intento 2: con columna client_transaction_id
                const payload2 = { ...basePedido, client_transaction_id: clientTransactionId };
                const r2 = await supabaseAdmin
                    .from("pedidos")
                    .insert(payload2)
                    .select("id")
                    .single();

                if (!r2.error) inserted = r2.data;
                else {
                    // intento 3: sin tx (por si no existe ninguna columna)
                    const r3 = await supabaseAdmin
                        .from("pedidos")
                        .insert(basePedido)
                        .select("id")
                        .single();

                    if (r3.error) {
                        return NextResponse.json(
                            { ok: false, estado: "error", error: "No se pudo crear el pedido.", debug: r3.error.message },
                            { status: 500 }
                        );
                    }
                    inserted = r3.data;
                }
            }
        }

        // 4) asignar números (tu función actual)
        const result = await asignarNumerosPorTx(clientTransactionId);

        if (!result.ok) {
            return NextResponse.json(
                { ok: false, estado: "error", error: result.error, pedidoId: inserted?.id },
                { status: 500 }
            );
        }

        return NextResponse.json(
            {
                ok: true,
                estado: "pagado",
                tx: clientTransactionId,
                pedidoId: inserted?.id,
                numeros: result.numeros ?? [],
                alreadyAssigned: result.alreadyAssigned ?? false,
                payphone: conf.data,
            },
            { status: 200 }
        );
    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ ok: false, error: e?.message || "Error interno" }, { status: 500 });
    }
}
