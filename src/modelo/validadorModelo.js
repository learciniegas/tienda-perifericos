/**
 * MODELO: validadorModelo.js
 * Validadores de negocio sincronizados con las restricciones de la base de datos (Postgres):
 * - Validación de nombres de personas y perfiles (sin números, longitud 2-100, chk_perfiles_nombre).
 * - Validación estricta de correo electrónico (chk_contacto_correo).
 * - Algoritmo de Luhn y formato de tarjeta de crédito/débito por franquicia (Visa, Mastercard, Amex, Diners).
 * - Validación de cédula de identidad ecuatoriana (módulo 10).
 * - Validación de RUC ecuatoriano (personas naturales y jurídicas).
 * - Validación de fecha de expiración y código de seguridad CVV.
 */

/**
 * Valida un nombre y apellido conforme al check constraint de Postgres (chk_perfiles_nombre, chk_contacto_nombre).
 * Regla: longitud 2 a 100 caracteres, sin números. Permite letras con tildes, diéresis, ñ, espacios, puntos y guiones.
 * @param {string} nombre
 * @returns {{ esValido: boolean, mensaje: string }}
 */
export function validarNombrePersona(nombre) {
  const limpio = String(nombre || '').trim()

  if (!limpio) {
    return {
      esValido: false,
      mensaje: 'Por favor ingresa tu nombre y apellido completos.'
    }
  }

  if (limpio.length < 2) {
    return {
      esValido: false,
      mensaje: 'El nombre debe tener al menos 2 caracteres.'
    }
  }

  if (limpio.length > 100) {
    return {
      esValido: false,
      mensaje: 'El nombre no puede superar los 100 caracteres.'
    }
  }

  // Comprobar si contiene dígitos numéricos (Restricción de base de datos)
  if (/\d/.test(limpio)) {
    return {
      esValido: false,
      mensaje: 'El nombre no puede contener números. Ingresa únicamente letras y apellidos reales.'
    }
  }

  // Regex idéntico a chk_perfiles_nombre en Supabase Postgres
  const regexPostgres = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ][A-Za-zÁÉÍÓÚÜÑáéíóúüñ '.-]*$/
  if (!regexPostgres.test(limpio)) {
    return {
      esValido: false,
      mensaje: 'El nombre contiene caracteres especiales no válidos. Usa solo letras, espacios, guiones o puntos.'
    }
  }

  return { esValido: true, mensaje: 'Nombre válido.' }
}

/**
 * Valida un correo electrónico conforme al check constraint de Postgres (chk_contacto_correo).
 * Regla: máximo 254 caracteres, formato estándar con dominio válido.
 * @param {string} correo
 * @returns {{ esValido: boolean, mensaje: string }}
 */
export function validarCorreoElectronico(correo) {
  const limpio = String(correo || '').trim().toLowerCase()

  if (!limpio) {
    return {
      esValido: false,
      mensaje: 'Por favor ingresa tu correo electrónico.'
    }
  }

  if (limpio.length > 254) {
    return {
      esValido: false,
      mensaje: 'El correo electrónico no puede exceder los 254 caracteres.'
    }
  }

  // Expresión regular idéntica al check constraint chk_contacto_correo en Supabase
  const regexCorreo = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/
  if (!regexCorreo.test(limpio)) {
    return {
      esValido: false,
      mensaje: 'Ingresa un formato de correo electrónico válido (ejemplo: usuario@correo.com).'
    }
  }

  return { esValido: true, mensaje: 'Correo electrónico válido.' }
}

/**
 * Valida un número de cédula de identidad ecuatoriana mediante el algoritmo módulo 10.
 * @param {string} cedula - Cadena numérica de 10 dígitos.
 * @returns {{ esValida: boolean, mensaje: string }}
 */
export function validarCedulaEcuatoriana(cedula) {
  const limpia = String(cedula || '').replace(/\D/g, '')

  if (limpia.length !== 10) {
    return {
      esValida: false,
      mensaje: 'La cédula debe contener exactamente 10 dígitos numéricos.'
    }
  }

  // Código de provincia: 01 a 24, o 30
  const provincia = parseInt(limpia.substring(0, 2), 10)
  if (!((provincia >= 1 && provincia <= 24) || provincia === 30)) {
    return {
      esValida: false,
      mensaje: 'El código de provincia de la cédula no es válido.'
    }
  }

  // El tercer dígito para cédulas de persona natural debe ser menor a 6
  const tercerDigito = parseInt(limpia[2], 10)
  if (tercerDigito >= 6) {
    return {
      esValida: false,
      mensaje: 'El tercer dígito de la cédula no corresponde a persona natural.'
    }
  }

  // Algoritmo de Luhn / Módulo 10 ecuatoriano
  const coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2]
  let suma = 0

  for (let i = 0; i < 9; i++) {
    let valor = parseInt(limpia[i], 10) * coeficientes[i]
    if (valor >= 10) {
      valor -= 9
    }
    suma += valor
  }

  const digitoVerificadorCalculado = (10 - (suma % 10)) % 10
  const digitoVerificadorReal = parseInt(limpia[9], 10)

  if (digitoVerificadorCalculado !== digitoVerificadorReal) {
    return {
      esValida: false,
      mensaje: 'El número de cédula ingresado no es válido (dígito verificador incorrecto).'
    }
  }

  return { esValida: true, mensaje: 'Cédula válida.' }
}

/**
 * Valida un RUC ecuatoriano de 13 dígitos.
 * @param {string} ruc - Cadena numérica de 13 dígitos.
 * @returns {{ esValida: boolean, mensaje: string }}
 */
export function validarRucEcuatoriano(ruc) {
  const limpia = String(ruc || '').replace(/\D/g, '')

  if (limpia.length !== 13) {
    return {
      esValida: false,
      mensaje: 'El RUC debe contener exactamente 13 dígitos numéricos.'
    }
  }

  // Los últimos tres dígitos no deben ser 000
  if (limpia.substring(10, 13) === '000') {
    return {
      esValida: false,
      mensaje: 'El establecimiento del RUC (últimos 3 dígitos) debe ser distinto de 000 (ej. 001).'
    }
  }

  const provincia = parseInt(limpia.substring(0, 2), 10)
  if (!((provincia >= 1 && provincia <= 24) || provincia === 30)) {
    return {
      esValida: false,
      mensaje: 'El código de provincia del RUC no es válido.'
    }
  }

  const tercerDigito = parseInt(limpia[2], 10)

  // Caso 1: Persona Natural (tercer dígito < 6) -> Los primeros 10 dígitos son una cédula válida
  if (tercerDigito < 6) {
    const validacionCedula = validarCedulaEcuatoriana(limpia.substring(0, 10))
    if (!validacionCedula.esValida) {
      return {
        esValida: false,
        mensaje: 'Los primeros 10 dígitos del RUC de persona natural deben ser una cédula válida.'
      }
    }
    return { esValida: true, mensaje: 'RUC de persona natural válido.' }
  }

  // Caso 2: Sociedad privada o extranjera (tercer dígito = 9)
  if (tercerDigito === 9) {
    const coeficientes = [4, 3, 2, 7, 6, 5, 4, 3, 2]
    let suma = 0
    for (let i = 0; i < 9; i++) {
      suma += parseInt(limpia[i], 10) * coeficientes[i]
    }
    const residuo = suma % 11
    const verificadorCalculado = residuo === 0 ? 0 : 11 - residuo
    const verificadorReal = parseInt(limpia[9], 10)

    if (verificadorCalculado !== verificadorReal) {
      return { esValida: false, mensaje: 'El RUC de sociedad privada ingresado no es válido.' }
    }
    return { esValida: true, mensaje: 'RUC de sociedad privada válido.' }
  }

  // Caso 3: Entidad pública (tercer dígito = 6)
  if (tercerDigito === 6) {
    const coeficientes = [3, 2, 7, 6, 5, 4, 3, 2]
    let suma = 0
    for (let i = 0; i < 8; i++) {
      suma += parseInt(limpia[i], 10) * coeficientes[i]
    }
    const residuo = suma % 11
    const verificadorCalculado = residuo === 0 ? 0 : 11 - residuo
    const verificadorReal = parseInt(limpia[8], 10)

    if (verificadorCalculado !== verificadorReal) {
      return { esValida: false, mensaje: 'El RUC de entidad pública ingresado no es válido.' }
    }
    return { esValida: true, mensaje: 'RUC de entidad pública válido.' }
  }

  return {
    esValida: false,
    mensaje: 'El formato del RUC no corresponde a persona natural ni sociedad jurídica.'
  }
}

/**
 * Valida identificación según tipo ('cedula' o 'ruc').
 * @param {string} identificacion
 * @param {'cedula'|'ruc'} tipo
 * @returns {{ esValida: boolean, mensaje: string }}
 */
export function validarIdentificacion(identificacion, tipo = 'cedula') {
  if (tipo === 'ruc') {
    return validarRucEcuatoriano(identificacion)
  }
  return validarCedulaEcuatoriana(identificacion)
}

/**
 * Algoritmo de Luhn para validación de tarjetas de crédito/débito.
 * @param {string} numeroTarjeta
 * @returns {boolean}
 */
export function validarAlgoritmoLuhn(numeroTarjeta) {
  const limpia = String(numeroTarjeta || '').replace(/\D/g, '')

  if (limpia.length < 13 || limpia.length > 19) {
    return false
  }

  let suma = 0
  let debeDuplicar = false

  // Recorrer de derecha a izquierda
  for (let i = limpia.length - 1; i >= 0; i--) {
    let digito = parseInt(limpia.charAt(i), 10)

    if (debeDuplicar) {
      digito *= 2
      if (digito > 9) {
        digito -= 9
      }
    }

    suma += digito
    debeDuplicar = !debeDuplicar
  }

  return suma % 10 === 0
}

/**
 * Detecta la franquicia o marca de la tarjeta según los dígitos iniciales.
 * @param {string} numeroTarjeta
 * @returns {'visa'|'mastercard'|'amex'|'diners'|'desconocida'}
 */
export function detectarFranquiciaTarjeta(numeroTarjeta) {
  const limpia = String(numeroTarjeta || '').replace(/\D/g, '')

  if (/^4/.test(limpia)) return 'visa'
  if (/^(5[1-5]|2[2-7])/.test(limpia)) return 'mastercard'
  if (/^3[47]/.test(limpia)) return 'amex'
  if (/^3(0[0-5]|[68])/.test(limpia)) return 'diners'

  return 'desconocida'
}

/**
 * Formatea un número de tarjeta con espacios según la franquicia detectada.
 * - American Express: 15 dígitos (4 - 6 - 5)
 * - Diners Club: 14 dígitos (4 - 6 - 4)
 * - Visa, Mastercard y otras: bloques de 4 dígitos (hasta 19 dígitos)
 * @param {string} valor
 * @returns {string}
 */
export function formatearNumeroTarjeta(valor) {
  const limpia = String(valor || '').replace(/\D/g, '')
  const franquicia = detectarFranquiciaTarjeta(limpia)

  if (franquicia === 'amex') {
    const acotada = limpia.slice(0, 15)
    const p1 = acotada.slice(0, 4)
    const p2 = acotada.slice(4, 10)
    const p3 = acotada.slice(10, 15)
    return [p1, p2, p3].filter(Boolean).join(' ')
  }

  if (franquicia === 'diners') {
    const acotada = limpia.slice(0, 14)
    const p1 = acotada.slice(0, 4)
    const p2 = acotada.slice(4, 10)
    const p3 = acotada.slice(10, 14)
    return [p1, p2, p3].filter(Boolean).join(' ')
  }

  // Visa, Mastercard y genéricas
  const acotada = limpia.slice(0, 19)
  const partes = acotada.match(/.{1,4}/g)
  return partes ? partes.join(' ') : acotada
}

/**
 * Formatea la fecha de expiración como MM/AA.
 * @param {string} valor
 * @returns {string}
 */
export function formatearFechaExpiracion(valor) {
  const limpia = String(valor || '').replace(/\D/g, '').slice(0, 4)
  if (limpia.length >= 3) {
    return `${limpia.slice(0, 2)}/${limpia.slice(2)}`
  }
  return limpia
}

/**
 * Valida la fecha de expiración (MM/AA).
 * @param {string} expiracion - En formato MM/AA.
 * @returns {{ esValida: boolean, mensaje: string }}
 */
export function validarFechaExpiracion(expiracion) {
  const limpia = String(expiracion || '').trim()
  const partes = limpia.split('/')

  if (partes.length !== 2 || partes[0].length !== 2 || partes[1].length !== 2) {
    return { esValida: false, mensaje: 'La fecha de expiración debe tener el formato MM/AA.' }
  }

  const mes = parseInt(partes[0], 10)
  const anio = parseInt(partes[1], 10) + 2000

  if (mes < 1 || mes > 12) {
    return { esValida: false, mensaje: 'El mes de expiración debe estar entre 01 y 12.' }
  }

  const fechaActual = new Date()
  const anioActual = fechaActual.getFullYear()
  const mesActual = fechaActual.getMonth() + 1 // 1 a 12

  if (anio < anioActual || (anio === anioActual && mes < mesActual)) {
    return { esValida: false, mensaje: 'La tarjeta ingresada se encuentra expirada.' }
  }

  if (anio > anioActual + 20) {
    return { esValida: false, mensaje: 'El año de expiración no parece válido.' }
  }

  return { esValida: true, mensaje: 'Fecha de expiración válida.' }
}

/**
 * Valida el código de seguridad CVV (3 o 4 dígitos).
 * @param {string} cvv
 * @param {'visa'|'mastercard'|'amex'|'diners'|'desconocida'} franquicia
 * @returns {{ esValida: boolean, mensaje: string }}
 */
export function validarCvv(cvv, franquicia = 'desconocida') {
  const limpia = String(cvv || '').replace(/\D/g, '')
  const longitudRequerida = franquicia === 'amex' ? 4 : 3

  if (limpia.length !== longitudRequerida) {
    return {
      esValida: false,
      mensaje: `El código CVV debe tener ${longitudRequerida} dígitos.`
    }
  }

  return { esValida: true, mensaje: 'CVV válido.' }
}
