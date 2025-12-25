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

function fmtTime(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const ss = String(s % 60).padStart(2, "0");
  return `${m}:${ss}`;
}

function PagoExitosoInner() {
  const searchParams = useSearchParams();
  const didRun = useRef(false);

  const [msg, setMsg] = useState("Confirmando pago…");

  const payphoneId = searchParams.get("id"); // PayPhone transactionId
  const clientTxId = searchParams.get("clientTransactionId"); // clientTransactionId

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    if (!payphoneId || !clientTxId) {
      setMsg("Faltan parámetros de PayPhone (id o clientTransactionId).");
      return;
    }

    (async () => {
      // PayPhone revierte si no confirmas dentro de ~5 min.
      // Hacemos polling hasta 5 min para cubrir demoras del gateway.
      const MAX_MS = 5 * 60 * 1000; // 5 minutos
      const STEP_MS = 5000; // cada 5s
      const maxAttempts = Math.ceil(MAX_MS / STEP_MS);

      const startedAt = Date.now();

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const elapsed = Date.now() - startedAt;
        const remaining = Math.max(0, MAX_MS - elapsed);

        setMsg(
          `Validando tu pago… (intento ${attempt}/${maxAttempts}) · tiempo restante ${fmtTime(
            remaining
          )}`
        );

        try {
          const r = await fetch("/api/payphone/confirm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              payphoneId,
              clientTxId,
            }),
            cache: "no-store",
          });

          // A veces tu API puede retornar JSON, o si hay error interno igual intenta.
          const j = await r.json().catch(() => null);

          // ✅ Confirmado
          if (r.ok && j?.ok) {
            if (
              j.status === "APPROVED_ASSIGNED" ||
              j.status === "APPROVED_ALREADY_ASSIGNED"
            ) {
              setMsg("Pago confirmado correctamente ✅");
              return;
            }

            // Si tu API devuelve NOT_APPROVED, seguimos intentando
            if (j.status === "NOT_APPROVED") {
              // sigue
            } else {
              // cualquier otro estado “ok” lo tratamos como “aún validando”
            }
          }

          // ❗ Si tu API devolvió 400/404 por parámetros, eso sí es definitivo
          if (!r.ok && (r.status === 400 || r.status === 404)) {
            const reason = j?.error ? ` (${j.error})` : "";
            setMsg(`No se pudo validar este pago${reason}. Contáctanos con tu comprobante.`);
            return;
          }

          // Para 500/502: seguimos reintentando (PayPhone a veces responde raro al inicio)
        } catch {
          // Si falla la red/JSON, seguimos reintentando
        }

        // esperar antes del siguiente intento
        await sleep(STEP_MS);
      }

      setMsg(
        "Estamos validando tu pago. Si ya pagaste y no confirma, contáctanos con tu comprobante."
      );
    })();
  }, [payphoneId, clientTxId]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-white">
      <div className="text-center space-y-2 px-6">
        <h1 className="text-xl font-semibold">Pago PayPhone</h1>
        <p className="text-sm text-slate-300">{msg}</p>

        <p className="text-xs text-slate-500 mt-3">
          * No cierres esta ventana mientras validamos.
        </p>
      </div>
    </div>
  );
}
