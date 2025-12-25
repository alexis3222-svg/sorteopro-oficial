// app/api/payphone/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { asignarNumerosPorPedidoId } from "@/lib/asignarNumeros";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getPayphoneToken() {
    return (process.env.NEXT_PUBLIC_PAYPHONE_TOKEN || "").trim();
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const payphoneId = Number(body?.id);
        const clientTransactionId = String(body?.clientTransactionId || "").trim();

        if (!payphoneId || !clientTransactionId) {
            return NextResponse.json(
                { ok: false, error: "Datos incompletos desde PayPhone" },
                { status: 400 }
            );
        }

        const token = getPayphoneToken();
        if (!token) {
            return NextResponse.json(
                { ok: false, error: "Token PayPhone no configurado" },
                { status: 500 }
            );
        }

        // 1️⃣ Buscar pedido
        const { data: pedido, error: pedidoErr } = await supabaseAdmin
            .from("pedidos")
            .select("*")
            .eq("payphone_client_transaction_id", clientTransactionId)
            .single();

        if (pedidoErr || !pedido) {
            return NextResponse.json(
                { ok: false, error: "Pedido no encontrado" },
                { status: 404 }
            );
        }

        // 2️⃣ Confirmar con PayPhone (SERVER TO SERVER)
        const resp = await fetch(
            "https://pay.payphonetodoesposible.com/api/button/V2/Confirm",
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                body: JSON.stringify({
                    id: payphoneId,
                    clientTxId: clientTransactionId,
                }),
            }
        );

        const confirm = await resp.json();

        const status = String(
            confirm?.transactionStatus ?? confirm?.status ?? ""
        ).toLowerCase();

        if (status !== "approved") {
            return NextResponse.json({
                ok: true,
                status: "NOT_APPROVED",
                payphone: confirm,
            });
        }

        // 3️⃣ Marcar pedido como pagado (idempotente)
        if (pedido.estado !== "pagado") {
            await supabaseAdmin
                .from("pedidos")
                .update({
                    estado: "pagado",
                    payphone_id: payphoneId,
                })
                .eq("id", pedido.id);
        }

        // 4️⃣ Asignar números (idempotente)
        const asignacion = await asignarNumerosPorPedidoId(pedido.id);

        if (!asignacion.ok) {
            return NextResponse.json(
                { ok: false, error: asignacion.error },
                { status: 500 }
            );
        }

        return NextResponse.json({
            ok: true,
            status: "APPROVED",
            pedidoId: pedido.id,
            numeros: asignacion.numeros,
        });
    } catch (err: any) {
        console.error("payphone webhook error:", err);
        return NextResponse.json(
            { ok: false, error: "Error interno webhook" },
            { status: 500 }
        );
    }
}
