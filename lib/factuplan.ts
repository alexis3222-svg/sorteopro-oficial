import { Factuplan } from "factuplan";

export type FactuplanEnvironment =
    | "test"
    | "live";


function getRequiredEnv(
    name: string
) {
    const value =
        process.env[name]?.trim();

    if (!value) {
        throw new Error(
            `Falta ${name} en las variables de entorno.`
        );
    }

    return value;
}


/**
 * Devuelve el ambiente configurado explícitamente
 * para FactuPlan.
 *
 * test = sandbox
 * live = facturación real
 */
export function getFactuplanEnvironment():
    FactuplanEnvironment {

    const environment =
        getRequiredEnv(
            "FACTUPLAN_ENVIRONMENT"
        )
            .trim()
            .toLowerCase();


    if (
        environment !== "test" &&
        environment !== "live"
    ) {
        throw new Error(
            "FACTUPLAN_ENVIRONMENT debe ser 'test' o 'live'."
        );
    }


    /**
     * Seguridad adicional:
     *
     * Nunca permitimos LIVE dentro de un
     * deployment Preview de Vercel.
     */
    const vercelEnvironment =
        process.env.VERCEL_ENV
            ?.trim()
            .toLowerCase();


    if (
        environment === "live" &&
        vercelEnvironment &&
        vercelEnvironment !== "production"
    ) {
        throw new Error(
            "FactuPlan LIVE solo puede utilizarse en Vercel Production."
        );
    }


    return environment;
}


/**
 * Comprueba que la API key corresponda
 * realmente al ambiente elegido.
 *
 * Así evitamos:
 *
 * FACTUPLAN_ENVIRONMENT=test
 * + ak_live_*
 *
 * o
 *
 * FACTUPLAN_ENVIRONMENT=live
 * + ak_test_*
 */
function validateApiKey(
    apiKey: string,
    environment: FactuplanEnvironment
) {

    if (
        environment === "test" &&
        !apiKey.startsWith("ak_test_")
    ) {
        throw new Error(
            "FACTUPLAN_ENVIRONMENT está en TEST pero FACTUPLAN_API_KEY no es ak_test_*."
        );
    }


    if (
        environment === "live" &&
        !apiKey.startsWith("ak_live_")
    ) {
        throw new Error(
            "FACTUPLAN_ENVIRONMENT está en LIVE pero FACTUPLAN_API_KEY no es ak_live_*."
        );
    }
}


export function getFactuplanClient() {

    const environment =
        getFactuplanEnvironment();

    const apiKey =
        getRequiredEnv(
            "FACTUPLAN_API_KEY"
        );

    const ruc =
        getRequiredEnv(
            "FACTUPLAN_TAXPAYER_RUC"
        );


    validateApiKey(
        apiKey,
        environment
    );


    return new Factuplan(
        apiKey,
        {
            ruc,
        }
    );
}


export function isFactuplanTestMode() {
    return (
        getFactuplanEnvironment() ===
        "test"
    );
}


export function isFactuplanLiveMode() {
    return (
        getFactuplanEnvironment() ===
        "live"
    );
}

export type FactuplanInvoiceCreated = {
    id: string;
    accessKey?: string | null;
    sequential?: string | null;
    status?: string | null;
};


export async function createFactuplanInvoiceIdempotent(
    payload: unknown,
    idempotencyKey: string
): Promise<FactuplanInvoiceCreated> {

    const environment =
        getFactuplanEnvironment();

    const apiKey =
        getRequiredEnv(
            "FACTUPLAN_API_KEY"
        );

    const ruc =
        getRequiredEnv(
            "FACTUPLAN_TAXPAYER_RUC"
        );


    validateApiKey(
        apiKey,
        environment
    );


    const response =
        await fetch(
            "https://api-rest.factuplan.com.ec/v1/developer/invoices",
            {
                method: "POST",

                headers: {
                    "X-API-Key":
                        apiKey,

                    "x-taxpayer-ruc":
                        ruc,

                    "X-Idempotency-Key":
                        idempotencyKey,

                    "Content-Type":
                        "application/json",

                    Accept:
                        "application/json",
                },

                body:
                    JSON.stringify(
                        payload
                    ),

                cache:
                    "no-store",
            }
        );


    const json =
        await response
            .json()
            .catch(
                () =>
                    null
            );


    if (
        !response.ok
    ) {
        const message =
            typeof json?.message ===
                "string"
                ? json.message
                : `FactuPlan respondió HTTP ${response.status}.`;

        const error =
            new Error(
                message
            ) as Error & {
                statusCode?: number;
                code?: string | null;
                details?: unknown;
            };

        error.statusCode =
            response.status;

        error.code =
            json?.code ??
            null;

        error.details =
            json?.details ??
            null;

        throw error;
    }


    const invoice =
        json?.data;


    if (
        !invoice?.id
    ) {
        throw new Error(
            "FactuPlan respondió correctamente, pero no devolvió el ID del comprobante."
        );
    }


    return {
        id:
            String(
                invoice.id
            ),

        accessKey:
            invoice.accessKey
                ? String(
                    invoice.accessKey
                )
                : null,

        sequential:
            invoice.sequential
                ? String(
                    invoice.sequential
                )
                : null,

        status:
            invoice.status
                ? String(
                    invoice.status
                )
                : null,
    };
}