-- Migración para ecommerce-core: Columna precio_anterior y tabla configuracion_tienda
-- Proyecto: ecommerce-core (gkzkllnyveybjulyouiw)

-- 1. Añadir columna opcional precio_anterior con validación de integridad
ALTER TABLE public.productos
  ADD COLUMN IF NOT EXISTS precio_anterior numeric CHECK (precio_anterior IS NULL OR precio_anterior >= precio);

-- 2. Crear tabla configuracion_tienda para parámetros dinámicos de negocio
CREATE TABLE IF NOT EXISTS public.configuracion_tienda (
  clave text PRIMARY KEY,
  valor jsonb NOT NULL,
  descripcion text,
  actualizado_en timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.configuracion_tienda ENABLE ROW LEVEL SECURITY;

-- Política de lectura pública para anon y authenticated
DROP POLICY IF EXISTS configuracion_tienda_lectura ON public.configuracion_tienda;
CREATE POLICY configuracion_tienda_lectura ON public.configuracion_tienda
  FOR SELECT TO anon, authenticated
  USING (true);

-- 3. Sembrar valores iniciales del negocio en Ecuador
INSERT INTO public.configuracion_tienda (clave, valor, descripcion)
VALUES
  ('iva_porcentaje', '0.15'::jsonb, 'Porcentaje de IVA aplicado en Ecuador (15%)'),
  ('envio_gratis_desde', '50.00'::jsonb, 'Monto mínimo de subtotal a partir del cual el envío es gratis'),
  ('costo_envio', '5.00'::jsonb, 'Costo de envío estándar para pedidos menores al umbral')
ON CONFLICT (clave) DO NOTHING;
