/**
 * MODELO: carritoModelo.js
 * Persistencia y sincronización del carrito con la base de datos:
 * - Persistencia en ecommerce-core.items_carrito para usuarios autenticados.
 * - Sincronización estricta de stock en tiempo real con ecommerce-tx.inventario (sin stocks asumidos ni inventados).
 * - Carrito de invitados en localStorage conteniendo ÚNICAMENTE [{ producto_id, cantidad, seleccionado }].
 * - Enriquecimiento dinámico desde ecommerce-core.productos uniendo categorias(nombre, slug).
 * - Detección y retiro de productos inactivos o eliminados.
 * - Fusión de carrito al iniciar sesión mediante RPC fusionar_carrito.
 * - Cálculo unificado de impuestos y reglas de envío para Pichincha.
 */

import { supabaseCore, supabaseTx } from '../config/supabaseClient'

const CLAVE_LOCAL = 'tienda_perifericos_carrito_v2'
const CLAVE_LOCAL_LEGACY = 'tienda_perifericos_carrito_v1'

export const CarritoModelo = {
  /**
   * Obtiene los items del carrito de invitados almacenados en localStorage.
   * Solo devuelve [{ producto_id, cantidad, seleccionado }].
   */
  obtenerItemsLocales() {
    try {
      let datos = localStorage.getItem(CLAVE_LOCAL)
      if (!datos) {
        datos = localStorage.getItem(CLAVE_LOCAL_LEGACY)
      }
      if (!datos) return []
      const parsed = JSON.parse(datos)
      if (!Array.isArray(parsed)) return []
      return parsed
        .map(it => ({
          producto_id: Number(it.producto_id || it.id),
          cantidad: Math.max(1, Number(it.cantidad) || 1),
          seleccionado: it.seleccionado !== false
        }))
        .filter(it => !isNaN(it.producto_id) && it.producto_id > 0)
    } catch (e) {
      console.error('Error leyendo carrito local:', e)
      return []
    }
  },

  /**
   * Guarda únicamente [{ producto_id, cantidad, seleccionado }] en localStorage para invitados.
   */
  guardarItemsLocales(items) {
    try {
      const minimos = items.map(it => ({
        producto_id: Number(it.producto_id || it.id),
        cantidad: Math.max(1, Number(it.cantidad) || 1),
        seleccionado: it.seleccionado !== false
      }))
      localStorage.setItem(CLAVE_LOCAL, JSON.stringify(minimos))
      localStorage.removeItem(CLAVE_LOCAL_LEGACY)
    } catch (e) {
      console.error('Error guardando carrito local:', e)
    }
  },

  /**
   * Limpia el carrito local de invitados.
   */
  limpiarItemsLocales() {
    try {
      localStorage.removeItem(CLAVE_LOCAL)
      localStorage.removeItem(CLAVE_LOCAL_LEGACY)
    } catch (e) {
      console.error('Error limpiando carrito local:', e)
    }
  },

  /**
   * Obtiene los items crudos del carrito persistido en ecommerce-core para un usuario autenticado.
   */
  async obtenerItemsRemotos(usuarioId) {
    if (!usuarioId) return []
    const { data, error } = await supabaseCore
      .from('items_carrito')
      .select('producto_id, cantidad, seleccionado')
      .eq('usuario_id', usuarioId)

    if (error) {
      console.error('Error obteniendo items del carrito remoto:', error)
      throw new Error('No se pudo cargar el carrito desde la base de datos: ' + error.message)
    }
    return (data || []).map(it => ({
      producto_id: Number(it.producto_id),
      cantidad: Number(it.cantidad),
      seleccionado: it.seleccionado !== false
    }))
  },

  /**
   * Fusiona el carrito local de invitado con el carrito remoto del usuario mediante RPC.
   */
  async fusionarCarritoEnServidor(itemsLocales) {
    if (!itemsLocales || itemsLocales.length === 0) return
    const payload = itemsLocales.map(it => ({
      producto_id: Number(it.producto_id || it.id),
      cantidad: Math.max(1, Number(it.cantidad) || 1),
      seleccionado: it.seleccionado !== false
    }))

    const { error } = await supabaseCore.rpc('fusionar_carrito', { items: payload })
    if (error) {
      console.error('Error en RPC fusionar_carrito:', error)
      throw new Error(error.message || 'Error al fusionar el carrito.')
    }
    this.limpiarItemsLocales()
  },

  /**
   * Cruza items crudos ({ producto_id, cantidad, seleccionado }) con:
   * 1. Datos reales de productos en ecommerce-core uniendo categorias (nombre, slug).
   * 2. Stock real en ecommerce-tx.inventario (sin asumir 10 ni 99; sin stock real el producto es no comprable).
   * Ajusta cantidades si superan el stock, marca agotados y retira inactivos.
   */
  async sincronizarYEnriquecer(itemsCrudos, usuarioId = null) {
    if (!itemsCrudos || itemsCrudos.length === 0) {
      return { articulos: [], avisos: [], itemsAjustados: [] }
    }

    const ids = Array.from(new Set(itemsCrudos.map(i => Number(i.producto_id)).filter(Boolean)))
    if (ids.length === 0) {
      return { articulos: [], avisos: [], itemsAjustados: [] }
    }

    // 1. Consultar productos en ecommerce-core incluyendo categoria_id y relación categorias(nombre, slug)
    const { data: productos, error: errorProd } = await supabaseCore
      .from('productos')
      .select(`
        id,
        nombre,
        precio,
        precio_anterior,
        imagen_url,
        imagen_alt,
        categoria_id,
        activo,
        categorias ( nombre, slug )
      `)
      .in('id', ids)

    if (errorProd) {
      console.error('Error consultando productos para carrito:', errorProd)
      throw new Error('No se pudieron obtener los datos de los productos del carrito: ' + errorProd.message)
    }

    // 2. Consultar inventario real en ecommerce-tx
    const { data: inventario, error: errorInv } = await supabaseTx
      .from('inventario')
      .select('producto_id, stock_disponible')
      .in('producto_id', ids)

    if (errorInv) {
      console.error('Error al consultar inventario en Supabase TX:', errorInv)
    }

    const mapProductos = new Map((productos || []).map(p => [Number(p.id), p]))
    // Sin fila en inventario o con error de lectura, nunca se asume stock
    const mapStock = new Map(
      !errorInv && inventario
        ? inventario.map(inv => [Number(inv.producto_id), Number(inv.stock_disponible)])
        : []
    )

    const articulos = []
    const avisos = []
    const idsInactivosParaBorrar = []
    const itemsAjustados = []

    for (const item of itemsCrudos) {
      const prodId = Number(item.producto_id)
      const producto = mapProductos.get(prodId)

      // Si el producto no existe o está inactivo en el catálogo, se descarta
      if (!producto || !producto.activo) {
        const nombreDesc = producto?.nombre || `Producto #${prodId}`
        avisos.push(`El producto "${nombreDesc}" ya no se encuentra disponible y fue retirado de tu carrito.`)
        idsInactivosParaBorrar.push(prodId)
        continue
      }

      const tieneInventario = mapStock.has(prodId)
      const stockDisponible = tieneInventario ? Math.max(0, Number(mapStock.get(prodId)) || 0) : 0
      const agotado = !tieneInventario || stockDisponible <= 0

      let cantidad = Math.max(1, Number(item.cantidad) || 1)
      let seleccionado = item.seleccionado !== false

      if (agotado) {
        seleccionado = false
        if (errorInv) {
          avisos.push(`No se pudo verificar el stock de "${producto.nombre}". Se marcó como no disponible.`)
        } else if (!tieneInventario) {
          avisos.push(`"${producto.nombre}" no tiene inventario registrado en el almacén.`)
        } else {
          avisos.push(`"${producto.nombre}" está agotado en inventario.`)
        }
      } else if (cantidad > stockDisponible) {
        cantidad = stockDisponible
        avisos.push(`La cantidad de "${producto.nombre}" se ajustó a ${stockDisponible} por límite de stock disponible.`)
      }

      itemsAjustados.push({
        producto_id: prodId,
        cantidad,
        seleccionado
      })

      const nombreCategoria = producto.categorias?.nombre || 'Periférico'
      const slugCategoria = producto.categorias?.slug || 'perifericos'

      articulos.push({
        id: producto.id,
        producto_id: producto.id,
        nombre: producto.nombre,
        precio: Number(producto.precio),
        precio_anterior: producto.precio_anterior ? Number(producto.precio_anterior) : null,
        imagen_url: producto.imagen_url,
        imagen_alt: producto.imagen_alt || producto.nombre,
        categoria_id: producto.categoria_id,
        categoria: nombreCategoria,
        categoria_slug: slugCategoria,
        cantidad,
        seleccionado,
        stock_disponible: stockDisponible,
        agotado
      })
    }

    // Si hay usuario autenticado y se descartaron productos inactivos, eliminarlos de la BD con revisión explícita
    if (usuarioId && idsInactivosParaBorrar.length > 0) {
      const { error: errBorrar } = await supabaseCore
        .from('items_carrito')
        .delete()
        .eq('usuario_id', usuarioId)
        .in('producto_id', idsInactivosParaBorrar)

      if (errBorrar) {
        console.error('Error al depurar productos inactivos de items_carrito:', errBorrar)
      }
    }

    return { articulos, avisos, itemsAjustados }
  },

  /**
   * Consulta el stock disponible en tiempo real en ecommerce-tx.inventario.
   * Sin fila en inventario o con error, nunca se asume stock.
   */
  async obtenerStockProducto(productoId) {
    const { data: inv, error: errorInv } = await supabaseTx
      .from('inventario')
      .select('stock_disponible')
      .eq('producto_id', productoId)
      .maybeSingle()

    if (errorInv) {
      console.error('Error consultando inventario en TX:', errorInv)
      throw new Error('Error al verificar el stock en el almacén transaccional.')
    }

    if (!inv) {
      throw new Error('El producto no tiene registro de inventario en el almacén.')
    }

    const stock = Number(inv.stock_disponible) || 0
    if (stock <= 0) {
      throw new Error('Este producto se encuentra agotado en inventario.')
    }

    return stock
  },

  /**
   * Mutaciones en base de datos para usuarios autenticados
   */
  async agregarArticuloBD(usuarioId, productoId, cantidad = 1) {
    // 1. Validar stock real en ecommerce-tx sin stocks ficticios
    const stock = await this.obtenerStockProducto(productoId)

    // 2. Consultar si ya existe en items_carrito
    const { data: actual, error: errorActual } = await supabaseCore
      .from('items_carrito')
      .select('cantidad')
      .match({ usuario_id: usuarioId, producto_id: productoId })
      .maybeSingle()

    if (errorActual) {
      console.error('Error consultando items_carrito actual:', errorActual)
      throw new Error('Error al verificar el carrito en la base de datos.')
    }

    const cantidadActual = actual ? Number(actual.cantidad) || 0 : 0
    const nuevaCantidad = cantidadActual + cantidad

    if (nuevaCantidad > stock) {
      throw new Error(
        `Solo hay ${stock} unidad(es) disponible(s) en inventario. Ya tienes ${cantidadActual} en tu carrito.`
      )
    }

    const { error } = await supabaseCore
      .from('items_carrito')
      .upsert({
        usuario_id: usuarioId,
        producto_id: productoId,
        cantidad: nuevaCantidad,
        seleccionado: true
      })

    if (error) {
      console.error('Error agregando a items_carrito:', error)
      throw new Error('No se pudo guardar el producto en tu carrito en la base de datos: ' + error.message)
    }

    return nuevaCantidad
  },

  async eliminarArticuloBD(usuarioId, productoId) {
    const { error } = await supabaseCore
      .from('items_carrito')
      .delete()
      .match({ usuario_id: usuarioId, producto_id: productoId })

    if (error) {
      console.error('Error eliminando de items_carrito:', error)
      throw new Error('No se pudo eliminar el artículo de la base de datos: ' + error.message)
    }
  },

  async actualizarCantidadBD(usuarioId, productoId, cantidad) {
    if (cantidad <= 0) {
      return this.eliminarArticuloBD(usuarioId, productoId)
    }

    const stock = await this.obtenerStockProducto(productoId)

    if (cantidad > stock) {
      throw new Error(`Solo hay ${stock} unidad(es) disponible(s) en inventario.`)
    }

    const { error } = await supabaseCore
      .from('items_carrito')
      .update({ cantidad })
      .match({ usuario_id: usuarioId, producto_id: productoId })

    if (error) {
      console.error('Error actualizando cantidad en items_carrito:', error)
      throw new Error('No se pudo actualizar la cantidad en la base de datos: ' + error.message)
    }

    return cantidad
  },

  async alternarSeleccionBD(usuarioId, productoId, nuevoEstado) {
    const { error } = await supabaseCore
      .from('items_carrito')
      .update({ seleccionado: nuevoEstado })
      .match({ usuario_id: usuarioId, producto_id: productoId })

    if (error) {
      console.error('Error al actualizar selección en items_carrito:', error)
      throw new Error('No se pudo actualizar la selección en la base de datos: ' + error.message)
    }
  },

  async seleccionarTodosBD(usuarioId, seleccionados, idsValidos) {
    let query = supabaseCore
      .from('items_carrito')
      .update({ seleccionado: seleccionados })
      .eq('usuario_id', usuarioId)

    if (idsValidos && idsValidos.length > 0) {
      query = query.in('producto_id', idsValidos)
    }

    const { error } = await query
    if (error) {
      console.error('Error al seleccionar todos en items_carrito:', error)
      throw new Error('No se pudo actualizar la selección de todos en la base de datos: ' + error.message)
    }
  },

  async eliminarArticulosCompradosBD(usuarioId, idsComprados) {
    if (!idsComprados || idsComprados.length === 0) return
    const { error } = await supabaseCore
      .from('items_carrito')
      .delete()
      .eq('usuario_id', usuarioId)
      .in('producto_id', idsComprados)

    if (error) {
      console.error('Error eliminando artículos comprados de items_carrito:', error)
      throw new Error('Error al remover artículos comprados de la base de datos: ' + error.message)
    }
  },

  async vaciarCarritoBD(usuarioId) {
    const { error } = await supabaseCore
      .from('items_carrito')
      .delete()
      .eq('usuario_id', usuarioId)

    if (error) {
      console.error('Error vaciando items_carrito:', error)
      throw new Error('No se pudo vaciar el carrito en la base de datos: ' + error.message)
    }
  },

  /**
   * Calcula los totales dinámicamente con base en los artículos seleccionados (HU-07)
   * que NO estén agotados, y la configuración de la tienda.
   */
  calcularTotales(articulos, configuracion = null) {
    const cantidadTotal = articulos.reduce((acumulado, articulo) => acumulado + articulo.cantidad, 0)

    // Filtro de artículos marcados para compra y disponibles
    const articulosSeleccionados = articulos.filter(
      art => art.seleccionado !== false && !art.agotado && art.stock_disponible > 0
    )
    const cantidadSeleccionada = articulosSeleccionados.reduce((acc, art) => acc + art.cantidad, 0)

    const subtotal = articulosSeleccionados.reduce((acumulado, articulo) => {
      return acumulado + (articulo.precio * articulo.cantidad)
    }, 0)

    const ivaPorcentaje = Number(configuracion?.iva_porcentaje) || 0.15
    const envioGratisDesde = Number(configuracion?.envio_gratis_desde) || 50.00
    const costoEnvio = Number(configuracion?.costo_envio) || 5.00

    // Envíos a Quito y provincia de Pichincha: Gratis a partir de $50 (>=), caso contrario costo de envío
    const envio = subtotal >= envioGratisDesde || subtotal === 0 ? 0 : costoEnvio
    const impuestos = +(subtotal * ivaPorcentaje).toFixed(2)
    const total = +(subtotal + envio + impuestos).toFixed(2)

    const articulosComprables = articulos.filter(art => !art.agotado && art.stock_disponible > 0)
    const todosSeleccionados =
      articulosComprables.length > 0 && articulosComprables.every(art => art.seleccionado !== false)

    return {
      cantidadTotal,
      cantidadSeleccionada,
      subtotal: +subtotal.toFixed(2),
      envio,
      impuestos,
      total,
      articulosSeleccionados,
      haySeleccionados: articulosSeleccionados.length > 0,
      todosSeleccionados,
      envioGratisDesde
    }
  }
}
