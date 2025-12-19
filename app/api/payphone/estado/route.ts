// app/api/payphone/estado/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
);

export async function GET(req: NextRequest) {
    try {
        const tx = req.nextUrl.searchParams.get("tx")?.trim();

        if (!tx) {
            return NextResponse.json(
                { ok: false, error: "Falta tx" },
                { status: 400 }
            );
        }

        // 1) Revisar pedido por tx (lo ideal es que pedidos tenga columna tx)
        const { data: pedido, error: pedidoErr } = await supabaseAdmin
            .from("pedidos")
            .select("id, estado")
            .eq("tx", tx)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (pedidoErr) {
            return NextResponse.json(
                { ok: false, error: pedidoErr.message },
                { status: 500 }
            );
        }

        // 2) Revisar intent por tx (si existe)
        const { data: intent, error: intentErr } = await supabaseAdmin
            .from("payphone_intents")
            .select("id, status, payphone_id")
            .eq("tx", tx)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (intentErr) {
            return NextResponse.json(
                { ok: false, error: intentErr.message },
                { status: 500 }
            );
        }

        // Normalizamos respuesta
        return NextResponse.json({
            ok: true,
            tx,
            pedido: pedido
                ? { id: pedido.id, estado: pedido.estado }
                : null,
            intent: intent
                ? { id: intent.id, status: intent.status, payphone_id: intent.payphone_id }
                : null,
            // “paid” es verdadero si el pedido ya está pagado
            paid: (pedido?.estado || "").toLowerCase() === "pagado",
        });
    } catch (e: any) {
        console.error("GET /api/payphone/estado error:", e);
        return NextResponse.json(
            { ok: false, error: e?.message || "Error interno" },
            { status: 500 }
        );
    }
}
