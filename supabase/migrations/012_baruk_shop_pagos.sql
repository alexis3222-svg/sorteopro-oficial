-- ============================================================
-- 012_baruk_shop_confirmar_pago.sql
-- CONFIRMACIÓN ATÓMICA DE PAGOS BARUK SHOP
-- ============================================================

create or replace function public.finalizar_store_order_pagado(
    p_order_id uuid,
    p_metodo_pago text,
    p_payphone_transaction_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_order public.store_orders%rowtype;
    v_item record;
begin

    -- ========================================================
    -- MÉTODO DE PAGO
    -- ========================================================

    if p_metodo_pago not in (
        'payphone',
        'transferencia'
    ) then
        raise exception 'Método de pago no permitido';
    end if;


    -- ========================================================
    -- BLOQUEAR PEDIDO
    -- ========================================================

    select *
    into v_order
    from public.store_orders
    where id = p_order_id
    for update;


    if not found then
        raise exception 'Pedido no encontrado';
    end if;


    -- ========================================================
    -- IDEMPOTENCIA
    -- ========================================================

    if v_order.estado_pago = 'pagado' then
        return jsonb_build_object(
            'ok', true,
            'alreadyPaid', true,
            'orderId', v_order.id,
            'orderNumber', v_order.order_number
        );
    end if;


    if v_order.estado = 'cancelado' then
        raise exception 'El pedido está cancelado';
    end if;


    -- ========================================================
    -- DEBE TENER PRODUCTOS
    -- ========================================================

    if not exists (
        select 1
        from public.store_order_items
        where order_id = p_order_id
    ) then
        raise exception 'El pedido no contiene productos';
    end if;


    -- ========================================================
    -- PRODUCTOS BORRADOS / SIN REFERENCIA
    -- ========================================================

    if exists (
        select 1
        from public.store_order_items
        where order_id = p_order_id
          and product_id is null
    ) then
        raise exception 'El pedido contiene un producto no disponible';
    end if;


    -- ========================================================
    -- BLOQUEAR Y VALIDAR STOCK
    -- ========================================================

    for v_item in

        select
            oi.product_id,
            sum(oi.cantidad)::integer as cantidad,
            p.nombre,
            p.stock,
            p.activo

        from public.store_order_items oi

        join public.store_products p
            on p.id = oi.product_id

        where oi.order_id = p_order_id

        group by
            oi.product_id,
            p.nombre,
            p.stock,
            p.activo

        order by oi.product_id

        for update of p

    loop

        if not v_item.activo then
            raise exception
                'Producto no disponible: %',
                v_item.nombre;
        end if;


        if v_item.stock < v_item.cantidad then
            raise exception
                'Stock insuficiente para %',
                v_item.nombre;
        end if;

    end loop;


    -- ========================================================
    -- DESCONTAR STOCK
    -- ========================================================

    update public.store_products p

    set
        stock =
            p.stock -
            cantidades.cantidad,

        updated_at =
            now()

    from (
        select
            product_id,
            sum(cantidad)::integer as cantidad

        from public.store_order_items

        where order_id = p_order_id

        group by product_id
    ) cantidades

    where p.id =
        cantidades.product_id;


    -- ========================================================
    -- MARCAR PEDIDO PAGADO
    -- ========================================================

    update public.store_orders

    set
        metodo_pago =
            p_metodo_pago,

        estado_pago =
            'pagado',

        estado =
            'confirmado',

        payphone_transaction_id =
            case
                when p_metodo_pago = 'payphone'
                then p_payphone_transaction_id
                else payphone_transaction_id
            end,

        pagado_at =
            coalesce(
                pagado_at,
                now()
            ),

        confirmado_at =
            coalesce(
                confirmado_at,
                now()
            ),

        updated_at =
            now()

    where id =
        p_order_id;


    return jsonb_build_object(
        'ok', true,
        'alreadyPaid', false,
        'orderId', p_order_id,
        'orderNumber', v_order.order_number
    );

end;
$$;


-- ============================================================
-- SOLO SERVICE ROLE
-- ============================================================

revoke all
on function public.finalizar_store_order_pagado(
    uuid,
    text,
    text
)
from public;

revoke all
on function public.finalizar_store_order_pagado(
    uuid,
    text,
    text
)
from anon;

revoke all
on function public.finalizar_store_order_pagado(
    uuid,
    text,
    text
)
from authenticated;

grant execute
on function public.finalizar_store_order_pagado(
    uuid,
    text,
    text
)
to service_role;