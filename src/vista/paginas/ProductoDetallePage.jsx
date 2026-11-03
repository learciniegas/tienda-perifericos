/**
 * VISTA: ProductoDetallePage.jsx
 * Página de detalle individual del periférico (HU-06).
 * Implementa la descripción profunda del producto (Release 2) y sus especificaciones técnicas,
 * cálculo de precios, selector de cantidad y compra rápida con entrega en Pichincha.
 */

import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { obtenerProductoPorId, obtenerResenasProducto, guardarResenaProducto, verificarCompraUsuario } from '../../modelo/catalogoModelo'
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

  // Estado de reseñas y valoraciones (Release 3)
  const [resenasData, setResenasData] = useState({
    lista: [],
    total: 0,
    promedio: 5.0,
    distribucion: {},
    porcentajes: {}
  })
  const [cargandoResenas, setCargandoResenas] = useState(true)
  const [mostrarFormularioResena, setMostrarFormularioResena] = useState(false)
  const [nuevaCalif, setNuevaCalif] = useState(5)
  const [nuevoTitulo, setNuevoTitulo] = useState('')
  const [nuevoComentario, setNuevoComentario] = useState('')
  const [nuevoNombre, setNuevoNombre] = useState(usuario?.nombre || '')
  const [nuevaCiudad, setNuevaCiudad] = useState('Quito, Pichincha')
  const [enviandoResena, setEnviandoResena] = useState(false)
  const [mensajeResenaExito, setMensajeResenaExito] = useState('')
  const [errorResena, setErrorResena] = useState('')
  const [comproProducto, setComproProducto] = useState(false)
  const [verificandoCompra, setVerificandoCompra] = useState(false)

  // Verificar en Supabase TX si el usuario compró este periférico (fuente de verdad)
  useEffect(() => {
    let activo = true
    if (usuario?.autenticado && usuario?.id && id) {
      verificarCompraUsuario(id, usuario.id)
        .then((compro) => {
          if (!activo) return
          setComproProducto(compro)
          setVerificandoCompra(false)
        })
        .catch(() => {
          if (!activo) return
          setComproProducto(false)
          setVerificandoCompra(false)
        })
    }

    return () => {
      activo = false
    }
  }, [id, usuario])

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

  // Cargar reseñas verificadas del producto (Release 3)
  useEffect(() => {
    let activo = true

    obtenerResenasProducto(id)
      .then((datos) => {
        if (!activo) return
        setResenasData(datos)
        setCargandoResenas(false)
      })
      .catch((err) => {
        if (!activo) return
        console.warn('Aviso al obtener reseñas del producto:', err)
        setCargandoResenas(false)
      })

    return () => {
      activo = false
    }
  }, [id])

  // Publicar nueva reseña (comprobando compra previa en Supabase TX)
  const manejarGuardarResena = async (e) => {
    e.preventDefault()
    setErrorResena('')
    setMensajeResenaExito('')

    if (!usuario?.autenticado) {
      setErrorResena('Debes iniciar sesión con tu cuenta para dejar una reseña.')
      return
    }

    if (!comproProducto) {
      setErrorResena('Solo los clientes que hayan comprado este periférico pueden calificarlo y dejar una reseña.')
      return
    }

    if (!nuevoComentario.trim()) {
      setErrorResena('Por favor escribe tu opinión sobre este periférico.')
      return
    }

    setEnviandoResena(true)

    try {
      await guardarResenaProducto({
        productoId: id,
        calificacion: nuevaCalif,
        titulo: nuevoTitulo.trim() || 'Opinión de compra',
        comentario: nuevoComentario.trim(),
        nombreAutor: nuevoNombre.trim() || (usuario?.nombre !== 'Invitado' ? usuario.nombre : 'Cliente Verificado'),
        ciudad: nuevaCiudad.trim() || 'Quito, Pichincha',
        usuarioId: usuario?.id
      })

      const datosActualizados = await obtenerResenasProducto(id)
      setResenasData(datosActualizados)
      setMensajeResenaExito('✓ ¡Muchas gracias! Tu valoración y opinión han sido registradas y publicadas con éxito.')
      setMostrarFormularioResena(false)
      setNuevoTitulo('')
      setNuevoComentario('')
      setNuevaCalif(5)
      setTimeout(() => setMensajeResenaExito(''), 7000)
    } catch (err) {
      setErrorResena(err.message || 'No fue posible guardar la reseña. Inténtalo de nuevo.')
    } finally {
      setEnviandoResena(false)
    }
  }

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
          <div
            className="detail-rating-row"
            role="group"
            aria-label={`Calificación ${resenasData.promedio} de 5 estrellas basado en ${resenasData.total} opiniones verificadas`}
          >
            <div className="stars-group" aria-hidden="true">
              {'★'.repeat(Math.min(5, Math.max(1, Math.round(resenasData.promedio)))) +
                '☆'.repeat(5 - Math.min(5, Math.max(1, Math.round(resenasData.promedio))))}
            </div>
            <span className="rating-score">{resenasData.promedio}</span>
            <a href="#resenas" className="reviews-count-link">
              ({resenasData.total} {resenasData.total === 1 ? 'opinión verificada' : 'opiniones verificadas'})
            </a>
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
            <p className="detail-vat-legend">Precio incluye 15% de IVA.</p>
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

        {/* Columna 3: Caja de compra */}
        <aside className="detail-buybox-column" aria-labelledby="heading-buybox">
          <div className="buybox-card">
            <h2 id="heading-buybox" className="sr-only">Comprar este periférico</h2>
            
            <div className="buybox-price-header">
              <span className="buybox-price">${precioNum.toFixed(2)}</span>
            </div>

            <div className="buybox-delivery-info">
              <p className="delivery-location">
                📍 Entrega en Quito y valles: <strong>24 a 48 horas hábiles</strong>
              </p>
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
                <span>Garantía oficial de 12 meses</span>
              </div>
            </div>

          </div>
        </aside>

      </div>

      {/* ========================================================
          SECCIÓN DE RESEÑAS Y VALORACIONES (Release 3)
          ======================================================== */}
      <section className="detail-reviews-full-section" id="resenas" aria-labelledby="heading-reviews">
        <div className="reviews-section-header">
          <h2 id="heading-reviews" className="reviews-main-title">
            Opiniones y valoraciones de compradores
          </h2>
          <p className="reviews-main-desc">
            Opiniones de compradores verificados.
          </p>
        </div>

        {mensajeResenaExito && (
          <div className="auth-alert auth-alert-success mt-4" role="status" aria-live="polite">
            <span className="alert-icon" aria-hidden="true">✓</span>
            <p>{mensajeResenaExito}</p>
          </div>
        )}

        <div className="reviews-main-grid">
          
          {/* Columna Izquierda: Métricas de Calificación y Distribución */}
          <div className="reviews-metrics-card">
            <h3 className="metrics-title">Calificación general</h3>
            
            <div className="overall-score-display">
              <span className="score-big">{resenasData.promedio}</span>
              <div className="score-details">
                <div className="stars-group score-stars" aria-hidden="true">
                  {'★'.repeat(Math.min(5, Math.max(1, Math.round(resenasData.promedio)))) +
                    '☆'.repeat(5 - Math.min(5, Math.max(1, Math.round(resenasData.promedio))))}
                </div>
                <span className="score-total-count">
                  {resenasData.total} {resenasData.total === 1 ? 'opinión verificada' : 'opiniones verificadas'}
                </span>
              </div>
            </div>

            {/* Barras de distribución de estrellas */}
            <div className="rating-bars-list" role="group" aria-label="Distribución de estrellas de valoración">
              {[5, 4, 3, 2, 1].map((estrellas) => {
                const porcentaje = resenasData.porcentajes[estrellas] || 0
                const cantidadEstrellas = resenasData.distribucion[estrellas] || 0

                return (
                  <div key={estrellas} className="rating-bar-row">
                    <span className="bar-label">{estrellas} estrellas</span>
                    <div
                      className="rating-bar-track"
                      role="progressbar"
                      aria-valuenow={porcentaje}
                      aria-valuemin="0"
                      aria-valuemax="100"
                      aria-label={`${estrellas} estrellas: ${porcentaje}% (${cantidadEstrellas} opiniones)`}
                    >
                      <div className="rating-bar-fill" style={{ width: `${porcentaje}%` }} />
                    </div>
                    <span className="bar-percent">{porcentaje}%</span>
                  </div>
                )
              })}
            </div>

            <hr className="reviews-card-divider" />

            <div className="write-review-callout">
              <h4 className="write-callout-heading">Opiniones de compradores</h4>
              
              {!usuario?.autenticado ? (
                <div className="review-auth-prompt">
                  <p className="write-callout-text">
                    Inicia sesión con tu cuenta para comprobar tu compra y valorar este producto.
                  </p>
                  <Link to={`/login?redirect=/producto/${id}#resenas`} className="btn-secondary btn-full">
                    Iniciar sesión para opinar
                  </Link>
                </div>
              ) : verificandoCompra ? (
                <p className="write-callout-text">Verificando historial de compra en Pichincha...</p>
              ) : !comproProducto ? (
                <div className="review-auth-prompt">
                  <p className="write-callout-text">
                    🔒 Solo los clientes que hayan adquirido este producto en la tienda pueden compartir su valoración y reseña.
                  </p>
                </div>
              ) : (
                <>
                  <p className="write-callout-text">
                    ¡Compra verificada! Comparte tu experiencia de uso y durabilidad con la comunidad.
                  </p>
                  <button
                    type="button"
                    className="btn-primary btn-toggle-review"
                    onClick={() => setMostrarFormularioResena((prev) => !prev)}
                    aria-expanded={mostrarFormularioResena}
                  >
                    {mostrarFormularioResena ? 'Cerrar formulario de opinión' : '★ Escribir una opinión'}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Columna Derecha: Formulario (si está activo) + Listado de Opiniones */}
          <div className="reviews-content-column">
            
            {/* Formulario de Nueva Reseña (Release 3) */}
            {mostrarFormularioResena && (
              <form onSubmit={manejarGuardarResena} className="write-review-form" aria-label="Escribir una opinión sobre este producto">
                <h3 className="form-review-title">Tu valoración para {producto.nombre}</h3>
                
                {errorResena && (
                  <div className="auth-alert auth-alert-error" role="alert">
                    <span className="alert-icon" aria-hidden="true">⚠️</span>
                    <p>{errorResena}</p>
                  </div>
                )}

                {/* Calificación de Estrellas Accesible */}
                <fieldset className="star-rating-fieldset">
                  <legend className="star-rating-legend">
                    Calificación <span className="required-star">*</span>
                  </legend>
                  <div className="star-picker-buttons" role="radiogroup" aria-label="Selecciona tu puntuación de 1 a 5 estrellas">
                    {[1, 2, 3, 4, 5].map((num) => (
                      <button
                        key={num}
                        type="button"
                        role="radio"
                        aria-checked={nuevaCalif === num}
                        className={`star-pick-btn ${nuevaCalif >= num ? 'is-selected' : ''}`}
                        onClick={() => setNuevaCalif(num)}
                        aria-label={`${num} ${num === 1 ? 'estrella' : 'estrellas'}`}
                      >
                        ★
                      </button>
                    ))}
                    <span className="star-rating-label">
                      {nuevaCalif === 5 && '5 de 5 - Excelente'}
                      {nuevaCalif === 4 && '4 de 5 - Muy bueno'}
                      {nuevaCalif === 3 && '3 de 5 - Aceptable'}
                      {nuevaCalif === 2 && '2 de 5 - Regular'}
                      {nuevaCalif === 1 && '1 de 5 - Deficiente'}
                    </span>
                  </div>
                </fieldset>

                <div className="form-field">
                  <label htmlFor="review-title-input">
                    Título o resumen de tu opinión <span className="required-star">*</span>
                  </label>
                  <input
                    type="text"
                    id="review-title-input"
                    placeholder="Ej: Excelente respuesta táctil y gran comodidad"
                    value={nuevoTitulo}
                    onChange={(e) => setNuevoTitulo(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="review-body-input">
                    Escribe tu opinión detallada <span className="required-star">*</span>
                  </label>
                  <textarea
                    id="review-body-input"
                    rows="4"
                    placeholder="Describe qué te gustó del hardware, rendimiento en juegos o trabajo, y los tiempos de despacho..."
                    value={nuevoComentario}
                    onChange={(e) => setNuevoComentario(e.target.value)}
                    className="form-input form-textarea"
                    required
                  />
                </div>

                <div className="form-grid-2">
                  <div className="form-field">
                    <label htmlFor="review-author-input">Tu nombre o alias</label>
                    <input
                      type="text"
                      id="review-author-input"
                      placeholder="Ej: Luis M."
                      value={nuevoNombre}
                      onChange={(e) => setNuevoNombre(e.target.value)}
                      className="form-input"
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="review-city-input">Ubicación en Pichincha</label>
                    <input
                      type="text"
                      id="review-city-input"
                      placeholder="Ej: Quito (Cumbayá)"
                      value={nuevaCiudad}
                      onChange={(e) => setNuevaCiudad(e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-buttons-row">
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={enviandoResena}
                  >
                    {enviandoResena ? 'Publicando...' : 'Publicar mi opinión'}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setMostrarFormularioResena(false)}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}

            {/* Listado de Opiniones de Clientes */}
            <div className="reviews-items-container">
              <h3 className="sr-only">Listado de opiniones</h3>
              
              {cargandoResenas ? (
                <div className="loading-state" role="status">
                  <div className="spinner" aria-hidden="true" />
                  <p>Cargando opiniones verificadas...</p>
                </div>
              ) : resenasData.lista.length === 0 ? (
                <div className="empty-reviews-box">
                  <p>Aún no hay opiniones publicadas para este periférico.</p>
                  <p className="empty-subtext">¡Sé el primero en calificarlo y dejar tu reseña!</p>
                </div>
              ) : (
                <div className="reviews-cards-list">
                  {resenasData.lista.map((resena) => {
                    const fechaObj = new Date(resena.creado_en)
                    const fechaTexto = !isNaN(fechaObj.getTime())
                      ? fechaObj.toLocaleDateString('es-EC', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })
                      : 'Fecha reciente'

                    return (
                      <article key={resena.id} className="review-card-item">
                        <div className="review-author-row">
                          <div className="review-avatar" aria-hidden="true">
                            {resena.nombre_autor ? resena.nombre_autor.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div className="review-author-info">
                            <span className="review-author-name">{resena.nombre_autor}</span>
                            <span className="review-location-tag">📍 {resena.ciudad || 'Quito, Pichincha'}</span>
                          </div>
                        </div>

                        <div className="review-rating-line">
                          <div
                            className="stars-group"
                            role="img"
                            aria-label={`Calificación: ${resena.calificacion} de 5 estrellas`}
                          >
                            {'★'.repeat(resena.calificacion) + '☆'.repeat(5 - resena.calificacion)}
                          </div>
                          <strong className="review-title">{resena.titulo}</strong>
                        </div>

                        <div className="review-meta-row">
                          <span className="review-date-text">Opinión registrada el {fechaTexto}</span>
                          {resena.compra_verificada && (
                            <span className="verified-purchase-badge">
                              ✓ Compra verificada en Pichincha
                            </span>
                          )}
                        </div>

                        <p className="review-comment-body">{resena.comentario}</p>
                      </article>
                    )
                  })}
                </div>
              )}
            </div>

          </div>

        </div>
      </section>
    </div>
  )
}
