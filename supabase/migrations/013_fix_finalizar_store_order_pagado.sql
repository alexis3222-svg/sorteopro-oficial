-- ============================================================
-- 013_fix_finalizar_store_order_pagado.sql
-- CORRECCIÓN:
-- FOR UPDATE + GROUP BY
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
begin

    -- ========================================================
    -- 1. VALIDAR MÉTODO
    -- ========================================================

    if p_metodo_pago not in (
        'payphone',
        'transferencia'
    ) then
        raise exception
            'Método de pago no permitido';
    end if;


    -- ========================================================
    -- 2. BLOQUEAR PEDIDO
    -- ========================================================

    select *
    into v_order
    from public.store_orders
    where id = p_order_id
    for update;


    if not found then
        raise exception
            'Pedido no encontrado';
    end if;


    -- ========================================================
    -- 3. IDEMPOTENCIA
    -- ========================================================

    if v_order.estado_pago = 'pagado' then
        return jsonb_build_object(
            'ok', true,
            'alreadyPaid', true,
            'orderId', v_order.id,
            'orderNumber', v_order.order_number
        );
    end if;


    -- ========================================================
    -- 4. NO PERMITIR PEDIDO CANCELADO
    -- ========================================================

    if v_order.estado = 'cancelado' then
        raise exception
            'El pedido está cancelado';
    end if;


    -- ========================================================
    -- 5. VALIDAR QUE EXISTAN ITEMS
    -- ========================================================

    if not exists (
        select 1
        from public.store_order_items
        where order_id = p_order_id
    ) then
        raise exception
            'El pedido no contiene productos';
    end if;


    -- ========================================================
    -- 6. VALIDAR PRODUCTOS ELIMINADOS
    -- ========================================================

    if exists (
        select 1
        from public.store_order_items
        where order_id = p_order_id
          and product_id is null
    ) then
        raise exception
            'El pedido contiene un producto no disponible';
    end if;


    -- ========================================================
    -- 7. BLOQUEAR PRODUCTOS
    --
    -- IMPORTANTE:
    -- Aquí NO usamos GROUP BY.
    -- Primero bloqueamos las filas reales de store_products.
    -- ========================================================

    perform 1
    from public.store_products p
    where p.id in (
        select distinct oi.product_id
        from public.store_order_items oi
        where oi.order_id = p_order_id
          and oi.product_id is not null
    )
    order by p.id
    for update;


    -- ========================================================
    -- 8. VALIDAR PRODUCTOS ACTIVOS
    -- ========================================================

    if exists (
        select 1

        from public.store_products p

        join (
            select
                oi.product_id,
                sum(oi.cantidad)::integer as cantidad

            from public.store_order_items oi

            where oi.order_id = p_order_id

            group by oi.product_id
        ) cantidades

            on cantidades.product_id = p.id

        where p.activo = false
    ) then
        raise exception
            'Uno de los productos ya no está disponible';
    end if;


    -- ========================================================
    -- 9. VALIDAR STOCK
    -- ========================================================

    if exists (
        select 1

        from public.store_products p

        join (
            select
                oi.product_id,
                sum(oi.cantidad)::integer as cantidad

            from public.store_order_items oi

            where oi.order_id = p_order_id

            group by oi.product_id
        ) cantidades

            on cantidades.product_id = p.id

        where p.stock < cantidades.cantidad
    ) then
        raise exception
            'Stock insuficiente para completar el pedido';
    end if;


    -- ========================================================
    -- 10. DESCONTAR STOCK
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
            oi.product_id,
            sum(oi.cantidad)::integer as cantidad

        from public.store_order_items oi

        where oi.order_id = p_order_id

        group by oi.product_id
    ) cantidades

    where p.id =
        cantidades.product_id;


    -- ========================================================
    -- 11. CONFIRMAR PEDIDO
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


    -- ========================================================
    -- 12. RESPUESTA
    -- ========================================================

    return jsonb_build_object(
        'ok', true,
        'alreadyPaid', false,
        'orderId', p_order_id,
        'orderNumber', v_order.order_number
    );

end;
$$;


-- ============================================================
-- PERMISOS
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