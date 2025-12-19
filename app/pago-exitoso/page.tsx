import { Suspense } from "react";
import PagoExitosoClient from "./PagoExitosoClient";

export default function Page() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-slate-200">
                    Cargando verificación...
                </div>
            }
        >
            <PagoExitosoClient />
        </Suspense>
    );
}
