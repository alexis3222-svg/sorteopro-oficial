import { Factuplan } from "factuplan";

function getRequiredEnv(name: string) {
    const value = process.env[name]?.trim();

    if (!value) {
        throw new Error(
            `Falta ${name} en las variables de entorno.`
        );
    }

    return value;
}

export function getFactuplanEnvironment():
    "test" | "live" {

    const apiKey =
        getRequiredEnv("FACTUPLAN_API_KEY");

    if (apiKey.startsWith("ak_test_")) {
        return "test";
    }

    if (apiKey.startsWith("ak_live_")) {
        return "live";
    }

    throw new Error(
        "FACTUPLAN_API_KEY debe comenzar con ak_test_ o ak_live_."
    );
}

export function getFactuplanClient() {
    const apiKey =
        getRequiredEnv("FACTUPLAN_API_KEY");

    const ruc =
        getRequiredEnv("FACTUPLAN_TAXPAYER_RUC");

    return new Factuplan(apiKey, { ruc });
}

export function isFactuplanTestMode() {
    return getFactuplanEnvironment() === "test";
}

export function isFactuplanLiveMode() {
    return getFactuplanEnvironment() === "live";
}