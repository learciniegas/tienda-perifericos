/**
 * VISTA: FaqPage.jsx
 * Página de Preguntas Frecuentes (FAQ) y Centro de Soporte (HU-16).
 * Lee las preguntas directamente de la base de datos (Core, tabla preguntas_frecuentes).
 */

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { obtenerPreguntasFrecuentes } from '../../modelo/catalogoModelo'
import { IconoPeriferico } from '../componentes/PeripheralIcon'

export function PaginaPreguntasFrecuentes() {
  const [preguntas, setPreguntas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [respuestasAbiertas, setRespuestasAbiertas] = useState({ 1: true, 2: true })

  useEffect(() => {
    let activo = true
    obtenerPreguntasFrecuentes()
      .then((datos) => {
        if (!activo) return
        setPreguntas(datos)
        setCargando(false)
      })
      .catch((err) => {
        if (!activo) return
        setError(err.message || 'Error al cargar preguntas frecuentes.')
        setCargando(false)
      })

    return () => {
      activo = false
    }
  }, [])

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
          Información sobre pedidos, cobertura en Pichincha y garantías.
        </p>
      </div>

      <div className="faq-content-wrapper">
        <div className="faq-list" role="region" aria-label="Listado de preguntas frecuentes">
          {cargando ? (
            <div className="loading-state" role="status">
              <div className="spinner" aria-hidden="true" />
              <p>Cargando preguntas frecuentes...</p>
            </div>
          ) : error ? (
            <div className="error-state" role="alert">
              <p>{error}</p>
            </div>
          ) : preguntas.length === 0 ? (
            <p>No hay preguntas frecuentes disponibles en este momento.</p>
          ) : (
            preguntas.map((pregunta) => {
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
            })
          )}
        </div>

        <aside className="faq-help-box">
          <IconoPeriferico tipo="shield" size={40} className="help-icon" />
          <h3>¿Necesitas asistencia?</h3>
          <p>Nuestro equipo de soporte está disponible para responder cualquier inquietud sobre tus periféricos o tu entrega en Pichincha.</p>
          <Link to="/contacto" className="btn-secondary btn-full">
            Contactar a soporte
          </Link>
        </aside>
      </div>
    </div>
  )
}
