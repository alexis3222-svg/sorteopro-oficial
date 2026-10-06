// app/api/facturacion/factuplan/test/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
    AuthenticationError,
    FactuplanError,
    RateLimitError,
} from "factuplan";

import {
    getFactuplanClient,
    isFactuplanTestMode,
} from "@/lib/factuplan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(req: NextRequest) {
    const expected = process.env.FACTUPLAN_TEST_TOKEN?.trim();
    const received = req.headers.get("x-baruk-test-token")?.trim();

    return Boolean(expected && received && expected === received);
}

function unauthorized() {
    return NextResponse.json(
        { ok: false, error: "No autorizado." },
        { status: 401 }
    );
}

function factuplanErrorResponse(error: unknown) {
    console.error("Factuplan test error:", error);

    if (error instanceof AuthenticationError) {
        return NextResponse.json(
            {
                ok: false,
                provider: "factuplan",
                error: "API key inválida o expirada.",
                code: "AUTH_ERROR",
                details: null,
            },
            { status: 401 }
        );
    }

    if (error instanceof RateLimitError) {
        return NextResponse.json(
            {
                ok: false,
                provider: "factuplan",
                error: error.message,
                code: error.code ?? "RATE_LIMIT",
                details: error.details ?? null,
            },
            { status: error.statusCode ?? 429 }
        );
    }

    if (error instanceof FactuplanError) {
        return NextResponse.json(
            {
                ok: false,
                provider: "factuplan",
                error: error.message,
                code: error.code ?? null,
                details: error.details ?? null,
                statusCode: error.statusCode ?? null,
            },
            {
                status:
                    error.statusCode &&
                        error.statusCode >= 400 &&
                        error.statusCode <= 599
                        ? error.statusCode
                        : 500,
            }
        );
    }

    return NextResponse.json(
        {
            ok: false,
            provider: "factuplan",
            error:
                error instanceof Error
                    ? error.message
                    : "Error interno.",
            code: null,
            details: null,
        },
        { status: 500 }
    );
}

export async function GET(req: NextRequest) {
    if (!isAuthorized(req)) {
        return unauthorized();
    }

    try {
        const factuplan = getFactuplanClient();

        const receiptId =
            req.nextUrl.searchParams.get("receiptId")?.trim() ?? "";

        const file =
            req.nextUrl.searchParams.get("file")?.trim().toLowerCase() ?? "";

        if (!receiptId) {
            const usage =
                await factuplan.usage();

            return NextResponse.json({
                ok: true,
                environment:
                    isFactuplanTestMode()
                        ? "test"
                        : "live",
                usage,
            });
        }

        if (file === "pdf") {
            const pdf =
                await factuplan.invoices.downloadPdf(
                    receiptId
                );

            return NextResponse.json({
                ok: true,
                environment:
                    isFactuplanTestMode()
                        ? "test"
                        : "live",
                receiptId,
                file: "pdf",
                pdf,
            });
        }

        if (file === "xml") {
            const xml =
                await factuplan.invoices.downloadXml(
                    receiptId
                );

            return NextResponse.json({
                ok: true,
                environment:
                    isFactuplanTestMode()
                        ? "test"
                        : "live",
                receiptId,
                file: "xml",
                xml,
            });
        }

        const status =
            await factuplan.invoices.getStatus(
                receiptId
            );

        return NextResponse.json({
            ok: true,
            environment:
                isFactuplanTestMode()
                    ? "test"
                    : "live",
            receiptId,
            status,
        });

    } catch (error: unknown) {
        return factuplanErrorResponse(
            error
        );
    }
}


export async function POST(req: NextRequest) {
    if (!isAuthorized(req)) {
        return unauthorized();
    }

    try {
        if (!isFactuplanTestMode()) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Esta ruta solo permite FACTUPLAN_API_KEY ak_test_*.",
                },
                { status: 400 }
            );
        }

        const body = await req.json().catch(() => null);

        const email =
            String(
                body?.email ??
                ""
            )
                .trim()
                .toLowerCase();

        if (
            !email ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                email
            )
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Debes enviar un email válido para la factura de prueba.",
                },
                {
                    status: 400,
                }
            );
        }

        const quantity = Math.max(
            1,
            Number(body?.quantity ?? 1)
        );

        const unitPrice = Math.max(
            0.01,
            Number(body?.unitPrice ?? 1)
        );

        const total = Number(
            (quantity * unitPrice).toFixed(2)
        );

        const factuplan = getFactuplanClient();

        const invoice = await factuplan.invoices.create({
            customer: {
                identificationType: "FINAL_CONSUMER",
                identification: "9999999999999",
                legalName: "CONSUMIDOR FINAL",
                email,
            },

            items: [
                {
                    code: "BARUK-TEST-001",
                    description:
                        "PRUEBA - Tarjetas de la Suerte - Baruk593",
                    quantity,
                    unitPrice,
                    discount: 0,
                    taxType: "NOT_TAXABLE",
                },
            ],

            payments: [
                {
                    method: "20",
                    amount: total,
                },
            ],

            additionalInfo: {
                Referencia: String(
                    body?.testId ?? "BARUK-PRUEBA"
                ),
                Ambiente: "Prueba Baruk593",
            },

        });

        return NextResponse.json(
            {
                ok: true,
                environment: "test",
                total,
                invoice: {
                    id: invoice.id,
                    accessKey: invoice.accessKey,
                    sequential: invoice.sequential,
                    status: invoice.status,
                },
            },
            { status: 201 }
        );
    } catch (error: unknown) {
        return factuplanErrorResponse(error);
    }
}
