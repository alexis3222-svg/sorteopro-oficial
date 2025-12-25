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

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function PagoExitosoInner() {
  const searchParams = useSearchParams();
  const didRun = useRef(false);

  const [msg, setMsg] = useState("Confirmando pago…");

  // ✅ SOLO usamos clientTransactionId para consultar estado
  const clientTxId = searchParams.get("clientTransactionId");

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    if (!clientTxId) {
      setMsg("Faltan datos del pago.");
      return;
    }

    (async () => {
      setMsg("Estamos validando tu pago…");

      // ✅ consultar estado cada 5s durante 5 minutos (60 intentos)
      for (let i = 1; i <= 60; i++) {
        try {
          const r = await fetch(`/api/pedidos/estado?clientTxId=${encodeURIComponent(clientTxId)}`);
          const j = await r.json().catch(() => null);

          if (j?.estado === "pagado") {
            setMsg("Pago confirmado correctamente ✅");
            return;
          }

          setMsg(`Validando tu pago… (${i}/60)`);
        } catch {
          setMsg(`Validando tu pago… (${i}/60)`);
        }

        await sleep(5000);
      }

      setMsg(
        "Tu pago está siendo procesado. Si ya pagaste, no te preocupes: el sistema lo confirmará automáticamente."
      );
    })();
  }, [clientTxId]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-white">
      <div className="text-center space-y-2">
        <h1 className="text-xl font-semibold">Pago PayPhone</h1>
        <p className="text-sm text-slate-300">{msg}</p>
      </div>
    </div>
  );
}


