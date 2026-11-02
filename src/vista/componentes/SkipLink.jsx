/**
 * VISTA: enlace para saltar al contenido
 * Enlace accesible oculto que se hace visible al recibir foco para evitar bloques repetitivos.
 */

export function EnlaceSaltarContenido() {
  return (
    <a href="#main-content" className="skip-link">
      Saltar al contenido principal
    </a>
  )
}
