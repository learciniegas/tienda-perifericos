/**
 * VISTA: LandingPage.jsx
 * Página principal estilo Amazon para el e-commerce de periféricos.
 * Cumple con arquitectura MVS, diseño consistente con Pichincha como zona de despacho y accesibilidad universal.
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCatalogo } from '../../controlador/useCatalogo'
import { HeroBanner } from '../componentes/HeroBanner'
import { TarjetasDestacadas } from '../componentes/AmazonFeatureCards'
import { TarjetaProducto } from '../componentes/ProductCard'
import { BeneficiosCompra } from '../componentes/TrustBadges'
import { IconoPeriferico } from '../componentes/PeripheralIcon'

export function PaginaInicio() {
  const { productos, cargando, error } = useCatalogo({ limite: 6 })
  const [faqAbierto, setFaqAbierto] = useState(null)

  const alternarPregunta = (indice) => {
    setFaqAbierto(anterior => (anterior === indice ? null : indice))
  }

  // Preguntas frecuentes clave para la landing (HU-16)
  const preguntasFrecuentes = [
    {
      pregunta: '¿Cómo realizar un pedido en la plataforma?',
      respuesta: 'Puedes explorar nuestro catálogo y añadir cualquier periférico a tu carrito sin necesidad de iniciar sesión. Al proceder al pago, podrás registrarte o autenticarte, ingresar tus datos de facturación y tu dirección de entrega en la provincia de Pichincha.'
    },
    {
      pregunta: '¿Cuáles son los tiempos de entrega en Pichincha?',
      respuesta: 'Nuestros envíos se gestionan de forma directa en Quito, los valles y todos los cantones de la provincia de Pichincha, con tiempos de entrega de 24 a 48 horas hábiles.'
    },
    {
      pregunta: '¿Cómo puedo rastrear mi pedido una vez completada la compra?',
      respuesta: 'Al finalizar tu compra se te generará un código único de orden (ej. #ORD-1001). Con este código puedes ingresar a la sección de "Seguimiento" en el menú superior para verificar el estado de preparación y despacho de tus periféricos.'
    }
  ]

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
              Modelos disponibles para entrega inmediata en la provincia de Pichincha.
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

        {/* 4. Banner de Ofertas */}
        <section className="deals-banner-section" aria-labelledby="deals-heading">
          <div className="deals-banner-card">
            <div className="deals-content">
              <span className="deal-tag">Oferta del Día</span>
              <h2 id="deals-heading" className="deal-title">
                Hasta un 25% de descuento en periféricos seleccionados
              </h2>
              <p className="deal-text">
                Marcas líderes: Logitech, Corsair, Razer y Redragon con entrega prioritaria en Pichincha.
              </p>
              <Link to="/catalogo" className="btn-primary deal-cta">
                Ver periféricos en oferta
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

        {/* 5. Franja de Garantías y Cobertura */}
        <BeneficiosCompra />

        {/* 6. Preguntas Frecuentes */}
        <section className="landing-faq-section" aria-labelledby="faq-landing-heading">
          <div className="section-header-block">
            <h2 id="faq-landing-heading" className="catalog-main-title">
              Preguntas Frecuentes
            </h2>
            <p className="catalog-subtitle">
              Información sobre compras, envíos en Pichincha y garantías de hardware.
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
