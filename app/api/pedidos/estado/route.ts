// app/api/pedidos/estado/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    const clientTxId =
        req.nextUrl.searchParams.get("clientTxId") ||
        req.nextUrl.searchParams.get("tx") ||
        "";

    if (!clientTxId) {
        return NextResponse.json({ ok: false, error: "Falta clientTxId/tx" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
        .from("pedidos")
        .select("id, estado, payphone_id, aprobado_at")
        .eq("payphone_client_transaction_id", clientTxId)
        .maybeSingle();

    // ✅ si no existe, lo decimos explícito
    if (error || !data) {
        return NextResponse.json(
            { ok: true, found: false, estado: "pendiente" },
            { status: 200 }
        );
    }

    return NextResponse.json(
        {
            ok: true,
            found: true,
            pedidoId: data.id,
            estado: data.estado,
            payphoneId: data.payphone_id ?? null,
            aprobadoAt: data.aprobado_at ?? null,
        },
        { status: 200 }
    );
}
