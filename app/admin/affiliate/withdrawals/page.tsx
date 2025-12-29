import { Suspense } from "react";
import WithdrawalsClient from "./WithdrawalsClient";

export const dynamic = "force-dynamic";

export default function AdminAffiliateWithdrawalsPage() {
    return (
        <main className="min-h-screen bg-[#050608] text-slate-50">
            <Suspense
                fallback={
                    <div className="mx-auto max-w-6xl px-4 py-16 text-sm text-slate-400">
                        Cargando retiros…
                    </div>
                }
            >
                <WithdrawalsClient />
            </Suspense>
        </main>
    );
}
