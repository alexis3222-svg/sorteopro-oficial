import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { asignarNumerosPorTx } from "@/lib/asignarNumeros";

export const dynamic = "force-dynamic";

const PAYPHONE_TOKEN =
    process.env.PAYPHONE_TOKEN ||
    process.env.PAYPHONE_PRIVATE_TOKEN || // por si lo tienes con otro nombre
    "";

type ConfirmReq = {
    id?: string | number | null; // PayPhone transaction id (REAL)
    tx?: string | null;          // clientTransactionId (TUYO)
    sorteoId?: string | null;
    cantidad?: number | null;
    nombre?: string | null;
    telefono?: string | null;
    correo?: string | null;
    total?: number | null;
    referencia?: string | null;
    metodo_pago?: string | null;
};

async function fetchJson(url: string, options: RequestInit) {
    const r = await fetch(url, options);
    const text = await r.text();
    let json: any = null;
    try {
        json = JSON.parse(text);
    } catch { }
    return { ok: r.ok, status: r.status, json, text };
}

function asString(v: any) {
    return typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();
}

function isApprovedFromPayPhone(payload: any): boolean {
    // PayPhone puede devolver distintas estructuras según endpoint/cuenta.
    // Cubrimos varias:
    const status =
        payload?.status ??
        payload?.transactionStatus ??
        payload?.data?.status ??
        payload?.data?.transactionStatus ??
        payload?.transaction?.status ??
        "";

    const s = String(status).toLowerCase();
    return (
        s.includes("approved") ||
        s.includes("paid") ||
        s.includes("success") ||
        s === "2" // algunos proveedores usan 2=aprobado
    );
}

export async function POST(req: Request) {
    try {
        if (!PAYPHONE_TOKEN) {
            return NextResponse.json(
                { ok: false, estado: "no_confirmado", error: "Falta PAYPHONE_TOKEN (privado) en Vercel." },
                { status: 500 }
            );
        }

        const body = (await req.json()) as ConfirmReq;

        const payphoneId = asString(body.id);
        const clientTx = asString(body.tx);

        if (!payphoneId && !clientTx) {
            return NextResponse.json(
                { ok: false, estado: "no_confirmado", error: "Falta id o tx." },
                { status: 400 }
            );
        }

        // ✅ 1) Confirmar con PayPhone por ID (REAL)
        // Endpoint oficial usado comúnmente:
        // POST https://pay.payphonetodoesposible.com/api/button/V2/Confirm
        // Body: { id: "73235416" }
        let paidConfirmed = false;
        let payphoneRaw: any = null;

        if (payphoneId) {
            const resp = await fetchJson("https://pay.payphonetodoesposible.com/api/button/V2/Confirm", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${PAYPHONE_TOKEN}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ id: Number(payphoneId) || payphoneId }),
                cache: "no-store",
            });

            if (!resp.ok) {
                return NextResponse.json(
                    {
                        ok: false,
                        estado: "no_confirmado",
                        error: "No se pudo confirmar con PayPhone (Confirm V2).",
                        debug: resp.text?.slice(0, 300),
                    },
                    { status: 200 }
                );
            }

            payphoneRaw = resp.json;
            paidConfirmed = isApprovedFromPayPhone(payphoneRaw);
        }

        if (!paidConfirmed) {
            return NextResponse.json(
                {
                    ok: false,
                    estado: "no_confirmado",
                    error: "Pago no confirmado por PayPhone.",
                    payphone: payphoneRaw ?? null,
                },
                { status: 200 }
            );
        }

        // ✅ 2) Crear pedido SOLO aquí (cuando PayPhone aprueba)
        // Evitar duplicados por tx (idempotencia)
        const txToSave = clientTx || `PP-${payphoneId}`;

        const { data: existing } = await supabaseAdmin
            .from("pedidos")
            .select("id, estado, tx")
            .eq("tx", txToSave)
            .maybeSingle();

        let pedidoId: number | null = existing?.id ?? null;

        if (!pedidoId) {
            const insertPayload: any = {
                sorteo_id: body.sorteoId,
                cantidad_numeros: body.cantidad ?? null,
                nombre: body.nombre ?? null,
                telefono: body.telefono ?? null,
                correo: body.correo ?? null,
                total: body.total ?? null,
                metodo_pago: "payphone",
                estado: "pagado",
                tx: txToSave,
                payphone_id: payphoneId || null, // si tienes esta columna; si no existe, quítala
                referencia: body.referencia ?? null, // si tienes esta columna; si no existe, quítala
            };

            const { data: inserted, error: insErr } = await supabaseAdmin
                .from("pedidos")
                .insert(insertPayload)
                .select("id")
                .single();

            if (insErr) {
                return NextResponse.json(
                    { ok: false, estado: "no_confirmado", error: `No se pudo crear pedido: ${insErr.message}` },
                    { status: 500 }
                );
            }

            pedidoId = inserted.id;
        } else {
            // Si existe pero no está pagado, lo ponemos pagado
            await supabaseAdmin
                .from("pedidos")
                .update({ estado: "pagado", metodo_pago: "payphone", payphone_id: payphoneId || null })
                .eq("id", pedidoId);
        }

        // ✅ 3) Asignar números SOLO con estado pagado
        // Tu función ya maneja asignación e idempotencia
        const asignacion = await asignarNumerosPorTx(txToSave, true);

        if (!asignacion.ok) {
            return NextResponse.json(
                { ok: false, estado: "pagado", error: asignacion.error, pedidoId },
                { status: 200 }
            );
        }

        return NextResponse.json(
            {
                ok: true,
                estado: "pagado",
                id: payphoneId,
                tx: txToSave,
                pedidoId,
                numeros: asignacion.numeros,
                alreadyAssigned: asignacion.alreadyAssigned,
            },
            { status: 200 }
        );
    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ ok: false, error: e?.message || "Error interno" }, { status: 500 });
    }
}
