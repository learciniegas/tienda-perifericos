/**
 * VISTA: notificación del carrito
 * Notificación accesible y visual cuando se agrega un artículo al carrito.
 */

import { useCarrito } from '../../controlador/useCarrito'
import { IconoPeriferico } from './PeripheralIcon'

export function NotificacionCarrito() {
  const { notificacionVisual, limpiarMensaje } = useCarrito()

  if (!notificacionVisual) return null

  return (
    <div
      className="toast-notificacion"
      role="alert"
      aria-live="assertive"
    >
      <div className="toast-contenido">
        <span className="toast-icono" aria-hidden="true">
          <IconoPeriferico tipo="check" size={20} />
        </span>
        <div className="toast-texto">
          <p className="toast-titulo">¡Agregado al carrito!</p>
          <p className="toast-descripcion">
            <strong>{notificacionVisual.producto}</strong> - ${notificacionVisual.precio}
          </p>
          <p className="toast-resumen">
            Tienes {notificacionVisual.totalArticulos} {notificacionVisual.totalArticulos === 1 ? 'artículo' : 'artículos'} en el carrito.
          </p>
        </div>
      </div>
      <button
        type="button"
        className="toast-cerrar"
        onClick={limpiarMensaje}
        aria-label="Cerrar notificación"
      >
        ×
      </button>
    </div>
  )
}
