begin;

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'card_prizes_sorteo_nombre_unique'
          and conrelid = 'public.card_prizes'::regclass
    ) then
        alter table public.card_prizes
        add constraint card_prizes_sorteo_nombre_unique
        unique (sorteo_id, nombre);
    end if;
end
$$;

insert into public.card_prizes (
    sorteo_id,
    nombre,
    descripcion,
    tipo,
    imagen_url,
    cantidad_cards,
    valor_referencial,
    peso_asignacion,
    stock_total,
    stock_asignado,
    fecha_inicio,
    fecha_fin,
    activo
)
values

-- ------------------------------------------------------------
-- Premio digital
-- ------------------------------------------------------------
(
    'cedb391c-65e1-4684-801c-827200c66ded',
    '5 Baruk Cards',
    'El ganador recibe cinco Tarjetas de la Suerte adicionales.',
    'digital_cards',
    null,
    5,
    5.00,
    5.00,
    10,
    0,
    null,
    null,
    true
),

-- ------------------------------------------------------------
-- Premio físico
-- ------------------------------------------------------------
(
    'cedb391c-65e1-4684-801c-827200c66ded',
    'Casco para motociclista',
    'Premio físico sujeto a coordinación de entrega con el ganador.',
    'physical',
    null,
    null,
    100.00,
    1.00,
    2,
    0,
    null,
    null,
    true
),

-- ------------------------------------------------------------
-- Premio en efectivo
-- ------------------------------------------------------------
(
    'cedb391c-65e1-4684-801c-827200c66ded',
    'Premio en efectivo de $20',
    'El ganador recibe veinte dólares mediante el método de pago autorizado.',
    'cash',
    null,
    null,
    20.00,
    2.00,
    5,
    0,
    null,
    null,
    true
),

-- ------------------------------------------------------------
-- Experiencia
-- ------------------------------------------------------------
(
    'cedb391c-65e1-4684-801c-827200c66ded',
    'Experiencia especial para dos personas',
    'Experiencia para dos personas conforme a las condiciones publicadas por Baruk593.',
    'experience',
    null,
    null,
    150.00,
    0.50,
    1,
    0,
    null,
    null,
    true
)

on conflict (sorteo_id, nombre)
do update set
    descripcion = excluded.descripcion,
    tipo = excluded.tipo,
    imagen_url = excluded.imagen_url,
    cantidad_cards = excluded.cantidad_cards,
    valor_referencial = excluded.valor_referencial,
    peso_asignacion = excluded.peso_asignacion,
    stock_total = excluded.stock_total,
    fecha_inicio = excluded.fecha_inicio,
    fecha_fin = excluded.fecha_fin,
    activo = excluded.activo,
    updated_at = now();

commit;