-- Migración 20261112000006_core_limpieza_datos_prueba.sql
-- Proyecto: ecommerce-core (gkzkllnyveybjulyouiw)
-- Limpieza de registros y perfiles de prueba confirmada por el usuario.

DELETE FROM public.resenas WHERE id = 10;
DELETE FROM auth.users WHERE id IN (
  'e5ba5470-bb20-4280-b295-8bb0803d62bb',
  'e718d806-f290-4b1f-9a69-4285d9875b50'
);
