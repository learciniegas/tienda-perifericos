/**
 * MODELO: catalogoModelo.js
 * Interacción directa con Supabase PostgREST para consulta de productos y categorías.
 * Implementa el patrón MVS (Modelo) abstrayendo el acceso a datos.
 */

import { supabaseCore } from '../config/supabaseClient'
import { PRODUCTOS_PREDETERMINADOS, CATEGORIAS_PREDETERMINADAS } from './tipos'

/**
 * Obtiene todas las categorías activas
 */
export async function obtenerCategorias() {
  try {
    const { data: categorias, error: errorConsulta } = await supabaseCore
      .from('categorias')
      .select('id, nombre, slug, descripcion, destacada')
      .order('id', { ascending: true })

    if (errorConsulta || !categorias || categorias.length === 0) {
      return CATEGORIAS_PREDETERMINADAS
    }

    return categorias.map(categoria => ({
      ...categoria,
      icono: categoria.slug || categoria.nombre.toLowerCase()
    }))
  } catch (error) {
    console.warn('Fallo al consultar categorías en Supabase, utilizando respaldo local:', error.message)
    return CATEGORIAS_PREDETERMINADAS
  }
}

/**
 * Obtiene la lista de productos activos con su categoría y marca
 */
export async function obtenerProductos(filtros = {}) {
  try {
    let consulta = supabaseCore
      .from('productos')
      .select(`
        id,
        nombre,
        descripcion,
        precio,
        imagen_url,
        imagen_alt,
        activo,
        creado_en,
        categoria_id,
        marca_id,
        categorias ( id, nombre, slug ),
        marcas ( id, nombre )
      `)
      .eq('activo', true)

    if (filtros.categoria_id) {
      consulta = consulta.eq('categoria_id', Number(filtros.categoria_id))
    }

    if (filtros.precio_min) {
      consulta = consulta.gte('precio', Number(filtros.precio_min))
    }

    if (filtros.precio_max) {
      consulta = consulta.lte('precio', Number(filtros.precio_max))
    }

    if (filtros.limite) {
      consulta = consulta.limit(Number(filtros.limite))
    }

    const { data: productos, error: errorConsulta } = await consulta

    if (errorConsulta || !productos || productos.length === 0) {
      return aplicarFiltrosLocales(PRODUCTOS_PREDETERMINADOS, filtros)
    }

    // Convierte el formato relacional de Supabase al modelo que espera la vista.
    let productosNormalizados = productos.map(productoBD => ({
      id: productoBD.id,
      nombre: productoBD.nombre,
      descripcion: productoBD.descripcion,
      precio: parseFloat(productoBD.precio),
      precio_anterior: (parseFloat(productoBD.precio) * 1.25).toFixed(2),
      descuento_porcentaje: 20,
      imagen_url: productoBD.imagen_url,
      imagen_alt: productoBD.imagen_alt || productoBD.nombre,
      categoria_id: productoBD.categoria_id,
      categoria: productoBD.categorias?.nombre || 'Periférico',
      categoria_slug: productoBD.categorias?.slug || 'perifericos',
      marca: productoBD.marcas?.nombre || 'Marca',
      en_stock: true,
      calificacion: 4.8,
      num_resenas: 120
    }))

    if (filtros.limite && productosNormalizados.length > filtros.limite) {
      productosNormalizados = productosNormalizados.slice(0, filtros.limite)
    }

    return productosNormalizados
  } catch (error) {
    console.warn('Fallo de red al consultar productos en Supabase, utilizando datos locales:', error.message)
    return aplicarFiltrosLocales(PRODUCTOS_PREDETERMINADOS, filtros)
  }
}

/**
 * Búsqueda de productos por texto o términos clave (HU-05)
 */
export async function buscarProductosPorTexto(termino) {
  if (!termino || termino.trim() === '') {
    return obtenerProductos()
  }

  const terminoNormalizado = termino.trim().toLowerCase()

  try {
    const { data: productos, error: errorConsulta } = await supabaseCore
      .from('productos')
      .select(`
        id,
        nombre,
        descripcion,
        precio,
        imagen_url,
        imagen_alt,
        categoria_id,
        categorias ( id, nombre, slug ),
        marcas ( id, nombre )
      `)
      .ilike('nombre', `%${terminoNormalizado}%`)
      .eq('activo', true)

    if (!errorConsulta && productos && productos.length > 0) {
      return productos.map(productoBD => ({
        id: productoBD.id,
        nombre: productoBD.nombre,
        descripcion: productoBD.descripcion,
        precio: parseFloat(productoBD.precio),
        precio_anterior: (parseFloat(productoBD.precio) * 1.25).toFixed(2),
        descuento_porcentaje: 20,
        imagen_url: productoBD.imagen_url,
        imagen_alt: productoBD.imagen_alt || productoBD.nombre,
        categoria_id: productoBD.categoria_id,
        categoria: productoBD.categorias?.nombre || 'Periférico',
        categoria_slug: productoBD.categorias?.slug || 'perifericos',
        marca: productoBD.marcas?.nombre || 'Marca',
        en_stock: true,
        calificacion: 4.8,
        num_resenas: 85
      }))
    }
  } catch (error) {
    console.warn('Error en búsqueda remota:', error.message)
  }

  // El catálogo local mantiene la búsqueda disponible cuando Supabase no responde.
  return PRODUCTOS_PREDETERMINADOS.filter(producto =>
    producto.nombre.toLowerCase().includes(terminoNormalizado) ||
    producto.categoria.toLowerCase().includes(terminoNormalizado) ||
    producto.marca.toLowerCase().includes(terminoNormalizado) ||
    (producto.descripcion && producto.descripcion.toLowerCase().includes(terminoNormalizado))
  )
}

function aplicarFiltrosLocales(productos, filtros) {
  // Aplica los mismos criterios en memoria para conservar el comportamiento sin conexión.
  let resultado = [...productos]

  if (filtros.categoria_id) {
    resultado = resultado.filter(producto => producto.categoria_id === Number(filtros.categoria_id))
  }

  if (filtros.precio_min) {
    resultado = resultado.filter(producto => producto.precio >= Number(filtros.precio_min))
  }

  if (filtros.precio_max) {
    resultado = resultado.filter(producto => producto.precio <= Number(filtros.precio_max))
  }

  if (filtros.solo_stock) {
    resultado = resultado.filter(producto => producto.en_stock)
  }

  if (filtros.limite) {
    resultado = resultado.slice(0, filtros.limite)
  }

  return resultado
}
