import { Suspense } from "react";
import PagoExitosoClient from "./PagoExitosoClient";

export default function PagoExitosoPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center">
                    Cargando...
                </div>
            }
        >
            <PagoExitosoClient />
        </Suspense>
    );
}
