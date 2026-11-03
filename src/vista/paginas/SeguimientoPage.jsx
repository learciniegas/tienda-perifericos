/**
 * VISTA: SeguimientoPage.jsx
 * Rastreo de pedidos por N# de Orden con persistencia y consulta en Supabase/local (HU-09, HU-15).
 */

import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckoutModelo } from '../../modelo/checkoutModelo'
import { IconoPeriferico } from '../componentes/PeripheralIcon'

function cargarUltimoPedidoLocal() {
  try {
    const guardado = localStorage.getItem('ultimo_pedido_generado')
    return guardado ? JSON.parse(guardado) : null
  } catch (err) {
    console.warn('Error recuperando último pedido:', err)
    return null
  }
}

export function PaginaSeguimiento() {
  const [parametrosUrl] = useSearchParams()
  const codigoUrl = parametrosUrl.get('orden') || ''

  const [pedidoConsultado, setPedidoConsultado] = useState(() => {
    if (codigoUrl) return null
    return cargarUltimoPedidoLocal()
  })
  const [numeroOrden, setNumeroOrden] = useState(() => {
    if (codigoUrl) return codigoUrl
    const ultimo = cargarUltimoPedidoLocal()
    return ultimo?.codigo || ''
  })
  const [cargando, setCargando] = useState(() => Boolean(codigoUrl))
  const [error, setError] = useState('')
  const [actualizandoEstado, setActualizandoEstado] = useState(false)
  const [notificacionEntrega, setNotificacionEntrega] = useState('')
  const [segundosRestantes, setSegundosRestantes] = useState(0)

  // Temporizador para cambio automático de estado cada 2 minutos (HU-15)
  useEffect(() => {
    if (!pedidoConsultado || pedidoConsultado.estadoActual === 'Entregado') {
      return
    }

    const intervalo = setInterval(async () => {
      const restantes = CheckoutModelo.obtenerTiempoRestanteSiguienteEstado(pedidoConsultado.fechaIso)
      setSegundosRestantes(restantes)

      // Si los segundos restantes llegan a 0 o se cumple el ciclo, consultar estado actualizado
      if (restantes <= 0) {
        const actualizado = await CheckoutModelo.consultarPedidoPorCodigo(pedidoConsultado.codigo)
        if (actualizado && actualizado.estadoActual !== pedidoConsultado.estadoActual) {
          setPedidoConsultado(actualizado)
          if (actualizado.estadoActual === 'Entregado') {
            setNotificacionEntrega(
              `✓ ¡Aviso enviado! Se despachó el correo oficial de entrega completada a ${actualizado.cliente?.correo || 'tu correo registrado'}.`
            )
          }
        }
      }
    }, 1000)

    return () => clearInterval(intervalo)
  }, [pedidoConsultado])

  const segundosEfectivos = segundosRestantes > 0
    ? segundosRestantes
    : (pedidoConsultado ? CheckoutModelo.obtenerTiempoRestanteSiguienteEstado(pedidoConsultado.fechaIso) : 0)

  const manejarCambioEstado = async (nuevoEstadoId) => {
    if (!pedidoConsultado) return
    setActualizandoEstado(true)
    setNotificacionEntrega('')

    try {
      const actualizado = await CheckoutModelo.actualizarEstadoPedido(pedidoConsultado.codigo, nuevoEstadoId)
      if (actualizado) {
        setPedidoConsultado(actualizado)
        if (Number(nuevoEstadoId) === 4) {
          setNotificacionEntrega(`✓ ¡Aviso enviado! Se despachó el correo oficial de entrega completada a ${actualizado.cliente?.correo || 'tu correo registrado'}.`)
        }
      }
    } catch (err) {
      console.warn('Error al actualizar estado del pedido:', err)
    } finally {
      setActualizandoEstado(false)
    }
  }

  // Si viene con parámetro ?orden=... en la URL, consultar asíncronamente
  useEffect(() => {
    let activo = true

    if (codigoUrl) {
      CheckoutModelo.consultarPedidoPorCodigo(codigoUrl)
        .then((pedido) => {
          if (!activo) return
          if (pedido) {
            setPedidoConsultado(pedido)
            setError('')
          } else {
            setError(`No se encontró ningún pedido con el código #${codigoUrl.trim().toUpperCase()}. Verifica el código de tu comprobante.`)
            setPedidoConsultado(null)
          }
          setCargando(false)
        })
        .catch((err) => {
          if (!activo) return
          setError('Ocurrió un error al consultar el pedido: ' + err.message)
          setPedidoConsultado(null)
          setCargando(false)
        })
    }

    return () => {
      activo = false
    }
  }, [codigoUrl])

  const manejarEnvio = async (evento) => {
    evento.preventDefault()
    if (!numeroOrden || !numeroOrden.trim()) {
      setError('Por favor ingresa un número de pedido válido (ej: ORD-123456).')
      return
    }

    setCargando(true)
    setError('')

    try {
      const pedido = await CheckoutModelo.consultarPedidoPorCodigo(numeroOrden)
      if (pedido) {
        setPedidoConsultado(pedido)
      } else {
        setError(`No se encontró ningún pedido con el código #${numeroOrden.trim().toUpperCase()}. Verifica el código de tu comprobante.`)
        setPedidoConsultado(null)
      }
    } catch (err) {
      setError('Ocurrió un error al consultar el pedido: ' + err.message)
      setPedidoConsultado(null)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="tracking-page-container">
      <div className="tracking-header-zone">
        <h1 className="catalog-main-title">Seguimiento de pedidos</h1>
        <p className="catalog-subtitle">
          Consulta en tiempo real el estado de despacho y entrega de tus periféricos en Quito y Pichincha.
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
              placeholder="Ej: ORD-948123 o 1001"
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
          <div className="loading-state" role="status">
            <div className="spinner" aria-hidden="true" />
            <p>Consultando base de datos de envíos en Pichincha...</p>
          </div>
        )}

        {pedidoConsultado && !cargando && (
          <div className="tracking-result-panel" role="region" aria-label="Detalle del pedido">
            <div className="order-summary-badge">
              <div>
                <h2>Pedido #{pedidoConsultado.codigo}</h2>
                <p>
                  Fecha: {pedidoConsultado.fecha} {pedidoConsultado.hora ? `• ${pedidoConsultado.hora}` : ''} • Destino: {pedidoConsultado.direccionEnvio?.sector || pedidoConsultado.canton || 'Quito, Pichincha'}
                </p>
                {pedidoConsultado.estadoActual !== 'Entregado' && segundosEfectivos > 0 ? (
                  <div className="tracking-timer-pill" role="status" aria-live="polite">
                    <span className="timer-pulse-dot" aria-hidden="true" />
                    <span>
                      Próxima fase en:{' '}
                      <strong>
                        {Math.floor(segundosEfectivos / 60)}:
                        {String(segundosEfectivos % 60).padStart(2, '0')}
                      </strong>{' '}
                      min (Cambio cada 2 minutos)
                    </span>
                  </div>
                ) : pedidoConsultado.estadoActual === 'Entregado' ? (
                  <div className="tracking-timer-pill delivered-pill" role="status">
                    <span>✓ Pedido entregado en destino • Correo enviado</span>
                  </div>
                ) : null}
              </div>
              <span className={`status-pill ${pedidoConsultado.estadoActual === 'Entregado' ? 'status-delivered' : 'status-in-progress'}`}>
                {pedidoConsultado.estadoActual}
              </span>
            </div>

            {/* Línea de tiempo accesible */}
            <ol className="progress-stepper" aria-label="Progreso del envío">
              {(pedidoConsultado.pasosSeguimiento || pedidoConsultado.pasos || []).map((paso, indice) => (
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

            {/* Artículos de la orden con opción de valoración (Release 3) */}
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

            {/* Control logístico de despacho y entrega */}
            <div className="status-update-control-card" role="region" aria-label="Fase de despacho y entrega">
              <div className="status-control-header">
                <span className="status-control-tag">LOGÍSTICA EN PICHINCHA</span>
                <h3 className="status-control-title">Avanzar fase de despacho</h3>
                <p className="status-control-desc">
                  Actualiza el estado de entrega del paquete. Al llegar al estado <strong>Entregado</strong>, el sistema despacha automáticamente el correo de confirmación final.
                </p>
              </div>

              <div className="status-control-buttons">
                <button
                  type="button"
                  className={`btn-step-status ${pedidoConsultado.estadoActual === 'En preparación' ? 'status-btn-active' : ''}`}
                  disabled={actualizandoEstado || pedidoConsultado.estadoActual === 'En preparación'}
                  onClick={() => manejarCambioEstado(2)}
                  aria-label="Fijar estado en preparación"
                >
                  1. En preparación
                </button>

                <button
                  type="button"
                  className={`btn-step-status ${pedidoConsultado.estadoActual.includes('En camino') ? 'status-btn-active' : ''}`}
                  disabled={actualizandoEstado || pedidoConsultado.estadoActual.includes('En camino')}
                  onClick={() => manejarCambioEstado(3)}
                  aria-label="Fijar estado en camino en Quito"
                >
                  2. En camino (Quito)
                </button>

                <button
                  type="button"
                  className={`btn-step-status btn-status-delivered ${pedidoConsultado.estadoActual === 'Entregado' ? 'status-btn-active-delivered' : ''}`}
                  disabled={actualizandoEstado || pedidoConsultado.estadoActual === 'Entregado'}
                  onClick={() => manejarCambioEstado(4)}
                  aria-label="Marcar como Entregado y despachar notificación de entrega"
                >
                  3. Marcar como Entregado
                </button>
              </div>

              {notificacionEntrega && (
                <div className="auth-alert auth-alert-success mt-3" role="status" aria-live="polite">
                  <span className="alert-icon" aria-hidden="true">✓</span>
                  <p>{notificacionEntrega}</p>
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
