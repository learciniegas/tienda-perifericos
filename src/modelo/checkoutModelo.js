/**
 * MODELO: checkoutModelo.js
 * Gestión de pedidos, validación tributaria para Ecuador (SRI - Cédula / RUC),
 * persistencia de datos fiscales, direcciones en Quito y transacciones con Supabase TX.
 * Preparado para entorno de producción sin cuentas sembradas.
 */

import { supabaseCore } from '../config/supabaseClient'
import { validarDireccionEnvio, validarDatosFiscales } from './validadorModelo'

// Limpieza proactiva de claves de almacenamiento local obsoletas (Fase 5)
try {
  localStorage.removeItem('tienda_perifericos_direcciones_v1')
  localStorage.removeItem('tienda_perifericos_fiscales_v1')
} catch {
  // Ignorar en entornos sin localStorage
}

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

  /**
   * Obtiene las direcciones guardadas del usuario desde ecommerce-core.
   * Solo usuarios autenticados persisten direcciones; para invitados devuelve arreglo vacío.
   */
  async obtenerDirecciones(usuario) {
    if (!usuario?.autenticado || !usuario?.id) {
      return []
    }

    const { data, error } = await supabaseCore
      .from('direcciones_guardadas')
      .select('*')
      .eq('usuario_id', usuario.id)
      .order('es_predeterminada', { ascending: false })
      .order('id', { ascending: true })

    if (error) {
      console.error('Error al consultar direcciones en Supabase:', error)
      throw new Error(error.message || 'Error al obtener las direcciones.')
    }

    return (data || []).map(d => ({
      id: d.id,
      alias: d.alias || 'Mi dirección',
      sector: d.sector || d.ciudad || SECTORES_QUITO[0],
      calle_principal: d.calle_principal,
      numeracion: d.numeracion,
      referencia: d.referencia || '',
      ciudad: d.ciudad || 'Quito',
      es_predeterminada: Boolean(d.es_predeterminada)
    }))
  },

  /**
   * Guarda una nueva dirección en ecommerce-core para el usuario autenticado.
   * Para invitados, solo normaliza y valida en memoria para el checkout en curso.
   */
  async guardarDireccion(nuevaDireccion, usuario) {
    const val = validarDireccionEnvio(nuevaDireccion)
    if (!val.esValida) {
      const primerError = Object.values(val.errores)[0]
      throw new Error(primerError)
    }

    const aliasNormalizado = nuevaDireccion.alias?.trim() || 'Mi dirección'
    const sectorNormalizado = nuevaDireccion.sector || SECTORES_QUITO[0]
    const calleNormalizada = nuevaDireccion.calle_principal?.trim()
    const numeracionNormalizada = nuevaDireccion.numeracion?.trim()
    const referenciaNormalizada = nuevaDireccion.referencia?.trim() || 'Frente a vía principal'

    if (!usuario?.autenticado || !usuario?.id) {
      return [{
        id: 'invitado',
        alias: aliasNormalizado,
        sector: sectorNormalizado,
        calle_principal: calleNormalizada,
        numeracion: numeracionNormalizada,
        referencia: referenciaNormalizada,
        ciudad: 'Quito',
        es_predeterminada: true
      }]
    }

    const esPredeterminada = Boolean(nuevaDireccion.es_predeterminada)
    if (esPredeterminada) {
      await supabaseCore
        .from('direcciones_guardadas')
        .update({ es_predeterminada: false })
        .eq('usuario_id', usuario.id)
        .catch(() => {})
    }

    const { error } = await supabaseCore
      .from('direcciones_guardadas')
      .insert({
        usuario_id: usuario.id,
        alias: aliasNormalizado,
        calle_principal: calleNormalizada,
        numeracion: numeracionNormalizada,
        sector: sectorNormalizado,
        ciudad: 'Quito',
        referencia: referenciaNormalizada,
        es_predeterminada: esPredeterminada
      })

    if (error) {
      console.error('Error insertando en direcciones_guardadas:', error)
      throw new Error(error.message || 'No fue posible guardar la dirección en la base de datos.')
    }

    return this.obtenerDirecciones(usuario)
  },

  /**
   * Elimina una dirección de entrega guardada en ecommerce-core.
   */
  async eliminarDireccion(idDireccion, usuario) {
    if (!usuario?.autenticado || !usuario?.id) return []

    const { error } = await supabaseCore
      .from('direcciones_guardadas')
      .delete()
      .match({ id: idDireccion, usuario_id: usuario.id })

    if (error) {
      console.error('Error eliminando dirección de Supabase:', error)
      throw new Error(error.message || 'No fue posible eliminar la dirección.')
    }

    const restantes = await this.obtenerDirecciones(usuario)
    if (restantes.length > 0 && !restantes.some(d => d.es_predeterminada)) {
      await this.establecerDireccionPredeterminada(restantes[0].id, usuario)
      return this.obtenerDirecciones(usuario)
    }

    return restantes
  },

  /**
   * Marca una dirección como predeterminada de forma atómica.
   */
  async establecerDireccionPredeterminada(idDireccion, usuario) {
    if (!usuario?.autenticado || !usuario?.id) return []

    const { error } = await supabaseCore.rpc('establecer_direccion_predeterminada', {
      p_direccion_id: idDireccion
    })

    if (error) {
      console.warn('Fallo RPC establecer_direccion_predeterminada, ejecutando alternativa:', error)
      await supabaseCore
        .from('direcciones_guardadas')
        .update({ es_predeterminada: false })
        .eq('usuario_id', usuario.id)
      await supabaseCore
        .from('direcciones_guardadas')
        .update({ es_predeterminada: true })
        .match({ id: idDireccion, usuario_id: usuario.id })
    }

    return this.obtenerDirecciones(usuario)
  },

  /**
   * Obtiene los datos fiscales guardados del usuario desde ecommerce-core.
   */
  async obtenerDatosFiscales(usuario) {
    if (!usuario?.autenticado || !usuario?.id) {
      return []
    }

    const { data, error } = await supabaseCore
      .from('datos_fiscales_guardados')
      .select('*')
      .eq('usuario_id', usuario.id)
      .order('es_predeterminado', { ascending: false })
      .order('id', { ascending: true })

    if (error) {
      console.error('Error al consultar datos fiscales en Supabase:', error)
      throw new Error(error.message || 'Error al obtener los datos fiscales.')
    }

    return (data || []).map(f => ({
      id: f.id,
      tipo: f.identificacion_fiscal?.length === 13 ? 'ruc' : 'cedula',
      identificacion_fiscal: f.identificacion_fiscal,
      razon_social: f.razon_social,
      direccion_fiscal: f.direccion_fiscal || 'Quito, Pichincha',
      es_predeterminado: Boolean(f.es_predeterminado)
    }))
  },

  /**
   * Agrega un nuevo dato fiscal en ecommerce-core para el usuario autenticado.
   */
  async guardarDatoFiscal(nuevoFiscal, usuario) {
    const val = validarDatosFiscales(nuevoFiscal)
    if (!val.esValida) {
      const primerError = Object.values(val.errores)[0]
      throw new Error(primerError)
    }

    const tipoNormalizado = nuevoFiscal.tipo === 'ruc' ? 'ruc' : 'cedula'
    const idFiscalNormalizada = nuevoFiscal.identificacion_fiscal?.trim()
    const razonSocialNormalizada = nuevoFiscal.razon_social?.trim()
    const dirFiscalNormalizada = nuevoFiscal.direccion_fiscal?.trim() || 'Quito, Pichincha'

    if (!usuario?.autenticado || !usuario?.id) {
      return [{
        id: 'invitado',
        tipo: tipoNormalizado,
        identificacion_fiscal: idFiscalNormalizada,
        razon_social: razonSocialNormalizada,
        direccion_fiscal: dirFiscalNormalizada,
        es_predeterminado: true
      }]
    }

    const esPredeterminado = Boolean(nuevoFiscal.es_predeterminado)
    if (esPredeterminado) {
      await supabaseCore
        .from('datos_fiscales_guardados')
        .update({ es_predeterminado: false })
        .eq('usuario_id', usuario.id)
        .catch(() => {})
    }

    const { error } = await supabaseCore
      .from('datos_fiscales_guardados')
      .insert({
        usuario_id: usuario.id,
        identificacion_fiscal: idFiscalNormalizada,
        razon_social: razonSocialNormalizada,
        direccion_fiscal: dirFiscalNormalizada,
        es_predeterminado: esPredeterminado
      })

    if (error) {
      console.error('Error insertando en datos_fiscales_guardados:', error)
      if (error.code === '23505') {
        throw new Error('Esta identificación fiscal ya está guardada en tu cuenta.')
      }
      throw new Error(error.message || 'No se pudieron guardar los datos fiscales.')
    }

    return this.obtenerDatosFiscales(usuario)
  },

  /**
   * Elimina un dato fiscal guardado en ecommerce-core.
   */
  async eliminarDatoFiscal(idFiscal, usuario) {
    if (!usuario?.autenticado || !usuario?.id) return []

    const { error } = await supabaseCore
      .from('datos_fiscales_guardados')
      .delete()
      .match({ id: idFiscal, usuario_id: usuario.id })

    if (error) {
      console.error('Error eliminando dato fiscal de Supabase:', error)
      throw new Error(error.message || 'No fue posible eliminar el registro fiscal.')
    }

    const restantes = await this.obtenerDatosFiscales(usuario)
    if (restantes.length > 0 && !restantes.some(f => f.es_predeterminado)) {
      await this.establecerDatoFiscalPredeterminado(restantes[0].id, usuario)
      return this.obtenerDatosFiscales(usuario)
    }

    return restantes
  },

  /**
   * Marca un perfil fiscal como predeterminado de forma atómica.
   */
  async establecerDatoFiscalPredeterminado(idFiscal, usuario) {
    if (!usuario?.autenticado || !usuario?.id) return []

    const { error } = await supabaseCore.rpc('establecer_dato_fiscal_predeterminado', {
      p_fiscal_id: idFiscal
    })

    if (error) {
      console.warn('Fallo RPC establecer_dato_fiscal_predeterminado, ejecutando alternativa:', error)
      await supabaseCore
        .from('datos_fiscales_guardados')
        .update({ es_predeterminado: false })
        .eq('usuario_id', usuario.id)
      await supabaseCore
        .from('datos_fiscales_guardados')
        .update({ es_predeterminado: true })
        .match({ id: idFiscal, usuario_id: usuario.id })
    }

    return this.obtenerDatosFiscales(usuario)
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
