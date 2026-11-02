/**
 * VISTA: anunciador accesible
 * Región accesible en vivo para notificar cambios dinámicos a lectores de pantalla (WCAG 4.1.3).
 */

import { useCarrito } from '../../controlador/useCarrito'

export function AnunciadorAccesible() {
  const { mensajeAccesible } = useCarrito()

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {mensajeAccesible}
    </div>
  )
}
