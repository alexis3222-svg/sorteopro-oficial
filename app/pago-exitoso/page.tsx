import { Suspense } from "react";
import PagoExitosoClient from "./PagoExitosoClient";

export const dynamic = "force-dynamic";

export default function Page() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-slate-200">
                    Cargando...
                </div>
            }
        >
            <PagoExitosoClient />
        </Suspense>
    );
}
