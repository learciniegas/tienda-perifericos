/**
 * VISTA: SeguimientoPage.jsx
 * Rastreo de pedidos vinculado exclusivamente a la cuenta del usuario en Supabase TX (Punto 10).
 * Sin persistencia en localStorage, sin control manual de estados y con verificación de propiedad.
 */

import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckoutModelo } from '../../modelo/checkoutModelo'
import { useAutenticacion } from '../../controlador/useAuth'
import { IconoPeriferico } from '../componentes/PeripheralIcon'

export function PaginaSeguimiento() {
  const { usuario } = useAutenticacion()
  const [parametrosUrl] = useSearchParams()
  const codigoUrl = parametrosUrl.get('orden') || ''

  const [pedidoConsultado, setPedidoConsultado] = useState(null)
  const [numeroOrden, setNumeroOrden] = useState(codigoUrl)
  const [cargando, setCargando] = useState(() => Boolean(usuario?.autenticado && usuario?.id))
  const [error, setError] = useState('')
  const [segundosRestantes, setSegundosRestantes] = useState(0)

  // Cargar pedido por URL o el pedido más reciente del usuario autenticado
  useEffect(() => {
    let activo = true

    if (!usuario?.autenticado || !usuario?.id) {
      return
    }

    if (codigoUrl) {
      CheckoutModelo.consultarPedidoPorCodigo(codigoUrl, usuario.id)
        .then((pedido) => {
          if (!activo) return
          if (pedido) {
            setPedidoConsultado(pedido)
            setNumeroOrden(pedido.codigo)
            setError('')
          } else {
            setError(`No se encontró ningún pedido #${codigoUrl.trim().toUpperCase()} asociado a tu cuenta.`)
            setPedidoConsultado(null)
          }
          setCargando(false)
        })
        .catch((err) => {
          if (!activo) return
          setError('Error al consultar el pedido: ' + err.message)
          setPedidoConsultado(null)
          setCargando(false)
        })
    } else {
      // Cargar el pedido más reciente desde la base de datos Supabase TX
      CheckoutModelo.obtenerHistorialPedidos(usuario.id)
        .then((historial) => {
          if (!activo) return
          if (historial && historial.length > 0) {
            setPedidoConsultado(historial[0])
            setNumeroOrden(historial[0].codigo)
          }
          setCargando(false)
        })
        .catch(() => {
          if (!activo) return
          setCargando(false)
        })
    }

    return () => {
      activo = false
    }
  }, [codigoUrl, usuario])

  // Temporizador para actualización visual de fases automáticas cada 2 minutos
  useEffect(() => {
    if (!pedidoConsultado || pedidoConsultado.estadoActual === 'Entregado') {
      return
    }

    const intervalo = setInterval(async () => {
      const restantes = CheckoutModelo.obtenerTiempoRestanteSiguienteEstado(pedidoConsultado.fechaIso)
      setSegundosRestantes(restantes)

      if (restantes <= 0 && usuario?.id) {
        const actualizado = await CheckoutModelo.consultarPedidoPorCodigo(pedidoConsultado.codigo, usuario.id)
        if (actualizado && actualizado.estadoActual !== pedidoConsultado.estadoActual) {
          setPedidoConsultado(actualizado)
        }
      }
    }, 1000)

    return () => clearInterval(intervalo)
  }, [pedidoConsultado, usuario])

  const segundosEfectivos = segundosRestantes > 0
    ? segundosRestantes
    : (pedidoConsultado ? CheckoutModelo.obtenerTiempoRestanteSiguienteEstado(pedidoConsultado.fechaIso) : 0)

  // Consulta manual mediante el formulario
  const manejarEnvio = async (evento) => {
    evento.preventDefault()
    if (!numeroOrden || !numeroOrden.trim()) {
      setError('Por favor ingresa un número de pedido (ej: ORD-123456).')
      return
    }

    setCargando(true)
    setError('')

    try {
      const pedido = await CheckoutModelo.consultarPedidoPorCodigo(numeroOrden, usuario.id)
      if (pedido) {
        setPedidoConsultado(pedido)
      } else {
        setError(`No se encontró ningún pedido con el código #${numeroOrden.trim().toUpperCase()} en tu cuenta.`)
        setPedidoConsultado(null)
      }
    } catch (err) {
      setError('Ocurrió un error al consultar el pedido: ' + err.message)
      setPedidoConsultado(null)
    } finally {
      setCargando(false)
    }
  }

  // Pantalla para usuarios no autenticados (Protección de privacidad de pedidos)
  if (!usuario?.autenticado) {
    return (
      <div className="tracking-page-container">
        <div className="tracking-header-zone">
          <h1 className="catalog-main-title">Seguimiento de pedidos</h1>
          <p className="catalog-subtitle">
            Consulta en tiempo real el estado de despacho y entrega de tus periféricos en Pichincha.
          </p>
        </div>

        <div className="empty-cart-card">
          <IconoPeriferico tipo="truck" size={64} className="empty-cart-icon" />
          <h2>Inicia sesión para ver tus pedidos</h2>
          <p>
            Por seguridad, los pedidos se asocian exclusivamente a la cuenta del comprador en nuestra base de datos.
          </p>
          <Link to="/login?redirect=/seguimiento" className="btn-primary mt-3">
            Iniciar sesión
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="tracking-page-container">
      <div className="tracking-header-zone">
        <h1 className="catalog-main-title">Seguimiento de pedidos</h1>
        <p className="catalog-subtitle">
          Consulta en tiempo real el estado de despacho y entrega de tus compras en Quito y Pichincha.
        </p>
      </div>

      <div className="tracking-box-card">
        <form onSubmit={manejarEnvio} className="tracking-form" role="search">
          <label htmlFor="input-order-code" className="tracking-label">
            Número de pedido o comprobante
          </label>
          <div className="tracking-input-wrapper">
            <input
              type="text"
              id="input-order-code"
              placeholder="Ej: ORD-948123"
              value={numeroOrden}
              onChange={(e) => setNumeroOrden(e.target.value)}
              className="tracking-input font-mono"
            />
            <button
              type="submit"
              className="btn-primary tracking-btn"
              disabled={cargando}
            >
              {cargando ? 'Buscando...' : 'Consultar estado'}
            </button>
          </div>
          {error && <p className="error-text" role="alert">{error}</p>}
        </form>

        {cargando && (
          <div className="tracking-loading-state" role="status">
            <span className="spinner-dot" aria-hidden="true" />
            <p>Consultando base de datos transaccional...</p>
          </div>
        )}

        {!cargando && !pedidoConsultado && !error && (
          <div className="tracking-empty-callout">
            <IconoPeriferico tipo="package" size={48} className="tracking-empty-icon" />
            <h3>Aún no has registrado ningún pedido</h3>
            <p>Cuando realices tu compra en Pichincha, aquí podrás seguir el estado de tu despacho en tiempo real.</p>
            <Link to="/catalogo" className="btn-primary mt-2">
              Explorar Catálogo
            </Link>
          </div>
        )}

        {!cargando && pedidoConsultado && (
          <div className="order-result-card" aria-live="polite">
            
            {/* Cabecera del pedido */}
            <div className="order-result-header">
              <div>
                <span className="tracking-code-pill">ORDEN #{pedidoConsultado.codigo}</span>
                <h2 className="order-result-title">Envío a {pedidoConsultado.direccionEnvio?.ciudad || 'Pichincha'}</h2>
                <p className="order-result-date">
                  Registrado el {pedidoConsultado.fecha} a las {pedidoConsultado.hora}
                </p>
                {pedidoConsultado.estadoActual !== 'Entregado' && segundosEfectivos > 0 ? (
                  <div className="tracking-timer-pill" role="status">
                    <span className="timer-icon" aria-hidden="true">⏱️</span>
                    <span>
                      Próxima fase en:{' '}
                      <strong>
                        {Math.floor(segundosEfectivos / 60)}:
                        {String(segundosEfectivos % 60).padStart(2, '0')}
                      </strong>{' '}
                      min (Fases logísticas de 2 minutos)
                    </span>
                  </div>
                ) : pedidoConsultado.estadoActual === 'Entregado' ? (
                  <div className="tracking-timer-pill delivered-pill" role="status">
                    <span>✓ Pedido entregado en domicilio</span>
                  </div>
                ) : null}
              </div>
              <span className={`status-pill ${pedidoConsultado.estadoActual === 'Entregado' ? 'status-delivered' : 'status-in-progress'}`}>
                {pedidoConsultado.estadoActual}
              </span>
            </div>

            {/* Línea de tiempo de progreso */}
            <ol className="progress-stepper" aria-label="Progreso del envío">
              {(pedidoConsultado.pasosSeguimiento || []).map((paso, indice) => (
                <li
                  key={indice}
                  className={`step-item ${paso.completado ? 'is-completed' : ''} ${paso.activo ? 'is-active' : ''}`}
                >
                  <div className="step-circle" aria-hidden="true">
                    {paso.completado ? <IconoPeriferico tipo="check" size={16} /> : indice + 1}
                  </div>
                  <div className="step-details">
                    <strong className="step-title">{paso.nombre}</strong>
                    <span className="step-time">{paso.fecha}</span>
                  </div>
                </li>
              ))}
            </ol>

            {/* Artículos de la orden con opción de reseñar si ya fue entregado */}
            <div className="order-items-preview">
              <h3>Artículos en despacho</h3>
              <ul className="order-tracking-items-list">
                {(pedidoConsultado.articulos || []).map((articulo, indice) => (
                  <li key={indice} className="order-tracking-item-row">
                    <div className="tracking-item-info">
                      <span className="tracking-item-title">{articulo.cantidad}x {articulo.nombre}</span>
                      <strong>${(articulo.precio * articulo.cantidad).toFixed(2)}</strong>
                    </div>
                    {articulo.id && (
                      <Link
                        to={`/producto/${articulo.id}#resenas`}
                        className="btn-secondary btn-rate-tracking"
                        aria-label={`Calificar y opinar sobre ${articulo.nombre}`}
                      >
                        ★ Opinar sobre este periférico
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
              {pedidoConsultado.totales && (
                <div className="order-total-callout">
                  <span>Total de la orden:</span>
                  <strong>${Number(pedidoConsultado.totales.total).toFixed(2)}</strong>
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
