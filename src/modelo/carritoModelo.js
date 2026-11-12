/**
 * MODELO: carritoModelo.js
 * Persistencia y lógica del carrito con soporte para selección parcial de artículos (HU-07)
 * y cálculo dinámico de totales e impuestos para Pichincha (HU-08).
 */

const CLAVE_ALMACENAMIENTO = 'tienda_perifericos_carrito_v1'

export const CarritoModelo = {
  obtenerArticulos() {
    try {
      const datosGuardados = localStorage.getItem(CLAVE_ALMACENAMIENTO)
      if (!datosGuardados) return []
      const articulos = JSON.parse(datosGuardados)
      // Garantizar que cada artículo tenga el atributo 'seleccionado' (por defecto true)
      return articulos.map(art => ({
        ...art,
        seleccionado: art.seleccionado !== false
      }))
    } catch (error) {
      console.error('Error leyendo carrito de localStorage:', error)
      return []
    }
  },

  guardarArticulos(articulos) {
    try {
      localStorage.setItem(CLAVE_ALMACENAMIENTO, JSON.stringify(articulos))
    } catch (error) {
      console.error('Error guardando carrito en localStorage:', error)
    }
  },

  agregarArticulo(producto, cantidad = 1) {
    const articulos = this.obtenerArticulos()
    const indice = articulos.findIndex(articulo => articulo.id === producto.id)

    if (indice >= 0) {
      articulos[indice].cantidad = Math.min(articulos[indice].cantidad + cantidad, 99)
      articulos[indice].seleccionado = true
    } else {
      articulos.push({
        id: producto.id,
        nombre: producto.nombre,
        precio: Number(producto.precio),
        imagen_url: producto.imagen_url,
        imagen_alt: producto.imagen_alt || producto.nombre,
        categoria: producto.categoria,
        cantidad: Math.max(1, cantidad),
        seleccionado: true
      })
    }

    this.guardarArticulos(articulos)
    return articulos
  },

  eliminarArticulo(idProducto) {
    const articulos = this.obtenerArticulos().filter(articulo => articulo.id !== idProducto)
    this.guardarArticulos(articulos)
    return articulos
  },

  actualizarCantidad(idProducto, cantidad) {
    let articulos = this.obtenerArticulos()
    if (cantidad <= 0) {
      return this.eliminarArticulo(idProducto)
    }
    articulos = articulos.map(articulo => {
      if (articulo.id === idProducto) {
        return { ...articulo, cantidad: Math.min(cantidad, 99) }
      }
      return articulo
    })
    this.guardarArticulos(articulos)
    return articulos
  },

  /**
   * HU-07: Alterna la casilla de selección de un producto específico.
   */
  alternarSeleccionArticulo(idProducto) {
    const articulos = this.obtenerArticulos().map(art => {
      if (art.id === idProducto) {
        return { ...art, seleccionado: !art.seleccionado }
      }
      return art
    })
    this.guardarArticulos(articulos)
    return articulos
  },

  /**
   * HU-07: Marca o desmarca todos los artículos del carrito.
   */
  seleccionarTodosArticulos(seleccionados = true) {
    const articulos = this.obtenerArticulos().map(art => ({
      ...art,
      seleccionado: Boolean(seleccionados)
    }))
    this.guardarArticulos(articulos)
    return articulos
  },

  /**
   * HU-08: Al confirmar la compra, elimina solo los artículos que fueron comprados,
   * preservando en el carrito los artículos que no estaban seleccionados.
   */
  eliminarArticulosComprados(articulosComprados = []) {
    const idsComprados = new Set(articulosComprados.map(a => a.id))
    const articulosRestantes = this.obtenerArticulos().filter(art => !idsComprados.has(art.id))
    this.guardarArticulos(articulosRestantes)
    return articulosRestantes
  },

  limpiarCarrito() {
    try {
      localStorage.removeItem(CLAVE_ALMACENAMIENTO)
    } catch (error) {
      console.error('Error al vaciar el carrito local:', error)
    }
    return []
  },

  /**
   * Calcula los totales dinámicamente con base en los artículos seleccionados (HU-07) y la configuración de la tienda.
   */
  calcularTotales(articulos, configuracion = null) {
    const cantidadTotal = articulos.reduce((acumulado, articulo) => acumulado + articulo.cantidad, 0)
    
    // Filtro de artículos marcados para compra
    const articulosSeleccionados = articulos.filter(art => art.seleccionado !== false)
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

    const todosSeleccionados = articulos.length > 0 && articulos.every(art => art.seleccionado !== false)

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
