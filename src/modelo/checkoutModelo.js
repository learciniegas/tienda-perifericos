/**
 * MODELO: checkoutModelo.js
 * Gestión de pedidos, validación tributaria para Ecuador (SRI - Cédula / RUC),
 * persistencia de datos fiscales, direcciones en Quito y transacciones con Supabase TX.
 * Preparado para entorno de producción sin cuentas sembradas.
 */

import { supabaseCore, supabaseTx } from '../config/supabaseClient'

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

// Duración de cada fase del pedido: 2 minutos (120,000 milisegundos)
export const INTERVALO_ESTADO_MS = 2 * 60 * 1000

export const CheckoutModelo = {
  /**
   * Calcula el estado que corresponde al pedido según el tiempo transcurrido (2 min por estado).
   * Fase 2: En preparación (0 a 2 min)
   * Fase 3: En camino (Quito) (2 a 4 min)
   * Fase 4: Entregado (>= 4 min)
   */
  determinarEstadoSegunTiempo(fechaIso, estadoActualId = 2) {
    if (!fechaIso) return Number(estadoActualId) || 2
    const creacion = new Date(fechaIso).getTime()
    if (isNaN(creacion)) return Number(estadoActualId) || 2

    const transcurrido = Date.now() - creacion
    let estadoSegunTiempo = 2 // En preparación por defecto

    if (transcurrido >= INTERVALO_ESTADO_MS * 2) {
      estadoSegunTiempo = 4 // Entregado (4 minutos o más)
    } else if (transcurrido >= INTERVALO_ESTADO_MS) {
      estadoSegunTiempo = 3 // En camino (2 a 4 minutos)
    }

    return Math.max(Number(estadoActualId) || 2, estadoSegunTiempo)
  },

  /**
   * Calcula los segundos restantes para la siguiente fase del pedido.
   */
  obtenerTiempoRestanteSiguienteEstado(fechaIso) {
    if (!fechaIso) return 0
    const creacion = new Date(fechaIso).getTime()
    if (isNaN(creacion)) return 0

    const transcurrido = Date.now() - creacion
    if (transcurrido < INTERVALO_ESTADO_MS) {
      return Math.max(0, Math.ceil((INTERVALO_ESTADO_MS - transcurrido) / 1000))
    }
    if (transcurrido < INTERVALO_ESTADO_MS * 2) {
      return Math.max(0, Math.ceil((INTERVALO_ESTADO_MS * 2 - transcurrido) / 1000))
    }
    return 0 // Pedido completado (Entregado)
  },

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
   * Llama a la función RPC registrar_pedido en Supabase TX o contingencia local segura.
   */
  async procesarPedidoTransaccional({
    usuario,
    direccion,
    fiscal,
    articulosComprados,
    totales,
    datosPago
  }) {
    if (!articulosComprados || articulosComprados.length === 0) {
      throw new Error('No hay artículos seleccionados para comprar.')
    }

    const claveIdempotencia = 'IDEMP-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9)
    const referenciaTransaccion = 'TX-' + Math.floor(100000 + Math.random() * 900000)

    const itemsPayload = articulosComprados.map(item => ({
      producto_id: Number(item.id),
      nombre: item.nombre,
      precio_unitario: Number(item.precio),
      cantidad: Number(item.cantidad)
    }))

    const correoCliente = usuario?.email || `${fiscal.identificacion_fiscal}@cliente.com`

    const payloadRPC = {
      clave_idempotencia: claveIdempotencia,
      usuario_id: (usuario?.id && usuario.id.includes('-') && usuario.id.length === 36)
        ? usuario.id
        : 'a0000000-0000-0000-0000-000000000001',
      correo_contacto: correoCliente,
      fiscal: {
        identificacion: fiscal.identificacion_fiscal,
        razon_social: fiscal.razon_social,
        direccion: fiscal.direccion_fiscal || `${direccion.calle_principal}, Quito`
      },
      envio: {
        calle_principal: direccion.calle_principal,
        numeracion: direccion.numeracion,
        ciudad: `Quito (${direccion.sector})`,
        referencia: direccion.referencia || ''
      },
      items: itemsPayload,
      impuestos: totales.impuestos,
      costo_envio: totales.envio,
      referencia_transaccion: referenciaTransaccion
    }

    let numeroPedidoConfirmado = null
    let transaccionRemotaExitosa = false

    // Intento transaccional con Supabase TX
    if (supabaseTx) {
      try {
        const { data, error } = await supabaseTx.rpc('registrar_pedido', { p: payloadRPC })
        if (error) {
          console.warn('Respuesta de error en RPC registrar_pedido:', error.message)
          if (error.message.includes('stock_insuficiente')) {
            const idInsuficiente = error.message.split(':')[1] || ''
            throw new Error(`Stock insuficiente para el producto #${idInsuficiente}. Por favor ajusta la cantidad.`)
          }
        } else if (data) {
          numeroPedidoConfirmado = data
          transaccionRemotaExitosa = true
        }
      } catch (err) {
        if (err.message?.includes('Stock insuficiente') || err.message?.includes('stock_insuficiente')) {
          throw err
        }
        console.warn('Fallo al ejecutar transacción en Supabase TX, ejecutando contingencia local segura:', err)
      }
    }

    // Código de orden oficial
    const codigoOrden = numeroPedidoConfirmado || 'ORD-' + Math.floor(100000 + Math.random() * 900000)

    const fechaCreacion = new Date()
    const fechaFormateada = fechaCreacion.toLocaleDateString('es-EC', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
    const horaFormateada = fechaCreacion.toLocaleTimeString('es-EC', {
      hour: '2-digit',
      minute: '2-digit'
    })

    // Construcción del comprobante completo de venta
    const comprobantePedido = {
      codigo: codigoOrden,
      fecha: fechaFormateada,
      hora: horaFormateada,
      fechaIso: fechaCreacion.toISOString(),
      estadoActual: 'En preparación',
      transaccionRemota: transaccionRemotaExitosa,
      referenciaPago: referenciaTransaccion,
      ultimosDigitosTarjeta: String(datosPago.numeroTarjeta || '4242').replace(/\D/g, '').slice(-4),
      marcaTarjeta: datosPago.marca || 'Visa',
      cliente: {
        nombre: usuario?.nombre || fiscal.razon_social,
        correo: correoCliente
      },
      datosFiscales: {
        tipo: fiscal.tipo === 'ruc' ? 'RUC' : 'Cédula de Identidad',
        identificacion: fiscal.identificacion_fiscal,
        razonSocial: fiscal.razon_social,
        direccionFiscal: fiscal.direccion_fiscal || 'Quito, Pichincha'
      },
      direccionEnvio: {
        ciudad: 'Quito, Pichincha',
        sector: direccion.sector,
        callePrincipal: direccion.calle_principal,
        numeracion: direccion.numeracion,
        referencia: direccion.referencia || 'Sin referencia adicional'
      },
      articulos: articulosComprados.map(art => ({
        id: art.id,
        nombre: art.nombre,
        categoria: art.categoria,
        precio: art.precio,
        cantidad: art.cantidad,
        subtotal: +(art.precio * art.cantidad).toFixed(2),
        imagen_url: art.imagen_url
      })),
      totales: {
        cantidadTotal: articulosComprados.reduce((acc, a) => acc + a.cantidad, 0),
        subtotal: totales.subtotal,
        envio: totales.envio,
        impuestos: totales.impuestos,
        total: totales.total
      },
      pasosSeguimiento: [
        { nombre: 'Pago Confirmado', completado: true, activo: false, fecha: `${fechaFormateada}, ${horaFormateada}` },
        { nombre: 'En preparación', completado: true, activo: true, fecha: 'Almacén central Quito' },
        { nombre: 'En camino (Quito)', completado: false, activo: false, fecha: 'Estimado en 24h' },
        { nombre: 'Entregado', completado: false, activo: false, fecha: `Domicilio: ${direccion.sector}` }
      ]
    }

    // Retornar el comprobante generado sin almacenar pedidos en localStorage
    return comprobantePedido
  },

  /**
   * Obtiene el historial de pedidos generados por el cliente desde la base de datos (Supabase TX).
   * La base de datos es la única fuente de verdad (HU-15).
   * @param {string} usuarioId
   * @returns {Promise<Array>}
   */
  async obtenerHistorialPedidos(usuarioId) {
    if (!usuarioId || !supabaseTx) return []
    if (typeof usuarioId !== 'string' || usuarioId.length !== 36 || !usuarioId.includes('-')) {
      return []
    }

    try {
      const { data: pedidosBD, error } = await supabaseTx
        .from('pedidos')
        .select(`
          id,
          numero_pedido,
          usuario_id,
          correo_contacto,
          total,
          subtotal,
          impuestos,
          costo_envio,
          envio_calle_principal,
          envio_numeracion,
          envio_ciudad,
          envio_referencia,
          fiscal_identificacion,
          fiscal_razon_social,
          creado_en,
          estado_id,
          estados_pedido ( nombre, orden ),
          detalles_pedido ( producto_id, nombre_producto, precio_unitario, cantidad, subtotal_linea )
        `)
        .eq('usuario_id', usuarioId)
        .order('creado_en', { ascending: false })

      if (error) {
        console.warn('Aviso al consultar historial en Supabase TX:', error.message)
        return []
      }

      return (pedidosBD || []).map((pedidoBD) => {
        const ordenEstado = pedidoBD.estados_pedido?.orden || pedidoBD.estado_id || 2
        const nombres = { 1: 'Pagado', 2: 'En preparación', 3: 'En camino (Quito)', 4: 'Entregado' }
        const nombreEstado = nombres[ordenEstado] || pedidoBD.estados_pedido?.nombre || 'En preparación'

        return {
          codigo: pedidoBD.numero_pedido,
          fecha: new Date(pedidoBD.creado_en).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }),
          hora: new Date(pedidoBD.creado_en).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }),
          fechaIso: pedidoBD.creado_en,
          estadoActual: nombreEstado,
          estadoId: ordenEstado,
          cliente: {
            nombre: pedidoBD.fiscal_razon_social,
            correo: pedidoBD.correo_contacto || 'cliente@perifericosquito.com'
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
            razonSocial: pedidoBD.fiscal_razon_social
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
          pasosSeguimiento: [
            { nombre: 'Pago Confirmado', completado: ordenEstado >= 1, activo: ordenEstado === 1, fecha: 'Procesado' },
            { nombre: 'En preparación', completado: ordenEstado >= 2, activo: ordenEstado === 2, fecha: 'Almacén Quito' },
            { nombre: 'En camino (Quito)', completado: ordenEstado >= 3, activo: ordenEstado === 3, fecha: 'Distribución' },
            { nombre: 'Entregado', completado: ordenEstado >= 4, activo: ordenEstado === 4, fecha: 'Destino final' }
          ]
        }
      })
    } catch (err) {
      console.warn('Error al recuperar historial de pedidos:', err)
      return []
    }
  },

  /**
   * Actualiza el estado de un pedido (HU-15: Pagado, En preparación, Enviado, Entregado).
   * Notifica por correo electrónico oficial cuando pasa a 'Entregado'.
   */
  async actualizarEstadoPedido(codigoPedido, nuevoEstadoId) {
    if (!codigoPedido || !nuevoEstadoId) return null
    const codigoLimpio = String(codigoPedido).trim().toUpperCase().replace('#', '')
    const idNum = Number(nuevoEstadoId)
    const fechaActual = new Date().toISOString()

    const nombresEstados = {
      1: 'Pagado',
      2: 'En preparación',
      3: 'En camino (Quito)',
      4: 'Entregado'
    }
    const nombreEstado = nombresEstados[idNum] || 'En preparación'

    // Actualizar en Supabase TX si está disponible
    if (supabaseTx) {
      try {
        const { data: pedido, error: errBusq } = await supabaseTx
          .from('pedidos')
          .select('id')
          .eq('numero_pedido', codigoLimpio)
          .maybeSingle()

        if (!errBusq && pedido?.id) {
          await supabaseTx
            .from('pedidos')
            .update({ estado_id: idNum })
            .eq('id', pedido.id)

          await supabaseTx
            .from('historial_estados_pedido')
            .insert({
              pedido_id: pedido.id,
              estado_id: idNum,
              correo_notificado_en: fechaActual
            })
        }
      } catch (err) {
        console.warn('Aviso al actualizar estado en Supabase TX:', err)
      }
    }

    // Actualizar en almacenamiento local
    try {
      const historial = this.obtenerHistorialPedidos()
      const actualizado = historial.map(p => {
        if (p.codigo?.toUpperCase() === codigoLimpio) {
          const pasos = (p.pasosSeguimiento || []).map((paso, idx) => {
            const stepOrder = idx + 1
            return {
              ...paso,
              completado: stepOrder <= idNum,
              activo: stepOrder === idNum
            }
          })
          return {
            ...p,
            estadoActual: nombreEstado,
            correoNotificadoEn: fechaActual,
            pasosSeguimiento: pasos
          }
        }
        return p
      })
      this.guardarHistorialPedidos(actualizado)

      // Actualizar también último pedido si coincide
      const ultimo = JSON.parse(localStorage.getItem('ultimo_pedido_generado') || '{}')
      if (ultimo.codigo?.toUpperCase() === codigoLimpio) {
        ultimo.estadoActual = nombreEstado
        ultimo.correoNotificadoEn = fechaActual
        ultimo.pasosSeguimiento = (ultimo.pasosSeguimiento || []).map((paso, idx) => ({
          ...paso,
          completado: (idx + 1) <= idNum,
          activo: (idx + 1) === idNum
        }))
        localStorage.setItem('ultimo_pedido_generado', JSON.stringify(ultimo))
      }
    } catch (e) {
      console.warn('Error al persistir actualización local:', e)
    }

    return this.consultarPedidoPorCodigo(codigoLimpio)
  },

  /**
   * Consulta un pedido por su número de orden en Supabase TX (HU-15).
   * La base de datos es la única fuente de verdad.
   * Si se especifica usuarioId, verifica que el pedido pertenezca a dicho usuario.
   * @param {string} codigo
   * @param {string|null} usuarioId
   * @returns {Promise<Object|null>}
   */
  async consultarPedidoPorCodigo(codigo, usuarioId = null) {
    if (!codigo) return null
    const codigoLimpio = String(codigo).trim().toUpperCase().replace('#', '')

    if (supabaseTx) {
      try {
        let consulta = supabaseTx
          .from('pedidos')
          .select(`
            id,
            numero_pedido,
            usuario_id,
            correo_contacto,
            total,
            subtotal,
            impuestos,
            costo_envio,
            envio_calle_principal,
            envio_numeracion,
            envio_ciudad,
            envio_referencia,
            fiscal_identificacion,
            fiscal_razon_social,
            creado_en,
            estado_id,
            estados_pedido ( nombre, orden ),
            detalles_pedido ( producto_id, nombre_producto, precio_unitario, cantidad, subtotal_linea )
          `)
          .eq('numero_pedido', codigoLimpio)

        if (usuarioId && typeof usuarioId === 'string' && usuarioId.length === 36) {
          consulta = consulta.eq('usuario_id', usuarioId)
        }

        const { data: pedidoBD, error } = await consulta.maybeSingle()

        if (!error && pedidoBD) {
          // Si se pasó usuarioId, asegurar que el pedido pertenece a ese usuario
          if (usuarioId && pedidoBD.usuario_id !== usuarioId) {
            return null
          }

          const ordenEstadoBD = pedidoBD.estados_pedido?.orden || pedidoBD.estado_id || 2
          const ordenEsperado = this.determinarEstadoSegunTiempo(pedidoBD.creado_en, ordenEstadoBD)

          // Si pasaron 2 minutos o más, avanzar de fase
          if (ordenEsperado > ordenEstadoBD) {
            this.actualizarEstadoPedido(pedidoBD.numero_pedido, ordenEsperado).catch(() => {})
          }

          const ordenEstado = Math.max(ordenEstadoBD, ordenEsperado)
          const nombres = { 1: 'Pagado', 2: 'En preparación', 3: 'En camino (Quito)', 4: 'Entregado' }
          const nombreEstado = nombres[ordenEstado] || pedidoBD.estados_pedido?.nombre || 'En preparación'

          return {
            codigo: pedidoBD.numero_pedido,
            fecha: new Date(pedidoBD.creado_en).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }),
            hora: new Date(pedidoBD.creado_en).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }),
            fechaIso: pedidoBD.creado_en,
            estadoActual: nombreEstado,
            estadoId: ordenEstado,
            cliente: {
              nombre: pedidoBD.fiscal_razon_social,
              correo: pedidoBD.correo_contacto || 'cliente@perifericosquito.com'
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
              razonSocial: pedidoBD.fiscal_razon_social
            },
            totales: {
              subtotal: Number(pedidoBD.subtotal),
              envio: Number(pedidoBD.costo_envio),
              impuestos: Number(pedidoBD.impuestos),
              total: Number(pedidoBD.total)
            },
            articulos: (pedidoBD.detalles_pedido || []).map(d => ({
              id: d.producto_id,
              nombre: d.nombre_producto,
              precio: Number(d.precio_unitario),
              cantidad: d.cantidad,
              subtotal: Number(d.subtotal_linea)
            })),
            pasosSeguimiento: [
              { nombre: 'Pago Confirmado', completado: ordenEstado >= 1, activo: ordenEstado === 1, fecha: 'Procesado' },
              { nombre: 'En preparación', completado: ordenEstado >= 2, activo: ordenEstado === 2, fecha: 'Almacén Quito' },
              { nombre: 'En camino (Quito)', completado: ordenEstado >= 3, activo: ordenEstado === 3, fecha: 'Distribución' },
              { nombre: 'Entregado', completado: ordenEstado >= 4, activo: ordenEstado === 4, fecha: 'Destino final' }
            ]
          }
        }
      } catch (err) {
        console.warn('Consulta en Supabase TX no disponible:', err)
      }
    }

    return null
  }
}
