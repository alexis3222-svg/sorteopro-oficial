// app/api/payphone/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { asignarNumerosPorTx } from "@/lib/asignarNumeros";

export async function POST(req: NextRequest) {
    try {
        // 1) Verificar secreto de seguridad
        const secretFromUrl = req.nextUrl.searchParams.get("secret");
        const expected = process.env.PAYPHONE_WEBHOOK_SECRET;

        if (!expected || secretFromUrl !== expected) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        // 2) Leer el body enviado por PayPhone
        const body = await req.json().catch(() => null);

        if (!body) {
            return NextResponse.json({ error: "Body inválido" }, { status: 400 });
        }

        // 3) Intentar recuperar el clientTransactionId de varios campos posibles
        const tx =
            body.clientTransactionId ||
            body.clientTransactionID || // por si acaso
            body.reference ||
            body.transactionId;

        const statusRaw =
            body.status || body.transactionStatus || body.transactionStatusName;
        const status = String(statusRaw || "").toUpperCase();

        if (!tx) {
            return NextResponse.json(
                { error: "No se encontró clientTransactionId en el payload" },
                { status: 400 }
            );
        }

        // 4) Solo asignamos si el pago está aprobado/completado
        const aprobados = ["APPROVED", "APPROVE", "COMPLETED", "PAID", "SUCCESS"];
        if (!aprobados.includes(status)) {
            return NextResponse.json({
                ok: true,
                skipped: true,
                reason: `Estado no aprobado: ${status}`,
            });
        }

        // 5) Usar la misma lógica central que ya funciona
        const result = await asignarNumerosPorTx(tx);

        if (!result.ok) {
            return NextResponse.json(
                { error: result.error, code: result.code },
                { status: 500 }
            );
        }

        return NextResponse.json({
            ok: true,
            alreadyAssigned: result.alreadyAssigned,
            numeros: result.numeros,
        });
    } catch (e) {
        console.error("Error en webhook PayPhone:", e);
        return NextResponse.json(
            { error: "Error interno en webhook" },
            { status: 500 }
        );
    }
}
