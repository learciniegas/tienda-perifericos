/**
 * VISTA: CheckoutPage.jsx
 * Flujo de Checkout transaccional para la primera release (HU-05, HU-07, HU-08).
 * Diseñado con experiencia de compra profesional y validación de pago en el cliente.
 */

import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCheckout } from '../../controlador/useCheckout'
import { useAutenticacion } from '../../controlador/useAuth'
import { IconoPeriferico } from '../componentes/PeripheralIcon'

export function PaginaCheckout() {
  const { usuario } = useAutenticacion()
  const [correoReenviado, setCorreoReenviado] = useState(false)
  const navigate = useNavigate()

  const {
    // Direcciones
    direcciones,
    direccionSeleccionadaId,
    setDireccionSeleccionadaId,
    direccionSeleccionada,
    modoNuevaDireccion,
    setModoNuevaDireccion,
    formNuevaDireccion,
    actualizarCampoNuevaDireccion,
    guardarNuevaDireccion,
    erroresDireccion,
    sectoresQuito,

    // Fiscales
    datosFiscales,
    fiscalSeleccionadoId,
    setFiscalSeleccionadoId,
    fiscalSeleccionado,
    modoNuevoFiscal,
    setModoNuevoFiscal,
    formNuevoFiscal,
    actualizarCampoNuevoFiscal,
    guardarNuevoDatoFiscal,
    erroresFiscal,

    // Pago con tarjeta
    datosTarjeta,
    marcaTarjeta,
    erroresPago,
    actualizarCampoTarjeta,

    // Transacción y resultado
    articulosSeleccionados,
    totales,
    cargandoInicial,
    procesando,
    errorTransaccion,
    ordenConfirmada,
    confirmarCompra
  } = useCheckout()

  // Proteger checkout: redirigir a inicio de sesión si no hay usuario autenticado (HU-08)
  useEffect(() => {
    if (!usuario?.autenticado && !ordenConfirmada && !cargandoInicial) {
      navigate('/login?redirect=/checkout', { replace: true })
    }
  }, [usuario?.autenticado, ordenConfirmada, cargandoInicial, navigate])

  // 1. Pantalla de Comprobante / Confirmación de Pedido (HU-08)
  if (ordenConfirmada) {
    return (
      <div className="checkout-page-container">
        <div className="receipt-container" role="region" aria-label="Comprobante de compra generado">
          
          <div className="receipt-success-banner">
            <div className="receipt-icon-badge" aria-hidden="true">✓</div>
            <div className="receipt-banner-text">
              <span className="receipt-badge-label">TRANSACCIÓN COMPLETADA</span>
              <h1 className="receipt-main-title">¡Gracias por tu compra en Periféricos Quito!</h1>
              <p className="receipt-subtitle">
                Tu pedido ha sido registrado con éxito en nuestro sistema de inventario de Pichincha.
              </p>
            </div>
          </div>

          <div className="receipt-card-paper">
            {/* Cabecera del Comprobante */}
            <div className="receipt-paper-header">
              <div className="receipt-store-branding">
                <span className="receipt-brand-name">PERIFÉRICOS • PICHINCHA</span>
                <span className="receipt-legal-legend">RUC: 1792145678001 • Matriz: Quito, Ecuador</span>
                <span className="receipt-support-email">soporte@perifericosquito.com</span>
              </div>
              <div className="receipt-code-block">
                <span className="receipt-code-label">Comprobante de Pedido:</span>
                <strong className="receipt-order-code">#{ordenConfirmada.codigo}</strong>
                <span className="receipt-date-time">
                  Fecha: {ordenConfirmada.fecha} - {ordenConfirmada.hora}
                </span>
              </div>
            </div>

            <hr className="receipt-divider" />

            {/* Datos del Cliente y Facturación */}
            <div className="receipt-info-grid">
              <div className="receipt-info-column">
                <h2 className="receipt-section-heading">Datos de Facturación</h2>
                <p><strong>Razón Social / Nombre:</strong> {ordenConfirmada.datosFiscales.razonSocial}</p>
                <p><strong>{ordenConfirmada.datosFiscales.tipo}:</strong> {ordenConfirmada.datosFiscales.identificacion}</p>
                <p><strong>Dirección Fiscal:</strong> {ordenConfirmada.datosFiscales.direccionFiscal}</p>
                <p><strong>Correo de Contacto:</strong> {ordenConfirmada.cliente.correo}</p>
              </div>

              <div className="receipt-info-column">
                <h2 className="receipt-section-heading">Dirección de Entrega (Quito)</h2>
                <p><strong>Sector:</strong> {ordenConfirmada.direccionEnvio.sector}</p>
                <p><strong>Calle Principal:</strong> {ordenConfirmada.direccionEnvio.callePrincipal}</p>
                <p><strong>Numeración:</strong> {ordenConfirmada.direccionEnvio.numeracion}</p>
                <p><strong>Referencia:</strong> {ordenConfirmada.direccionEnvio.referencia}</p>
              </div>
            </div>

            {/* Detalle de Artículos Comprados */}
            <div className="receipt-table-wrapper">
              <h2 className="receipt-section-heading">Detalle de Periféricos</h2>
              <table className="receipt-table" aria-label="Lista de periféricos comprados">
                <thead>
                  <tr>
                    <th scope="col">Periférico</th>
                    <th scope="col" className="text-center">Cant.</th>
                    <th scope="col" className="text-right">Precio unitario</th>
                    <th scope="col" className="text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {ordenConfirmada.articulos.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.nombre}</strong>
                        <span className="receipt-item-cat"> ({item.categoria})</span>
                      </td>
                      <td className="text-center">{item.cantidad}</td>
                      <td className="text-right">${item.precio.toFixed(2)}</td>
                      <td className="text-right">${item.subtotal.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totales y Método de Pago */}
            <div className="receipt-bottom-grid">
              <div className="receipt-payment-summary">
                <h2 className="receipt-section-heading">Método de Pago</h2>
                <p><strong>Modalidad:</strong> Tarjeta de crédito / débito</p>
                <p><strong>Tarjeta:</strong> {ordenConfirmada.marcaTarjeta.toUpperCase()} terminada en <strong>**** {ordenConfirmada.ultimosDigitosTarjeta}</strong></p>
                <p><strong>Ref. Transacción:</strong> <code>{ordenConfirmada.referenciaPago}</code></p>
              </div>

              <div className="receipt-totals-box">
                <dl className="receipt-totals-list">
                  <div className="receipt-total-row">
                    <dt>Subtotal:</dt>
                    <dd>${ordenConfirmada.totales.subtotal.toFixed(2)}</dd>
                  </div>
                  <div className="receipt-total-row">
                    <dt>Costo de Envío a Quito:</dt>
                    <dd>
                      {ordenConfirmada.totales.envio === 0 ? (
                        <span className="free-badge">Gratis</span>
                      ) : (
                        `$${ordenConfirmada.totales.envio.toFixed(2)}`
                      )}
                    </dd>
                  </div>
                  <div className="receipt-total-row">
                    <dt>IVA estimado (15%):</dt>
                    <dd>${ordenConfirmada.totales.impuestos.toFixed(2)}</dd>
                  </div>
                  <div className="receipt-total-row receipt-final-total">
                    <dt>Total Pagado:</dt>
                    <dd>${ordenConfirmada.totales.total.toFixed(2)}</dd>
                  </div>
                </dl>
              </div>
            </div>

          </div>

          {/* Confirmación con Correo Electrónico Oficial (Release 3) */}
          <div className="receipt-email-confirmation-box" role="region" aria-label="Confirmación oficial por correo electrónico">
            <div className="email-conf-header">
              <span className="email-conf-icon" aria-hidden="true">📧</span>
              <div>
                <strong className="email-conf-title">
                  Confirmación de orden y factura electrónica despachada por correo
                </strong>
                <p className="email-conf-desc">
                  Hemos enviado la confirmación de compra, el desglose de artículos y el comprobante con validez tributaria a{' '}
                  <strong>{ordenConfirmada.cliente.correo}</strong>.
                </p>
              </div>
            </div>

            <div className="email-conf-actions">
              <button
                type="button"
                className="btn-secondary btn-resend-email"
                onClick={() => {
                  setCorreoReenviado(true)
                  setTimeout(() => setCorreoReenviado(false), 5000)
                }}
                aria-label={`Reenviar comprobante por correo a ${ordenConfirmada.cliente.correo}`}
              >
                {correoReenviado ? '✓ Correo reenviado' : 'Reenviar comprobante por correo'}
              </button>

              {correoReenviado && (
                <span className="email-sent-badge" role="status" aria-live="polite">
                  ✓ Se envió una copia adicional a {ordenConfirmada.cliente.correo}
                </span>
              )}
            </div>
          </div>

          {/* Acciones del Comprobante */}
          <div className="receipt-actions-row">
            <button
              type="button"
              className="btn-primary"
              onClick={() => navigate(`/seguimiento?orden=${ordenConfirmada.codigo}`)}
              aria-label={`Rastrear pedido ${ordenConfirmada.codigo} ahora`}
            >
              <IconoPeriferico tipo="truck" size={20} />
              <span>Rastrear mi pedido (#{ordenConfirmada.codigo})</span>
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={() => window.print()}
              aria-label="Imprimir comprobante de venta"
            >
              🖨️ Imprimir comprobante
            </button>

            <Link to="/catalogo" className="btn-secondary">
              Continuar en el catálogo
            </Link>
          </div>

        </div>
      </div>
    )
  }

  // 2. Pantalla si no hay artículos seleccionados
  if (!cargandoInicial && (!articulosSeleccionados || articulosSeleccionados.length === 0)) {
    return (
      <div className="checkout-page-container">
        <div className="empty-cart-card">
          <IconoPeriferico tipo="cart" size={64} className="empty-cart-icon" />
          <h1>No hay artículos seleccionados para comprar</h1>
          <p>Debes seleccionar al menos un producto en tu carrito de compras antes de continuar al checkout.</p>
          <Link to="/carrito" className="btn-primary">
            Ir a mi Carrito de Compras
          </Link>
        </div>
      </div>
    )
  }

  // 3. Formulario principal de Checkout
  return (
    <div className="checkout-page-container">
      
      {/* Encabezado del Checkout */}
      <div className="checkout-header-area">
        <nav aria-label="Progreso del checkout" className="checkout-breadcrumb">
          <Link to="/carrito" className="breadcrumb-back-link">
            ← Volver al carrito
          </Link>
        </nav>
        <h1 className="catalog-main-title">Finalizar compra (Checkout)</h1>
        <p className="catalog-subtitle">
          Completa tus datos de entrega en Quito y confirma tu pedido con pago seguro.
        </p>
      </div>

      <div className="checkout-layout-grid">
        
        {/* Columna Izquierda: Pasos de Facturación, Envío y Pago */}
        <div className="checkout-main-forms">

          {/* MENSAJE DE ERROR DE TRANSACCIÓN */}
          {errorTransaccion && (
            <div className="checkout-error-alert" role="alert">
              <span className="error-icon" aria-hidden="true">⚠️</span>
              <p>{errorTransaccion}</p>
            </div>
          )}

          {/* ========================================================
              PASO 1: DIRECCIÓN DE ENTREGA EN QUITO (HU-05)
              ======================================================== */}
          <section className="checkout-section-card" aria-labelledby="heading-delivery">
            <div className="section-card-header">
              <span className="step-number-badge" aria-hidden="true">1</span>
              <div>
                <h2 id="heading-delivery" className="section-title">Dirección de Entrega en Quito</h2>
                <p className="section-desc">Cobertura exclusiva para el cantón Quito y valles de Pichincha.</p>
              </div>
            </div>

            {/* Listado de direcciones guardadas */}
            <fieldset className="saved-items-fieldset">
              <legend className="sr-only">Selecciona una dirección de entrega guardada</legend>
              <div className="saved-cards-list">
                {direcciones.map((dir) => {
                  const estaSeleccionada = dir.id === direccionSeleccionadaId

                  return (
                    <label
                      key={dir.id}
                      className={`saved-card-option ${estaSeleccionada ? 'card-selected' : ''}`}
                    >
                      <input
                        type="radio"
                        name="direccion_seleccionada"
                        value={dir.id}
                        checked={estaSeleccionada}
                        onChange={() => {
                          setDireccionSeleccionadaId(dir.id)
                          setModoNuevaDireccion(false)
                        }}
                        className="option-radio"
                      />
                      <div className="card-option-body">
                        <div className="card-option-header-row">
                          <strong className="card-alias">{dir.alias}</strong>
                          {dir.es_predeterminada && (
                            <span className="default-pill-badge">Predeterminada</span>
                          )}
                        </div>
                        <p className="card-address-line">
                          {dir.calle_principal} {dir.numeracion}
                        </p>
                        <p className="card-sector-line">
                          📍 {dir.sector}, Quito
                        </p>
                        {dir.referencia && (
                          <p className="card-ref-line">Ref: {dir.referencia}</p>
                        )}
                      </div>
                    </label>
                  )
                })}
              </div>
            </fieldset>

            {/* Botón para abrir formulario de nueva dirección */}
            {!modoNuevaDireccion ? (
              <button
                type="button"
                className="btn-secondary btn-add-new-toggle"
                onClick={() => setModoNuevaDireccion(true)}
              >
                + Agregar nueva dirección en Quito
              </button>
            ) : (
              <form onSubmit={guardarNuevaDireccion} className="new-entry-form" aria-label="Formulario de nueva dirección">
                <h3 className="new-entry-title">Registrar nueva ubicación en Quito</h3>

                <div className="form-field">
                  <label htmlFor="dir-sector">
                    Sector de Quito <span className="required-star">*</span>
                  </label>
                  <select
                    id="dir-sector"
                    value={formNuevaDireccion.sector}
                    onChange={(e) => actualizarCampoNuevaDireccion('sector', e.target.value)}
                    className="form-input"
                    required
                  >
                    {sectoresQuito.map((sector) => (
                      <option key={sector} value={sector}>
                        {sector}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-grid-2">
                  <div className="form-field">
                    <label htmlFor="dir-calle-principal">
                      Calle Principal <span className="required-star">*</span>
                    </label>
                    <input
                      type="text"
                      id="dir-calle-principal"
                      placeholder="Ej: Av. Amazonas"
                      value={formNuevaDireccion.calle_principal}
                      onChange={(e) => actualizarCampoNuevaDireccion('calle_principal', e.target.value)}
                      className={`form-input ${erroresDireccion.calle_principal ? 'input-error' : ''}`}
                      required
                    />
                    {erroresDireccion.calle_principal && (
                      <span className="field-error-text" role="alert">{erroresDireccion.calle_principal}</span>
                    )}
                  </div>

                  <div className="form-field">
                    <label htmlFor="dir-numeracion">
                      Numeración / Calle Secundaria <span className="required-star">*</span>
                    </label>
                    <input
                      type="text"
                      id="dir-numeracion"
                      placeholder="Ej: N24-102 y Cordero"
                      value={formNuevaDireccion.numeracion}
                      onChange={(e) => actualizarCampoNuevaDireccion('numeracion', e.target.value)}
                      className={`form-input ${erroresDireccion.numeracion ? 'input-error' : ''}`}
                      required
                    />
                    {erroresDireccion.numeracion && (
                      <span className="field-error-text" role="alert">{erroresDireccion.numeracion}</span>
                    )}
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-field">
                    <label htmlFor="dir-referencia">Referencia de ubicación</label>
                    <input
                      type="text"
                      id="dir-referencia"
                      placeholder="Ej: Edificio blanco frente al parque"
                      value={formNuevaDireccion.referencia}
                      onChange={(e) => actualizarCampoNuevaDireccion('referencia', e.target.value)}
                      className="form-input"
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="dir-alias">Alias (Ej: Casa, Oficina)</label>
                    <input
                      type="text"
                      id="dir-alias"
                      placeholder="Ej: Departamento Cumbayá"
                      value={formNuevaDireccion.alias}
                      onChange={(e) => actualizarCampoNuevaDireccion('alias', e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-checkbox-row">
                  <label className="checkbox-inline-label">
                    <input
                      type="checkbox"
                      checked={formNuevaDireccion.es_predeterminada}
                      onChange={(e) => actualizarCampoNuevaDireccion('es_predeterminada', e.target.checked)}
                      className="cart-checkbox"
                    />
                    <span>Guardar como dirección de entrega predeterminada</span>
                  </label>
                </div>

                <div className="form-buttons-row">
                  <button type="submit" className="btn-primary">
                    Guardar dirección
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setModoNuevaDireccion(false)}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </section>

          {/* ========================================================
              PASO 2: DATOS FISCALES DE FACTURACIÓN (HU-05)
              ======================================================== */}
          <section className="checkout-section-card" aria-labelledby="heading-tax">
            <div className="section-card-header">
              <span className="step-number-badge" aria-hidden="true">2</span>
              <div>
                <h2 id="heading-tax" className="section-title">Datos Fiscales y Facturación</h2>
                <p className="section-desc">Cédula de 10 dígitos o RUC de 13 dígitos para la emisión del comprobante.</p>
              </div>
            </div>

            {/* Listado de perfiles fiscales guardados */}
            <fieldset className="saved-items-fieldset">
              <legend className="sr-only">Selecciona un perfil fiscal de facturación</legend>
              <div className="saved-cards-list">
                {datosFiscales.map((fisc) => {
                  const estaSeleccionado = fisc.id === fiscalSeleccionadoId

                  return (
                    <label
                      key={fisc.id}
                      className={`saved-card-option ${estaSeleccionado ? 'card-selected' : ''}`}
                    >
                      <input
                        type="radio"
                        name="fiscal_seleccionado"
                        value={fisc.id}
                        checked={estaSeleccionado}
                        onChange={() => {
                          setFiscalSeleccionadoId(fisc.id)
                          setModoNuevoFiscal(false)
                        }}
                        className="option-radio"
                      />
                      <div className="card-option-body">
                        <div className="card-option-header-row">
                          <strong className="card-alias">{fisc.razon_social}</strong>
                          {fisc.es_predeterminado && (
                            <span className="default-pill-badge">Predeterminado</span>
                          )}
                        </div>
                        <p className="card-address-line">
                          <strong>{fisc.tipo === 'ruc' ? 'RUC' : 'Cédula'}:</strong> {fisc.identificacion_fiscal}
                        </p>
                        {fisc.direccion_fiscal && (
                          <p className="card-ref-line">Dirección: {fisc.direccion_fiscal}</p>
                        )}
                      </div>
                    </label>
                  )
                })}
              </div>
            </fieldset>

            {/* Botón para abrir formulario de nuevos datos fiscales */}
            {!modoNuevoFiscal ? (
              <button
                type="button"
                className="btn-secondary btn-add-new-toggle"
                onClick={() => setModoNuevoFiscal(true)}
              >
                + Agregar nuevos datos de facturación
              </button>
            ) : (
              <form onSubmit={guardarNuevoDatoFiscal} className="new-entry-form" aria-label="Formulario de nuevos datos fiscales">
                <h3 className="new-entry-title">Registrar perfil de facturación</h3>

                <div className="form-grid-2">
                  <div className="form-field">
                    <label htmlFor="fisc-tipo">
                      Tipo de Identificación <span className="required-star">*</span>
                    </label>
                    <select
                      id="fisc-tipo"
                      value={formNuevoFiscal.tipo}
                      onChange={(e) => actualizarCampoNuevoFiscal('tipo', e.target.value)}
                      className="form-input"
                    >
                      <option value="cedula">Cédula de Identidad (10 dígitos)</option>
                      <option value="ruc">RUC (13 dígitos)</option>
                    </select>
                  </div>

                  <div className="form-field">
                    <label htmlFor="fisc-numero">
                      {formNuevoFiscal.tipo === 'ruc' ? 'Número de RUC' : 'Número de Cédula'}{' '}
                      <span className="required-star">*</span>
                    </label>
                    <input
                      type="text"
                      id="fisc-numero"
                      placeholder={formNuevoFiscal.tipo === 'ruc' ? 'Ej: 1792145678001' : 'Ej: 1723456789'}
                      maxLength={formNuevoFiscal.tipo === 'ruc' ? 13 : 10}
                      value={formNuevoFiscal.identificacion_fiscal}
                      onChange={(e) => actualizarCampoNuevoFiscal('identificacion_fiscal', e.target.value)}
                      className={`form-input ${erroresFiscal.identificacion_fiscal ? 'input-error' : ''}`}
                      required
                    />
                    {erroresFiscal.identificacion_fiscal && (
                      <span className="field-error-text" role="alert">{erroresFiscal.identificacion_fiscal}</span>
                    )}
                  </div>
                </div>

                <div className="form-field">
                  <label htmlFor="fisc-razon">
                    Razón Social / Nombres y Apellidos Completos <span className="required-star">*</span>
                  </label>
                  <input
                    type="text"
                    id="fisc-razon"
                    placeholder="Ej: Luis Morales Arciniegas o Periféricos S.A."
                    value={formNuevoFiscal.razon_social}
                    onChange={(e) => actualizarCampoNuevoFiscal('razon_social', e.target.value)}
                    className={`form-input ${erroresFiscal.razon_social ? 'input-error' : ''}`}
                    required
                  />
                  {erroresFiscal.razon_social && (
                    <span className="field-error-text" role="alert">{erroresFiscal.razon_social}</span>
                  )}
                </div>

                <div className="form-field">
                  <label htmlFor="fisc-direccion">Dirección fiscal</label>
                  <input
                    type="text"
                    id="fisc-direccion"
                    placeholder="Ej: Av. República del Salvador N36-84, Quito"
                    value={formNuevoFiscal.direccion_fiscal}
                    onChange={(e) => actualizarCampoNuevoFiscal('direccion_fiscal', e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="form-checkbox-row">
                  <label className="checkbox-inline-label">
                    <input
                      type="checkbox"
                      checked={formNuevoFiscal.es_predeterminado}
                      onChange={(e) => actualizarCampoNuevoFiscal('es_predeterminado', e.target.checked)}
                      className="cart-checkbox"
                    />
                    <span>Guardar como perfil de facturación predeterminado</span>
                  </label>
                </div>

                <div className="form-buttons-row">
                  <button type="submit" className="btn-primary">
                    Guardar datos fiscales
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setModoNuevoFiscal(false)}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </section>

          {/* ========================================================
              PASO 3: PAGO CON TARJETA (HU-08)
              ======================================================== */}
          <section className="checkout-section-card" aria-labelledby="heading-payment">
            <div className="section-card-header">
              <span className="step-number-badge" aria-hidden="true">3</span>
              <div>
                <h2 id="heading-payment" className="section-title">Método de Pago con Tarjeta</h2>
                <p className="section-desc">Verifica los datos de tu tarjeta antes de continuar.</p>
              </div>
            </div>

            {/* Aviso de pago seguro con tarjeta */}
            <div className="payment-security-notice-box" role="note" aria-label="Información de pago seguro">
              <div className="helper-icon" aria-hidden="true">💳</div>
              <div className="helper-text-block">
                <strong>Pasarela de pago segura:</strong>
                <p>
                  Aceptamos tarjetas de crédito y débito Visa, Mastercard, American Express y Diners Club con validación directa y cifrado.
                </p>
              </div>
            </div>

            <div className="credit-card-form-grid">
              
              {/* Número de tarjeta */}
              <div className="form-field">
                <div className="label-with-brand-badge">
                  <label htmlFor="card-number">
                    Número de tarjeta <span className="required-star">*</span>
                  </label>
                  {marcaTarjeta !== 'desconocida' && (
                    <span className="brand-indicator-pill">
                      {marcaTarjeta.toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="input-with-icon-wrapper">
                  <input
                    type="text"
                    id="card-number"
                    placeholder="4242 4242 4242 4242"
                    maxLength={23}
                    value={datosTarjeta.numero}
                    onChange={(e) => actualizarCampoTarjeta('numero', e.target.value)}
                    className={`form-input font-mono ${erroresPago.numero ? 'input-error' : ''}`}
                    required
                  />
                  <span className="input-end-icon" aria-hidden="true">🔒</span>
                </div>
                {erroresPago.numero && (
                  <span className="field-error-text" role="alert">{erroresPago.numero}</span>
                )}
              </div>

              {/* Titular */}
              <div className="form-field">
                <label htmlFor="card-holder">
                  Nombre en la tarjeta <span className="required-star">*</span>
                </label>
                <input
                  type="text"
                  id="card-holder"
                  placeholder="Ej: LUIS MORALES"
                  value={datosTarjeta.titular}
                  onChange={(e) => actualizarCampoTarjeta('titular', e.target.value)}
                  className={`form-input uppercase ${erroresPago.titular ? 'input-error' : ''}`}
                  required
                />
                {erroresPago.titular && (
                  <span className="field-error-text" role="alert">{erroresPago.titular}</span>
                )}
              </div>

              {/* Fecha de expiración y CVV */}
              <div className="form-grid-2">
                <div className="form-field">
                  <label htmlFor="card-exp">
                    Expiración (MM/AA) <span className="required-star">*</span>
                  </label>
                  <input
                    type="text"
                    id="card-exp"
                    placeholder="12/28"
                    maxLength={5}
                    value={datosTarjeta.expiracion}
                    onChange={(e) => actualizarCampoTarjeta('expiracion', e.target.value)}
                    className={`form-input text-center font-mono ${erroresPago.expiracion ? 'input-error' : ''}`}
                    required
                  />
                  {erroresPago.expiracion && (
                    <span className="field-error-text" role="alert">{erroresPago.expiracion}</span>
                  )}
                </div>

                <div className="form-field">
                  <label htmlFor="card-cvv">
                    Código CVV <span className="required-star">*</span>
                  </label>
                  <input
                    type="password"
                    id="card-cvv"
                    placeholder="123"
                    maxLength={4}
                    value={datosTarjeta.cvv}
                    onChange={(e) => actualizarCampoTarjeta('cvv', e.target.value)}
                    className={`form-input text-center font-mono ${erroresPago.cvv ? 'input-error' : ''}`}
                    required
                  />
                  {erroresPago.cvv && (
                    <span className="field-error-text" role="alert">{erroresPago.cvv}</span>
                  )}
                </div>
              </div>

            </div>

            <div className="payment-security-notice">
              <span className="lock-icon" aria-hidden="true">🛡️</span>
              <span>
                <strong>Privacidad garantizada:</strong> Los datos de tu tarjeta se validan antes de confirmar el pago.
              </span>
            </div>
          </section>

        </div>

        {/* Columna Derecha: Resumen Flotante y Botón Transaccional */}
        <aside className="checkout-sidebar" aria-labelledby="heading-order-review">
          <div className="summary-card checkout-summary-sticky">
            <h2 id="heading-order-review" className="summary-title">Resumen de tu compra</h2>

            {/* Lista resumida de artículos */}
            <div className="checkout-items-preview">
              <span className="preview-count-label">
                Artículos seleccionados ({articulosSeleccionados.length}):
              </span>
              <ul className="preview-items-list" aria-label="Periféricos que vas a comprar">
                {articulosSeleccionados.map((item) => (
                  <li key={item.id} className="preview-item-row">
                    <div className="preview-item-info">
                      <span className="preview-item-name">{item.nombre}</span>
                      <span className="preview-item-meta">Cant: {item.cantidad} × ${item.precio.toFixed(2)}</span>
                    </div>
                    <strong className="preview-item-price">
                      ${(item.precio * item.cantidad).toFixed(2)}
                    </strong>
                  </li>
                ))}
              </ul>
            </div>

            <div className="summary-divider" />

            {/* Desglose de totales */}
            <dl className="summary-lines">
              <div className="summary-row">
                <dt>Subtotal:</dt>
                <dd>${totales.subtotal.toFixed(2)}</dd>
              </div>
              <div className="summary-row">
                <dt>Envío a Quito:</dt>
                <dd>
                  {totales.envio === 0 ? (
                    <span className="free-badge">Gratis</span>
                  ) : (
                    `$${totales.envio.toFixed(2)}`
                  )}
                </dd>
              </div>
              <div className="summary-row">
                <dt>IVA estimado (15%):</dt>
                <dd>${totales.impuestos.toFixed(2)}</dd>
              </div>
              <div className="summary-divider" />
              <div className="summary-row summary-total">
                <dt>Total a pagar:</dt>
                <dd>${totales.total.toFixed(2)}</dd>
              </div>
            </dl>

            {/* Dirección y Fiscal Resumen */}
            <div className="checkout-summary-recipient-box">
              <p>
                <strong>Entregar en:</strong> {direccionSeleccionada?.calle_principal || 'Dirección seleccionada'} ({direccionSeleccionada?.sector || 'Quito'})
              </p>
              <p>
                <strong>Facturar a:</strong> {fiscalSeleccionado?.razon_social || 'Consumidor Final'} ({fiscalSeleccionado?.identificacion_fiscal || '17...'})
              </p>
            </div>

            {/* BOTÓN TRANSACCIONAL DE COMPRA (HU-08) */}
            <button
              type="button"
              className={`btn-primary btn-confirm-order ${procesando ? 'btn-loading' : ''}`}
              disabled={procesando}
              onClick={confirmarCompra}
              aria-label={
                procesando
                  ? 'Procesando tu pedido en Supabase, por favor espera...'
                  : `Confirmar pedido y pagar $${totales.total.toFixed(2)}`
              }
            >
              {procesando ? (
                <span className="loading-spinner-content">
                  <span className="spinner-dot" aria-hidden="true" />
                  <span>Procesando compra transaccional...</span>
                </span>
              ) : (
                <span>Confirmar pedido (${totales.total.toFixed(2)})</span>
              )}
            </button>

            <p className="checkout-guarantee-note">
              ✓ Descuento de stock en tiempo real mediante procedimiento transaccional.
            </p>
          </div>
        </aside>

      </div>

    </div>
  )
}
