/**
 * MODELO: carritoModelo.js
 * Persistencia y lógica del carrito en localStorage (B2C sin cuenta requerida).
 * Cumple con HU-04, HU-06, HU-07, HU-08.
 */

const CLAVE_ALMACENAMIENTO = 'tienda_perifericos_carrito_v1'

export const CarritoModelo = {
  obtenerArticulos() {
    try {
      const datosGuardados = localStorage.getItem(CLAVE_ALMACENAMIENTO)
      // Si aún no hay datos guardados, el carrito comienza vacío.
      return datosGuardados ? JSON.parse(datosGuardados) : []
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
    } else {
      articulos.push({
        id: producto.id,
        nombre: producto.nombre,
        precio: Number(producto.precio),
        imagen_url: producto.imagen_url,
        imagen_alt: producto.imagen_alt || producto.nombre,
        categoria: producto.categoria,
        cantidad: Math.max(1, cantidad)
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

  limpiarCarrito() {
    try {
      localStorage.removeItem(CLAVE_ALMACENAMIENTO)
    } catch (error) {
      console.error('Error al vaciar el carrito local:', error)
    }
    return []
  },

  calcularTotales(articulos) {
    const cantidadTotal = articulos.reduce((acumulado, articulo) => acumulado + articulo.cantidad, 0)
    const subtotal = articulos.reduce((acumulado, articulo) => acumulado + (articulo.precio * articulo.cantidad), 0)
    // El envío es gratuito desde $50; los importes se redondean a centavos.
    const envio = subtotal > 50 || subtotal === 0 ? 0 : 5.00
    const impuestos = +(subtotal * 0.12).toFixed(2)
    const total = +(subtotal + envio + impuestos).toFixed(2)

    return {
      cantidadTotal,
      subtotal: +subtotal.toFixed(2),
      envio,
      impuestos,
      total
    }
  }
}
