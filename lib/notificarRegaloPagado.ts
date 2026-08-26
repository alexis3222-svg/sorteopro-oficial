import {
    supabaseAdmin,
} from "@/lib/supabaseAdmin";


type NotificationResult =
    | {
        ok: true;
        alreadySent: boolean;
    }
    | {
        ok: false;
        error: string;
    };


/* ============================================================
   NORMALIZAR NÚMERO PARA WHATSAPP
============================================================ */

function normalizeWhatsAppPhone(
    value:
        | string
        | null
        | undefined
): string | null {

    let phone =
        String(
            value ?? ""
        )
            .trim()
            .replace(
                /[^\d+]/g,
                ""
            );


    if (!phone) {
        return null;
    }


    /*
     * Eliminar prefijo whatsapp:
     * si por algún motivo viniera incluido.
     */
    phone =
        phone.replace(
            /^whatsapp:/i,
            ""
        );


    /*
     * Quitar "+" temporalmente.
     */
    let digits =
        phone.replace(
            /\D/g,
            ""
        );


    /*
     * 00593...
     */
    if (
        digits.startsWith(
            "00"
        )
    ) {
        digits =
            digits.slice(2);
    }


    /*
     * Ecuador ya internacional:
     * 59399xxxxxxx
     */
    if (
        digits.startsWith(
            "593"
        )
    ) {
        return `whatsapp:+${digits}`;
    }


    /*
     * Formato local Ecuador:
     * 09xxxxxxxx
     */
    if (
        digits.startsWith(
            "0"
        ) &&
        digits.length ===
        10
    ) {
        return `whatsapp:+593${digits.slice(1)}`;
    }


    /*
     * 9xxxxxxxx
     */
    if (
        digits.startsWith(
            "9"
        ) &&
        digits.length ===
        9
    ) {
        return `whatsapp:+593${digits}`;
    }


    /*
     * Otros formatos internacionales.
     */
    if (
        digits.length >= 10
    ) {
        return `whatsapp:+${digits}`;
    }


    return null;
}


/* ============================================================
   LIMPIAR TEXTO DE VARIABLES
============================================================ */

function cleanTemplateValue(
    value:
        | string
        | null
        | undefined
): string {

    return String(
        value ?? ""
    )
        .replace(
            /\s+/g,
            " "
        )
        .trim();
}


/* ============================================================
   CONFIGURACIÓN TWILIO
============================================================ */

function getTwilioConfig() {

    const accountSid =
        process.env
            .TWILIO_ACCOUNT_SID
            ?.trim();

    const authToken =
        process.env
            .TWILIO_AUTH_TOKEN
            ?.trim();

    const rawFrom =
        process.env
            .TWILIO_WHATSAPP_FROM
            ?.trim();

    const contentSid =
        process.env
            .TWILIO_WHATSAPP_GIFT_CONTENT_SID
            ?.trim();


    if (
        !accountSid ||
        !authToken ||
        !rawFrom ||
        !contentSid
    ) {
        throw new Error(
            "Faltan variables de configuración de Twilio WhatsApp."
        );
    }


    const from =
        rawFrom.startsWith(
            "whatsapp:"
        )
            ? rawFrom
            : `whatsapp:${rawFrom}`;


    return {
        accountSid,
        authToken,
        from,
        contentSid,
    };
}


/* ============================================================
   NOTIFICAR REGALO PAGADO POR WHATSAPP
============================================================ */

export async function notificarRegaloPagado(
    giftId: string
): Promise<NotificationResult> {

    try {

        if (
            !giftId ||
            !giftId.trim()
        ) {
            return {
                ok: false,

                error:
                    "giftId inválido",
            };
        }


        /* =====================================================
           1. LEER REGALO
        ===================================================== */

        const {
            data:
            gift,

            error:
            giftError,
        } =
            await supabaseAdmin
                .from(
                    "baruk_gifts"
                )
                .select(`
                    id,
                    pedido_id,
                    estado,

                    comprador_nombre,

                    destinatario_nombre,
                    destinatario_telefono,

                    mensaje,
                    token_reclamo,

                    whatsapp_status,
                    enviado_at
                `)
                .eq(
                    "id",
                    giftId
                )
                .single();


        if (
            giftError ||
            !gift
        ) {

            return {
                ok: false,

                error:
                    giftError
                        ?.message ??
                    "No se encontró el regalo",
            };
        }


        /* =====================================================
           2. VALIDAR QUE EL REGALO YA ESTÉ PAGADO
        ===================================================== */

        if (
            gift.estado !==
            "paid"
        ) {

            return {
                ok: false,

                error:
                    "El regalo todavía no está pagado.",
            };
        }


        /* =====================================================
           3. IDEMPOTENCIA
        ===================================================== */

        if (
            gift.whatsapp_status ===
            "sent"
        ) {

            return {
                ok: true,

                alreadySent:
                    true,
            };
        }


        /*
         * Si otra ejecución ya tomó
         * la notificación, no duplicamos.
         */
        if (
            gift.whatsapp_status ===
            "sending"
        ) {

            console.log(
                `[WhatsApp] El regalo ${giftId} ya se está notificando.`
            );


            return {
                ok: true,

                alreadySent:
                    true,
            };
        }


        /* =====================================================
           4. CONSULTAR CANTIDAD DE TARJETAS
        ===================================================== */

        const pedidoId =
            Number(
                gift.pedido_id
            );


        if (
            !Number.isInteger(
                pedidoId
            ) ||
            pedidoId <= 0
        ) {

            return {
                ok: false,

                error:
                    "El regalo no tiene un pedido válido.",
            };
        }


        const {
            data:
            pedido,

            error:
            pedidoError,
        } =
            await supabaseAdmin
                .from(
                    "pedidos"
                )
                .select(`
                    id,
                    cantidad_numeros,
                    estado,
                    tipo_compra
                `)
                .eq(
                    "id",
                    pedidoId
                )
                .single();


        if (
            pedidoError ||
            !pedido
        ) {

            return {
                ok: false,

                error:
                    pedidoError
                        ?.message ??
                    "No se encontró el pedido del regalo.",
            };
        }


        if (
            pedido.estado !==
            "pagado"
        ) {

            return {
                ok: false,

                error:
                    "El pedido del regalo todavía no está pagado.",
            };
        }


        const cantidad =
            Number(
                pedido
                    .cantidad_numeros ??
                0
            );


        if (
            !Number.isInteger(
                cantidad
            ) ||
            cantidad <= 0
        ) {

            return {
                ok: false,

                error:
                    "El pedido no tiene una cantidad válida de tarjetas.",
            };
        }


        /* =====================================================
           5. PREPARAR DATOS DEL MENSAJE
        ===================================================== */

        const recipientName =
            cleanTemplateValue(
                gift
                    .destinatario_nombre
            );


        const buyerName =
            cleanTemplateValue(
                gift
                    .comprador_nombre
            );


        const recipientPhone =
            normalizeWhatsAppPhone(
                gift
                    .destinatario_telefono
            );


        const personalMessage =
            cleanTemplateValue(
                gift
                    .mensaje
            ) ||
            "¡Que disfrutes mucho tu regalo!";


        const claimToken =
            cleanTemplateValue(
                gift
                    .token_reclamo
            );


        if (
            !recipientName
        ) {

            return {
                ok: false,

                error:
                    "El destinatario no tiene un nombre válido.",
            };
        }


        if (
            !buyerName
        ) {

            return {
                ok: false,

                error:
                    "El comprador no tiene un nombre válido.",
            };
        }


        if (
            !recipientPhone
        ) {

            return {
                ok: false,

                error:
                    "El destinatario no tiene un número de WhatsApp válido.",
            };
        }


        if (
            !claimToken
        ) {

            return {
                ok: false,

                error:
                    "El regalo no tiene un token de reclamación válido.",
            };
        }


        /* =====================================================
           6. TOMAR LA NOTIFICACIÓN

           Evita que dos webhooks intenten
           mandar el mismo WhatsApp.
        ===================================================== */

        const {
            data:
            claimedGift,

            error:
            claimError,
        } =
            await supabaseAdmin
                .from(
                    "baruk_gifts"
                )
                .update({
                    whatsapp_status:
                        "sending",
                })
                .eq(
                    "id",
                    giftId
                )
                .in(
                    "whatsapp_status",
                    [
                        "pending",
                        "failed",
                    ]
                )
                .select(
                    "id"
                )
                .maybeSingle();


        if (
            claimError
        ) {

            return {
                ok: false,

                error:
                    claimError.message,
            };
        }


        /*
         * Otra ejecución pudo haber tomado
         * el envío unos milisegundos antes.
         */
        if (
            !claimedGift
        ) {

            const {
                data:
                currentGift,
            } =
                await supabaseAdmin
                    .from(
                        "baruk_gifts"
                    )
                    .select(
                        "whatsapp_status"
                    )
                    .eq(
                        "id",
                        giftId
                    )
                    .maybeSingle();


            if (
                currentGift
                    ?.whatsapp_status ===
                "sent" ||
                currentGift
                    ?.whatsapp_status ===
                "sending"
            ) {

                return {
                    ok: true,

                    alreadySent:
                        true,
                };
            }


            return {
                ok: false,

                error:
                    "No se pudo tomar la notificación de WhatsApp.",
            };
        }


        /* =====================================================
           7. CONFIGURAR TWILIO
        ===================================================== */

        const {
            accountSid,
            authToken,
            from,
            contentSid,
        } =
            getTwilioConfig();


        /* =====================================================
           8. CONSTRUIR PLANTILLA
        ===================================================== */

        const body =
            new URLSearchParams();


        body.set(
            "From",
            from
        );


        body.set(
            "To",
            recipientPhone
        );


        body.set(
            "ContentSid",
            contentSid
        );


        /*
         * Plantilla Twilio Call to action:
         *
         * {{1}} destinatario
         * {{2}} comprador
         * {{3}} cantidad de Tarjetas de la Suerte
         * {{4}} mensaje personalizado
         * {{5}} token único para el botón de reclamación
         */

        body.set(
            "ContentVariables",
            JSON.stringify({
                "1":
                    recipientName,

                "2":
                    buyerName,

                "3":
                    String(
                        cantidad
                    ),

                "4":
                    personalMessage,

                "5":
                    claimToken,
            })
        );


        /* =====================================================
           9. AUTENTICACIÓN TWILIO
        ===================================================== */

        const credentials =
            Buffer
                .from(
                    `${accountSid}:${authToken}`
                )
                .toString(
                    "base64"
                );


        /* =====================================================
           10. ENVIAR MENSAJE
        ===================================================== */

        const response =
            await fetch(
                `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
                {
                    method:
                        "POST",

                    headers: {
                        Authorization:
                            `Basic ${credentials}`,

                        "Content-Type":
                            "application/x-www-form-urlencoded",
                    },

                    body:
                        body.toString(),

                    cache:
                        "no-store",
                }
            );


        const data =
            await response
                .json()
                .catch(
                    () =>
                        null
                );


        /* =====================================================
           11. ERROR TWILIO
        ===================================================== */

        if (
            !response.ok
        ) {

            console.error(
                "Error enviando regalo por WhatsApp:",
                data
            );


            const {
                error:
                failedUpdateError,
            } =
                await supabaseAdmin
                    .from(
                        "baruk_gifts"
                    )
                    .update({
                        whatsapp_status:
                            "failed",
                    })
                    .eq(
                        "id",
                        giftId
                    );


            if (
                failedUpdateError
            ) {
                console.error(
                    "No se pudo marcar whatsapp_status=failed:",
                    failedUpdateError
                );
            }


            return {
                ok: false,

                error:
                    data?.message ??
                    "Twilio rechazó el mensaje de WhatsApp.",
            };
        }


        /* =====================================================
           12. REGISTRAR ENVÍO
        ===================================================== */

        const now =
            new Date()
                .toISOString();


        const {
            error:
            updateError,
        } =
            await supabaseAdmin
                .from(
                    "baruk_gifts"
                )
                .update({
                    whatsapp_status:
                        "sent",

                    enviado_at:
                        gift.enviado_at ??
                        now,
                })
                .eq(
                    "id",
                    giftId
                );


        /*
         * Twilio ya aceptó el mensaje.
         *
         * Aunque la BD fallara al actualizar,
         * NO debemos intentar enviarlo de nuevo
         * automáticamente para evitar duplicados.
         */
        if (
            updateError
        ) {

            console.error(
                "WhatsApp enviado, pero no se pudo actualizar baruk_gifts:",
                updateError
            );


            return {
                ok: true,

                alreadySent:
                    false,
            };
        }


        console.log(
            "[WhatsApp regalo enviado]",
            {
                giftId,

                pedidoId,

                messageSid:
                    data?.sid ??
                    null,

                to:
                    recipientPhone,

                cantidad,

                hasClaimToken:
                    true,
            }
        );


        return {
            ok: true,

            alreadySent:
                false,
        };


    } catch (
    error:
        unknown
    ) {

        console.error(
            "notificarRegaloPagado:",
            error
        );


        /*
         * Intentamos liberar el regalo para
         * permitir un reintento posterior.
         */
        if (
            giftId
        ) {

            await supabaseAdmin
                .from(
                    "baruk_gifts"
                )
                .update({
                    whatsapp_status:
                        "failed",
                })
                .eq(
                    "id",
                    giftId
                )
                .eq(
                    "whatsapp_status",
                    "sending"
                );
        }


        return {
            ok: false,

            error:
                error instanceof
                    Error

                    ? error.message

                    : "Error interno al notificar el regalo por WhatsApp",
        };
    }
}