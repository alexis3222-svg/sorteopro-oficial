// app/api/pedidos/asignar/route.ts
import { NextRequest, NextResponse } from "next/server";
import { asignarNumerosPorTx } from "@/lib/asignarNumeros";

export async function POST(req: NextRequest) {
    try {
        const { tx } = await req.json();

        if (!tx) {
            return NextResponse.json(
                { error: "Falta el identificador tx" },
                { status: 400 }
            );
        }

        const result = await asignarNumerosPorTx(tx);

        if (!result.ok) {
            // mapear códigos a status HTTP
            const status =
                result.code === "BAD_REQUEST"
                    ? 400
                    : result.code === "NOT_FOUND"
                        ? 404
                        : result.code === "NO_STOCK"
                            ? 409
                            : 500;

            return NextResponse.json(
                {
                    ok: false,
                    code: result.code,
                    error: result.error,
                },
                { status }
            );
        }

        // OK: números asignados o ya existían
        return NextResponse.json({
            ok: true,
            alreadyAssigned: result.alreadyAssigned,
            numeros: result.numeros,
        });
    } catch (e) {
        console.error("Error en /api/pedidos/asignar:", e);
        return NextResponse.json(
            { error: "Error interno en el servidor" },
            { status: 500 }
        );
    }
}
