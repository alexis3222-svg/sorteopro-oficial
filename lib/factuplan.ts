// lib/factuplan.ts
import { Factuplan } from "factuplan";

function getRequiredEnv(name: string) {
    const value = process.env[name]?.trim();

    if (!value) {
        throw new Error(`Falta ${name} en las variables de entorno.`);
    }

    return value;
}

export function getFactuplanClient() {
    const apiKey = getRequiredEnv("FACTUPLAN_API_KEY");
    const ruc = getRequiredEnv("FACTUPLAN_TAXPAYER_RUC");

    return new Factuplan(apiKey, { ruc });
}

export function isFactuplanTestMode() {
    return getRequiredEnv("FACTUPLAN_API_KEY").startsWith("ak_test_");
}