// app/api/shop/payments/transfer/route.ts

import {
    NextRequest,
    NextResponse,
} from "next/server";

import {
    supabaseAdmin,
} from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET =
    "baruk-shop-comprobantes";

const MAX_FILE_SIZE =
    8 * 1024 * 1024;

const ALLOWED_TYPES =
    new Set([
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/pdf",
    ]);

function getExtension(
    file: File
) {
    switch (file.type) {
        case "image/jpeg":
            return "jpg";

        case "image/png":
            return "png";

        case "image/webp":
            return "webp";

        case "application/pdf":
            return "pdf";

        default:
            return null;
    }
}

export async function POST(
    req: NextRequest
) {
    let uploadedPath:
        | string
        | null = null;

    try {
        const formData =
            await req.formData();

        const orderId =
            String(
                formData.get(
                    "orderId"
                ) ?? ""
            ).trim();

        const comprobante =
            formData.get(
                "comprobante"
            );

        /* =====================================================
           VALIDACIONES
        ===================================================== */

        if (!orderId) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Pedido inválido.",
                },
                {
                    status: 400,
                }
            );
        }

        if (
            !(
                comprobante instanceof
                File
            ) ||
            comprobante.size <= 0
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Selecciona el comprobante.",
                },
                {
                    status: 400,
                }
            );
        }

        if (
            !ALLOWED_TYPES.has(
                comprobante.type
            )
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "El comprobante debe ser JPG, PNG, WEBP o PDF.",
                },
                {
                    status: 400,
                }
            );
        }

        if (
            comprobante.size >
            MAX_FILE_SIZE
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "El archivo no puede superar los 8 MB.",
                },
                {
                    status: 400,
                }
            );
        }

        /* =====================================================
           PEDIDO
        ===================================================== */

        const {
            data: pedido,
            error: pedidoError,
        } =
            await supabaseAdmin
                .from(
                    "store_orders"
                )
                .select(`
                    id,
                    order_number,
                    estado,
                    estado_pago,
                    comprobante_transferencia
                `)
                .eq(
                    "id",
                    orderId
                )
                .maybeSingle();

        if (
            pedidoError ||
            !pedido
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Pedido no encontrado.",
                },
                {
                    status: 404,
                }
            );
        }

        if (
            pedido.estado_pago ===
            "pagado"
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Este pedido ya está pagado.",
                },
                {
                    status: 409,
                }
            );
        }

        if (
            pedido.estado ===
            "cancelado"
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Este pedido está cancelado.",
                },
                {
                    status: 409,
                }
            );
        }

        const extension =
            getExtension(
                comprobante
            );

        if (!extension) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Formato no permitido.",
                },
                {
                    status: 400,
                }
            );
        }

        /* =====================================================
           SUBIR A STORAGE PRIVADO
        ===================================================== */

        uploadedPath =
            `transferencias/${pedido.order_number}/comprobante-${Date.now()}.${extension}`;

        const buffer =
            Buffer.from(
                await comprobante.arrayBuffer()
            );

        const {
            error: uploadError,
        } =
            await supabaseAdmin.storage
                .from(BUCKET)
                .upload(
                    uploadedPath,
                    buffer,
                    {
                        contentType:
                            comprobante.type,

                        cacheControl:
                            "3600",

                        upsert:
                            false,
                    }
                );

        if (uploadError) {
            console.error(
                "Error subiendo comprobante:",
                uploadError
            );

            throw uploadError;
        }

        const comprobanteAnterior =
            pedido.comprobante_transferencia;

        /* =====================================================
           ACTUALIZAR PEDIDO
        ===================================================== */

        const {
            error: updateError,
        } =
            await supabaseAdmin
                .from(
                    "store_orders"
                )
                .update({
                    metodo_pago:
                        "transferencia",

                    estado_pago:
                        "procesando",

                    comprobante_transferencia:
                        uploadedPath,
                })
                .eq(
                    "id",
                    pedido.id
                );

        if (updateError) {
            await supabaseAdmin.storage
                .from(BUCKET)
                .remove([
                    uploadedPath,
                ]);

            uploadedPath = null;

            throw updateError;
        }

        /* =====================================================
           ELIMINAR COMPROBANTE ANTERIOR
        ===================================================== */

        if (
            comprobanteAnterior &&
            comprobanteAnterior !==
            uploadedPath
        ) {
            const {
                error:
                deleteError,
            } =
                await supabaseAdmin.storage
                    .from(BUCKET)
                    .remove([
                        comprobanteAnterior,
                    ]);

            if (deleteError) {
                console.error(
                    "No se pudo borrar comprobante anterior:",
                    deleteError
                );
            }
        }

        return NextResponse.json({
            ok: true,

            message:
                "Comprobante recibido.",

            estadoPago:
                "procesando",
        });

    } catch (error) {
        console.error(
            "Error registrando transferencia:",
            error
        );

        if (uploadedPath) {
            try {
                await supabaseAdmin.storage
                    .from(BUCKET)
                    .remove([
                        uploadedPath,
                    ]);
            } catch {
                // conservar error original
            }
        }

        return NextResponse.json(
            {
                ok: false,
                error:
                    "No se pudo registrar el comprobante.",
            },
            {
                status: 500,
            }
        );
    }
}