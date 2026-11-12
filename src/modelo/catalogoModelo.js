/**
 * MODELO: catalogoModelo.js
 * Interacción directa con Supabase PostgREST para consulta de productos, categorías, configuración y FAQs.
 * Implementa el patrón MVC abstrayendo el acceso a datos. La base de datos es la única fuente de verdad.
 */

import { supabaseCore, supabaseTx } from '../config/supabaseClient'

/**
 * Obtiene todas las categorías activas directamente desde la base de datos (Core).
 */
export async function obtenerCategorias() {
  const { data: categorias, error: errorConsulta } = await supabaseCore
    .from('categorias')
    .select('id, nombre, slug, descripcion, destacada')
    .order('id', { ascending: true })

  if (errorConsulta) {
    console.warn('Error al consultar categorías en Supabase Core:', errorConsulta.message)
    throw new Error('No se pudieron cargar las categorías desde la base de datos.')
  }

  if (!categorias || categorias.length === 0) {
    return []
  }

  return categorias.map(categoria => ({
    ...categoria,
    icono: categoria.slug || categoria.nombre.toLowerCase()
  }))
}

/**
 * Helper interno: enriquece productos con stock disponible en TX y métricas agregadas de reseñas en Core.
 */
async function enriquecerProductosConStockYResenas(productosBD) {
  if (!productosBD || productosBD.length === 0) return []

  const ids = productosBD.map(p => Number(p.id))

  // 1. Consultar stock disponible en Supabase TX (tabla inventario)
  const mapaStock = new Map()
  if (supabaseTx) {
    try {
      const { data: stockData, error: stockError } = await supabaseTx
        .from('inventario')
        .select('producto_id, stock_disponible')
        .in('producto_id', ids)

      if (!stockError && Array.isArray(stockData)) {
        stockData.forEach(item => {
          mapaStock.set(Number(item.producto_id), Number(item.stock_disponible))
        })
      }
    } catch (errStock) {
      console.warn('Aviso al consultar inventario en Supabase TX:', errStock)
    }
  }

  // 2. Consultar métricas de reseñas en Supabase Core (vista_resenas_agregados)
  const mapaAgregados = new Map()
  try {
    const { data: agregadosData, error: agError } = await supabaseCore
      .from('vista_resenas_agregados')
      .select('producto_id, total_resenas, calificacion_promedio')
      .in('producto_id', ids)

    if (!agError && Array.isArray(agregadosData)) {
      agregadosData.forEach(item => {
        mapaAgregados.set(Number(item.producto_id), {
          total_resenas: Number(item.total_resenas),
          calificacion_promedio: Number(item.calificacion_promedio)
        })
      })
    }
  } catch (errAg) {
    console.warn('Aviso al consultar agregados de reseñas en Supabase Core:', errAg)
  }

  return productosBD.map(productoBD => {
    const idNum = Number(productoBD.id)
    const precioNum = parseFloat(productoBD.precio)
    const precioAnt = productoBD.precio_anterior ? parseFloat(productoBD.precio_anterior) : null
    const tieneDescuento = Boolean(precioAnt && precioAnt > precioNum)
    const descuentoPorcentaje = tieneDescuento ? Math.round(((precioAnt - precioNum) / precioAnt) * 100) : null

    const stock = mapaStock.has(idNum) ? mapaStock.get(idNum) : 0
    const ag = mapaAgregados.get(idNum)

    return {
      id: idNum,
      nombre: productoBD.nombre,
      descripcion: productoBD.descripcion,
      precio: precioNum,
      precio_anterior: tieneDescuento ? precioAnt.toFixed(2) : null,
      descuento_porcentaje: descuentoPorcentaje,
      imagen_url: productoBD.imagen_url,
      imagen_alt: productoBD.imagen_alt || productoBD.nombre,
      categoria_id: productoBD.categoria_id,
      categoria: productoBD.categorias?.nombre || 'Periférico',
      categoria_slug: productoBD.categorias?.slug || 'perifericos',
      marca: productoBD.marcas?.nombre || 'Marca',
      en_stock: stock > 0,
      stock_disponible: stock,
      calificacion: ag ? ag.calificacion_promedio : 0,
      num_resenas: ag ? ag.total_resenas : 0
    }
  })
}

/**
 * Obtiene la lista de productos activos desde Supabase Core.
 * Los datos se cruzan con el stock real de TX y valoraciones de Core.
 */
export async function obtenerProductos(filtros = {}) {
  let consulta = supabaseCore
    .from('productos')
    .select(`
      id,
      nombre,
      descripcion,
      precio,
      precio_anterior,
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

  if (errorConsulta) {
    console.warn('Error al consultar productos en Supabase Core:', errorConsulta.message)
    throw new Error('Error al consultar el catálogo de productos.')
  }

  if (!productos || productos.length === 0) {
    return []
  }

  let productosNormalizados = await enriquecerProductosConStockYResenas(productos)

  if (filtros.solo_stock) {
    productosNormalizados = productosNormalizados.filter(p => p.en_stock)
  }

  if (filtros.limite && productosNormalizados.length > filtros.limite) {
    productosNormalizados = productosNormalizados.slice(0, filtros.limite)
  }

  return productosNormalizados
}

/**
 * Búsqueda de productos por texto o términos clave (HU-05)
 * Consulta en Supabase PostgREST integrando sinónimos validados.
 */
export async function buscarProductosPorTexto(termino) {
  if (!termino || termino.trim() === '') {
    return obtenerProductos()
  }

  const terminoNormalizado = termino.trim().toLowerCase()

  // 1. Consultar sinónimos en terminos_busqueda de Supabase
  let idsPorTermino = []
  try {
    const { data: terminosCoincidentes } = await supabaseCore
      .from('terminos_busqueda')
      .select('producto_id')
      .ilike('termino', `%${terminoNormalizado}%`)

    if (terminosCoincidentes && terminosCoincidentes.length > 0) {
      idsPorTermino = terminosCoincidentes
        .map(t => Number(t.producto_id))
        .filter(id => Number.isInteger(id) && id > 0)
    }
  } catch (e) {
    console.warn('Consulta en terminos_busqueda no disponible:', e)
  }

  // 2. Consulta de productos por nombre, descripción o coincidencia de sinónimos
  let consulta = supabaseCore
    .from('productos')
    .select(`
      id,
      nombre,
      descripcion,
      precio,
      precio_anterior,
      imagen_url,
      imagen_alt,
      categoria_id,
      categorias ( id, nombre, slug ),
      marcas ( id, nombre )
    `)
    .eq('activo', true)

  if (idsPorTermino.length > 0) {
    consulta = consulta.or(`nombre.ilike.%${terminoNormalizado}%,descripcion.ilike.%${terminoNormalizado}%,id.in.(${idsPorTermino.join(',')})`)
  } else {
    consulta = consulta.or(`nombre.ilike.%${terminoNormalizado}%,descripcion.ilike.%${terminoNormalizado}%`)
  }

  const { data: productos, error: errorConsulta } = await consulta

  if (errorConsulta) {
    console.warn('Error al buscar productos en Supabase Core:', errorConsulta.message)
    throw new Error('Error al buscar productos en el catálogo.')
  }

  if (!productos || productos.length === 0) {
    return []
  }

  return enriquecerProductosConStockYResenas(productos)
}

/**
 * Obtiene el detalle completo de un producto por ID con sus especificaciones técnicas reales.
 */
export async function obtenerProductoPorId(id) {
  const idNum = Number(id)
  if (!idNum) return null

  const { data: productoBD, error: errorConsulta } = await supabaseCore
    .from('productos')
    .select(`
      id,
      nombre,
      descripcion,
      precio,
      precio_anterior,
      imagen_url,
      imagen_alt,
      activo,
      categoria_id,
      marca_id,
      categorias ( id, nombre, slug ),
      marcas ( id, nombre )
    `)
    .eq('id', idNum)
    .eq('activo', true)
    .maybeSingle()

  if (errorConsulta) {
    console.warn('Error al consultar producto en Supabase Core:', errorConsulta.message)
    throw new Error('Error al consultar el producto en la base de datos.')
  }

  if (!productoBD) return null

  // Consultar especificaciones técnicas asociadas
  let especificaciones = []
  try {
    const { data: specs, error: errorSpecs } = await supabaseCore
      .from('especificaciones_producto')
      .select('id, nombre, valor')
      .eq('producto_id', idNum)
      .order('id', { ascending: true })

    if (!errorSpecs && specs && specs.length > 0) {
      especificaciones = specs
    }
  } catch (e) {
    console.warn('Error al consultar especificaciones en Supabase Core:', e)
  }

  const listaEnriquecida = await enriquecerProductosConStockYResenas([productoBD])
  const productoNormalizado = listaEnriquecida[0]

  return {
    ...productoNormalizado,
    especificaciones
  }
}

/**
 * Obtiene la configuración de negocio vigente desde Supabase Core (tabla configuracion_tienda).
 */
export async function obtenerConfiguracionTienda() {
  try {
    const { data, error } = await supabaseCore
      .from('configuracion_tienda')
      .select('clave, valor')

    if (error || !data || data.length === 0) {
      return {
        iva_porcentaje: 0.15,
        envio_gratis_desde: 50.00,
        costo_envio: 5.00
      }
    }

    const mapa = {}
    data.forEach(item => {
      mapa[item.clave] = typeof item.valor === 'number' ? item.valor : Number(item.valor)
    })

    return {
      iva_porcentaje: mapa.iva_porcentaje ?? 0.15,
      envio_gratis_desde: mapa.envio_gratis_desde ?? 50.00,
      costo_envio: mapa.costo_envio ?? 5.00
    }
  } catch (err) {
    console.warn('Aviso leyendo configuración de tienda en base de datos:', err)
    return {
      iva_porcentaje: 0.15,
      envio_gratis_desde: 50.00,
      costo_envio: 5.00
    }
  }
}

/**
 * Obtiene las preguntas frecuentes activas ordenadas por orden desde Supabase Core.
 */
export async function obtenerPreguntasFrecuentes() {
  const { data, error } = await supabaseCore
    .from('preguntas_frecuentes')
    .select('id, pregunta, respuesta, orden')
    .eq('activa', true)
    .order('orden', { ascending: true })

  if (error) {
    console.warn('Error al cargar preguntas frecuentes en Supabase Core:', error.message)
    throw new Error('No se pudieron cargar las preguntas frecuentes desde la base de datos.')
  }

  return data || []
}

/**
 * Obtiene las reseñas y estadísticas de valoración de un producto directamente desde la base de datos (Core).
 * La base de datos es la única fuente de verdad; sin respaldos inventados ni duplicación de semillas.
 */
export async function obtenerResenasProducto(productoId) {
  const idNum = Number(productoId)
  if (!idNum) {
    return { lista: [], total: 0, promedio: 0, distribucion: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }, porcentajes: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } }
  }

  try {
    const { data: resenasBD, error: errorConsulta } = await supabaseCore
      .from('resenas')
      .select('id, producto_id, calificacion, nombre_autor, titulo, comentario, ciudad, compra_verificada, creado_en')
      .eq('producto_id', idNum)
      .order('creado_en', { ascending: false })

    if (errorConsulta) {
      console.warn('Aviso al consultar reseñas en Supabase Core:', errorConsulta.message)
      throw new Error(errorConsulta.message)
    }

    const lista = (resenasBD || []).map(r => ({
      id: r.id,
      producto_id: r.producto_id,
      calificacion: Number(r.calificacion) || 5,
      nombre_autor: r.nombre_autor || 'Cliente',
      titulo: r.titulo || '',
      comentario: r.comentario || '',
      ciudad: r.ciudad || '',
      compra_verificada: Boolean(r.compra_verificada),
      creado_en: r.creado_en
    }))

    const total = lista.length
    const sumaCalificaciones = lista.reduce((acc, r) => acc + r.calificacion, 0)
    const promedio = total > 0 ? +(sumaCalificaciones / total).toFixed(1) : 0

    const distribucion = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    lista.forEach(r => {
      const estrellas = Math.min(5, Math.max(1, Math.round(r.calificacion)))
      distribucion[estrellas] = (distribucion[estrellas] || 0) + 1
    })

    const porcentajes = {
      5: total > 0 ? Math.round((distribucion[5] / total) * 100) : 0,
      4: total > 0 ? Math.round((distribucion[4] / total) * 100) : 0,
      3: total > 0 ? Math.round((distribucion[3] / total) * 100) : 0,
      2: total > 0 ? Math.round((distribucion[2] / total) * 100) : 0,
      1: total > 0 ? Math.round((distribucion[1] / total) * 100) : 0
    }

    return {
      lista,
      total,
      promedio,
      distribucion,
      porcentajes
    }
  } catch (err) {
    console.warn('Error al obtener reseñas de la base de datos:', err)
    return {
      lista: [],
      total: 0,
      promedio: 0,
      distribucion: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      porcentajes: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    }
  }
}

/**
 * Verifica en Supabase TX si el usuario autenticado adquirió el producto.
 * Consulta la Edge Function 'verificar-compra' en TX con el token de sesión de Core.
 * @param {number|string} productoId
 * @returns {Promise<boolean>}
 */
export async function verificarCompraUsuario(productoId) {
  if (!productoId) return false

  try {
    const { data: sesionData } = await supabaseCore.auth.getSession()
    const token = sesionData?.session?.access_token
    if (!token) return false

    const baseUrl = supabaseTx?.supabaseUrl || 'https://zxqmpylxvxnktqthvigl.supabase.co'
    const idNum = Number(productoId)

    const resp = await fetch(`${baseUrl}/functions/v1/verificar-compra?producto_id=${idNum}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!resp.ok) return false
    const datos = await resp.json()
    return Boolean(datos.compro)
  } catch (err) {
    console.warn('Error consultando verificación de compra en el servidor:', err)
    return false
  }
}

/**
 * Registra una nueva reseña y valoración de producto.
 * Valida la sesión y la compra verificada en el servidor a través de la Edge Function 'publicar-resena'.
 * Si el servidor rechaza o falla la operación, propaga el error directamente.
 */
export async function guardarResenaProducto({
  productoId,
  calificacion,
  comentario,
  titulo,
  ciudad
}) {
  const idNum = Number(productoId)
  if (!idNum) throw new Error('Identificador de producto inválido.')

  const { data: sesionData } = await supabaseCore.auth.getSession()
  const token = sesionData?.session?.access_token
  if (!token) {
    throw new Error('Debes iniciar sesión con tu cuenta para dejar una reseña.')
  }

  const califNum = Number(calificacion)
  if (!califNum || califNum < 1 || califNum > 5) {
    throw new Error('La calificación debe estar entre 1 y 5 estrellas.')
  }

  const baseUrl = supabaseCore.supabaseUrl || 'https://gkzkllnyveybjulyouiw.supabase.co'
  const resp = await fetch(`${baseUrl}/functions/v1/publicar-resena`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      producto_id: idNum,
      calificacion: califNum,
      titulo: titulo ? String(titulo).trim() : null,
      comentario: comentario ? String(comentario).trim() : null,
      ciudad: ciudad ? String(ciudad).trim() : null
    })
  })

  const datos = await resp.json().catch(() => ({}))

  if (!resp.ok) {
    throw new Error(datos.error || 'No se pudo publicar la reseña en el servidor.')
  }

  return {
    id: datos.resena_id,
    producto_id: idNum,
    calificacion: califNum,
    titulo: titulo ? String(titulo).trim() : '',
    comentario: comentario ? String(comentario).trim() : '',
    ciudad: ciudad ? String(ciudad).trim() : '',
    compra_verificada: true,
    creado_en: new Date().toISOString()
  }
}
