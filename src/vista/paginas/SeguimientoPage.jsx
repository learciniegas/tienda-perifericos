/**
 * VISTA: SeguimientoPage.jsx
 * Rastreo de pedidos por N# de Orden con persistencia y consulta en Supabase/local (HU-09, HU-15).
 */

import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
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
              </div>
              <span className="status-pill status-in-progress">
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

            {/* Artículos de la orden */}
            <div className="order-items-preview">
              <h3>Artículos en despacho</h3>
              <ul>
                {(pedidoConsultado.articulos || []).map((articulo, indice) => (
                  <li key={indice}>
                    <span>{articulo.cantidad}x {articulo.nombre}</span>
                    <strong>${(articulo.precio * articulo.cantidad).toFixed(2)}</strong>
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

            {/* Notificación oficial por correo de estados (Release 2) */}
            <div className="order-email-notification-card">
              <div className="email-notif-header">
                <span className="email-icon" aria-hidden="true">📧</span>
                <div>
                  <strong>Aviso oficial por correo electrónico (Notificación de Estado):</strong>
                  <p>
                    Se ha enviado una notificación a{' '}
                    <strong>{pedidoConsultado.cliente?.correo || 'tu correo registrado'}</strong> con la actualización en tiempo real de tu pedido.
                  </p>
                </div>
              </div>
              <div className="email-preview-box">
                <span className="email-preview-tag">NOTIFICACIÓN AUTOMÁTICA ENVIADA</span>
                <p className="email-preview-text">
                  Estimado/a <strong>{pedidoConsultado.cliente?.nombre || 'Cliente'}</strong>: Te informamos que tu pedido{' '}
                  <strong>#{pedidoConsultado.codigo}</strong> se encuentra en estado{' '}
                  <span className="email-status-highlight">"{pedidoConsultado.estadoActual}"</span> con destino a{' '}
                  <strong>{pedidoConsultado.direccionEnvio?.sector || 'Pichincha, Ecuador'}</strong>.
                  {pedidoConsultado.estadoActual === 'Entregado'
                    ? ' Tu paquete ha sido entregado en tu domicilio. ¡Gracias por confiar en Periféricos Pichincha!'
                    : ' Nuestro centro de distribución en Quito continúa con la preparación y despacho.'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
