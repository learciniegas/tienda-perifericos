-- Migración para ecommerce-core: Unificación de guardar_resena, corrección de defaults, RLS y agregados de reseñas
-- Proyecto: ecommerce-core (gkzkllnyveybjulyouiw)

-- 1. Quitar defaults engañosos en public.resenas
ALTER TABLE public.resenas
  ALTER COLUMN nombre_autor DROP DEFAULT,
  ALTER COLUMN titulo DROP DEFAULT,
  ALTER COLUMN ciudad DROP DEFAULT,
  ALTER COLUMN compra_verificada SET DEFAULT false;

-- 2. Revocar privilegios en versiones anteriores de guardar_resena
REVOKE ALL ON FUNCTION public.guardar_resena(bigint, smallint, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guardar_resena(bigint, smallint, text, text, text, text, uuid) FROM PUBLIC, anon, authenticated;

-- 3. Crear función unificada guardar_resena con validaciones estrictas y control de acceso
CREATE OR REPLACE FUNCTION public.guardar_resena(
  p_producto_id bigint,
  p_calificacion smallint,
  p_comentario text,
  p_titulo text DEFAULT NULL,
  p_nombre_autor text DEFAULT NULL,
  p_ciudad text DEFAULT NULL,
  p_compra_verificada boolean DEFAULT false,
  p_usuario_id uuid DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid;
  v_resena_id bigint;
  v_nombre text;
  v_producto_existe boolean;
BEGIN
  v_uid := COALESCE(auth.uid(), p_usuario_id);

  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sesión requerida para publicar una reseña' USING ERRCODE = '28000';
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.productos WHERE id = p_producto_id AND activo = true)
  INTO v_producto_existe;
  IF NOT v_producto_existe THEN
    RAISE EXCEPTION 'El producto no existe o no está disponible' USING ERRCODE = '02000';
  END IF;

  IF p_calificacion IS NULL OR p_calificacion < 1 OR p_calificacion > 5 THEN
    RAISE EXCEPTION 'La calificación debe ser un número entero entre 1 y 5' USING ERRCODE = '22003';
  END IF;

  IF p_comentario IS NOT NULL AND length(trim(p_comentario)) > 2000 THEN
    RAISE EXCEPTION 'El comentario no puede exceder los 2000 caracteres' USING ERRCODE = '22001';
  END IF;

  IF p_titulo IS NOT NULL AND length(trim(p_titulo)) > 150 THEN
    RAISE EXCEPTION 'El título no puede exceder los 150 caracteres' USING ERRCODE = '22001';
  END IF;

  IF p_ciudad IS NOT NULL AND length(trim(p_ciudad)) > 100 THEN
    RAISE EXCEPTION 'La ciudad no puede exceder los 100 caracteres' USING ERRCODE = '22001';
  END IF;

  IF p_nombre_autor IS NULL OR trim(p_nombre_autor) = '' THEN
    SELECT nombre_completo INTO v_nombre FROM public.perfiles WHERE id = v_uid;
    v_nombre := COALESCE(v_nombre, 'Cliente');
  ELSE
    v_nombre := trim(p_nombre_autor);
  END IF;

  INSERT INTO public.resenas (
    producto_id,
    usuario_id,
    calificacion,
    comentario,
    nombre_autor,
    titulo,
    ciudad,
    compra_verificada,
    creado_en
  )
  VALUES (
    p_producto_id,
    v_uid,
    p_calificacion,
    NULLIF(trim(p_comentario), ''),
    v_nombre,
    NULLIF(trim(p_titulo), ''),
    NULLIF(trim(p_ciudad), ''),
    COALESCE(p_compra_verificada, false),
    now()
  )
  RETURNING id INTO v_resena_id;

  RETURN v_resena_id;
END;
$$;

REVOKE ALL ON FUNCTION public.guardar_resena(bigint, smallint, text, text, text, text, boolean, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guardar_resena(bigint, smallint, text, text, text, text, boolean, uuid) TO service_role;

-- 4. Blindar política de inserción directa para evitar que el cliente se auto-asigne compra_verificada
ALTER POLICY resenas_insertar_propia ON public.resenas
  WITH CHECK ((auth.uid() = usuario_id) AND (compra_verificada IS NOT TRUE));

-- 5. Crear vista de agregados con security_invoker = true
CREATE OR REPLACE VIEW public.vista_resenas_agregados
WITH (security_invoker = true) AS
SELECT
  producto_id,
  COUNT(*)::integer AS total_resenas,
  ROUND(AVG(calificacion)::numeric, 1)::numeric(2,1) AS calificacion_promedio,
  COUNT(*) FILTER (WHERE calificacion = 5)::integer AS estrellas_5,
  COUNT(*) FILTER (WHERE calificacion = 4)::integer AS estrellas_4,
  COUNT(*) FILTER (WHERE calificacion = 3)::integer AS estrellas_3,
  COUNT(*) FILTER (WHERE calificacion = 2)::integer AS estrellas_2,
  COUNT(*) FILTER (WHERE calificacion = 1)::integer AS estrellas_1
FROM public.resenas
GROUP BY producto_id;

GRANT SELECT ON public.vista_resenas_agregados TO anon, authenticated, service_role;

-- 6. Función para obtener estadísticas de reseñas por producto
CREATE OR REPLACE FUNCTION public.obtener_estadisticas_resenas(p_producto_id bigint)
RETURNS TABLE (
  producto_id bigint,
  total_resenas integer,
  calificacion_promedio numeric,
  estrellas_5 integer,
  estrellas_4 integer,
  estrellas_3 integer,
  estrellas_2 integer,
  estrellas_1 integer
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT
    p_producto_id,
    COALESCE(v.total_resenas, 0)::integer,
    COALESCE(v.calificacion_promedio, 0.0)::numeric,
    COALESCE(v.estrellas_5, 0)::integer,
    COALESCE(v.estrellas_4, 0)::integer,
    COALESCE(v.estrellas_3, 0)::integer,
    COALESCE(v.estrellas_2, 0)::integer,
    COALESCE(v.estrellas_1, 0)::integer
  FROM (SELECT p_producto_id AS pid) dummy
  LEFT JOIN public.vista_resenas_agregados v ON v.producto_id = dummy.pid;
$$;

GRANT EXECUTE ON FUNCTION public.obtener_estadisticas_resenas(bigint) TO anon, authenticated, service_role;
