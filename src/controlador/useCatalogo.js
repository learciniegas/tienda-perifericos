/**
 * CONTROLADOR: useCatalogo.js
 * Hook personalizado para manejar la lógica de negocio y consultas del catálogo de periféricos.
 * Implementa estabilidad de referencias con useCallback para prevenir re-renders infinitos.
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { obtenerProductos, obtenerCategorias, buscarProductosPorTexto } from '../modelo/catalogoModelo'

export function useCatalogo(filtrosIniciales = {}) {
  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  
  // Guardar filtros iniciales memoizados
  const configuracionInicial = useMemo(() => ({
    categoria_id: null,
    precio_min: '',
    precio_max: '',
    solo_stock: false,
    orden: 'relevancia',
    ...filtrosIniciales
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [])

  const [filtros, setFiltros] = useState(configuracionInicial)

  // La bandera impide actualizar el estado si la vista se desmonta antes de responder.
  useEffect(() => {
    let activo = true
    obtenerCategorias()
      .then(categoriasCargadas => {
        if (activo) setCategorias(categoriasCargadas)
      })
      .catch(err => {
        if (activo) console.error('Error cargando categorías:', err)
      })
    return () => { activo = false }
  }, [])

  // Cada cambio de filtro vuelve a consultar y ordenar los productos.
  useEffect(() => {
    let activo = true

    const params = {
      categoria_id: filtros.categoria_id,
      precio_min: filtros.precio_min ? Number(filtros.precio_min) : null,
      precio_max: filtros.precio_max ? Number(filtros.precio_max) : null,
      limite: filtros.limite || null,
      solo_stock: filtros.solo_stock
    }

    obtenerProductos(params)
      .then(productosCargados => {
        if (!activo) return
        let resultado = [...productosCargados]

        if (filtros.solo_stock) {
          resultado = resultado.filter(p => p.en_stock)
        }

        if (filtros.orden === 'precio_asc') {
          resultado.sort((a, b) => a.precio - b.precio)
        } else if (filtros.orden === 'precio_desc') {
          resultado.sort((a, b) => b.precio - a.precio)
        } else if (filtros.orden === 'nombre_asc') {
          resultado.sort((a, b) => a.nombre.localeCompare(b.nombre))
        }

        setProductos(resultado)
        setCargando(false)
      })
      .catch(err => {
        if (!activo) return
        setError('Hubo un problema al cargar los periféricos: ' + err.message)
        setCargando(false)
      })

    return () => { activo = false }
  }, [filtros])

  // La referencia estable evita repetir la búsqueda desde efectos dependientes.
  const buscar = useCallback(async (termino) => {
    setCargando(true)
    setError(null)
    try {
      const productosEncontrados = await buscarProductosPorTexto(termino)
      setProductos(productosEncontrados)
    } catch (err) {
      setError('No se pudieron buscar los periféricos: ' + err.message)
    } finally {
      setCargando(false)
    }
  }, [])

  // Se conservan los filtros previos para permitir actualizaciones parciales.
  const actualizarFiltros = useCallback((nuevosFiltros) => {
    setCargando(true)
    setFiltros(prev => ({ ...prev, ...nuevosFiltros }))
  }, [])

  // Restablece el mismo conjunto de valores usado al iniciar el catálogo.
  const resetearFiltros = useCallback(() => {
    setCargando(true)
    setFiltros({
      categoria_id: null,
      precio_min: '',
      precio_max: '',
      solo_stock: false,
      orden: 'relevancia'
    })
  }, [])

  return {
    productos,
    categorias,
    cargando,
    error,
    filtros,
    actualizarFiltros,
    resetearFiltros,
    buscar
  }
}
