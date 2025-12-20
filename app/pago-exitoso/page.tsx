export const dynamic = "force-dynamic";

import PagoExitosoClient from "./PagoExitosoClient";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function pickParam(
    sp: Record<string, string | string[] | undefined>,
    keys: string[]
) {
    for (const k of keys) {
        const v = sp[k];
        if (!v) continue;
        if (Array.isArray(v)) return v[0] ?? "";
        return v;
    }
    return "";
}

export default async function PagoExitosoPage({
    searchParams,
}: {
    searchParams: Record<string, string | string[] | undefined>;
}) {
    const payphoneIdStr = pickParam(searchParams, ["id", "payphoneId"]);
    const clientTxId = pickParam(searchParams, ["clientTransactionId", "clientTxId", "tx"]);

    if (!payphoneIdStr || !clientTxId) {
        return (
            <PagoExitosoClient
                mode="PENDING"
                title="Pedido recibido"
                message="Tu pedido fue registrado. En caso de que hayas pagado, el sistema confirmará el pago o el administrador lo revisará."
            />
        );
    }

    const payphoneId = Number(payphoneIdStr);
    if (!payphoneId || Number.isNaN(payphoneId)) {
        return (
            <PagoExitosoClient
                mode="PENDING"
                title="Pedido recibido"
                message="Parámetros inválidos de PayPhone. Si pagaste, el administrador revisará tu pedido."
            />
        );
    }

    // ✅ URL correcta según entorno
    const baseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : process.env.NEXT_PUBLIC_SITE_URL || "";

    const url = baseUrl ? `${baseUrl}/api/payphone/confirm` : "/api/payphone/confirm";

    let data: any = null;

    try {
        const resp = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ payphoneId, clientTxId }),
            cache: "no-store",
        });

        data = await resp.json().catch(() => null);
    } catch {
        data = null;
    }

    const isApproved =
        data?.ok &&
        (data.status === "APPROVED_ASSIGNED" || data.status === "APPROVED_ALREADY_ASSIGNED");

    // ✅ Si está aprobado, buscamos info del pedido para la columna izquierda
    let pedidoInfo: null | {
        id: number;
        nombre: string | null;
        telefono: string | null;
        correo: string | null;
        cantidad_numeros: number | null;
        total: number | null;
        metodo_pago: string | null;
    } = null;

    if (isApproved && data?.pedidoId) {
        const { data: pedido, error } = await supabaseAdmin
            .from("pedidos")
            .select("id, nombre, telefono, correo, cantidad_numeros, total, metodo_pago")
            .eq("id", data.pedidoId)
            .single();

        if (!error && pedido) {
            pedidoInfo = pedido as any;
        }
    }

    if (isApproved) {
        return (
            <PagoExitosoClient
                mode="OK"
                title="Pago confirmado ✅"
                message="Tus números fueron asignados."
                numeros={data.numeros ?? []}
                pedido={pedidoInfo ?? undefined}
            />
        );
    }

    return (
        <PagoExitosoClient
            mode="PENDING"
            title="Pedido recibido"
            message="Pago pendiente de confirmación. Si pagaste y no ves tus números, refresca en unos segundos o el administrador revisará tu pedido."
        />
    );
}
