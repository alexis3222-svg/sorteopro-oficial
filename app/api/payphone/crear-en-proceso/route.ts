// app/api/payphone/crear-en-proceso/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Preorden = {
    sorteoId: string;
    cantidad: number;
    total: number;
    nombre?: string | null;
    telefono?: string | null;
    correo?: string | null;
};

function supabaseAdmin() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url) throw new Error("Falta NEXT_PUBLIC_SUPABASE_URL");
    if (!key) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY");
    return createClient(url, key, { auth: { persistSession: false } });
}

function asText(v: any) {
    return String(v ?? "").trim();
}

async function findPedidoByTx(sb: any, tx: string) {
    // intento 1: columna tx
    {
        const { data, error } = await sb
            .from("pedidos")
            .select("id, estado")
            .eq("tx", tx)
            .maybeSingle();

        if (!error) return { data, used: "tx" as const };
        // si falla por columna inexistente, probamos alternativa
        if (!String(error.message || "").toLowerCase().includes("column")) {
            return { data: null, used: "tx" as const, error };
        }
    }

    // intento 2: columna payphone_client_transaction_id
    {
        const { data, error } = await sb
            .from("pedidos")
            .select("id, estado")
            .eq("payphone_client_transaction_id", tx)
            .maybeSingle();

        if (!error) return { data, used: "payphone_client_transaction_id" as const };
        return { data: null, used: "payphone_client_transaction_id" as const, error };
    }
}

async function insertPedidoEnProceso(sb: any, tx: string, preorden: Preorden) {
    const base = {
        sorteo_id: preorden.sorteoId,
        cantidad_numeros: Number(preorden.cantidad),
        total: Number(preorden.total),
        metodo_pago: "payphone",
        estado: "en_proceso",
        // NO ponemos columnas opcionales (payphone_id, referencia, etc.)
    };

    // intento 1: con columna tx
    {
        const { data, error } = await sb
            .from("pedidos")
            .insert({ ...base, tx })
            .select("id, estado")
            .single();

        if (!error) return { data, used: "tx" as const };
        if (!String(error.message || "").toLowerCase().includes("column")) {
            return { data: null, used: "tx" as const, error };
        }
    }

    // intento 2: con columna payphone_client_transaction_id
    {
        const { data, error } = await sb
            .from("pedidos")
            .insert({ ...base, payphone_client_transaction_id: tx })
            .select("id, estado")
            .single();

        if (!error) return { data, used: "payphone_client_transaction_id" as const };
        return { data: null, used: "payphone_client_transaction_id" as const, error };
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json().catch(() => null);
        const tx = asText(body?.tx);
        const preorden = body?.preorden as Preorden | null;

        if (!tx) {
            return NextResponse.json({ ok: false, error: "Falta tx" }, { status: 400 });
        }
        if (!preorden?.sorteoId || !preorden?.cantidad || preorden?.total == null) {
            return NextResponse.json(
                { ok: false, error: "Falta preorden (sorteoId/cantidad/total)" },
                { status: 400 }
            );
        }

        const sb = supabaseAdmin();

        // 1) idempotencia
        const found = await findPedidoByTx(sb, tx);
        if (found?.data?.id) {
            return NextResponse.json(
                { ok: true, ya_existia: true, pedidoId: found.data.id, estado: found.data.estado, key: found.used },
                { status: 200 }
            );
        }

        // 2) crear EN_PROCESO
        const created = await insertPedidoEnProceso(sb, tx, preorden);
        if (!created?.data?.id) {
            return NextResponse.json(
                { ok: false, error: created?.error?.message || "No se pudo crear pedido en_proceso", debug: created?.error },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { ok: true, ya_existia: false, pedidoId: created.data.id, estado: created.data.estado, key: created.used },
            { status: 200 }
        );
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: e?.message || "Error interno" }, { status: 500 });
    }
}
