/**
 * VISTA: FaqPage.jsx
 * Página de Preguntas Frecuentes (FAQ) y Centro de Soporte (HU-16).
 * Acordeón accesible por teclado enfocado en cobertura y envíos para la provincia de Pichincha.
 */

import { useState } from 'react'
import { IconoPeriferico } from '../componentes/PeripheralIcon'

const PREGUNTAS_FRECUENTES = [
  {
    id: 1,
    pregunta: '¿Cuáles son las formas de pago aceptadas?',
    respuesta: 'Aceptamos transferencias bancarias directas, tarjetas de débito y crédito a través de nuestra pasarela de pagos integrada y pago contra entrega coordinado dentro del perímetro urbano de Quito y cantones de Pichincha.'
  },
  {
    id: 2,
    pregunta: '¿Cuál es la zona de cobertura y tiempos de entrega?',
    respuesta: 'Nuestros envíos están restringidos y optimizados exclusivamente para la provincia de Pichincha (Quito, Rumiñahui, Mejía, Cayambe, Pedro Moncayo, etc.). Los tiempos habituales de despacho son de 24 a 48 horas hábiles tras la confirmación de la orden.'
  },
  {
    id: 3,
    pregunta: '¿Puedo comprar sin registrarme previamente?',
    respuesta: 'Sí. Puedes añadir cualquier periférico a tu carrito de forma libre. Al momento de proceder con la compra, podrás ingresar tus datos de contacto y la dirección exacta de entrega en Pichincha.'
  },
  {
    id: 4,
    pregunta: '¿Qué garantía tienen los periféricos adquiridos?',
    respuesta: 'Todos los productos (teclados mecánicos, ratones gamer, auriculares, webcams y alfombrillas) cuentan con 12 meses de garantía directa contra fallas de switch, sensores ópticos o conectividad.'
  },
  {
    id: 5,
    pregunta: '¿Cómo solicito mi factura electrónica con datos fiscales?',
    respuesta: 'Durante el paso de confirmación de tu pedido podrás ingresar tu Razón Social, Cédula o RUC para que nuestro sistema emita el comprobante correspondiente.'
  },
  {
    id: 6,
    pregunta: '¿Cómo se garantiza la accesibilidad WCAG 2.2 en este sitio?',
    respuesta: 'Toda la interfaz cumple con los estándares WCAG 2.2 Nivel AA y AAA: contraste de color superior a 7:1 en textos, navegación 100% operable por teclado, focos visibles de alto contraste y compatibilidad con lectores de pantalla.'
  }
]

export function PaginaPreguntasFrecuentes() {
  const [respuestasAbiertas, setRespuestasAbiertas] = useState({ 1: true, 2: true })

  const alternarRespuesta = (id) => {
    setRespuestasAbiertas(anteriores => ({
      ...anteriores,
      [id]: !anteriores[id]
    }))
  }

  return (
    <div className="faq-page-container">
      <div className="faq-header-zone">
        <h1 className="catalog-main-title">Preguntas Frecuentes (FAQ)</h1>
        <p className="catalog-subtitle">
          Información sobre pedidos, cobertura en Pichincha, garantías y accesibilidad.
        </p>
      </div>

      <div className="faq-content-wrapper">
        <div className="faq-list" role="region" aria-label="Listado de preguntas frecuentes">
          {PREGUNTAS_FRECUENTES.map((pregunta) => {
            const estaAbierta = !!respuestasAbiertas[pregunta.id]
            const idBoton = `faq-btn-${pregunta.id}`
            const idPanel = `faq-panel-${pregunta.id}`

            return (
              <div key={pregunta.id} className={`faq-card-item ${estaAbierta ? 'expanded' : ''}`}>
                <h2>
                  <button
                    type="button"
                    id={idBoton}
                    className="faq-toggle-btn"
                    onClick={() => alternarRespuesta(pregunta.id)}
                    aria-expanded={estaAbierta}
                    aria-controls={idPanel}
                  >
                    <span className="faq-btn-text">{pregunta.pregunta}</span>
                    <IconoPeriferico
                      tipo="chevron-down"
                      size={20}
                      className={`faq-arrow-icon ${estaAbierta ? 'rotated' : ''}`}
                    />
                  </button>
                </h2>
                <div
                  id={idPanel}
                  role="region"
                  aria-labelledby={idBoton}
                  hidden={!estaAbierta}
                  className="faq-body-pane"
                >
                  <p>{pregunta.respuesta}</p>
                </div>
              </div>
            )
          })}
        </div>

        <aside className="faq-help-box">
          <IconoPeriferico tipo="shield" size={40} className="help-icon" />
          <h3>¿Necesitas asistencia?</h3>
          <p>Nuestro equipo de soporte está disponible para responder cualquier inquietud sobre tus periféricos o tu entrega en Pichincha.</p>
          <a href="mailto:soporte@tiendaperifericos.ec" className="btn-secondary btn-full">
            Contactar a soporte
          </a>
        </aside>
      </div>
    </div>
  )
}
