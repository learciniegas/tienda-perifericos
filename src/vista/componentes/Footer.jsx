/**
 * VISTA: pie de página
 * Pie de página estructurado estilo tienda.
 */

import { Link } from 'react-router-dom'
import { IconoPeriferico } from './PeripheralIcon'

export function PieDePagina() {
  const volverArriba = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <footer className="site-footer" role="contentinfo">
      {/* Botón para volver al inicio de página */}
      <button
        type="button"
        className="footer-back-to-top"
        onClick={volverArriba}
        aria-label="Volver al inicio de la página"
      >
        <span>Volver arriba</span>
      </button>

      {/* Columnas de navegación del footer */}
      <div className="footer-main">
        <div className="footer-container footer-grid">
          
          <div className="footer-col">
            <h2 className="footer-col-title">Conócenos</h2>
            <ul className="footer-links">
              <li><Link to="/catalogo">Catálogo de Hardware</Link></li>
            </ul>
          </div>

          <div className="footer-col">
            <h2 className="footer-col-title">Categorías</h2>
            <ul className="footer-links">
              <li><Link to="/catalogo?cat=teclados">Teclados Mecánicos</Link></li>
              <li><Link to="/catalogo?cat=ratones">Ratones Gamer & Ergonómicos</Link></li>
              <li><Link to="/catalogo?cat=auriculares">Auriculares con Micrófono</Link></li>
              <li><Link to="/catalogo?cat=webcams">Webcams 1080p</Link></li>
              <li><Link to="/catalogo?cat=alfombrillas">Alfombrillas de Precisión</Link></li>
            </ul>
          </div>

          <div className="footer-col">
            <h2 className="footer-col-title">Atención al Cliente</h2>
            <ul className="footer-links">
              <li><Link to="/faq">Preguntas Frecuentes (FAQ)</Link></li>
              <li><Link to="/contacto">Contacto con Soporte</Link></li>
              <li><Link to="/seguimiento">Rastrear Estado de Pedido</Link></li>
              <li><Link to="/cuenta">Mi Cuenta y Direcciones</Link></li>
              <li><Link to="/carrito">Ver Mi Carrito</Link></li>
              <li><Link to="/faq">Garantías y Devoluciones</Link></li>
            </ul>
          </div>

        </div>
      </div>

      {/* Fila final de copyright y branding */}
      <div className="footer-bottom">
        <div className="footer-container footer-bottom-content">
          <div className="footer-brand">
            <IconoPeriferico tipo="logo" size={24} className="footer-logo-icon" />
            <span className="footer-brand-name">PERIFÉRICOS</span>
          </div>
          <p className="footer-copy">
            &copy; {new Date().getFullYear()} PERIFÉRICOS • Tecnología para gaming y trabajo. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  )
}
