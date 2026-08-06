import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { procesarPedidoPagado } from "@/lib/procesarPedidoPagado";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function assertAdmin(req: NextRequest) {
    const secret = req.headers.get("x-admin-secret");

    if (!secret || secret !== process.env.ADMIN_SECRET) {
        throw new Error("UNAUTHORIZED");
    }
}

export async function POST(req: NextRequest) {
    try {
        assertAdmin(req);

        const body = await req.json().catch(() => null);
        const pedidoId = Number(body?.pedidoId);

        if (
            !Number.isInteger(pedidoId) ||
            pedidoId <= 0
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Falta pedidoId válido",
                },
                { status: 400 }
            );
        }

        // 🔎 Leemos método de pago para auditoría
        const { data: pedido, error: pedidoErr } =
            await supabaseAdmin
                .from("pedidos")
                .select("metodo_pago")
                .eq("id", pedidoId)
                .maybeSingle();

        if (pedidoErr || !pedido) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Pedido no encontrado",
                },
                { status: 404 }
            );
        }

        const metodo = String(
            pedido.metodo_pago || ""
        ).toLowerCase();

        const modo =
            metodo === "transferencia"
                ? "transferencia_admin"
                : "manual_admin";

        // 🧠 Admin ID para auditoría
        const adminId = process.env.ADMIN_UUID;

        if (!adminId) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Falta ADMIN_UUID en entorno",
                },
                { status: 500 }
            );
        }

        /*
         * 1. Aprobar el pedido y asignar números
         * mediante la RPC existente.
         */
        const { data, error } = await supabaseAdmin.rpc(
            "admin_aprobar_pedido_y_asignar",
            {
                p_pedido_id: pedidoId,
                p_admin_id: adminId,
                p_modo: modo,
            }
        );

        if (error) {
            const msg =
                error.message ||
                "Error asignando números";

            const status = msg.includes("NO_STOCK")
                ? 409
                : 400;

            return NextResponse.json(
                {
                    ok: false,
                    error: msg,
                },
                { status }
            );
        }

        const result = Array.isArray(data)
            ? data[0]
            : data;

        if (!result?.ok) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        result?.error ||
                        "No se pudo aprobar el pedido y asignar los números",
                },
                { status: 500 }
            );
        }

        /*
         * 2. Crear una Tarjeta de la Suerte
         * por cada número asignado.
         */
        const processing =
            await procesarPedidoPagado(pedidoId);

        if (!processing.ok) {
            console.error(
                "Pago aprobado, pero falló la creación de tarjetas:",
                processing
            );

            return NextResponse.json(
                {
                    ok: false,
                    paymentApproved: true,
                    pedidoId,

                    error:
                        "El pago fue aprobado y los números fueron asignados, " +
                        "pero no se pudieron crear las Tarjetas de la Suerte.",

                    processing,
                },
                { status: 500 }
            );
        }

        return NextResponse.json({
            ok: true,
            pedidoId,

            alreadyAssigned:
                result?.already_assigned ?? false,

            numeros:
                result?.numeros ??
                processing.numeros ??
                [],

            modo,
            processing,
        });
    } catch (e: unknown) {
        const msg =
            e instanceof Error
                ? e.message
                : String(e);

        if (msg === "UNAUTHORIZED") {
            return NextResponse.json(
                {
                    ok: false,
                    error: "No autorizado",
                },
                { status: 401 }
            );
        }

        console.error(
            "ADMIN marcar-pagado error:",
            e
        );

        return NextResponse.json(
            {
                ok: false,
                error: msg || "Error interno",
            },
            { status: 500 }
        );
    }
}