// app/pago-exitoso/page.tsx
"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function PagoExitosoPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-white">
          <div className="text-center space-y-2">
            <h1 className="text-xl font-semibold">Pago PayPhone</h1>
            <p className="text-sm text-slate-300">Cargando…</p>
          </div>
        </div>
      }
    >
      <PagoExitosoInner />
    </Suspense>
  );
}

function PagoExitosoInner() {
  const searchParams = useSearchParams();
  const didRun = useRef(false);

  const [msg, setMsg] = useState("Confirmando pago…");

  const payphoneId = searchParams.get("id"); // transactionId
  const clientTxId = searchParams.get("clientTransactionId");

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    if (!payphoneId || !clientTxId) {
      setMsg("Faltan parámetros de PayPhone.");
      return;
    }

    (async () => {
      try {
        const r = await fetch("/api/payphone/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ payphoneId, clientTxId }),
        });

        const j = await r.json();

        if (!j.ok) {
          setMsg("No se pudo confirmar el pago.");
          console.error(j);
          return;
        }

        if (
          j.status === "APPROVED_ASSIGNED" ||
          j.status === "APPROVED_ALREADY_ASSIGNED"
        ) {
          setMsg("Pago confirmado correctamente ✅");
        } else {
          setMsg("Pago recibido, pendiente de validación.");
        }
      } catch (err) {
        console.error(err);
        setMsg("Error confirmando el pago.");
      }
    })();
  }, [payphoneId, clientTxId]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-white">
      <div className="text-center space-y-2">
        <h1 className="text-xl font-semibold">Pago PayPhone</h1>
        <p className="text-sm text-slate-300">{msg}</p>
      </div>
    </div>
  );
}
