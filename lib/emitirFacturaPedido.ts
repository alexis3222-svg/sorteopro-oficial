// lib/emitirFacturaPedido.ts
//
// PRIMERA INTEGRACIÓN CON PEDIDOS REALES DE BARUK593.
// Está deliberadamente limitada a ak_test_*.
// Cuando validemos checkout/datos tributarios/IVA, se adapta
// el mismo módulo a producción sin tocar PayPhone.

import {
    FactuplanError,
} from "factuplan";

import {
    getFactuplanClient,
    isFactuplanTestMode,
} from "@/lib/factuplan";

import {
    supabaseAdmin,
} from "@/lib/supabaseAdmin";


type PedidoFactura = {
    id: number;
    estado: string | null;
    nombre: string | null;
    correo: string | null;
    telefono: string | null;
    cantidad_numeros: number | null;
    precio_unitario: number | null;
    total: number | null;
    metodo_pago: string | null;
    actividad_numero: number | null;
    facturacion_tipo: "consumer_final" | "identified" | null;
    facturacion_identificacion_tipo: "CEDULA" | "RUC" | "PASSPORT" | null;
    facturacion_identificacion: string | null;
    facturacion_razon_social: string | null;
    facturacion_direccion: string | null;
    facturacion_correo: string | null;
    tipo_compra: "self" | "gift" | null;
    es_pedido_premio: boolean | null;
};


export type EmitirFacturaPedidoResultado =
    | {
        ok: true;
        skipped: false;
        alreadyExists: boolean;
        pedidoId: number;
        receiptId: string;
        sequential: string | null;
        accessKey: string | null;
        status: string;
        authorizationNumber: string | null;
    }
    | {
        ok: true;
        skipped: true;
        alreadyExists: false;
        pedidoId: number;
        reason: string;
    }
    | {
        ok: false;
        pedidoId: number;
        error: string;
        code: string | null;
        details: unknown;
    };


function normalizeEmail(
    value:
        | string
        | null
        | undefined
) {
    return String(
        value ??
        ""
    )
        .trim()
        .toLowerCase();
}


function formatPersonName(
    value:
        | string
        | null
        | undefined
) {
    const cleaned =
        String(
            value ??
            ""
        )
            .trim()
            .replace(
                /\s+/g,
                " "
            );


    if (
        !cleaned
    ) {
        return "";
    }


    return cleaned
        .split(
            " "
        )
        .map(
            word =>
                word
                    .split(
                        "-"
                    )
                    .map(
                        part =>
                            part
                                ? (
                                    part
                                        .charAt(
                                            0
                                        )
                                        .toLocaleUpperCase(
                                            "es-EC"
                                        ) +
                                    part
                                        .slice(
                                            1
                                        )
                                        .toLocaleLowerCase(
                                            "es-EC"
                                        )
                                )
                                : part
                    )
                    .join(
                        "-"
                    )
        )
        .join(
            " "
        );
}


function normalizePhoneForFactuplan(
    value:
        | string
        | null
        | undefined
) {
    const digits =
        String(
            value ??
            ""
        )
            .replace(
                /\D/g,
                ""
            );


    if (
        /^09\d{8}$/.test(
            digits
        )
    ) {
        return `+593${digits.slice(
            1
        )}`;
    }


    if (
        /^5939\d{8}$/.test(
            digits
        )
    ) {
        return `+${digits}`;
    }


    return String(
        value ??
        ""
    )
        .trim() ||
        null;
}


function sleep(
    milliseconds: number
) {
    return new Promise(
        resolve =>
            setTimeout(
                resolve,
                milliseconds
            )
    );
}


/* ============================================================
   SINCRONIZAR ESTADO CON FACTUPLAN
============================================================ */

async function syncReceiptStatus(
    pedidoId: number,
    receiptId: string
) {
    const factuplan =
        getFactuplanClient();


    let currentStatus:
        any =
        null;


    /*
     * En sandbox normalmente termina en pocos segundos.
     * Esta espera es solamente para la prueba manual del pedido.
     *
     * Cuando pasemos a producción usaremos webhook / consulta
     * posterior para no mantener abierto el flujo de pago.
     */
    for (
        let attempt = 0;
        attempt < 6;
        attempt++
    ) {
        currentStatus =
            await factuplan
                .invoices
                .getStatus(
                    receiptId
                );


        const status =
            String(
                currentStatus
                    ?.status ??
                ""
            )
                .trim()
                .toUpperCase();


        if (
            [
                "COMPLETED",
                "ERROR",
                "REJECTED",
            ].includes(
                status
            )
        ) {
            break;
        }


        await sleep(
            1000
        );
    }


    const status =
        String(
            currentStatus
                ?.status ??
            "PROCESSING"
        )
            .trim()
            .toUpperCase();


    const authorizationNumber =
        currentStatus
            ?.authorizationNumber
            ? String(
                currentStatus
                    .authorizationNumber
            )
            : null;


    const now =
        new Date()
            .toISOString();


    const {
        error:
        updateError,
    } =
        await supabaseAdmin
            .from(
                "facturas"
            )
            .update({
                status,

                authorization_number:
                    authorizationNumber,

                authorized_at:
                    status ===
                        "COMPLETED"
                        ? now
                        : null,

                error:
                    status ===
                        "ERROR" ||
                        status ===
                        "REJECTED"
                        ? JSON.stringify(
                            currentStatus
                                ?.messages ??
                            []
                        )
                        : null,

                updated_at:
                    now,
            })
            .eq(
                "pedido_id",
                pedidoId
            );


    if (
        updateError
    ) {
        console.error(
            "[Factuplan] No se pudo actualizar el estado local:",
            updateError
        );
    }


    return {
        status,

        authorizationNumber,
    };
}


/* ============================================================
   EMITIR FACTURA DE PRUEBA DESDE UN PEDIDO REAL
============================================================ */

export async function emitirFacturaPedidoPrueba(
    pedidoId: number
): Promise<EmitirFacturaPedidoResultado> {

    try {

        if (
            !Number.isInteger(
                pedidoId
            ) ||
            pedidoId <=
            0
        ) {
            return {
                ok: false,
                pedidoId,
                error:
                    "pedidoId inválido",
                code:
                    "INVALID_ORDER_ID",
                details:
                    null,
            };
        }


        /*
         * Seguridad:
         * este módulo NO puede emitir con ak_live_*.
         */
        if (
            !isFactuplanTestMode()
        ) {
            return {
                ok: false,
                pedidoId,
                error:
                    "La emisión de prueba solo está habilitada con ak_test_*.",
                code:
                    "LIVE_KEY_BLOCKED",
                details:
                    null,
            };
        }


        const {
            data:
            pedidoData,

            error:
            pedidoError,
        } =
            await supabaseAdmin
                .from(
                    "pedidos"
                )
                .select(`
                    id,
                    estado,
                    nombre,
                    correo,
                    telefono,
                    cantidad_numeros,
                    precio_unitario,
                    total,
                    metodo_pago,
                    actividad_numero,
                    facturacion_tipo,
                    facturacion_identificacion_tipo,
                    facturacion_identificacion,
                    facturacion_razon_social,
                    facturacion_direccion,
                    facturacion_correo,
                    tipo_compra,
                    es_pedido_premio
                `)
                .eq(
                    "id",
                    pedidoId
                )
                .maybeSingle();


        if (
            pedidoError ||
            !pedidoData
        ) {
            return {
                ok: false,
                pedidoId,
                error:
                    "Pedido no encontrado",
                code:
                    "ORDER_NOT_FOUND",
                details:
                    pedidoError ??
                    null,
            };
        }


        const pedido =
            pedidoData as
            PedidoFactura;


        if (
            pedido.estado !==
            "pagado"
        ) {
            return {
                ok: true,
                skipped: true,
                alreadyExists: false,
                pedidoId,
                reason:
                    "El pedido todavía no está pagado.",
            };
        }


        /*
         * Los pedidos gratuitos originados por premios
         * NO deben generar factura de venta.
         */
        if (
            pedido.es_pedido_premio ===
            true
        ) {
            return {
                ok: true,
                skipped: true,
                alreadyExists: false,
                pedidoId,
                reason:
                    "Pedido gratuito generado por premio.",
            };
        }


        const total =
            Number(
                pedido.total ??
                0
            );


        if (
            !Number.isFinite(
                total
            ) ||
            total <=
            0
        ) {
            return {
                ok: true,
                skipped: true,
                alreadyExists: false,
                pedidoId,
                reason:
                    "El pedido no tiene un valor facturable.",
            };
        }


        const email =
            normalizeEmail(
                pedido.facturacion_correo ??
                pedido.correo
            );


        if (
            !email ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                email
            )
        ) {
            return {
                ok: false,
                pedidoId,
                error:
                    "El pedido no tiene un correo válido para facturación.",
                code:
                    "CUSTOMER_EMAIL_REQUIRED",
                details:
                    null,
            };
        }


        /*
         * Idempotencia local.
         */
        const {
            data:
            existingInvoice,

            error:
            existingInvoiceError,
        } =
            await supabaseAdmin
                .from(
                    "facturas"
                )
                .select(`
                    pedido_id,
                    factuplan_receipt_id,
                    sequential,
                    access_key,
                    authorization_number,
                    status
                `)
                .eq(
                    "pedido_id",
                    pedidoId
                )
                .maybeSingle();


        if (
            existingInvoiceError
        ) {
            return {
                ok: false,
                pedidoId,
                error:
                    "No se pudo verificar si el pedido ya tiene factura.",
                code:
                    "LOCAL_INVOICE_LOOKUP_FAILED",
                details:
                    existingInvoiceError,
            };
        }


        if (
            existingInvoice
                ?.factuplan_receipt_id
        ) {
            const synced =
                await syncReceiptStatus(
                    pedidoId,
                    existingInvoice
                        .factuplan_receipt_id
                );


            return {
                ok: true,
                skipped: false,
                alreadyExists: true,
                pedidoId,
                receiptId:
                    existingInvoice
                        .factuplan_receipt_id,
                sequential:
                    existingInvoice
                        .sequential ??
                    null,
                accessKey:
                    existingInvoice
                        .access_key ??
                    null,
                status:
                    synced.status,
                authorizationNumber:
                    synced
                        .authorizationNumber ??
                    existingInvoice
                        .authorization_number ??
                    null,
            };
        }


        const quantity =
            Math.max(
                1,
                Number(
                    pedido
                        .cantidad_numeros ??
                    1
                )
            );


        /*
         * Para que el total enviado coincida exactamente con
         * el pedido, calculamos el precio unitario desde total /
         * cantidad si el valor guardado no es utilizable.
         */
        let unitPrice =
            Number(
                pedido
                    .precio_unitario ??
                0
            );


        if (
            !Number.isFinite(
                unitPrice
            ) ||
            unitPrice <=
            0
        ) {
            unitPrice =
                Number(
                    (
                        total /
                        quantity
                    ).toFixed(
                        6
                    )
                );
        }


        const actividadNumero =
            pedido.actividad_numero !== null &&
                pedido.actividad_numero !== undefined
                ? String(pedido.actividad_numero)
                : String(pedidoId);


        const identifiedCustomer =
            pedido.facturacion_tipo === "identified";


        const identificationType =
            identifiedCustomer
                ? pedido.facturacion_identificacion_tipo
                : "FINAL_CONSUMER";


        const identification =
            identifiedCustomer
                ? String(
                    pedido.facturacion_identificacion ??
                    ""
                ).trim()
                : "9999999999999";


        const rawLegalName =
            identifiedCustomer
                ? String(
                    pedido.facturacion_razon_social ??
                    pedido.nombre ??
                    ""
                ).trim()
                : "CONSUMIDOR FINAL";


        const legalName =
            identifiedCustomer &&
                (
                    identificationType ===
                    "CEDULA" ||
                    identificationType ===
                    "PASSPORT"
                )
                ? formatPersonName(
                    rawLegalName
                )
                : rawLegalName;


        const billingAddress =
            identifiedCustomer
                ? String(
                    pedido.facturacion_direccion ??
                    ""
                ).trim()
                : "";


        const billingPhone =
            identifiedCustomer
                ? normalizePhoneForFactuplan(
                    pedido.telefono
                )
                : null;


        if (
            identifiedCustomer &&
            (
                !identificationType ||
                !identification ||
                !legalName ||
                !billingAddress
            )
        ) {
            return {
                ok: false,
                pedidoId,
                error:
                    "El pedido no tiene completos los datos tributarios para facturación.",
                code:
                    "BILLING_DATA_REQUIRED",
                details:
                    null,
            };
        }


        const factuplan =
            getFactuplanClient();



        /*
         * SANDBOX:
         * - usa consumidor final o datos identificados del pedido
         * - mantiene NOT_TAXABLE por ahora
         * - forma de pago 20
         *
         * El tratamiento tributario se revisará para PRODUCCIÓN
         * con la definición final de Ecuabaruk.
         */
        const invoice =
            await factuplan
                .invoices
                .create({
                    customer: {
                        identificationType:
                            identificationType!,

                        identification,

                        legalName,

                        email,

                        ...(identifiedCustomer
                            ? {
                                address:
                                    billingAddress,

                                ...(billingPhone
                                    ? {
                                        phone:
                                            billingPhone,
                                    }
                                    : {}),
                            }
                            : {}),
                    },

                    items: [
                        {
                            code:
                                `ACT${actividadNumero}`,

                            description:
                                `Tarjetas digitales de participación - Actividad Baruk593 #${actividadNumero}`,

                            quantity,

                            unitPrice,

                            discount:
                                0,

                            taxType:
                                "NOT_TAXABLE",
                        },
                    ],

                    payments: [
                        {
                            method:
                                "20",

                            amount:
                                total,
                        },
                    ],

                    /*
                     * Factuplan agrega automáticamente al RIDE algunos
                     * datos de contacto del customer (por ejemplo Email
                     * y Teléfono). No los duplicamos manualmente aquí.
                     */
                    additionalInfo: {
                        Pedido:
                            `#${pedidoId}`,

                        NombreComercial:
                            "Tarjetas de la Suerte",

                        MetodoPago:
                            String(
                                pedido.metodo_pago ??
                                "No especificado"
                            ),
                    },
                });


        const receiptId =
            String(
                invoice.id
            );


        const sequential =
            invoice.sequential
                ? String(
                    invoice.sequential
                )
                : null;


        const accessKey =
            invoice.accessKey
                ? String(
                    invoice.accessKey
                )
                : null;


        const initialStatus =
            String(
                invoice.status ??
                "PROCESSING"
            )
                .trim()
                .toUpperCase();


        const now =
            new Date()
                .toISOString();


        const {
            error:
            saveError,
        } =
            await supabaseAdmin
                .from(
                    "facturas"
                )
                .upsert(
                    {
                        pedido_id:
                            pedidoId,

                        provider:
                            "factuplan",

                        environment:
                            "test",

                        factuplan_receipt_id:
                            receiptId,

                        sequential,

                        access_key:
                            accessKey,

                        status:
                            initialStatus,

                        total,

                        error:
                            null,

                        updated_at:
                            now,
                    },
                    {
                        onConflict:
                            "pedido_id",
                    }
                );


        if (
            saveError
        ) {
            console.error(
                "[Factuplan] Se emitió la factura, pero no se pudo guardar localmente:",
                saveError
            );


            return {
                ok: false,
                pedidoId,
                error:
                    "Factuplan emitió el comprobante, pero no pudo guardarse en Supabase.",
                code:
                    "LOCAL_SAVE_FAILED",
                details: {
                    receiptId,
                    saveError,
                },
            };
        }


        const synced =
            await syncReceiptStatus(
                pedidoId,
                receiptId
            );


        return {
            ok: true,
            skipped: false,
            alreadyExists: false,
            pedidoId,
            receiptId,
            sequential,
            accessKey,
            status:
                synced.status,
            authorizationNumber:
                synced
                    .authorizationNumber,
        };


    } catch (
    error:
        unknown
    ) {

        console.error(
            "[Factuplan] emitirFacturaPedidoPrueba error:",
            error
        );


        if (
            error instanceof
            FactuplanError
        ) {
            return {
                ok: false,
                pedidoId,
                error:
                    error.message,
                code:
                    error.code ??
                    null,
                details:
                    error.details ??
                    null,
            };
        }


        return {
            ok: false,
            pedidoId,
            error:
                error instanceof
                    Error
                    ? error.message
                    : "Error inesperado emitiendo factura.",
            code:
                "INTERNAL",
            details:
                null,
        };
    }
}
