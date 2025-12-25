// app/api/payphone/confirm/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { asignarNumerosPorPedidoId } from "@/lib/asignarNumeros";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
    payphoneId?: number | string;
    clientTxId?: string;
    clientTransactionId?: string; // aceptar también este (viene del query param de PayPhone)
};

// ✅ Normaliza y elige el token correcto para backend (SIN exponerlo en frontend)
function getPayphoneTokenSafe() {
    const env = String(process.env.PAYPHONE_ENV || "").toLowerCase().trim(); // "live" | "test"
    const clean = (v: string) => String(v || "").replace(/^"+|"+$/g, "").trim();

    // Prioridad: tokens privados del backend
    if (env === "live") {
        const t = clean(process.env.PAYPHONE_TOKEN_LIVE || "");
        if (t) return t;
    }
    if (env === "test") {
        const t = clean(process.env.PAYPHONE_TOKEN_TEST || "");
        if (t) return t;
    }

    // Fallback genérico (privado)
    const t = clean(process.env.PAYPHONE_TOKEN || "");
    if (t) return t;

    // Último fallback (NO recomendado, pero te salva si ya lo usas así)
    return clean(process.env.NEXT_PUBLIC_PAYPHONE_TOKEN || "");
}

export async function POST(req: NextRequest) {
    try {
        const body = (await req.json().catch(() => null)) as Body | null;

        const clientTxId = String(body?.clientTxId || body?.clientTransactionId || "").trim();
        const payphoneIdRaw = body?.payphoneId;

        if (!clientTxId) {
            return NextResponse.json({ ok: false, error: "Falta parámetro: clientTxId" }, { status: 400 });
        }

        const token = getPayphoneTokenSafe();
        if (!token) {
            return NextResponse.json(
                { ok: false, error: "Falta token PayPhone en el servidor" },
                { status: 500 }
            );
        }

        // 1) Buscar pedido por clientTxId (tu clientTransactionId guardado)
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

        // 3) Idempotencia: si ya hay números, devolverlos
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
        console.log("[payphone/confirm] env:", String(process.env.PAYPHONE_ENV || ""));
        console.log("[payphone/confirm] tokenLen:", token.length, "tokenLast6:", token.slice(-6));
        console.log("[payphone/confirm] sending:", {
            id: Number(resolvedPayphoneId),
            clientTxId: clientTxId,
        });

        const resp = await fetch("https://pay.payphonetodoesposible.com/api/button/V2/Confirm", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token.trim()}`, // ✅ Bearer + token limpio
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            // ✅ CLAVE: el body debe llevar clientTxId (NO clientTransactionId)
            body: JSON.stringify({
                id: Number(resolvedPayphoneId),
                clientTxId: clientTxId,
            }),
        });

        const rawText = await resp.text().catch(() => "");
        let confirmJson: any = null;
        try {
            confirmJson = rawText ? JSON.parse(rawText) : null;
        } catch {
            confirmJson = null;
        }

        console.log("[payphone/confirm] payphone http:", resp.status);
        if (!resp.ok) {
            console.log("[payphone/confirm] payphone raw (first 400):", rawText?.slice(0, 400));
            return NextResponse.json(
                {
                    ok: false,
                    error: "PayPhone Confirm respondió error",
                    payphone_http_status: resp.status,
                    payphone_body: confirmJson ?? rawText, // puede venir HTML si hay runtime error
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

        // 5) Determinar si está aprobado (robusto)
        const transactionStatus = String(
            confirmJson?.transactionStatus ??
            confirmJson?.data?.transactionStatus ??
            confirmJson?.detail?.transactionStatus ??
            ""
        )
            .trim()
            .toLowerCase();

        const statusCodeRaw =
            confirmJson?.statusCode ??
            confirmJson?.data?.statusCode ??
            confirmJson?.detail?.statusCode ??
            confirmJson?.status ??
            confirmJson?.data?.status ??
            confirmJson?.detail?.status;

        const statusCodeNum = Number(statusCodeRaw);
        const rawLower = JSON.stringify(confirmJson).toLowerCase();

        const isApproved =
            transactionStatus === "approved" ||
            rawLower.includes('"transactionstatus":"approved"') ||
            // PayPhone suele usar statusCode=3 para aprobado en ejemplos
            statusCodeNum === 3;

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
            const { error: updErr } = await supabaseAdmin
                .from("pedidos")
                .update({ estado: "pagado" })
                .eq("id", pedido.id);

            if (updErr) {
                return NextResponse.json({ ok: false, error: "No se pudo marcar pedido como pagado" }, { status: 500 });
            }
        }

        // 7) Asignar números (candado PRO-1 dentro)
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
