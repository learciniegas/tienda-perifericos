/**
 * VISTA: tarjeta de producto
 * Tarjeta de periférico accesible e interactiva con fallback visual garantizado.
 * Cumple con HU-02, HU-04 y soporte de stock para la provincia de Pichincha.
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCarrito } from '../../controlador/useCarrito'
import { IconoPeriferico } from './PeripheralIcon'

export function TarjetaProducto({ producto }) {
  const { agregarAlCarrito } = useCarrito()
  const [imagenFallo, setImagenFallo] = useState(false)
  const [agregando, setAgregando] = useState(false)
  const [errorLocal, setErrorLocal] = useState('')

  const agregarProducto = async (evento) => {
    evento.preventDefault()
    evento.stopPropagation()
    if (!producto.en_stock) return

    setErrorLocal('')
    const resultado = await agregarAlCarrito(producto, 1)
    if (resultado?.ok) {
      setAgregando(true)
      setTimeout(() => setAgregando(false), 1200)
    } else {
      setErrorLocal(resultado?.error || 'No se pudo agregar al carrito')
      setTimeout(() => setErrorLocal(''), 5000)
    }
  }

  const precioNum = Number(producto.precio) || 0
  const precioActual = precioNum.toFixed(2)
  const tieneDescuento = Boolean(producto.precio_anterior && Number(producto.precio_anterior) > precioNum)
  const precioAnterior = tieneDescuento ? Number(producto.precio_anterior).toFixed(2) : null
  const descuento = tieneDescuento
    ? producto.descuento_porcentaje || Math.round(((Number(producto.precio_anterior) - precioNum) / Number(producto.precio_anterior)) * 100)
    : null
  const enStock = Boolean(producto.en_stock)

  return (
    <article className="product-card" aria-labelledby={`prod-title-${producto.id}`}>
      {/* Contenedor de imagen con fallback visual */}
      <div className="product-image-container">
        {!imagenFallo && producto.imagen_url ? (
          <img
            src={producto.imagen_url}
            alt={producto.imagen_alt || `${producto.categoria} ${producto.nombre}`}
            className="product-image"
            loading="lazy"
            onError={() => setImagenFallo(true)}
          />
        ) : (
          <div className="product-image-fallback" aria-hidden="true">
            <div className="fallback-badge">{producto.categoria}</div>
            <IconoPeriferico tipo={producto.categoria_slug || producto.categoria || 'keyboard'} size={80} className="fallback-icon" />
          </div>
        )}
      </div>

      {/* Contenido descriptivo */}
      <div className="product-info">
        <span className="product-category">{producto.categoria} • {producto.marca}</span>
        
        <h3 id={`prod-title-${producto.id}`} className="product-title">
          <Link to={`/producto/${producto.id}`} className="product-title-link">
            {producto.nombre}
          </Link>
        </h3>

        {/* Bloque de precios */}
        <div className="product-pricing">
          <div className="price-main">
            <span className="currency-symbol">$</span>
            <span className="price-amount">{Math.floor(precioNum)}</span>
            <span className="price-cents">.{precioActual.split('.')[1]}</span>
          </div>
          {tieneDescuento && (
            <p className="price-comparison">
              Antes ${precioAnterior}, ahora ${precioActual}, {descuento}% menos
            </p>
          )}
          {!enStock && (
            <p className="stock-warning-text" role="status">
              Agotado
            </p>
          )}
        </div>

        {/* Acciones de compra (HU-04) */}
        <div className="product-actions">
          <button
            type="button"
            className={`btn-primary btn-add-cart ${agregando ? 'btn-active' : ''} ${!enStock ? 'btn-disabled' : ''}`}
            onClick={agregarProducto}
            disabled={!enStock}
            aria-label={enStock ? `Agregar ${producto.nombre} al carrito por $${precioActual}` : `${producto.nombre} agotado`}
          >
            {!enStock ? 'Agotado' : (agregando ? '✓ ¡Agregado!' : 'Agregar al carrito')}
          </button>

          <Link
            to={`/producto/${producto.id}`}
            className="btn-secondary btn-view-product"
            aria-label={`Ver detalles y opciones de ${producto.nombre}`}
          >
            Ver detalles
          </Link>
        </div>

        {errorLocal && (
          <p className="stock-warning-text" role="alert" style={{ marginTop: '8px', color: '#dc2626', fontSize: '13px' }}>
            ⚠️ {errorLocal}
          </p>
        )}
      </div>
    </article>
  )
}
