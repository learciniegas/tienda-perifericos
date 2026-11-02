/**
 * VISTA: ProductoDetallePage.jsx
 * Página de detalle individual del periférico (HU-06).
 * Implementa la descripción profunda del producto (Release 2) y sus especificaciones técnicas,
 * cálculo de precios, selector de cantidad y compra rápida con entrega en Pichincha.
 */

import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { obtenerProductoPorId } from '../../modelo/catalogoModelo'
import { useCarrito } from '../../controlador/useCarrito'
import { useAutenticacion } from '../../controlador/useAuth'
import { IconoPeriferico } from '../componentes/PeripheralIcon'

export function PaginaProductoDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { agregarAlCarrito } = useCarrito()
  const { usuario } = useAutenticacion()

  const [producto, setProducto] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [cantidad, setCantidad] = useState(1)
  const [imagenFallo, setImagenFallo] = useState(false)
  const [agregando, setAgregando] = useState(false)
  const [mensajeExito, setMensajeExito] = useState(false)

  useEffect(() => {
    let activo = true

    obtenerProductoPorId(id)
      .then((productoCargado) => {
        if (!activo) return
        if (productoCargado) {
          setProducto(productoCargado)
          setError(null)
        } else {
          setError('El periférico solicitado no se encuentra en el catálogo.')
        }
        setCargando(false)
      })
      .catch((err) => {
        if (!activo) return
        setError('Error al consultar el producto: ' + err.message)
        setCargando(false)
      })

    return () => {
      activo = false
    }
  }, [id])

  // HU-06: Añadir al carrito desde la página del producto
  const manejarAgregarCarrito = (e) => {
    if (e) e.preventDefault()
    if (!producto) return

    setAgregando(true)
    agregarAlCarrito(producto, cantidad)

    setMensajeExito(true)
    setTimeout(() => {
      setAgregando(false)
    }, 600)

    setTimeout(() => {
      setMensajeExito(false)
    }, 4500)
  }

  // Comprar ahora (1 clic directo al checkout)
  const manejarComprarAhora = () => {
    if (!producto) return
    agregarAlCarrito(producto, cantidad)
    if (!usuario?.autenticado) {
      navigate('/login?redirect=/checkout')
    } else {
      navigate('/checkout')
    }
  }

  if (cargando) {
    return (
      <div className="product-detail-page-container">
        <div className="loading-state" role="status" aria-live="polite">
          <div className="spinner" aria-hidden="true" />
          <p>Cargando información y especificaciones del periférico...</p>
        </div>
      </div>
    )
  }

  if (error || !producto) {
    return (
      <div className="product-detail-page-container">
        <div className="empty-cart-card" role="alert">
          <IconoPeriferico tipo="search" size={64} className="empty-cart-icon" />
          <h1>Periférico no encontrado</h1>
          <p>{error || 'No pudimos localizar este periférico en nuestro catálogo activo.'}</p>
          <Link to="/catalogo" className="btn-primary">
            Explorar catálogo completo
          </Link>
        </div>
      </div>
    )
  }

  const precioNum = Number(producto.precio) || 0
  const precioAnteriorNum = Number(producto.precio_anterior) || (precioNum * 1.25)
  const ahorro = (precioAnteriorNum - precioNum).toFixed(2)

  return (
    <div className="product-detail-page-container">
      {/* Miga de pan / Breadcrumb accesible */}
      <nav aria-label="Ruta de navegación" className="detail-breadcrumb">
        <ol className="breadcrumb-list">
          <li>
            <Link to="/">Inicio</Link>
            <span aria-hidden="true"> / </span>
          </li>
          <li>
            <Link to="/catalogo">Catálogo</Link>
            <span aria-hidden="true"> / </span>
          </li>
          <li>
            <Link to={`/catalogo?cat=${producto.categoria_slug || ''}`}>
              {producto.categoria}
            </Link>
            <span aria-hidden="true"> / </span>
          </li>
          <li aria-current="page" className="breadcrumb-current">
            {producto.nombre}
          </li>
        </ol>
      </nav>

      {/* Disposición principal en 3 columnas estilo tienda profesional */}
      <div className="product-detail-layout">
        
        {/* Columna 1: Imagen del periférico con fallback */}
        <div className="detail-image-column">
          <div className="detail-image-card">
            {!imagenFallo && producto.imagen_url ? (
              <img
                src={producto.imagen_url}
                alt={producto.imagen_alt || `${producto.categoria} ${producto.nombre} en alta definición`}
                className="detail-main-image"
                onError={() => setImagenFallo(true)}
              />
            ) : (
              <div className="detail-image-fallback" aria-hidden="true">
                <span className="fallback-category-tag">{producto.categoria}</span>
                <IconoPeriferico tipo={producto.categoria || 'keyboard'} size={140} className="fallback-large-icon" />
                <span className="fallback-brand-tag">{producto.marca}</span>
              </div>
            )}
          </div>
          <div className="detail-badges-row">
            <span className="pichincha-verified-badge">
              ✓ Hardware Original con Garantía Oficial
            </span>
          </div>
        </div>

        {/* Columna 2: Información Central (Título, Valoración, Precio y Descripción) */}
        <div className="detail-info-column">
          <div className="detail-brand-category">
            <span className="brand-pill">{producto.marca}</span>
            <span className="category-pill">{producto.categoria}</span>
          </div>

          <h1 className="detail-title">{producto.nombre}</h1>

          {/* Calificación y reseñas */}
          <div className="detail-rating-row" aria-label={`Calificación ${producto.calificacion} de 5 estrellas basado en ${producto.num_resenas} opiniones`}>
            <div className="stars-group" aria-hidden="true">
              {'★★★★★'}
            </div>
            <span className="rating-score">{producto.calificacion}</span>
            <span className="reviews-count">({producto.num_resenas} calificaciones verificadas)</span>
          </div>

          <hr className="detail-divider" />

          {/* Bloque de Precios y Descuento */}
          <div className="detail-price-box">
            <div className="detail-price-main">
              <span className="detail-currency">$</span>
              <span className="detail-price-number">{Math.floor(precioNum)}</span>
              <span className="detail-price-cents">.{precioNum.toFixed(2).split('.')[1]}</span>
            </div>
            <div className="detail-savings-block">
              <span className="detail-old-price">Antes: ${precioAnteriorNum.toFixed(2)}</span>
              <span className="detail-discount-tag">-{producto.descuento_porcentaje || 20}%</span>
              <span className="detail-savings-text">Ahorras: ${ahorro}</span>
            </div>
            <p className="detail-vat-legend">Precio incluye 15% de IVA. Facturación electrónica oficial.</p>
          </div>

          <hr className="detail-divider" />

          {/* Descripción del Producto (Release 2) */}
          <section className="detail-description-section" aria-labelledby="heading-desc">
            <h2 id="heading-desc" className="detail-section-title">Descripción del Producto</h2>
            <p className="detail-description-text">{producto.descripcion}</p>
            <p className="detail-description-subtext">
              Diseñado para jugadores profesionales y creadores de contenido que buscan durabilidad,
              ergonomía avanzada y respuesta táctil inmediata. Compatible con Windows, macOS y consolas.
            </p>
          </section>

          {/* Especificaciones Técnicas (Release 3 / Release 2) */}
          {producto.especificaciones && producto.especificaciones.length > 0 && (
            <section className="detail-specs-section" aria-labelledby="heading-specs">
              <h2 id="heading-specs" className="detail-section-title">Especificaciones Técnicas</h2>
              <table className="specs-table" aria-label={`Especificaciones técnicas de ${producto.nombre}`}>
                <tbody>
                  {producto.especificaciones.map((spec, idx) => (
                    <tr key={spec.id || idx}>
                      <th scope="row" className="spec-name">{spec.nombre}</th>
                      <td className="spec-value">{spec.valor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

        </div>

        {/* Columna 3: Caja de Compra y Despacho en Pichincha */}
        <aside className="detail-buybox-column" aria-labelledby="heading-buybox">
          <div className="buybox-card">
            <h2 id="heading-buybox" className="sr-only">Comprar este periférico</h2>
            
            <div className="buybox-price-header">
              <span className="buybox-price">${precioNum.toFixed(2)}</span>
              <span className="buybox-shipping-badge">Envío en Pichincha</span>
            </div>

            <div className="buybox-delivery-info">
              <p className="delivery-location">
                📍 Entrega en: <strong>Quito y cantones de Pichincha</strong>
              </p>
              <p className="delivery-timing">
                Entrega estimada: <strong>24 a 48 horas hábiles</strong>
              </p>
            </div>

            <div className="buybox-stock-status">
              <span className="stock-in-pichincha">✓ En inventario Quito (Disponible)</span>
            </div>

            {/* Selector de Cantidad */}
            <div className="buybox-qty-picker">
              <label htmlFor="buybox-qty-select" className="qty-picker-label">
                Cantidad:
              </label>
              <select
                id="buybox-qty-select"
                value={cantidad}
                onChange={(e) => setCantidad(Number(e.target.value))}
                className="qty-picker-dropdown"
                aria-label={`Seleccionar cantidad para comprar de ${producto.nombre}`}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                  <option key={num} value={num}>
                    {num} {num === 1 ? 'unidad' : 'unidades'}
                  </option>
                ))}
              </select>
            </div>

            {/* Botón Añadir al Carrito (HU-06) */}
            <button
              type="button"
              className={`btn-primary btn-buybox-add ${agregando ? 'btn-active' : ''}`}
              onClick={manejarAgregarCarrito}
              aria-label={`Añadir ${cantidad} ${cantidad === 1 ? 'unidad' : 'unidades'} de ${producto.nombre} al carrito`}
            >
              <IconoPeriferico tipo="cart" size={18} />
              <span>{agregando ? '✓ ¡Añadido al carrito!' : 'Añadir al carrito'}</span>
            </button>

            {/* Botón Comprar Ahora */}
            <button
              type="button"
              className="btn-secondary btn-buybox-now"
              onClick={manejarComprarAhora}
              aria-label={`Comprar ahora ${producto.nombre} y proceder al checkout`}
            >
              <span>Comprar ahora</span>
            </button>

            {/* Mensaje de confirmación accesible */}
            {mensajeExito && (
              <div className="buybox-success-alert" role="status" aria-live="polite">
                <span>✓ Se agregaron {cantidad} unidad(es) al carrito.</span>
                <Link to="/carrito" className="buybox-cart-link">Ver carrito</Link>
              </div>
            )}

            <div className="buybox-perks-list">
              <div className="perk-item">
                <span className="perk-icon" aria-hidden="true">🛡️</span>
                <span>Garantía de 12 meses directa con matriz en Quito</span>
              </div>
              <div className="perk-item">
                <span className="perk-icon" aria-hidden="true">🚚</span>
                <span>Envíos seguros asegurados contra siniestro</span>
              </div>
              <div className="perk-item">
                <span className="perk-icon" aria-hidden="true">💳</span>
                <span>Pagos con tarjeta validados por Algoritmo de Luhn</span>
              </div>
            </div>

          </div>
        </aside>

      </div>
    </div>
  )
}
