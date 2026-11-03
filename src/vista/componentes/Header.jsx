/**
 * VISTA: encabezado
 * Encabezado inspirado en una tienda en línea, enfocado en la provincia de Pichincha, Ecuador.
 * Barra de búsqueda omnibox integrada con selector de categoría, widgets accesibles y carrito dinámico.
 * Barra de navegación principal limpia con las secciones clave del sitio (HU-01).
 */

import { useState, useRef, useEffect } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useCarrito } from '../../controlador/useCarrito'
import { useAutenticacion } from '../../controlador/useAuth'
import { IconoPeriferico } from './PeripheralIcon'

export function Encabezado() {
  const { cantidadTotal } = useCarrito()
  const { usuario, cerrarSesion } = useAutenticacion()
  const [terminoBusqueda, setTerminoBusqueda] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('')
  const [menuUsuarioAbierto, setMenuUsuarioAbierto] = useState(false)
  const referenciaMenuUsuario = useRef(null)
  const referenciaBotonUsuario = useRef(null)
  const navigate = useNavigate()

  const cerrarMenuConEscape = (evento) => {
    if (evento.key === 'Escape' && menuUsuarioAbierto) {
      evento.preventDefault()
      setMenuUsuarioAbierto(false)
      referenciaBotonUsuario.current?.focus()
    }
  }

  // Cerrar menú de usuario al hacer clic fuera
  useEffect(() => {
    function cerrarMenuAlHacerClicFuera(evento) {
      if (referenciaMenuUsuario.current && !referenciaMenuUsuario.current.contains(evento.target)) {
        setMenuUsuarioAbierto(false)
      }
    }
    document.addEventListener('mousedown', cerrarMenuAlHacerClicFuera)
    return () => document.removeEventListener('mousedown', cerrarMenuAlHacerClicFuera)
  }, [])

  const ejecutarBusqueda = (evento) => {
    evento.preventDefault()
    const termino = terminoBusqueda.trim()
    const parametros = new URLSearchParams()
    if (termino) parametros.set('q', termino)
    if (categoriaFiltro) parametros.set('cat', categoriaFiltro)

    const consulta = parametros.toString()
    navigate(consulta ? `/catalogo?${consulta}` : '/catalogo')
  }

  return (
    <header className="amazon-header" role="banner">
      {/* ========================================================
          1. BARRA SUPERIOR PRINCIPAL
          ======================================================== */}
      <div className="header-main-belt">
        <div className="header-belt-container">
          
          {/* Marca de la tienda */}
          <Link to="/" className="nav-logo-link" aria-label="PERIFÉRICOS - Ir a la página de inicio">
            <IconoPeriferico tipo="logo" size={34} className="nav-brand-icon" />
            <div className="nav-brand-text-group">
              <span className="nav-brand-name">PERIFÉRICOS</span>
              <span className="nav-brand-tag">PICHINCHA • GAMING & PRO</span>
            </div>
          </Link>

          {/* Selector de Entrega Exclusivo para Pichincha */}
          <div className="nav-delivery-widget" tabIndex="0" role="region" aria-label="Zona de cobertura de envíos">
            <span className="nav-icon-pin" aria-hidden="true">📍</span>
            <div className="nav-delivery-text">
              <span className="nav-line-1">
                {usuario.autenticado ? `Enviar a ${usuario.nombre}` : 'Entregas en'}
              </span>
              <span className="nav-line-2">Pichincha, Ecuador</span>
            </div>
          </div>

          {/* Omnibox / Barra de Búsqueda Integrada */}
          <form className="nav-search-bar" role="search" onSubmit={ejecutarBusqueda}>
            <label htmlFor="search-category-select" className="sr-only">
              Seleccionar categoría para buscar
            </label>
            <div className="search-category-wrapper">
              <select
                id="search-category-select"
                className="search-category-dropdown"
                value={categoriaFiltro}
                onChange={(e) => setCategoriaFiltro(e.target.value)}
                aria-label="Filtrar búsqueda por categoría"
              >
                <option value="">Todos</option>
                <option value="teclados">Teclados</option>
                <option value="ratones">Ratones</option>
                <option value="auriculares">Auriculares</option>
                <option value="webcams">Webcams</option>
                <option value="alfombrillas">Alfombrillas</option>
              </select>
              <IconoPeriferico tipo="chevron-down" size={12} className="category-select-arrow" />
            </div>

            <label htmlFor="main-search-input" className="sr-only">
              Buscar teclados, ratones, auriculares y más
            </label>
            <input
              id="main-search-input"
              type="search"
              className="search-textbox"
              placeholder="Buscar periféricos: Logitech, Razer, Corsair..."
              value={terminoBusqueda}
              onChange={(e) => setTerminoBusqueda(e.target.value)}
              autoComplete="off"
            />

            <button
              type="submit"
              className="search-submit-btn"
              aria-label="Ejecutar búsqueda"
            >
              <IconoPeriferico tipo="search" size={20} className="search-icon-svg" />
            </button>
          </form>

          {/* Widget de Usuario y Cuentas */}
          <div
            className="nav-user-widget-wrapper"
            ref={referenciaMenuUsuario}
            onKeyDown={cerrarMenuConEscape}
          >
            <button
              type="button"
              className="nav-two-line-widget"
              ref={referenciaBotonUsuario}
              onClick={() => setMenuUsuarioAbierto(prev => !prev)}
              aria-expanded={menuUsuarioAbierto}
              aria-label={usuario.autenticado ? `Cuenta de ${usuario.nombre}. Opciones de usuario` : 'Identifícate o crea tu cuenta'}
            >
              <span className="nav-line-1">
                {usuario.autenticado ? `Hola, ${usuario.nombre}` : 'Hola, Identifícate'}
              </span>
              <span className="nav-line-2">
                Cuenta y Pedidos <span className="nav-arrow-indicator" aria-hidden="true">▾</span>
              </span>
            </button>

            {menuUsuarioAbierto && (
              <div className="nav-flyout-menu user-flyout">
                <div className="flyout-header">
                  {usuario.autenticado ? (
                    <>
                      <p>Sesión activa: <strong>{usuario.email}</strong></p>
                      <p className="pichincha-user-zone">Zona de entrega: Pichincha</p>
                    </>
                  ) : (
                    <>
                      <p>Modo: <strong>Invitado</strong></p>
                      <p className="pichincha-user-zone">Inicia sesión para guardar tus pedidos</p>
                    </>
                  )}
                </div>
                <ul className="flyout-links-list">
                  {usuario.autenticado ? (
                    <>
                      <li>
                        <Link to="/cuenta" onClick={() => setMenuUsuarioAbierto(false)}>
                          Mi Cuenta y Pedidos
                        </Link>
                      </li>
                      <li>
                        <Link to="/cuenta#direcciones" onClick={() => setMenuUsuarioAbierto(false)}>
                          Mis Direcciones en Quito
                        </Link>
                      </li>
                      <li>
                        <Link to="/cuenta#fiscales" onClick={() => setMenuUsuarioAbierto(false)}>
                          Datos Fiscales y RUC
                        </Link>
                      </li>
                    </>
                  ) : (
                    <>
                      <li>
                        <Link to="/login" onClick={() => setMenuUsuarioAbierto(false)} className="flyout-login-highlight">
                          🔑 Iniciar Sesión
                        </Link>
                      </li>
                      <li>
                        <Link to="/login?mode=register" onClick={() => setMenuUsuarioAbierto(false)}>
                          Crear cuenta nueva
                        </Link>
                      </li>
                    </>
                  )}
                  <li>
                    <Link to="/seguimiento" onClick={() => setMenuUsuarioAbierto(false)}>
                      Estado de mis Pedidos
                    </Link>
                  </li>
                  <li>
                    <Link to="/carrito" onClick={() => setMenuUsuarioAbierto(false)}>
                      Mi Carrito ({cantidadTotal} items)
                    </Link>
                  </li>
                  <li>
                    <Link to="/contacto" onClick={() => setMenuUsuarioAbierto(false)}>
                      Contacto con Soporte
                    </Link>
                  </li>
                  {usuario.autenticado && (
                    <li className="flyout-action-separator">
                      <button
                        type="button"
                        className="flyout-action-btn"
                        onClick={async () => {
                          await cerrarSesion()
                          setMenuUsuarioAbierto(false)
                        }}
                      >
                        Cerrar sesión
                      </button>
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>

          {/* Widget de Pedidos / Rastreo (HU-15) */}
          <Link to="/seguimiento" className="nav-two-line-widget nav-orders-widget">
            <span className="nav-line-1">Rastreo</span>
            <span className="nav-line-2">Mis Pedidos</span>
          </Link>

          {/* Carrito de Compras */}
          <Link
            to="/carrito"
            className="nav-cart-widget"
            aria-label={`Carrito de compras, contiene ${cantidadTotal} ${cantidadTotal === 1 ? 'artículo' : 'artículos'}`}
          >
            <div className="cart-icon-container">
              <IconoPeriferico tipo="cart" size={32} className="cart-svg" />
              <span className={`cart-count-badge ${cantidadTotal > 0 ? 'has-items' : ''}`}>
                {cantidadTotal}
              </span>
            </div>
            <span className="cart-label">Carrito</span>
          </Link>

        </div>
      </div>

      {/* ========================================================
          2. SUB-BARRA DE NAVEGACIÓN PRINCIPAL (HU-01)
          ======================================================== */}
      <nav className="header-sub-belt" aria-label="Navegación principal del sitio">
        <div className="header-belt-container sub-belt-container">
          
          {/* Enlaces de secciones principales (HU-01) */}
          <ul className="sub-belt-links">
            <li>
              <NavLink
                to="/"
                className={({ isActive }) => `sub-link ${isActive ? 'active' : ''}`}
                end
              >
                Inicio
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/catalogo"
                className={({ isActive }) => `sub-link ${isActive ? 'active' : ''}`}
              >
                Catálogo
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/seguimiento"
                className={({ isActive }) => `sub-link ${isActive ? 'active' : ''}`}
              >
                Seguimiento de Pedido
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/contacto"
                className={({ isActive }) => `sub-link ${isActive ? 'active' : ''}`}
              >
                Contacto
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/faq"
                className={({ isActive }) => `sub-link ${isActive ? 'active' : ''}`}
              >
                Ayuda / FAQ
              </NavLink>
            </li>
            <li>
              <NavLink
                to={usuario.autenticado ? "/cuenta" : "/login"}
                className={({ isActive }) => `sub-link ${isActive ? 'active' : ''}`}
              >
                {usuario.autenticado ? "Mi Cuenta" : "Iniciar Sesión"}
              </NavLink>
            </li>
          </ul>

        </div>
      </nav>
    </header>
  )
}
