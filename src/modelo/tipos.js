/**
 * MODELO: tipos.js
 * Definición de datos de referencia, categorías y productos iniciales sincronizados con Supabase.
 * Permite renderizado inmediato y resiliente con disponibilidad en Pichincha.
 */

export const CATEGORIAS_PREDETERMINADAS = [
  { id: 1, nombre: 'Ratones', slug: 'ratones', descripcion: 'Ratones ópticos y gamer, con y sin cable', destacada: true, icono: 'mouse' },
  { id: 2, nombre: 'Teclados', slug: 'teclados', descripcion: 'Teclados mecánicos y de membrana', destacada: true, icono: 'keyboard' },
  { id: 3, nombre: 'Auriculares', slug: 'auriculares', descripcion: 'Auriculares con micrófono para juego y oficina', destacada: true, icono: 'headset' },
  { id: 4, nombre: 'Webcams', slug: 'webcams', descripcion: 'Cámaras web para videollamadas y streaming', destacada: false, icono: 'webcam' },
  { id: 5, nombre: 'Alfombrillas', slug: 'alfombrillas', descripcion: 'Superficies de precisión para ratón', destacada: false, icono: 'mousepad' }
]

export const PRODUCTOS_PREDETERMINADOS = [
  {
    id: 1,
    nombre: 'Logitech G502 HERO',
    categoria_id: 1,
    marca_id: 1,
    categoria: 'Ratones',
    categoria_slug: 'ratones',
    marca: 'Logitech',
    precio: 59.99,
    precio_anterior: '79.99',
    descuento_porcentaje: 25,
    descripcion: 'Sensor HERO 25K de alta precisión, 11 botones programables y peso ajustable.',
    imagen_url: '/img/productos/logitech-g502-hero.webp',
    imagen_alt: 'Ratón gamer negro Logitech G502 HERO visto desde arriba',
    destacado: true,
    en_stock: true,
    calificacion: 4.8,
    num_resenas: 142
  },
  {
    id: 2,
    nombre: 'Razer DeathAdder Essential',
    categoria_id: 1,
    marca_id: 2,
    categoria: 'Ratones',
    categoria_slug: 'ratones',
    marca: 'Razer',
    precio: 34.90,
    precio_anterior: '44.90',
    descuento_porcentaje: 22,
    descripcion: 'Diseño ergonómico icónico con sensor óptico de 6,400 DPI para máxima comodidad.',
    imagen_url: '/img/productos/razer-deathadder-essential.webp',
    imagen_alt: 'Ratón ergonómico negro Razer DeathAdder Essential',
    destacado: true,
    en_stock: true,
    calificacion: 4.6,
    num_resenas: 98
  },
  {
    id: 3,
    nombre: 'Redragon Cobra M711',
    categoria_id: 1,
    marca_id: 3,
    categoria: 'Ratones',
    categoria_slug: 'ratones',
    marca: 'Redragon',
    precio: 24.50,
    precio_anterior: '32.00',
    descuento_porcentaje: 23,
    descripcion: 'Iluminación RGB personalizable, 10,000 DPI ajustables y agarre texturizado.',
    imagen_url: '/img/productos/redragon-cobra-m711.webp',
    imagen_alt: 'Ratón gamer Redragon Cobra M711 con iluminación RGB',
    destacado: false,
    en_stock: true,
    calificacion: 4.5,
    num_resenas: 76
  },
  {
    id: 4,
    nombre: 'Corsair K70 RGB MK.2',
    categoria_id: 2,
    marca_id: 4,
    categoria: 'Teclados',
    categoria_slug: 'teclados',
    marca: 'Corsair',
    precio: 139.00,
    precio_anterior: '169.99',
    descuento_porcentaje: 18,
    descripcion: 'Chasis de aluminio anodizado, interruptores mecánicos Cherry MX y reposamuñecas suave.',
    imagen_url: '/img/productos/corsair-k70-rgb.webp',
    imagen_alt: 'Teclado mecánico Corsair K70 con iluminación RGB',
    destacado: true,
    en_stock: true,
    calificacion: 4.9,
    num_resenas: 215
  },
  {
    id: 5,
    nombre: 'Redragon Kumara K552',
    categoria_id: 2,
    marca_id: 3,
    categoria: 'Teclados',
    categoria_slug: 'teclados',
    marca: 'Redragon',
    precio: 39.90,
    precio_anterior: '49.99',
    descuento_porcentaje: 20,
    descripcion: 'Teclado mecánico TKL compacto, construcción metálica y teclas de doble inyección.',
    imagen_url: '/img/productos/redragon-kumara-k552.webp',
    imagen_alt: 'Teclado mecánico compacto Redragon Kumara K552',
    destacado: true,
    en_stock: true,
    calificacion: 4.7,
    num_resenas: 180
  },
  {
    id: 6,
    nombre: 'Logitech K380',
    categoria_id: 2,
    marca_id: 1,
    categoria: 'Teclados',
    categoria_slug: 'teclados',
    marca: 'Logitech',
    precio: 44.99,
    precio_anterior: '54.99',
    descuento_porcentaje: 18,
    descripcion: 'Teclado multidispositivo Bluetooth ultraligero y silencioso ideal para teletrabajo.',
    imagen_url: '/img/productos/logitech-k380.webp',
    imagen_alt: 'Teclado inalámbrico Logitech K380 de color blanco',
    destacado: false,
    en_stock: true,
    calificacion: 4.8,
    num_resenas: 310
  },
  {
    id: 7,
    nombre: 'HyperX Cloud II',
    categoria_id: 3,
    marca_id: 5,
    categoria: 'Auriculares',
    categoria_slug: 'auriculares',
    marca: 'HyperX',
    precio: 89.99,
    precio_anterior: '119.99',
    descuento_porcentaje: 25,
    descripcion: 'Sonido envolvente 7.1 virtual, almohadillas con memoria viscoelástica y micrófono desmontable.',
    imagen_url: '/img/productos/hyperx-cloud-ii.webp',
    imagen_alt: 'Auriculares gamer HyperX Cloud II rojos y negros',
    destacado: true,
    en_stock: true,
    calificacion: 4.9,
    num_resenas: 420
  },
  {
    id: 8,
    nombre: 'Razer Kraken X',
    categoria_id: 3,
    marca_id: 2,
    categoria: 'Auriculares',
    categoria_slug: 'auriculares',
    marca: 'Razer',
    precio: 49.99,
    precio_anterior: '65.00',
    descuento_porcentaje: 23,
    descripcion: 'Peso pluma de 250 g con audio posicional 7.1 y micrófono cardioide flexible.',
    imagen_url: '/img/productos/razer-kraken-x.webp',
    imagen_alt: 'Auriculares ligeros Razer Kraken X verdes',
    destacado: false,
    en_stock: true,
    calificacion: 4.5,
    num_resenas: 112
  },
  {
    id: 9,
    nombre: 'Logitech C920 HD Pro',
    categoria_id: 4,
    marca_id: 1,
    categoria: 'Webcams',
    categoria_slug: 'webcams',
    marca: 'Logitech',
    precio: 69.99,
    precio_anterior: '89.99',
    descuento_porcentaje: 22,
    descripcion: 'Resolución Full HD 1080p a 30 fps, enfoque automático rápido y audio estéreo con dos micros.',
    imagen_url: '/img/productos/logitech-c920.webp',
    imagen_alt: 'Webcam Logitech C920 HD Pro sobre un monitor',
    destacado: true,
    en_stock: true,
    calificacion: 4.7,
    num_resenas: 260
  },
  {
    id: 10,
    nombre: 'Corsair MM300 Pro',
    categoria_id: 5,
    marca_id: 4,
    categoria: 'Alfombrillas',
    categoria_slug: 'alfombrillas',
    marca: 'Corsair',
    precio: 29.99,
    precio_anterior: '39.99',
    descuento_porcentaje: 25,
    descripcion: 'Superficie de tela impermeable extendida con bordes reforzados antidesgaste.',
    imagen_url: '/img/productos/corsair-mm300-pro.webp',
    imagen_alt: 'Alfombrilla extendida negra Corsair MM300 Pro',
    destacado: false,
    en_stock: true,
    calificacion: 4.8,
    num_resenas: 85
  }
]

export const ESPECIFICACIONES_PREDETERMINADAS = {
  1: [
    { nombre: 'Conectividad', valor: 'Cable USB trenzado de 2.1 m' },
    { nombre: 'Sensor', valor: 'HERO 25K de alta precisión' },
    { nombre: 'Resolución', valor: '100 – 25,600 DPI ajustables' },
    { nombre: 'Botones', valor: '11 botones programables con memoria integrada' },
    { nombre: 'Peso', valor: '121 g (incluye 5 pesas ajustables de 3.6 g)' },
    { nombre: 'Iluminación', valor: 'LIGHTSYNC RGB sincronizable' }
  ],
  2: [
    { nombre: 'Conectividad', valor: 'Cable USB Speedflex de 1.8 m' },
    { nombre: 'Sensor', valor: 'Óptico de 6,400 DPI' },
    { nombre: 'Botones', valor: '5 botones Hyperesponse de respuesta táctil' },
    { nombre: 'Durabilidad', valor: 'Hasta 10 millones de clics' },
    { nombre: 'Diseño', valor: 'Ergonómico para diestros' },
    { nombre: 'Peso', valor: '96 g ultraligero' }
  ],
  3: [
    { nombre: 'Conectividad', valor: 'Cable USB enmallado' },
    { nombre: 'Resolución', valor: 'Hasta 10,000 DPI con 5 niveles rápidos' },
    { nombre: 'Sensor', valor: 'Pixart P3325 óptico' },
    { nombre: 'Iluminación', valor: 'RGB Chroma con 7 modos de luz' },
    { nombre: 'Botones', valor: '7 botones programables' },
    { nombre: 'Construcción', valor: 'Base de teflón antideslizante' }
  ],
  4: [
    { nombre: 'Switches', valor: 'Mecánicos Cherry MX Red alemanes' },
    { nombre: 'Estructura', valor: 'Aluminio cepillado de grado aeroespacial' },
    { nombre: 'Iluminación', valor: 'RGB individual por tecla personalizable' },
    { nombre: 'Conectividad', valor: 'USB con puerto de paso USB Passthrough' },
    { nombre: 'Accesorios', valor: 'Reposamuñecas magnético extraíble' },
    { nombre: 'Anti-Ghosting', valor: '100% Full Key Rollover (NKRO)' }
  ],
  5: [
    { nombre: 'Formato', valor: 'Compacto TKL (Tenkeyless sin teclado numérico)' },
    { nombre: 'Switches', valor: 'Mecánicos Outemu Blue táctiles y audibles' },
    { nombre: 'Teclas', valor: 'Doble inyección resistentes al desgaste' },
    { nombre: 'Iluminación', valor: 'Retroiluminación roja brillante' },
    { nombre: 'Estructura', valor: 'Placa de acero y ABS reforzado' },
    { nombre: 'Conectividad', valor: 'Cable USB reforzado' }
  ],
  6: [
    { nombre: 'Conectividad', valor: 'Bluetooth Low Energy (hasta 3 dispositivos simultáneos)' },
    { nombre: 'Alcance', valor: 'Hasta 10 metros de cobertura inalámbrica' },
    { nombre: 'Batería', valor: '2 pilas AAA incluidas (hasta 24 meses de duración)' },
    { nombre: 'Compatibilidad', valor: 'Windows, macOS, iPadOS, Android, ChromeOS' },
    { nombre: 'Perfil', valor: 'Teclas cóncavas ultradelgadas y silenciosas' },
    { nombre: 'Peso', valor: '423 g ideal para movilidad' }
  ],
  7: [
    { nombre: 'Sonido', valor: 'Envolvente virtual 7.1 con tarjeta de sonido USB' },
    { nombre: 'Transductores', valor: 'Controladores dinámicos de 53 mm con imanes de neodimio' },
    { nombre: 'Almohadillas', valor: 'Espuma con memoria viscoelástica y polipiel premium' },
    { nombre: 'Micrófono', valor: 'Desmontable con cancelación activa de ruido' },
    { nombre: 'Estructura', valor: 'Chasis robusto de aluminio anodizado' },
    { nombre: 'Conexión', valor: 'Jack 3.5 mm o módulo amplificador USB' }
  ],
  8: [
    { nombre: 'Sonido', valor: 'Audio posicional 7.1 inmersivo' },
    { nombre: 'Peso', valor: '250 g ultraliviano para largas sesiones' },
    { nombre: 'Micrófono', valor: 'Cardioide flexible con supresión de ruido posterior' },
    { nombre: 'Controladores', valor: '40 mm calibrados para graves profundos' },
    { nombre: 'Almohadillas', valor: 'Espuma viscoelástica con ranuras ocultas para gafas' },
    { nombre: 'Conector', valor: 'Analógico de 3.5 mm universal' }
  ],
  9: [
    { nombre: 'Resolución de video', valor: 'Full HD 1080p a 30 fps / 720p a 60 fps' },
    { nombre: 'Lente', valor: 'Cristal Full HD con enfoque automático preciso' },
    { nombre: 'Campo visual', valor: '78 grados diagonal' },
    { nombre: 'Audio', valor: 'Dos micrófonos omnidireccionales con captura estéreo' },
    { nombre: 'Corrección de luz', valor: 'RightLight 2 para entornos con poca iluminación' },
    { nombre: 'Soporte', valor: 'Clip universal ajustable y rosca estándar para trípode' }
  ],
  10: [
    { nombre: 'Dimensiones', valor: 'Extendido XL (930 mm x 300 mm x 3 mm)' },
    { nombre: 'Superficie', valor: 'Tejido microtexturizado resistente a derrames y líquidos' },
    { nombre: 'Bordes', valor: 'Costura reforzada de precisión de 360° contra deshilachado' },
    { nombre: 'Base', valor: 'Goma antideslizante de alta adherencia' },
    { nombre: 'Optimización', valor: 'Calibrado para sensores ópticos y láser de alta resolución' }
  ]
}
