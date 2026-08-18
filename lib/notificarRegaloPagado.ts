import {
    createClient,
} from "@supabase/supabase-js";

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


function getPublicSiteUrl() {

    const value =
        String(
            process.env
                .NEXT_PUBLIC_SITE_URL ??
            process.env
                .NEXT_PUBLIC_APP_URL ??
            "https://www.baruk593.com"
        )
            .trim()
            .replace(
                /\/+$/,
                ""
            );


    return value;
}


function getAuthClient() {

    const supabaseUrl =
        process.env
            .NEXT_PUBLIC_SUPABASE_URL;


    const supabaseAnonKey =
        process.env
            .NEXT_PUBLIC_SUPABASE_ANON_KEY;


    if (
        !supabaseUrl ||
        !supabaseAnonKey
    ) {
        throw new Error(
            "Faltan variables públicas de Supabase para enviar el Magic Link."
        );
    }


    /*
     * Cliente separado exclusivamente
     * para operaciones de Auth.
     *
     * No reutilizamos supabaseAdmin.
     */
    return createClient(
        supabaseUrl,
        supabaseAnonKey,
        {
            auth: {
                persistSession:
                    false,

                autoRefreshToken:
                    false,

                detectSessionInUrl:
                    false,
            },
        }
    );
}


/* ============================================================
   NOTIFICAR REGALO PAGADO
============================================================ */

export async function notificarRegaloPagado(
    giftId: string
): Promise<NotificationResult> {

    try {

        if (!giftId) {

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
                    estado,
                    destinatario_nombre,
                    destinatario_correo,
                    email_status,
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


        /*
         * Idempotencia:
         *
         * si el correo ya fue enviado,
         * no volvemos a enviarlo.
         */

        if (
            gift.email_status ===
            "sent"
        ) {

            return {
                ok: true,
                alreadySent:
                    true,
            };
        }


        const recipientEmail =
            String(
                gift
                    .destinatario_correo ??
                ""
            )
                .trim()
                .toLowerCase();


        if (
            !recipientEmail
        ) {

            return {
                ok: false,
                error:
                    "El destinatario no tiene un correo válido",
            };
        }


        /* =====================================================
           2. ENVIAR MAGIC LINK
        ===================================================== */

        const authClient =
            getAuthClient();


        const redirectTo =
            `${getPublicSiteUrl()}/mi-cuenta`;


        const {
            error:
            authError,
        } =
            await authClient
                .auth
                .signInWithOtp({

                    email:
                        recipientEmail,

                    options: {

                        emailRedirectTo:
                            redirectTo,

                        shouldCreateUser:
                            true,
                    },
                });


        /*
         * signInWithOtp envía el correo
         * mediante Supabase Auth.
         */

        if (
            authError
        ) {

            console.error(
                "Error enviando Magic Link del regalo:",
                authError
            );


            await supabaseAdmin
                .from(
                    "baruk_gifts"
                )
                .update({
                    email_status:
                        "failed",
                })
                .eq(
                    "id",
                    giftId
                );


            return {
                ok: false,

                error:
                    authError.message ??
                    "No se pudo enviar el correo del regalo",
            };
        }


        /* =====================================================
           3. MARCAR COMO ENVIADO
        ===================================================== */

        const now =
            new Date()
                .toISOString();


        const nextState =
            gift.estado ===
                "paid"

                ? "sent"

                : gift.estado;


        const {
            error:
            updateError,
        } =
            await supabaseAdmin
                .from(
                    "baruk_gifts"
                )
                .update({

                    estado:
                        nextState,

                    email_status:
                        "sent",

                    enviado_at:
                        gift.enviado_at ??
                        now,
                })
                .eq(
                    "id",
                    giftId
                );


        if (
            updateError
        ) {

            console.error(
                "Magic Link enviado pero no se pudo actualizar baruk_gifts:",
                updateError
            );


            /*
             * No intentamos enviar otra vez
             * inmediatamente porque el correo
             * ya salió.
             */

            return {
                ok: false,

                error:
                    "El correo fue enviado, pero no se pudo registrar el envío.",
            };
        }


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


        return {
            ok: false,

            error:
                error instanceof
                    Error

                    ? error.message

                    : "Error interno al notificar el regalo",
        };
    }
}