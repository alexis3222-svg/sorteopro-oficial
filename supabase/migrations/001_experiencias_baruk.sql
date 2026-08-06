begin;
-- ============================================================
-- BARUK593
-- Migración inicial para:
-- - Tarjetas de la Suerte
-- - Esferas
-- - Premios instantáneos
-- - Regalos digitales
--
-- IMPORTANTE:
-- Esta primera migración crea tablas nuevas.
-- No elimina ni modifica pedidos, numeros_asignados o sorteos.
-- ============================================================

create extension if not exists pgcrypto;

-- ============================================================
-- 1. DISEÑOS DE TARJETA
-- ============================================================

create table if not exists public.card_designs (
    id uuid primary key default gen_random_uuid(),

    nombre text not null,
    slug text not null unique,

    imagen_frontal_url text,
    imagen_posterior_url text,
    miniatura_url text,

    activo boolean not null default true,
    orden integer not null default 0,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- ============================================================
-- 2. ESFERAS
-- ============================================================

create table if not exists public.spheres (
    id uuid primary key default gen_random_uuid(),

    sorteo_id uuid not null
        references public.sorteos(id)
        on delete cascade,

    numero smallint not null
        check (numero between 1 and 7),

    nombre text not null,
    descripcion text,

    imagen_url text,

    peso_asignacion numeric(12,6) not null default 1
        check (peso_asignacion >= 0),

    stock_total integer
        check (stock_total is null or stock_total >= 0),

    stock_asignado integer not null default 0
        check (stock_asignado >= 0),

    activa boolean not null default true,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    unique (sorteo_id, numero),

    check (
        stock_total is null
        or stock_asignado <= stock_total
    )
);

-- ============================================================
-- 3. PREMIOS INSTANTÁNEOS
-- ============================================================

create table if not exists public.card_prizes (
    id uuid primary key default gen_random_uuid(),

    sorteo_id uuid not null
        references public.sorteos(id)
        on delete cascade,

    nombre text not null,
    descripcion text,

    tipo text not null
        check (
            tipo in (
                'physical',
                'digital_cards',
                'cash',
                'experience',
                'discount'
            )
        ),

    imagen_url text,

    cantidad_cards integer
        check (
            cantidad_cards is null
            or cantidad_cards > 0
        ),

    valor_referencial numeric(12,2)
        check (
            valor_referencial is null
            or valor_referencial >= 0
        ),

    peso_asignacion numeric(12,6) not null default 1
        check (peso_asignacion >= 0),

    stock_total integer not null default 0
        check (stock_total >= 0),

    stock_asignado integer not null default 0
        check (stock_asignado >= 0),

    instrucciones_reclamo text,

    activo boolean not null default true,

    fecha_inicio timestamptz,
    fecha_fin timestamptz,

    permitir_en_cards_bonificadas boolean not null default true,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    check (stock_asignado <= stock_total),

    check (
        tipo <> 'digital_cards'
        or cantidad_cards is not null
    ),

    check (
        fecha_fin is null
        or fecha_inicio is null
        or fecha_fin > fecha_inicio
    )
);

-- ============================================================
-- 4. REGALOS DIGITALES
-- ============================================================

create table if not exists public.baruk_gifts (
    id uuid primary key default gen_random_uuid(),

    pedido_id bigint not null unique
        references public.pedidos(id)
        on delete cascade,

    comprador_nombre text not null,
    comprador_correo text not null,
    comprador_telefono text,

    destinatario_nombre text not null,
    destinatario_correo text not null,
    destinatario_telefono text not null,

    mensaje text,

    token_reclamo text not null unique
        default encode(gen_random_bytes(24), 'hex'),

    estado text not null default 'pending_payment'
        check (
            estado in (
                'pending_payment',
                'paid',
                'sent',
                'pending_verification',
                'claimed',
                'partially_revealed',
                'fully_revealed',
                'cancelled'
            )
        ),

    envio_inmediato boolean not null default true,

    enviado_at timestamptz,
    reclamado_at timestamptz,

    claimed_by uuid
        references auth.users(id)
        on delete set null,

    whatsapp_status text not null default 'pending'
        check (
            whatsapp_status in (
                'pending',
                'sent',
                'failed',
                'not_required'
            )
        ),

    email_status text not null default 'pending'
        check (
            email_status in (
                'pending',
                'sent',
                'failed'
            )
        ),

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- ============================================================
-- 5. TARJETAS DE LA SUERTE
-- ============================================================

create table if not exists public.baruk_cards (
    id uuid primary key default gen_random_uuid(),

    pedido_id bigint not null
        references public.pedidos(id)
        on delete cascade,

    numero_asignado_id bigint not null unique
        references public.numeros_asignados(id)
        on delete restrict,

    sorteo_id uuid not null
        references public.sorteos(id)
        on delete cascade,

    design_id uuid
        references public.card_designs(id)
        on delete set null,

    gift_id uuid
        references public.baruk_gifts(id)
        on delete set null,

    owner_type text not null
        check (
            owner_type in (
                'buyer',
                'gift_recipient'
            )
        ),

    owner_user_id uuid
        references auth.users(id)
        on delete set null,

    owner_email text not null,
    owner_phone text,

    origin text not null default 'purchase'
        check (
            origin in (
                'purchase',
                'gift',
                'instant_prize',
                'promotion',
                'affiliate_bonus'
            )
        ),

    extra_type text not null default 'none'
        check (
            extra_type in (
                'none',
                'sphere',
                'prize'
            )
        ),

    sphere_id uuid
        references public.spheres(id)
        on delete restrict,

    prize_id uuid
        references public.card_prizes(id)
        on delete restrict,

    estado text not null default 'available'
        check (
            estado in (
                'available',
                'gift_pending',
                'claimed',
                'revealed',
                'cancelled'
            )
        ),

    revealed boolean not null default false,
    revealed_at timestamptz,
    revealed_by uuid
        references auth.users(id)
        on delete set null,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    check (
        (
            extra_type = 'none'
            and sphere_id is null
            and prize_id is null
        )
        or
        (
            extra_type = 'sphere'
            and sphere_id is not null
            and prize_id is null
        )
        or
        (
            extra_type = 'prize'
            and prize_id is not null
            and sphere_id is null
        )
    )
);

-- ============================================================
-- 6. RECLAMOS DE PREMIOS
-- ============================================================

create table if not exists public.prize_claims (
    id uuid primary key default gen_random_uuid(),

    card_id uuid not null unique
        references public.baruk_cards(id)
        on delete cascade,

    prize_id uuid not null
        references public.card_prizes(id)
        on delete restrict,

    owner_user_id uuid
        references auth.users(id)
        on delete set null,

    owner_name text,
    owner_email text not null,
    owner_phone text,

    estado text not null default 'pending_claim'
        check (
            estado in (
                'pending_claim',
                'verified',
                'scheduled',
                'delivered',
                'cancelled'
            )
        ),

    notas_admin text,
    comprobante_entrega_url text,

    verified_at timestamptz,
    scheduled_at timestamptz,
    delivered_at timestamptz,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- ============================================================
-- 7. ÍNDICES
-- ============================================================

create index if not exists idx_baruk_cards_pedido
    on public.baruk_cards(pedido_id);

create index if not exists idx_baruk_cards_owner_email
    on public.baruk_cards(lower(owner_email));

create index if not exists idx_baruk_cards_owner_phone
    on public.baruk_cards(owner_phone);

create index if not exists idx_baruk_cards_owner_user
    on public.baruk_cards(owner_user_id);

create index if not exists idx_baruk_cards_sorteo
    on public.baruk_cards(sorteo_id);

create index if not exists idx_baruk_cards_extra
    on public.baruk_cards(extra_type);

create index if not exists idx_baruk_cards_revealed
    on public.baruk_cards(revealed);

create index if not exists idx_gifts_recipient_email
    on public.baruk_gifts(lower(destinatario_correo));

create index if not exists idx_gifts_recipient_phone
    on public.baruk_gifts(destinatario_telefono);

create index if not exists idx_spheres_sorteo
    on public.spheres(sorteo_id);

create index if not exists idx_prizes_sorteo
    on public.card_prizes(sorteo_id);

-- ============================================================
-- 8. CONTROL DE updated_at
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists trg_card_designs_updated_at
    on public.card_designs;

create trigger trg_card_designs_updated_at
before update on public.card_designs
for each row
execute function public.set_updated_at();

drop trigger if exists trg_spheres_updated_at
    on public.spheres;

create trigger trg_spheres_updated_at
before update on public.spheres
for each row
execute function public.set_updated_at();

drop trigger if exists trg_card_prizes_updated_at
    on public.card_prizes;

create trigger trg_card_prizes_updated_at
before update on public.card_prizes
for each row
execute function public.set_updated_at();

drop trigger if exists trg_baruk_gifts_updated_at
    on public.baruk_gifts;

create trigger trg_baruk_gifts_updated_at
before update on public.baruk_gifts
for each row
execute function public.set_updated_at();

drop trigger if exists trg_baruk_cards_updated_at
    on public.baruk_cards;

create trigger trg_baruk_cards_updated_at
before update on public.baruk_cards
for each row
execute function public.set_updated_at();

drop trigger if exists trg_prize_claims_updated_at
    on public.prize_claims;

create trigger trg_prize_claims_updated_at
before update on public.prize_claims
for each row
execute function public.set_updated_at();
commit;