import { Suspense } from "react";
import AdminLoginClient from "./AdminLoginClient";

export const dynamic = "force-dynamic";

export default function AdminLoginPage() {
    return (
        <main className="min-h-[calc(100vh-3rem)] flex justify-center px-4 pt-16 pb-12">
            <Suspense fallback={<div className="text-slate-400 text-sm">Cargando…</div>}>
                <AdminLoginClient />
            </Suspense>
        </main>
    );
}
