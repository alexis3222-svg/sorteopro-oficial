/* ============================================================
DESTINO: app/api/baruk-ai/tarjetas/orders/[id]/transfer-review/route.ts
PROYECTO: sorteopro-rediseño / baruk593.com

Reutiliza la misma RPC y procesarPedidoPagado() que usa el panel admin.
NO modifica PayPhone.
============================================================ */

import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { procesarPedidoPagado } from "@/lib/procesarPedidoPagado";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };
type ReviewAction = "approve" | "not_found";

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

export async function POST(request: NextRequest, context: RouteContext) {
    if (!isAuthorized(request)) {
        return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id: rawId } = await context.params;
        const pedidoId = Number(rawId);
        const body = await request.json().catch(() => null);
        const action: ReviewAction | null =
            body?.action === "approve" || body?.action === "not_found"
                ? body.action
                : null;

        if (!Number.isInteger(pedidoId) || pedidoId <= 0 || !action) {
            return NextResponse.json(
                { ok: false, error: "Solicitud inválida." },
                { status: 400 },
            );
        }

        const { data: pedido, error: pedidoError } = await supabaseAdmin
            .from("pedidos")
            .select(`
                id,
                estado,
                metodo_pago,
                cantidad_numeros,
                total,
                nombre,
                telefono,
                cards_processing_status
            `)
            .eq("id", pedidoId)
            .maybeSingle();

        if (pedidoError) throw pedidoError;
        if (!pedido) {
            return NextResponse.json({ ok: false, error: "Pedido no encontrado." }, { status: 404 });
        }

        if (String(pedido.metodo_pago ?? "").toLowerCase() !== "transferencia") {
            return NextResponse.json(
                { ok: false, error: "El pedido no corresponde a transferencia bancaria." },
                { status: 409 },
            );
        }

        if (action === "not_found") {
            return NextResponse.json({
                ok: true,
                changed: false,
                action,
                pedido: {
                    id: String(pedido.id),
                    numero: `TDS-${pedido.id}`,
                    estado: pedido.estado,
                    cantidad: Number(pedido.cantidad_numeros ?? 0),
                    total: Number(pedido.total ?? 0),
                },
            });
        }

        if (pedido.estado === "cancelado") {
            return NextResponse.json(
                { ok: false, error: "El pedido está cancelado." },
                { status: 409 },
            );
        }

        // Si ya estaba pagado, reintentamos únicamente el procesamiento idempotente.
        if (pedido.estado === "pagado") {
            const processing = await procesarPedidoPagado(pedidoId);
            return NextResponse.json({
                ok: processing.ok,
                changed: false,
                already_paid: true,
                paymentApproved: true,
                pedido: {
                    id: String(pedido.id),
                    numero: `TDS-${pedido.id}`,
                    estado: "pagado",
                    cantidad: Number(pedido.cantidad_numeros ?? 0),
                    total: Number(pedido.total ?? 0),
                },
                processing,
                ...(processing.ok ? {} : { error: processing.error }),
            }, { status: processing.ok ? 200 : 500 });
        }

        const adminId =
            process.env.SUPABASE_ADMIN_USER_ID ??
            process.env.ADMIN_UUID ??
            "1510ca81-fd6a-4d3a-a4c9-ef286ed58145";

        const { data, error: rpcError } = await supabaseAdmin.rpc(
            "admin_aprobar_pedido_y_asignar",
            {
                p_pedido_id: pedidoId,
                p_admin_id: adminId,
                p_modo: "transferencia_admin",
            },
        );

        if (rpcError) {
            console.error("admin_aprobar_pedido_y_asignar:", rpcError);
            return NextResponse.json(
                { ok: false, error: rpcError.message || "No se pudo aprobar el pedido." },
                { status: 500 },
            );
        }

        const row = Array.isArray(data) ? data[0] : data;
        if (!row?.ok) {
            return NextResponse.json(
                { ok: false, error: row?.error || "No se pudo aprobar y asignar el pedido." },
                { status: 500 },
            );
        }

        const processing = await procesarPedidoPagado(pedidoId);

        if (!processing.ok) {
            return NextResponse.json(
                {
                    ok: false,
                    paymentApproved: true,
                    pedidoId,
                    pedido: {
                        id: String(pedido.id),
                        numero: `TDS-${pedido.id}`,
                        estado: "pagado",
                        cantidad: Number(pedido.cantidad_numeros ?? 0),
                        total: Number(pedido.total ?? 0),
                    },
                    processing,
                    error:
                        "El pago fue aprobado, pero Baruk593 todavía no terminó de procesar las Tarjetas. No se debe volver a cobrar al cliente.",
                },
                { status: 500 },
            );
        }

        return NextResponse.json({
            ok: true,
            changed: true,
            paymentApproved: true,
            pedido: {
                id: String(pedido.id),
                numero: `TDS-${pedido.id}`,
                estado: "pagado",
                cantidad: Number(pedido.cantidad_numeros ?? 0),
                total: Number(pedido.total ?? 0),
            },
            numeros: row.numeros || [],
            processing,
        });
    } catch (error) {
        console.error("Baruk AI tarjetas transfer-review error:", error);
        return NextResponse.json(
            { ok: false, error: error instanceof Error ? error.message : "Error interno" },
            { status: 500 },
        );
    }
}
