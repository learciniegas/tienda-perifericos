/**
 * ARCHIVO PRINCIPAL DE APLICACIÓN: App.jsx
 * Enrutador principal, integración de contextos globales (MVS) y accesibilidad.
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ProveedorCarrito } from './controlador/CarritoContext'
import { ProveedorAutenticacion } from './controlador/AuthContext'
import { EnlaceSaltarContenido } from './vista/componentes/SkipLink'
import { AnunciadorAccesible } from './vista/componentes/LiveAnnouncer'
import { NotificacionCarrito } from './vista/componentes/Toast'
import { Encabezado } from './vista/componentes/Header'
import { PieDePagina } from './vista/componentes/Footer'
import { PaginaInicio } from './vista/paginas/LandingPage'
import { PaginaCatalogo } from './vista/paginas/CatalogoPage'
import { PaginaProductoDetalle } from './vista/paginas/ProductoDetallePage'
import { PaginaCarrito } from './vista/paginas/CarritoPage'
import { PaginaCheckout } from './vista/paginas/CheckoutPage'
import { PaginaLogin } from './vista/paginas/LoginPage'
import { PaginaRestablecerContrasena } from './vista/paginas/RestablecerContrasenaPage'
import { PaginaSeguimiento } from './vista/paginas/SeguimientoPage'
import { PaginaPreguntasFrecuentes } from './vista/paginas/FaqPage'
import { PaginaContacto } from './vista/paginas/ContactoPage'
import { PaginaCuenta } from './vista/paginas/CuentaPage'
import { PaginaNoEncontrada } from './vista/paginas/NoEncontradaPage'
import './index.css'
import './App.css'

export default function Aplicacion() {
  return (
    <BrowserRouter>
      <ProveedorAutenticacion>
        <ProveedorCarrito>
          {/* Elementos globales de accesibilidad */}
          <EnlaceSaltarContenido />
          <AnunciadorAccesible />
          <NotificacionCarrito />

          <div className="app-shell">
            {/* Encabezado común a todas las páginas */}
            <Encabezado />

            {/* Contenido principal con identificador para salto de teclado */}
            <main id="main-content" className="main-content-area" tabIndex="-1">
              <Routes>
                <Route path="/" element={<PaginaInicio />} />
                <Route path="/catalogo" element={<PaginaCatalogo />} />
                <Route path="/producto/:id" element={<PaginaProductoDetalle />} />
                <Route path="/carrito" element={<PaginaCarrito />} />
                <Route path="/checkout" element={<PaginaCheckout />} />
                <Route path="/login" element={<PaginaLogin />} />
                <Route path="/registro" element={<PaginaLogin modoInicial="registro" />} />
                <Route path="/restablecer-contrasena" element={<PaginaRestablecerContrasena />} />
                <Route path="/seguimiento" element={<PaginaSeguimiento />} />
                <Route path="/faq" element={<PaginaPreguntasFrecuentes />} />
                <Route path="/contacto" element={<PaginaContacto />} />
                <Route path="/cuenta" element={<PaginaCuenta />} />
                <Route path="*" element={<PaginaNoEncontrada />} />
              </Routes>
            </main>

            {/* Pie de página común a todas las páginas */}
            <PieDePagina />
          </div>
        </ProveedorCarrito>
      </ProveedorAutenticacion>
    </BrowserRouter>
  )
}
