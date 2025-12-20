import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { asignarNumerosPorPedidoId } from "@/lib/asignarNumeros";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
    payphoneId: number | string; // id que llega en body
    clientTxId: string;          // clientTransactionId que llega en body
};

function getPayphoneToken() {
    // ✅ Recomendado: token server-only
    const token =
        process.env.PAYPHONE_TOKEN ||
        process.env.NEXT_PUBLIC_PAYPHONE_TOKEN || // fallback (idealmente no usarlo)
        "";
    return token;
}

export async function POST(req: NextRequest) {
    try {
        const body = (await req.json().catch(() => null)) as Body | null;

        const payphoneIdRaw = body?.payphoneId;
        const clientTxId = (body?.clientTxId || "").trim();
        const payphoneId = Number(payphoneIdRaw);

        if (!payphoneId || Number.isNaN(payphoneId) || !clientTxId) {
            return NextResponse.json(
                { ok: false, error: "Faltan parámetros: payphoneId y clientTxId" },
                { status: 400 }
            );
        }

        const token = getPayphoneToken();
        if (!token) {
            return NextResponse.json(
                { ok: false, error: "Falta PAYPHONE_TOKEN en el servidor" },
                { status: 500 }
            );
        }

        // 1) Buscar pedido por clientTxId (TU id)
        const { data: pedido, error: pedidoErr } = await supabaseAdmin
            .from("pedidos")
            .select("id, estado, metodo_pago, payphone_client_transaction_id")
            .eq("payphone_client_transaction_id", clientTxId)
            .single();

        if (pedidoErr || !pedido) {
            return NextResponse.json(
                { ok: false, error: "Pedido no encontrado para ese clientTxId" },
                { status: 404 }
            );
        }

        // ✅ 2) Idempotencia REAL (solo lectura):
        // Si ya hay números asignados para este pedido, devolverlos y salir.
        // (No llamamos asignarNumerosPorPedidoId aquí para evitar asignaciones en 'pendiente')
        const { data: rows, error: rowsErr } = await supabaseAdmin
            .from("numeros_asignados")
            .select("numero")
            .eq("pedido_id", pedido.id)
            .order("numero", { ascending: true });

        if (rowsErr) {
            return NextResponse.json(
                { ok: false, error: "No se pudo verificar números asignados" },
                { status: 500 }
            );
        }

        if (rows && rows.length > 0) {
            return NextResponse.json({
                ok: true,
                status: "APPROVED_ALREADY_ASSIGNED",
                pedidoId: pedido.id,
                numeros: rows.map((r: any) => Number(r.numero)),
            });
        }

        // 3) Confirmar en PayPhone (server-to-server)
        const resp = await fetch(
            "https://pay.payphonetodoesposible.com/api/button/V2/Confirm",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ id: payphoneId, clientTxId }),
            }
        );

        const confirmJson = await resp.json().catch(() => null);

        if (!resp.ok || !confirmJson) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "No se pudo confirmar con PayPhone",
                    detail: confirmJson ?? null,
                },
                { status: 502 }
            );
        }

        // 4) Interpretación del estado (más segura que buscar palabras al aire)
        // Intentamos detectar campos comunes; si no existen, caemos a una comprobación flexible.
        const statusValue =
            (confirmJson?.transactionStatus ??
                confirmJson?.status ??
                confirmJson?.data?.status ??
                confirmJson?.data?.transactionStatus ??
                confirmJson?.detail?.status) ?? null;

        const statusStr = String(statusValue ?? "").toLowerCase();
        const raw = JSON.stringify(confirmJson).toLowerCase();

        const isApproved =
            statusStr === "approved" ||
            statusStr === "success" ||
            statusStr === "2" ||
            raw.includes('"approved"') ||
            raw.includes('"status":2') ||
            raw.includes('"status":"2"');

        if (!isApproved) {
            // NO aprobado: no cambiamos estado ni asignamos números
            return NextResponse.json({
                ok: true,
                status: "NOT_APPROVED",
                pedidoId: pedido.id,
                payphone: confirmJson,
            });
        }

        // 5) Marcar pedido como pagado (si no lo está)
        if (pedido.estado !== "pagado") {
            const { error: updErr } = await supabaseAdmin
                .from("pedidos")
                .update({ estado: "pagado" })
                .eq("id", pedido.id);

            if (updErr) {
                return NextResponse.json(
                    { ok: false, error: "No se pudo marcar pedido como pagado" },
                    { status: 500 }
                );
            }
        }

        // 6) Asignar números (aquí recién se asigna)
        const assigned = await asignarNumerosPorPedidoId(pedido.id);

        if (!assigned.ok) {
            return NextResponse.json(
                { ok: false, code: assigned.code, error: assigned.error },
                { status: 500 }
            );
        }

        return NextResponse.json({
            ok: true,
            status: assigned.alreadyAssigned
                ? "APPROVED_ALREADY_ASSIGNED"
                : "APPROVED_ASSIGNED",
            pedidoId: pedido.id,
            numeros: assigned.numeros,
            payphone: confirmJson,
        });
    } catch (e: any) {
        console.error("payphone/confirm error:", e);
        return NextResponse.json(
            { ok: false, error: e?.message || "Error interno" },
            { status: 500 }
        );
    }
}
