/**
 * VISTA: CatalogoPage.jsx
 * Vista completa del catálogo con filtrado reactivo inmediato (sin botón de aplicar).
 * Los filtros se aplican al instante y se limpian automáticamente al navegar a otras secciones.
 * Cumple con HU-02, HU-03, HU-04, HU-05 y accesibilidad WCAG 2.2.
 */

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useCatalogo } from '../../controlador/useCatalogo'
import { TarjetaProducto } from '../componentes/ProductCard'
import { IconoPeriferico } from '../componentes/PeripheralIcon'

export function PaginaCatalogo() {
  const [parametrosBusqueda, establecerParametrosBusqueda] = useSearchParams()
  const terminoBusqueda = parametrosBusqueda.get('q') || ''
  const categoriaUrl = parametrosBusqueda.get('cat') || ''

  const {
    productos,
    categorias,
    cargando,
    error,
    actualizarFiltros,
    resetearFiltros,
    buscar
  } = useCatalogo()

  // Estados locales del formulario
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null)
  const [precioDesde, setPrecioDesde] = useState('')
  const [precioHasta, setPrecioHasta] = useState('')
  const [soloEnStock, setSoloEnStock] = useState(false)
  const [orden, setOrden] = useState('relevancia')

  // Bandera para evitar disparar debounce en el primer render
  const primerRender = useRef(true)

  // Búsqueda reactiva por query param (HU-05)
  useEffect(() => {
    if (terminoBusqueda) {
      buscar(terminoBusqueda)
    }
  }, [terminoBusqueda, buscar])

  // Limpieza automática de filtros al salir de la página del catálogo hacia otras secciones
  useEffect(() => {
    return () => {
      resetearFiltros()
    }
  }, [resetearFiltros])

  // Categoría derivada entre estado local y parámetro URL
  const categoriaIdEfectiva = categoriaSeleccionada !== null
    ? categoriaSeleccionada
    : (categoriaUrl && categorias.length > 0
        ? (categorias.find(categoria => categoria.slug === categoriaUrl || categoria.nombre.toLowerCase() === categoriaUrl.toLowerCase())?.id || null)
        : null)

  // Aplicación inmediata con debounce para los campos de precio (sin necesidad de botón)
  useEffect(() => {
    if (primerRender.current) {
      primerRender.current = false
      return
    }

    const timer = setTimeout(() => {
      actualizarFiltros({
        precio_min: precioDesde ? Number(precioDesde) : null,
        precio_max: precioHasta ? Number(precioHasta) : null
      })
    }, 300)

    return () => clearTimeout(timer)
  }, [precioDesde, precioHasta, actualizarFiltros])

  // Aplicación inmediata al cambiar categoría
  const cambiarCategoria = (idCategoria) => {
    setCategoriaSeleccionada(idCategoria)
    // Quita la categoría de la URL al elegir otra manualmente y conserva el término de búsqueda.
    if (categoriaUrl) {
      establecerParametrosBusqueda(terminoBusqueda ? { q: terminoBusqueda } : {})
    }
    actualizarFiltros({ categoria_id: idCategoria })
  }

  // Aplicación inmediata al cambiar checkbox de stock
  const alternarFiltroStock = (evento) => {
    const nuevoStock = evento.target.checked
    setSoloEnStock(nuevoStock)
    actualizarFiltros({ solo_stock: nuevoStock })
  }

  // Aplicación inmediata al cambiar orden
  const cambiarOrden = (evento) => {
    const nuevoOrden = evento.target.value
    setOrden(nuevoOrden)
    actualizarFiltros({ orden: nuevoOrden })
  }

  // Botón para limpiar todos los filtros manualmente
  const limpiarFiltros = () => {
    setCategoriaSeleccionada(null)
    setPrecioDesde('')
    setPrecioHasta('')
    setSoloEnStock(false)
    setOrden('relevancia')
    establecerParametrosBusqueda({})
    resetearFiltros()
  }

  return (
    <div className="catalogo-page-container">
      
      {/* Título de la página */}
      <div className="catalog-header-zone">
        <h1 className="catalog-main-title">Catálogo de periféricos</h1>
        <p className="catalog-subtitle">
          Encuentra teclados, ratones, auriculares y accesorios con entrega directa en Pichincha.
        </p>
      </div>

      {/* Contenedor principal en dos columnas (Sidebar de filtros + Grid de productos) */}
      <div className="catalog-layout">
        
        {/* Barra lateral de filtros reactivos inmediatos */}
        <aside className="catalog-sidebar" aria-labelledby="filtros-heading">
          <div className="filters-form">
            <div className="filters-header-row">
              <h2 id="filtros-heading" className="filters-title">Filtrar productos</h2>
              {(categoriaIdEfectiva !== null || precioDesde || precioHasta || soloEnStock || orden !== 'relevancia') && (
                <button
                  type="button"
                  onClick={limpiarFiltros}
                  className="btn-quick-clear"
                  aria-label="Restablecer filtros"
                >
                  Limpiar
                </button>
              )}
            </div>

            {/* Grupo de Categorías */}
            <fieldset className="filter-group">
              <legend className="filter-legend">Categoría</legend>
              <div className="filter-radio-list">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="categoria"
                    value=""
                    checked={categoriaIdEfectiva === null}
                    onChange={() => cambiarCategoria(null)}
                    className="custom-radio"
                  />
                  <span>Todas</span>
                </label>

                {categorias.map((cat) => (
                  <label key={cat.id} className="radio-label">
                    <input
                      type="radio"
                      name="categoria"
                      value={cat.id}
                      checked={categoriaIdEfectiva === cat.id}
                      onChange={() => cambiarCategoria(cat.id)}
                      className="custom-radio"
                    />
                    <span>{cat.nombre}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {/* Grupo de Rango de Precios (Filtrado automático por debounce) */}
            <fieldset className="filter-group">
              <legend className="filter-legend">Rango de precio</legend>
              <div className="price-inputs-row">
                <div className="input-field">
                  <label htmlFor="precio-desde" className="input-label">Desde</label>
                  <div className="currency-input-wrapper">
                    <span className="currency-prefix" aria-hidden="true">$</span>
                    <input
                      type="number"
                      id="precio-desde"
                      min="0"
                      step="1"
                      placeholder="20"
                      value={precioDesde}
                      onChange={(evento) => setPrecioDesde(evento.target.value)}
                      className="text-input"
                    />
                  </div>
                </div>

                <div className="input-field">
                  <label htmlFor="precio-hasta" className="input-label">Hasta</label>
                  <div className="currency-input-wrapper">
                    <span className="currency-prefix" aria-hidden="true">$</span>
                    <input
                      type="number"
                      id="precio-hasta"
                      min="0"
                      step="1"
                      placeholder="150"
                      value={precioHasta}
                      onChange={(evento) => setPrecioHasta(evento.target.value)}
                      className="text-input"
                    />
                  </div>
                </div>
              </div>
            </fieldset>

            {/* Solo en stock (Filtrado automático) */}
            <div className="filter-checkbox-row">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={soloEnStock}
                  onChange={alternarFiltroStock}
                  className="custom-checkbox"
                />
                <span>Solo en stock</span>
              </label>
            </div>

            {/* Botón único de limpiar filtros */}
            <div className="filter-actions">
              <button
                type="button"
                onClick={limpiarFiltros}
                className="btn-secondary btn-clear-filters"
              >
                Limpiar filtros
              </button>
            </div>
          </div>
        </aside>

        {/* Zona principal de productos */}
        <main className="catalog-main-content" aria-label="Resultados de periféricos">
          
          {/* Barra de control superior: Contador y Orden */}
          <div className="catalog-toolbar">
            <p className="products-counter" role="status" aria-live="polite">
              <strong>{productos.length}</strong> {productos.length === 1 ? 'producto disponible' : 'productos disponibles'}
            </p>

            <div className="sort-control">
              <label htmlFor="select-orden" className="sort-label">Ordenar por:</label>
              <select
                id="select-orden"
                className="sort-select"
                value={orden}
                onChange={cambiarOrden}
              >
                <option value="relevancia">Relevancia</option>
                <option value="precio_asc">Precio: de menor a mayor</option>
                <option value="precio_desc">Precio: de mayor a menor</option>
                <option value="nombre_asc">Nombre: de la A a la Z</option>
              </select>
            </div>
          </div>

          <h2 className="season-subtitle">Disponibles para entrega en Pichincha</h2>

          {/* Listado de tarjetas de productos */}
          {cargando ? (
            <div className="loading-state" role="status" aria-live="polite">
              <div className="spinner" aria-hidden="true" />
              <p>Actualizando resultados...</p>
            </div>
          ) : error ? (
            <div className="error-state" role="alert">
              <p>{error}</p>
            </div>
          ) : productos.length === 0 ? (
            <div className="empty-results-box" role="status">
              <IconoPeriferico tipo="search" size={48} className="empty-icon" />
              <h3>No se encontraron periféricos</h3>
              <p>Intenta ajustar o limpiar los filtros seleccionados para ver más resultados.</p>
              <button type="button" onClick={limpiarFiltros} className="btn-primary">
                Restablecer todos los filtros
              </button>
            </div>
          ) : (
            <div className="products-grid">
              {productos.map((producto) => (
                <TarjetaProducto key={producto.id} producto={producto} />
              ))}
            </div>
          )}

        </main>

      </div>
    </div>
  )
}
