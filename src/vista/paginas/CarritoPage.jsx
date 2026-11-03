/**
 * VISTA: CarritoPage.jsx
 * Gestión del carrito de compras con soporte para selección parcial de artículos (HU-07)
 * y cálculo dinámico de subtotales para Quito, Pichincha.
 */

import { Link, useNavigate } from 'react-router-dom'
import { useCarrito } from '../../controlador/useCarrito'
import { useAutenticacion } from '../../controlador/useAuth'
import { IconoPeriferico } from '../componentes/PeripheralIcon'

export function PaginaCarrito() {
  const { usuario } = useAutenticacion()
  const {
    articulos,
    cantidadTotal,
    cantidadSeleccionada,
    haySeleccionados,
    todosSeleccionados,
    totales,
    actualizarCantidad,
    eliminarDelCarrito,
    alternarSeleccion,
    seleccionarTodos,
    vaciarCarrito
  } = useCarrito()

  const navigate = useNavigate()

  return (
    <div className="cart-page-container">
      <div className="cart-header-zone">
        <h1 className="catalog-main-title">Carrito de compras</h1>
        <p className="catalog-subtitle">
          Revisa y selecciona los periféricos que deseas comprar.
        </p>
      </div>

      {articulos.length === 0 ? (
        <div className="empty-cart-card" role="region" aria-label="Carrito vacío">
          <IconoPeriferico tipo="cart" size={64} className="empty-cart-icon" />
          <h2>Tu carrito está vacío</h2>
          <p>Explora nuestro catálogo de teclados mecánicos, ratones gamer, auriculares y accesorios para armar tu setup.</p>
          <Link to="/catalogo" className="btn-primary">
            Explorar catálogo de periféricos
          </Link>
        </div>
      ) : (
        <div className="cart-layout-grid">
          
          {/* Lista de productos en el carrito */}
          <div className="cart-items-section">
            
            {/* Barra superior de control de selección (HU-07) */}
            <div className="cart-selection-toolbar">
              <label className="selection-all-checkbox-label">
                <input
                  type="checkbox"
                  checked={todosSeleccionados}
                  onChange={(e) => seleccionarTodos(e.target.checked)}
                  aria-label="Seleccionar o deseleccionar todos los productos del carrito"
                  className="cart-checkbox"
                />
                <span className="selection-all-text">
                  Seleccionar todos los artículos ({articulos.length})
                </span>
              </label>

              <span className="selection-summary-text">
                {cantidadSeleccionada} de {cantidadTotal} unidades seleccionadas
              </span>
            </div>

            <div className="cart-table-header" aria-hidden="true">
              <span />
              <span>Producto</span>
              <span>Precio unitario</span>
              <span>Cantidad</span>
              <span>Subtotal</span>
            </div>

            <ul className="cart-items-list" aria-label="Lista de artículos en el carrito">
              {articulos.map((articulo) => {
                const subtotalItem = (articulo.precio * articulo.cantidad).toFixed(2)
                const estaSeleccionado = articulo.seleccionado !== false

                return (
                  <li
                    key={articulo.id}
                    className={`cart-item-row ${estaSeleccionado ? 'item-selected' : 'item-unselected'}`}
                  >
                    {/* Checkbox de selección individual (HU-07) */}
                    <div className="item-select-col">
                      <input
                        type="checkbox"
                        id={`check-item-${articulo.id}`}
                        checked={estaSeleccionado}
                        onChange={() => alternarSeleccion(articulo.id)}
                        aria-label={`Seleccionar ${articulo.nombre} para comprar`}
                        className="cart-checkbox"
                      />
                    </div>

                    <div className="item-info-col">
                      <div className="item-thumbnail">
                        <IconoPeriferico tipo={articulo.categoria || 'keyboard'} size={36} />
                      </div>
                      <div>
                        <h2 className="item-name">
                          <label htmlFor={`check-item-${articulo.id}`} className="cursor-pointer">
                            {articulo.nombre}
                          </label>
                        </h2>
                        <span className="item-cat">{articulo.categoria}</span>
                        <div className="item-actions-row">
                          <button
                            type="button"
                            className="btn-link-remove"
                            onClick={() => eliminarDelCarrito(articulo.id, articulo.nombre)}
                            aria-label={`Eliminar ${articulo.nombre} del carrito`}
                          >
                            Eliminar
                          </button>
                          <span className="item-action-separator" aria-hidden="true">|</span>
                          <span className="stock-pill-notice">En inventario Quito</span>
                        </div>
                      </div>
                    </div>

                    <div className="item-price-col">
                      <span className="col-label-mobile">Precio: </span>
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
                          aria-label={`Cantidad actual de ${articulo.nombre}`}
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
                      <span className="col-label-mobile">Subtotal: </span>
                      <strong>${subtotalItem}</strong>
                    </div>
                  </li>
                )
              })}
            </ul>

            <div className="cart-footer-bar">
              <button
                type="button"
                onClick={vaciarCarrito}
                className="btn-secondary btn-clear-cart"
                aria-label="Vaciar todos los productos del carrito"
              >
                Vaciar carrito
              </button>
              <Link to="/catalogo" className="btn-link-continue">
                ← Continuar explorando catálogo
              </Link>
            </div>
          </div>

          {/* Resumen del pedido para los productos seleccionados */}
          <aside className="cart-summary-sidebar" aria-labelledby="summary-heading">
            <div className="summary-card">
              <h2 id="summary-heading" className="summary-title">Resumen de compra</h2>

              {!haySeleccionados && (
                <div className="selection-alert-banner" role="alert">
                  <span>⚠️ Selecciona al menos un producto para habilitar el checkout.</span>
                </div>
              )}

              <dl className="summary-lines">
                <div className="summary-row">
                  <dt>Subtotal ({cantidadSeleccionada} {cantidadSeleccionada === 1 ? 'artículo' : 'artículos'} seleccionados)</dt>
                  <dd>${totales.subtotal.toFixed(2)}</dd>
                </div>
                <div className="summary-row">
                  <dt>Envío</dt>
                  <dd>
                    {totales.subtotal === 0 ? (
                      '$0.00'
                    ) : totales.envio === 0 ? (
                      <span className="free-badge">Gratis</span>
                    ) : (
                      `$${totales.envio.toFixed(2)}`
                    )}
                  </dd>
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

              {totales.subtotal > 0 && totales.subtotal < 50 && (
                <p className="shipping-hint-text">
                  💡 Agrega <strong>${(50 - totales.subtotal).toFixed(2)}</strong> más para recibir <strong>envío gratis</strong>.
                </p>
              )}

              <button
                type="button"
                className={`btn-primary btn-checkout-main ${!haySeleccionados ? 'btn-disabled' : ''}`}
                disabled={!haySeleccionados}
                onClick={() => {
                  if (usuario?.autenticado) {
                    navigate('/checkout')
                  } else {
                    navigate('/login?redirect=/checkout')
                  }
                }}
                aria-label={
                  haySeleccionados
                    ? `Proceder al checkout con ${cantidadSeleccionada} artículos seleccionados por un total de $${totales.total.toFixed(2)}`
                    : 'Selecciona al menos un artículo para proceder al checkout'
                }
              >
                {haySeleccionados
                  ? `Proceder al checkout (${cantidadSeleccionada})`
                  : 'Selecciona productos para comprar'}
              </button>

            </div>
          </aside>

        </div>
      )}
    </div>
  )
}
