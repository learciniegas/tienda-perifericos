/**
 * CONTROLADOR: CarritoContext.jsx
 * Proveedor de contexto para el carrito de compras con soporte para:
 * - Persistencia por usuario autenticado en ecommerce-core.items_carrito (Fase 4).
 * - Sincronización y validación de inventario en tiempo real con ecommerce-tx.inventario.
 * - Carrito de invitados en localStorage conteniendo solo [{ producto_id, cantidad, seleccionado }].
 * - Fusión automática al autenticarse mediante RPC fusionar_carrito.
 * - Selección parcial de artículos (HU-07) y totales dinámicos para Pichincha (HU-08).
 */

import { useState, useCallback, useMemo, useEffect } from 'react'
import { CarritoModelo } from '../modelo/carritoModelo'
import { obtenerConfiguracionTienda } from '../modelo/catalogoModelo'
import { useAutenticacion } from './useAuth'
import { ContextoCarrito } from './contextos'

export function ProveedorCarrito({ children }) {
  const { usuario } = useAutenticacion()
  const [articulos, setArticulos] = useState([])
  const [configuracion, setConfiguracion] = useState(null)
  const [avisosInventario, setAvisosInventario] = useState([])
  const [cargando, setCargando] = useState(true)
  const [mensajeAccesible, setMensajeAccesible] = useState('')
  const [notificacionVisual, setNotificacionVisual] = useState(null)

  // Carga inicial de configuración de negocio de la tienda (IVA y envío)
  useEffect(() => {
    let activo = true
    obtenerConfiguracionTienda()
      .then((cfg) => {
        if (!activo) return
        setConfiguracion(cfg)
      })
      .catch(() => {})
    return () => {
      activo = false
    }
  }, [])

  // Sincronización y carga del carrito según estado de autenticación
  const sincronizarCarrito = useCallback(async () => {
    setCargando(true)
    try {
      if (usuario?.autenticado && usuario?.id) {
        // 1. Si existen artículos locales previos (de cuando navegaba como invitado), fusionar en servidor
        const itemsLocales = CarritoModelo.obtenerItemsLocales()
        if (itemsLocales.length > 0) {
          try {
            await CarritoModelo.fusionarCarritoEnServidor(itemsLocales)
          } catch (errFusion) {
            console.warn('No se pudo fusionar el carrito local:', errFusion)
          }
        }

        // 2. Cargar items remotos persistidos en ecommerce-core.items_carrito
        const itemsRemotos = await CarritoModelo.obtenerItemsRemotos(usuario.id)
        const { articulos: enriquecidos, avisos } = await CarritoModelo.sincronizarYEnriquecer(
          itemsRemotos,
          usuario.id
        )
        setArticulos(enriquecidos)
        if (avisos.length > 0) {
          setAvisosInventario(avisos)
          setMensajeAccesible(avisos[0])
        } else {
          setAvisosInventario([])
        }
      } else {
        // Invitado: leer de localStorage únicamente [{ producto_id, cantidad, seleccionado }]
        const itemsLocales = CarritoModelo.obtenerItemsLocales()
        const { articulos: enriquecidos, avisos, itemsAjustados } =
          await CarritoModelo.sincronizarYEnriquecer(itemsLocales)

        // Si se descartaron productos inactivos o se ajustó stock, guardar el estado limpio
        CarritoModelo.guardarItemsLocales(itemsAjustados)
        setArticulos(enriquecidos)
        if (avisos.length > 0) {
          setAvisosInventario(avisos)
          setMensajeAccesible(avisos[0])
        } else {
          setAvisosInventario([])
        }
      }
    } catch (error) {
      console.error('Error sincronizando carrito:', error)
      setMensajeAccesible('Hubo un problema sincronizando tu carrito con la base de datos.')
    } finally {
      setCargando(false)
    }
  }, [usuario])

  useEffect(() => {
    let activo = true
    queueMicrotask(() => {
      if (activo) {
        sincronizarCarrito()
      }
    })
    return () => {
      activo = false
    }
  }, [sincronizarCarrito])

  const limpiarMensaje = useCallback(() => {
    setMensajeAccesible('')
    setNotificacionVisual(null)
  }, [])

  const limpiarAvisosInventario = useCallback(() => {
    setAvisosInventario([])
  }, [])

  // HU-04 y HU-06: Agregar al carrito con validación de stock y persistencia en BD
  const agregarAlCarrito = useCallback(
    async (producto, cantidad = 1) => {
      try {
        if (usuario?.autenticado && usuario?.id) {
          await CarritoModelo.agregarArticuloBD(usuario.id, producto.id, cantidad)
          // Recargar carrito enriquecido desde la BD
          const itemsRemotos = await CarritoModelo.obtenerItemsRemotos(usuario.id)
          const { articulos: nuevos } = await CarritoModelo.sincronizarYEnriquecer(
            itemsRemotos,
            usuario.id
          )
          setArticulos(nuevos)

          const totalArticulos = nuevos.reduce((acc, art) => acc + art.cantidad, 0)
          const texto = `Se agregó "${producto.nombre}" al carrito. Total de artículos: ${totalArticulos}.`
          setMensajeAccesible(texto)
          setNotificacionVisual({
            producto: producto.nombre,
            imagen: producto.imagen_url,
            precio: producto.precio,
            totalArticulos
          })
        } else {
          const itemsLocales = CarritoModelo.obtenerItemsLocales()
          const idx = itemsLocales.findIndex(i => i.producto_id === producto.id)
          if (idx >= 0) {
            itemsLocales[idx].cantidad = Math.min(itemsLocales[idx].cantidad + cantidad, 99)
            itemsLocales[idx].seleccionado = true
          } else {
            itemsLocales.push({
              producto_id: producto.id,
              cantidad: Math.max(1, cantidad),
              seleccionado: true
            })
          }

          const { articulos: nuevos, itemsAjustados, avisos } =
            await CarritoModelo.sincronizarYEnriquecer(itemsLocales)
          CarritoModelo.guardarItemsLocales(itemsAjustados)
          setArticulos(nuevos)
          if (avisos.length > 0) setAvisosInventario(avisos)

          const totalArticulos = nuevos.reduce((acc, art) => acc + art.cantidad, 0)
          const texto = `Se agregó "${producto.nombre}" al carrito. Total de artículos: ${totalArticulos}.`
          setMensajeAccesible(texto)
          setNotificacionVisual({
            producto: producto.nombre,
            imagen: producto.imagen_url,
            precio: producto.precio,
            totalArticulos
          })
        }

        setTimeout(() => {
          setNotificacionVisual(null)
        }, 4500)
      } catch (err) {
        console.error('Error al agregar al carrito:', err)
        setMensajeAccesible(err.message || 'No se pudo agregar el producto al carrito.')
      }
    },
    [usuario]
  )

  // HU-07: Eliminar del carrito
  const eliminarDelCarrito = useCallback(
    async (productoId, nombreProducto = 'Producto') => {
      try {
        if (usuario?.autenticado && usuario?.id) {
          await CarritoModelo.eliminarArticuloBD(usuario.id, productoId)
        } else {
          const itemsLocales = CarritoModelo.obtenerItemsLocales().filter(
            i => i.producto_id !== productoId
          )
          CarritoModelo.guardarItemsLocales(itemsLocales)
        }

        setArticulos(prev => {
          const restantes = prev.filter(art => art.id !== productoId)
          const totalArticulos = restantes.reduce((acc, art) => acc + art.cantidad, 0)
          setMensajeAccesible(
            `Se eliminó "${nombreProducto}" del carrito. Artículos restantes: ${totalArticulos}.`
          )
          return restantes
        })
      } catch (err) {
        console.error('Error al eliminar artículo del carrito:', err)
        setMensajeAccesible('No fue posible eliminar el producto en la base de datos.')
      }
    },
    [usuario]
  )

  // Actualizar cantidad con validación de stock
  const actualizarCantidad = useCallback(
    async (productoId, cantidad) => {
      if (cantidad <= 0) {
        return eliminarDelCarrito(productoId)
      }

      try {
        if (usuario?.autenticado && usuario?.id) {
          const cantFinal = await CarritoModelo.actualizarCantidadBD(
            usuario.id,
            productoId,
            cantidad
          )
          setArticulos(prev =>
            prev.map(art => (art.id === productoId ? { ...art, cantidad: cantFinal } : art))
          )
        } else {
          const itemsLocales = CarritoModelo.obtenerItemsLocales().map(i => {
            if (i.producto_id === productoId) {
              return { ...i, cantidad: Math.min(Math.max(1, cantidad), 99) }
            }
            return i
          })
          const { articulos: nuevos, itemsAjustados, avisos } =
            await CarritoModelo.sincronizarYEnriquecer(itemsLocales)
          CarritoModelo.guardarItemsLocales(itemsAjustados)
          setArticulos(nuevos)
          if (avisos.length > 0) setAvisosInventario(avisos)
        }
      } catch (err) {
        console.error('Error al actualizar cantidad:', err)
        setMensajeAccesible(err.message || 'No fue posible actualizar la cantidad.')
      }
    },
    [usuario, eliminarDelCarrito]
  )

  // HU-07: Alternar selección individual
  const alternarSeleccion = useCallback(
    async (productoId) => {
      const actual = articulos.find(a => a.id === productoId)
      if (!actual || actual.agotado || actual.stock_disponible <= 0) return

      const nuevoEstado = !actual.seleccionado
      try {
        if (usuario?.autenticado && usuario?.id) {
          await CarritoModelo.alternarSeleccionBD(usuario.id, productoId, nuevoEstado)
        } else {
          const itemsLocales = CarritoModelo.obtenerItemsLocales().map(i => {
            if (i.producto_id === productoId) {
              return { ...i, seleccionado: nuevoEstado }
            }
            return i
          })
          CarritoModelo.guardarItemsLocales(itemsLocales)
        }

        setArticulos(prev =>
          prev.map(art => (art.id === productoId ? { ...art, seleccionado: nuevoEstado } : art))
        )
      } catch (err) {
        console.error('Error al alternar selección:', err)
        setMensajeAccesible('No fue posible actualizar la selección en la base de datos.')
      }
    },
    [articulos, usuario]
  )

  // HU-07: Seleccionar o deseleccionar todos los disponibles
  const seleccionarTodos = useCallback(
    async (seleccionados = true) => {
      const comprables = articulos.filter(a => !a.agotado && a.stock_disponible > 0)
      const idsValidos = comprables.map(a => a.id)

      try {
        if (usuario?.autenticado && usuario?.id) {
          await CarritoModelo.seleccionarTodosBD(usuario.id, Boolean(seleccionados), idsValidos)
        } else {
          const itemsLocales = CarritoModelo.obtenerItemsLocales().map(i => {
            const art = articulos.find(a => a.id === i.producto_id)
            if (art && !art.agotado && art.stock_disponible > 0) {
              return { ...i, seleccionado: Boolean(seleccionados) }
            }
            return i
          })
          CarritoModelo.guardarItemsLocales(itemsLocales)
        }

        setArticulos(prev =>
          prev.map(art =>
            !art.agotado && art.stock_disponible > 0
              ? { ...art, seleccionado: Boolean(seleccionados) }
              : art
          )
        )
        setMensajeAccesible(
          seleccionados
            ? 'Todos los artículos disponibles han sido seleccionados.'
            : 'Se han deseleccionado todos los artículos.'
        )
      } catch (err) {
        console.error('Error al seleccionar todos:', err)
        setMensajeAccesible('No fue posible actualizar la selección en la base de datos.')
      }
    },
    [articulos, usuario]
  )

  // HU-08: Remover solo los artículos comprados tras confirmar orden
  const eliminarArticulosComprados = useCallback(
    async (articulosComprados = []) => {
      const idsComprados = articulosComprados.map(a => a.id)
      try {
        if (usuario?.autenticado && usuario?.id) {
          await CarritoModelo.eliminarArticulosCompradosBD(usuario.id, idsComprados)
        } else {
          const restantes = CarritoModelo.obtenerItemsLocales().filter(
            i => !idsComprados.includes(i.producto_id)
          )
          CarritoModelo.guardarItemsLocales(restantes)
        }
        setArticulos(prev => prev.filter(art => !idsComprados.includes(art.id)))
        setMensajeAccesible('Se procesó la compra de los artículos seleccionados.')
      } catch (err) {
        console.error('Error eliminando artículos comprados:', err)
      }
    },
    [usuario]
  )

  // Vaciar carrito
  const vaciarCarrito = useCallback(async () => {
    try {
      if (usuario?.autenticado && usuario?.id) {
        await CarritoModelo.vaciarCarritoBD(usuario.id)
      } else {
        CarritoModelo.limpiarItemsLocales()
      }
      setArticulos([])
      setMensajeAccesible('El carrito ha sido vaciado.')
    } catch (err) {
      console.error('Error al vaciar carrito:', err)
      setMensajeAccesible('No se pudo vaciar el carrito en la base de datos.')
    }
  }, [usuario])

  // Cálculo memoizado de totales dinámicos
  const totales = useMemo(() => {
    return CarritoModelo.calcularTotales(articulos, configuracion)
  }, [articulos, configuracion])

  const valorContexto = {
    articulos,
    configuracion,
    cargando,
    avisosInventario,
    limpiarAvisosInventario,
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
    vaciarCarrito,
    sincronizarCarrito
  }

  return (
    <ContextoCarrito.Provider value={valorContexto}>
      {children}
    </ContextoCarrito.Provider>
  )
}
