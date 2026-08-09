-- ============================================================
-- 007_premio_coleccion_esferas.sql
-- Premio especial por completar una colección de esferas
-- ============================================================


-- ============================================================
-- 1. CATÁLOGO DE PREMIOS POR COLECCIÓN
-- ============================================================

create table if not exists public.collection_rewards (
    id uuid primary key default gen_random_uuid(),

    sorteo_id uuid not null
        references public.sorteos(id)
        on delete cascade,

    nombre text not null,

    descripcion text,

    tipo text not null default 'experience',

    required_unique_spheres integer not null default 7,

    activo boolean not null default true,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now(),

    constraint collection_rewards_tipo_check
        check (
            tipo in (
                'experience',
                'physical',
                'cash',
                'digital',
                'other'
            )
        ),

    constraint collection_rewards_required_spheres_check
        check (
            required_unique_spheres > 0
        ),

    constraint collection_rewards_sorteo_unique
        unique (sorteo_id)
);


-- ============================================================
-- 2. RECLAMOS DEL PREMIO DE COLECCIÓN
-- ============================================================

create table if not exists public.collection_reward_claims (
    id uuid primary key default gen_random_uuid(),

    reward_id uuid not null
        references public.collection_rewards(id)
        on delete restrict,

    sorteo_id uuid not null
        references public.sorteos(id)
        on delete restrict,

    owner_user_id uuid not null
        references auth.users(id)
        on delete restrict,

    owner_email text,

    estado text not null default 'pending_claim',

    unique_spheres_at_claim integer not null default 7,

    completed_at timestamptz not null default now(),

    verified_at timestamptz,

    scheduled_at timestamptz,

    delivered_at timestamptz,

    notas text,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now(),

    constraint collection_reward_claims_estado_check
        check (
            estado in (
                'pending_claim',
                'verified',
                'scheduled',
                'delivered',
                'cancelled'
            )
        ),

    constraint collection_reward_claims_owner_sorteo_unique
        unique (
            owner_user_id,
            sorteo_id
        )
);


-- ============================================================
-- 3. ÍNDICES
-- ============================================================

create index if not exists
    collection_reward_claims_owner_user_idx
on public.collection_reward_claims (
    owner_user_id
);


create index if not exists
    collection_reward_claims_sorteo_idx
on public.collection_reward_claims (
    sorteo_id
);


create index if not exists
    collection_reward_claims_estado_idx
on public.collection_reward_claims (
    estado
);


-- ============================================================
-- 4. PREMIO DE LA CAMPAÑA ACTUAL
-- ============================================================
--
-- Sorteo actual:
-- cedb391c-65e1-4684-801c-827200c66ded
--
-- Se utiliza ON CONFLICT para que la migración sea idempotente.
-- ============================================================

insert into public.collection_rewards (
    sorteo_id,
    nombre,
    descripcion,
    tipo,
    required_unique_spheres,
    activo
)
values (
    'cedb391c-65e1-4684-801c-827200c66ded',
    'Experiencia El Reventador para dos personas',
    'Experiencia especial para dos personas por completar la colección de las 7 esferas Baruk593.',
    'experience',
    7,
    true
)
on conflict (sorteo_id)
do update set
    nombre = excluded.nombre,
    descripcion = excluded.descripcion,
    tipo = excluded.tipo,
    required_unique_spheres = excluded.required_unique_spheres,
    activo = excluded.activo,
    updated_at = now();


-- ============================================================
-- 5. FUNCIÓN SEGURA PARA VERIFICAR Y CREAR EL RECLAMO
-- ============================================================
--
-- Esta función:
--
-- - cuenta solamente esferas de tarjetas reveladas;
-- - ignora tarjetas canceladas;
-- - cuenta esferas distintas, no duplicados;
-- - valida que pertenezcan al mismo sorteo;
-- - evita entregar dos veces el premio;
-- - crea el reclamo solamente cuando se completa la colección.
--
-- ============================================================

create or replace function public.ensure_collection_reward_claim(
    p_user_id uuid,
    p_sorteo_id uuid,
    p_owner_email text default null
)
returns table (
    claim_id uuid,
    claim_created boolean,
    collection_completed boolean,
    unique_spheres integer,
    required_spheres integer,
    claim_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
    v_reward public.collection_rewards%rowtype;

    v_unique_spheres integer := 0;

    v_existing_claim public.collection_reward_claims%rowtype;

    v_new_claim public.collection_reward_claims%rowtype;
begin

    -- ========================================================
    -- Buscar premio activo del sorteo
    -- ========================================================

    select *
    into v_reward
    from public.collection_rewards
    where sorteo_id = p_sorteo_id
      and activo = true
    limit 1;


    if v_reward.id is null then
        return query
        select
            null::uuid,
            false,
            false,
            0,
            0,
            null::text;

        return;
    end if;


    -- ========================================================
    -- Contar esferas DIFERENTES obtenidas y reveladas
    -- ========================================================

    select
        count(
            distinct bc.sphere_id
        )::integer
    into
        v_unique_spheres
    from public.baruk_cards bc
    inner join public.spheres s
        on s.id = bc.sphere_id
    where
        bc.owner_user_id = p_user_id

        and bc.revealed = true

        and bc.extra_type = 'sphere'

        and bc.sphere_id is not null

        and bc.estado <> 'cancelled'

        and s.sorteo_id = p_sorteo_id;


    -- ========================================================
    -- Si todavía no completa la colección
    -- ========================================================

    if
        v_unique_spheres <
        v_reward.required_unique_spheres
    then
        return query
        select
            null::uuid,

            false,

            false,

            v_unique_spheres,

            v_reward.required_unique_spheres,

            null::text;

        return;
    end if;


    -- ========================================================
    -- Revisar si ya existe reclamo
    -- ========================================================

    select *
    into v_existing_claim
    from public.collection_reward_claims
    where
        owner_user_id = p_user_id
        and sorteo_id = p_sorteo_id
    limit 1;


    if v_existing_claim.id is not null then

        return query
        select
            v_existing_claim.id,

            false,

            true,

            v_unique_spheres,

            v_reward.required_unique_spheres,

            v_existing_claim.estado;

        return;

    end if;


    -- ========================================================
    -- Crear reclamo
    -- ========================================================

    insert into public.collection_reward_claims (
        reward_id,
        sorteo_id,
        owner_user_id,
        owner_email,
        estado,
        unique_spheres_at_claim,
        completed_at
    )
    values (
        v_reward.id,
        p_sorteo_id,
        p_user_id,
        lower(
            trim(
                coalesce(
                    p_owner_email,
                    ''
                )
            )
        ),
        'pending_claim',
        v_unique_spheres,
        now()
    )
    on conflict (
        owner_user_id,
        sorteo_id
    )
    do nothing
    returning *
    into v_new_claim;


    -- ========================================================
    -- Si otra solicitud la creó simultáneamente
    -- ========================================================

    if v_new_claim.id is null then

        select *
        into v_existing_claim
        from public.collection_reward_claims
        where
            owner_user_id = p_user_id
            and sorteo_id = p_sorteo_id
        limit 1;


        return query
        select
            v_existing_claim.id,

            false,

            true,

            v_unique_spheres,

            v_reward.required_unique_spheres,

            v_existing_claim.estado;

        return;

    end if;


    -- ========================================================
    -- Reclamo recién creado
    -- ========================================================

    return query
    select
        v_new_claim.id,

        true,

        true,

        v_unique_spheres,

        v_reward.required_unique_spheres,

        v_new_claim.estado;

end;
$$;


-- ============================================================
-- 6. SEGURIDAD DE LA FUNCIÓN
-- ============================================================
--
-- Solo service_role debe ejecutar esta función.
-- El cliente nunca debe llamarla directamente.
-- ============================================================

revoke all
on function public.ensure_collection_reward_claim(
    uuid,
    uuid,
    text
)
from public;


revoke all
on function public.ensure_collection_reward_claim(
    uuid,
    uuid,
    text
)
from anon;


revoke all
on function public.ensure_collection_reward_claim(
    uuid,
    uuid,
    text
)
from authenticated;


grant execute
on function public.ensure_collection_reward_claim(
    uuid,
    uuid,
    text
)
to service_role;