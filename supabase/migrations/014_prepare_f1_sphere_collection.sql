-- ============================================================
-- BARUK593
-- MIGRACIÓN 014
-- PREPARACIÓN DE F1 SPHERE COLLECTION 2026
--
-- IMPORTANTE:
-- Esta migración NO activa todavía las nuevas esferas.
-- Las esferas legacy continúan operativas.
-- ============================================================

begin;


-- ============================================================
-- 1. AMPLIAR NUMERACIÓN DE ESFERAS 1..7 → 1..11
-- ============================================================

alter table public.spheres
drop constraint if exists spheres_numero_check;

alter table public.spheres
add constraint spheres_numero_check
check (
    numero >= 1
    and numero <= 11
);


-- ============================================================
-- 2. IDENTIFICADOR DE COLECCIÓN
-- ============================================================

alter table public.spheres
add column if not exists collection_key text;


-- ============================================================
-- 3. INFORMACIÓN DE ESCUDERÍA
-- ============================================================

alter table public.spheres
add column if not exists team_name text;

alter table public.spheres
add column if not exists team_slug text;

alter table public.spheres
add column if not exists season integer;


-- ============================================================
-- 4. RAREZA
-- ============================================================

alter table public.spheres
add column if not exists rarity text;

alter table public.spheres
drop constraint if exists spheres_rarity_check;

alter table public.spheres
add constraint spheres_rarity_check
check (
    rarity is null
    or rarity in (
        'common',
        'rare',
        'epic',
        'legendary'
    )
);


-- ============================================================
-- 5. IDENTIDAD VISUAL
-- ============================================================

alter table public.spheres
add column if not exists primary_color text;

alter table public.spheres
add column if not exists secondary_color text;

alter table public.spheres
add column if not exists accent_color text;


-- ============================================================
-- 6. IMAGEN DEL MONOPLAZA
-- ============================================================

alter table public.spheres
add column if not exists car_image_url text;


-- ============================================================
-- 7. MARKETPLACE
-- ============================================================

alter table public.spheres
add column if not exists marketplace_enabled boolean
not null
default false;


-- ============================================================
-- 8. MARCAR LAS 7 ESFERAS EXISTENTES COMO LEGACY
--
-- NO se eliminan.
-- NO se cambia su nombre.
-- NO se cambia su stock.
-- NO se desactivan todavía.
-- ============================================================

update public.spheres
set
    collection_key = 'legacy-7'
where collection_key is null;


-- ============================================================
-- 9. CAMBIAR RESTRICCIÓN UNIQUE
--
-- Antes:
--     sorteo_id + numero
--
-- Ahora:
--     sorteo_id + collection_key + numero
--
-- Esto permite:
--
-- legacy-7:
--     números 1..7
--
-- f1-2026:
--     números 1..11
-- ============================================================

alter table public.spheres
drop constraint if exists spheres_sorteo_id_numero_key;

alter table public.spheres
add constraint spheres_sorteo_collection_numero_key
unique (
    sorteo_id,
    collection_key,
    numero
);


-- ============================================================
-- 10. EVITAR REPETIR UNA ESCUDERÍA EN UNA MISMA COLECCIÓN
-- ============================================================

create unique index if not exists
spheres_collection_team_unique_idx
on public.spheres (
    sorteo_id,
    collection_key,
    team_slug
)
where team_slug is not null;


-- ============================================================
-- 11. ÍNDICES PARA CONSULTAS
-- ============================================================

create index if not exists
spheres_collection_key_idx
on public.spheres (
    collection_key
);

create index if not exists
spheres_collection_rarity_idx
on public.spheres (
    collection_key,
    rarity
);

create index if not exists
spheres_marketplace_idx
on public.spheres (
    collection_key,
    marketplace_enabled
);


-- ============================================================
-- 12. PREPARAR COLLECTION_REWARDS PARA TRABAJAR
--     POR COLECCIÓN
--
-- Por ahora NO cambiamos el premio actual.
-- ============================================================

alter table public.collection_rewards
add column if not exists collection_key text;


-- ============================================================
-- 13. CREAR LAS 11 ESFERAS F1
--
-- Se utiliza el sorteo que actualmente tiene
-- el premio de colección activo.
--
-- IMPORTANTE:
--
-- activa = false
-- stock_total = 0
-- marketplace_enabled = false
--
-- Así ninguna puede asignarse todavía.
-- ============================================================

with target_sorteo as (

    select
        cr.sorteo_id

    from public.collection_rewards cr

    where cr.activo = true

    order by
        cr.created_at desc

    limit 1

),

f1_spheres (
    numero,
    nombre,
    descripcion,
    team_name,
    team_slug,
    rarity,
    primary_color,
    secondary_color,
    accent_color,
    peso_asignacion
) as (

    values

    (
        1,
        'Audi Sphere',
        'Esfera coleccionable inspirada en la escudería Audi de Fórmula 1.',
        'Audi',
        'audi',
        'common',
        '#000000',
        '#C7C7C7',
        '#E10600',
        1.000000::numeric
    ),

    (
        2,
        'Cadillac Sphere',
        'Esfera coleccionable inspirada en la escudería Cadillac de Fórmula 1.',
        'Cadillac',
        'cadillac',
        'common',
        '#111111',
        '#F2F2F2',
        '#B7B7B7',
        1.000000::numeric
    ),

    (
        3,
        'Alpine Sphere',
        'Esfera coleccionable inspirada en la escudería Alpine de Fórmula 1.',
        'Alpine',
        'alpine',
        'common',
        '#1473E6',
        '#FF66B3',
        '#FFFFFF',
        1.000000::numeric
    ),

    (
        4,
        'Haas Sphere',
        'Esfera coleccionable inspirada en la escudería Haas de Fórmula 1.',
        'Haas',
        'haas',
        'common',
        '#F2F2F2',
        '#111111',
        '#E10600',
        1.000000::numeric
    ),

    (
        5,
        'Racing Bulls Sphere',
        'Esfera coleccionable inspirada en la escudería Racing Bulls de Fórmula 1.',
        'Racing Bulls',
        'racing-bulls',
        'common',
        '#182B49',
        '#F2F2F2',
        '#4D7CFE',
        1.000000::numeric
    ),

    (
        6,
        'Aston Martin Sphere',
        'Esfera coleccionable inspirada en la escudería Aston Martin de Fórmula 1.',
        'Aston Martin',
        'aston-martin',
        'rare',
        '#00665E',
        '#00352F',
        '#B6D532',
        0.450000::numeric
    ),

    (
        7,
        'Williams Sphere',
        'Esfera coleccionable inspirada en la histórica escudería Williams de Fórmula 1.',
        'Williams',
        'williams',
        'rare',
        '#005AFF',
        '#041E42',
        '#FFFFFF',
        0.450000::numeric
    ),

    (
        8,
        'Red Bull Racing Sphere',
        'Esfera coleccionable inspirada en la escudería Red Bull Racing de Fórmula 1.',
        'Red Bull Racing',
        'red-bull-racing',
        'rare',
        '#001E50',
        '#E10600',
        '#F9D616',
        0.450000::numeric
    ),

    (
        9,
        'Mercedes Sphere',
        'Esfera épica inspirada en la escudería Mercedes de Fórmula 1.',
        'Mercedes',
        'mercedes',
        'epic',
        '#111111',
        '#C7C7C7',
        '#00A19C',
        0.200000::numeric
    ),

    (
        10,
        'McLaren Sphere',
        'Esfera épica inspirada en la escudería McLaren de Fórmula 1.',
        'McLaren',
        'mclaren',
        'epic',
        '#FF8700',
        '#111111',
        '#47C7FC',
        0.200000::numeric
    ),

    (
        11,
        'Ferrari Sphere',
        'La esfera legendaria de la colección, inspirada en Ferrari.',
        'Ferrari',
        'ferrari',
        'legendary',
        '#E10600',
        '#7A0000',
        '#FFD700',
        0.050000::numeric
    )
)

insert into public.spheres (

    sorteo_id,

    numero,

    nombre,

    descripcion,

    imagen_url,

    peso_asignacion,

    stock_total,

    stock_asignado,

    activa,

    collection_key,

    team_name,

    team_slug,

    season,

    rarity,

    primary_color,

    secondary_color,

    accent_color,

    car_image_url,

    marketplace_enabled
)

select

    ts.sorteo_id,

    fs.numero,

    fs.nombre,

    fs.descripcion,

    null,

    fs.peso_asignacion,

    0,

    0,

    false,

    'f1-2026',

    fs.team_name,

    fs.team_slug,

    2026,

    fs.rarity,

    fs.primary_color,

    fs.secondary_color,

    fs.accent_color,

    null,

    false

from target_sorteo ts

cross join f1_spheres fs

on conflict (
    sorteo_id,
    collection_key,
    numero
)

do update set

    nombre =
        excluded.nombre,

    descripcion =
        excluded.descripcion,

    team_name =
        excluded.team_name,

    team_slug =
        excluded.team_slug,

    season =
        excluded.season,

    rarity =
        excluded.rarity,

    primary_color =
        excluded.primary_color,

    secondary_color =
        excluded.secondary_color,

    accent_color =
        excluded.accent_color,

    peso_asignacion =
        excluded.peso_asignacion,

    updated_at =
        now();


commit;