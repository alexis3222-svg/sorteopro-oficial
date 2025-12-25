import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, // ok usarlo en server, aunque también podrías usar SUPABASE_URL si lo tienes
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // ✅ debe existir en Vercel
    { auth: { persistSession: false } }
);

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => null);

        const sorteoId = body?.sorteoId ?? body?.sorteo_id ?? null;
        const actividadNumero = body?.actividadNumero ?? body?.actividad_numero ?? null;

        const nombre = (body?.nombre ?? "").toString().trim() || null;
        const telefono = (body?.telefono ?? "").toString().trim() || null;
        const correo = (body?.correo ?? "").toString().trim() || null;

        const metodoPago = (body?.metodoPago ?? body?.metodo_pago ?? "").toString().trim();
        const cantidadNumeros = Number(body?.cantidadNumeros ?? body?.cantidad_numeros ?? 0);
        const precioUnitario = Number(body?.precioUnitario ?? body?.precio_unitario ?? 0);
        const total = Number(body?.total ?? 0);

        const clientTransactionId =
            (body?.clientTransactionId ??
                body?.client_transaction_id ??
                body?.tx ??
                "").toString().trim() || null;

        if (!sorteoId) {
            return NextResponse.json({ ok: false, error: "Falta sorteoId" }, { status: 400 });
        }
        if (!metodoPago) {
            return NextResponse.json({ ok: false, error: "Falta metodoPago" }, { status: 400 });
        }
        if (!cantidadNumeros || cantidadNumeros <= 0) {
            return NextResponse.json({ ok: false, error: "cantidadNumeros inválida" }, { status: 400 });
        }

        // ✅ Idempotencia PayPhone: si ya existe pedido con ese clientTxId, devolverlo
        if (metodoPago === "payphone") {
            if (!clientTransactionId) {
                return NextResponse.json(
                    { ok: false, error: "Falta clientTransactionId para PayPhone" },
                    { status: 400 }
                );
            }

            const { data: existing, error: exErr } = await supabaseAdmin
                .from("pedidos")
                .select("id, estado, metodo_pago, payphone_client_transaction_id")
                .eq("payphone_client_transaction_id", clientTransactionId)
                .order("id", { ascending: false })
                .limit(1)
                .maybeSingle();

            // si ya existe, devolvemos y NO insertamos otro
            if (!exErr && existing) {
                return NextResponse.json({ ok: true, pedido: existing, reused: true });
            }
        }

        // ✅ Reglas PRO-1: siempre "pendiente"
        const insertPayload: any = {
            sorteo_id: sorteoId,
            actividad_numero: actividadNumero,
            nombre,
            telefono,
            correo,
            metodo_pago: metodoPago,
            cantidad_numeros: cantidadNumeros,
            precio_unitario: precioUnitario,
            total,
            estado: "pendiente",
        };

        if (metodoPago === "payphone") {
            insertPayload.payphone_client_transaction_id = clientTransactionId;
        }

        const { data, error } = await supabaseAdmin
            .from("pedidos")
            .insert(insertPayload)
            .select("id, estado, metodo_pago, payphone_client_transaction_id")
            .single();

        if (error || !data) {
            return NextResponse.json(
                { ok: false, error: error?.message || "No se pudo crear pedido" },
                { status: 500 }
            );
        }

        return NextResponse.json({ ok: true, pedido: data, reused: false });
    } catch (e: any) {
        console.error("pedidos/crear error:", e);
        return NextResponse.json({ ok: false, error: e?.message || "Error interno" }, { status: 500 });
    }
}
