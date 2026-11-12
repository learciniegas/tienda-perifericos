-- Migración 20261112000004_core_items_carrito_seleccionado_fusionar.sql
-- Proyecto: ecommerce-core (gkzkllnyveybjulyouiw)
-- Soporte para persistencia de selección parcial (HU-07) en items_carrito
-- y actualización de la función fusionar_carrito para preservar el estado de selección.

ALTER TABLE public.items_carrito
ADD COLUMN IF NOT EXISTS seleccionado boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.fusionar_carrito(items jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_usuario uuid := (select auth.uid());
begin
  if v_usuario is null then
    raise exception 'Se requiere una sesión activa';
  end if;
  if jsonb_typeof(items) is distinct from 'array' then
    raise exception 'items debe ser un arreglo JSON';
  end if;

  insert into public.items_carrito (usuario_id, producto_id, cantidad, seleccionado)
  select
    v_usuario,
    t.producto_id,
    least(sum(t.cantidad), 99)::integer,
    coalesce(bool_and(coalesce(t.seleccionado, true)), true)
  from jsonb_to_recordset(items) as t(producto_id bigint, cantidad integer, seleccionado boolean)
  join public.productos p on p.id = t.producto_id and p.activo
  where t.cantidad > 0
  group by t.producto_id
  on conflict (usuario_id, producto_id) do update
    set cantidad = least(public.items_carrito.cantidad + excluded.cantidad, 99),
        seleccionado = excluded.seleccionado;
end;
$function$;
