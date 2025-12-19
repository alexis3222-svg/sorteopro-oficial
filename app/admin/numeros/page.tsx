import { Suspense } from "react";
import NumerosClient from "./NumerosClient";

export const dynamic = "force-dynamic";

export default function AdminNumerosPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Cargando…</div>}>
            <NumerosClient />
        </Suspense>
    );
}
