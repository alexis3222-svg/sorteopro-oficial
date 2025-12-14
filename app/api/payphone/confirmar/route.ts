// app/api/payphone/confirmar/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, serviceKey);

// ⚠️ TODO: aquí debes integrar la verificación REAL con PayPhone (API o webhook)
// Mientras no exista verificación, este endpoint NO confirma pagos (cero curiosos).
async function verificarConPayPhone(_tx: string): Promise<{ paid: boolean; raw?: any }> {
    // ✅ Modo seguro: no confirmar por defecto
    return { paid: false };
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const tx = searchParams.get("tx");

    if (!tx) {
        return NextResponse.json({ ok: false, error: "Falta tx" }, { status: 400 });
    }

    // 1) Verificar con PayPhone
    const verif = await verificarConPayPhone(tx);

    if (!verif.paid) {
        return NextResponse.json(
            { ok: false, estado: "no_confirmado", error: "Pago no confirmado por PayPhone." },
            { status: 409 }
        );
    }

    // 2) Buscar pedido por tx (si existiera)
    const { data: pedido, error: pedidoError } = await supabaseAdmin
        .from("pedidos")
        .select("id, estado")
        .eq("payphone_client_transaction_id", tx)
        .maybeSingle();

    if (pedidoError) {
        return NextResponse.json({ ok: false, error: "Error consultando pedido" }, { status: 500 });
    }

    // 3) Si existe, marcar pagado si hace falta
    let pedidoId = pedido?.id ?? null;

    if (pedidoId && pedido?.estado !== "pagado") {
        const { error: updErr } = await supabaseAdmin
            .from("pedidos")
            .update({ estado: "pagado" })
            .eq("id", pedidoId);

        if (updErr) {
            return NextResponse.json({ ok: false, error: "No se pudo actualizar a pagado" }, { status: 500 });
        }
    }

    // 4) Asignación (si ya tienes tu endpoint / lógica, llámala aquí)
    //    Ej: await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/pedidos/asignar`, ...)
    //    o importar tu función server-side si la tienes.

    return NextResponse.json({ ok: true, estado: "pagado", pedidoId });
}
