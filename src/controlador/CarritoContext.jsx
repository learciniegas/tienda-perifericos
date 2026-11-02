/**
 * CONTROLADOR: CarritoContext.jsx
 * Proveedor de contexto para el carrito de compras.
 */

import { useState, useCallback } from 'react'
import { CarritoModelo } from '../modelo/carritoModelo'
import { ContextoCarrito } from './contextos'

export function ProveedorCarrito({ children }) {
  // La carga perezosa recupera el carrito antes del primer renderizado.
  const [articulos, setArticulos] = useState(() => CarritoModelo.obtenerArticulos())
  const [mensajeAccesible, setMensajeAccesible] = useState('')
  const [notificacionVisual, setNotificacionVisual] = useState(null)

  const limpiarMensaje = useCallback(() => {
    setMensajeAccesible('')
    setNotificacionVisual(null)
  }, [])

  // HU-04 y HU-06: Agregar al carrito
  const agregarAlCarrito = useCallback((producto, cantidad = 1) => {
    const nuevosArticulos = CarritoModelo.agregarArticulo(producto, cantidad)
    setArticulos([...nuevosArticulos])

    const totalArticulos = nuevosArticulos.reduce((acumulado, articulo) => acumulado + articulo.cantidad, 0)
    const texto = `Se agregó "${producto.nombre}" al carrito. Total de artículos en el carrito: ${totalArticulos}.`

    setMensajeAccesible(texto)
    setNotificacionVisual({
      producto: producto.nombre,
      imagen: producto.imagen_url,
      precio: producto.precio,
      totalArticulos
    })

    // La notificación visual desaparece sin interrumpir el anuncio accesible.
    setTimeout(() => {
      setNotificacionVisual(null)
    }, 4500)
  }, [])

  // HU-07: Eliminar del carrito
  const eliminarDelCarrito = useCallback((productoId, nombreProducto = 'Producto') => {
    const nuevosArticulos = CarritoModelo.eliminarArticulo(productoId)
    setArticulos([...nuevosArticulos])

    const totalArticulos = nuevosArticulos.reduce((acumulado, articulo) => acumulado + articulo.cantidad, 0)
    setMensajeAccesible(`Se eliminó "${nombreProducto}" del carrito. Artículos restantes: ${totalArticulos}.`)
  }, [])

  const actualizarCantidad = useCallback((productoId, cantidad) => {
    const nuevosArticulos = CarritoModelo.actualizarCantidad(productoId, cantidad)
    setArticulos([...nuevosArticulos])
  }, [])

  const vaciarCarrito = useCallback(() => {
    CarritoModelo.limpiarCarrito()
    setArticulos([])
    setMensajeAccesible('El carrito ha sido vaciado.')
  }, [])

  const totales = CarritoModelo.calcularTotales(articulos)

  const valorContexto = {
    articulos,
    cantidadTotal: totales.cantidadTotal,
    totales,
    mensajeAccesible,
    notificacionVisual,
    limpiarMensaje,
    agregarAlCarrito,
    eliminarDelCarrito,
    actualizarCantidad,
    vaciarCarrito
  }

  return (
    <ContextoCarrito.Provider value={valorContexto}>
      {children}
    </ContextoCarrito.Provider>
  )
}
