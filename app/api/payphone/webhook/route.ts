import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { asignarNumerosPorTx } from "@/lib/asignarNumeros";

export const dynamic = "force-dynamic";

// Si quieres, añade un secreto para que nadie más te dispare el webhook:
// En Vercel: PAYPHONE_WEBHOOK_SECRET=algo
const WEBHOOK_SECRET = process.env.PAYPHONE_WEBHOOK_SECRET || "";

const norm = (v: any) => String(v ?? "").trim().toLowerCase();

function isApproved(payload: any) {
    // Cubrimos distintas formas de PayPhone
    const status =
        payload?.status ??
        payload?.transactionStatus ??
        payload?.data?.status ??
        payload?.data?.transactionStatus ??
        payload?.transaction?.status ??
        payload?.transaction?.transactionStatus ??
        "";

    const s = norm(status);

    return (
        s.includes("approved") ||
        s.includes("paid") ||
        s.includes("success") ||
        s === "approved" ||
        s === "paid" ||
        s === "2"
    );
}

function pickTx(payload: any): string | null {
    return (
        payload?.clientTransactionId ??
        payload?.data?.clientTransactionId ??
        payload?.transaction?.clientTransactionId ??
        payload?.transaction?.reference ??
        null
    );
}

function pickId(payload: any): string | null {
    const v =
        payload?.id ??
        payload?.transactionId ??
        payload?.data?.id ??
        payload?.data?.transactionId ??
        payload?.transaction?.id ??
        payload?.transaction?.transactionId ??
        null;
    return v == null ? null : String(v);
}

export async function POST(req: Request) {
    try {
        // (opcional) Validar secreto
        if (WEBHOOK_SECRET) {
            const got = req.headers.get("x-webhook-secret") || "";
            if (got !== WEBHOOK_SECRET) {
                return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
            }
        }

        const payload = await req.json();

        // 1) validar aprobado
        const approved = isApproved(payload);
        if (!approved) {
            return NextResponse.json({ ok: true, ignored: true }, { status: 200 });
        }

        // 2) extraer tx + id
        const tx = pickTx(payload);
        const payphoneId = pickId(payload);

        if (!tx) {
            // Sin tx no podemos enlazar con tu preorden
            return NextResponse.json(
                { ok: false, error: "Webhook aprobado pero sin clientTransactionId (tx)", payload },
                { status: 200 }
            );
        }

        // 3) Crear pedido SOLO aquí (cuando ya está pagado)
        const { data: existing } = await supabaseAdmin
            .from("pedidos")
            .select("id, estado, tx")
            .eq("tx", tx)
            .maybeSingle();

        let pedidoId: number | null = existing?.id ?? null;

        if (!pedidoId) {
            // ⚠️ Aquí NO tenemos nombre/telefono/cantidad porque tú NO quieres preorden en BD.
            // Se crea pedido mínimo y coherente.
            const { data: inserted, error: insErr } = await supabaseAdmin
                .from("pedidos")
                .insert({
                    tx,
                    metodo_pago: "payphone",
                    estado: "pagado",
                    payphone_id: payphoneId, // quítalo si no existe esa columna
                })
                .select("id")
                .single();

            if (insErr) {
                return NextResponse.json(
                    { ok: false, error: `No se pudo crear pedido: ${insErr.message}` },
                    { status: 200 }
                );
            }

            pedidoId = inserted.id;
        } else if (norm(existing.estado) !== "pagado") {
            await supabaseAdmin
                .from("pedidos")
                .update({ estado: "pagado", metodo_pago: "payphone", payphone_id: payphoneId })
                .eq("id", pedidoId);
        }

        // 4) Asignar números SOLO pagado
        const result = await asignarNumerosPorTx(tx, true);

        if (!result.ok) {
            return NextResponse.json({ ok: false, pedidoId, error: result.error }, { status: 200 });
        }

        return NextResponse.json(
            { ok: true, pedidoId, tx, numeros: result.numeros, alreadyAssigned: result.alreadyAssigned },
            { status: 200 }
        );
    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ ok: false, error: e?.message || "Error interno" }, { status: 500 });
    }
}
