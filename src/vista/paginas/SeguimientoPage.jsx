/**
 * VISTA: SeguimientoPage.jsx
 * Rastreo de pedidos por N# Orden en la provincia de Pichincha (HU-15).
 */

import { useState } from 'react'
import { IconoPeriferico } from '../componentes/PeripheralIcon'

function cargarPedidoInicial() {
  try {
    const guardado = localStorage.getItem('ultimo_pedido_generado')
    if (guardado) {
      const parsed = JSON.parse(guardado)
      return {
        ...parsed,
        pasos: [
          { nombre: 'Pago Confirmado', completado: true, fecha: 'Hoy' },
          { nombre: 'En preparación', completado: true, activo: true, fecha: 'En almacén' },
          { nombre: 'En ruta a Pichincha', completado: false, fecha: 'Estimado 24h' },
          { nombre: 'Entregado', completado: false, fecha: 'En domicilio' }
        ]
      }
    }
  } catch (error) {
    console.warn('No se pudo recuperar el pedido guardado:', error)
    return null
  }
  return null
}

export function PaginaSeguimiento() {
  const [pedidoConsultado, setPedidoConsultado] = useState(cargarPedidoInicial)
  const [numeroOrden, setNumeroOrden] = useState(() => pedidoConsultado?.codigo || '')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  const consultarPedido = (evento) => {
    evento.preventDefault()
    if (!numeroOrden.trim()) {
      setError('Por favor ingresa un número de pedido válido.')
      return
    }

    setCargando(true)
    setError('')

    // Simula una consulta mientras el seguimiento se conecta a un servicio de pedidos.
    setTimeout(() => {
      setCargando(false)
      const codigoBuscado = numeroOrden.trim().toUpperCase().replace('#', '')
      
      setPedidoConsultado({
        codigo: codigoBuscado,
        estadoActual: 'En preparación',
        fecha: new Date().toLocaleDateString('es-EC'),
        canton: 'Quito, Pichincha',
        pasos: [
          { nombre: 'Pago Confirmado', completado: true, fecha: 'Hoy, 10:30 AM' },
          { nombre: 'En preparación', completado: true, activo: true, fecha: 'Hoy, 11:15 AM' },
          { nombre: 'En ruta a Pichincha', completado: false, fecha: 'Próximas 24 hrs' },
          { nombre: 'Entregado', completado: false, fecha: 'Estimado en destino' }
        ],
        articulos: [
          { nombre: 'Logitech G502 HERO', cantidad: 1, precio: 59.99 },
          { nombre: 'Corsair K70 RGB MK.2', cantidad: 1, precio: 139.00 }
        ]
      })
    }, 400)
  }

  return (
    <div className="tracking-page-container">
      <div className="tracking-header-zone">
        <h1 className="catalog-main-title">Seguimiento de pedidos</h1>
        <p className="catalog-subtitle">
          Consulta el estado de despacho de tus periféricos en la provincia de Pichincha.
        </p>
      </div>

      <div className="tracking-box-card">
        <form onSubmit={consultarPedido} className="tracking-form" role="search">
          <label htmlFor="input-order-code" className="tracking-label">
            Número de pedido
          </label>
          <div className="tracking-input-wrapper">
            <input
              type="text"
              id="input-order-code"
              placeholder="Ej: ORD-8941 o 1001"
              value={numeroOrden}
              onChange={(e) => setNumeroOrden(e.target.value)}
              className="tracking-input"
            />
            <button type="submit" className="btn-primary tracking-btn">
              Consultar estado
            </button>
          </div>
          {error && <p className="error-text" role="alert">{error}</p>}
        </form>

        {cargando && (
          <div className="loading-state" role="status">
            <div className="spinner" aria-hidden="true" />
            <p>Buscando orden en el sistema de envíos...</p>
          </div>
        )}

        {pedidoConsultado && !cargando && (
          <div className="tracking-result-panel" role="region" aria-label="Detalle del pedido">
            <div className="order-summary-badge">
              <div>
                <h2>Pedido #{pedidoConsultado.codigo}</h2>
                <p>Fecha: {pedidoConsultado.fecha} • Destino: {pedidoConsultado.canton || 'Pichincha'}</p>
              </div>
              <span className="status-pill status-in-progress">
                {pedidoConsultado.estadoActual}
              </span>
            </div>

            {/* Línea de tiempo accesible */}
            <ol className="progress-stepper" aria-label="Progreso del envío">
              {pedidoConsultado.pasos.map((paso, indice) => (
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
                {pedidoConsultado.articulos.map((articulo, indice) => (
                  <li key={indice}>
                    <span>{articulo.cantidad}x {articulo.nombre}</span>
                    <strong>${(articulo.precio * articulo.cantidad).toFixed(2)}</strong>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
