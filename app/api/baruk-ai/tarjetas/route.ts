import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PaymentMethod = {
    id: string;
    label: string;
    enabled?: boolean;
};

type BarukSalesSettings = {
    enabled?: boolean;
    packages?: number[];
    payment_methods?: PaymentMethod[];
};

function unauthorized() {
    return NextResponse.json(
        {
            success: false,
            error: "Unauthorized",
        },
        { status: 401 }
    );
}

export async function GET(request: NextRequest) {
    try {
        // ============================================
        // 1. AUTORIZACIÓN ENTRE BARUK AI Y BARUK593
        // ============================================

        const expectedSecret =
            process.env.BARUK_AI_INTERNAL_SECRET;

        if (!expectedSecret) {
            console.error(
                "BARUK_AI_INTERNAL_SECRET no está configurado"
            );

            return NextResponse.json(
                {
                    success: false,
                    error: "Configuración interna incompleta",
                },
                { status: 500 }
            );
        }

        const authorization =
            request.headers.get("authorization");

        if (
            !authorization ||
            authorization !== `Bearer ${expectedSecret}`
        ) {
            return unauthorized();
        }

        // ============================================
        // 2. SORTEO ACTIVO REAL
        // ============================================

        const {
            data: sorteo,
            error: sorteoError,
        } = await supabaseAdmin
            .from("sorteos")
            .select(`
        id,
        titulo,
        descripcion,
        precio_numero,
        estado
      `)
            .eq("estado", "activo")
            .order("created_at", {
                ascending: false,
            })
            .limit(1)
            .maybeSingle();

        if (sorteoError) {
            console.error(
                "Error consultando sorteo:",
                sorteoError
            );

            return NextResponse.json(
                {
                    success: false,
                    error: "No se pudo consultar el sorteo activo",
                },
                { status: 500 }
            );
        }

        if (!sorteo) {
            return NextResponse.json(
                {
                    success: false,
                    error: "No existe un sorteo activo",
                },
                { status: 404 }
            );
        }

        // ============================================
        // 3. CONFIGURACIÓN COMERCIAL
        // ============================================

        const {
            data: settingsRow,
            error: settingsError,
        } = await supabaseAdmin
            .from("app_settings")
            .select("value")
            .eq("key", "baruk_sales")
            .maybeSingle();

        if (settingsError) {
            console.error(
                "Error consultando baruk_sales:",
                settingsError
            );

            return NextResponse.json(
                {
                    success: false,
                    error:
                        "No se pudo consultar la configuración comercial",
                },
                { status: 500 }
            );
        }

        const settings =
            (settingsRow?.value ??
                {}) as BarukSalesSettings;

        if (settings.enabled === false) {
            return NextResponse.json(
                {
                    success: false,
                    error:
                        "Las ventas están temporalmente deshabilitadas",
                },
                { status: 503 }
            );
        }

        const packages = Array.isArray(settings.packages)
            ? settings.packages.filter(
                (value): value is number =>
                    typeof value === "number" &&
                    Number.isInteger(value) &&
                    value > 0
            )
            : [];

        const paymentMethods = Array.isArray(
            settings.payment_methods
        )
            ? settings.payment_methods
                .filter(
                    (method) =>
                        method &&
                        typeof method.id === "string" &&
                        typeof method.label === "string" &&
                        method.enabled !== false
                )
                .map((method) => ({
                    id: method.id,
                    label: method.label,
                }))
            : [];

        // ============================================
        // 4. RESPUESTA COMERCIAL AUTORIZADA
        // ============================================

        return NextResponse.json(
            {
                success: true,

                producto: {
                    nombre: "Tarjetas de la Suerte",
                    purchase_url: "https://www.baruk593.com/",
                },

                sorteo: {
                    id: sorteo.id,
                    titulo: sorteo.titulo,
                    descripcion: sorteo.descripcion,
                    estado: sorteo.estado,
                    precio_unitario: Number(
                        sorteo.precio_numero
                    ),
                    moneda: "USD",
                },

                packages,

                payment_methods: paymentMethods,
            },
            {
                status: 200,
                headers: {
                    "Cache-Control": "no-store",
                },
            }
        );
    } catch (error) {
        console.error(
            "Baruk AI tarjetas API error:",
            error
        );

        return NextResponse.json(
            {
                success: false,
                error: "Error interno del servidor",
            },
            { status: 500 }
        );
    }
}