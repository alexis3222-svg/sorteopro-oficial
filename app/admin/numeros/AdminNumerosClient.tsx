// app/admin/numeros/AdminNumerosClient.tsx
"use client";

import NumerosClient from "./NumerosClient";

export default function AdminNumerosClient({ pedidoId }: { pedidoId: number }) {
    return <NumerosClient pedidoId={pedidoId} />;
}
