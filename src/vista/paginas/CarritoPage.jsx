/**
 * VISTA: CarritoPage.jsx
 * Gestión del carrito de compras y proceso de checkout transaccional para Pichincha.
 * Cumple con HU-07, HU-08, HU-11, HU-12, HU-13, HU-14.
 */

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCarrito } from '../../controlador/useCarrito'
import { useAutenticacion } from '../../controlador/useAuth'
import { IconoPeriferico } from '../componentes/PeripheralIcon'

export function PaginaCarrito() {
  const {
    articulos,
    cantidadTotal,
    totales,
    actualizarCantidad,
    eliminarDelCarrito,
    vaciarCarrito
  } = useCarrito()
  const { usuario } = useAutenticacion()
  const navigate = useNavigate()

  // Estado del flujo de compra
  const [modalCheckoutAbierto, setModalCheckoutAbierto] = useState(false)
  const [ordenGenerada, setOrdenGenerada] = useState(null)

  // Formulario de checkout
  const [datosFormulario, setDatosFormulario] = useState({
    nombreCompleto: usuario?.nombre || 'Luis Morales',
    identificacion: '1723456789',
    telefono: '0991234567',
    canton: 'Quito',
    parroquia: '',
    callePrincipal: '',
    numeracion: '',
    referencia: ''
  })

  const cantonesPichincha = [
    'Quito (Distrito Metropolitano)',
    'Rumiñahui (Sangolquí)',
    'Mejía (Machachi)',
    'Cayambe',
    'Pedro Moncayo (Tabacundo)',
    'San Miguel de los Bancos',
    'Pedro Vicente Maldonado',
    'Puerto Quito'
  ]

  const actualizarCampoFormulario = (evento) => {
    const { name: nombreCampo, value: valorCampo } = evento.target
    setDatosFormulario(anterior => ({ ...anterior, [nombreCampo]: valorCampo }))
  }

  const confirmarPedido = (evento) => {
    evento.preventDefault()
    // El código permite identificar y consultar el pedido desde la página de seguimiento.
    const codigoOrden = 'ORD-' + Math.floor(1000 + Math.random() * 9000)
    
    // Guardar orden local para consulta de seguimiento
    const nuevoPedido = {
      codigo: codigoOrden,
      fecha: new Date().toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }),
      estadoActual: 'En preparación',
      cliente: datosFormulario.nombreCompleto,
      canton: datosFormulario.canton,
      direccion: `${datosFormulario.callePrincipal} ${datosFormulario.numeracion}`,
      total: totales.total,
      articulos: [...articulos]
    }

    try {
      localStorage.setItem('ultimo_pedido_generado', JSON.stringify(nuevoPedido))
    } catch (error) {
      console.warn('No se pudo guardar localmente el último pedido:', error)
    }

    setOrdenGenerada(nuevoPedido)
    vaciarCarrito()
  }

  return (
    <div className="cart-page-container">
      <div className="cart-header-zone">
        <h1 className="catalog-main-title">Carrito de compras</h1>
        <p className="catalog-subtitle">
          Revisa tus artículos antes de confirmar tu entrega en la provincia de Pichincha.
        </p>
      </div>

      {articulos.length === 0 && !ordenGenerada ? (
        <div className="empty-cart-card">
          <IconoPeriferico tipo="cart" size={64} className="empty-cart-icon" />
          <h2>Tu carrito está vacío</h2>
          <p>Explora nuestro catálogo de teclados, ratones, auriculares y accesorios para equipar tu setup.</p>
          <Link to="/catalogo" className="btn-primary">
            Explorar catálogo de periféricos
          </Link>
        </div>
      ) : ordenGenerada ? (
        <div className="order-success-card" role="region" aria-label="Confirmación de compra">
          <div className="success-icon-badge" aria-hidden="true">✓</div>
          <h2>¡Pedido confirmado con éxito!</h2>
          <p className="order-code-display">
            Código de Pedido: <strong>#{ordenGenerada.codigo}</strong>
          </p>
          <p className="success-description">
            Hemos recibido tu orden para entrega en <strong>{ordenGenerada.canton}</strong>. Tus periféricos se encuentran en preparación y serán despachados en las próximas 24 a 48 horas.
          </p>
          <div className="success-actions">
            <button
              type="button"
              className="btn-primary"
              onClick={() => navigate('/seguimiento')}
            >
              Rastrear mi pedido ahora
            </button>
            <Link to="/catalogo" className="btn-secondary">
              Continuar comprando
            </Link>
          </div>
        </div>
      ) : (
        <div className="cart-layout-grid">
          
          {/* Lista de productos en el carrito */}
          <div className="cart-items-section">
            <div className="cart-table-header">
              <span>Producto</span>
              <span>Precio</span>
              <span>Cantidad</span>
              <span>Subtotal</span>
            </div>

            <ul className="cart-items-list" aria-label="Lista de artículos en el carrito">
              {articulos.map((articulo) => (
                <li key={articulo.id} className="cart-item-row">
                  <div className="item-info-col">
                    <div className="item-thumbnail">
                      <IconoPeriferico tipo={articulo.categoria || 'keyboard'} size={36} />
                    </div>
                    <div>
                      <h3 className="item-name">{articulo.nombre}</h3>
                      <span className="item-cat">{articulo.categoria}</span>
                      <button
                        type="button"
                        className="btn-link-remove"
                        onClick={() => eliminarDelCarrito(articulo.id, articulo.nombre)}
                        aria-label={`Eliminar ${articulo.nombre} del carrito`}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>

                  <div className="item-price-col">
                    ${articulo.precio.toFixed(2)}
                  </div>

                  <div className="item-qty-col">
                    <label htmlFor={`qty-${articulo.id}`} className="sr-only">
                      Cantidad para {articulo.nombre}
                    </label>
                    <div className="qty-control">
                      <button
                        type="button"
                        className="btn-qty"
                        onClick={() => actualizarCantidad(articulo.id, articulo.cantidad - 1)}
                        aria-label={`Restar una unidad a ${articulo.nombre}`}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        id={`qty-${articulo.id}`}
                        min="1"
                        max="99"
                        value={articulo.cantidad}
                        onChange={(evento) => actualizarCantidad(articulo.id, Number(evento.target.value))}
                        className="qty-input"
                      />
                      <button
                        type="button"
                        className="btn-qty"
                        onClick={() => actualizarCantidad(articulo.id, articulo.cantidad + 1)}
                        aria-label={`Añadir una unidad a ${articulo.nombre}`}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="item-total-col">
                    <strong>${(articulo.precio * articulo.cantidad).toFixed(2)}</strong>
                  </div>
                </li>
              ))}
            </ul>

            <div className="cart-footer-bar">
              <button
                type="button"
                onClick={vaciarCarrito}
                className="btn-secondary btn-clear-cart"
              >
                Vaciar carrito
              </button>
              <Link to="/catalogo" className="btn-link-continue">
                ← Continuar comprando
              </Link>
            </div>
          </div>

          {/* Resumen del pedido */}
          <aside className="cart-summary-sidebar" aria-labelledby="summary-heading">
            <div className="summary-card">
              <h2 id="summary-heading" className="summary-title">Resumen del pedido</h2>

              <dl className="summary-lines">
                <div className="summary-row">
                  <dt>Subtotal ({cantidadTotal} {cantidadTotal === 1 ? 'artículo' : 'artículos'})</dt>
                  <dd>${totales.subtotal.toFixed(2)}</dd>
                </div>
                <div className="summary-row">
                  <dt>Envío a Pichincha</dt>
                  <dd>{totales.envio === 0 ? <span className="free-badge">Gratis</span> : `$${totales.envio.toFixed(2)}`}</dd>
                </div>
                <div className="summary-row">
                  <dt>IVA estimado (15%)</dt>
                  <dd>${totales.impuestos.toFixed(2)}</dd>
                </div>
                <div className="summary-divider" />
                <div className="summary-row summary-total">
                  <dt>Total a pagar</dt>
                  <dd>${totales.total.toFixed(2)}</dd>
                </div>
              </dl>

              <button
                type="button"
                className="btn-primary btn-checkout-main"
                onClick={() => setModalCheckoutAbierto(true)}
              >
                Proceder al pago
              </button>

              <div className="summary-trust-notice">
                <IconoPeriferico tipo="truck" size={18} />
                <span>Envíos directos en toda la provincia de Pichincha.</span>
              </div>
            </div>
          </aside>

        </div>
      )}

      {/* MODAL DE CHECKOUT ACCESIBLE */}
      {modalCheckoutAbierto && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="checkout-modal-title">
          <div className="modal-checkout-card">
            <div className="modal-header">
              <h2 id="checkout-modal-title">Confirmar Pedido y Dirección de Entrega</h2>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setModalCheckoutAbierto(false)}
                aria-label="Cerrar modal de checkout"
              >
                ✕
              </button>
            </div>

            <form onSubmit={confirmarPedido} className="checkout-form">
              <div className="form-group-section">
                <h3 className="section-sub-title">1. Datos de Facturación</h3>
                <div className="form-grid-2">
                  <div className="form-field">
                    <label htmlFor="nombreCompleto">Nombre y Apellido</label>
                    <input
                      type="text"
                      id="nombreCompleto"
                      name="nombreCompleto"
                      required
                      value={datosFormulario.nombreCompleto}
                      onChange={actualizarCampoFormulario}
                      className="form-input"
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor="identificacion">Cédula o RUC</label>
                    <input
                      type="text"
                      id="identificacion"
                      name="identificacion"
                      required
                      value={datosFormulario.identificacion}
                      onChange={actualizarCampoFormulario}
                      className="form-input"
                    />
                  </div>
                </div>
              </div>

              <div className="form-group-section">
                <h3 className="section-sub-title">2. Ubicación de Entrega en Pichincha</h3>
                <div className="form-field">
                  <label htmlFor="canton">Cantón de Pichincha</label>
                  <select
                    id="canton"
                    name="canton"
                    value={datosFormulario.canton}
                    onChange={actualizarCampoFormulario}
                    className="form-input"
                  >
                    {cantonesPichincha.map((canton, i) => (
                      <option key={i} value={canton}>{canton}</option>
                    ))}
                  </select>
                </div>

                <div className="form-grid-2">
                  <div className="form-field">
                    <label htmlFor="callePrincipal">Calle Principal</label>
                    <input
                      type="text"
                      id="callePrincipal"
                      name="callePrincipal"
                      placeholder="Ej: Av. Amazonas"
                      required
                      value={datosFormulario.callePrincipal}
                      onChange={actualizarCampoFormulario}
                      className="form-input"
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor="numeracion">Numeración / Intersección</label>
                    <input
                      type="text"
                      id="numeracion"
                      name="numeracion"
                      placeholder="Ej: N24-102 y Cordero"
                      required
                      value={datosFormulario.numeracion}
                      onChange={actualizarCampoFormulario}
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label htmlFor="referencia">Referencia de ubicación</label>
                  <input
                    type="text"
                    id="referencia"
                    name="referencia"
                    placeholder="Ej: Frente al parque, edificio blanco"
                    value={datosFormulario.referencia}
                    onChange={actualizarCampoFormulario}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="checkout-modal-footer">
                <div className="checkout-total-line">
                  <span>Total a facturar:</span>
                  <strong>${totales.total.toFixed(2)}</strong>
                </div>
                <div className="modal-buttons-row">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setModalCheckoutAbierto(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                  >
                    Confirmar compra
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
