import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin"; // ajusta si tu path es distinto
import { asignarNumerosPorTx } from "@/lib/asignarNumeros"; // ajusta si tu path es distinto

const PAYPHONE_TOKEN = process.env.PAYPHONE_TOKEN ?? process.env.NEXT_PUBLIC_PAYPHONE_TOKEN ?? "";
const PAYPHONE_STORE_ID = process.env.PAYPHONE_STORE_ID ?? process.env.NEXT_PUBLIC_PAYPHONE_STORE_ID ?? "";

export const dynamic = "force-dynamic";

async function fetchJson(url: string, options: RequestInit) {
    const r = await fetch(url, options);
    const text = await r.text();
    let json: any = null;
    try { json = JSON.parse(text); } catch { }
    return { ok: r.ok, status: r.status, json, text };
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);

        // ✅ Aceptar ambos
        const tx = searchParams.get("tx");
        const id = searchParams.get("id");

        if (!tx && !id) {
            return NextResponse.json({ ok: false, error: "Falta tx o id" }, { status: 400 });
        }

        if (!PAYPHONE_TOKEN) {
            return NextResponse.json({ ok: false, error: "Falta configuración PAYPHONE_TOKEN" }, { status: 500 });
        }

        // ------------------------------------------------------------
        // 1) Consultar PayPhone: prioridad por ID si existe
        //    (Si tu endpoint real difiere, aquí lo ajustamos en el paso 2)
        // ------------------------------------------------------------
        let paidConfirmed = false;
        let clientTransactionId: string | null = tx ?? null;

        if (id) {
            // ⚠️ Este endpoint puede variar según tu cuenta/documentación PayPhone.
            // Lo importante: aquí ya aceptamos id y luego obtenemos clientTransactionId.
            const url = `https://pay.payphonetodoesposible.com/api/Transactions/${encodeURIComponent(id)}`;

            const resp = await fetchJson(url, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${PAYPHONE_TOKEN}`,
                    "Content-Type": "application/json",
                },
                cache: "no-store",
            });

            if (!resp.ok) {
                return NextResponse.json(
                    { ok: false, estado: "no_confirmado", error: "No se pudo consultar PayPhone (id).", debug: resp.text?.slice(0, 200) },
                    { status: 200 }
                );
            }

            // 🔎 Intento de normalizar campos (depende de PayPhone)
            const data = resp.json ?? {};
            clientTransactionId =
                data?.clientTransactionId ??
                data?.data?.clientTransactionId ??
                data?.transaction?.clientTransactionId ??
                clientTransactionId;

            const statusRaw =
                data?.status ??
                data?.data?.status ??
                data?.transaction?.status ??
                "";

            const status = String(statusRaw).toLowerCase();

            // Ajusta aquí si PayPhone usa otro status final
            paidConfirmed = status.includes("paid") || status.includes("approved") || status.includes("success");
        }

        // Si vino por tx (sin id), tu lógica actual seguramente consulta PayPhone por tx.
        // De momento, si NO tenemos confirmación por id, seguimos con tu función central:
        if (!clientTransactionId) {
            return NextResponse.json({ ok: false, estado: "no_confirmado", error: "No se obtuvo clientTransactionId" }, { status: 200 });
        }

        // ------------------------------------------------------------
        // 2) Punto único: asignar / actualizar según confirmación
        // ------------------------------------------------------------
        const result = await asignarNumerosPorTx(clientTransactionId, paidConfirmed);

        if (!result.ok) {
            return NextResponse.json(
                { ok: false, estado: "no_confirmado", error: result.error },
                { status: 200 }
            );
        }

        return NextResponse.json(
            {
                ok: true,
                estado: "pagado",
                tx: clientTransactionId,
                numeros: result.numeros ?? [],
                alreadyAssigned: result.alreadyAssigned ?? false,
            },
            { status: 200 }
        );
    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ ok: false, error: e?.message || "Error interno" }, { status: 500 });
    }
}
