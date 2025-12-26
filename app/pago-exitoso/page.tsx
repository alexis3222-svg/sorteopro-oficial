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

  const [msg, setMsg] = useState("Validando pago…");

  // ✅ Soportamos ambos esquemas:
  // - Si PayPhone retorna directo: clientTransactionId
  // - Si redirige tu webhook: tx
  const tx =
    searchParams.get("tx") ||
    searchParams.get("clientTransactionId") ||
    "";

  // PayPhone id (para mostrarlo si viene)
  const payphoneId = searchParams.get("id") || "";

  // status opcional si viene desde el webhook
  const status = (searchParams.get("status") || "").toLowerCase();

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    if (!tx) {
      setMsg("Faltan datos del pago (tx/clientTransactionId).");
      return;
    }

    (async () => {
      // Mensaje inicial según el retorno
      if (status === "approved") {
        setMsg("Pago aprobado. Finalizando…");
      } else {
        setMsg("Estamos validando tu pago…");
      }

      // ✅ Polling a tu BD (estado del pedido)
      // 60 intentos * 5s = 5 minutos
      for (let i = 1; i <= 60; i++) {
        try {
          const r = await fetch(
            `/api/pedidos/estado?clientTxId=${encodeURIComponent(tx)}`,
            { cache: "no-store" }
          );

          // si falla el JSON, seguimos
          const j = await r.json().catch(() => null);

          if (j?.estado === "pagado") {
            setMsg("Pago confirmado correctamente ✅");
            return;
          }

          // opcional: si tu endpoint expone estado "rechazado"
          if (j?.estado === "rechazado" || j?.estado === "cancelado") {
            setMsg("El pago no fue aprobado. Si crees que es un error, contáctanos.");
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
  }, [tx, status]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-white">
      <div className="text-center space-y-2">
        <h1 className="text-xl font-semibold">Pago PayPhone</h1>

        {payphoneId ? (
          <p className="text-xs text-slate-400">{`Transacción #${payphoneId}`}</p>
        ) : null}

        <p className="text-sm text-slate-300">{msg}</p>

        <p className="text-[11px] text-slate-500">
          No cierres esta ventana mientras validamos.
        </p>
      </div>
    </div>
  );
}
