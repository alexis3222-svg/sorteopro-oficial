begin;

-- ============================================================
-- BARUK593
-- Motor atómico para asignación de extras
--
-- Resultado por tarjeta:
-- 85 % = solo número
-- 10 % = esfera
--  5 % = premio instantáneo
-- ============================================================


-- ------------------------------------------------------------
-- 1. Campo de idempotencia
--
-- Permite saber si la tarjeta ya fue procesada, incluso cuando
-- el resultado legítimo fue extra_type = 'none'.
-- ------------------------------------------------------------

alter table public.baruk_cards
add column if not exists extra_processed_at timestamptz;


create index if not exists idx_baruk_cards_extra_pending
on public.baruk_cards(sorteo_id, extra_processed_at)
where extra_processed_at is null;


-- ------------------------------------------------------------
-- 2. Función atómica de asignación
-- ------------------------------------------------------------

create or replace function public.assign_baruk_card_extra(
    p_card_id uuid
)
returns table (
    card_id uuid,
    extra_type text,
    sphere_id uuid,
    prize_id uuid,
    already_processed boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
    v_card public.baruk_cards%rowtype;

    v_random numeric;

    v_sphere_id uuid;
    v_prize_id uuid;

    v_attempt integer;
begin
    /*
     * Bloqueamos la tarjeta para impedir que dos solicitudes
     * procesen simultáneamente la misma Baruk Card.
     */
    select *
    into v_card
    from public.baruk_cards
    where id = p_card_id
    for update;

    if not found then
        raise exception 'CARD_NOT_FOUND';
    end if;


    /*
     * Idempotencia:
     * si ya fue procesada, devolvemos el resultado existente.
     */
    if v_card.extra_processed_at is not null then
        return query
        select
            v_card.id,
            v_card.extra_type,
            v_card.sphere_id,
            v_card.prize_id,
            true;

        return;
    end if;


    /*
     * Número aleatorio entre 0 y 1.
     */
    v_random := random();


    -- ========================================================
    -- 85 %: solo número
    -- ========================================================

    if v_random < 0.85 then

        update public.baruk_cards
        set
            extra_type = 'none',
            sphere_id = null,
            prize_id = null,
            extra_processed_at = now(),
            updated_at = now()
        where id = p_card_id;

        return query
        select
            p_card_id,
            'none'::text,
            null::uuid,
            null::uuid,
            false;

        return;
    end if;


    -- ========================================================
    -- 10 %: esfera
    -- Intervalo: 0.85 a 0.95
    -- ========================================================

    if v_random < 0.95 then

        /*
         * Se realizan varios intentos por si otro proceso toma
         * la última unidad entre la selección y la actualización.
         */
        for v_attempt in 1..5 loop

            v_sphere_id := null;

            /*
             * Selección aleatoria ponderada.
             *
             * Una esfera con mayor peso_asignacion tiene mayor
             * probabilidad de ser elegida.
             */
            select s.id
            into v_sphere_id
            from public.spheres s
            where s.sorteo_id = v_card.sorteo_id
              and s.activa = true
              and s.stock_asignado < s.stock_total
              and s.peso_asignacion > 0
            order by
                -ln(greatest(random(), 0.000000000001))
                / s.peso_asignacion
            limit 1;

            exit when v_sphere_id is null;

            /*
             * Reserva atómica de stock.
             *
             * Solo aumenta si todavía existe una unidad disponible.
             */
            update public.spheres
            set
                stock_asignado = stock_asignado + 1,
                updated_at = now()
            where id = v_sphere_id
              and stock_asignado < stock_total
            returning id into v_sphere_id;

            if v_sphere_id is not null then

                update public.baruk_cards
                set
                    extra_type = 'sphere',
                    sphere_id = v_sphere_id,
                    prize_id = null,
                    extra_processed_at = now(),
                    updated_at = now()
                where id = p_card_id;

                return query
                select
                    p_card_id,
                    'sphere'::text,
                    v_sphere_id,
                    null::uuid,
                    false;

                return;
            end if;

        end loop;


        /*
         * Si no existe stock de esferas, la tarjeta conserva
         * únicamente su número.
         */
        update public.baruk_cards
        set
            extra_type = 'none',
            sphere_id = null,
            prize_id = null,
            extra_processed_at = now(),
            updated_at = now()
        where id = p_card_id;

        return query
        select
            p_card_id,
            'none'::text,
            null::uuid,
            null::uuid,
            false;

        return;
    end if;


    -- ========================================================
    -- 5 %: premio instantáneo
    -- Intervalo: 0.95 a 1.00
    -- ========================================================

    for v_attempt in 1..5 loop

        v_prize_id := null;

        select cp.id
        into v_prize_id
        from public.card_prizes cp
        where cp.sorteo_id = v_card.sorteo_id
          and cp.stock_asignado < cp.stock_total
          and cp.peso_asignacion > 0
          and (
              cp.fecha_inicio is null
              or cp.fecha_inicio <= now()
          )
          and (
              cp.fecha_fin is null
              or cp.fecha_fin >= now()
          )
        order by
            -ln(greatest(random(), 0.000000000001))
            / cp.peso_asignacion
        limit 1;

        exit when v_prize_id is null;


        /*
         * Reserva atómica del premio.
         */
        update public.card_prizes
        set
            stock_asignado = stock_asignado + 1,
            updated_at = now()
        where id = v_prize_id
          and stock_asignado < stock_total
        returning id into v_prize_id;


        if v_prize_id is not null then

            update public.baruk_cards
            set
                extra_type = 'prize',
                sphere_id = null,
                prize_id = v_prize_id,
                extra_processed_at = now(),
                updated_at = now()
            where id = p_card_id;

            return query
            select
                p_card_id,
                'prize'::text,
                null::uuid,
                v_prize_id,
                false;

            return;
        end if;

    end loop;


    /*
     * Si no existen premios disponibles, la tarjeta queda
     * únicamente con su número.
     */
    update public.baruk_cards
    set
        extra_type = 'none',
        sphere_id = null,
        prize_id = null,
        extra_processed_at = now(),
        updated_at = now()
    where id = p_card_id;

    return query
    select
        p_card_id,
        'none'::text,
        null::uuid,
        null::uuid,
        false;

    return;
end;
$$;


-- ------------------------------------------------------------
-- 3. Permisos
--
-- La asignación será ejecutada exclusivamente desde el servidor
-- mediante supabaseAdmin/service_role.
-- ------------------------------------------------------------

revoke all
on function public.assign_baruk_card_extra(uuid)
from public;

revoke all
on function public.assign_baruk_card_extra(uuid)
from anon;

revoke all
on function public.assign_baruk_card_extra(uuid)
from authenticated;

grant execute
on function public.assign_baruk_card_extra(uuid)
to service_role;


commit;