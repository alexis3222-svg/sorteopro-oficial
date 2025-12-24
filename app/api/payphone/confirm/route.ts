// app/api/payphone/confirm/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { asignarNumerosPorPedidoId } from "@/lib/asignarNumeros";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
    payphoneId?: number | string; // opcional
    clientTxId: string; // obligatorio (tu clientTransactionId)
};

function getPayphoneToken() {
    const env = (process.env.PAYPHONE_ENV || "").toLowerCase(); // "test" | "live"
    if (env === "live") return process.env.PAYPHONE_TOKEN_LIVE || "";
    if (env === "test") return process.env.PAYPHONE_TOKEN_TEST || "";
    return process.env.PAYPHONE_TOKEN || "";
}


export async function POST(req: NextRequest) {
    try {
        const body = (await req.json().catch(() => null)) as Body | null;

        const clientTxId = (body?.clientTxId || "").trim();
        const payphoneIdRaw = body?.payphoneId;

        if (!clientTxId) {
            return NextResponse.json({ ok: false, error: "Falta parámetro: clientTxId" }, { status: 400 });
        }

        const token = getPayphoneToken();
        if (!token) {
            return NextResponse.json({ ok: false, error: "Falta token PayPhone en el servidor" }, { status: 500 });
        }

        // 1) Buscar pedido por tu clientTransactionId
        const { data: pedido, error: pedidoErr } = await supabaseAdmin
            .from("pedidos")
            .select(
                "id, estado, metodo_pago, payphone_client_transaction_id, payphone_id, nombre, telefono, correo, cantidad_numeros, total"
            )
            .eq("payphone_client_transaction_id", clientTxId)
            .single();

        if (pedidoErr || !pedido) {
            return NextResponse.json({ ok: false, error: "Pedido no encontrado para ese clientTxId" }, { status: 404 });
        }

        // 2) Resolver payphoneId REAL (source of truth)
        let resolvedPayphoneId: number | null = null;

        // A) viene en body (ideal: viene desde /pago-exitoso?id=XXXX)
        if (payphoneIdRaw !== undefined && payphoneIdRaw !== null && String(payphoneIdRaw).trim() !== "") {
            const parsed = Number(payphoneIdRaw);
            if (!parsed || Number.isNaN(parsed)) {
                return NextResponse.json({ ok: false, error: "payphoneId inválido" }, { status: 400 });
            }
            resolvedPayphoneId = parsed;
        } else if (pedido.payphone_id) {
            // B) si no viene en body, usar BD
            resolvedPayphoneId = Number(pedido.payphone_id);
        }

        if (!resolvedPayphoneId || Number.isNaN(resolvedPayphoneId)) {
            return NextResponse.json(
                { ok: false, error: "Falta payphoneId (no llegó y no está guardado en el pedido)" },
                { status: 400 }
            );
        }

        // 2.1) Guardar payphone_id si aún no está guardado
        if (!pedido.payphone_id) {
            const { error: updIdErr } = await supabaseAdmin
                .from("pedidos")
                .update({ payphone_id: resolvedPayphoneId })
                .eq("id", pedido.id);

            if (updIdErr) {
                return NextResponse.json({ ok: false, error: "No se pudo guardar payphone_id" }, { status: 500 });
            }
        }

        // 3) Idempotencia (solo lectura): si ya hay números, devolverlos
        const { data: rows, error: rowsErr } = await supabaseAdmin
            .from("numeros_asignados")
            .select("numero")
            .eq("pedido_id", pedido.id)
            .order("numero", { ascending: true });

        if (rowsErr) {
            return NextResponse.json({ ok: false, error: "No se pudo verificar números asignados" }, { status: 500 });
        }

        if (rows && rows.length > 0) {
            return NextResponse.json({
                ok: true,
                status: "APPROVED_ALREADY_ASSIGNED",
                pedidoId: pedido.id,
                numeros: rows.map((r: any) => Number(r.numero)),
                pedido: {
                    id: pedido.id,
                    nombre: pedido.nombre,
                    telefono: pedido.telefono,
                    correo: pedido.correo,
                    cantidad_numeros: pedido.cantidad_numeros,
                    total: pedido.total,
                    metodo_pago: pedido.metodo_pago,
                },
            });
        }

        // 4) Confirmar en PayPhone (server-to-server)
        const resp = await fetch(
            "https://pay.payphonetodoesposible.com/api/button/V2/Confirm",
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`, // 👈 EXACTO, con "Bearer "
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    id: Number(resolvedPayphoneId),
                    clientTransactionId: String(clientTxId),
                }),
            }
        );


        const rawText = await resp.text().catch(() => "");
        let confirmJson: any = null;
        try {
            confirmJson = rawText ? JSON.parse(rawText) : null;
        } catch {
            confirmJson = null;
        }

        if (!resp.ok) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "PayPhone Confirm respondió error",
                    payphone_http_status: resp.status,
                    payphone_body: confirmJson ?? rawText,
                },
                { status: 502 }
            );
        }

        if (!confirmJson) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "PayPhone Confirm no devolvió JSON",
                    payphone_http_status: resp.status,
                    payphone_body: rawText,
                },
                { status: 502 }
            );
        }


        // 5) Interpretación de aprobado (tolerante)
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
            return NextResponse.json({
                ok: true,
                status: "NOT_APPROVED",
                pedidoId: pedido.id,
                payphone: confirmJson,
                pedido: {
                    id: pedido.id,
                    nombre: pedido.nombre,
                    telefono: pedido.telefono,
                    correo: pedido.correo,
                    cantidad_numeros: pedido.cantidad_numeros,
                    total: pedido.total,
                    metodo_pago: pedido.metodo_pago,
                },
            });
        }

        // 6) Marcar pedido como pagado
        if (pedido.estado !== "pagado") {
            const { error: updErr } = await supabaseAdmin.from("pedidos").update({ estado: "pagado" }).eq("id", pedido.id);

            if (updErr) {
                return NextResponse.json({ ok: false, error: "No se pudo marcar pedido como pagado" }, { status: 500 });
            }
        }

        // 7) Asignar números (candado PRO-1 está dentro)
        const assigned = await asignarNumerosPorPedidoId(pedido.id);

        if (!assigned.ok) {
            return NextResponse.json({ ok: false, code: assigned.code, error: assigned.error }, { status: 500 });
        }

        return NextResponse.json({
            ok: true,
            status: assigned.alreadyAssigned ? "APPROVED_ALREADY_ASSIGNED" : "APPROVED_ASSIGNED",
            pedidoId: pedido.id,
            numeros: assigned.numeros,
            payphone: confirmJson,
            pedido: {
                id: pedido.id,
                nombre: pedido.nombre,
                telefono: pedido.telefono,
                correo: pedido.correo,
                cantidad_numeros: pedido.cantidad_numeros,
                total: pedido.total,
                metodo_pago: pedido.metodo_pago,
            },
        });
    } catch (e: any) {
        console.error("payphone/confirm error:", e);
        return NextResponse.json({ ok: false, error: e?.message || "Error interno" }, { status: 500 });
    }
}
