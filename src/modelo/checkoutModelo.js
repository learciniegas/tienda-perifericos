/**
 * MODELO: checkoutModelo.js
 * Lógica de datos para el proceso de checkout en Quito, Pichincha:
 * - Sectores oficiales del cantón Quito (HU-05).
 * - Persistencia de direcciones de entrega y perfiles de datos fiscales.
 * - Invocación transaccional al procedimiento RPC `registrar_pedido` de Supabase (HU-08).
 * - Generación y persistencia de comprobantes de venta.
 */

import { supabaseCore, supabaseTx } from '../config/supabaseClient'

export const SECTORES_QUITO = [
  'La Carolina / Iñaquito',
  'Cumbayá',
  'Tumbaco',
  'Mariscal Sucre / La Floresta',
  'Centro Histórico / San Juan',
  'Quitumbe / Guamaní',
  'Carcelén / Ponceano',
  'Cotocollao / El Condado',
  'Villaflora / San Bartolo',
  'Calderón / Carapungo',
  'San Antonio de Pichincha',
  'Conocoto / Valle de Los Chillos',
  'González Suárez / Bellavista',
  'Monteserrín / Jipijapa'
]

const CLAVE_DIRECCIONES_LOCAL = 'tienda_perifericos_direcciones_v1'
const CLAVE_FISCALES_LOCAL = 'tienda_perifericos_fiscales_v1'
const CLAVE_PEDIDOS_LOCAL = 'tienda_perifericos_historial_pedidos_v1'

const DIRECCIONES_SEMILLA = [
  {
    id: 'dir-demo-1',
    alias: 'Casa Principal',
    sector: 'La Carolina / Iñaquito',
    calle_principal: 'Av. República del Salvador',
    numeracion: 'N36-84 y Naciones Unidas',
    referencia: 'Edificio Platinum Plaza, Piso 8, Dpto 802',
    ciudad: 'Quito',
    es_predeterminada: true
  },
  {
    id: 'dir-demo-2',
    alias: 'Oficina / Trabajo',
    sector: 'Cumbayá',
    calle_principal: 'Av. Interoceánica',
    numeracion: 'km 11.5 y Vía Láctea',
    referencia: 'Centro de Negocios Cumbayá, Oficina 304',
    ciudad: 'Quito',
    es_predeterminada: false
  }
]

const FISCALES_SEMILLA = [
  {
    id: 'fisc-demo-1',
    tipo: 'cedula',
    identificacion_fiscal: '1723456789',
    razon_social: 'Luis Morales Arciniegas',
    direccion_fiscal: 'Av. República del Salvador N36-84, Quito',
    es_predeterminado: true
  },
  {
    id: 'fisc-demo-2',
    tipo: 'ruc',
    identificacion_fiscal: '1792145678001',
    razon_social: 'Periféricos & Tech Solutions S.A.',
    direccion_fiscal: 'Av. Amazonas N24-102 y Cordero, Quito',
    es_predeterminado: false
  }
]

export const CheckoutModelo = {
  /**
   * Obtiene las direcciones guardadas del usuario.
   * Consulta Supabase si hay sesión y recurre a almacenamiento local.
   */
  async obtenerDirecciones(usuario) {
    if (usuario?.autenticado && usuario?.id && usuario.id !== 'user-demo-luis') {
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
      const datosLocales = localStorage.getItem(CLAVE_DIRECCIONES_LOCAL)
      if (datosLocales) {
        return JSON.parse(datosLocales)
      }
    } catch (e) {
      console.warn('Error leyendo direcciones locales:', e)
    }

    // Inicializar con direcciones de demostración en Quito
    this.guardarDireccionesLocales(DIRECCIONES_SEMILLA)
    return DIRECCIONES_SEMILLA
  },

  guardarDireccionesLocales(direcciones) {
    try {
      localStorage.setItem(CLAVE_DIRECCIONES_LOCAL, JSON.stringify(direcciones))
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

    direccionesActuales = [direccionNormalizada, ...direccionesActuales]
    this.guardarDireccionesLocales(direccionesActuales)

    // Si hay usuario con UUID en Supabase, sincronizar
    if (usuario?.autenticado && usuario?.id && usuario.id !== 'user-demo-luis') {
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
   * Elimina una dirección de entrega guardada (Release 1 - Gestionar Direcciones).
   */
  async eliminarDireccion(idDireccion, usuario) {
    let direccionesActuales = await this.obtenerDirecciones(usuario)
    direccionesActuales = direccionesActuales.filter(d => d.id !== idDireccion)

    // Si la eliminada era predeterminada y quedan otras, marcar la primera como predeterminada
    if (direccionesActuales.length > 0 && !direccionesActuales.some(d => d.es_predeterminada)) {
      direccionesActuales[0].es_predeterminada = true
    }

    this.guardarDireccionesLocales(direccionesActuales)

    if (usuario?.autenticado && usuario?.id && usuario.id !== 'user-demo-luis') {
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

    this.guardarDireccionesLocales(direccionesActuales)
    return direccionesActuales
  },

  /**
   * Obtiene los perfiles de datos fiscales guardados.
   */
  async obtenerDatosFiscales(usuario) {
    if (usuario?.autenticado && usuario?.id && usuario.id !== 'user-demo-luis') {
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
      const datosLocales = localStorage.getItem(CLAVE_FISCALES_LOCAL)
      if (datosLocales) {
        return JSON.parse(datosLocales)
      }
    } catch (e) {
      console.warn('Error leyendo fiscales locales:', e)
    }

    this.guardarFiscalesLocales(FISCALES_SEMILLA)
    return FISCALES_SEMILLA
  },

  guardarFiscalesLocales(fiscales) {
    try {
      localStorage.setItem(CLAVE_FISCALES_LOCAL, JSON.stringify(fiscales))
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

    fiscalesActuales = [fiscalNormalizado, ...fiscalesActuales]
    this.guardarFiscalesLocales(fiscalesActuales)

    if (usuario?.autenticado && usuario?.id && usuario.id !== 'user-demo-luis') {
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
   * Elimina un perfil fiscal guardado (Release 2 - Gestionar Datos Fiscales).
   */
  async eliminarDatoFiscal(idFiscal, usuario) {
    let fiscalesActuales = await this.obtenerDatosFiscales(usuario)
    fiscalesActuales = fiscalesActuales.filter(f => f.id !== idFiscal)

    if (fiscalesActuales.length > 0 && !fiscalesActuales.some(f => f.es_predeterminado)) {
      fiscalesActuales[0].es_predeterminado = true
    }

    this.guardarFiscalesLocales(fiscalesActuales)

    if (usuario?.autenticado && usuario?.id && usuario.id !== 'user-demo-luis') {
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

    this.guardarFiscalesLocales(fiscalesActuales)
    return fiscalesActuales
  },

  /**
   * Ejecuta el checkout transaccional (HU-08).
   * Llama a la función RPC `registrar_pedido` de Supabase si está disponible.
   * Si hay problema de red o fallo en el servidor, recurre a respaldo consistente.
   */
  async procesarPedidoTransaccional({ usuario, direccion, fiscal, articulosComprados, totales, datosPago }) {
    if (!articulosComprados || articulosComprados.length === 0) {
      throw new Error('No hay artículos seleccionados para procesar la compra.')
    }

    const claveIdempotencia = 'IDEMP-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9)
    const referenciaTransaccion = 'TX-' + Math.floor(100000 + Math.random() * 900000)

    // Formateo de items para la función RPC
    const itemsPayload = articulosComprados.map(item => ({
      producto_id: Number(item.id),
      nombre: item.nombre,
      precio_unitario: Number(item.precio),
      cantidad: Number(item.cantidad)
    }))

    const payloadRPC = {
      clave_idempotencia: claveIdempotencia,
      usuario_id: (usuario?.id && usuario.id.includes('-') && usuario.id.length === 36)
        ? usuario.id
        : 'a0000000-0000-0000-0000-000000000001',
      correo_contacto: usuario?.email || 'luis@ejemplo.com',
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
        if (err.message?.includes('Stock insuficiente')) {
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
        correo: usuario?.email || 'luis@ejemplo.com'
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

    // Persistir el último pedido para consulta inmediata
    try {
      localStorage.setItem('ultimo_pedido_generado', JSON.stringify(comprobantePedido))
      
      // Guardar en el historial general de pedidos del cliente
      const historialPrevio = JSON.parse(localStorage.getItem(CLAVE_PEDIDOS_LOCAL) || '[]')
      const nuevoHistorial = [comprobantePedido, ...historialPrevio.filter(p => p.codigo !== codigoOrden)]
      localStorage.setItem(CLAVE_PEDIDOS_LOCAL, JSON.stringify(nuevoHistorial))
    } catch (e) {
      console.warn('Error guardando pedido en historial local:', e)
    }

    return comprobantePedido
  },

  /**
   * Obtiene el historial de pedidos generados por el cliente (HU-15).
   */
  obtenerHistorialPedidos() {
    try {
      const historial = localStorage.getItem(CLAVE_PEDIDOS_LOCAL)
      return historial ? JSON.parse(historial) : []
    } catch (e) {
      console.warn('Error leyendo historial de pedidos:', e)
      return []
    }
  },

  /**
   * Consulta un pedido por su número de orden (HU-09 / HU-15).
   */
  async consultarPedidoPorCodigo(codigo) {
    if (!codigo) return null
    const codigoLimpio = String(codigo).trim().toUpperCase().replace('#', '')

    // Intentar buscar en Supabase TX primero
    if (supabaseTx) {
      try {
        const { data: pedidoBD, error } = await supabaseTx
          .from('pedidos')
          .select(`
            id,
            numero_pedido,
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
          .maybeSingle()

        if (!error && pedidoBD) {
          const nombreEstado = pedidoBD.estados_pedido?.nombre || 'En preparación'
          const ordenEstado = pedidoBD.estados_pedido?.orden || 2

          return {
            codigo: pedidoBD.numero_pedido,
            fecha: new Date(pedidoBD.creado_en).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }),
            hora: new Date(pedidoBD.creado_en).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }),
            estadoActual: nombreEstado,
            cliente: {
              nombre: pedidoBD.fiscal_razon_social,
              correo: 'cliente@ejemplo.com'
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
        console.warn('Consulta en Supabase no disponible, buscando en historial local:', err)
      }
    }

    // Búsqueda en historial local
    const historial = this.obtenerHistorialPedidos()
    const encontrado = historial.find(p => p.codigo?.toUpperCase() === codigoLimpio)
    if (encontrado) {
      return encontrado
    }

    // Ver si coincide con el último pedido
    try {
      const ultimo = JSON.parse(localStorage.getItem('ultimo_pedido_generado') || '{}')
      if (ultimo.codigo?.toUpperCase() === codigoLimpio) {
        return ultimo
      }
    } catch {
      // Ignorar error de parsing
    }

    return null
  }
}
