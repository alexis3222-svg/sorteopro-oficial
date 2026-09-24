// app/api/facturacion/factuplan/pedido/route.ts
//
// Ruta TEMPORAL para probar la facturación usando un pedido REAL
// de Baruk593, pero emitiendo únicamente en sandbox ak_test_*.
//
// Todavía NO se conecta automáticamente a PayPhone ni a
// procesarPedidoPagado.

import {
    NextRequest,
    NextResponse,
} from "next/server";

import {
    emitirFacturaPedidoPrueba,
} from "@/lib/emitirFacturaPedido";


export const runtime =
    "nodejs";

export const dynamic =
    "force-dynamic";


function isAuthorized(
    req:
        NextRequest
) {
    const expected =
        process.env
            .FACTUPLAN_TEST_TOKEN
            ?.trim();

    const received =
        req.headers
            .get(
                "x-baruk-test-token"
            )
            ?.trim();

    return Boolean(
        expected &&
        received &&
        expected ===
        received
    );
}


export async function POST(
    req:
        NextRequest
) {

    if (
        !isAuthorized(
            req
        )
    ) {
        return NextResponse.json(
            {
                ok:
                    false,

                error:
                    "No autorizado.",
            },
            {
                status:
                    401,
            }
        );
    }


    const body =
        await req
            .json()
            .catch(
                () =>
                    null
            );


    const pedidoId =
        Number(
            body
                ?.pedidoId
        );


    if (
        !Number.isInteger(
            pedidoId
        ) ||
        pedidoId <=
        0
    ) {
        return NextResponse.json(
            {
                ok:
                    false,

                error:
                    "pedidoId inválido.",
            },
            {
                status:
                    400,
            }
        );
    }


    const result =
        await emitirFacturaPedidoPrueba(
            pedidoId
        );


    return NextResponse.json(
        result,
        {
            status:
                result.ok
                    ? 200
                    : 400,
        }
    );
}
