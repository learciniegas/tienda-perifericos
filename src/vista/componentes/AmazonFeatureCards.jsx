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
      { nombre: 'Corsair K70', precio: '$139', icono: 'keyboard' },
      { nombre: 'Redragon Kumara', precio: '$39.90', icono: 'keyboard' }
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
      { nombre: 'Logitech G502', precio: '$59.99', icono: 'mouse' },
      { nombre: 'Razer DeathAdder', precio: '$34.90', icono: 'mouse' }
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
      { nombre: 'HyperX Cloud II', precio: '$89.99', icono: 'headset' },
      { nombre: 'Razer Kraken X', precio: '$49.99', icono: 'headset' }
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
      { nombre: 'Logitech C920', precio: '$69.99', icono: 'webcam' },
      { nombre: 'Corsair MM300', precio: '$29.99', icono: 'mousepad' }
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
                {tarjeta.subarticulos.map((articulo, indice) => (
                  <div key={indice} className="card-mini-tile">
                    <IconoPeriferico tipo={articulo.icono} size={28} />
                    <span className="mini-name">{articulo.nombre}</span>
                    <span className="mini-price">{articulo.precio}</span>
                  </div>
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
