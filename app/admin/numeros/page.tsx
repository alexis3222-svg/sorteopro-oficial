import { Suspense } from "react";
import AdminNumerosClient from "./AdminNumerosClient";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function AdminNumerosPage() {
    return (
        <Suspense fallback={<p className="p-4">Cargando admin números...</p>}>
            <AdminNumerosClient />
        </Suspense>
    );
}
