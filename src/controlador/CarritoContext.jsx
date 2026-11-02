/**
 * CONTROLADOR: CarritoContext.jsx
 * Proveedor de contexto para el carrito de compras con soporte para selección parcial (HU-07)
 * y persistencia por ítem.
 */

import { useState, useCallback, useMemo } from 'react'
import { CarritoModelo } from '../modelo/carritoModelo'
import { ContextoCarrito } from './contextos'

export function ProveedorCarrito({ children }) {
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

  // HU-07: Alternar selección individual
  const alternarSeleccion = useCallback((productoId) => {
    const nuevosArticulos = CarritoModelo.alternarSeleccionArticulo(productoId)
    setArticulos([...nuevosArticulos])
  }, [])

  // HU-07: Seleccionar o deseleccionar todos
  const seleccionarTodos = useCallback((seleccionados = true) => {
    const nuevosArticulos = CarritoModelo.seleccionarTodosArticulos(seleccionados)
    setArticulos([...nuevosArticulos])
    setMensajeAccesible(seleccionados ? 'Todos los artículos han sido seleccionados.' : 'Se han deseleccionado todos los artículos.')
  }, [])

  // HU-08: Remover solo los artículos comprados tras confirmar orden
  const eliminarArticulosComprados = useCallback((articulosComprados = []) => {
    const restantes = CarritoModelo.eliminarArticulosComprados(articulosComprados)
    setArticulos([...restantes])
    setMensajeAccesible('Se procesó la compra de los artículos seleccionados.')
  }, [])

  const vaciarCarrito = useCallback(() => {
    CarritoModelo.limpiarCarrito()
    setArticulos([])
    setMensajeAccesible('El carrito ha sido vaciado.')
  }, [])

  // Cálculo memoizado de totales dinámicos
  const totales = useMemo(() => {
    return CarritoModelo.calcularTotales(articulos)
  }, [articulos])

  const valorContexto = {
    articulos,
    articulosSeleccionados: totales.articulosSeleccionados,
    cantidadTotal: totales.cantidadTotal,
    cantidadSeleccionada: totales.cantidadSeleccionada,
    haySeleccionados: totales.haySeleccionados,
    todosSeleccionados: totales.todosSeleccionados,
    totales,
    mensajeAccesible,
    notificacionVisual,
    limpiarMensaje,
    agregarAlCarrito,
    eliminarDelCarrito,
    actualizarCantidad,
    alternarSeleccion,
    seleccionarTodos,
    eliminarArticulosComprados,
    vaciarCarrito
  }

  return (
    <ContextoCarrito.Provider value={valorContexto}>
      {children}
    </ContextoCarrito.Provider>
  )
}
