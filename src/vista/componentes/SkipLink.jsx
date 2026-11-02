/**
 * VISTA: enlace para saltar al contenido
 * Enlace accesible oculto que se hace visible al recibir foco (WCAG 2.2 - Criterio 2.4.1 Evitar bloques).
 */

export function EnlaceSaltarContenido() {
  return (
    <a href="#main-content" className="skip-link">
      Saltar al contenido principal
    </a>
  )
}
