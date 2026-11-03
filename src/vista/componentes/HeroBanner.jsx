/**
 * VISTA: HeroBanner.jsx
 * Banner promocional principal con cobertura exclusiva en la provincia de Pichincha.
 */

import { Link } from 'react-router-dom'
import { IconoPeriferico } from './PeripheralIcon'

export function HeroBanner() {
  return (
    <section className="hero-banner" aria-labelledby="hero-heading">
      <div className="hero-content">
        <div className="hero-badge">
          <IconoPeriferico tipo="star" size={16} />
          <span>Equipamiento Gamer & Profesional en Pichincha</span>
        </div>

        <h1 id="hero-heading" className="hero-title">
          Eleva tu nivel con los mejores <span className="highlight-text">periféricos</span>
        </h1>

        <p className="hero-subtitle">
          Teclados mecánicos, ratones de ultra-precisión y sonido inmersivo para tu setup, con garantía de 12 meses.
        </p>

        <div className="hero-ctas">
          <Link to="/catalogo" className="btn-hero-primary">
            Explorar catálogo completo
          </Link>
          <Link to="/catalogo?cat=teclados" className="btn-hero-secondary">
            Ver teclados mecánicos
          </Link>
        </div>

        <ul className="hero-features-list" aria-label="Beneficios de compra">
          <li>
            <IconoPeriferico tipo="check" size={18} />
            <span>Stock verificado</span>
          </li>
          <li>
            <IconoPeriferico tipo="shield" size={18} />
            <span>12 meses de garantía directa</span>
          </li>
        </ul>
      </div>

      <div className="hero-visual" aria-hidden="true">
        <div className="hero-device-grid">
          <div className="hero-device-item device-keyboard">
            <IconoPeriferico tipo="keyboard" size={80} />
            <span>Teclados Mecánicos</span>
          </div>
          <div className="hero-device-item device-mouse">
            <IconoPeriferico tipo="mouse" size={80} />
            <span>Ratones Gamer</span>
          </div>
          <div className="hero-device-item device-headset">
            <IconoPeriferico tipo="headset" size={80} />
            <span>Audio Inmersivo</span>
          </div>
        </div>
      </div>
    </section>
  )
}
