// app/pago-exitoso/page.tsx
export const dynamic = "force-dynamic";

import { Suspense } from "react";
import PagoExitosoClient from "./PagoExitosoClient";

export default function PagoExitosoPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-neutral-950 text-slate-100 flex items-center justify-center">
          Cargando…
        </div>
      }
    >
      <PagoExitosoClient />
    </Suspense>
  );
}
