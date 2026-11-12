-- Migración TX: Seguridad de pedidos, estados_pedido y avance automático con pg_cron
-- Proyecto: ecommerce-tx (zxqmpylxvxnktqthvigl)

-- 1. Habilitar extensión pg_cron para tareas programadas en el servidor
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Ajustar nombre oficial del estado 3 para alinear con la base y el negocio en Quito
UPDATE public.estados_pedido
SET nombre = 'En camino (Quito)'
WHERE id = 3;

-- 3. Revocar permisos directos de anon y PUBLIC sobre registrar_pedido
REVOKE EXECUTE ON FUNCTION public.registrar_pedido(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_pedido(jsonb) TO service_role;

-- Permitir lectura pública exclusiva de inventario y estados_pedido
GRANT SELECT ON public.estados_pedido TO anon, authenticated;
GRANT SELECT ON public.inventario TO anon, authenticated;

-- 4. Restringir políticas SELECT públicas permisivas exclusivamente a service_role
ALTER POLICY pedidos_lectura ON public.pedidos TO service_role USING (false);
ALTER POLICY detalles_pedido_lectura ON public.detalles_pedido TO service_role USING (false);
ALTER POLICY historial_estados_pedido_lectura ON public.historial_estados_pedido TO service_role USING (false);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pagos' AND policyname = 'pagos_service_role') THEN
    CREATE POLICY pagos_service_role ON public.pagos TO service_role USING (false);
  END IF;
END;
$$;

-- 5. Función de avance automático de estados de pedidos (2 -> 3 -> 4 cada 2 minutos)
CREATE OR REPLACE FUNCTION public.avanzar_estados_pedidos(p_intervalo_minutos integer DEFAULT 2)
RETURNS table(pedido_id bigint, estado_anterior smallint, nuevo_estado smallint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  r record;
  v_interval interval := (p_intervalo_minutos || ' minutes')::interval;
BEGIN
  -- Fase 2 -> Fase 3: De 'En preparación' (2) a 'En camino (Quito)' (3)
  FOR r IN
    SELECT p.id
    FROM public.pedidos p
    WHERE p.estado_id = 2
      AND EXISTS (
        SELECT 1 FROM public.historial_estados_pedido h
        WHERE h.pedido_id = p.id AND h.estado_id = 2
          AND h.cambiado_en <= (now() - v_interval)
      )
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.pedidos SET estado_id = 3 WHERE id = r.id;
    INSERT INTO public.historial_estados_pedido (pedido_id, estado_id, cambiado_en)
    VALUES (r.id, 3, now());
    pedido_id := r.id;
    estado_anterior := 2;
    nuevo_estado := 3;
    RETURN NEXT;
  END LOOP;

  -- Fase 3 -> Fase 4: De 'En camino (Quito)' (3) a 'Entregado' (4)
  FOR r IN
    SELECT p.id
    FROM public.pedidos p
    WHERE p.estado_id = 3
      AND EXISTS (
        SELECT 1 FROM public.historial_estados_pedido h
        WHERE h.pedido_id = p.id AND h.estado_id = 3
          AND h.cambiado_en <= (now() - v_interval)
      )
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.pedidos SET estado_id = 4 WHERE id = r.id;
    INSERT INTO public.historial_estados_pedido (pedido_id, estado_id, cambiado_en, correo_notificado_en)
    VALUES (r.id, 4, now(), now());
    pedido_id := r.id;
    estado_anterior := 3;
    nuevo_estado := 4;
    RETURN NEXT;
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.avanzar_estados_pedidos(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.avanzar_estados_pedidos(integer) TO service_role;

-- 6. Programar cron cada minuto para verificar pedidos elegibles para avance
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cron_avanzar_estados_pedidos') THEN
    PERFORM cron.unschedule('cron_avanzar_estados_pedidos');
  END IF;
  PERFORM cron.schedule(
    'cron_avanzar_estados_pedidos',
    '* * * * *',
    'SELECT public.avanzar_estados_pedidos(2);'
  );
END;
$$;
