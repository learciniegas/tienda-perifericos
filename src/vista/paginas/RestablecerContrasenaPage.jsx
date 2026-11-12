/**
 * VISTA: RestablecerContrasenaPage.jsx
 * Página oficial para restablecer la contraseña de acceso (Punto 14).
 * Captura la sesión de recuperación de Supabase Auth y actualiza la clave en la base de datos.
 */

import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabaseCore } from '../../config/supabaseClient'
import { IconoPeriferico } from '../componentes/PeripheralIcon'

export function PaginaRestablecerContrasena() {
  const [nuevaContrasena, setNuevaContrasena] = useState('')
  const [confirmarContrasena, setConfirmarContrasena] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(() => {
    if (typeof window === 'undefined') return ''
    const hash = window.location.hash || ''
    const search = window.location.search || ''
    const params = new URLSearchParams(hash.startsWith('#') ? hash.substring(1) : search)
    const errorDesc = params.get('error_description')
    return errorDesc ? decodeURIComponent(errorDesc.replace(/\+/g, ' ')) : ''
  })
  const [mensajeExito, setMensajeExito] = useState('')
  const [sesionRecuperacionValida, setSesionRecuperacionValida] = useState(false)
  const [verificandoEnlace, setVerificandoEnlace] = useState(() => {
    if (typeof window === 'undefined') return true
    const hash = window.location.hash || ''
    const search = window.location.search || ''
    const params = new URLSearchParams(hash.startsWith('#') ? hash.substring(1) : search)
    return !params.get('error_description')
  })
  const navigate = useNavigate()

  useEffect(() => {
    const hash = window.location.hash || ''
    const search = window.location.search || ''
    const params = new URLSearchParams(hash.startsWith('#') ? hash.substring(1) : search)
    if (params.get('error_description')) {
      return
    }

    const tieneTokenEnHash = hash.includes('access_token') || hash.includes('type=recovery') || search.includes('code=')

    // 1. Escuchar evento de recuperación de contraseña de Supabase Auth
    const { data: { subscription } } = supabaseCore.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (session && event === 'SIGNED_IN')) {
        setSesionRecuperacionValida(true)
        setVerificandoEnlace(false)
      }
    })

    // 2. Comprobar si ya existe una sesión activa derivada del enlace de correo
    supabaseCore.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSesionRecuperacionValida(true)
        setVerificandoEnlace(false)
      } else if (!tieneTokenEnHash) {
        setVerificandoEnlace(false)
      }
    }).catch(() => {
      if (!tieneTokenEnHash) {
        setVerificandoEnlace(false)
      }
    })

    // Timeout de seguridad si el token en hash tarda en procesarse
    const timeoutSeguridad = setTimeout(() => {
      setVerificandoEnlace(false)
    }, 4000)

    return () => {
      subscription?.unsubscribe()
      clearTimeout(timeoutSeguridad)
    }
  }, [])

  const manejarActualizacionContrasena = async (e) => {
    e.preventDefault()
    setError('')
    setMensajeExito('')

    if (!nuevaContrasena) {
      setError('Por favor ingresa tu nueva contraseña.')
      return
    }

    if (nuevaContrasena.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }

    if (nuevaContrasena !== confirmarContrasena) {
      setError('Las contraseñas no coinciden. Por favor verifícalas.')
      return
    }

    setCargando(true)

    try {
      // Actualizar la contraseña en Supabase Auth (fuente de verdad)
      const { error: errorActualizacion } = await supabaseCore.auth.updateUser({
        password: nuevaContrasena
      })

      if (errorActualizacion) {
        throw new Error(errorActualizacion.message || 'No fue posible actualizar la contraseña.')
      }

      setMensajeExito('¡Tu contraseña ha sido actualizada con éxito! Ahora puedes ingresar a tu cuenta.')
      setCargando(false)
      setNuevaContrasena('')
      setConfirmarContrasena('')

      setTimeout(() => {
        navigate('/login')
      }, 2500)
    } catch (err) {
      console.warn('Error al actualizar contraseña:', err)
      setError(err.message || 'El enlace de recuperación ha expirado o no es válido. Solicita uno nuevo.')
      setCargando(false)
    }
  }

  if (verificandoEnlace) {
    return (
      <div className="login-page-container">
        <div className="login-card-wrapper text-center">
          <p className="auth-form-desc">Verificando enlace de restablecimiento seguro...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="login-page-container">
      <div className="login-card-wrapper" role="region" aria-labelledby="reset-pass-title">
        
        {/* Marca de la tienda */}
        <div className="login-brand-header">
          <Link to="/" className="login-logo-link" aria-label="Ir a la página de inicio">
            <IconoPeriferico tipo="logo" size={40} className="login-brand-icon" />
            <span className="login-brand-title">PERIFÉRICOS PICHINCHA</span>
          </Link>
          <p className="login-brand-sub">Restablecimiento seguro de clave de acceso</p>
        </div>

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

        {!sesionRecuperacionValida && !mensajeExito ? (
          <div className="auth-alert auth-alert-error mt-3" role="alert">
            <span className="alert-icon" aria-hidden="true">⚠️</span>
            <div>
              <p>El enlace de recuperación no parece ser válido o ha expirado.</p>
              <Link to="/login?mode=recuperar" className="btn-secondary btn-full mt-3">
                Solicitar nuevo enlace de recuperación
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={manejarActualizacionContrasena} className="auth-form">
            <h1 id="reset-pass-title" className="auth-form-title">Crear nueva contraseña</h1>
            <p className="auth-form-desc">
              Ingresa una nueva contraseña segura para tu cuenta de cliente.
            </p>

            <div className="form-field">
              <label htmlFor="new-pass-input">
                Nueva contraseña (mínimo 6 caracteres) <span className="required-star">*</span>
              </label>
              <input
                type="password"
                id="new-pass-input"
                placeholder="Mínimo 6 caracteres"
                value={nuevaContrasena}
                onChange={(e) => setNuevaContrasena(e.target.value)}
                autoComplete="new-password"
                className="form-input"
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="confirm-pass-input">
                Confirmar nueva contraseña <span className="required-star">*</span>
              </label>
              <input
                type="password"
                id="confirm-pass-input"
                placeholder="Repite tu nueva contraseña"
                value={confirmarContrasena}
                onChange={(e) => setConfirmarContrasena(e.target.value)}
                autoComplete="new-password"
                className="form-input"
                required
              />
            </div>

            <button
              type="submit"
              className={`btn-primary btn-auth-submit ${cargando ? 'btn-loading' : ''}`}
              disabled={cargando}
            >
              {cargando ? 'Guardando nueva contraseña...' : 'Actualizar contraseña'}
            </button>

            <Link to="/login" className="btn-secondary btn-full mt-3 text-center">
              Volver al inicio de sesión
            </Link>
          </form>
        )}

      </div>
    </div>
  )
}
