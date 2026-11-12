/**
 * VISTA: ContactoPage.jsx
 * Página de Contacto y Asistencia Directa de Soporte (Release 2).
 * Formulario accesible conectado a la tabla mensajes_contacto en Supabase PostgREST.
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabaseCore } from '../../config/supabaseClient'
import { useAutenticacion } from '../../controlador/useAuth'
import { validarNombrePersona, validarCorreoElectronico } from '../../modelo/validadorModelo'

export function PaginaContacto() {
  const { usuario } = useAutenticacion()

  // Precargar nombre y correo solo si hay una sesión real activa (evitar "Invitado")
  const [nombre, setNombre] = useState(() => (usuario?.autenticado && usuario?.nombre !== 'Invitado' ? usuario.nombre : ''))
  const [correo, setCorreo] = useState(() => (usuario?.autenticado && usuario?.email ? usuario.email : ''))
  const [asunto, setAsunto] = useState('Consulta sobre un pedido')
  const [mensaje, setMensaje] = useState('')
  const [cargando, setCargando] = useState(false)
  const [mensajeExito, setMensajeExito] = useState('')
  const [error, setError] = useState('')

  const manejarEnvio = async (e) => {
    e.preventDefault()
    setError('')
    setMensajeExito('')

    // Validación conforme a checks de base de datos
    const valNombre = validarNombrePersona(nombre)
    if (!valNombre.esValido) {
      setError(valNombre.mensaje)
      return
    }

    const valCorreo = validarCorreoElectronico(correo)
    if (!valCorreo.esValido) {
      setError(valCorreo.mensaje)
      return
    }

    const asuntoLimpio = asunto.trim()
    if (asuntoLimpio.length < 3 || asuntoLimpio.length > 150) {
      setError('El asunto debe tener entre 3 y 150 caracteres.')
      return
    }

    const mensajeLimpio = mensaje.trim()
    if (mensajeLimpio.length < 10 || mensajeLimpio.length > 2000) {
      setError('El mensaje debe contener al menos 10 caracteres (máximo 2000).')
      return
    }

    setCargando(true)

    try {
      // Inserción en la tabla mensajes_contacto de Supabase Core
      const payload = {
        usuario_id: (usuario?.autenticado && usuario?.id) ? usuario.id : null,
        nombre: nombre.trim(),
        correo: correo.trim().toLowerCase(),
        asunto: asuntoLimpio,
        mensaje: mensajeLimpio
      }

      const { error: errorSupabase } = await supabaseCore
        .from('mensajes_contacto')
        .insert(payload)

      if (errorSupabase) {
        throw new Error(errorSupabase.message || 'Error al registrar tu mensaje.')
      }

      setMensajeExito('¡Tu mensaje ha sido recibido con éxito! Un especialista de soporte en Pichincha te responderá en menos de 24 horas hábiles.')
      setMensaje('')
      setCargando(false)
    } catch (err) {
      console.warn('Error en formulario de contacto:', err)
      setError(err.message || 'No se pudo enviar el mensaje. Por favor verifica tus datos e inténtalo nuevamente.')
      setCargando(false)
    }
  }

  return (
    <div className="contact-page-container">
      <div className="contact-header-zone">
        <h1 className="catalog-main-title">Contacto con Soporte</h1>
        <p className="catalog-subtitle">
          Atención personalizada para garantías, seguimiento de despachos y consultas de hardware en Pichincha.
        </p>
      </div>

      <div className="contact-layout-grid">
        
        {/* Formulario de Mensaje */}
        <section className="contact-form-section" aria-labelledby="contact-heading">
          <div className="contact-form-card">
            <h2 id="contact-heading" className="contact-card-title">Envíanos un mensaje</h2>
            <p className="contact-card-desc">
              Completa el formulario y nuestro equipo de soporte técnico se pondrá en contacto contigo.
            </p>

            {error && (
              <div className="auth-alert auth-alert-error" role="alert">
                <span className="alert-icon" aria-hidden="true">⚠️</span>
                <p>{error}</p>
              </div>
            )}

            {mensajeExito && (
              <div className="auth-alert auth-alert-success" role="status" aria-live="polite">
                <span className="alert-icon" aria-hidden="true">✓</span>
                <p>{mensajeExito}</p>
              </div>
            )}

            <form onSubmit={manejarEnvio} className="contact-form">
              <div className="form-grid-2">
                <div className="form-field">
                  <label htmlFor="contacto-nombre">
                    Nombre y Apellido <span className="required-star">*</span>
                  </label>
                  <input
                    type="text"
                    id="contacto-nombre"
                    placeholder="Ej: David Salazar"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="contacto-correo">
                    Correo electrónico de contacto <span className="required-star">*</span>
                  </label>
                  <input
                    type="email"
                    id="contacto-correo"
                    placeholder="david@correo.com"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="contacto-asunto">
                  Motivo de la consulta <span className="required-star">*</span>
                </label>
                <select
                  id="contacto-asunto"
                  value={asunto}
                  onChange={(e) => setAsunto(e.target.value)}
                  className="form-input"
                  required
                >
                  <option value="Consulta sobre un pedido">Consulta sobre estado de mi pedido</option>
                  <option value="Garantía de hardware">Reclamo o asesoría de garantía de hardware</option>
                  <option value="Cobertura y envíos en Pichincha">Consultar tiempos de entrega y cobertura</option>
                  <option value="Facturación y comprobantes">Facturación electrónica o datos fiscales</option>
                  <option value="Soporte técnico y compatibilidad">Compatibilidad de periféricos</option>
                  <option value="Otro">Otro requerimiento</option>
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="contacto-mensaje">
                  Mensaje detallado <span className="required-star">*</span>
                </label>
                <textarea
                  id="contacto-mensaje"
                  rows={5}
                  placeholder="Describe detalladamente tu inquietud, número de pedido si aplica o modelo de periférico..."
                  value={mensaje}
                  onChange={(e) => setMensaje(e.target.value)}
                  className="form-input form-textarea"
                  required
                />
              </div>

              <button
                type="submit"
                className={`btn-primary btn-contact-submit ${cargando ? 'btn-loading' : ''}`}
                disabled={cargando}
              >
                {cargando ? 'Enviando mensaje a soporte...' : 'Enviar mensaje a soporte'}
              </button>
            </form>
          </div>
        </section>

        {/* Canales Directos y Ubicación */}
        <aside className="contact-info-sidebar" aria-labelledby="heading-canales">
          <div className="contact-info-card">
            <h2 id="heading-canales" className="contact-info-title">Canales de Atención</h2>

            <div className="contact-info-item">
              <span className="contact-icon" aria-hidden="true">📍</span>
              <div>
                <strong>Centro de Operaciones Pichincha:</strong>
                <p>Av. República del Salvador N36-84 y Naciones Unidas, Quito, Ecuador.</p>
              </div>
            </div>

            <div className="contact-info-item">
              <span className="contact-icon" aria-hidden="true">📞</span>
              <div>
                <strong>Línea de Asistencia y WhatsApp:</strong>
                <p>+593 2 294 8100 / +593 99 845 1200</p>
                <span className="contact-note">Lunes a Viernes: 08:30 a 18:00</span>
              </div>
            </div>

            <div className="contact-info-item">
              <span className="contact-icon" aria-hidden="true">✉️</span>
              <div>
                <strong>Correo Oficial:</strong>
                <p>soporte@perifericosquito.com</p>
              </div>
            </div>

            <div className="contact-info-item">
              <span className="contact-icon" aria-hidden="true">🛡️</span>
              <div>
                <strong>Garantías y Cambios:</strong>
                <p>12 meses de cobertura oficial con diagnóstico directo en taller técnico de Quito.</p>
              </div>
            </div>

            <div className="contact-faq-shortcut">
              <h3>¿Preguntas rápidas?</h3>
              <p>Revisa nuestra sección de Preguntas Frecuentes sobre envíos, pagos y stock.</p>
              <Link to="/faq" className="btn-secondary btn-full">
                Ir a Centro de Ayuda / FAQ
              </Link>
            </div>
          </div>
        </aside>

      </div>
    </div>
  )
}
