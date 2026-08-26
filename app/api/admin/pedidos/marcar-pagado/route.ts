import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { procesarPedidoPagado } from "@/lib/procesarPedidoPagado";
import {
    ADMIN_COOKIE,
    verifyAdminSessionToken,
} from "@/lib/adminSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function isAdmin(req: NextRequest): Promise<boolean> {
    const token = req.cookies.get(ADMIN_COOKIE)?.value;
    return verifyAdminSessionToken(token);
}

export async function POST(req: NextRequest) {
    try {
        /* ============================================================
           0. VALIDAR SESIÓN ADMINISTRATIVA
        ============================================================ */
        if (!(await isAdmin(req))) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "No autorizado",
                },
                {
                    status: 401,
                },
            );
        }

        const body = await req.json().catch(() => null);
        const pedidoId = Number(body?.pedidoId);

        if (!pedidoId || Number.isNaN(pedidoId)) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Falta pedidoId válido",
                },
                {
                    status: 400,
                },
            );
        }

        /* ============================================================
           1. LEER PEDIDO
        ============================================================ */
        const { data: pedido, error: pedidoErr } =
            await supabaseAdmin
                .from("pedidos")
                .select("id, metodo_pago")
                .eq("id", pedidoId)
                .single();

        if (pedidoErr || !pedido) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Pedido no encontrado",
                },
                {
                    status: 404,
                },
            );
        }

        /* ============================================================
           2. ADMIN ID

           Se conserva el ID que ya utiliza tu RPC para no modificar
           la lógica existente de aprobación.
        ============================================================ */
        const adminId =
            "1510ca81-fd6a-4d3a-a4c9-ef286ed58145";

        /* ============================================================
           3. MODO SEGÚN MÉTODO DE PAGO
        ============================================================ */
        const metodo = String(
            pedido.metodo_pago ?? "",
        ).toLowerCase();

        const modo =
            metodo === "transferencia"
                ? "transferencia_admin"
                : "manual_admin";

        /* ============================================================
           4. APROBAR Y ASIGNAR MEDIANTE LA RPC EXISTENTE
        ============================================================ */
        const { data, error: rpcErr } =
            await supabaseAdmin.rpc(
                "admin_aprobar_pedido_y_asignar",
                {
                    p_pedido_id: pedidoId,
                    p_admin_id: adminId,
                    p_modo: modo,
                },
            );

        if (rpcErr) {
            console.error(
                "RPC admin_aprobar_pedido_y_asignar error:",
                rpcErr,
            );

            return NextResponse.json(
                {
                    ok: false,
                    error:
                        rpcErr.message ||
                        "Error en RPC",
                },
                {
                    status: 500,
                },
            );
        }

        const row = Array.isArray(data)
            ? data[0]
            : data;

        if (!row?.ok) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        row?.error ||
                        "No se pudo aprobar y asignar",
                },
                {
                    status: 500,
                },
            );
        }

        /* ============================================================
           5. PROCESAR TARJETAS

           procesarPedidoPagado() también registra, de forma
           idempotente, la venta del socio cuando el pedido tiene
           affiliate_id.
        ============================================================ */
        const processing =
            await procesarPedidoPagado(
                pedidoId,
            );

        if (!processing.ok) {
            console.error(
                "Pago aprobado, pero falló la creación de tarjetas:",
                processing,
            );

            return NextResponse.json(
                {
                    ok: false,

                    /*
                     * El pedido YA fue aprobado.
                     * El cliente no debe volver a pagar.
                     */
                    paymentApproved: true,
                    pedidoId,

                    error:
                        "El pago fue aprobado y los números fueron asignados, " +
                        "pero no se pudieron crear las Tarjetas de la Suerte.",

                    processing,
                },
                {
                    status: 500,
                },
            );
        }

        return NextResponse.json({
            ok: true,
            pedidoId,
            alreadyAssigned: Boolean(
                row.already_assigned,
            ),
            numeros: row.numeros || [],
            modo,
            processing,
        });
    } catch (error: unknown) {
        console.error(
            "marcar-pagado error:",
            error,
        );

        return NextResponse.json(
            {
                ok: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Error interno",
            },
            {
                status: 500,
            },
        );
    }
}