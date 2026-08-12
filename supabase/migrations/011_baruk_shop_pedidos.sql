-- ============================================================
-- 011_baruk_shop_pedidos.sql
-- PEDIDOS Y DETALLE DE PEDIDOS - BARUK SHOP
-- ============================================================


-- ============================================================
-- 1. PEDIDOS DE BARUK SHOP
-- ============================================================

create table if not exists public.store_orders (
    id uuid primary key default gen_random_uuid(),

    -- Código amigable para mostrar al cliente
    order_number text not null unique,

    -- ========================================================
    -- CLIENTE
    -- ========================================================

    cliente_nombre text not null,

    cliente_email text not null,

    cliente_telefono text,

    identificacion text,

    -- ========================================================
    -- ENTREGA
    -- ========================================================

    tipo_entrega text not null default 'envio'
        check (
            tipo_entrega in (
                'envio',
                'retiro'
            )
        ),

    provincia text,

    ciudad text,

    direccion text,

    referencia text,

    -- ========================================================
    -- VALORES
    -- ========================================================

    subtotal numeric(12,2) not null default 0
        check (subtotal >= 0),

    costo_envio numeric(12,2) not null default 0
        check (costo_envio >= 0),

    descuento numeric(12,2) not null default 0
        check (descuento >= 0),

    total numeric(12,2) not null default 0
        check (total >= 0),

    -- ========================================================
    -- PAGO
    -- ========================================================

    metodo_pago text
        check (
            metodo_pago is null
            or metodo_pago in (
                'payphone',
                'transferencia'
            )
        ),

    estado_pago text not null default 'pendiente'
        check (
            estado_pago in (
                'pendiente',
                'procesando',
                'pagado',
                'fallido',
                'cancelado',
                'reembolsado'
            )
        ),

    payphone_client_transaction_id text,

    payphone_transaction_id text,

    comprobante_transferencia text,

    -- ========================================================
    -- ESTADO DEL PEDIDO
    -- ========================================================

    estado text not null default 'pendiente'
        check (
            estado in (
                'pendiente',
                'confirmado',
                'preparando',
                'enviado',
                'listo_retiro',
                'entregado',
                'cancelado'
            )
        ),

    -- ========================================================
    -- OBSERVACIONES
    -- ========================================================

    notas_cliente text,

    notas_admin text,

    -- ========================================================
    -- FECHAS
    -- ========================================================

    pagado_at timestamptz,

    confirmado_at timestamptz,

    enviado_at timestamptz,

    entregado_at timestamptz,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now()
);


-- ============================================================
-- 2. DETALLE DEL PEDIDO
-- ============================================================

create table if not exists public.store_order_items (
    id uuid primary key default gen_random_uuid(),

    order_id uuid not null
        references public.store_orders(id)
        on delete cascade,

    product_id uuid
        references public.store_products(id)
        on delete set null,

    -- ========================================================
    -- COPIA DEL PRODUCTO AL MOMENTO DE LA COMPRA
    --
    -- IMPORTANTE:
    -- Aunque después cambie el producto, conservamos
    -- nombre, SKU y precio utilizados en esta venta.
    -- ========================================================

    producto_nombre text not null,

    producto_slug text,

    producto_sku text,

    producto_imagen text,

    precio_unitario numeric(12,2) not null
        check (precio_unitario >= 0),

    cantidad integer not null
        check (cantidad > 0),

    total_linea numeric(12,2) not null
        check (total_linea >= 0),

    created_at timestamptz not null default now()
);


-- ============================================================
-- 3. ÍNDICES
-- ============================================================

create index if not exists
store_orders_created_at_idx
on public.store_orders(created_at desc);


create index if not exists
store_orders_estado_idx
on public.store_orders(estado);


create index if not exists
store_orders_estado_pago_idx
on public.store_orders(estado_pago);


create index if not exists
store_orders_cliente_email_idx
on public.store_orders(lower(cliente_email));


create index if not exists
store_orders_order_number_idx
on public.store_orders(order_number);


create index if not exists
store_order_items_order_id_idx
on public.store_order_items(order_id);


create index if not exists
store_order_items_product_id_idx
on public.store_order_items(product_id);


-- ============================================================
-- 4. UPDATED_AT AUTOMÁTICO
-- ============================================================

create or replace function public.update_store_order_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;


drop trigger if exists
trigger_store_orders_updated_at
on public.store_orders;


create trigger trigger_store_orders_updated_at
before update
on public.store_orders
for each row
execute function public.update_store_order_updated_at();


-- ============================================================
-- 5. GENERADOR DE NÚMERO DE PEDIDO
-- ============================================================

create sequence if not exists
public.store_order_number_seq
start with 1001;


create or replace function public.generate_store_order_number()
returns text
language plpgsql
as $$
declare
    next_number bigint;
begin
    next_number :=
        nextval(
            'public.store_order_number_seq'
        );

    return
        'BS-' ||
        to_char(
            current_date,
            'YYYY'
        ) ||
        '-' ||
        lpad(
            next_number::text,
            6,
            '0'
        );
end;
$$;


-- ============================================================
-- 6. ASIGNAR NÚMERO AUTOMÁTICO
-- ============================================================

create or replace function public.set_store_order_number()
returns trigger
language plpgsql
as $$
begin
    if
        new.order_number is null
        or trim(new.order_number) = ''
    then
        new.order_number :=
            public.generate_store_order_number();
    end if;

    return new;
end;
$$;


drop trigger if exists
trigger_store_order_number
on public.store_orders;


create trigger trigger_store_order_number
before insert
on public.store_orders
for each row
execute function public.set_store_order_number();