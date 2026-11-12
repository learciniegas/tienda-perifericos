/**
 * VISTA: NoEncontradaPage.jsx
 * Página 404 accesible e integrada visualmente con el diseño de la tienda.
 */

import { Link } from 'react-router-dom'
import { IconoPeriferico } from '../componentes/PeripheralIcon'

export function PaginaNoEncontrada() {
  return (
    <div className="login-page-container">
      <div className="login-card-wrapper text-center" role="region" aria-labelledby="not-found-title">
        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
          <IconoPeriferico tipo="search" size={64} className="empty-icon" />
        </div>

        <span className="receipt-badge-label" style={{ color: '#b91c1c', background: '#fee2e2', display: 'inline-block', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontWeight: '700', fontSize: '0.8125rem' }}>
          ERROR 404
        </span>

        <h1 id="not-found-title" className="auth-form-title" style={{ marginTop: '0.75rem' }}>
          Página no encontrada
        </h1>

        <p className="auth-form-desc" style={{ marginBottom: '2rem' }}>
          Lo sentimos, la página que buscas no existe o ha sido movida. Puedes volver al inicio o revisar nuestros productos disponibles en Pichincha.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <Link to="/catalogo" className="btn-primary btn-full">
            Ver catálogo de periféricos
          </Link>
          <Link to="/" className="btn-secondary btn-full">
            Ir a la página de inicio
          </Link>
        </div>
      </div>
    </div>
  )
}
