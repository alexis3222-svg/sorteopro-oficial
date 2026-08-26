// app/api/affiliate/register/route.ts

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


/* ============================================================
   HELPERS
============================================================ */

function bad(
    message: string,
    status = 400
) {

    return NextResponse.json(
        {
            ok: false,
            error: message,
        },
        {
            status,
        }
    );
}


/* ============================================================
   GENERAR CÓDIGO DE AFILIADO DESDE EL CORREO

   Ejemplo:
   alexis3222@hotmail.com
   -> alexis3222

   Si ya existe:
   -> alexis3222-2
   -> alexis3222-3
============================================================ */

function getAffiliateCodeBase(
    email: string
): string {

    const localPart =
        String(
            email
                .split("@")[0] ??
            ""
        )
            .trim()
            .toLowerCase();


    /*
     * Dejamos únicamente letras y números
     * para que el código sea fácil de compartir
     * en enlaces y QR.
     *
     * Ejemplos:
     * juan.perez@gmail.com -> juanperez
     * maria_lopez@gmail.com -> marialopez
     */
    const sanitized =
        localPart
            .normalize("NFKD")
            .replace(
                /[\u0300-\u036f]/g,
                ""
            )
            .replace(
                /[^a-z0-9]/g,
                ""
            )
            .slice(
                0,
                32
            );


    return sanitized ||
        "baruk";
}


async function getAvailableAffiliateCode(
    email: string
): Promise<string> {

    const base =
        getAffiliateCodeBase(
            email
        );


    /*
     * El primer intento utiliza directamente
     * el nombre del correo.
     *
     * Si ya existe, agregamos -2, -3, etc.
     */
    for (
        let number = 1;
        number <= 9999;
        number += 1
    ) {

        const suffix =
            number === 1
                ? ""
                : `-${number}`;


        const candidate =
            `${base}${suffix}`;


        const {
            data:
            existing,

            error:
            existingError,
        } =
            await supabaseAdmin
                .from(
                    "affiliates"
                )
                .select(
                    "id"
                )
                .eq(
                    "code",
                    candidate
                )
                .maybeSingle();


        if (
            existingError
        ) {

            throw existingError;
        }


        if (
            !existing
        ) {

            return candidate;
        }
    }


    throw new Error(
        "No se pudo generar un código de afiliado disponible"
    );
}


/* ============================================================
   REGISTRO DE AFILIADOS HABILITADO / DESHABILITADO
============================================================ */

async function getAffiliateRegistrationOpen():
    Promise<boolean> {

    const {
        data,
        error,
    } =
        await supabaseAdmin
            .from(
                "app_settings"
            )
            .select(
                "value"
            )
            .eq(
                "key",
                "affiliate_registration"
            )
            .maybeSingle();


    if (
        error
    ) {

        console.error(
            "Error leyendo affiliate_registration:",
            error
        );

        /*
         * Conservamos el comportamiento actual:
         * si falla esta lectura, no tumbamos
         * el sistema completo.
         */
        return true;
    }


    const open =
        (
            data?.value as
            {
                open?: boolean;
            }
            | null
        )?.open;


    return typeof open ===
        "boolean"

        ? open

        : true;
}


/* ============================================================
   POST
   ACTIVAR PERFIL DE AFILIADO DESDE MI CUENTA
============================================================ */

export async function POST(
    req: NextRequest
) {

    try {

        /* =====================================================
           1. VALIDAR SESIÓN DE MI CUENTA
        ===================================================== */

        const authorization =
            req.headers.get(
                "authorization"
            );


        if (
            !authorization ||
            !authorization.startsWith(
                "Bearer "
            )
        ) {

            return bad(
                "Debes iniciar sesión en Mi Cuenta",
                401
            );
        }


        const accessToken =
            authorization
                .replace(
                    "Bearer ",
                    ""
                )
                .trim();


        if (
            !accessToken
        ) {

            return bad(
                "La sesión no es válida",
                401
            );
        }


        const {
            data:
            userData,

            error:
            userError,
        } =
            await supabaseAdmin
                .auth
                .getUser(
                    accessToken
                );


        if (
            userError ||
            !userData.user
        ) {

            return bad(
                "Tu sesión ha expirado",
                401
            );
        }


        const user =
            userData.user;


        const email =
            String(
                user.email ??
                ""
            )
                .trim()
                .toLowerCase();


        if (
            !email
        ) {

            return bad(
                "Tu cuenta no tiene un correo válido",
                400
            );
        }


        /* =====================================================
           2. REGISTRO DE AFILIADOS ABIERTO
        ===================================================== */

        const registrationOpen =
            await getAffiliateRegistrationOpen();


        if (
            !registrationOpen
        ) {

            return NextResponse.json(
                {
                    ok:
                        false,

                    error:
                        "El registro de afiliados está cerrado temporalmente",
                },
                {
                    status:
                        403,
                }
            );
        }


        /* =====================================================
           3. LEER DATOS DEL PERFIL
        ===================================================== */

        const body =
            await req
                .json()
                .catch(
                    () => ({})
                );


        const whatsapp =
            String(
                body?.whatsapp ??
                body?.telefono ??
                ""
            )
                .trim();


        if (
            !whatsapp
        ) {

            return bad(
                "Ingresa tu número de WhatsApp"
            );
        }


        if (
            !/^09\d{8}$/.test(
                whatsapp
            )
        ) {

            return bad(
                "Ingresa un WhatsApp válido (09xxxxxxxx)"
            );
        }


        /*
         * Podemos recibir nombre desde Mi Cuenta.
         *
         * Si no viene, intentamos utilizar
         * los metadatos de Supabase.
         */

        const requestedName =
            String(
                body?.displayName ??
                body?.display_name ??
                body?.nombre ??
                ""
            )
                .trim();


        const metadataName =
            String(
                user.user_metadata
                    ?.full_name ??
                user.user_metadata
                    ?.name ??
                ""
            )
                .trim();


        const emailName =
            email
                .split(
                    "@"
                )[0]
                .trim();


        const displayName =
            requestedName ||
            metadataName ||
            emailName ||
            "Usuario Baruk593";


        /* =====================================================
           4. ¿YA ES AFILIADO?
        ===================================================== */

        const {
            data:
            affiliateByUser,

            error:
            affiliateByUserError,
        } =
            await supabaseAdmin
                .from(
                    "affiliates"
                )
                .select(`
                    id,
                    user_id,
                    display_name,
                    code,
                    whatsapp,
                    email,
                    status,
                    commission_rate,
                    created_at
                `)
                .eq(
                    "user_id",
                    user.id
                )
                .maybeSingle();


        if (
            affiliateByUserError
        ) {

            console.error(
                "Error buscando afiliado por user_id:",
                affiliateByUserError
            );


            return NextResponse.json(
                {
                    ok:
                        false,

                    error:
                        affiliateByUserError.message,
                },
                {
                    status:
                        500,
                }
            );
        }


        /*
         * Idempotencia:
         *
         * Si ya estaba activado, no creamos
         * otro afiliado.
         */

        if (
            affiliateByUser
        ) {

            /*
             * Aprovechamos para actualizar
             * nombre y WhatsApp.
             */

            const {
                data:
                updatedAffiliate,

                error:
                updateError,
            } =
                await supabaseAdmin
                    .from(
                        "affiliates"
                    )
                    .update({
                        display_name:
                            displayName,

                        whatsapp,

                        email,

                        status:
                            "active",

                        is_active:
                            true,
                    })
                    .eq(
                        "id",
                        affiliateByUser.id
                    )
                    .select(`
                        id,
                        user_id,
                        display_name,
                        code,
                        whatsapp,
                        email,
                        status,
                        commission_rate,
                        created_at
                    `)
                    .single();


            if (
                updateError ||
                !updatedAffiliate
            ) {

                return NextResponse.json(
                    {
                        ok:
                            false,

                        error:
                            updateError
                                ?.message ??
                            "No se pudo actualizar tu perfil de afiliado",
                    },
                    {
                        status:
                            500,
                    }
                );
            }


            await ensureWallet(
                user.id
            );


            return NextResponse.json({
                ok:
                    true,

                alreadyActive:
                    true,

                affiliate:
                    updatedAffiliate,

                referralUrl:
                    `${req.nextUrl.origin}/?ref=${encodeURIComponent(
                        updatedAffiliate.code
                    )}`,
            });
        }


        /* =====================================================
           5. BUSCAR ANTIGUO PERFIL POR EMAIL
        =====================================================
         *
         * Esto permite reutilizar un afiliado creado
         * anteriormente sin perder su código/QR.
         */

        const {
            data:
            affiliateByEmail,

            error:
            affiliateByEmailError,
        } =
            await supabaseAdmin
                .from(
                    "affiliates"
                )
                .select(`
                    id,
                    user_id,
                    display_name,
                    code,
                    whatsapp,
                    email,
                    status,
                    commission_rate,
                    created_at
                `)
                .eq(
                    "email",
                    email
                )
                .limit(
                    1
                )
                .maybeSingle();


        if (
            affiliateByEmailError
        ) {

            console.error(
                "Error buscando afiliado por email:",
                affiliateByEmailError
            );


            return NextResponse.json(
                {
                    ok:
                        false,

                    error:
                        affiliateByEmailError.message,
                },
                {
                    status:
                        500,
                }
            );
        }


        /*
         * Si el correo ya pertenece a OTRO auth.user,
         * no podemos apropiarnos de ese perfil.
         */

        if (
            affiliateByEmail?.user_id &&
            affiliateByEmail.user_id !==
            user.id
        ) {

            return bad(
                "Ese correo ya está vinculado a otra cuenta de afiliado",
                409
            );
        }


        /* =====================================================
           6. VINCULAR PERFIL ANTIGUO
        ===================================================== */

        if (
            affiliateByEmail
        ) {

            const {
                data:
                linkedAffiliate,

                error:
                linkError,
            } =
                await supabaseAdmin
                    .from(
                        "affiliates"
                    )
                    .update({

                        user_id:
                            user.id,

                        /*
                         * Ya no usamos autenticación
                         * independiente de afiliados.
                         */

                        username:
                            null,

                        password_hash:
                            null,

                        must_change_password:
                            false,

                        display_name:
                            displayName,

                        whatsapp,

                        email,

                        status:
                            "active",

                        is_active:
                            true,

                        commission_rate:
                            0.10,
                    })
                    .eq(
                        "id",
                        affiliateByEmail.id
                    )
                    .select(`
                        id,
                        user_id,
                        display_name,
                        code,
                        whatsapp,
                        email,
                        status,
                        commission_rate,
                        created_at
                    `)
                    .single();


            if (
                linkError ||
                !linkedAffiliate
            ) {

                return NextResponse.json(
                    {
                        ok:
                            false,

                        error:
                            linkError
                                ?.message ??
                            "No se pudo vincular tu perfil de afiliado",
                    },
                    {
                        status:
                            500,
                    }
                );
            }


            await ensureWallet(
                user.id
            );


            return NextResponse.json({

                ok:
                    true,

                alreadyActive:
                    false,

                linkedExisting:
                    true,

                affiliate:
                    linkedAffiliate,

                referralUrl:
                    `${req.nextUrl.origin}/?ref=${encodeURIComponent(
                        linkedAffiliate.code
                    )}`,
            });
        }


        /* =====================================================
           7. CREAR NUEVO PERFIL
        =====================================================
         *
         * El código se genera a partir de la parte
         * anterior al @ del correo de Mi Cuenta.
         *
         * Ejemplo:
         * alexis3222@hotmail.com
         * -> alexis3222
         *
         * Si ya existe:
         * -> alexis3222-2
         * -> alexis3222-3
         */

        const affiliateCode =
            await getAvailableAffiliateCode(
                email
            );


        const {
            data:
            affiliate,

            error:
            insertError,
        } =
            await supabaseAdmin
                .from(
                    "affiliates"
                )
                .insert({

                    user_id:
                        user.id,

                    code:
                        affiliateCode,

                    kind:
                        "socio",

                    username:
                        null,

                    password_hash:
                        null,

                    display_name:
                        displayName,

                    whatsapp,

                    email,

                    status:
                        "active",

                    is_active:
                        true,

                    must_change_password:
                        false,

                    commission_rate:
                        0.10,
                })
                .select(`
                    id,
                    user_id,
                    display_name,
                    code,
                    whatsapp,
                    email,
                    status,
                    commission_rate,
                    created_at
                `)
                .single();


        if (
            insertError ||
            !affiliate
        ) {

            console.error(
                "Error creando afiliado:",
                insertError
            );


            /*
             * La restricción UNIQUE de la base de datos
             * sigue siendo la última protección ante una
             * activación simultánea con el mismo código.
             */
            const duplicateCode =
                insertError?.code ===
                "23505";


            return NextResponse.json(
                {
                    ok:
                        false,

                    error:
                        duplicateCode
                            ? "El código de afiliado acaba de ser utilizado. Intenta activar tu perfil nuevamente."
                            : (
                                insertError
                                    ?.message ??
                                "No se pudo activar tu perfil de afiliado"
                            ),
                },
                {
                    status:
                        duplicateCode
                            ? 409
                            : 500,
                }
            );
        }


        /* =====================================================
           8. CREAR BILLETERA SI NO EXISTE
        ===================================================== */

        await ensureWallet(
            user.id
        );


        /* =====================================================
           9. RESPUESTA
        ===================================================== */

        return NextResponse.json({

            ok:
                true,

            alreadyActive:
                false,

            linkedExisting:
                false,

            affiliate,

            referralUrl:
                `${req.nextUrl.origin}/?ref=${encodeURIComponent(
                    affiliate.code
                )}`,
        });


    } catch (
    error:
        unknown
    ) {

        console.error(
            "affiliate/register error:",
            error
        );


        return NextResponse.json(
            {
                ok:
                    false,

                error:
                    error instanceof
                        Error

                        ? error.message

                        : "Error interno",
            },
            {
                status:
                    500,
            }
        );
    }
}


/* ============================================================
   ASEGURAR BILLETERA ÚNICA
============================================================ */

async function ensureWallet(
    userId: string
) {

    const {
        data:
        wallet,

        error:
        walletReadError,
    } =
        await supabaseAdmin
            .from(
                "marketplace_wallets"
            )
            .select(
                "user_id"
            )
            .eq(
                "user_id",
                userId
            )
            .maybeSingle();


    if (
        walletReadError
    ) {

        throw walletReadError;
    }


    if (
        wallet
    ) {

        return;
    }


    const {
        error:
        walletInsertError,
    } =
        await supabaseAdmin
            .from(
                "marketplace_wallets"
            )
            .insert({

                user_id:
                    userId,

                available_balance:
                    0,

                pending_balance:
                    0,

                updated_at:
                    new Date()
                        .toISOString(),
            });


    /*
     * 23505:
     * otro request pudo crear la billetera
     * simultáneamente.
     */

    if (
        walletInsertError &&
        walletInsertError.code !==
        "23505"
    ) {

        throw walletInsertError;
    }
}