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

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function PagoExitosoInner() {
  const searchParams = useSearchParams();
  const didRun = useRef(false);
  const [msg, setMsg] = useState("Confirmando pago…");

  const payphoneId = searchParams.get("id");
  const clientTxId = searchParams.get("clientTransactionId");

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    if (!payphoneId || !clientTxId) {
      setMsg("Faltan parámetros de PayPhone.");
      return;
    }

    (async () => {
      setMsg("Validando tu pago… (puede tardar unos segundos)");

      // 8 intentos, 5s entre intentos
      for (let i = 1; i <= 8; i++) {
        try {
          const r = await fetch("/api/payphone/confirm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ payphoneId, clientTxId }),
          });

          const j = await r.json().catch(() => null);

          if (r.ok && j?.ok) {
            if (j.status === "APPROVED_ASSIGNED" || j.status === "APPROVED_ALREADY_ASSIGNED") {
              setMsg("Pago confirmado correctamente ✅");
              return;
            }
            if (j.status === "NOT_APPROVED") {
              setMsg(`Pago recibido, validando… (intento ${i}/8)`);
            } else {
              setMsg(`Validando… (intento ${i}/8)`);
            }
          } else {
            // No decir “falló” todavía; PayPhone a veces no responde bien al instante.
            setMsg(`Validando… (intento ${i}/8)`);
          }
        } catch {
          setMsg(`Validando… (intento ${i}/8)`);
        }

        await sleep(5000);
      }

      setMsg("Estamos validando tu pago. Si ya pagaste y no confirma, contáctanos con tu comprobante.");
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
