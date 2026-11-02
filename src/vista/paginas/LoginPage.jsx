/**
 * VISTA: LoginPage.jsx
 * Pasarela de acceso y registro para compradores (HU-08, HU-09, HU-10).
 * Soporta inicio de sesión con Supabase Auth, registro conservando el carrito intacto,
 * recuperación de contraseña (Release 1) y redirección al Checkout.
 */

import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAutenticacion } from '../../controlador/useAuth'
import { IconoPeriferico } from '../componentes/PeripheralIcon'

export function PaginaLogin() {
  const [parametrosUrl] = useSearchParams()
  const destinoRedireccion = parametrosUrl.get('redirect') || '/catalogo'
  const navigate = useNavigate()

  const { iniciarSesion, registrarse, recuperarContrasena } = useAutenticacion()

  // Modo: 'login' | 'registro' | 'recuperar'
  const [modo, setModo] = useState('login')

  // Campos de formulario
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [nombreCompleto, setNombreCompleto] = useState('')
  const [recordarSesion, setRecordarSesion] = useState(true)

  // Estados de proceso y feedback
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [mensajeExito, setMensajeExito] = useState('')

  // Manejador de Inicio de Sesión (HU-09)
  const manejarInicioSesion = async (e) => {
    e.preventDefault()
    setError('')
    setMensajeExito('')

    if (!correo.trim()) {
      setError('Por favor ingresa tu correo electrónico.')
      return
    }
    if (!contrasena) {
      setError('Por favor ingresa tu contraseña.')
      return
    }

    setCargando(true)

    try {
      await iniciarSesion(correo, contrasena)
      setMensajeExito('¡Sesión iniciada con éxito! Redirigiendo...')
      setTimeout(() => {
        navigate(destinoRedireccion)
      }, 700)
    } catch (err) {
      setError(err.message || 'No fue posible iniciar sesión. Verifica tus credenciales.')
      setCargando(false)
    }
  }

  // Manejador de Registro de Cuenta (HU-10)
  const manejarRegistro = async (e) => {
    e.preventDefault()
    setError('')
    setMensajeExito('')

    if (!nombreCompleto.trim()) {
      setError('Por favor ingresa tu nombre y apellido completos.')
      return
    }
    if (!correo.trim() || !correo.includes('@')) {
      setError('Por favor ingresa un correo electrónico válido.')
      return
    }
    if (contrasena.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }

    setCargando(true)

    try {
      await registrarse(correo, contrasena, nombreCompleto)
      setMensajeExito('¡Cuenta creada con éxito! Tu carrito se encuentra activo.')
      setTimeout(() => {
        navigate(destinoRedireccion)
      }, 900)
    } catch (err) {
      setError(err.message || 'No se pudo crear la cuenta. Intenta con otro correo.')
      setCargando(false)
    }
  }

  // Manejador de Recuperación de Contraseña (Release 1)
  const manejarRecuperacion = async (e) => {
    e.preventDefault()
    setError('')
    setMensajeExito('')

    if (!correo.trim()) {
      setError('Ingresa tu correo electrónico para recibir el enlace.')
      return
    }

    setCargando(true)

    try {
      const resp = await recuperarContrasena(correo)
      setMensajeExito(resp.mensaje || 'Se ha enviado el enlace a tu correo.')
      setCargando(false)
    } catch (err) {
      setError(err.message || 'No se pudo enviar el correo de recuperación.')
      setCargando(false)
    }
  }

  // Autocompletar credenciales de demostración en Quito
  const autocompletarDemo = () => {
    setCorreo('luis@ejemplo.com')
    setContrasena('Perifericos2026!')
    setError('')
  }

  return (
    <div className="login-page-container">
      <div className="login-card-wrapper" role="region" aria-labelledby="auth-main-heading">
        
        {/* Marca de la tienda */}
        <div className="login-brand-header">
          <Link to="/" className="login-logo-link" aria-label="Ir a la página de inicio">
            <IconoPeriferico tipo="logo" size={40} className="login-brand-icon" />
            <span className="login-brand-title">PERIFÉRICOS PICHINCHA</span>
          </Link>
          <p className="login-brand-sub">Tu setup profesional con envíos garantizados en Quito</p>
        </div>

        {/* Pestañas de Selección: Iniciar Sesión / Crear Cuenta */}
        <div className="auth-tab-group" role="tablist" aria-label="Opciones de autenticación">
          <button
            type="button"
            role="tab"
            aria-selected={modo === 'login'}
            id="tab-login"
            className={`auth-tab-btn ${modo === 'login' ? 'active' : ''}`}
            onClick={() => {
              setModo('login')
              setError('')
              setMensajeExito('')
            }}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={modo === 'registro'}
            id="tab-registro"
            className={`auth-tab-btn ${modo === 'registro' ? 'active' : ''}`}
            onClick={() => {
              setModo('registro')
              setError('')
              setMensajeExito('')
            }}
          >
            Crear Cuenta
          </button>
        </div>

        {/* Notificación si viene redirigido del carrito hacia el checkout */}
        {destinoRedireccion === '/checkout' && (
          <div className="cart-preserved-notice" role="status">
            <span aria-hidden="true">🛒</span>
            <span>Tus productos seleccionados en el carrito están seguros y listos para facturar.</span>
          </div>
        )}

        {/* Alertas de error y éxito accesibles */}
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

        {/* ========================================================
            FORMULARIO 1: INICIO DE SESIÓN (HU-09)
            ======================================================== */}
        {modo === 'login' && (
          <form onSubmit={manejarInicioSesion} className="auth-form" aria-labelledby="tab-login">
            <h1 id="auth-main-heading" className="auth-form-title">Ingresar a mi cuenta</h1>

            <div className="form-field">
              <label htmlFor="login-email">
                Correo electrónico <span className="required-star">*</span>
              </label>
              <input
                type="email"
                id="login-email"
                placeholder="ejemplo@correo.com"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                autoComplete="email"
                className="form-input"
                required
              />
            </div>

            <div className="form-field">
              <div className="label-with-aside">
                <label htmlFor="login-pass">
                  Contraseña <span className="required-star">*</span>
                </label>
                <button
                  type="button"
                  className="btn-forgot-password"
                  onClick={() => {
                    setModo('recuperar')
                    setError('')
                    setMensajeExito('')
                  }}
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <input
                type="password"
                id="login-pass"
                placeholder="••••••••"
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                autoComplete="current-password"
                className="form-input"
                required
              />
            </div>

            <div className="form-checkbox-row">
              <label className="checkbox-inline-label">
                <input
                  type="checkbox"
                  checked={recordarSesion}
                  onChange={(e) => setRecordarSesion(e.target.checked)}
                  className="cart-checkbox"
                />
                <span>Mantener mi sesión iniciada en este dispositivo</span>
              </label>
            </div>

            <button
              type="submit"
              className={`btn-primary btn-auth-submit ${cargando ? 'btn-loading' : ''}`}
              disabled={cargando}
            >
              {cargando ? 'Validando credenciales...' : 'Iniciar sesión y continuar'}
            </button>

            {/* Asistente para autocompletar credenciales en Pichincha */}
            <div className="auth-demo-box">
              <div className="demo-box-content">
                <strong>¿Deseas probar con el usuario de demostración?</strong>
                <p>Luis Morales (luis@ejemplo.com)</p>
              </div>
              <button
                type="button"
                className="btn-secondary btn-fill-demo"
                onClick={autocompletarDemo}
              >
                Cargar credenciales
              </button>
            </div>
          </form>
        )}

        {/* ========================================================
            FORMULARIO 2: REGISTRO SI NO HAY CUENTA (HU-10)
            ======================================================== */}
        {modo === 'registro' && (
          <form onSubmit={manejarRegistro} className="auth-form" aria-labelledby="tab-registro">
            <h1 id="auth-main-heading" className="auth-form-title">Crear una cuenta nueva</h1>
            <p className="auth-form-desc">
              Regístrate para guardar tus direcciones en Pichincha, vincular tu facturación electrónica y rastrear pedidos.
            </p>

            <div className="form-field">
              <label htmlFor="reg-nombre">
                Nombres y Apellidos completos <span className="required-star">*</span>
              </label>
              <input
                type="text"
                id="reg-nombre"
                placeholder="Ej: Carlos Pérez Andrade"
                value={nombreCompleto}
                onChange={(e) => setNombreCompleto(e.target.value)}
                autoComplete="name"
                className="form-input"
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="reg-email">
                Correo electrónico <span className="required-star">*</span>
              </label>
              <input
                type="email"
                id="reg-email"
                placeholder="carlos@ejemplo.com"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                autoComplete="email"
                className="form-input"
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="reg-pass">
                Contraseña segura (mínimo 6 caracteres) <span className="required-star">*</span>
              </label>
              <input
                type="password"
                id="reg-pass"
                placeholder="Mínimo 6 caracteres"
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
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
              {cargando ? 'Creando cuenta...' : 'Crear cuenta y continuar al checkout'}
            </button>

            <p className="auth-terms-notice">
              Al crear una cuenta aceptas nuestras políticas de privacidad y condiciones de servicio en la provincia de Pichincha.
            </p>
          </form>
        )}

        {/* ========================================================
            FORMULARIO 3: RECUPERACIÓN DE CONTRASEÑA (Release 1)
            ======================================================== */}
        {modo === 'recuperar' && (
          <form onSubmit={manejarRecuperacion} className="auth-form">
            <h1 id="auth-main-heading" className="auth-form-title">Recuperar contraseña</h1>
            <p className="auth-form-desc">
              Ingresa el correo electrónico asociado a tu cuenta para enviarte un enlace de restablecimiento seguro.
            </p>

            <div className="form-field">
              <label htmlFor="rec-email">
                Correo registrado <span className="required-star">*</span>
              </label>
              <input
                type="email"
                id="rec-email"
                placeholder="ejemplo@correo.com"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                className="form-input"
                required
              />
            </div>

            <button
              type="submit"
              className={`btn-primary btn-auth-submit ${cargando ? 'btn-loading' : ''}`}
              disabled={cargando}
            >
              {cargando ? 'Enviando enlace...' : 'Enviar enlace de recuperación'}
            </button>

            <button
              type="button"
              className="btn-secondary btn-full mt-2"
              onClick={() => {
                setModo('login')
                setError('')
                setMensajeExito('')
              }}
            >
              ← Volver al inicio de sesión
            </button>
          </form>
        )}

      </div>
    </div>
  )
}
