/**
 * VISTA: AmazonFeatureCards.jsx
 * Cuadrícula de tarjetas destacadas por categoría inspirada en el layout clásico de Amazon.
 */

import { Link } from 'react-router-dom'
import { IconoPeriferico } from './PeripheralIcon'

const TARJETAS_DESTACADAS = [
  {
    id: 'cat-teclados',
    titulo: 'Teclados mecánicos de alto rendimiento',
    descripcion: 'Switches táctiles, retroiluminación RGB y durabilidad militar.',
    icono: 'keyboard',
    link: '/catalogo?cat=teclados',
    linkTexto: 'Ver todos los teclados',
    subarticulos: [
      { id: 4, nombre: 'Corsair K70', precio: '$139.00', icono: 'keyboard', link: '/producto/4' },
      { id: 5, nombre: 'Redragon Kumara', precio: '$39.90', icono: 'keyboard', link: '/producto/5' }
    ]
  },
  {
    id: 'cat-ratones',
    titulo: 'Ratones gamer y ergonomía de precisión',
    descripcion: 'Sensores ópticos hasta 25K DPI y botones programables.',
    icono: 'mouse',
    link: '/catalogo?cat=ratones',
    linkTexto: 'Explorar ratones ópticos',
    subarticulos: [
      { id: 1, nombre: 'Logitech G502', precio: '$59.99', icono: 'mouse', link: '/producto/1' },
      { id: 2, nombre: 'Razer DeathAdder', precio: '$34.90', icono: 'mouse', link: '/producto/2' }
    ]
  },
  {
    id: 'cat-auriculares',
    titulo: 'Audio posicional 7.1 y comunicación clara',
    descripcion: 'Aislamiento pasivo, almohadillas ergonómicas y micrófonos nítidos.',
    icono: 'headset',
    link: '/catalogo?cat=auriculares',
    linkTexto: 'Descubrir auriculares',
    subarticulos: [
      { id: 7, nombre: 'HyperX Cloud II', precio: '$89.99', icono: 'headset', link: '/producto/7' },
      { id: 8, nombre: 'Razer Kraken X', precio: '$49.99', icono: 'headset', link: '/producto/8' }
    ]
  },
  {
    id: 'cat-streaming',
    titulo: 'Webcams y accesorios para streaming',
    descripcion: 'Resolución Full HD y alfombrillas de máxima fricción controlada.',
    icono: 'webcam',
    link: '/catalogo?cat=webcams',
    linkTexto: 'Mejorar mi setup',
    subarticulos: [
      { id: 9, nombre: 'Logitech C920', precio: '$69.99', icono: 'webcam', link: '/producto/9' },
      { id: 10, nombre: 'Corsair MM300', precio: '$29.99', icono: 'mousepad', link: '/producto/10' }
    ]
  }
]

export function TarjetasDestacadas() {
  return (
    <section className="amazon-cards-section" aria-labelledby="feature-cards-heading">
      <h2 id="feature-cards-heading" className="sr-only">
        Categorías recomendadas para tu setup
      </h2>

      <div className="amazon-cards-grid">
        {TARJETAS_DESTACADAS.map((tarjeta) => (
          <div key={tarjeta.id} className="amazon-feature-card">
            <h3 className="card-heading">{tarjeta.titulo}</h3>
            
            <div className="card-visual-box">
              <div className="card-main-preview">
                <IconoPeriferico tipo={tarjeta.icono} size={54} className="card-icon" />
                <p className="card-desc">{tarjeta.descripcion}</p>
              </div>

              <div className="card-subitems-row">
                {tarjeta.subarticulos.map((articulo) => (
                  <Link
                    key={articulo.id}
                    to={articulo.link}
                    className="card-mini-tile card-mini-tile-link"
                    aria-label={`Ver producto ${articulo.nombre} por ${articulo.precio}`}
                  >
                    <IconoPeriferico tipo={articulo.icono} size={28} />
                    <span className="mini-name">{articulo.nombre}</span>
                    <span className="mini-price">{articulo.precio}</span>
                  </Link>
                ))}
              </div>
            </div>

            <Link to={tarjeta.link} className="card-footer-link">
              <span>{tarjeta.linkTexto}</span>
              <span aria-hidden="true" className="link-arrow">→</span>
            </Link>
          </div>
        ))}
      </div>
    </section>
  )
}
