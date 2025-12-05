// app/api/pedidos/asignar/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// helper para mezclar un array (Fisher–Yates)
function shuffle<T>(array: T[]): T[] {
    const a = [...array];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

export async function POST(req: NextRequest) {
    try {
        const { tx } = await req.json();

        if (!tx) {
            return NextResponse.json(
                { error: "Falta parámetro tx" },
                { status: 400 }
            );
        }

        // 1️⃣ Buscar el pedido por clientTransactionId
        const { data: pedido, error: pedidoError } = await supabaseAdmin
            .from("pedidos")
            .select("*")
            .eq("payphone_client_transaction_id", tx)
            .single();

        if (pedidoError || !pedido) {
            console.error("Pedido no encontrado:", pedidoError);
            return NextResponse.json(
                { error: "Pedido no encontrado" },
                { status: 404 }
            );
        }

        if (!pedido.sorteo_id) {
            return NextResponse.json(
                { error: "El pedido no tiene sorteo_id" },
                { status: 400 }
            );
        }

        // 2️⃣ Opcional: marcar como pagado si no lo está
        if (pedido.estado !== "pagado") {
            await supabaseAdmin
                .from("pedidos")
                .update({ estado: "pagado" })
                .eq("id", pedido.id);
        }

        // 3️⃣ Comprobar si YA tiene números asignados
        const { data: numerosExistentes, error: numerosExistentesError } =
            await supabaseAdmin
                .from("numeros_asignados")
                .select("id, numero")
                .eq("pedido_id", pedido.id);

        if (numerosExistentesError) {
            console.error("Error consultando numeros_asignados:", numerosExistentesError);
            return NextResponse.json(
                { error: "Error consultando números existentes" },
                { status: 500 }
            );
        }

        if (numerosExistentes && numerosExistentes.length > 0) {
            // Ya tiene números, no volvemos a asignar
            return NextResponse.json({
                ok: true,
                alreadyAssigned: true,
                numeros: numerosExistentes.map((n) => n.numero),
            });
        }

        // 4️⃣ Obtener el total de números del sorteo
        // AJUSTA los nombres de columnas según tu tabla `sorteos`.
        const { data: sorteo, error: sorteoError } = await supabaseAdmin
            .from("sorteos")
            .select("id, total_numeros")
            .eq("id", pedido.sorteo_id)
            .single();

        if (sorteoError || !sorteo) {
            console.error("Error obteniendo sorteo:", sorteoError);
            return NextResponse.json(
                { error: "No se pudo obtener la configuración del sorteo" },
                { status: 500 }
            );
        }

        const totalNumeros = sorteo.total_numeros as number;
        if (!totalNumeros || totalNumeros <= 0) {
            return NextResponse.json(
                { error: "El sorteo no tiene total_numeros configurado" },
                { status: 500 }
            );
        }

        // 5️⃣ Obtener todos los números ya usados en ese sorteo
        const { data: numerosUsados, error: usadosError } = await supabaseAdmin
            .from("numeros_asignados")
            .select("numero")
            .eq("sorteo_id", pedido.sorteo_id);

        if (usadosError) {
            console.error("Error consultando números usados:", usadosError);
            return NextResponse.json(
                { error: "Error consultando números usados" },
                { status: 500 }
            );
        }

        const usadosSet = new Set<number>(
            (numerosUsados || []).map((n: any) => n.numero)
        );

        // 6️⃣ Construir lista de disponibles 1..totalNumeros
        const disponibles: number[] = [];
        for (let i = 1; i <= totalNumeros; i++) {
            if (!usadosSet.has(i)) {
                disponibles.push(i);
            }
        }

        const cantidad = pedido.cantidad_numeros || 0;

        if (cantidad <= 0) {
            return NextResponse.json(
                { error: "El pedido no tiene cantidad_numeros válida" },
                { status: 400 }
            );
        }

        if (disponibles.length < cantidad) {
            return NextResponse.json(
                { error: "No hay suficientes números disponibles en el sorteo" },
                { status: 400 }
            );
        }

        // 7️⃣ Elegir números aleatorios
        const mezclados = shuffle(disponibles);
        const seleccionados = mezclados.slice(0, cantidad);

        // 8️⃣ Insertar en numeros_asignados
        const rows = seleccionados.map((num) => ({
            sorteo_id: pedido.sorteo_id,
            pedido_id: pedido.id,
            numero: num,
        }));

        const { error: insertError } = await supabaseAdmin
            .from("numeros_asignados")
            .insert(rows);

        if (insertError) {
            console.error("Error insertando numeros_asignados:", insertError);
            return NextResponse.json(
                { error: "No se pudieron asignar los números" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            ok: true,
            alreadyAssigned: false,
            numeros: seleccionados,
        });
    } catch (err) {
        console.error("Error en /api/pedidos/asignar:", err);
        return NextResponse.json(
            { error: "Error interno" },
            { status: 500 }
        );
    }
}
