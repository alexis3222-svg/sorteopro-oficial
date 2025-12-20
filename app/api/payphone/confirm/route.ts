import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { asignarNumerosPorPedidoId } from "@/lib/asignarNumeros";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
    payphoneId?: number | string; // opcional
    clientTxId: string; // obligatorio
};

function getPayphoneToken() {
    return (
        process.env.PAYPHONE_TOKEN ||
        process.env.NEXT_PUBLIC_PAYPHONE_TOKEN ||
        ""
    );
}

type PedidoInfo = {
    id: number;
    nombre: string | null;
    telefono: string | null;
    correo: string | null;
    cantidad_numeros: number | null;
    total: number | null;
    metodo_pago: string | null;
};

async function getPedidoInfo(pedidoId: number): Promise<PedidoInfo | null> {
    const { data } = await supabaseAdmin
        .from("pedidos")
        .select("id, nombre, telefono, correo, cantidad_numeros, total, metodo_pago")
        .eq("id", pedidoId)
        .single();

    return (data as PedidoInfo) ?? null;
}

export async function POST(req: NextRequest) {
    try {
        const body = (await req.json().catch(() => null)) as Body | null;

        const clientTxId = (body?.clientTxId || "").trim();
        const payphoneIdRaw = body?.payphoneId;

        if (!clientTxId) {
            return NextResponse.json(
                { ok: false, error: "Falta parámetro: clientTxId" },
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
            .select(
                "id, estado, metodo_pago, payphone_client_transaction_id, payphone_id"
            )
            .eq("payphone_client_transaction_id", clientTxId)
            .single();

        if (pedidoErr || !pedido) {
            return NextResponse.json(
                { ok: false, error: "Pedido no encontrado para ese clientTxId" },
                { status: 404 }
            );
        }

        /**
         * 🔐 Resolver payphoneId REAL (source of truth)
         * Prioridad:
         * 1) Body
         * 2) BD
         */
        let resolvedPayphoneId: number | null = null;

        // 1️⃣ viene en body
        if (
            payphoneIdRaw !== undefined &&
            payphoneIdRaw !== null &&
            String(payphoneIdRaw).trim() !== ""
        ) {
            const parsed = Number(payphoneIdRaw);
            if (!parsed || Number.isNaN(parsed)) {
                return NextResponse.json(
                    { ok: false, error: "payphoneId inválido" },
                    { status: 400 }
                );
            }

            resolvedPayphoneId = parsed;

            // Guardar en BD si aún no estaba
            if (!pedido.payphone_id) {
                const { error: updIdErr } = await supabaseAdmin
                    .from("pedidos")
                    .update({ payphone_id: resolvedPayphoneId })
                    .eq("id", pedido.id);

                if (updIdErr) {
                    return NextResponse.json(
                        { ok: false, error: "No se pudo guardar payphone_id" },
                        { status: 500 }
                    );
                }
            }
        } else if (pedido.payphone_id) {
            // 2️⃣ no viene en body, usar BD
            resolvedPayphoneId = Number(pedido.payphone_id);
        }

        if (!resolvedPayphoneId || Number.isNaN(resolvedPayphoneId)) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Falta payphoneId (no llegó y no está guardado en el pedido)",
                },
                { status: 400 }
            );
        }

        // ✅ Traer info del pedido para el modal (columna izquierda)
        const pedidoInfo = await getPedidoInfo(pedido.id);

        // ✅ 2) Idempotencia REAL (solo lectura)
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

        // ✅ Si ya existen números, devolvemos inmediatamente (SIN tocar PayPhone)
        if (rows && rows.length > 0) {
            return NextResponse.json({
                ok: true,
                status: "APPROVED_ALREADY_ASSIGNED",
                pedidoId: pedido.id,
                pedido: pedidoInfo,
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
                body: JSON.stringify({ id: resolvedPayphoneId, clientTxId }),
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

        // 4) Interpretación del estado
        const statusValue =
            (confirmJson?.transactionStatus ??
                confirmJson?.status ??
                confirmJson?.data?.status ??
                confirmJson?.data?.transactionStatus ??
                confirmJson?.detail?.status) ??
            null;

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
            return NextResponse.json({
                ok: true,
                status: "NOT_APPROVED",
                pedidoId: pedido.id,
                pedido: pedidoInfo,
                payphone: confirmJson,
            });
        }

        // 5) Marcar pedido como pagado
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

        // 6) Asignar números (PRO-1 candado está en la función)
        const assigned = await asignarNumerosPorPedidoId(pedido.id);

        if (!assigned.ok) {
            return NextResponse.json(
                { ok: false, code: assigned.code, error: assigned.error },
                { status: 500 }
            );
        }

        // ✅ Refrescar pedidoInfo por si quieres ver estado pagado inmediatamente (opcional)
        const pedidoInfo2 = await getPedidoInfo(pedido.id);

        return NextResponse.json({
            ok: true,
            status: assigned.alreadyAssigned
                ? "APPROVED_ALREADY_ASSIGNED"
                : "APPROVED_ASSIGNED",
            pedidoId: pedido.id,
            pedido: pedidoInfo2 ?? pedidoInfo,
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
