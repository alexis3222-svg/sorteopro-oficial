// app/api/payphone/confirm/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { asignarNumerosPorPedidoId } from "@/lib/asignarNumeros";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
    payphoneId?: number | string;
    clientTxId?: string;
    clientTransactionId?: string; // viene en la URL de respuesta
};

function normalizeToken(raw: string) {
    return (raw || "").replace(/^"+|"+$/g, "").trim();
}

function getPayphoneToken() {
    // ✅ Recomendado: token secreto del backend (Vercel Env)
    // Fallback: NEXT_PUBLIC... solo si aún estás migrando
    const env = (process.env.PAYPHONE_ENV || "").toLowerCase(); // "live" | "test"
    if (env === "live") return normalizeToken(process.env.PAYPHONE_TOKEN_LIVE || "");
    if (env === "test") return normalizeToken(process.env.PAYPHONE_TOKEN_TEST || "");
    return (
        normalizeToken(process.env.PAYPHONE_TOKEN || "") ||
        normalizeToken(process.env.NEXT_PUBLIC_PAYPHONE_TOKEN || "")
    );
}

export async function POST(req: NextRequest) {
    try {
        const body = (await req.json().catch(() => null)) as Body | null;

        const clientTxId = String(body?.clientTxId || body?.clientTransactionId || "").trim();
        const payphoneIdRaw = body?.payphoneId;

        if (!clientTxId) {
            return NextResponse.json({ ok: false, error: "Falta parámetro: clientTxId" }, { status: 400 });
        }

        const token = getPayphoneToken();
        if (!token) {
            return NextResponse.json({ ok: false, error: "Falta token PayPhone en el servidor" }, { status: 500 });
        }

        // 1) Buscar pedido por clientTransactionId
        const { data: pedido, error: pedidoErr } = await supabaseAdmin
            .from("pedidos")
            .select("id, estado, metodo_pago, payphone_client_transaction_id, payphone_id, nombre, telefono, correo, cantidad_numeros, total")
            .eq("payphone_client_transaction_id", clientTxId)
            .single();

        if (pedidoErr || !pedido) {
            return NextResponse.json({ ok: false, error: "Pedido no encontrado para ese clientTxId" }, { status: 404 });
        }

        // 2) Resolver payphoneId
        let resolvedPayphoneId: number | null = null;

        if (payphoneIdRaw !== undefined && payphoneIdRaw !== null && String(payphoneIdRaw).trim() !== "") {
            const parsed = Number(payphoneIdRaw);
            if (!parsed || Number.isNaN(parsed)) {
                return NextResponse.json({ ok: false, error: "payphoneId inválido" }, { status: 400 });
            }
            resolvedPayphoneId = parsed;
        } else if (pedido.payphone_id) {
            resolvedPayphoneId = Number(pedido.payphone_id);
        }

        if (!resolvedPayphoneId || Number.isNaN(resolvedPayphoneId)) {
            return NextResponse.json(
                { ok: false, error: "Falta payphoneId (no llegó y no está guardado en el pedido)" },
                { status: 400 }
            );
        }

        // 2.1) Guardar payphone_id si aún no está
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
            });
        }

        // 4) Confirm PayPhone (server-to-server)
        // ✅ Doc: body usa { id, clientTxId } y en Fetch agregan Referer :contentReference[oaicite:2]{index=2}
        const siteUrl =
            process.env.NEXT_PUBLIC_SITE_URL ||
            req.headers.get("origin") ||
            req.headers.get("referer") ||
            "https://casabikers.vercel.app";

        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 20000);

        const resp = await fetch("https://pay.payphonetodoesposible.com/api/button/V2/Confirm", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
                Accept: "application/json",
                // ✅ CLAVE (por docs)
                Referer: siteUrl,
                Origin: siteUrl,
                "User-Agent": "CasaBikers/PayPhoneConfirm",
            },
            body: JSON.stringify({
                id: Number(resolvedPayphoneId),
                clientTxId: String(clientTxId),
            }),
            signal: controller.signal,
        }).finally(() => clearTimeout(t));

        const rawText = await resp.text().catch(() => "");
        let confirmJson: any = null;
        try {
            confirmJson = rawText ? JSON.parse(rawText) : null;
        } catch {
            confirmJson = null;
        }

        // Si PayPhone devuelve HTML runtime error, lo dejamos visible en logs del server (pero no explota el cliente)
        if (!resp.ok) {
            // IMPORTANTE: no lo trates como “pago fallido” inmediato. Lo manejamos como “reintentar”.
            return NextResponse.json(
                {
                    ok: false,
                    error: "PAYPHONE_CONFIRM_HTTP_ERROR",
                    payphone_http_status: resp.status,
                    payphone_body: confirmJson ?? rawText,
                },
                { status: 502 }
            );
        }

        if (!confirmJson) {
            return NextResponse.json(
                { ok: false, error: "PAYPHONE_CONFIRM_NO_JSON", payphone_http_status: resp.status, payphone_body: rawText },
                { status: 502 }
            );
        }

        // 5) Aprobado según docs: statusCode 3 / transactionStatus Approved :contentReference[oaicite:3]{index=3}
        const statusCode = Number(confirmJson?.statusCode ?? confirmJson?.data?.statusCode ?? NaN);
        const transactionStatus = String(
            confirmJson?.transactionStatus ?? confirmJson?.data?.transactionStatus ?? ""
        ).toLowerCase();

        const isApproved = statusCode === 3 || transactionStatus === "approved";

        if (!isApproved) {
            return NextResponse.json({
                ok: true,
                status: "NOT_APPROVED",
                pedidoId: pedido.id,
                payphone: confirmJson,
            });
        }

        // 6) Marcar pedido pagado
        if (pedido.estado !== "pagado") {
            const { error: updErr } = await supabaseAdmin.from("pedidos").update({ estado: "pagado" }).eq("id", pedido.id);
            if (updErr) {
                return NextResponse.json({ ok: false, error: "No se pudo marcar pedido como pagado" }, { status: 500 });
            }
        }

        // 7) Asignar números
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
        });
    } catch (e: any) {
        console.error("payphone/confirm error:", e);
        return NextResponse.json({ ok: false, error: e?.message || "Error interno" }, { status: 500 });
    }
}
