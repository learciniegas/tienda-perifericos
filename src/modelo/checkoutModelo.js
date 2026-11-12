/**
 * MODELO: checkoutModelo.js
 * Gestión de pedidos, validación tributaria para Ecuador (SRI - Cédula / RUC),
 * persistencia de datos fiscales, direcciones en Quito y transacciones con Supabase TX.
 * Preparado para entorno de producción sin cuentas sembradas.
 */

import { supabaseCore } from '../config/supabaseClient'

export const SECTORES_QUITO = [
  'La Carolina / Iñaquito',
  'Cumbayá',
  'Tumbaco',
  'Valle de Los Chillos',
  'Carcelén / Ponceano',
  'Centro Histórico',
  'Quitumbe / Villaflora',
  'Mariscal Sucre',
  'González Suárez / Bellavista',
  'Monteserrín / Jipijapa'
]

const CLAVE_DIRECCIONES_LOCAL = 'tienda_perifericos_direcciones_v1'
const CLAVE_FISCALES_LOCAL = 'tienda_perifericos_fiscales_v1'

/**
 * Invoca de forma segura una Edge Function en Supabase TX enviando el JWT de sesión de Core.
 */
async function invocarFuncionTx(nombreFuncion, { metodo = 'POST', cuerpo = null, params = null } = {}) {
  const { data: { session } } = await supabaseCore.auth.getSession()
  const token = session?.access_token

  if (!token) {
    throw new Error('Se requiere una sesión activa para realizar esta operación.')
  }

  const txUrl = import.meta.env.VITE_TX_SUPABASE_URL || 'https://zxqmpylxvxnktqthvigl.supabase.co'
  const txAnonKey = import.meta.env.VITE_TX_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4cW1weWx4dnhua3RxdGh2aWdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM1NTYyNzMsImV4cCI6MjEwOTEzMjI3M30.l5RHs2O6dH5tXFhhzswlnnFPVc7lMD00-JNtNAsK4n4'

  let url = `${txUrl}/functions/v1/${nombreFuncion}`
  if (params) {
    const q = new URLSearchParams(params).toString()
    url += `?${q}`
  }

  const opciones = {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'apikey': txAnonKey
    }
  }

  if (cuerpo && metodo !== 'GET') {
    opciones.body = JSON.stringify(cuerpo)
  }

  let respuesta
  try {
    respuesta = await fetch(url, opciones)
  } catch (err) {
    throw new Error('Error de conexión con el servicio transaccional: ' + (err.message || 'Fallo de red'))
  }

  const resultado = await respuesta.json().catch(() => ({}))

  if (!respuesta.ok) {
    throw new Error(resultado?.error || `Error ${respuesta.status} en la operación.`)
  }

  return resultado
}

export function construirPasosSeguimiento(estadoId = 2) {
  const idNum = Number(estadoId) || 2
  return [
    { nombre: 'Pago Confirmado', completado: idNum >= 1, activo: idNum === 1, fecha: 'Procesado' },
    { nombre: 'En preparación', completado: idNum >= 2, activo: idNum === 2, fecha: 'Almacén central Quito' },
    { nombre: 'En camino (Quito)', completado: idNum >= 3, activo: idNum === 3, fecha: 'En ruta de entrega' },
    { nombre: 'Entregado', completado: idNum >= 4, activo: idNum === 4, fecha: 'Entregado en destino' }
  ]
}

export const CheckoutModelo = {

  obtenerClaveDirecciones(usuario) {
    return usuario?.id ? `${CLAVE_DIRECCIONES_LOCAL}_${usuario.id}` : CLAVE_DIRECCIONES_LOCAL
  },

  obtenerClaveFiscales(usuario) {
    return usuario?.id ? `${CLAVE_FISCALES_LOCAL}_${usuario.id}` : CLAVE_FISCALES_LOCAL
  },

  /**
   * Obtiene las direcciones guardadas del usuario.
   * Consulta Supabase si hay sesión y recurre a almacenamiento local.
   */
  async obtenerDirecciones(usuario) {
    if (usuario?.autenticado && usuario?.id && usuario.id.includes('-') && usuario.id.length === 36) {
      try {
        const { data, error } = await supabaseCore
          .from('direcciones_guardadas')
          .select('*')
          .eq('usuario_id', usuario.id)
          .order('es_predeterminada', { ascending: false })

        if (!error && data && data.length > 0) {
          return data.map(d => ({
            id: d.id,
            alias: d.alias || 'Dirección de entrega',
            sector: d.ciudad || 'La Carolina / Iñaquito',
            calle_principal: d.calle_principal,
            numeracion: d.numeracion,
            referencia: d.referencia || '',
            ciudad: 'Quito',
            es_predeterminada: Boolean(d.es_predeterminada)
          }))
        }
      } catch (err) {
        console.warn('Fallo al consultar direcciones en Supabase, utilizando respaldo local:', err)
      }
    }

    try {
      const clave = this.obtenerClaveDirecciones(usuario)
      const datosLocales = localStorage.getItem(clave)
      if (datosLocales) {
        return JSON.parse(datosLocales)
      }
    } catch (e) {
      console.warn('Error leyendo direcciones locales:', e)
    }

    return []
  },

  guardarDireccionesLocales(direcciones, usuario) {
    try {
      const clave = this.obtenerClaveDirecciones(usuario)
      localStorage.setItem(clave, JSON.stringify(direcciones))
    } catch (e) {
      console.warn('Error guardando direcciones locales:', e)
    }
  },

  /**
   * Agrega o actualiza una dirección de entrega en Quito.
   */
  async guardarDireccion(nuevaDireccion, usuario) {
    let direccionesActuales = await this.obtenerDirecciones(usuario)

    const esPrimera = direccionesActuales.length === 0
    const debeSerPredeterminada = esPrimera || Boolean(nuevaDireccion.es_predeterminada)

    if (debeSerPredeterminada) {
      direccionesActuales = direccionesActuales.map(d => ({ ...d, es_predeterminada: false }))
    }

    const direccionNormalizada = {
      id: nuevaDireccion.id || 'dir-' + Date.now(),
      alias: nuevaDireccion.alias?.trim() || 'Dirección personal',
      sector: nuevaDireccion.sector || SECTORES_QUITO[0],
      calle_principal: nuevaDireccion.calle_principal?.trim() || '',
      numeracion: nuevaDireccion.numeracion?.trim() || '',
      referencia: nuevaDireccion.referencia?.trim() || '',
      ciudad: 'Quito',
      es_predeterminada: debeSerPredeterminada
    }

    direccionesActuales = [direccionNormalizada, ...direccionesActuales.filter(d => d.id !== direccionNormalizada.id)]
    this.guardarDireccionesLocales(direccionesActuales, usuario)

    // Si hay usuario con UUID en Supabase, sincronizar
    if (usuario?.autenticado && usuario?.id && usuario.id.includes('-') && usuario.id.length === 36) {
      try {
        await supabaseCore.from('direcciones_guardadas').insert({
          usuario_id: usuario.id,
          alias: direccionNormalizada.alias,
          calle_principal: direccionNormalizada.calle_principal,
          numeracion: direccionNormalizada.numeracion,
          ciudad: direccionNormalizada.sector,
          referencia: direccionNormalizada.referencia,
          es_predeterminada: direccionNormalizada.es_predeterminada
        })
      } catch (err) {
        console.warn('No se pudo sincronizar dirección con Supabase:', err)
      }
    }

    return direccionesActuales
  },

  /**
   * Elimina una dirección de entrega guardada (Gestionar Direcciones).
   */
  async eliminarDireccion(idDireccion, usuario) {
    let direccionesActuales = await this.obtenerDirecciones(usuario)
    direccionesActuales = direccionesActuales.filter(d => d.id !== idDireccion)

    if (direccionesActuales.length > 0 && !direccionesActuales.some(d => d.es_predeterminada)) {
      direccionesActuales[0].es_predeterminada = true
    }

    this.guardarDireccionesLocales(direccionesActuales, usuario)

    if (usuario?.autenticado && usuario?.id && usuario.id.includes('-') && usuario.id.length === 36) {
      try {
        await supabaseCore.from('direcciones_guardadas').delete().eq('id', idDireccion)
      } catch (err) {
        console.warn('No se pudo eliminar dirección de Supabase:', err)
      }
    }

    return direccionesActuales
  },

  /**
   * Marca una dirección como predeterminada.
   */
  async establecerDireccionPredeterminada(idDireccion, usuario) {
    let direccionesActuales = await this.obtenerDirecciones(usuario)
    direccionesActuales = direccionesActuales.map(d => ({
      ...d,
      es_predeterminada: d.id === idDireccion
    }))

    this.guardarDireccionesLocales(direccionesActuales, usuario)
    return direccionesActuales
  },

  /**
   * Obtiene los perfiles de datos fiscales guardados.
   */
  async obtenerDatosFiscales(usuario) {
    if (usuario?.autenticado && usuario?.id && usuario.id.includes('-') && usuario.id.length === 36) {
      try {
        const { data, error } = await supabaseCore
          .from('datos_fiscales_guardados')
          .select('*')
          .eq('usuario_id', usuario.id)
          .order('es_predeterminado', { ascending: false })

        if (!error && data && data.length > 0) {
          return data.map(f => ({
            id: f.id,
            tipo: f.identificacion_fiscal?.length === 13 ? 'ruc' : 'cedula',
            identificacion_fiscal: f.identificacion_fiscal,
            razon_social: f.razon_social,
            direccion_fiscal: f.direccion_fiscal || '',
            es_predeterminado: Boolean(f.es_predeterminado)
          }))
        }
      } catch (err) {
        console.warn('Fallo al consultar datos fiscales en Supabase:', err)
      }
    }

    try {
      const clave = this.obtenerClaveFiscales(usuario)
      const datosLocales = localStorage.getItem(clave)
      if (datosLocales) {
        return JSON.parse(datosLocales)
      }
    } catch (e) {
      console.warn('Error leyendo fiscales locales:', e)
    }

    return []
  },

  guardarFiscalesLocales(fiscales, usuario) {
    try {
      const clave = this.obtenerClaveFiscales(usuario)
      localStorage.setItem(clave, JSON.stringify(fiscales))
    } catch (e) {
      console.warn('Error guardando fiscales locales:', e)
    }
  },

  /**
   * Agrega un nuevo perfil de datos fiscales (cédula o RUC).
   */
  async guardarDatoFiscal(nuevoFiscal, usuario) {
    let fiscalesActuales = await this.obtenerDatosFiscales(usuario)

    const esPrimero = fiscalesActuales.length === 0
    const debeSerPredeterminado = esPrimero || Boolean(nuevoFiscal.es_predeterminado)

    if (debeSerPredeterminado) {
      fiscalesActuales = fiscalesActuales.map(f => ({ ...f, es_predeterminado: false }))
    }

    const fiscalNormalizado = {
      id: nuevoFiscal.id || 'fisc-' + Date.now(),
      tipo: nuevoFiscal.tipo || 'cedula',
      identificacion_fiscal: nuevoFiscal.identificacion_fiscal?.trim() || '',
      razon_social: nuevoFiscal.razon_social?.trim() || 'Consumidor Final',
      direccion_fiscal: nuevoFiscal.direccion_fiscal?.trim() || 'Quito, Pichincha',
      es_predeterminado: debeSerPredeterminado
    }

    fiscalesActuales = [fiscalNormalizado, ...fiscalesActuales.filter(f => f.id !== fiscalNormalizado.id)]
    this.guardarFiscalesLocales(fiscalesActuales, usuario)

    if (usuario?.autenticado && usuario?.id && usuario.id.includes('-') && usuario.id.length === 36) {
      try {
        await supabaseCore.from('datos_fiscales_guardados').insert({
          usuario_id: usuario.id,
          identificacion_fiscal: fiscalNormalizado.identificacion_fiscal,
          razon_social: fiscalNormalizado.razon_social,
          direccion_fiscal: fiscalNormalizado.direccion_fiscal,
          es_predeterminado: fiscalNormalizado.es_predeterminado
        })
      } catch (err) {
        console.warn('No se pudo sincronizar fiscal con Supabase:', err)
      }
    }

    return fiscalesActuales
  },

  /**
   * Elimina un perfil fiscal guardado (Gestionar Datos Fiscales).
   */
  async eliminarDatoFiscal(idFiscal, usuario) {
    let fiscalesActuales = await this.obtenerDatosFiscales(usuario)
    fiscalesActuales = fiscalesActuales.filter(f => f.id !== idFiscal)

    if (fiscalesActuales.length > 0 && !fiscalesActuales.some(f => f.es_predeterminado)) {
      fiscalesActuales[0].es_predeterminado = true
    }

    this.guardarFiscalesLocales(fiscalesActuales, usuario)

    if (usuario?.autenticado && usuario?.id && usuario.id.includes('-') && usuario.id.length === 36) {
      try {
        await supabaseCore.from('datos_fiscales_guardados').delete().eq('id', idFiscal)
      } catch (err) {
        console.warn('No se pudo eliminar fiscal de Supabase:', err)
      }
    }

    return fiscalesActuales
  },

  /**
   * Marca un perfil fiscal como predeterminado.
   */
  async establecerDatoFiscalPredeterminado(idFiscal, usuario) {
    let fiscalesActuales = await this.obtenerDatosFiscales(usuario)
    fiscalesActuales = fiscalesActuales.map(f => ({
      ...f,
      es_predeterminado: f.id === idFiscal
    }))

    this.guardarFiscalesLocales(fiscalesActuales, usuario)
    return fiscalesActuales
  },

  /**
   * Procesa la compra transaccional garantizando ACID y stock (HU-08 / HU-14).
   * Llama a la Edge Function registrar-pedido en Supabase TX con el JWT de Core.
   */
  async procesarPedidoTransaccional({
    usuario,
    direccion,
    fiscal,
    articulosComprados,
    totales,
    datosPago
  }) {
    if (!usuario?.autenticado || !usuario?.id) {
      throw new Error('Debes iniciar sesión con tu cuenta para completar la compra.')
    }

    if (!articulosComprados || articulosComprados.length === 0) {
      throw new Error('No hay artículos seleccionados para comprar.')
    }

    if (!direccion || !direccion.calle_principal || !direccion.numeracion) {
      throw new Error('Por favor completa todos los campos requeridos en la dirección de entrega.')
    }

    if (!fiscal || !fiscal.identificacion_fiscal || !fiscal.razon_social) {
      throw new Error('Por favor completa los datos de facturación (identificación y razón social).')
    }

    const payloadPeticion = {
      clave_idempotencia: 'IDEMP-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
      items: articulosComprados.map(item => ({
        producto_id: Number(item.id),
        cantidad: Number(item.cantidad)
      })),
      direccion: {
        sector: direccion.sector || SECTORES_QUITO[0],
        calle_principal: direccion.calle_principal,
        numeracion: direccion.numeracion,
        referencia: direccion.referencia || ''
      },
      fiscal: {
        tipo: fiscal.tipo || 'cedula',
        identificacion: fiscal.identificacion_fiscal,
        razon_social: fiscal.razon_social,
        direccion: fiscal.direccion_fiscal || `${direccion.calle_principal}, Quito`
      },
      metodo: 'tarjeta',
      referencia_transaccion: 'TX-' + Math.floor(100000 + Math.random() * 900000)
    }

    // Llamada a la Edge Function en Supabase TX (valida token, precios en Core, stock y registra pedido)
    const respuesta = await invocarFuncionTx('registrar-pedido', {
      metodo: 'POST',
      cuerpo: payloadPeticion
    })

    const pedidoBD = respuesta.pedido
    const codigoOrden = respuesta.codigo || pedidoBD?.numero_pedido

    if (!codigoOrden) {
      throw new Error('La base de datos no devolvió un código de orden válido.')
    }

    const fechaCreacion = pedidoBD?.creado_en ? new Date(pedidoBD.creado_en) : new Date()
    const fechaFormateada = fechaCreacion.toLocaleDateString('es-EC', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
    const horaFormateada = fechaCreacion.toLocaleTimeString('es-EC', {
      hour: '2-digit',
      minute: '2-digit'
    })

    const articulosConfirmados = (pedidoBD?.detalles_pedido || []).map(art => ({
      id: art.producto_id,
      nombre: art.nombre_producto,
      categoria: 'Periférico',
      precio: Number(art.precio_unitario),
      cantidad: Number(art.cantidad),
      subtotal: Number(art.subtotal_linea)
    }))

    const comprobantePedido = {
      codigo: codigoOrden,
      fecha: fechaFormateada,
      hora: horaFormateada,
      fechaIso: fechaCreacion.toISOString(),
      estadoActual: pedidoBD?.estados_pedido?.nombre || 'En preparación',
      estadoId: pedidoBD?.estado_id || 2,
      transaccionRemota: true,
      referenciaPago: payloadPeticion.referencia_transaccion,
      ultimosDigitosTarjeta: String(datosPago?.numeroTarjeta || '4242').replace(/\D/g, '').slice(-4),
      marcaTarjeta: datosPago?.marca || 'Visa',
      cliente: {
        nombre: fiscal.razon_social,
        correo: pedidoBD?.correo_contacto || usuario.email
      },
      datosFiscales: {
        tipo: fiscal.tipo === 'ruc' ? 'RUC' : 'Cédula de Identidad',
        identificacion: fiscal.identificacion_fiscal,
        razonSocial: fiscal.razon_social,
        direccionFiscal: fiscal.direccion_fiscal || `${direccion.calle_principal}, Quito`
      },
      direccionEnvio: {
        ciudad: 'Quito, Pichincha',
        sector: direccion.sector,
        callePrincipal: direccion.calle_principal,
        numeracion: direccion.numeracion,
        referencia: direccion.referencia || 'Sin referencia adicional'
      },
      articulos: articulosConfirmados.length > 0 ? articulosConfirmados : articulosComprados.map(art => ({
        id: art.id,
        nombre: art.nombre,
        categoria: art.categoria || 'Periférico',
        precio: Number(art.precio),
        cantidad: Number(art.cantidad),
        subtotal: +(Number(art.precio) * Number(art.cantidad)).toFixed(2)
      })),
      totales: {
        cantidadTotal: (pedidoBD?.detalles_pedido || articulosComprados).reduce((acc, a) => acc + Number(a.cantidad), 0),
        subtotal: Number(pedidoBD?.subtotal ?? totales.subtotal),
        envio: Number(pedidoBD?.costo_envio ?? totales.envio),
        impuestos: Number(pedidoBD?.impuestos ?? totales.impuestos),
        total: Number(pedidoBD?.total ?? totales.total)
      },
      pasosSeguimiento: construirPasosSeguimiento(pedidoBD?.estado_id || 2)
    }

    return comprobantePedido
  },

  /**
   * Obtiene el historial de pedidos generados por el cliente desde la Edge Function en Supabase TX.
   * La base de datos es la única fuente de verdad (HU-15).
   */
  async obtenerHistorialPedidos(usuarioId) {
    if (!usuarioId) return []

    try {
      const data = await invocarFuncionTx('mis-pedidos', { metodo: 'GET' })
      const pedidosBD = data?.pedidos || []

      return pedidosBD.map((pedidoBD) => {
        const idEstado = Number(pedidoBD.estado_id) || 2
        const nombreEstado = pedidoBD.estados_pedido?.nombre || (idEstado === 3 ? 'En camino (Quito)' : (idEstado === 4 ? 'Entregado' : 'En preparación'))

        return {
          id: pedidoBD.id,
          codigo: pedidoBD.numero_pedido,
          fecha: new Date(pedidoBD.creado_en).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }),
          hora: new Date(pedidoBD.creado_en).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }),
          fechaIso: pedidoBD.creado_en,
          estadoActual: nombreEstado,
          estadoId: idEstado,
          cliente: {
            nombre: pedidoBD.fiscal_razon_social,
            correo: pedidoBD.correo_contacto
          },
          direccionEnvio: {
            ciudad: pedidoBD.envio_ciudad || 'Quito, Pichincha',
            sector: pedidoBD.envio_ciudad || 'Quito',
            callePrincipal: pedidoBD.envio_calle_principal,
            numeracion: pedidoBD.envio_numeracion,
            referencia: pedidoBD.envio_referencia
          },
          datosFiscales: {
            identificacion: pedidoBD.fiscal_identificacion,
            razonSocial: pedidoBD.fiscal_razon_social,
            direccionFiscal: pedidoBD.fiscal_direccion
          },
          totales: {
            subtotal: Number(pedidoBD.subtotal),
            envio: Number(pedidoBD.costo_envio),
            impuestos: Number(pedidoBD.impuestos),
            total: Number(pedidoBD.total)
          },
          articulos: (pedidoBD.detalles_pedido || []).map((d) => ({
            id: d.producto_id,
            nombre: d.nombre_producto,
            precio: Number(d.precio_unitario),
            cantidad: d.cantidad,
            subtotal: Number(d.subtotal_linea)
          })),
          pasosSeguimiento: construirPasosSeguimiento(idEstado)
        }
      })
    } catch (err) {
      console.warn('Aviso al consultar historial en Supabase TX:', err.message)
      return []
    }
  },

  /**
   * Consulta un pedido por su código a través de la Edge Function en Supabase TX.
   * La base de datos es la única fuente de verdad.
   */
  async consultarPedidoPorCodigo(codigo) {
    if (!codigo) return null
    const codigoLimpio = String(codigo).trim().toUpperCase().replace('#', '')

    try {
      const data = await invocarFuncionTx('consultar-pedido', {
        metodo: 'GET',
        params: { codigo: codigoLimpio }
      })

      const pedidoBD = data?.pedido
      if (!pedidoBD) return null

      const idEstado = Number(pedidoBD.estado_id) || 2
      const nombreEstado = pedidoBD.estados_pedido?.nombre || (idEstado === 3 ? 'En camino (Quito)' : (idEstado === 4 ? 'Entregado' : 'En preparación'))

      return {
        id: pedidoBD.id,
        codigo: pedidoBD.numero_pedido,
        fecha: new Date(pedidoBD.creado_en).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }),
        hora: new Date(pedidoBD.creado_en).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }),
        fechaIso: pedidoBD.creado_en,
        estadoActual: nombreEstado,
        estadoId: idEstado,
        cliente: {
          nombre: pedidoBD.fiscal_razon_social,
          correo: pedidoBD.correo_contacto
        },
        direccionEnvio: {
          ciudad: pedidoBD.envio_ciudad || 'Quito, Pichincha',
          sector: pedidoBD.envio_ciudad || 'Quito',
          callePrincipal: pedidoBD.envio_calle_principal,
          numeracion: pedidoBD.envio_numeracion,
          referencia: pedidoBD.envio_referencia
        },
        datosFiscales: {
          identificacion: pedidoBD.fiscal_identificacion,
          razonSocial: pedidoBD.fiscal_razon_social,
          direccionFiscal: pedidoBD.fiscal_direccion
        },
        totales: {
          subtotal: Number(pedidoBD.subtotal),
          envio: Number(pedidoBD.costo_envio),
          impuestos: Number(pedidoBD.impuestos),
          total: Number(pedidoBD.total)
        },
        articulos: (pedidoBD.detalles_pedido || []).map((d) => ({
          id: d.producto_id,
          nombre: d.nombre_producto,
          precio: Number(d.precio_unitario),
          cantidad: d.cantidad,
          subtotal: Number(d.subtotal_linea)
        })),
        pasosSeguimiento: construirPasosSeguimiento(idEstado)
      }
    } catch (err) {
      console.warn('Aviso al consultar pedido por código:', err.message)
      return null
    }
  }
}
