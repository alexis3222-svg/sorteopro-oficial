"use client";

import {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";

/* ============================================================
   TIPOS
============================================================ */

export type CartProduct = {
    id: string;
    nombre: string;
    slug: string;

    precio: number;
    stock: number;

    imagen: string | null;
    sku: string | null;
};

export type CartItem = CartProduct & {
    cantidad: number;
};

type CartContextType = {
    items: CartItem[];

    totalItems: number;
    subtotal: number;

    agregarProducto: (
        producto: CartProduct,
        cantidad?: number
    ) => void;

    actualizarCantidad: (
        productId: string,
        cantidad: number
    ) => void;

    eliminarProducto: (
        productId: string
    ) => void;

    vaciarCarrito: () => void;

    estaEnCarrito: (
        productId: string
    ) => boolean;
};

/* ============================================================
   CONTEXT
============================================================ */

const CartContext =
    createContext<CartContextType | null>(
        null
    );

const STORAGE_KEY =
    "baruk_shop_cart";

/* ============================================================
   PROVIDER
============================================================ */

export function BarukCartProvider({
    children,
}: {
    children: ReactNode;
}) {
    const [items, setItems] =
        useState<CartItem[]>([]);

    const [hydrated, setHydrated] =
        useState(false);

    /* ========================================================
       CARGAR CARRITO DESDE LOCAL STORAGE
    ======================================================== */

    useEffect(() => {
        try {
            const saved =
                localStorage.getItem(
                    STORAGE_KEY
                );

            if (saved) {
                const parsed =
                    JSON.parse(saved);

                if (
                    Array.isArray(parsed)
                ) {
                    setItems(parsed);
                }
            }
        } catch (error) {
            console.error(
                "Error cargando carrito de Baruk Shop:",
                error
            );
        } finally {
            setHydrated(true);
        }
    }, []);

    /* ========================================================
       GUARDAR CARRITO EN LOCAL STORAGE
    ======================================================== */

    useEffect(() => {
        if (!hydrated) {
            return;
        }

        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(items)
            );
        } catch (error) {
            console.error(
                "Error guardando carrito de Baruk Shop:",
                error
            );
        }
    }, [items, hydrated]);

    /* ========================================================
       AGREGAR PRODUCTO
    ======================================================== */

    const agregarProducto = (
        producto: CartProduct,
        cantidad = 1
    ) => {
        const stock =
            Number(producto.stock);

        const precio =
            Number(producto.precio);

        if (
            !Number.isFinite(stock) ||
            stock <= 0
        ) {
            return;
        }

        if (
            !Number.isFinite(precio) ||
            precio < 0
        ) {
            return;
        }

        const cantidadSolicitada =
            Math.max(
                1,
                Math.floor(cantidad)
            );

        setItems(
            (actuales) => {
                const existente =
                    actuales.find(
                        (item) =>
                            item.id ===
                            producto.id
                    );

                /* ============================================
                   YA EXISTE EN EL CARRITO
                ============================================ */

                if (existente) {
                    return actuales.map(
                        (item) => {
                            if (
                                item.id !==
                                producto.id
                            ) {
                                return item;
                            }

                            const nuevaCantidad =
                                Math.min(
                                    item.cantidad +
                                    cantidadSolicitada,
                                    stock
                                );

                            return {
                                ...item,

                                nombre:
                                    producto.nombre,

                                slug:
                                    producto.slug,

                                precio,

                                stock,

                                imagen:
                                    producto.imagen,

                                sku:
                                    producto.sku,

                                cantidad:
                                    nuevaCantidad,
                            };
                        }
                    );
                }

                /* ============================================
                   PRODUCTO NUEVO EN EL CARRITO
                ============================================ */

                return [
                    ...actuales,

                    {
                        ...producto,

                        precio,

                        stock,

                        cantidad:
                            Math.min(
                                cantidadSolicitada,
                                stock
                            ),
                    },
                ];
            }
        );
    };

    /* ========================================================
       ACTUALIZAR CANTIDAD
    ======================================================== */

    const actualizarCantidad = (
        productId: string,
        cantidad: number
    ) => {
        setItems(
            (actuales) =>
                actuales
                    .map(
                        (item) => {
                            if (
                                item.id !==
                                productId
                            ) {
                                return item;
                            }

                            const nuevaCantidad =
                                Math.min(
                                    Math.max(
                                        Math.floor(
                                            cantidad
                                        ),
                                        0
                                    ),
                                    item.stock
                                );

                            return {
                                ...item,

                                cantidad:
                                    nuevaCantidad,
                            };
                        }
                    )
                    .filter(
                        (item) =>
                            item.cantidad >
                            0
                    )
        );
    };

    /* ========================================================
       ELIMINAR PRODUCTO
    ======================================================== */

    const eliminarProducto = (
        productId: string
    ) => {
        setItems(
            (actuales) =>
                actuales.filter(
                    (item) =>
                        item.id !==
                        productId
                )
        );
    };

    /* ========================================================
       VACIAR CARRITO
    ======================================================== */

    const vaciarCarrito = () => {
        setItems([]);
    };

    /* ========================================================
       CONSULTAR SI ESTÁ EN CARRITO
    ======================================================== */

    const estaEnCarrito = (
        productId: string
    ) => {
        return items.some(
            (item) =>
                item.id ===
                productId
        );
    };

    /* ========================================================
       TOTAL DE UNIDADES
    ======================================================== */

    const totalItems =
        useMemo(() => {
            return items.reduce(
                (
                    total,
                    item
                ) =>
                    total +
                    item.cantidad,
                0
            );
        }, [items]);

    /* ========================================================
       SUBTOTAL
    ======================================================== */

    const subtotal =
        useMemo(() => {
            return items.reduce(
                (
                    total,
                    item
                ) =>
                    total +
                    Number(
                        item.precio
                    ) *
                    item.cantidad,
                0
            );
        }, [items]);

    /* ========================================================
       PROVIDER
    ======================================================== */

    return (
        <CartContext.Provider
            value={{
                items,

                totalItems,
                subtotal,

                agregarProducto,

                actualizarCantidad,

                eliminarProducto,

                vaciarCarrito,

                estaEnCarrito,
            }}
        >
            {children}
        </CartContext.Provider>
    );
}

/* ============================================================
   HOOK
============================================================ */

export function useBarukCart() {
    const context =
        useContext(
            CartContext
        );

    if (!context) {
        throw new Error(
            "useBarukCart debe utilizarse dentro de BarukCartProvider."
        );
    }

    return context;
}