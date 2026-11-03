/**
 * VISTA: TrustBadges.jsx
 * Garantías y beneficios de compra con cobertura en la provincia de Pichincha.
 */

import { IconoPeriferico } from './PeripheralIcon'

export function BeneficiosCompra() {
  return (
    <section className="trust-badges-section" aria-label="Garantías y beneficios de compra">
      <div className="trust-container">
        <div className="trust-item">
          <div className="trust-icon-wrapper" aria-hidden="true">
            <IconoPeriferico tipo="truck" size={32} />
          </div>
          <div className="trust-text">
            <h3>Cobertura Exclusiva en Pichincha</h3>
            <p>Entregas rápidas y seguras en Quito y todos los cantones de la provincia.</p>
          </div>
        </div>

        <div className="trust-item">
          <div className="trust-icon-wrapper" aria-hidden="true">
            <IconoPeriferico tipo="shield" size={32} />
          </div>
          <div className="trust-text">
            <h3>12 Meses de Garantía</h3>
            <p>Soporte oficial y reemplazo directo contra defectos de fábrica.</p>
          </div>
        </div>
      </div>
    </section>
  )
}
