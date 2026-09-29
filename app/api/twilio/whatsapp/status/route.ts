import {
    createHmac,
    timingSafeEqual,
} from "node:crypto";

import {
    NextRequest,
    NextResponse,
} from "next/server";

import {
    supabaseAdmin,
} from "@/lib/supabaseAdmin";


export const runtime =
    "nodejs";

export const dynamic =
    "force-dynamic";


const CALLBACK_BASE_URL =
    "https://www.baruk593.com/api/twilio/whatsapp/status";


const TRACKED_STATUSES =
    new Set([
        "accepted",
        "queued",
        "sending",
        "sent",
        "delivered",
        "read",
        "undelivered",
        "failed",
    ]);


/* ============================================================
   FIRMA TWILIO
============================================================ */

function buildSignedUrl(
    giftId: string
): string {

    return (
        CALLBACK_BASE_URL +
        `?giftId=${encodeURIComponent(giftId)}`
    );
}


function validateTwilioSignature(
    signature: string,
    url: string,
    params: URLSearchParams,
    authToken: string
): boolean {

    const entries =
        Array
            .from(
                params.entries()
            )
            .sort(
                (
                    [aKey, aValue],
                    [bKey, bValue]
                ) => {

                    const keyCompare =
                        aKey.localeCompare(
                            bKey
                        );

                    if (
                        keyCompare !==
                        0
                    ) {
                        return keyCompare;
                    }

                    return aValue
                        .localeCompare(
                            bValue
                        );
                }
            );


    let payload =
        url;


    for (
        const [
            key,
            value,
        ] of entries
    ) {

        payload +=
            `${key}${value}`;
    }


    const expected =
        createHmac(
            "sha1",
            authToken
        )
            .update(
                payload,
                "utf8"
            )
            .digest(
                "base64"
            );


    const expectedBuffer =
        Buffer.from(
            expected
        );

    const receivedBuffer =
        Buffer.from(
            signature
        );


    if (
        expectedBuffer.length !==
        receivedBuffer.length
    ) {
        return false;
    }


    return timingSafeEqual(
        expectedBuffer,
        receivedBuffer
    );
}


/* ============================================================
   HELPERS
============================================================ */

function clean(
    value:
        | FormDataEntryValue
        | null
        | undefined
): string {

    return String(
        value ?? ""
    )
        .trim();
}


function getFriendlyErrorMessage(
    errorCode: string,
    rawMessage: string
): string | null {

    if (
        rawMessage
    ) {
        return rawMessage
            .slice(
                0,
                1000
            );
    }


    if (
        errorCode ===
        "63049"
    ) {

        return (
            "Meta decidió no entregar este mensaje de WhatsApp " +
            "al destinatario (error 63049)."
        );
    }


    if (
        errorCode
    ) {

        return (
            `Twilio/WhatsApp reportó el error ${errorCode}.`
        );
    }


    return null;
}


function statusRank(
    status:
        | string
        | null
        | undefined
): number {

    switch (
    String(
        status ?? ""
    )
        .trim()
        .toLowerCase()
    ) {

        case "sending":
            return 0;

        case "accepted":
            return 1;

        case "queued":
            return 2;

        case "sent":
            return 3;

        case "delivered":
            return 4;

        case "read":
            return 5;

        case "failed":
        case "undelivered":
            return 6;

        default:
            return -1;
    }
}


/* ============================================================
   POST
   STATUS CALLBACK DE TWILIO
============================================================ */

export async function POST(
    req: NextRequest
) {

    try {

        const giftId =
            clean(
                req.nextUrl
                    .searchParams
                    .get(
                        "giftId"
                    )
            );


        if (
            !giftId
        ) {

            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "giftId faltante",
                },
                {
                    status: 400,
                }
            );
        }


        const authToken =
            process.env
                .TWILIO_AUTH_TOKEN
                ?.trim();


        if (
            !authToken
        ) {

            console.error(
                "[Twilio callback] Falta TWILIO_AUTH_TOKEN."
            );


            return NextResponse.json(
                {
                    ok: false,
                },
                {
                    status: 500,
                }
            );
        }


        const formData =
            await req.formData();


        const params =
            new URLSearchParams();


        for (
            const [
                key,
                value,
            ] of formData.entries()
        ) {

            params.append(
                key,
                clean(
                    value
                )
            );
        }


        const signature =
            req.headers
                .get(
                    "x-twilio-signature"
                )
                ?.trim() ??
            "";


        const validSignature =
            Boolean(
                signature
            ) &&
            validateTwilioSignature(
                signature,
                buildSignedUrl(
                    giftId
                ),
                params,
                authToken
            );


        if (
            !validSignature
        ) {

            console.warn(
                "[Twilio callback] Firma inválida.",
                {
                    giftId,
                }
            );


            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Firma inválida",
                },
                {
                    status: 403,
                }
            );
        }


        const messageSid =
            clean(
                formData.get(
                    "MessageSid"
                ) ??
                formData.get(
                    "SmsSid"
                )
            );


        const rawStatus =
            clean(
                formData.get(
                    "MessageStatus"
                ) ??
                formData.get(
                    "SmsStatus"
                )
            )
                .toLowerCase();


        const errorCode =
            clean(
                formData.get(
                    "ErrorCode"
                )
            );


        const rawErrorMessage =
            clean(
                formData.get(
                    "ErrorMessage"
                )
            );


        if (
            !messageSid ||
            !rawStatus
        ) {

            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Callback incompleto",
                },
                {
                    status: 400,
                }
            );
        }


        /*
         * Twilio puede enviar estados que no necesitamos.
         * Respondemos 200 para evitar reintentos innecesarios.
         */
        if (
            !TRACKED_STATUSES.has(
                rawStatus
            )
        ) {

            return NextResponse.json({
                ok: true,
                ignored: true,
                status:
                    rawStatus,
            });
        }


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
                    whatsapp_status,
                    whatsapp_message_sid
                `)
                .eq(
                    "id",
                    giftId
                )
                .maybeSingle();


        if (
            giftError
        ) {

            console.error(
                "[Twilio callback] No se pudo consultar el regalo:",
                giftError
            );


            return NextResponse.json(
                {
                    ok: false,
                },
                {
                    status: 500,
                }
            );
        }


        /*
         * Si el regalo ya no existe, no tiene sentido que
         * Twilio siga reintentando el callback.
         */
        if (
            !gift
        ) {

            console.warn(
                "[Twilio callback] Regalo no encontrado.",
                {
                    giftId,
                    messageSid,
                }
            );


            return NextResponse.json({
                ok: true,
                ignored: true,
            });
        }


        /*
         * Si ya guardamos un MessageSid distinto, este callback
         * pertenece a un intento anterior y no debe sobrescribir
         * el estado del envío más reciente.
         */
        if (
            gift.whatsapp_message_sid &&
            gift.whatsapp_message_sid !==
            messageSid
        ) {

            console.log(
                "[Twilio callback] Callback antiguo ignorado.",
                {
                    giftId,
                    messageSid,
                    currentMessageSid:
                        gift
                            .whatsapp_message_sid,
                }
            );


            return NextResponse.json({
                ok: true,
                ignored: true,
                reason:
                    "stale_message_sid",
            });
        }


        const currentStatus =
            clean(
                gift
                    .whatsapp_status
            )
                .toLowerCase();


        /*
         * Evita retroceder de read/delivered a sent/queued por
         * callbacks que lleguen fuera de orden.
         *
         * failed/undelivered sí pueden reemplazar estados previos.
         */
        if (
            rawStatus !==
            "failed" &&
            rawStatus !==
            "undelivered" &&
            statusRank(
                rawStatus
            ) <
            statusRank(
                currentStatus
            )
        ) {

            return NextResponse.json({
                ok: true,
                ignored: true,
                reason:
                    "older_status",
            });
        }


        const now =
            new Date()
                .toISOString();


        const updatePayload:
            Record<
                string,
                string | null
            > = {

            whatsapp_status:
                rawStatus,

            whatsapp_message_sid:
                messageSid,

            whatsapp_status_updated_at:
                now,

            whatsapp_error_code:
                errorCode ||
                null,

            whatsapp_error_message:
                getFriendlyErrorMessage(
                    errorCode,
                    rawErrorMessage
                ),
        };


        if (
            rawStatus ===
            "delivered"
        ) {

            updatePayload
                .whatsapp_delivered_at =
                now;
        }


        if (
            rawStatus ===
            "read"
        ) {

            updatePayload
                .whatsapp_delivered_at =
                now;

            updatePayload
                .whatsapp_read_at =
                now;
        }


        if (
            rawStatus ===
            "failed" ||
            rawStatus ===
            "undelivered"
        ) {

            updatePayload
                .whatsapp_failed_at =
                now;
        }


        const {
            error:
            updateError,
        } =
            await supabaseAdmin
                .from(
                    "baruk_gifts"
                )
                .update(
                    updatePayload
                )
                .eq(
                    "id",
                    giftId
                );


        if (
            updateError
        ) {

            console.error(
                "[Twilio callback] No se pudo actualizar baruk_gifts:",
                updateError
            );


            return NextResponse.json(
                {
                    ok: false,
                },
                {
                    status: 500,
                }
            );
        }


        console.log(
            "[Twilio callback] Estado actualizado.",
            {
                giftId,
                pedidoId:
                    gift.pedido_id,
                messageSid,
                status:
                    rawStatus,
                errorCode:
                    errorCode ||
                    null,
            }
        );


        return NextResponse.json({
            ok: true,
        });


    } catch (
    error:
        unknown
    ) {

        console.error(
            "POST /api/twilio/whatsapp/status:",
            error
        );


        return NextResponse.json(
            {
                ok: false,
            },
            {
                status: 500,
            }
        );
    }
}
