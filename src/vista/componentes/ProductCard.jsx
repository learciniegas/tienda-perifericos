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

  const agregarProducto = (evento) => {
    evento.preventDefault()
    evento.stopPropagation()
    setAgregando(true)
    agregarAlCarrito(producto, 1)
    setTimeout(() => setAgregando(false), 800)
  }

  const precioNum = Number(producto.precio) || 0
  const precioActual = precioNum.toFixed(2)
  const precioAnterior = producto.precio_anterior || (precioNum * 1.25).toFixed(2)
  const descuento = producto.descuento_porcentaje || 20

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
            <IconoPeriferico tipo={producto.categoria || 'keyboard'} size={80} className="fallback-icon" />
          </div>
        )}
      </div>

      {/* Contenido descriptivo */}
      <div className="product-info">
        <span className="product-category">{producto.categoria} • {producto.marca}</span>
        
        <h3 id={`prod-title-${producto.id}`} className="product-title">
          <Link to={`/catalogo?cat=${producto.categoria_slug || ''}`} className="product-title-link">
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
          <p className="price-comparison">
            Antes ${precioAnterior}, ahora ${precioActual}, {descuento}% menos
          </p>
          <span className="pichincha-stock-tag">
            ✓ Stock inmediato en Pichincha
          </span>
        </div>

        {/* Acciones de compra (HU-04) */}
        <div className="product-actions">
          <button
            type="button"
            className={`btn-primary btn-add-cart ${agregando ? 'btn-active' : ''}`}
            onClick={agregarProducto}
            aria-label={`Agregar ${producto.nombre} al carrito por $${precioActual}`}
          >
            {agregando ? '✓ ¡Agregado!' : 'Agregar al carrito'}
          </button>

          <Link
            to={`/catalogo?cat=${producto.categoria_slug || ''}`}
            className="btn-secondary btn-view-product"
            aria-label={`Ver opciones de ${producto.nombre}`}
          >
            Ver opciones
          </Link>
        </div>
      </div>
    </article>
  )
}
