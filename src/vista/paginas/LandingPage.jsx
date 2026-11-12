/**
 * VISTA: LandingPage.jsx
 * Página principal estilo Amazon para el e-commerce de periféricos.
 * Cumple con arquitectura MVS, diseño consistente con Pichincha como zona de despacho y accesibilidad universal.
 */

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useCatalogo } from '../../controlador/useCatalogo'
import { useAutenticacion } from '../../controlador/useAuth'
import { obtenerPreguntasFrecuentes } from '../../modelo/catalogoModelo'
import { HeroBanner } from '../componentes/HeroBanner'
import { TarjetasDestacadas } from '../componentes/AmazonFeatureCards'
import { TarjetaProducto } from '../componentes/ProductCard'
import { BeneficiosCompra } from '../componentes/TrustBadges'
import { IconoPeriferico } from '../componentes/PeripheralIcon'

export function PaginaInicio() {
  const { productos, cargando, error } = useCatalogo({ limite: 6 })
  const { usuario } = useAutenticacion()
  const [faqAbierto, setFaqAbierto] = useState(null)
  const [preguntasFrecuentes, setPreguntasFrecuentes] = useState([])

  useEffect(() => {
    let activo = true
    obtenerPreguntasFrecuentes()
      .then((faqs) => {
        if (activo) setPreguntasFrecuentes(faqs.slice(0, 3))
      })
      .catch(() => {})
    return () => {
      activo = false
    }
  }, [])

  const alternarPregunta = (indice) => {
    setFaqAbierto(anterior => (anterior === indice ? null : indice))
  }

  return (
    <div className="landing-page-wrapper">
      
      {/* 1. Banner Principal de Héroe */}
      <HeroBanner />

      <div className="landing-content-container">
        
        {/* 2. Tarjetas Destacadas Multi-Categoría (Estilo Amazon) */}
        <TarjetasDestacadas />

        {/* 3. Sección de Productos de Temporada */}
        <section className="catalog-showcase-section" aria-labelledby="showcase-heading">
          <div className="section-header-block">
            <h2 id="showcase-heading" className="catalog-main-title">
              Catálogo de periféricos
            </h2>
            <p className="catalog-subtitle">
              Explora nuestra selección de periféricos para gaming y trabajo.
            </p>
          </div>

          <div className="showcase-subbar">
            <h3 className="season-heading">Temporada</h3>
            <Link to="/catalogo" className="view-all-link">
              Ver catálogo completo
              <span aria-hidden="true"> →</span>
            </Link>
          </div>

          {cargando ? (
            <div className="loading-state" role="status" aria-live="polite">
              <div className="spinner" aria-hidden="true" />
              <p>Cargando periféricos disponibles...</p>
            </div>
          ) : error ? (
            <div className="error-state" role="alert">
              <p>{error}</p>
            </div>
          ) : (
            <div className="products-grid" role="region" aria-label="Productos de temporada">
              {productos.slice(0, 6).map((producto) => (
                <TarjetaProducto key={producto.id} producto={producto} />
              ))}
            </div>
          )}
        </section>

        {/* 4. Banner Destacado */}
        <section className="deals-banner-section" aria-labelledby="deals-heading">
          <div className="deals-banner-card">
            <div className="deals-content">
              <span className="deal-tag">Catálogo Exclusivo</span>
              <h2 id="deals-heading" className="deal-title">
                Periféricos de Alto Rendimiento para Gamers y Profesionales
              </h2>
              <p className="deal-text">
                Marcas líderes: Logitech, Corsair, Razer y Redragon con 12 meses de garantía directa.
              </p>
              <Link to="/catalogo" className="btn-primary deal-cta">
                Explorar catálogo completo
              </Link>
            </div>
            <div className="deals-visual" aria-hidden="true">
              <div className="deal-icon-circle">
                <IconoPeriferico tipo="keyboard" size={48} />
              </div>
              <div className="deal-icon-circle">
                <IconoPeriferico tipo="mouse" size={48} />
              </div>
              <div className="deal-icon-circle">
                <IconoPeriferico tipo="headset" size={48} />
              </div>
            </div>
          </div>
        </section>

        {/* 5. Módulo de Registro / Inicio de Sesión (Release 3) */}
        <section className="auth-callout-section" aria-labelledby="auth-callout-heading">
          {!usuario?.autenticado ? (
            <div className="auth-callout-card">
              <div className="auth-callout-text">
                <span className="auth-badge-pill">COMPRADORES EN PICHINCHA</span>
                <h2 id="auth-callout-heading" className="auth-callout-title">
                  Crea tu cuenta o inicia sesión para una experiencia completa
                </h2>
                <p className="auth-callout-desc">
                  Guarda tus direcciones de entrega en Quito, emite tus facturas con Cédula o RUC, valora tus periféricos comprados y consulta el seguimiento en tiempo real.
                </p>
              </div>
              <div className="auth-callout-actions">
                <Link to="/login" className="btn-primary auth-btn-cta">
                  Iniciar sesión
                </Link>
                <Link to="/registro" className="btn-secondary auth-btn-register">
                  Crear cuenta gratis
                </Link>
              </div>
            </div>
          ) : (
            <div className="auth-callout-card user-logged-card">
              <div className="auth-callout-text">
                <span className="auth-badge-pill">SESIÓN ACTIVA</span>
                <h2 id="auth-callout-heading" className="auth-callout-title">
                  ¡Bienvenido de nuevo, {usuario.nombre}!
                </h2>
                <p className="auth-callout-desc">
                  Tu cuenta se encuentra activa para realizar compras directas con entrega en Pichincha. Consulta tus pedidos o administra tus direcciones guardadas.
                </p>
              </div>
              <div className="auth-callout-actions">
                <Link to="/cuenta" className="btn-primary auth-btn-cta">
                  Ir a mi cuenta
                </Link>
                <Link to="/seguimiento" className="btn-secondary auth-btn-register">
                  Rastrear mis pedidos
                </Link>
              </div>
            </div>
          )}
        </section>

        {/* 6. Franja de Garantías y Cobertura */}
        <BeneficiosCompra />

        {/* 6. Preguntas Frecuentes */}
        <section className="landing-faq-section" aria-labelledby="faq-landing-heading">
          <div className="section-header-block">
            <h2 id="faq-landing-heading" className="catalog-main-title">
              Preguntas Frecuentes
            </h2>
            <p className="catalog-subtitle">
              Información sobre compras, productos y garantías de hardware.
            </p>
          </div>

          <div className="faq-accordion-list" role="region" aria-label="Acordeón de preguntas frecuentes">
            {preguntasFrecuentes.map((pregunta, indice) => {
              const abierto = faqAbierto === indice
              const idPregunta = `faq-q-${indice}`
              const idRespuesta = `faq-a-${indice}`

              return (
                <div key={indice} className={`faq-accordion-item ${abierto ? 'is-open' : ''}`}>
                  <h3>
                    <button
                      type="button"
                      id={idPregunta}
                      className="faq-question-btn"
                      onClick={() => alternarPregunta(indice)}
                      aria-expanded={abierto}
                      aria-controls={idRespuesta}
                    >
                      <span>{pregunta.pregunta}</span>
                      <IconoPeriferico
                        tipo="chevron-down"
                        size={18}
                        className={`faq-chevron ${abierto ? 'rotated' : ''}`}
                      />
                    </button>
                  </h3>
                  <div
                    id={idRespuesta}
                    role="region"
                    aria-labelledby={idPregunta}
                    hidden={!abierto}
                    className="faq-answer-pane"
                  >
                    <p>{pregunta.respuesta}</p>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="faq-footer-action">
            <Link to="/faq" className="btn-secondary">
              Ver centro de ayuda completo
            </Link>
          </div>
        </section>

      </div>
    </div>
  )
}
