begin;

-- ============================================================
-- BARUK593
-- Catálogo inicial:
-- - Diseño predeterminado
-- - Siete esferas coleccionables
-- ============================================================

-- ------------------------------------------------------------
-- 1. Diseño inicial de la Tarjeta de la Suerte
-- ------------------------------------------------------------

insert into public.card_designs (
    nombre,
    slug,
    imagen_frontal_url,
    imagen_posterior_url,
    miniatura_url,
    activo,
    orden
)
values (
    'Baruk Card Futurista',
    'baruk-card-futurista',
    null,
    null,
    null,
    true,
    1
)
on conflict (slug)
do update set
    nombre = excluded.nombre,
    activo = excluded.activo,
    orden = excluded.orden,
    updated_at = now();

-- ------------------------------------------------------------
-- 2. Siete esferas
--
-- Las esferas 1 a 6 tendrán mayor disponibilidad.
-- La esfera 7 será la esfera limitada.
--
-- Al existir únicamente dos unidades de la esfera 7,
-- como máximo dos personas podrán completar la colección.
-- ------------------------------------------------------------

insert into public.spheres (
    sorteo_id,
    numero,
    nombre,
    descripcion,
    imagen_url,
    peso_asignacion,
    stock_total,
    stock_asignado,
    activa
)
values
(
    'cedb391c-65e1-4684-801c-827200c66ded',
    1,
    'Esfera del Origen',
    'Primera esfera de la colección Baruk593.',
    null,
    1,
    100,
    0,
    true
),
(
    'cedb391c-65e1-4684-801c-827200c66ded',
    2,
    'Esfera de la Energía',
    'Segunda esfera de la colección Baruk593.',
    null,
    1,
    100,
    0,
    true
),
(
    'cedb391c-65e1-4684-801c-827200c66ded',
    3,
    'Esfera de la Fortuna',
    'Tercera esfera de la colección Baruk593.',
    null,
    1,
    100,
    0,
    true
),
(
    'cedb391c-65e1-4684-801c-827200c66ded',
    4,
    'Esfera del Valor',
    'Cuarta esfera de la colección Baruk593.',
    null,
    1,
    100,
    0,
    true
),
(
    'cedb391c-65e1-4684-801c-827200c66ded',
    5,
    'Esfera del Destino',
    'Quinta esfera de la colección Baruk593.',
    null,
    1,
    100,
    0,
    true
),
(
    'cedb391c-65e1-4684-801c-827200c66ded',
    6,
    'Esfera del Poder',
    'Sexta esfera de la colección Baruk593.',
    null,
    1,
    100,
    0,
    true
),
(
    'cedb391c-65e1-4684-801c-827200c66ded',
    7,
    'Esfera del Reventador',
    'Esfera especial y limitada que permite completar la colección.',
    null,
    0.10,
    2,
    0,
    true
)
on conflict (sorteo_id, numero)
do update set
    nombre = excluded.nombre,
    descripcion = excluded.descripcion,
    peso_asignacion = excluded.peso_asignacion,
    stock_total = excluded.stock_total,
    activa = excluded.activa,
    updated_at = now();

commit;