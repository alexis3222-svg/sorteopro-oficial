import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    const clientTxId = req.nextUrl.searchParams.get("clientTxId");

    if (!clientTxId) {
        return NextResponse.json({ error: "Falta clientTxId" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
        .from("pedidos")
        .select("estado")
        .eq("payphone_client_transaction_id", clientTxId)
        .single();

    if (error || !data) {
        return NextResponse.json({ estado: "pendiente" }, { status: 200 });
    }

    return NextResponse.json({ estado: data.estado }, { status: 200 });
}
