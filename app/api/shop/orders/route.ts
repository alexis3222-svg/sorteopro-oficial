// app/api/shop/orders/route.ts

import {
    NextRequest,
    NextResponse,
} from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ItemEntrada = {
    productId: string;
    cantidad: number;
};

type Body = {
    clienteNombre?: string;
    clienteEmail?: string;
    clienteTelefono?: string;
    identificacion?: string;

    provincia?: string;
    ciudad?: string;
    direccion?: string;
    referencia?: string;

    notasCliente?: string;

    items?: ItemEntrada[];
};

function limpiarTexto(
    value: unknown
): string {
    return String(value ?? "").trim();
}

function emailValido(
    email: string
): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email
    );
}

export async function POST(
    req: NextRequest
) {
    let orderId: string | null =
        null;

    try {
        const body =
            (await req
                .json()
                .catch(() => null)) as
            | Body
            | null;

        if (!body) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Solicitud inválida.",
                },
                {
                    status: 400,
                }
            );
        }

        /* =====================================================
           CLIENTE
        ===================================================== */

        const clienteNombre =
            limpiarTexto(
                body.clienteNombre
            );

        const clienteEmail =
            limpiarTexto(
                body.clienteEmail
            ).toLowerCase();

        const clienteTelefono =
            limpiarTexto(
                body.clienteTelefono
            );

        const identificacion =
            limpiarTexto(
                body.identificacion
            );

        const provincia =
            limpiarTexto(
                body.provincia
            );

        const ciudad =
            limpiarTexto(
                body.ciudad
            );

        const direccion =
            limpiarTexto(
                body.direccion
            );

        const referencia =
            limpiarTexto(
                body.referencia
            );

        const notasCliente =
            limpiarTexto(
                body.notasCliente
            );

        if (!clienteNombre) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Ingresa el nombre del comprador.",
                },
                {
                    status: 400,
                }
            );
        }

        if (
            !clienteEmail ||
            !emailValido(
                clienteEmail
            )
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Ingresa un correo electrónico válido.",
                },
                {
                    status: 400,
                }
            );
        }

        if (!clienteTelefono) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Ingresa un número de teléfono.",
                },
                {
                    status: 400,
                }
            );
        }

        if (
            !provincia ||
            !ciudad ||
            !direccion
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Completa los datos de entrega.",
                },
                {
                    status: 400,
                }
            );
        }

        /* =====================================================
           CARRITO
        ===================================================== */

        if (
            !Array.isArray(
                body.items
            ) ||
            body.items.length === 0
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "El carrito está vacío.",
                },
                {
                    status: 400,
                }
            );
        }

        /*
         * Agrupamos productos repetidos.
         * No confiamos en precio ni stock
         * enviados por el navegador.
         */

        const cantidades =
            new Map<
                string,
                number
            >();

        for (
            const item of
            body.items
        ) {
            const productId =
                limpiarTexto(
                    item.productId
                );

            const cantidad =
                Number(
                    item.cantidad
                );

            if (
                !productId ||
                !Number.isInteger(
                    cantidad
                ) ||
                cantidad <= 0
            ) {
                return NextResponse.json(
                    {
                        ok: false,
                        error:
                            "El carrito contiene datos inválidos.",
                    },
                    {
                        status: 400,
                    }
                );
            }

            cantidades.set(
                productId,
                (cantidades.get(
                    productId
                ) ?? 0) +
                cantidad
            );
        }

        const productIds =
            Array.from(
                cantidades.keys()
            );

        /* =====================================================
           PRODUCTOS REALES DESDE SUPABASE
        ===================================================== */

        const {
            data: productos,
            error:
            productosError,
        } =
            await supabaseAdmin
                .from(
                    "store_products"
                )
                .select(`
                    id,
                    nombre,
                    slug,
                    sku,
                    precio,
                    stock,
                    imagen_principal,
                    activo
                `)
                .in(
                    "id",
                    productIds
                );

        if (productosError) {
            throw productosError;
        }

        if (
            !productos ||
            productos.length !==
            productIds.length
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Uno o más productos ya no están disponibles.",
                },
                {
                    status: 409,
                }
            );
        }

        /* =====================================================
           VALIDAR Y CALCULAR
        ===================================================== */

        let subtotal = 0;

        const itemsPedido =
            [];

        for (
            const producto of
            productos
        ) {
            const cantidad =
                cantidades.get(
                    producto.id
                ) ?? 0;

            const stock =
                Number(
                    producto.stock
                );

            const precio =
                Number(
                    producto.precio
                );

            if (!producto.activo) {
                return NextResponse.json(
                    {
                        ok: false,
                        error: `${producto.nombre} ya no está disponible.`,
                    },
                    {
                        status: 409,
                    }
                );
            }

            if (
                cantidad >
                stock
            ) {
                return NextResponse.json(
                    {
                        ok: false,
                        error: `Solo quedan ${stock} unidad(es) de ${producto.nombre}.`,
                    },
                    {
                        status: 409,
                    }
                );
            }

            if (
                !Number.isFinite(
                    precio
                ) ||
                precio < 0
            ) {
                throw new Error(
                    `Precio inválido para producto ${producto.id}`
                );
            }

            const totalLinea =
                Number(
                    (
                        precio *
                        cantidad
                    ).toFixed(2)
                );

            subtotal +=
                totalLinea;

            itemsPedido.push({
                product_id:
                    producto.id,

                producto_nombre:
                    producto.nombre,

                producto_slug:
                    producto.slug,

                producto_sku:
                    producto.sku,

                producto_imagen:
                    producto.imagen_principal,

                precio_unitario:
                    precio,

                cantidad,

                total_linea:
                    totalLinea,
            });
        }

        subtotal =
            Number(
                subtotal.toFixed(
                    2
                )
            );

        /*
         * Todavía no definimos
         * tarifa de envío.
         */
        const costoEnvio = 0;
        const descuento = 0;

        const total =
            Number(
                (
                    subtotal +
                    costoEnvio -
                    descuento
                ).toFixed(2)
            );

        /* =====================================================
           CREAR PEDIDO
        ===================================================== */

        const {
            data: pedido,
            error: pedidoError,
        } =
            await supabaseAdmin
                .from(
                    "store_orders"
                )
                .insert({
                    /*
                     * El trigger genera
                     * order_number.
                     */
                    order_number:
                        "",

                    cliente_nombre:
                        clienteNombre,

                    cliente_email:
                        clienteEmail,

                    cliente_telefono:
                        clienteTelefono,

                    identificacion:
                        identificacion ||
                        null,

                    tipo_entrega:
                        "envio",

                    provincia,

                    ciudad,

                    direccion,

                    referencia:
                        referencia ||
                        null,

                    subtotal,

                    costo_envio:
                        costoEnvio,

                    descuento,

                    total,

                    metodo_pago:
                        null,

                    estado_pago:
                        "pendiente",

                    estado:
                        "pendiente",

                    notas_cliente:
                        notasCliente ||
                        null,
                })
                .select(`
                    id,
                    order_number,
                    subtotal,
                    costo_envio,
                    total,
                    estado,
                    estado_pago
                `)
                .single();

        if (
            pedidoError ||
            !pedido
        ) {
            throw (
                pedidoError ??
                new Error(
                    "Pedido no creado."
                )
            );
        }

        orderId =
            pedido.id;

        /* =====================================================
           CREAR DETALLE
        ===================================================== */

        const detalle =
            itemsPedido.map(
                (item) => ({
                    ...item,

                    order_id:
                        pedido.id,
                })
            );

        const {
            error:
            detalleError,
        } =
            await supabaseAdmin
                .from(
                    "store_order_items"
                )
                .insert(
                    detalle
                );

        if (detalleError) {
            /*
             * Rollback manual:
             * store_order_items tiene
             * ON DELETE CASCADE.
             */

            await supabaseAdmin
                .from(
                    "store_orders"
                )
                .delete()
                .eq(
                    "id",
                    pedido.id
                );

            orderId = null;

            throw detalleError;
        }

        /* =====================================================
           RESPUESTA
        ===================================================== */

        return NextResponse.json(
            {
                ok: true,

                pedido: {
                    id:
                        pedido.id,

                    numero:
                        pedido.order_number,

                    subtotal:
                        pedido.subtotal,

                    costoEnvio:
                        pedido.costo_envio,

                    total:
                        pedido.total,

                    estado:
                        pedido.estado,

                    estadoPago:
                        pedido.estado_pago,
                },
            },
            {
                status: 201,
            }
        );

    } catch (error) {
        console.error(
            "Error creando pedido Baruk Shop:",
            error
        );

        /*
         * Seguridad adicional
         * ante excepciones inesperadas.
         */
        if (orderId) {
            try {
                await supabaseAdmin
                    .from(
                        "store_orders"
                    )
                    .delete()
                    .eq(
                        "id",
                        orderId
                    );
            } catch {
                // conservar error original
            }
        }

        return NextResponse.json(
            {
                ok: false,
                error:
                    "No se pudo crear el pedido.",
            },
            {
                status: 500,
            }
        );
    }
}