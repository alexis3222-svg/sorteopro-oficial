/* ============================================================
DESTINO: app/api/baruk-ai/tarjetas/orders/lookup/route.ts
PROYECTO: sorteopro-rediseño / baruk593.com
============================================================ */

import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeEqual(a: string, b: string): boolean {
    const aa = Buffer.from(a);
    const bb = Buffer.from(b);
    return aa.length === bb.length && timingSafeEqual(aa, bb);
}

function isAuthorized(request: NextRequest): boolean {
    const secret = process.env.BARUK_AI_INTERNAL_SECRET ?? "";
    const auth = request.headers.get("authorization") ?? "";
    if (!secret || !auth.startsWith("Bearer ")) return false;
    return safeEqual(auth.slice(7), secret);
}

function normalizePhone(value: unknown): string {
    let digits = String(value ?? "").replace(/\D/g, "");
    if (digits.startsWith("00")) digits = digits.slice(2);
    if (digits.startsWith("593")) return digits;
    if (digits.startsWith("0") && digits.length === 10) return `593${digits.slice(1)}`;
    if (digits.startsWith("9") && digits.length === 9) return `593${digits}`;
    return digits;
}

export async function GET(request: NextRequest) {
    if (!isAuthorized(request)) {
        return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const id = Number(request.nextUrl.searchParams.get("id"));
        const phone = normalizePhone(request.nextUrl.searchParams.get("phone"));

        if (!Number.isInteger(id) || id <= 0 || !phone) {
            return NextResponse.json(
                { ok: false, error: "Pedido y teléfono son obligatorios." },
                { status: 400 },
            );
        }

        const { data: pedido, error } = await supabaseAdmin
            .from("pedidos")
            .select(`
                id,
                estado,
                metodo_pago,
                cantidad_numeros,
                precio_unitario,
                total,
                nombre,
                correo,
                telefono,
                tipo_compra,
                cards_processing_status
            `)
            .eq("id", id)
            .maybeSingle();

        if (error) throw error;

        if (!pedido || normalizePhone(pedido.telefono) !== phone) {
            return NextResponse.json(
                { ok: false, error: "Pedido no encontrado." },
                { status: 404 },
            );
        }

        if (String(pedido.metodo_pago ?? "").toLowerCase() !== "transferencia") {
            return NextResponse.json(
                { ok: false, error: "El pedido no corresponde a transferencia bancaria." },
                { status: 409 },
            );
        }

        return NextResponse.json({
            ok: true,
            pedido: {
                id: String(pedido.id),
                numero: `TDS-${pedido.id}`,
                estado: pedido.estado,
                estadoPago: pedido.estado === "pagado" ? "pagado" : "pendiente",
                metodoPago: pedido.metodo_pago,
                cantidad: Number(pedido.cantidad_numeros ?? 0),
                precioUnitario: Number(pedido.precio_unitario ?? 0),
                total: Number(pedido.total ?? 0),
                tipoCompra: pedido.tipo_compra,
                cardsProcessingStatus: pedido.cards_processing_status,
                cliente: {
                    nombre: pedido.nombre,
                    email: pedido.correo,
                },
            },
        });
    } catch (error) {
        console.error("Baruk AI tarjetas order lookup error:", error);
        return NextResponse.json(
            { ok: false, error: "No se pudo consultar el pedido de Tarjetas." },
            { status: 500 },
        );
    }
}
