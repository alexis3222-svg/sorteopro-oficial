// app/api/pedidos/crear/route.ts

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TipoCompra = "self" | "gift";

interface GiftInput {
    destinatarioNombre: string;
    destinatarioTelefono: string;
    mensaje?: string;
}

function normalizeEmail(value: unknown): string | null {
    const email = String(value ?? "")
        .trim()
        .toLowerCase();

    return email || null;
}

function normalizePhone(value: unknown): string | null {
    const phone = String(value ?? "")
        .trim()
        .replace(/[^\d+]/g, "");

    return phone || null;
}

function normalizeEcuadorWhatsApp(value: unknown): string | null {
    const digits = String(value ?? "")
        .replace(/\D/g, "");

    // 0991234567 -> +593991234567
    if (/^09\d{8}$/.test(digits)) {
        return `+593${digits.slice(1)}`;
    }

    // 593991234567 -> +593991234567
    if (/^5939\d{8}$/.test(digits)) {
        return `+${digits}`;
    }

    return null;
}

function normalizeText(value: unknown): string | null {
    const text = String(value ?? "").trim();
    return text || null;
}

function parseTipoCompra(value: unknown): TipoCompra {
    return value === "gift" ? "gift" : "self";
}

function getGiftInput(body: Record<string, unknown>): GiftInput {
    const gift =
        body.gift && typeof body.gift === "object"
            ? (body.gift as Record<string, unknown>)
            : {};

    return {
        destinatarioNombre:
            normalizeText(
                gift.destinatarioNombre ??
                gift.destinatario_nombre ??
                body.destinatarioNombre ??
                body.destinatario_nombre,
            ) ?? "",

        destinatarioTelefono:
            normalizeEcuadorWhatsApp(
                gift.destinatarioTelefono ??
                gift.destinatario_telefono ??
                body.destinatarioTelefono ??
                body.destinatario_telefono,
            ) ?? "",

        mensaje:
            normalizeText(
                gift.mensaje ??
                body.mensajeRegalo ??
                body.mensaje_regalo,
            ) ?? undefined,
    };
}

export async function POST(req: NextRequest) {
    try {
        const body = (await req.json().catch(() => null)) as
            | Record<string, unknown>
            | null;

        if (!body) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "El cuerpo de la solicitud no es válido",
                },
                { status: 400 },
            );
        }

        const sorteoId =
            body.sorteoId ?? body.sorteo_id ?? null;

        const actividadNumero =
            body.actividadNumero ??
            body.actividad_numero ??
            null;

        const nombre = normalizeText(body.nombre);
        const telefono = normalizePhone(body.telefono);
        const correo = normalizeEmail(body.correo);

        const metodoPago = String(
            body.metodoPago ??
            body.metodo_pago ??
            "",
        ).trim();

        const cantidadNumeros = Number(
            body.cantidadNumeros ??
            body.cantidad_numeros ??
            0,
        );

        const precioUnitario = Number(
            body.precioUnitario ??
            body.precio_unitario ??
            0,
        );

        const total = Number(body.total ?? 0);

        const tipoCompra = parseTipoCompra(
            body.tipoCompra ??
            body.tipo_compra,
        );

        const cardDesignId =
            normalizeText(
                body.cardDesignId ??
                body.card_design_id,
            ) ?? null;

        const clientTransactionId =
            normalizeText(
                body.clientTransactionId ??
                body.client_transaction_id ??
                body.tx,
            ) ?? null;

        /*
         * Validaciones generales.
         */

        if (!sorteoId) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Falta sorteoId",
                },
                { status: 400 },
            );
        }

        if (!metodoPago) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Falta metodoPago",
                },
                { status: 400 },
            );
        }

        if (
            !Number.isInteger(cantidadNumeros) ||
            cantidadNumeros <= 0
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "cantidadNumeros inválida",
                },
                { status: 400 },
            );
        }

        if (
            !Number.isFinite(precioUnitario) ||
            precioUnitario < 0
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "precioUnitario inválido",
                },
                { status: 400 },
            );
        }

        if (!Number.isFinite(total) || total < 0) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "total inválido",
                },
                { status: 400 },
            );
        }

        /*
         * El correo del comprador se conserva para facturación,
         * recuperación del pedido y compra propia.
         */

        if (!nombre) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Falta el nombre del comprador",
                },
                { status: 400 },
            );
        }

        if (!correo) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Falta el correo del comprador",
                },
                { status: 400 },
            );
        }

        /*
         * Datos del regalo.
         */

        const giftInput =
            tipoCompra === "gift"
                ? getGiftInput(body)
                : null;

        if (tipoCompra === "gift") {
            if (!giftInput?.destinatarioNombre) {
                return NextResponse.json(
                    {
                        ok: false,
                        error:
                            "Falta el nombre del destinatario",
                    },
                    { status: 400 },
                );
            }

            if (!giftInput.destinatarioTelefono) {
                return NextResponse.json(
                    {
                        ok: false,
                        error:
                            "Falta el número de WhatsApp del destinatario",
                    },
                    { status: 400 },
                );
            }
        }

        /*
         * Resolver afiliado desde la cookie.
         * El afiliado no se acepta desde el body.
         */

        const rawRef =
            req.cookies.get("affiliate_ref")?.value ??
            null;

        const affiliateRef = rawRef
            ? decodeURIComponent(rawRef).trim()
            : null;

        let affiliateId: string | null = null;
        let affiliateCode: string | null = null;

        if (affiliateRef) {
            const { data: affiliate, error: affiliateError } =
                await supabaseAdmin
                    .from("affiliates")
                    .select(
                        "id, code, username, status",
                    )
                    .or(
                        `code.eq.${affiliateRef},username.eq.${affiliateRef}`,
                    )
                    .eq("status", "active")
                    .maybeSingle();

            if (!affiliateError && affiliate) {
                affiliateId = affiliate.id;

                affiliateCode =
                    affiliate.code ??
                    affiliate.username ??
                    affiliateRef;
            }
        }

        /*
         * Idempotencia de PayPhone.
         */

        if (metodoPago === "payphone") {
            if (!clientTransactionId) {
                return NextResponse.json(
                    {
                        ok: false,
                        error:
                            "Falta clientTransactionId para PayPhone",
                    },
                    { status: 400 },
                );
            }

            const { data: existing, error: existingError } =
                await supabaseAdmin
                    .from("pedidos")
                    .select(
                        `
              id,
              estado,
              metodo_pago,
              tipo_compra,
              cards_processing_status,
              payphone_client_transaction_id
            `,
                    )
                    .eq(
                        "payphone_client_transaction_id",
                        clientTransactionId,
                    )
                    .order("id", {
                        ascending: false,
                    })
                    .limit(1)
                    .maybeSingle();

            if (!existingError && existing) {
                return NextResponse.json({
                    ok: true,
                    pedido: existing,
                    reused: true,
                });
            }
        }

        /*
         * Crear pedido.
         *
         * cantidad_numeros sigue utilizándose internamente.
         * En el nuevo home se mostrará como cantidad de
         * Tarjetas de la Suerte.
         */

        const insertPayload: Record<string, unknown> = {
            sorteo_id: sorteoId,
            actividad_numero: actividadNumero,

            nombre,
            telefono,
            correo,

            metodo_pago: metodoPago,
            cantidad_numeros: cantidadNumeros,
            precio_unitario: precioUnitario,
            total,

            estado: "pendiente",

            tipo_compra: tipoCompra,
            card_design_id: cardDesignId,

            cards_processing_status: "pending",
            cards_processed_at: null,
            cards_processing_error: null,

            affiliate_id: affiliateId,
            affiliate_code: affiliateCode,
        };

        if (metodoPago === "payphone") {
            insertPayload.payphone_client_transaction_id =
                clientTransactionId;
        }

        const { data: pedido, error: pedidoError } =
            await supabaseAdmin
                .from("pedidos")
                .insert(insertPayload)
                .select(
                    `
            id,
            estado,
            metodo_pago,
            tipo_compra,
            card_design_id,
            cards_processing_status,
            payphone_client_transaction_id
          `,
                )
                .single();

        if (pedidoError || !pedido) {
            console.error(
                "Error creando pedido:",
                pedidoError,
            );

            return NextResponse.json(
                {
                    ok: false,
                    error:
                        pedidoError?.message ??
                        "No se pudo crear el pedido",
                },
                { status: 500 },
            );
        }

        /*
         * Si es un regalo, crear el registro del regalo.
         *
         * El destinatario será el propietario de:
         * - las tarjetas;
         * - los números;
         * - las esferas;
         * - los premios.
         */

        let giftResponse:
            | {
                id: string;
                estado: string;
                destinatario_nombre: string;
                destinatario_correo: string | null;
                destinatario_telefono: string;
            }
            | null = null;

        if (
            tipoCompra === "gift" &&
            giftInput
        ) {
            const { data: gift, error: giftError } =
                await supabaseAdmin
                    .from("baruk_gifts")
                    .insert({
                        pedido_id: pedido.id,

                        comprador_nombre: nombre,
                        comprador_correo: correo,
                        comprador_telefono: telefono,

                        destinatario_nombre:
                            giftInput.destinatarioNombre,

                        // Se completa cuando el destinatario
                        // reclama el regalo e ingresa con Google.
                        destinatario_correo: null,

                        destinatario_telefono:
                            giftInput.destinatarioTelefono,

                        mensaje: giftInput.mensaje ?? null,

                        estado: "pending_payment",
                        envio_inmediato: true,

                        whatsapp_status: "pending",
                        email_status: "pending",
                    })
                    .select(
                        `
              id,
              estado,
              destinatario_nombre,
              destinatario_correo,
              destinatario_telefono
            `,
                    )
                    .single();

            if (giftError || !gift) {
                console.error(
                    "Error creando regalo:",
                    giftError,
                );

                /*
                 * Como el pedido todavía está pendiente y no está pagado,
                 * eliminamos el pedido incompleto.
                 *
                 * Más adelante esta operación se reemplazará por una RPC
                 * transaccional en PostgreSQL.
                 */
                const { error: rollbackError } =
                    await supabaseAdmin
                        .from("pedidos")
                        .delete()
                        .eq("id", pedido.id)
                        .eq("estado", "pendiente");

                if (rollbackError) {
                    console.error(
                        "No se pudo revertir el pedido:",
                        rollbackError,
                    );
                }

                return NextResponse.json(
                    {
                        ok: false,
                        error:
                            giftError?.message ??
                            "No se pudo preparar el regalo",
                    },
                    { status: 500 },
                );
            }

            giftResponse = gift;
        }

        return NextResponse.json({
            ok: true,
            pedido,
            gift: giftResponse,
            reused: false,
        });
    } catch (error: unknown) {
        console.error(
            "pedidos/crear error:",
            error,
        );

        const message =
            error instanceof Error
                ? error.message
                : "Error interno";

        return NextResponse.json(
            {
                ok: false,
                error: message,
            },
            { status: 500 },
        );
    }
}