/**
 * MODELO: tipos.js
 * Constantes y definiciones de referencia para la tienda de periféricos.
 * La base de datos es la única fuente de verdad para catálogo, stock, reseñas y configuración.
 */

export const CONFIGURACION_TIENDA_DEFECTO = {
  iva_porcentaje: 0.15,
  envio_gratis_desde: 50.00,
  costo_envio: 5.00
}

export const ESTADOS_PEDIDO_MAP = {
  1: 'Pendiente de pago',
  2: 'En preparación',
  3: 'En camino (Quito)',
  4: 'Entregado',
  5: 'Cancelado'
}
