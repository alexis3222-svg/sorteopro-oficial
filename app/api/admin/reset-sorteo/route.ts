// app/api/admin/reset-sorteo/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
    try {
        const { sorteoId } = await req.json();

        if (!sorteoId) {
            return NextResponse.json(
                { ok: false, error: "Falta sorteoId" },
                { status: 400 }
            );
        }

        // 1) Borrar números asignados del sorteo
        const { error: errorNums } = await supabaseAdmin
            .from("numeros_asignados")
            .delete()
            .eq("sorteo_id", sorteoId);

        if (errorNums) {
            console.error("Error borrando numeros_asignados:", errorNums);
            return NextResponse.json(
                { ok: false, error: "No se pudieron borrar los números asignados" },
                { status: 500 }
            );
        }

        // 2) Borrar pedidos del sorteo
        const { error: errorPedidos } = await supabaseAdmin
            .from("pedidos")
            .delete()
            .eq("sorteo_id", sorteoId);

        if (errorPedidos) {
            console.error("Error borrando pedidos:", errorPedidos);
            return NextResponse.json(
                { ok: false, error: "No se pudieron borrar los pedidos" },
                { status: 500 }
            );
        }

        // 3) Reiniciar contadores del sorteo
        const { error: errorSorteo } = await supabaseAdmin
            .from("sorteos")
            .update({
                numeros_vendidos: 0,
                ultimo_numero_asignado: 0,
                recaudado: 0,
            })
            .eq("id", sorteoId);

        if (errorSorteo) {
            console.error("Error actualizando sorteo:", errorSorteo);
            return NextResponse.json(
                { ok: false, error: "No se pudo actualizar el sorteo" },
                { status: 500 }
            );
        }

        return NextResponse.json({ ok: true });
    } catch (e) {
        console.error("Error en /api/admin/reset-sorteo:", e);
        return NextResponse.json(
            { ok: false, error: "Error interno en el servidor" },
            { status: 500 }
        );
    }
}
