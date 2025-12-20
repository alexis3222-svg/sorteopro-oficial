export const dynamic = "force-dynamic";

import PagoExitosoClient from "./PagoExitosoClient";

function pickParam(sp: Record<string, string | string[] | undefined>, keys: string[]) {
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
    // PayPhone URL response suele traer:
    // id (int) y clientTransactionId (string) :contentReference[oaicite:2]{index=2}
    const payphoneId = pickParam(searchParams, ["id", "payphoneId", "payphone_id", "transactionId"]);
    const clientTxId = pickParam(searchParams, ["clientTransactionId", "clientTxId", "tx"]);

    // Si no vienen parámetros, mostramos mensaje genérico (no rompemos)
    if (!payphoneId || !clientTxId) {
        return (
            <PagoExitosoClient
                mode="PENDING"
                title="Pedido recibido"
                message="Tu pedido fue registrado. En caso de que hayas pagado, el sistema confirmará el pago o el administrador lo revisará."
            />
        );
    }

    // Confirmación server-to-server (UNA sola vez)
    const baseUrl =
        process.env.NEXT_PUBLIC_SITE_URL || // recomendado: https://casabikers.vercel.app
        "";

    const url = baseUrl
        ? `${baseUrl}/api/payphone/confirm`
        : `/api/payphone/confirm`;

    let data: any = null;

    try {
        const resp = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            // Next server fetch cache off by dynamic page
            body: JSON.stringify({ payphoneId, clientTxId }),
        });

        data = await resp.json().catch(() => null);
    } catch {
        data = null;
    }

    if (data?.ok && (data.status === "APPROVED_ASSIGNED" || data.status === "APPROVED_ALREADY_ASSIGNED")) {
        return (
            <PagoExitosoClient
                mode="OK"
                title="Pago confirmado ✅"
                message="Tus números fueron asignados."
                numeros={data.numeros ?? []}
            />
        );
    }

    // No aprobado / error → queda pendiente (PRO-1)
    return (
        <PagoExitosoClient
            mode="PENDING"
            title="Pedido recibido"
            message="Pago pendiente de confirmación. Si pagaste y no ves tus números, el administrador revisará tu pedido."
        />
    );
}
