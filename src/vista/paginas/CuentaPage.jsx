/**
 * VISTA: CuentaPage.jsx
 * Gestión integral de cuenta de usuario:
 * - Gestionar Direcciones de entrega en Quito (Release 1).
 * - Gestionar Datos Fiscales con Cédula/RUC (Release 2).
 * - Cambio de Correo y Perfil (Release 2) / Recuperación de Contraseña (Release 1).
 * - Historial de Pedidos con Filtros de Búsqueda y Estado (Release 1 / Release 2).
 */

import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAutenticacion } from '../../controlador/useAuth'
import { CheckoutModelo, SECTORES_QUITO } from '../../modelo/checkoutModelo'
import { validarIdentificacion } from '../../modelo/validadorModelo'
import { IconoPeriferico } from '../componentes/PeripheralIcon'

export function PaginaCuenta() {
  const { usuario, actualizarPerfil, cerrarSesion, recuperarContrasena } = useAutenticacion()
  const navigate = useNavigate()
  const location = useLocation()

  // Determinar pestaña activa desde hash o estado
  const obtenerPestanaInicial = () => {
    if (location.hash === '#fiscales') return 'fiscales'
    if (location.hash === '#direcciones') return 'direcciones'
    if (location.hash === '#seguridad') return 'seguridad'
    if (location.hash === '#pedidos') return 'pedidos'
    return 'pedidos'
  }

  const [pestanaActiva, setPestanaActiva] = useState(obtenerPestanaInicial)

  // 1. Estado de Direcciones
  const [direcciones, setDirecciones] = useState([])
  const [modoNuevaDireccion, setModoNuevaDireccion] = useState(false)
  const [formDireccion, setFormDireccion] = useState({
    alias: '',
    sector: SECTORES_QUITO[0],
    calle_principal: '',
    numeracion: '',
    referencia: '',
    es_predeterminada: false
  })
  const [erroresDir, setErroresDir] = useState({})

  // 2. Estado de Fiscales
  const [datosFiscales, setDatosFiscales] = useState([])
  const [modoNuevoFiscal, setModoNuevoFiscal] = useState(false)
  const [formFiscal, setFormFiscal] = useState({
    tipo: 'cedula',
    identificacion_fiscal: '',
    razon_social: '',
    direccion_fiscal: '',
    es_predeterminado: false
  })
  const [erroresFisc, setErroresFisc] = useState({})

  // 3. Estado de Perfil y Cambio de Correo
  const [nombreEditado, setNombreEditado] = useState(usuario?.nombre || '')
  const [correoEditado, setCorreoEditado] = useState(usuario?.email || '')
  const [mensajePerfil, setMensajePerfil] = useState('')

  // 4. Estado de Historial de Pedidos y Filtros
  const [historialPedidos, setHistorialPedidos] = useState([])
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [busquedaPedido, setBusquedaPedido] = useState('')

  useEffect(() => {
    let activo = true

    Promise.all([
      CheckoutModelo.obtenerDirecciones(usuario),
      CheckoutModelo.obtenerDatosFiscales(usuario),
      CheckoutModelo.obtenerHistorialPedidos()
    ]).then(([dirs, fisc, hist]) => {
      if (!activo) return
      setDirecciones(dirs)
      setDatosFiscales(fisc)
      setHistorialPedidos(hist)
    }).catch(err => {
      if (activo) console.warn('Error al cargar datos de cuenta:', err)
    })

    return () => {
      activo = false
    }
  }, [usuario])

  // Redirigir a login si es invitado
  if (!usuario?.autenticado) {
    return (
      <div className="account-page-container">
        <div className="empty-cart-card" role="region" aria-label="Acceso a cuenta requerido">
          <IconoPeriferico tipo="user" size={64} className="empty-cart-icon" />
          <h1>Inicia sesión para gestionar tu cuenta</h1>
          <p>Debes acceder con tus credenciales para administrar tus direcciones de entrega, perfiles fiscales e historial de pedidos.</p>
          <div className="actions-row mt-4">
            <Link to="/login?redirect=/cuenta" className="btn-primary">
              Iniciar sesión o Registrarse
            </Link>
            <Link to="/catalogo" className="btn-secondary">
              Volver al catálogo
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // --- Manejadores de Direcciones ---
  const guardarDireccion = async (e) => {
    e.preventDefault()
    const errores = {}
    if (!formDireccion.calle_principal.trim()) {
      errores.calle_principal = 'La calle principal es obligatoria.'
    }
    if (!formDireccion.numeracion.trim()) {
      errores.numeracion = 'La numeración o intersección es obligatoria.'
    }
    if (Object.keys(errores).length > 0) {
      setErroresDir(errores)
      return
    }

    const actualizadas = await CheckoutModelo.guardarDireccion(formDireccion, usuario)
    setDirecciones(actualizadas)
    setModoNuevaDireccion(false)
    setFormDireccion({
      alias: '',
      sector: SECTORES_QUITO[0],
      calle_principal: '',
      numeracion: '',
      referencia: '',
      es_predeterminada: false
    })
    setErroresDir({})
  }

  const borrarDireccion = async (id) => {
    const actualizadas = await CheckoutModelo.eliminarDireccion(id, usuario)
    setDirecciones(actualizadas)
  }

  const fijarDireccionPredeterminada = async (id) => {
    const actualizadas = await CheckoutModelo.establecerDireccionPredeterminada(id, usuario)
    setDirecciones(actualizadas)
  }

  // --- Manejadores de Fiscales ---
  const guardarFiscal = async (e) => {
    e.preventDefault()
    const errores = {}
    if (!formFiscal.identificacion_fiscal.trim()) {
      errores.identificacion_fiscal = 'El número de identificación es obligatorio.'
    } else {
      const validacion = validarIdentificacion(formFiscal.identificacion_fiscal, formFiscal.tipo)
      if (!validacion.esValida) {
        errores.identificacion_fiscal = validacion.mensaje
      }
    }
    if (!formFiscal.razon_social.trim()) {
      errores.razon_social = 'La razón social o nombre es obligatorio.'
    }
    if (Object.keys(errores).length > 0) {
      setErroresFisc(errores)
      return
    }

    const actualizados = await CheckoutModelo.guardarDatoFiscal(formFiscal, usuario)
    setDatosFiscales(actualizados)
    setModoNuevoFiscal(false)
    setFormFiscal({
      tipo: 'cedula',
      identificacion_fiscal: '',
      razon_social: '',
      direccion_fiscal: '',
      es_predeterminado: false
    })
    setErroresFisc({})
  }

  const borrarFiscal = async (id) => {
    const actualizados = await CheckoutModelo.eliminarDatoFiscal(id, usuario)
    setDatosFiscales(actualizados)
  }

  const fijarFiscalPredeterminado = async (id) => {
    const actualizados = await CheckoutModelo.establecerDatoFiscalPredeterminado(id, usuario)
    setDatosFiscales(actualizados)
  }

  // --- Manejador de Perfil ---
  const guardarPerfil = async (e) => {
    e.preventDefault()
    setMensajePerfil('')
    try {
      await actualizarPerfil({ nombre: nombreEditado, email: correoEditado })
      setMensajePerfil('✓ Perfil actualizado con éxito.')
      setTimeout(() => setMensajePerfil(''), 4000)
    } catch {
      setMensajePerfil('Ocurrió un error al guardar los cambios.')
    }
  }

  const enviarRecuperacion = async () => {
    try {
      await recuperarContrasena(usuario.email)
      setMensajePerfil(`✓ Enlace de restablecimiento de contraseña enviado a ${usuario.email}.`)
    } catch {
      setMensajePerfil('No se pudo enviar el correo de recuperación.')
    }
  }

  // --- Filtros de Historial de Pedidos ---
  const pedidosFiltrados = historialPedidos.filter((pedido) => {
    // Filtro por estado
    if (filtroEstado !== 'todos') {
      const estado = pedido.estadoActual?.toLowerCase() || ''
      if (filtroEstado === 'preparacion' && !estado.includes('preparación') && !estado.includes('preparacion')) return false
      if (filtroEstado === 'camino' && !estado.includes('camino') && !estado.includes('despachado')) return false
      if (filtroEstado === 'entregado' && !estado.includes('entregado')) return false
    }
    // Filtro por texto
    if (busquedaPedido.trim()) {
      const termino = busquedaPedido.trim().toLowerCase()
      const coincideCodigo = pedido.codigo?.toLowerCase().includes(termino)
      const coincideArticulo = pedido.articulos?.some(a => a.nombre?.toLowerCase().includes(termino))
      return coincideCodigo || coincideArticulo
    }
    return true
  })

  return (
    <div className="account-page-container">
      {/* Encabezado de la Cuenta */}
      <div className="account-header-zone">
        <div className="account-user-banner">
          <div className="user-avatar-circle" aria-hidden="true">
            {usuario.nombre ? usuario.nombre.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="user-banner-text">
            <h1 className="account-main-title">Mi Cuenta: {usuario.nombre}</h1>
            <p className="account-email-legend">
              Sesión activa: <strong>{usuario.email}</strong> • Cobertura: Quito, Pichincha
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={async () => {
            await cerrarSesion()
            navigate('/')
          }}
          className="btn-secondary btn-logout"
          aria-label="Cerrar sesión de mi cuenta"
        >
          Cerrar sesión
        </button>
      </div>

      {/* Navegación por pestañas accesibles */}
      <div className="account-tabs-wrapper" role="tablist" aria-label="Secciones de mi cuenta">
        <button
          type="button"
          role="tab"
          id="tab-pedidos-btn"
          aria-selected={pestanaActiva === 'pedidos'}
          aria-controls="panel-pedidos"
          className={`account-tab-btn ${pestanaActiva === 'pedidos' ? 'active' : ''}`}
          onClick={() => setPestanaActiva('pedidos')}
        >
          📦 Historial de Pedidos ({historialPedidos.length})
        </button>

        <button
          type="button"
          role="tab"
          id="tab-direcciones-btn"
          aria-selected={pestanaActiva === 'direcciones'}
          aria-controls="panel-direcciones"
          className={`account-tab-btn ${pestanaActiva === 'direcciones' ? 'active' : ''}`}
          onClick={() => setPestanaActiva('direcciones')}
        >
          📍 Mis Direcciones en Quito ({direcciones.length})
        </button>

        <button
          type="button"
          role="tab"
          id="tab-fiscales-btn"
          aria-selected={pestanaActiva === 'fiscales'}
          aria-controls="panel-fiscales"
          className={`account-tab-btn ${pestanaActiva === 'fiscales' ? 'active' : ''}`}
          onClick={() => setPestanaActiva('fiscales')}
        >
          📄 Datos Fiscales y RUC ({datosFiscales.length})
        </button>

        <button
          type="button"
          role="tab"
          id="tab-seguridad-btn"
          aria-selected={pestanaActiva === 'seguridad'}
          aria-controls="panel-seguridad"
          className={`account-tab-btn ${pestanaActiva === 'seguridad' ? 'active' : ''}`}
          onClick={() => setPestanaActiva('seguridad')}
        >
          ⚙️ Perfil y Seguridad
        </button>
      </div>

      {/* ========================================================
          PANEL 1: HISTORIAL DE PEDIDOS CON FILTROS (Release 1 / Release 2)
          ======================================================== */}
      {pestanaActiva === 'pedidos' && (
        <section
          id="panel-pedidos"
          role="tabpanel"
          aria-labelledby="tab-pedidos-btn"
          className="account-panel-card"
        >
          <div className="panel-header-toolbar">
            <div>
              <h2 className="panel-title">Historial de mis Pedidos</h2>
              <p className="panel-subtitle">Consulta y filtra el estado de despacho de tus periféricos comprados.</p>
            </div>

            {/* Controles de Búsqueda y Filtro de Estado (Release 2) */}
            <div className="orders-filter-controls">
              <label htmlFor="search-order-input" className="sr-only">Buscar pedido por código o producto</label>
              <input
                type="search"
                id="search-order-input"
                placeholder="Buscar por código (#ORD) o periférico..."
                value={busquedaPedido}
                onChange={(e) => setBusquedaPedido(e.target.value)}
                className="filter-search-input"
              />

              <label htmlFor="filter-status-select" className="sr-only">Filtrar por estado del pedido</label>
              <select
                id="filter-status-select"
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="filter-status-dropdown"
              >
                <option value="todos">Todos los estados</option>
                <option value="preparacion">En preparación</option>
                <option value="camino">En camino (Quito)</option>
                <option value="entregado">Entregado</option>
              </select>
            </div>
          </div>

          {pedidosFiltrados.length === 0 ? (
            <div className="empty-panel-box">
              <IconoPeriferico tipo="cart" size={48} />
              <p>No se encontraron pedidos con los criterios de búsqueda aplicados.</p>
              {historialPedidos.length === 0 && (
                <Link to="/catalogo" className="btn-primary mt-2">
                  Explorar catálogo de periféricos
                </Link>
              )}
            </div>
          ) : (
            <div className="orders-history-list">
              {pedidosFiltrados.map((pedido) => (
                <article key={pedido.codigo} className="order-history-card">
                  <div className="order-history-header">
                    <div>
                      <span className="order-code-badge">#{pedido.codigo}</span>
                      <span className="order-date-text">
                        Fecha: {pedido.fecha} {pedido.hora ? `• ${pedido.hora}` : ''}
                      </span>
                    </div>
                    <div className="order-status-badge-group">
                      <span className="status-pill status-in-progress">
                        {pedido.estadoActual || 'En preparación'}
                      </span>
                      <strong className="order-total-badge">
                        ${Number(pedido.totales?.total || 0).toFixed(2)}
                      </strong>
                    </div>
                  </div>

                  <div className="order-history-body">
                    <div className="order-items-compact-list">
                      <strong>Artículos:</strong>
                      <ul>
                        {(pedido.articulos || []).map((art, idx) => (
                          <li key={idx}>
                            {art.cantidad}x {art.nombre} (${Number(art.precio).toFixed(2)})
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="order-address-compact">
                      <strong>Destino de entrega:</strong>
                      <p>
                        {pedido.direccionEnvio?.callePrincipal || pedido.direccionEnvio?.calle_principal || 'Dirección de Quito'}, {pedido.direccionEnvio?.sector || 'Pichincha'}
                      </p>
                    </div>
                  </div>

                  <div className="order-history-actions">
                    <Link
                      to={`/seguimiento?orden=${pedido.codigo}`}
                      className="btn-primary btn-track-link"
                      aria-label={`Rastrear pedido ${pedido.codigo} en tiempo real`}
                    >
                      <IconoPeriferico tipo="truck" size={16} />
                      <span>Rastrear despacho (#{pedido.codigo})</span>
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ========================================================
          PANEL 2: GESTIONAR DIRECCIONES EN QUITO (Release 1)
          ======================================================== */}
      {pestanaActiva === 'direcciones' && (
        <section
          id="panel-direcciones"
          role="tabpanel"
          aria-labelledby="tab-direcciones-btn"
          className="account-panel-card"
        >
          <div className="panel-header-toolbar">
            <div>
              <h2 className="panel-title">Gestionar Direcciones de Entrega</h2>
              <p className="panel-subtitle">Administra tus ubicaciones residenciales y corporativas en Quito y Pichincha.</p>
            </div>
            {!modoNuevaDireccion && (
              <button
                type="button"
                className="btn-primary"
                onClick={() => setModoNuevaDireccion(true)}
              >
                + Nueva dirección en Quito
              </button>
            )}
          </div>

          {modoNuevaDireccion && (
            <form onSubmit={guardarDireccion} className="account-add-form" aria-label="Agregar nueva dirección">
              <h3 className="new-entry-title">Registrar nueva dirección en Quito</h3>
              
              <div className="form-field">
                <label htmlFor="cta-dir-sector">Sector de Quito *</label>
                <select
                  id="cta-dir-sector"
                  value={formDireccion.sector}
                  onChange={(e) => setFormDireccion({ ...formDireccion, sector: e.target.value })}
                  className="form-input"
                  required
                >
                  {SECTORES_QUITO.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="form-grid-2">
                <div className="form-field">
                  <label htmlFor="cta-dir-calle">Calle Principal *</label>
                  <input
                    type="text"
                    id="cta-dir-calle"
                    placeholder="Ej: Av. Naciones Unidas"
                    value={formDireccion.calle_principal}
                    onChange={(e) => setFormDireccion({ ...formDireccion, calle_principal: e.target.value })}
                    className="form-input"
                    required
                  />
                  {erroresDir.calle_principal && <span className="field-error-text">{erroresDir.calle_principal}</span>}
                </div>

                <div className="form-field">
                  <label htmlFor="cta-dir-num">Numeración / Intersección *</label>
                  <input
                    type="text"
                    id="cta-dir-num"
                    placeholder="Ej: E2-45 y Shyris"
                    value={formDireccion.numeracion}
                    onChange={(e) => setFormDireccion({ ...formDireccion, numeracion: e.target.value })}
                    className="form-input"
                    required
                  />
                  {erroresDir.numeracion && <span className="field-error-text">{erroresDir.numeracion}</span>}
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-field">
                  <label htmlFor="cta-dir-alias">Alias de la dirección</label>
                  <input
                    type="text"
                    id="cta-dir-alias"
                    placeholder="Ej: Casa, Oficina, Taller"
                    value={formDireccion.alias}
                    onChange={(e) => setFormDireccion({ ...formDireccion, alias: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="cta-dir-ref">Referencia de entrega</label>
                  <input
                    type="text"
                    id="cta-dir-ref"
                    placeholder="Ej: Portón negro frente a la farmacia"
                    value={formDireccion.referencia}
                    onChange={(e) => setFormDireccion({ ...formDireccion, referencia: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-checkbox-row">
                <label className="checkbox-inline-label">
                  <input
                    type="checkbox"
                    checked={formDireccion.es_predeterminada}
                    onChange={(e) => setFormDireccion({ ...formDireccion, es_predeterminada: e.target.checked })}
                    className="cart-checkbox"
                  />
                  <span>Establecer como dirección predeterminada</span>
                </label>
              </div>

              <div className="form-buttons-row">
                <button type="submit" className="btn-primary">Guardar dirección</button>
                <button type="button" className="btn-secondary" onClick={() => setModoNuevaDireccion(false)}>Cancelar</button>
              </div>
            </form>
          )}

          <div className="cards-grid-2">
            {direcciones.map((dir) => (
              <div key={dir.id} className="address-display-card">
                <div className="card-top-row">
                  <strong className="alias-badge">{dir.alias}</strong>
                  {dir.es_predeterminada ? (
                    <span className="default-pill-badge">Predeterminada</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fijarDireccionPredeterminada(dir.id)}
                      className="btn-set-default"
                    >
                      Hacer predeterminada
                    </button>
                  )}
                </div>
                <p className="address-text-main">{dir.calle_principal} {dir.numeracion}</p>
                <p className="address-text-sub">📍 Sector: {dir.sector}, Quito, Pichincha</p>
                {dir.referencia && <p className="address-ref">Ref: {dir.referencia}</p>}

                <div className="card-actions-bottom">
                  <button
                    type="button"
                    onClick={() => borrarDireccion(dir.id)}
                    className="btn-delete-card"
                    aria-label={`Eliminar dirección ${dir.alias}`}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ========================================================
          PANEL 3: GESTIONAR DATOS FISCALES (Release 2)
          ======================================================== */}
      {pestanaActiva === 'fiscales' && (
        <section
          id="panel-fiscales"
          role="tabpanel"
          aria-labelledby="tab-fiscales-btn"
          className="account-panel-card"
        >
          <div className="panel-header-toolbar">
            <div>
              <h2 className="panel-title">Datos Fiscales para Facturación</h2>
              <p className="panel-subtitle">Administra tus perfiles de Cédula o RUC ecuatoriano para emisión de facturas electrónicas.</p>
            </div>
            {!modoNuevoFiscal && (
              <button
                type="button"
                className="btn-primary"
                onClick={() => setModoNuevoFiscal(true)}
              >
                + Nuevo perfil fiscal
              </button>
            )}
          </div>

          {modoNuevoFiscal && (
            <form onSubmit={guardarFiscal} className="account-add-form" aria-label="Agregar datos fiscales">
              <h3 className="new-entry-title">Registrar datos de facturación</h3>

              <div className="form-grid-2">
                <div className="form-field">
                  <label htmlFor="cta-fisc-tipo">Tipo de Identificación *</label>
                  <select
                    id="cta-fisc-tipo"
                    value={formFiscal.tipo}
                    onChange={(e) => setFormFiscal({ ...formFiscal, tipo: e.target.value })}
                    className="form-input"
                  >
                    <option value="cedula">Cédula de Identidad (10 dígitos)</option>
                    <option value="ruc">RUC (13 dígitos)</option>
                  </select>
                </div>

                <div className="form-field">
                  <label htmlFor="cta-fisc-id">
                    {formFiscal.tipo === 'ruc' ? 'Número de RUC' : 'Número de Cédula'} *
                  </label>
                  <input
                    type="text"
                    id="cta-fisc-id"
                    placeholder={formFiscal.tipo === 'ruc' ? '1792145678001' : '1723456789'}
                    maxLength={formFiscal.tipo === 'ruc' ? 13 : 10}
                    value={formFiscal.identificacion_fiscal}
                    onChange={(e) => setFormFiscal({ ...formFiscal, identificacion_fiscal: e.target.value })}
                    className="form-input"
                    required
                  />
                  {erroresFisc.identificacion_fiscal && (
                    <span className="field-error-text">{erroresFisc.identificacion_fiscal}</span>
                  )}
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="cta-fisc-razon">Razón Social o Nombre Completo *</label>
                <input
                  type="text"
                  id="cta-fisc-razon"
                  placeholder="Ej: Luis Morales Arciniegas"
                  value={formFiscal.razon_social}
                  onChange={(e) => setFormFiscal({ ...formFiscal, razon_social: e.target.value })}
                  className="form-input"
                  required
                />
                {erroresFisc.razon_social && <span className="field-error-text">{erroresFisc.razon_social}</span>}
              </div>

              <div className="form-field">
                <label htmlFor="cta-fisc-dir">Dirección fiscal en Pichincha</label>
                <input
                  type="text"
                  id="cta-fisc-dir"
                  placeholder="Ej: Av. República del Salvador N36-84, Quito"
                  value={formFiscal.direccion_fiscal}
                  onChange={(e) => setFormFiscal({ ...formFiscal, direccion_fiscal: e.target.value })}
                  className="form-input"
                />
              </div>

              <div className="form-checkbox-row">
                <label className="checkbox-inline-label">
                  <input
                    type="checkbox"
                    checked={formFiscal.es_predeterminado}
                    onChange={(e) => setFormFiscal({ ...formFiscal, es_predeterminado: e.target.checked })}
                    className="cart-checkbox"
                  />
                  <span>Establecer como perfil fiscal predeterminado</span>
                </label>
              </div>

              <div className="form-buttons-row">
                <button type="submit" className="btn-primary">Guardar perfil fiscal</button>
                <button type="button" className="btn-secondary" onClick={() => setModoNuevoFiscal(false)}>Cancelar</button>
              </div>
            </form>
          )}

          <div className="cards-grid-2">
            {datosFiscales.map((fisc) => (
              <div key={fisc.id} className="address-display-card">
                <div className="card-top-row">
                  <strong className="alias-badge">{fisc.razon_social}</strong>
                  {fisc.es_predeterminado ? (
                    <span className="default-pill-badge">Predeterminado</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fijarFiscalPredeterminado(fisc.id)}
                      className="btn-set-default"
                    >
                      Hacer predeterminado
                    </button>
                  )}
                </div>
                <p className="address-text-main">
                  <strong>{fisc.tipo === 'ruc' ? 'RUC' : 'Cédula'}:</strong> {fisc.identificacion_fiscal}
                </p>
                {fisc.direccion_fiscal && (
                  <p className="address-text-sub">Dirección: {fisc.direccion_fiscal}</p>
                )}

                <div className="card-actions-bottom">
                  <button
                    type="button"
                    onClick={() => borrarFiscal(fisc.id)}
                    className="btn-delete-card"
                    aria-label={`Eliminar perfil fiscal ${fisc.razon_social}`}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ========================================================
          PANEL 4: PERFIL Y SEGURIDAD (Release 1 y Release 2)
          ======================================================== */}
      {pestanaActiva === 'seguridad' && (
        <section
          id="panel-seguridad"
          role="tabpanel"
          aria-labelledby="tab-seguridad-btn"
          className="account-panel-card"
        >
          <div className="panel-header-toolbar">
            <div>
              <h2 className="panel-title">Perfil y Cambio de Correo</h2>
              <p className="panel-subtitle">Administra tus datos personales y credenciales de acceso a la tienda.</p>
            </div>
          </div>

          {mensajePerfil && (
            <div className="auth-alert auth-alert-success" role="status" aria-live="polite">
              <span className="alert-icon" aria-hidden="true">✓</span>
              <p>{mensajePerfil}</p>
            </div>
          )}

          <form onSubmit={guardarPerfil} className="account-profile-form">
            <div className="form-grid-2">
              <div className="form-field">
                <label htmlFor="perfil-nombre">Nombre y Apellido *</label>
                <input
                  type="text"
                  id="perfil-nombre"
                  value={nombreEditado}
                  onChange={(e) => setNombreEditado(e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="perfil-correo">Correo Electrónico (Cambio de Correo) *</label>
                <input
                  type="email"
                  id="perfil-correo"
                  value={correoEditado}
                  onChange={(e) => setCorreoEditado(e.target.value)}
                  className="form-input"
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn-primary">
              Guardar cambios de perfil
            </button>
          </form>

          <hr className="detail-divider my-6" />

          {/* Sección de Recuperación y Seguridad */}
          <div className="security-subbox">
            <h3 className="new-entry-title">Seguridad y Restablecimiento de Contraseña</h3>
            <p className="security-desc">
              Si deseas cambiar tu contraseña de acceso, te enviaremos un correo de verificación seguro.
            </p>
            <button
              type="button"
              onClick={enviarRecuperacion}
              className="btn-secondary"
            >
              Enviar correo para restablecer contraseña
            </button>
          </div>
        </section>
      )}

    </div>
  )
}
