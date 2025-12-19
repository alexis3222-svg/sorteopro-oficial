// app/api/pedidos/crear/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false },
});

type Body = {
    sorteo_id: string; // uuid
    actividad_numero?: number | null;

    // compra
    cantidad_numeros: number;
    precio_unitario: number;
    total: number;

    // cliente
    nombre?: string | null;
    telefono?: string | null;

    // pago
    metodo_pago: "payphone" | "transferencia";
};

export async function POST(req: NextRequest) {
    try {
        const body = (await req.json().catch(() => null)) as Body | null;

        if (!body) {
            return NextResponse.json({ ok: false, error: "Body inválido" }, { status: 400 });
        }

        const {
            sorteo_id,
            actividad_numero = null,
            cantidad_numeros,
            precio_unitario,
            total,
            nombre = null,
            telefono = null,
            metodo_pago,
        } = body;

        if (!sorteo_id || !metodo_pago || !cantidad_numeros || !precio_unitario || !total) {
            return NextResponse.json(
                { ok: false, error: "Faltan campos requeridos" },
                { status: 400 }
            );
        }

        // ✅ tx controlado por backend (idempotencia / trazabilidad)
        const tx = crypto.randomUUID();

        // ✅ estado inicial
        const estado = metodo_pago === "transferencia" ? "pendiente" : "en_proceso";

        const { data, error } = await supabaseAdmin
            .from("pedidos")
            .insert({
                sorteo_id,
                actividad_numero,
                cantidad_numeros,
                precio_unitario,
                total,
                metodo_pago,
                estado,
                nombre,
                telefono,
                tx,
            })
            .select("id, tx, estado")
            .single();

        if (error) {
            return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ ok: true, pedido: data });
    } catch (e: any) {
        console.error("POST /api/pedidos/crear error:", e);
        return NextResponse.json(
            { ok: false, error: e?.message || "Error interno" },
            { status: 500 }
        );
    }
}
