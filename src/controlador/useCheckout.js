/**
 * CONTROLADOR: useCheckout.js
 * Orquestador de la lógica de negocio para el proceso de checkout transaccional en Quito:
 * - Gestión y validación de direcciones de entrega en Quito (HU-05).
 * - Gestión y validación de datos fiscales con Cédula/RUC ecuatoriano (HU-05).
 * - Validación en el cliente del pago seguro con tarjeta (Algoritmo de Luhn) (HU-08).
 * - Ejecución del checkout transaccional y generación del comprobante (HU-08).
 */

import { useState, useEffect, useCallback } from 'react'
import { CheckoutModelo, SECTORES_QUITO } from '../modelo/checkoutModelo'
import {
  validarIdentificacion,
  validarAlgoritmoLuhn,
  detectarFranquiciaTarjeta,
  formatearNumeroTarjeta,
  formatearFechaExpiracion,
  validarFechaExpiracion,
  validarCvv
} from '../modelo/validadorModelo'
import { useCarrito } from './useCarrito'
import { useAutenticacion } from './useAuth'

export function useCheckout() {
  const { usuario } = useAutenticacion()
  const { articulosSeleccionados, totales, eliminarArticulosComprados } = useCarrito()

  // Estado de direcciones
  const [direcciones, setDirecciones] = useState([])
  const [direccionSeleccionadaId, setDireccionSeleccionadaId] = useState('')
  const [modoNuevaDireccion, setModoNuevaDireccion] = useState(false)
  const [formNuevaDireccion, setFormNuevaDireccion] = useState({
    alias: '',
    sector: SECTORES_QUITO[0],
    calle_principal: '',
    numeracion: '',
    referencia: '',
    es_predeterminada: false
  })
  const [erroresDireccion, setErroresDireccion] = useState({})

  // Estado de datos fiscales
  const [datosFiscales, setDatosFiscales] = useState([])
  const [fiscalSeleccionadoId, setFiscalSeleccionadoId] = useState('')
  const [modoNuevoFiscal, setModoNuevoFiscal] = useState(false)
  const [formNuevoFiscal, setFormNuevoFiscal] = useState({
    tipo: 'cedula',
    identificacion_fiscal: '',
    razon_social: '',
    direccion_fiscal: '',
    es_predeterminado: false
  })
  const [erroresFiscal, setErroresFiscal] = useState({})

  // Estado de tarjeta de crédito / débito
  const [datosTarjeta, setDatosTarjeta] = useState({
    numero: '4242 4242 4242 4242',
    titular: usuario?.nombre || 'Luis Morales',
    expiracion: '12/28',
    cvv: '123'
  })
  const [marcaTarjeta, setMarcaTarjeta] = useState('visa')
  const [erroresPago, setErroresPago] = useState({})

  // Estado de transacción y resultado
  const [cargandoInicial, setCargandoInicial] = useState(true)
  const [procesando, setProcesando] = useState(false)
  const [errorTransaccion, setErrorTransaccion] = useState('')
  const [ordenConfirmada, setOrdenConfirmada] = useState(null)

  // Carga inicial de datos guardados
  useEffect(() => {
    let activo = true

    async function cargarDatosIniciales() {
      try {
        const [dirsCargadas, fiscCargados] = await Promise.all([
          CheckoutModelo.obtenerDirecciones(usuario),
          CheckoutModelo.obtenerDatosFiscales(usuario)
        ])

        if (!activo) return

        setDirecciones(dirsCargadas)
        const dirPred = dirsCargadas.find(d => d.es_predeterminada) || dirsCargadas[0]
        if (dirPred) {
          setDireccionSeleccionadaId(dirPred.id)
        }

        setDatosFiscales(fiscCargados)
        const fiscPred = fiscCargados.find(f => f.es_predeterminado) || fiscCargados[0]
        if (fiscPred) {
          setFiscalSeleccionadoId(fiscPred.id)
        }
      } catch (err) {
        console.warn('Error cargando datos de checkout:', err)
      } finally {
        if (activo) setCargandoInicial(false)
      }
    }

    cargarDatosIniciales()

    return () => {
      activo = false
    }
  }, [usuario])

  // Manejo de formulario de nueva dirección
  const actualizarCampoNuevaDireccion = useCallback((campo, valor) => {
    setFormNuevaDireccion(prev => ({ ...prev, [campo]: valor }))
    setErroresDireccion(prev => ({ ...prev, [campo]: '' }))
  }, [])

  const guardarNuevaDireccion = useCallback(async (e) => {
    if (e) e.preventDefault()
    const errores = {}

    if (!formNuevaDireccion.calle_principal.trim()) {
      errores.calle_principal = 'La calle principal es obligatoria.'
    }
    if (!formNuevaDireccion.numeracion.trim()) {
      errores.numeracion = 'La numeración o intersección es requerida.'
    }
    if (!formNuevaDireccion.sector) {
      errores.sector = 'Selecciona un sector de Quito.'
    }

    if (Object.keys(errores).length > 0) {
      setErroresDireccion(errores)
      return false
    }

    try {
      const actualizadas = await CheckoutModelo.guardarDireccion(formNuevaDireccion, usuario)
      setDirecciones(actualizadas)
      const guardada = actualizadas[0]
      if (guardada) {
        setDireccionSeleccionadaId(guardada.id)
      }
      setModoNuevaDireccion(false)
      setFormNuevaDireccion({
        alias: '',
        sector: SECTORES_QUITO[0],
        calle_principal: '',
        numeracion: '',
        referencia: '',
        es_predeterminada: false
      })
      return true
    } catch (err) {
      setErroresDireccion({ general: 'No se pudo guardar la dirección: ' + err.message })
      return false
    }
  }, [formNuevaDireccion, usuario])

  // Manejo de formulario de nuevos datos fiscales
  const actualizarCampoNuevoFiscal = useCallback((campo, valor) => {
    setFormNuevoFiscal(prev => ({ ...prev, [campo]: valor }))
    setErroresFiscal(prev => ({ ...prev, [campo]: '' }))
  }, [])

  const guardarNuevoDatoFiscal = useCallback(async (e) => {
    if (e) e.preventDefault()
    const errores = {}

    if (!formNuevoFiscal.identificacion_fiscal.trim()) {
      errores.identificacion_fiscal = 'El número de identificación es requerido.'
    } else {
      const validacion = validarIdentificacion(formNuevoFiscal.identificacion_fiscal, formNuevoFiscal.tipo)
      if (!validacion.esValida) {
        errores.identificacion_fiscal = validacion.mensaje
      }
    }

    if (!formNuevoFiscal.razon_social.trim()) {
      errores.razon_social = 'La razón social o nombre completo es obligatorio.'
    }

    if (Object.keys(errores).length > 0) {
      setErroresFiscal(errores)
      return false
    }

    try {
      const actualizados = await CheckoutModelo.guardarDatoFiscal(formNuevoFiscal, usuario)
      setDatosFiscales(actualizados)
      const guardado = actualizados[0]
      if (guardado) {
        setFiscalSeleccionadoId(guardado.id)
      }
      setModoNuevoFiscal(false)
      setFormNuevoFiscal({
        tipo: 'cedula',
        identificacion_fiscal: '',
        razon_social: '',
        direccion_fiscal: '',
        es_predeterminado: false
      })
      return true
    } catch (err) {
      setErroresFiscal({ general: 'No se pudieron guardar los datos fiscales: ' + err.message })
      return false
    }
  }, [formNuevoFiscal, usuario])

  // Manejo de datos de tarjeta de crédito/débito
  const actualizarCampoTarjeta = useCallback((campo, valor) => {
    setErroresPago(prev => ({ ...prev, [campo]: '', general: '' }))

    if (campo === 'numero') {
      const formateado = formatearNumeroTarjeta(valor)
      setDatosTarjeta(prev => ({ ...prev, numero: formateado }))
      setMarcaTarjeta(detectarFranquiciaTarjeta(formateado))
      return
    }

    if (campo === 'expiracion') {
      const formateado = formatearFechaExpiracion(valor)
      setDatosTarjeta(prev => ({ ...prev, expiracion: formateado }))
      return
    }

    if (campo === 'cvv') {
      const soloNumeros = String(valor).replace(/\D/g, '').slice(0, 4)
      setDatosTarjeta(prev => ({ ...prev, cvv: soloNumeros }))
      return
    }

    setDatosTarjeta(prev => ({ ...prev, [campo]: valor }))
  }, [])

  const usarTarjetaPrueba = useCallback(() => {
    setDatosTarjeta({
      numero: '4242 4242 4242 4242',
      titular: usuario?.nombre || 'Luis Morales',
      expiracion: '12/28',
      cvv: '123'
    })
    setMarcaTarjeta('visa')
    setErroresPago({})
  }, [usuario])

  // Confirmar compra transaccional (HU-08)
  const confirmarCompra = useCallback(async (e) => {
    if (e) e.preventDefault()
    setErrorTransaccion('')

    // 1. Validar que haya artículos seleccionados
    if (!articulosSeleccionados || articulosSeleccionados.length === 0) {
      setErrorTransaccion('No tienes ningún artículo seleccionado para comprar en el carrito.')
      return false
    }

    // 2. Validar dirección seleccionada
    const direccionActiva = direcciones.find(d => d.id === direccionSeleccionadaId)
    if (!direccionActiva) {
      setErrorTransaccion('Por favor selecciona o ingresa una dirección de entrega en Quito.')
      return false
    }

    // 3. Validar datos fiscales seleccionados
    const fiscalActivo = datosFiscales.find(f => f.id === fiscalSeleccionadoId)
    if (!fiscalActivo) {
      setErrorTransaccion('Por favor selecciona o ingresa tus datos fiscales para la facturación.')
      return false
    }

    // 4. Validar tarjeta de crédito/débito en el navegador (Algoritmo de Luhn)
    const erroresValidacionPago = {}

    if (!datosTarjeta.titular.trim()) {
      erroresValidacionPago.titular = 'Ingresa el nombre del titular de la tarjeta.'
    }

    const numeroLimpio = datosTarjeta.numero.replace(/\D/g, '')
    if (!numeroLimpio) {
      erroresValidacionPago.numero = 'Ingresa el número de tarjeta.'
    } else if (!validarAlgoritmoLuhn(numeroLimpio)) {
      erroresValidacionPago.numero = 'El número de tarjeta no es válido (falla en el algoritmo de Luhn).'
    }

    const validacionExp = validarFechaExpiracion(datosTarjeta.expiracion)
    if (!validacionExp.esValida) {
      erroresValidacionPago.expiracion = validacionExp.mensaje
    }

    const validacionCvv = validarCvv(datosTarjeta.cvv, marcaTarjeta)
    if (!validacionCvv.esValida) {
      erroresValidacionPago.cvv = validacionCvv.mensaje
    }

    if (Object.keys(erroresValidacionPago).length > 0) {
      setErroresPago(erroresValidacionPago)
      setErrorTransaccion('Corrige los datos de la tarjeta antes de continuar.')
      return false
    }

    // 5. Iniciar proceso transaccional
    setProcesando(true)

    try {
      const comprobante = await CheckoutModelo.procesarPedidoTransaccional({
        usuario,
        direccion: direccionActiva,
        fiscal: fiscalActivo,
        articulosComprados: articulosSeleccionados,
        totales,
        datosPago: {
          numeroTarjeta: datosTarjeta.numero,
          titular: datosTarjeta.titular,
          marca: marcaTarjeta
        }
      })

      // Eliminar del carrito solo los artículos comprados
      eliminarArticulosComprados(articulosSeleccionados)

      setOrdenConfirmada(comprobante)
      setProcesando(false)
      return true
    } catch (err) {
      console.error('Error al procesar la compra transaccional:', err)
      setErrorTransaccion(err.message || 'Ocurrió un error al procesar el pedido. Intenta nuevamente.')
      setProcesando(false)
      return false
    }
  }, [
    articulosSeleccionados,
    direcciones,
    direccionSeleccionadaId,
    datosFiscales,
    fiscalSeleccionadoId,
    datosTarjeta,
    marcaTarjeta,
    usuario,
    totales,
    eliminarArticulosComprados
  ])

  return {
    // Direcciones
    direcciones,
    direccionSeleccionadaId,
    setDireccionSeleccionadaId,
    direccionSeleccionada: direcciones.find(d => d.id === direccionSeleccionadaId),
    modoNuevaDireccion,
    setModoNuevaDireccion,
    formNuevaDireccion,
    actualizarCampoNuevaDireccion,
    guardarNuevaDireccion,
    erroresDireccion,
    sectoresQuito: SECTORES_QUITO,

    // Fiscales
    datosFiscales,
    fiscalSeleccionadoId,
    setFiscalSeleccionadoId,
    fiscalSeleccionado: datosFiscales.find(f => f.id === fiscalSeleccionadoId),
    modoNuevoFiscal,
    setModoNuevoFiscal,
    formNuevoFiscal,
    actualizarCampoNuevoFiscal,
    guardarNuevoDatoFiscal,
    erroresFiscal,

    // Pago con tarjeta
    datosTarjeta,
    marcaTarjeta,
    erroresPago,
    actualizarCampoTarjeta,
    usarTarjetaPrueba,

    // Transacción y comprobante
    articulosSeleccionados,
    totales,
    cargandoInicial,
    procesando,
    errorTransaccion,
    ordenConfirmada,
    confirmarCompra
  }
}
