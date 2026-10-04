/* ============================================================
DESTINO:
app/api/baruk-ai/shop/orders/[id]/fulfillment/route.ts

PROYECTO:
sorteopro-rediseño / baruk593.com

FUNCIÓN:
- GET: devuelve estado real del pedido al Sales Inbox.
- POST: avanza la postventa secuencialmente.
- Protegido por BARUK_AI_INTERNAL_SECRET.
============================================================ */

import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
    params: Promise<{ id: string }>;
};

type FulfillmentStatus =
    | "pending"
    | "preparing"
    | "ready_to_ship"
    | "shipped"
    | "delivered";

const NEXT_STATUS: Record<FulfillmentStatus, FulfillmentStatus | null> = {
    pending: "preparing",
    preparing: "ready_to_ship",
    ready_to_ship: "shipped",
    shipped: "delivered",
    delivered: null,
};

function safeEqual(a: string, b: string): boolean {
    const aa = Buffer.from(a);
    const bb = Buffer.from(b);

    return aa.length === bb.length && timingSafeEqual(aa, bb);
}

function isAuthorized(request: NextRequest): boolean {
    const secret = process.env.BARUK_AI_INTERNAL_SECRET ?? "";

    if (!secret) return false;

    const authorization =
        request.headers.get("authorization") ?? "";

    if (!authorization.startsWith("Bearer ")) return false;

    return safeEqual(
        authorization.slice(7),
        secret
    );
}

function isFulfillmentStatus(
    value: unknown
): value is FulfillmentStatus {
    return (
        value === "pending" ||
        value === "preparing" ||
        value === "ready_to_ship" ||
        value === "shipped" ||
        value === "delivered"
    );
}

async function loadOrder(id: string) {
    const { data, error } =
        await supabaseAdmin
            .from("store_orders")
            .select(`
                id,
                order_number,
                total,
                metodo_pago,
                estado,
                estado_pago,
                fulfillment_status,
                fulfillment_updated_at,
                fulfillment_updated_by_id,
                fulfillment_updated_by_name
            `)
            .eq("id", id)
            .maybeSingle();

    if (error) throw error;

    return data;
}

function serializeOrder(order: any) {
    const fulfillmentStatus: FulfillmentStatus =
        isFulfillmentStatus(order?.fulfillment_status)
            ? order.fulfillment_status
            : "pending";

    return {
        id: order.id,
        numero: order.order_number,
        total: order.total,
        metodoPago: order.metodo_pago,
        estado: order.estado,
        estadoPago: order.estado_pago,
        fulfillmentStatus,
        fulfillmentUpdatedAt:
            order.fulfillment_updated_at ?? null,
        fulfillmentUpdatedBy: {
            id:
                order.fulfillment_updated_by_id ??
                null,
            name:
                order.fulfillment_updated_by_name ??
                null,
        },
    };
}

export async function GET(
    request: NextRequest,
    context: RouteContext
) {
    if (!isAuthorized(request)) {
        return NextResponse.json(
            { ok: false, error: "Unauthorized" },
            { status: 401 }
        );
    }

    try {
        const { id } = await context.params;
        const order = await loadOrder(id);

        if (!order) {
            return NextResponse.json(
                { ok: false, error: "Pedido no encontrado." },
                { status: 404 }
            );
        }

        return NextResponse.json({
            ok: true,
            pedido: serializeOrder(order),
        });
    } catch (error) {
        console.error(
            "Baruk593 fulfillment GET error:",
            error
        );

        return NextResponse.json(
            {
                ok: false,
                error: "No se pudo consultar el pedido.",
            },
            { status: 500 }
        );
    }
}

export async function POST(
    request: NextRequest,
    context: RouteContext
) {
    if (!isAuthorized(request)) {
        return NextResponse.json(
            { ok: false, error: "Unauthorized" },
            { status: 401 }
        );
    }

    try {
        const { id } = await context.params;
        const body = await request.json().catch(() => null);

        const requestedStatus = body?.status;
        const actorId =
            typeof body?.actor_id === "string"
                ? body.actor_id.trim()
                : "";
        const actorName =
            typeof body?.actor_name === "string"
                ? body.actor_name.trim()
                : "";

        if (
            !isFulfillmentStatus(requestedStatus) ||
            requestedStatus === "pending"
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Estado logístico inválido.",
                },
                { status: 400 }
            );
        }

        const order = await loadOrder(id);

        if (!order) {
            return NextResponse.json(
                { ok: false, error: "Pedido no encontrado." },
                { status: 404 }
            );
        }

        if (
            String(order.estado_pago ?? "")
                .trim()
                .toLowerCase() !== "pagado"
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "El pedido todavía no está pagado.",
                },
                { status: 409 }
            );
        }

        const currentStatus: FulfillmentStatus =
            isFulfillmentStatus(order.fulfillment_status)
                ? order.fulfillment_status
                : "pending";

        if (currentStatus === requestedStatus) {
            return NextResponse.json({
                ok: true,
                changed: false,
                pedido: serializeOrder(order),
            });
        }

        const expectedNext =
            NEXT_STATUS[currentStatus];

        if (expectedNext !== requestedStatus) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        `Transición no permitida: ${currentStatus} → ${requestedStatus}.`,
                },
                { status: 409 }
            );
        }

        const now = new Date().toISOString();

        const { data: updated, error: updateError } =
            await supabaseAdmin
                .from("store_orders")
                .update({
                    fulfillment_status:
                        requestedStatus,
                    fulfillment_updated_at:
                        now,
                    fulfillment_updated_by_id:
                        actorId || null,
                    fulfillment_updated_by_name:
                        actorName || null,
                })
                .eq("id", order.id)
                .eq(
                    "fulfillment_status",
                    currentStatus
                )
                .select(`
                    id,
                    order_number,
                    total,
                    metodo_pago,
                    estado,
                    estado_pago,
                    fulfillment_status,
                    fulfillment_updated_at,
                    fulfillment_updated_by_id,
                    fulfillment_updated_by_name
                `)
                .maybeSingle();

        if (updateError) throw updateError;

        if (!updated) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "El pedido cambió de estado mientras se procesaba. Actualiza e intenta nuevamente.",
                },
                { status: 409 }
            );
        }

        return NextResponse.json({
            ok: true,
            changed: true,
            pedido: serializeOrder(updated),
        });
    } catch (error) {
        console.error(
            "Baruk593 fulfillment POST error:",
            error
        );

        return NextResponse.json(
            {
                ok: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "No se pudo actualizar la postventa.",
            },
            { status: 500 }
        );
    }
}
