/**
 * CONTROLADOR: AuthContext.jsx
 * Proveedor de contexto para la sesión de usuario con Supabase Auth.
 * Proporciona inicio de sesión (HU-09), registro con carrito activo (HU-10),
 * recuperación de contraseña, cierre de sesión y actualización de perfil en español.
 * Preparado para entorno de producción sin cuentas sembradas.
 */

import { useState, useEffect, useCallback } from 'react'
import { supabaseCore } from '../config/supabaseClient'
import { ContextoAutenticacion } from './contextos'
import { validarNombrePersona, validarCorreoElectronico } from '../modelo/validadorModelo'

const USUARIO_INVITADO = {
  id: null,
  email: null,
  nombre: 'Invitado',
  autenticado: false
}

const CLAVE_SESION_LOCAL = 'tienda_perifericos_sesion_activa_v1'
const CLAVE_USUARIOS_REGISTRADOS = 'tienda_perifericos_usuarios_registrados_v1'

export function ProveedorAutenticacion({ children }) {
  const [usuario, setUsuario] = useState(() => {
    try {
      const guardada = localStorage.getItem(CLAVE_SESION_LOCAL)
      if (guardada) {
        const sesion = JSON.parse(guardada)
        if (sesion && sesion.autenticado && sesion.id) {
          return sesion
        }
      }
    } catch {
      // Ignorar error de parsing
    }
    return USUARIO_INVITADO
  })

  // Sincronizar estado con almacenamiento local
  useEffect(() => {
    try {
      if (usuario.autenticado) {
        localStorage.setItem(CLAVE_SESION_LOCAL, JSON.stringify(usuario))
      } else {
        localStorage.removeItem(CLAVE_SESION_LOCAL)
      }
    } catch {
      // Ignorar error de almacenamiento
    }
  }, [usuario])

  useEffect(() => {
    let activo = true

    async function sincronizarSesion() {
      try {
        const { data: { session } } = await supabaseCore.auth.getSession()
        if (!activo) return
        if (session?.user) {
          setUsuario({
            id: session.user.id,
            email: session.user.email,
            nombre: session.user.user_metadata?.nombre || session.user.user_metadata?.nombre_completo || session.user.email.split('@')[0],
            autenticado: true
          })
        }
      } catch (error) {
        console.warn('No se pudo sincronizar la sesión con Supabase Auth:', error)
      }
    }

    sincronizarSesion()

    const { data: authListener } = supabaseCore.auth.onAuthStateChange((_evento, session) => {
      if (!activo) return
      if (session?.user) {
        setUsuario({
          id: session.user.id,
          email: session.user.email,
          nombre: session.user.user_metadata?.nombre || session.user.user_metadata?.nombre_completo || session.user.email.split('@')[0],
          autenticado: true
        })
      }
    })

    return () => {
      activo = false
      authListener?.subscription?.unsubscribe()
    }
  }, [])

  // HU-09: Iniciar Sesión con credenciales
  const iniciarSesion = useCallback(async (correo, contrasena) => {
    if (!correo || !contrasena) {
      throw new Error('Por favor ingresa tu correo electrónico y tu contraseña.')
    }

    const correoLimpio = correo.trim().toLowerCase()

    try {
      const { data, error } = await supabaseCore.auth.signInWithPassword({
        email: correoLimpio,
        password: contrasena
      })

      if (!error && data?.user) {
        const usuarioNuevo = {
          id: data.user.id,
          email: data.user.email,
          nombre: data.user.user_metadata?.nombre || data.user.user_metadata?.nombre_completo || data.user.email.split('@')[0],
          autenticado: true
        }
        setUsuario(usuarioNuevo)
        return usuarioNuevo
      }

      // Si Supabase devuelve error de credenciales, verificar si es una cuenta registrada localmente
      if (error) {
        try {
          const cuentasRegistradas = JSON.parse(localStorage.getItem(CLAVE_USUARIOS_REGISTRADOS) || '[]')
          const encontrada = cuentasRegistradas.find(c => c.email === correoLimpio && c.password === contrasena)
          if (encontrada) {
            const usuarioLocal = {
              id: encontrada.id,
              email: encontrada.email,
              nombre: encontrada.nombre,
              autenticado: true
            }
            setUsuario(usuarioLocal)
            return usuarioLocal
          }
        } catch {
          // Ignorar error de parsing local
        }

        throw new Error(error.message === 'Invalid login credentials'
          ? 'Credenciales no válidas. Revisa tu correo y contraseña.'
          : error.message
        )
      }
    } catch (err) {
      // Verificar si coincide con una cuenta creada por el usuario en esta instancia
      try {
        const cuentasRegistradas = JSON.parse(localStorage.getItem(CLAVE_USUARIOS_REGISTRADOS) || '[]')
        const encontrada = cuentasRegistradas.find(c => c.email === correoLimpio && c.password === contrasena)
        if (encontrada) {
          const usuarioLocal = {
            id: encontrada.id,
            email: encontrada.email,
            nombre: encontrada.nombre,
            autenticado: true
          }
          setUsuario(usuarioLocal)
          return usuarioLocal
        }
      } catch {
        // Ignorar
      }
      throw err
    }
  }, [])

  // HU-10: Registro estricto con validaciones de base de datos y envío de confirmación por correo
  const registrarse = useCallback(async (correo, contrasena, nombreCompleto) => {
    // Validar nombre con el check constraint de Postgres (sin números, 2-100 caracteres)
    const valNombre = validarNombrePersona(nombreCompleto)
    if (!valNombre.esValido) {
      throw new Error(valNombre.mensaje)
    }

    // Validar correo con el check constraint de Postgres
    const valCorreo = validarCorreoElectronico(correo)
    if (!valCorreo.esValido) {
      throw new Error(valCorreo.mensaje)
    }

    if (!contrasena || contrasena.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres.')
    }

    const correoLimpio = correo.trim().toLowerCase()
    const nombreLimpio = nombreCompleto.trim()

    // Llamada oficial a Supabase Auth para registro y envío de correo de verificación
    const { data, error } = await supabaseCore.auth.signUp({
      email: correoLimpio,
      password: contrasena,
      options: {
        emailRedirectTo: window.location.origin + '/login',
        data: {
          nombre_completo: nombreLimpio,
          nombre: nombreLimpio
        }
      }
    })

    if (error) {
      if (error.message.includes('already registered')) {
        throw new Error('Este correo electrónico ya se encuentra registrado. Por favor inicia sesión.')
      }
      throw new Error(error.message || 'Error al registrar la cuenta en la base de datos.')
    }

    // Si Supabase requiere confirmación por correo, la sesión viene nula
    if (data?.user && !data?.session) {
      return {
        requiereConfirmacion: true,
        email: correoLimpio,
        nombre: nombreLimpio
      }
    }

    if (data?.session && data?.user) {
      const usuarioActivo = {
        id: data.user.id,
        email: data.user.email,
        nombre: nombreLimpio,
        autenticado: true
      }
      setUsuario(usuarioActivo)
      return usuarioActivo
    }

    return {
      requiereConfirmacion: true,
      email: correoLimpio,
      nombre: nombreLimpio
    }
  }, [])

  // Recuperar Contraseña mediante enlace seguro al correo
  const recuperarContrasena = useCallback(async (correo) => {
    const valCorreo = validarCorreoElectronico(correo)
    if (!valCorreo.esValido) {
      throw new Error(valCorreo.mensaje)
    }

    const correoLimpio = correo.trim().toLowerCase()
    const { error } = await supabaseCore.auth.resetPasswordForEmail(correoLimpio, {
      redirectTo: window.location.origin + '/restablecer-contrasena'
    })

    if (error) {
      throw new Error(error.message || 'No fue posible despachar el correo de recuperación.')
    }

    return { exito: true, mensaje: `Se ha enviado un enlace de recuperación seguro al correo ${correoLimpio}.` }
  }, [])

  // Cerrar Sesión y limpiar almacenamiento local
  const cerrarSesion = useCallback(async () => {
    try {
      await supabaseCore.auth.signOut()
    } catch (err) {
      console.warn('Error cerrando sesión en Supabase:', err)
    }
    try {
      localStorage.removeItem(CLAVE_SESION_LOCAL)
      localStorage.removeItem('ultimo_pedido_generado')
      localStorage.removeItem('tienda_perifericos_pedidos_locales_v1')
    } catch {
      // Ignorar
    }
    setUsuario(USUARIO_INVITADO)
  }, [])

  // Actualizar datos del perfil (Cambio de Correo y Nombre)
  const actualizarPerfil = useCallback(async ({ nombre, email }) => {
    const usuarioActualizado = {
      ...usuario,
      nombre: nombre || usuario.nombre,
      email: email || usuario.email
    }
    setUsuario(usuarioActualizado)

    // Intentar sincronizar con Supabase
    if (usuario.id && usuario.id.includes('-') && usuario.id.length === 36) {
      try {
        await supabaseCore.auth.updateUser({
          email: email || undefined,
          data: { nombre_completo: nombre }
        })
      } catch (err) {
        console.warn('No se pudo sincronizar actualización de perfil con Supabase:', err)
      }
    }

    // Actualizar también en respaldo local de cuentas si existe
    try {
      const cuentasRegistradas = JSON.parse(localStorage.getItem(CLAVE_USUARIOS_REGISTRADOS) || '[]')
      const actualizadas = cuentasRegistradas.map(c => {
        if (c.id === usuario.id || c.email === usuario.email) {
          return { ...c, nombre: nombre || c.nombre, email: email || c.email }
        }
        return c
      })
      localStorage.setItem(CLAVE_USUARIOS_REGISTRADOS, JSON.stringify(actualizadas))
    } catch {
      // Ignorar
    }

    return usuarioActualizado
  }, [usuario])

  return (
    <ContextoAutenticacion.Provider
      value={{
        usuario,
        iniciarSesion,
        registrarse,
        recuperarContrasena,
        cerrarSesion,
        actualizarPerfil
      }}
    >
      {children}
    </ContextoAutenticacion.Provider>
  )
}
