-- Migración 20261112000005_core_direcciones_sector_fiscal_consumidor_final.sql
-- Proyecto: ecommerce-core (gkzkllnyveybjulyouiw)
-- 1. Añadir columna sector a direcciones_guardadas y setear ciudad por defecto en 'Quito'.
-- 2. Actualizar es_identificacion_valida para admitir formalmente Consumidor Final (9999999999999).
-- 3. Crear funciones transaccionales atómicas para alternar predeterminada sin race conditions.

ALTER TABLE public.direcciones_guardadas
ADD COLUMN IF NOT EXISTS sector text;

UPDATE public.direcciones_guardadas
SET sector = ciudad
WHERE sector IS NULL;

ALTER TABLE public.direcciones_guardadas
ALTER COLUMN ciudad SET DEFAULT 'Quito';

-- Soporte SRI para Consumidor Final (9999999999999)
CREATE OR REPLACE FUNCTION public.es_identificacion_valida(p text)
 RETURNS boolean
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare
  prov int; tercer int; suma int := 0; v int; r int; i int; coef int[];
begin
  if p is null or p !~ '^[0-9]+$' or char_length(p) not in (10, 13) then
    return false;
  end if;

  -- Consumidor Final autorizado por el SRI de Ecuador
  if p = '9999999999999' then
    return true;
  end if;

  prov := substr(p, 1, 2)::int;
  if not (prov between 1 and 24 or prov = 30) then
    return false;
  end if;

  if char_length(p) = 13 and substr(p, 11, 3) = '000' then
    return false;
  end if;

  tercer := substr(p, 3, 1)::int;

  if tercer < 6 then
    for i in 1..9 loop
      v := substr(p, i, 1)::int * (case when i % 2 = 1 then 2 else 1 end);
      if v > 9 then v := v - 9; end if;
      suma := suma + v;
    end loop;
    r := (10 - suma % 10) % 10;
    return r = substr(p, 10, 1)::int;
  end if;

  if char_length(p) <> 13 then
    return false;
  end if;

  if tercer = 9 then
    coef := array[4,3,2,7,6,5,4,3,2];
    for i in 1..9 loop suma := suma + substr(p, i, 1)::int * coef[i]; end loop;
    r := case when suma % 11 = 0 then 0 else 11 - suma % 11 end;
    return r = substr(p, 10, 1)::int;
  elsif tercer = 6 then
    coef := array[3,2,7,6,5,4,3,2];
    for i in 1..8 loop suma := suma + substr(p, i, 1)::int * coef[i]; end loop;
    r := case when suma % 11 = 0 then 0 else 11 - suma % 11 end;
    return r = substr(p, 9, 1)::int;
  end if;

  return false;
end;
$function$;

-- Funciones para alternar predeterminada de forma atómica
CREATE OR REPLACE FUNCTION public.establecer_direccion_predeterminada(p_direccion_id bigint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY INVOKER
 SET search_path TO ''
AS $function$
declare
  v_usuario uuid := (select auth.uid());
begin
  if v_usuario is null then
    raise exception 'Se requiere sesión activa';
  end if;

  update public.direcciones_guardadas
  set es_predeterminada = false
  where usuario_id = v_usuario;

  update public.direcciones_guardadas
  set es_predeterminada = true
  where id = p_direccion_id and usuario_id = v_usuario;
end;
$function$;

CREATE OR REPLACE FUNCTION public.establecer_dato_fiscal_predeterminado(p_fiscal_id bigint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY INVOKER
 SET search_path TO ''
AS $function$
declare
  v_usuario uuid := (select auth.uid());
begin
  if v_usuario is null then
    raise exception 'Se requiere sesión activa';
  end if;

  update public.datos_fiscales_guardados
  set es_predeterminado = false
  where usuario_id = v_usuario;

  update public.datos_fiscales_guardados
  set es_predeterminado = true
  where id = p_fiscal_id and usuario_id = v_usuario;
end;
$function$;

REVOKE EXECUTE ON FUNCTION public.establecer_direccion_predeterminada(bigint) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.establecer_dato_fiscal_predeterminado(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.establecer_direccion_predeterminada(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.establecer_dato_fiscal_predeterminado(bigint) TO authenticated;
