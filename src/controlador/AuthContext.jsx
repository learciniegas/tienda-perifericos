/**
 * CONTROLADOR: AuthContext.jsx
 * Proveedor de contexto para la sesión de usuario conectado exclusivamente con Supabase Core Auth (Fase 6).
 * - La sesión de la app proviene únicamente de supabaseCore.auth.getSession() y onAuthStateChange.
 * - Eliminado todo almacenamiento local de credenciales en texto plano.
 * - Manejo riguroso de eventos SIGNED_OUT, TOKEN_REFRESHED y revocación de sesión.
 * - Actualización de perfil atómica contra perfiles.nombre_completo y auth.updateUser({ email }).
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

// Limpieza proactiva de credenciales locales obsoletas en texto plano (Fase 6)
try {
  localStorage.removeItem('tienda_perifericos_usuarios_registrados_v1')
} catch {
  // Ignorar en entornos sin localStorage
}

export function ProveedorAutenticacion({ children }) {
  const [usuario, setUsuario] = useState(USUARIO_INVITADO)
  const [cargandoSesion, setCargandoSesion] = useState(true)

  // Función auxiliar para obtener el nombre del perfil de la base de datos
  const obtenerNombrePerfil = useCallback(async (user) => {
    if (!user?.id) return 'Invitado'
    try {
      const { data: perfil } = await supabaseCore
        .from('perfiles')
        .select('nombre_completo')
        .eq('id', user.id)
        .maybeSingle()

      if (perfil?.nombre_completo) {
        return perfil.nombre_completo
      }
    } catch (e) {
      console.warn('No se pudo consultar el perfil en la base de datos:', e)
    }

    return (
      user.user_metadata?.nombre_completo ||
      user.user_metadata?.nombre ||
      user.email?.split('@')[0] ||
      'Usuario'
    )
  }, [])

  // Sincronización inicial y escucha de cambios en la sesión de Supabase Auth
  useEffect(() => {
    let activo = true

    async function inicializarSesion() {
      try {
        const {
          data: { session }
        } = await supabaseCore.auth.getSession()

        if (!activo) return

        if (session?.user) {
          const nombre = await obtenerNombrePerfil(session.user)
          if (!activo) return
          const usuarioActivo = {
            id: session.user.id,
            email: session.user.email,
            nombre,
            autenticado: true
          }
          setUsuario(usuarioActivo)
          try {
            localStorage.setItem(CLAVE_SESION_LOCAL, JSON.stringify(usuarioActivo))
          } catch {
            // Ignorar
          }
        } else {
          setUsuario(USUARIO_INVITADO)
          try {
            localStorage.removeItem(CLAVE_SESION_LOCAL)
          } catch {
            // Ignorar
          }
        }
      } catch (error) {
        console.warn('Error inicializando sesión con Supabase Auth:', error)
        if (activo) setUsuario(USUARIO_INVITADO)
      } finally {
        if (activo) setCargandoSesion(false)
      }
    }

    inicializarSesion()

    const { data: authListener } = supabaseCore.auth.onAuthStateChange(async (evento, session) => {
      if (!activo) return

      if (evento === 'SIGNED_OUT' || !session?.user) {
        setUsuario(USUARIO_INVITADO)
        try {
          localStorage.removeItem(CLAVE_SESION_LOCAL)
        } catch {
          // Ignorar
        }
        return
      }

      if (
        evento === 'SIGNED_IN' ||
        evento === 'TOKEN_REFRESHED' ||
        evento === 'USER_UPDATED' ||
        evento === 'INITIAL_SESSION'
      ) {
        const nombre = await obtenerNombrePerfil(session.user)
        if (!activo) return
        const usuarioActualizado = {
          id: session.user.id,
          email: session.user.email,
          nombre,
          autenticado: true
        }
        setUsuario(usuarioActualizado)
        try {
          localStorage.setItem(CLAVE_SESION_LOCAL, JSON.stringify(usuarioActualizado))
        } catch {
          // Ignorar
        }
      }
    })

    return () => {
      activo = false
      authListener?.subscription?.unsubscribe()
    }
  }, [obtenerNombrePerfil])

  // HU-09: Iniciar Sesión exclusivamente con Supabase Core Auth
  const iniciarSesion = useCallback(
    async (correo, contrasena) => {
      if (!correo || !contrasena) {
        throw new Error('Por favor ingresa tu correo electrónico y tu contraseña.')
      }

      const correoLimpio = correo.trim().toLowerCase()

      const { data, error } = await supabaseCore.auth.signInWithPassword({
        email: correoLimpio,
        password: contrasena
      })

      if (error) {
        throw new Error(
          error.message === 'Invalid login credentials'
            ? 'Credenciales no válidas. Revisa tu correo y contraseña.'
            : error.message || 'Error al iniciar sesión.'
        )
      }

      if (!data?.user) {
        throw new Error('No se recibió la sesión del usuario.')
      }

      const nombre = await obtenerNombrePerfil(data.user)
      const usuarioNuevo = {
        id: data.user.id,
        email: data.user.email,
        nombre,
        autenticado: true
      }
      setUsuario(usuarioNuevo)
      try {
        localStorage.setItem(CLAVE_SESION_LOCAL, JSON.stringify(usuarioNuevo))
      } catch {
        // Ignorar
      }

      return usuarioNuevo
    },
    [obtenerNombrePerfil]
  )

  // HU-10: Registro estricto con validaciones de base de datos
  const registrarse = useCallback(async (correo, contrasena, nombreCompleto) => {
    const valNombre = validarNombrePersona(nombreCompleto)
    if (!valNombre.esValido) {
      throw new Error(valNombre.mensaje)
    }

    const valCorreo = validarCorreoElectronico(correo)
    if (!valCorreo.esValido) {
      throw new Error(valCorreo.mensaje)
    }

    if (!contrasena || contrasena.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres.')
    }

    const correoLimpio = correo.trim().toLowerCase()
    const nombreLimpio = nombreCompleto.trim()

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

    if (data?.user && !data?.session) {
      return {
        requiereConfirmacion: true,
        email: correoLimpio,
        nombre: nombreLimpio
      }
    }

    if (data?.session && data?.user) {
      // Sincronizar perfiles
      await supabaseCore
        .from('perfiles')
        .upsert({ id: data.user.id, nombre_completo: nombreLimpio })
        .catch(() => {})

      const usuarioActivo = {
        id: data.user.id,
        email: data.user.email,
        nombre: nombreLimpio,
        autenticado: true
      }
      setUsuario(usuarioActivo)
      try {
        localStorage.setItem(CLAVE_SESION_LOCAL, JSON.stringify(usuarioActivo))
      } catch {
        // Ignorar
      }
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

    return {
      exito: true,
      mensaje: `Se ha enviado un enlace de recuperación seguro al correo ${correoLimpio}.`
    }
  }, [])

  // Cerrar Sesión y limpiar estado
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
      localStorage.removeItem('tienda_perifericos_usuarios_registrados_v1')
    } catch {
      // Ignorar
    }

    setUsuario(USUARIO_INVITADO)
  }, [])

  // Actualizar perfil: nombre_completo en tabla perfiles y email en Supabase Auth
  const actualizarPerfil = useCallback(
    async ({ nombre, email }) => {
      if (!usuario?.autenticado || !usuario?.id) {
        throw new Error('Se requiere una sesión activa para actualizar el perfil.')
      }

      let nuevoNombre = usuario.nombre
      let cambioEmailPendiente = false

      // 1. Actualizar nombre si cambió
      if (nombre && nombre.trim() !== usuario.nombre) {
        const valNombre = validarNombrePersona(nombre)
        if (!valNombre.esValido) {
          throw new Error(valNombre.mensaje)
        }

        const nombreLimpio = nombre.trim()

        // Actualizar en perfiles de ecommerce-core
        const { error: errPerfil } = await supabaseCore
          .from('perfiles')
          .update({ nombre_completo: nombreLimpio })
          .eq('id', usuario.id)

        if (errPerfil) {
          console.error('Error actualizando perfiles:', errPerfil)
          throw new Error(errPerfil.message || 'Error al actualizar el nombre en la base de datos.')
        }

        // Actualizar metadata de auth
        await supabaseCore.auth.updateUser({
          data: {
            nombre_completo: nombreLimpio,
            nombre: nombreLimpio
          }
        })

        nuevoNombre = nombreLimpio
      }

      // 2. Actualizar email si cambió
      if (email && email.trim().toLowerCase() !== usuario.email?.toLowerCase()) {
        const valEmail = validarCorreoElectronico(email)
        if (!valEmail.esValido) {
          throw new Error(valEmail.mensaje)
        }

        const emailLimpio = email.trim().toLowerCase()
        const { error: errEmail } = await supabaseCore.auth.updateUser({
          email: emailLimpio
        })

        if (errEmail) {
          console.error('Error actualizando email en auth:', errEmail)
          throw new Error(errEmail.message || 'Error al actualizar el correo electrónico.')
        }

        cambioEmailPendiente = true
      }

      // 3. Solo mutar el estado en React tras confirmación exitosa de Supabase
      const usuarioActualizado = {
        ...usuario,
        nombre: nuevoNombre
      }
      setUsuario(usuarioActualizado)

      try {
        localStorage.setItem(CLAVE_SESION_LOCAL, JSON.stringify(usuarioActualizado))
      } catch {
        // Ignorar
      }

      return {
        ...usuarioActualizado,
        cambioEmailPendiente
      }
    },
    [usuario]
  )

  return (
    <ContextoAutenticacion.Provider
      value={{
        usuario,
        cargandoSesion,
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
