/**
 * src/data/places.ts
 * 35 Iconic & Verified Places of Paraná, Entre Ríos, Argentina
 * Strict TypeScript typing with exact geographic coordinates
 */

export type PlaceCategory = 'historia' | 'cultura' | 'rio-y-verde' | 'deporte' | 'paseos-y-compras';

export interface PlaceCategoryInfo {
  id: PlaceCategory;
  name: string;
  color: string;
  icon: string;
  description: string;
}

export const PLACE_CATEGORIES: Record<PlaceCategory, PlaceCategoryInfo> = {
  'historia': {
    id: 'historia',
    name: 'Historia y Patrimonio',
    color: '#c2410c', // Terracota / Ocre
    icon: 'Landmark',
    description: 'Edificios fundacionales, monumentos y sedes de la Confederación Argentina'
  },
  'cultura': {
    id: 'cultura',
    name: 'Cultura y Artes',
    color: '#7e22ce', // Violeta editorial
    icon: 'Palette',
    description: 'Teatros, museos, salas de exposiciones y centros culturales'
  },
  'rio-y-verde': {
    id: 'rio-y-verde',
    name: 'Río y Verde',
    color: '#15803d', // Verde esmeralda
    icon: 'Trees',
    description: 'Costanera, miradores sobre las barrancas, parques naturales y playas'
  },
  'deporte': {
    id: 'deporte',
    name: 'Deporte y Náutica',
    color: '#1d4ed8', // Azul cobalto
    icon: 'Trophy',
    description: 'Clubes náuticos de río, estadios de fútbol y básquet, e instalaciones deportivas'
  },
  'paseos-y-compras': {
    id: 'paseos-y-compras',
    name: 'Paseos y Plazas',
    color: '#b45309', // Ámbar dorado
    icon: 'ShoppingBag',
    description: 'Peatonales, ferias tradicionales, plazas cívicas y paseos gastronómicos'
  }
};

export interface Place {
  id: string;
  name: string;
  subtitle: string;
  category: PlaceCategory;
  zone: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  year?: string;
  description: string;
  curiosity: string;
  major?: boolean;
}

export const PLACES: Place[] = [
  // ==========================================
  // 1. HISTORIA Y PATRIMONIO (11 Lugares)
  // ==========================================
  {
    id: 'monumento_urquiza',
    name: 'Monumento al Gral. Justo José de Urquiza',
    subtitle: 'El prócer de la Confederación a caballo',
    category: 'historia',
    zone: 'Parque Urquiza - Barranca Alta',
    coordinates: { lat: -31.72045, lng: -60.52455 },
    year: '1920',
    major: true,
    description: 'Monumental conjunto escultórico de bronce y mármol de Carrara erigido sobre la cima de las barrancas del Parque Urquiza.',
    curiosity: 'La colosal estatua ecuestre de Urquiza mira hacia el horizonte del río y la llanura entrerriana.'
  },
  {
    id: 'easter_egg_mate_gigante',
    name: 'El Gran Mate Cósmico de Urquiza',
    subtitle: '¿Quién sostiene a Paraná desde abajo?',
    category: 'historia',
    zone: 'Cimientos del Inframundo Paranaense',
    coordinates: { lat: -31.73305, lng: -60.52972 },
    year: 'Eterno',
    major: true,
    description: '¡Has descubierto el secreto oculto de la maqueta! En las entrañas de la tierra entrerriana, un gigantesco Mate de porongo y plata con el Sol de Mayo sostiene el peso de la ciudad con pura energía litoraleña.',
    curiosity: 'Si mirás la maqueta desde abajo verás la bombilla plateada apuntando al corazón de la Plaza 1° de Mayo.'
  },
  {
    id: 'easter_egg_dorado_gigante',
    name: 'El Dorado Mítico del Río Paraná',
    subtitle: 'El "Tigre de los Ríos" Legendario',
    category: 'rio-y-verde',
    zone: 'Canal del Islote Curupí',
    coordinates: { lat: -31.72000, lng: -60.54800 },
    year: 'Mítico',
    major: true,
    description: 'Un dorado colosal de escamas doradas y aletas brillantes que nada en los remansos entre la Costanera y el Islote Curupí, custodiando las aguas paranaenses.',
    curiosity: 'Cuentan los pescadores de Puerto Sánchez que salta al atardecer cuando el sol tiñe el río de oro puro.'
  },
  {
    id: 'catedral_metropolitana',
    name: 'Catedral Metropolitana',
    subtitle: 'Nuestra Señora del Rosario',
    category: 'historia',
    zone: 'Su Santidad Francisco / Monte Caseros',
    coordinates: { lat: -31.73275, lng: -60.52890 },
    year: '1883',
    major: true,
    description: 'Imponente templo de estilo renacentista italiano frente a Plaza 1° de Mayo sobre calle Su Santidad Francisco / Monte Caseros, al este de la plaza. Cuenta con dos campanarios gemelos de 42 metros de altura.',
    curiosity: 'Fue declarada Monumento Histórico Nacional en 1942 y custodia reliquias litúrgicas del período en que Paraná fue Capital de la Confederación Argentina.'
  },
  {
    id: 'casa_de_gobierno',
    name: 'Casa de Gobierno (Casa Gris)',
    subtitle: 'Sede del Poder Ejecutivo Provincial',
    category: 'historia',
    zone: 'Centro Cívico · Córdoba y Laprida',
    coordinates: { lat: -31.72825, lng: -60.52915 },
    year: '1889',
    major: true,
    description: 'Monumento Histórico Nacional de estilo barroco francés y fachada en símil piedra París. Alberga el despacho del Gobernador provincial y los recintos legislativos.',
    curiosity: 'Su torre campanario de 35 metros alberga un reloj de cuatro cuadrantes visible desde toda el área cívica de la ciudad.'
  },
  {
    id: 'palacio_tribunales',
    name: 'Palacio de Justicia (Tribunales)',
    subtitle: 'Poder Judicial de Entre Ríos',
    category: 'historia',
    zone: 'Laprida y Santa Fe',
    coordinates: { lat: -31.72895, lng: -60.52835 },
    year: '1969',
    description: 'Imponente edificio cívico de corte monumentalista sede del Superior Tribunal de Justicia de Entre Ríos, ubicado a metros de la Casa Gris.',
    curiosity: 'Ocupa la manzana cívica sobre calle Laprida completando el conjunto arquitectónico republicano de la provincia.'
  },
  {
    id: 'palacio_municipal',
    name: 'Palacio Municipal',
    subtitle: 'Municipalidad de Paraná',
    category: 'historia',
    zone: 'Urquiza y Corrientes',
    coordinates: { lat: -31.73355, lng: -60.52885 },
    year: '1890',
    description: 'Edificio de líneas italianizantes en la esquina de Urquiza y Corrientes, al sureste de la plaza. Destaca por su alta torre del reloj de cuatro cuadrantes.',
    curiosity: 'El reloj de la torre fue importado directamente de Europa a finales del siglo XIX y sigue marcando las horas de la ciudad.'
  },
  {
    id: 'colegio_del_huerto',
    name: 'Colegio Nuestra Señora del Huerto',
    subtitle: 'Sede del Congreso de la Confederación',
    category: 'historia',
    zone: 'Frente sur Plaza 1° de Mayo · Urquiza',
    coordinates: { lat: -31.73365, lng: -60.52975 },
    year: '1860',
    major: true,
    description: 'Histórico solar educativo y religioso sobre la vereda sur de la Plaza 1° de Mayo, en calle Urquiza. En este solar sesionó el Congreso Constituyente de la Confederación Argentina.',
    curiosity: 'Sus claustros conservan el aula histórica donde los legisladores confederados debatieron el destino de la Nación.'
  },
  {
    id: 'escuela_normal',
    name: 'Escuela Normal José María Torres',
    subtitle: 'Cuna del magisterio argentino',
    category: 'historia',
    zone: 'Urquiza y Corrientes / San Juan',
    coordinates: { lat: -31.73240, lng: -60.53055 },
    year: '1870',
    description: 'Fundada por Domingo Faustino Sarmiento en 1870 como la primera escuela de formación docente del país. Ocupa una manzana céntrica señorial frente al flanco norte/oeste de la plaza.',
    curiosity: 'Aquí funcionó el primer jardín de infantes del país bajo la dirección de la pionera estadounidense Sara Eccleston.'
  },
  {
    id: 'tunel_subfluvial',
    name: 'Complejo Túnel Subfluvial Hernandarias',
    subtitle: 'Boca de entrada Paraná - Santa Fe',
    category: 'historia',
    zone: 'Ruta Nacional 168',
    coordinates: { lat: -31.71250, lng: -60.49550 },
    year: '1969',
    major: true,
    description: 'Obra cumbre de la ingeniería latinoamericana. Cruza por debajo del lecho del Río Paraná a lo largo de 2.397 metros conectando Entre Ríos con Santa Fe.',
    curiosity: 'Fue el primer túnel subfluvial de Sudamérica y puso fin al aislamiento fluvial histórico de la Mesopotamia argentina.'
  },
  {
    id: 'estacion_ferrocarril',
    name: 'Estación Central de Trenes',
    subtitle: 'Ferrocarril General Urquiza',
    category: 'historia',
    zone: 'Bulevar Racedo',
    coordinates: { lat: -31.74560, lng: -60.52280 },
    year: '1887',
    major: true,
    description: 'Estación terminal ferroviaria de estilo inglés, con ladrillo a la vista, techos de chapa a dos aguas y marquesinas de hierro forjado.',
    curiosity: 'Se ubica 14 cuadras al sur de la Plaza 1° de Mayo sobre Bulevar Racedo, marcando el histórico límite sur de la traza original de la ciudad.'
  },
  {
    id: 'bajada_grande',
    name: 'Puerto Histórico de Bajada Grande',
    subtitle: 'Cuna portuaria de Paraná',
    category: 'historia',
    zone: 'Oeste Ribereño',
    coordinates: { lat: -31.72650, lng: -60.56550 },
    year: 'Origen Fluvial',
    description: 'El puerto natural originario de Paraná hacia el oeste. Barrio ribereño de pescadores artesanales, acantilados y vestigios del antiguo ferrocarril portuario.',
    curiosity: 'Durante el siglo XIX recibía los vapores de ultramar antes de que se construyera el Puerto Nuevo hacia el norte.'
  },

  // ==========================================
  // 2. CULTURA Y ARTES (8 Lugares)
  // ==========================================
  {
    id: 'teatro_3_febrero',
    name: 'Teatro Municipal 3 de Febrero',
    subtitle: 'Templo de las artes escénicas',
    category: 'cultura',
    zone: '25 de Mayo 44',
    coordinates: { lat: -31.73185, lng: -60.53185 },
    year: '1908',
    major: true,
    description: 'Teatro lírico con sala a la italiana, palcos dorados, paraíso y acústica excepcional sobre calle 25 de Mayo 44, a dos cuadras de la plaza.',
    curiosity: 'Posee capacidad para 850 espectadores y una deslumbrante cúpula pintada al óleo por maestros italianos.'
  },
  {
    id: 'centro_cultural_juanele',
    name: 'Centro Cultural Juan L. Ortiz',
    subtitle: 'El "Juanele" - Arte y ferrocarril',
    category: 'cultura',
    zone: 'Bulevar Racedo 250',
    coordinates: { lat: -31.74185, lng: -60.52495 },
    year: 'Cultura',
    major: true,
    description: 'Antiguos galpones de máquinas y talleres del ferrocarril reconvertidos en un vibrante multiespacio de artes plásticas, música, teatro y ferias sobre Bv. Racedo entre Ramírez y Belgrano.',
    curiosity: 'Homenajea al excelso poeta entrerriano Juan Laurentino Ortiz y se emplaza al lado norte de las vías, a metros de la Estación Central.'
  },
  {
    id: 'sala_mayo',
    name: 'Sala Mayo / Puerto Nuevo',
    subtitle: 'Nave de eventos del Puerto Nuevo',
    category: 'cultura',
    zone: 'Costanera Este · Puerto Nuevo',
    coordinates: { lat: -31.71760, lng: -60.52950 },
    year: 'Patrimonio',
    major: true,
    description: 'Antiguos galpones aduaneros portuarios de ladrillo reciclados frente a la dársena del Puerto Nuevo y el río. Espacio principal de ferias del libro y festivales.',
    curiosity: 'A sus pies se yergue la histórica Grúa Roja de hierro forjado que desembarcaba cargas del río en el siglo XX.'
  },
  {
    id: 'la_vieja_usina',
    name: 'Centro Cultural La Vieja Usina',
    subtitle: 'Patrimonio industrial y usina de arte',
    category: 'cultura',
    zone: 'Gregoria Matorras 861',
    coordinates: { lat: -31.72485, lng: -60.52565 },
    year: '1921',
    major: true,
    description: 'Antigua usina eléctrica de principios de siglo XX de arquitectura ladrillera fabril con chimenea, reciclada como centro cultural y sala de convenciones.',
    curiosity: 'Su chimenea cilíndrica de ladrillo rojo de más de 30 metros de altura aún se yergue como faro visible del barrio de la costa.'
  },
  {
    id: 'anfiteatro_santangelo',
    name: 'Anfiteatro Héctor Santángelo',
    subtitle: 'Escenario natural en la barranca',
    category: 'cultura',
    zone: 'Parque Urquiza',
    coordinates: { lat: -31.72250, lng: -60.53650 },
    year: '1985',
    description: 'Teatro al aire libre construido aprovechando la acústica de una quebrada profunda del Parque Urquiza, con gradas concéntricas de piedra.',
    curiosity: 'Es la sede principal de festivales de folclore litoraleño, ciclos de cine bajo las estrellas y recitales al atardecer.'
  },
  {
    id: 'museo_bellas_artes',
    name: 'Museo Provincial de Bellas Artes',
    subtitle: 'Dr. Pedro E. Martínez',
    category: 'cultura',
    zone: 'Buenos Aires 355',
    coordinates: { lat: -31.72800, lng: -60.52920 },
    year: '1926',
    description: 'Principal pinacoteca de Entre Ríos, con una destacadísima colección de pintura argentina, grabado y esculturas contemporáneas.',
    curiosity: 'Funciona en una casona señorial de estilo ecléctico a escasos metros de la Casa de Gobierno.'
  },
  {
    id: 'museo_martiniano_leguizamon',
    name: 'Museo Histórico Martiniano Leguizamón',
    subtitle: 'Memoria y tradición entrerriana',
    category: 'cultura',
    zone: 'Laprida y Buenos Aires',
    coordinates: { lat: -31.72850, lng: -60.52700 },
    year: '1923',
    description: 'Guarda armas históricas de caudillos, platería criolla, documentos originales de la Confederación y carruajes de época.',
    curiosity: 'Lleva el nombre del escritor y folklorista que plasmó la épica criolla del gaucho montielero de Entre Ríos.'
  },
  {
    id: 'biblioteca_popular',
    name: 'Biblioteca Popular del Paraná',
    subtitle: 'Cultura ciudadana centenaria',
    category: 'cultura',
    zone: 'Buenos Aires 256',
    coordinates: { lat: -31.73310, lng: -60.53180 },
    year: '1873',
    description: 'Institución civil fundada durante la presidencia de Sarmiento. Conserva miles de volúmenes históricos en una hermosa sala de lectura.',
    curiosity: 'Fue una de las primeras bibliotecas creadas al amparo de la Ley Nacional de Bibliotecas Populares.'
  },

  // ==========================================
  // 3. RÍO Y VERDE (8 Lugares)
  // ==========================================
  {
    id: 'letras_parana',
    name: 'Letras Corpóreas PARANÁ',
    subtitle: 'Mirador de las Barrancas del Patito Sirirí',
    category: 'rio-y-verde',
    zone: 'Costanera Alta · Parque Urquiza',
    coordinates: { lat: -31.72140, lng: -60.53150 },
    year: 'Costanera',
    major: true,
    description: 'Cartel volumétrico gigante con las letras multicolor de Paraná sobre el mirador natural de las barrancas, con vista panorámica abierta al río y las islas.',
    curiosity: 'Cada letra representa los colores identitarios entrerrianos: el río, la vegetación isleña, el sol dorador y la calidez del pueblo costero.'
  },
  {
    id: 'patito_siriri',
    name: 'El Patito Sirirí',
    subtitle: 'Escultura infantil y mirador panorámico',
    category: 'rio-y-verde',
    zone: 'Barrancas Parque Urquiza · Gregoria Matorras',
    coordinates: { lat: -31.72195, lng: -60.53095 },
    year: '1977',
    major: true,
    description: 'La célebre escultura del patito sirirí con su tobogán sobre el filo de las altas barrancas del Parque Urquiza mirando hacia el río.',
    curiosity: 'Homenajea al pato sirirí que habita los arroyos e islas del delta entrerriano y es el balcón clásico para tomar mate frente al atardecer.'
  },
  {
    id: 'parque_urquiza',
    name: 'Parque Urquiza y Rosedal',
    subtitle: '44 hectáreas de barrancas sobre el río',
    category: 'rio-y-verde',
    zone: 'Costanera Alta y Media',
    coordinates: { lat: -31.72250, lng: -60.53670 },
    year: '1899',
    major: true,
    description: 'Parque paisajístico diseñado por Carlos Thays en tres niveles escalonados (Alta, Media y Baja), con cascadas de piedra, rosales y ceibos nativos.',
    curiosity: 'En la cumbre se alza la colosal columna de mármol con el Monumento en bronce al General Justo José de Urquiza.'
  },
  {
    id: 'monumento_al_mate',
    name: 'Monumento al Mate',
    subtitle: 'Homenaje a la costumbre entrerriana',
    category: 'rio-y-verde',
    zone: 'Costanera Baja',
    coordinates: { lat: -31.71850, lng: -60.53420 },
    year: 'Costanera',
    major: true,
    description: 'Escultura monumental de un mate gigante con bombilla plateada sobre la costanera baja, junto al oleaje del río.',
    curiosity: 'Entre Ríos es el corazón del mate y Paraná celebra cada verano la Fiesta Nacional del Mate reuniendo a miles de visitantes.'
  },
  {
    id: 'balneario_municipal',
    name: 'Balneario Municipal Costanera',
    subtitle: 'Playa céntrica sobre el río',
    category: 'rio-y-verde',
    zone: 'Costanera Baja',
    coordinates: { lat: -31.71780, lng: -60.53920 },
    year: 'Costanera',
    description: 'Playa urbana de arena bordeada por sauces llorones, paradores y áreas de descanso frente a la brisa del Río Paraná.',
    curiosity: 'El punto de mayor concurrencia veraniega para disfrutar del sol de la tarde y las aguas del río.'
  },
  {
    id: 'balneario_thompson',
    name: 'Complejo Balneario Thompson',
    subtitle: 'Extensas playas doradas y camping',
    category: 'rio-y-verde',
    zone: 'Costanera Este',
    coordinates: { lat: -31.71780, lng: -60.50650 },
    year: 'Costanera',
    description: 'El predio costero más amplio de Paraná, con playas de arena, frondoso bosque ribereño, quinchos y bajada de embarcaciones.',
    curiosity: 'Ofrece una vista panorámica privilegiada de la curva del río hacia el Túnel Subfluvial.'
  },
  {
    id: 'toma_vieja',
    name: 'Complejo Turístico Toma Vieja',
    subtitle: 'Piscinas y acantilados de 30 metros',
    category: 'rio-y-verde',
    zone: 'Toma Vieja',
    coordinates: { lat: -31.70500, lng: -60.49900 },
    year: '1886',
    description: 'Parque municipal asentado en el predio de la primitiva toma de agua potable, en el extremo norte de las barrancas paranaenses.',
    curiosity: 'Sus miradores dominan el paso del río a más de 30 metros de altura sobre las islas santafesinas.'
  },
  {
    id: 'parque_varisco',
    name: 'Parque Humberto Varisco (Parque Nuevo)',
    subtitle: 'Reserva natural y bosque nativo',
    category: 'rio-y-verde',
    zone: 'Acceso Oeste',
    coordinates: { lat: -31.73100, lng: -60.55100 },
    year: '2004',
    description: 'Gran reserva de más de 100 hectáreas con quebradas naturales, senderos agrestes y flora autóctona sobre las laderas occidentales.',
    curiosity: 'Es el mayor pulmón verde natural de la ciudad, frecuentado para caminatas, ciclismo de montaña y avistaje de aves.'
  },

  // ==========================================
  // 4. DEPORTE Y NÁUTICA (7 Lugares)
  // ==========================================
  {
    id: 'club_nautico',
    name: 'Club Náutico Paraná',
    subtitle: 'Veleros y dársena deportiva',
    category: 'deporte',
    zone: 'Costanera Baja',
    coordinates: { lat: -31.71880, lng: -60.54220 },
    year: '1932',
    major: true,
    description: 'Prestigiosa institución náutica regional con amarras para veleros, yates y lanchas deportivas, además de escuela de navegación a vela.',
    curiosity: 'Punto de largada de tradicionales regatas del Río Paraná que unen Paraná con las ciudades de Santa Fe y Rosario.'
  },
  {
    id: 'club_estudiantes',
    name: 'Club Atlético Estudiantes (CAE)',
    subtitle: 'Sede Central y Parque del CAE',
    category: 'deporte',
    zone: 'Los Vascos 729',
    coordinates: { lat: -31.72180, lng: -60.53480 },
    year: '1905',
    major: true,
    description: 'Histórico club polideportivo con canchas de rugby, hockey, tenis y básquet emplazado en la ladera del Parque Urquiza.',
    curiosity: 'Su equipo de rugby es multicampeón del Torneo Regional del Litoral y formador de jugadores de Los Pumas.'
  },
  {
    id: 'parana_rowing',
    name: 'Paraná Rowing Club',
    subtitle: 'Cuna del remo y la natación de río',
    category: 'deporte',
    zone: 'Costanera Baja',
    coordinates: { lat: -31.71800, lng: -60.53750 },
    year: '1917',
    description: 'Entidad centenaria sobre la costanera con botes de remo travesía, canotaje y piletas recreativas junto al río.',
    curiosity: 'Pionero indiscutido en la travesía de remo cruzando el Río Paraná hacia la vecina Santa Fe.'
  },
  {
    id: 'estadio_patronato',
    name: 'Estadio Presbítero Bartolomé Grella',
    subtitle: 'Club Atlético Patronato',
    category: 'deporte',
    zone: 'Presbítero Grella 874 · Villa Sarmiento',
    coordinates: { lat: -31.73885, lng: -60.51135 },
    year: '1956',
    major: true,
    description: 'Estadio del "Patrón" de Entre Ríos sobre Presbítero Grella 874, con tribunas rojinegras y capacidad para más de 22.000 espectadores.',
    curiosity: 'Patronato se consagró Campeón de la Copa Argentina 2022 y disputó partidos oficiales de la Copa Libertadores de América en este predio.'
  },
  {
    id: 'club_atletico_parana',
    name: 'Estadio Pedro Mutio (Atlético Paraná)',
    subtitle: 'El "Decano" de Entre Ríos',
    category: 'deporte',
    zone: 'Ruperto Pérez',
    coordinates: { lat: -31.73900, lng: -60.50700 },
    year: '1907',
    description: 'Sede del histórico club rojiblanco paranaense, decano del fútbol de la ciudad.',
    curiosity: 'Lleva el nombre de Pedro Mutio en honor a una de las figuras más emblemáticas del fútbol litoraleño.'
  },
  {
    id: 'club_echague',
    name: 'Club Atlético Ignacio Echagüe',
    subtitle: 'La catedral del básquet paranaense',
    category: 'deporte',
    zone: '25 de Mayo 555',
    coordinates: { lat: -31.73380, lng: -60.52350 },
    year: '1932',
    description: 'Tradicional estadio cubierto sede del básquetbol profesional en la Liga Nacional y Torneo Nacional de Ascenso.',
    curiosity: 'Su estadio Luis Butta es el recinto cubierto deportivo más importante del centro de la ciudad.'
  },
  {
    id: 'parana_golf',
    name: 'Club de Golf del Parque Urquiza',
    subtitle: 'Fairways entre ceibos y barrancas',
    category: 'deporte',
    zone: 'Parque Urquiza',
    coordinates: { lat: -31.72500, lng: -60.53400 },
    year: '1930',
    description: 'Campo de golf de 9 hoyos integrado de forma natural a la topografía ondulada del Parque Urquiza.',
    curiosity: 'Es uno de los pocos campos de golf de Sudamérica integrados armónicamente al ejido de un parque público urbano.'
  },

  // ==========================================
  // 5. PASEOS Y COMPRAS (8 Lugares)
  // ==========================================
  {
    id: 'plaza_mayo',
    name: 'Plaza 1° de Mayo',
    subtitle: 'Punto cero cívico y comercial',
    category: 'paseos-y-compras',
    zone: 'Centro Histórico',
    coordinates: { lat: -31.73305, lng: -60.52972 },
    year: 'Fundacional',
    major: true,
    description: 'Centro exacto de la manzana histórica fundacional de Paraná, delimitada por San Martín, Urquiza, Monte Caseros y 25 de Mayo.',
    curiosity: 'Antiguamente albergó el Fuerte de Paraná durante el siglo XVIII antes de la urbanización formal.'
  },
  {
    id: 'cinco_esquinas',
    name: 'Cinco Esquinas',
    subtitle: 'Cruce neurálgico de avenidas',
    category: 'paseos-y-compras',
    zone: 'Av. Ramírez y Echagüe',
    coordinates: { lat: -31.73765, lng: -60.52215 },
    year: 'Nodo Urbano',
    major: true,
    description: 'Emblemático nudo vial y comercial donde convergen cinco arterias clave de la ciudad: Av. Ramírez, Av. Echagüe, Pascual Palma, Gualeguaychú y Enrique Carbó.',
    curiosity: 'Es el centro geográfico de circulación que conecta el casco histórico con el este y el sur de Paraná.'
  },
  {
    id: 'mercado_sud',
    name: 'Mercado Sud',
    subtitle: 'Paseo gastronómico y cultural',
    category: 'paseos-y-compras',
    zone: 'Villaguay y Perón',
    coordinates: { lat: -31.73855, lng: -60.53150 },
    year: '1933',
    major: true,
    description: 'Histórico edificio art decó restaurado como plaza comercial y polo gastronómico en la intersección de calles Villaguay y Presidente Perón.',
    curiosity: 'Fue uno de los tres mercados municipales abastecedores de la ciudad durante el siglo XX.'
  },
  {
    id: 'peatonal_san_martin',
    name: 'Peatonal San Martín',
    subtitle: 'Eje comercial a cielo abierto',
    category: 'paseos-y-compras',
    zone: 'San Martín',
    coordinates: { lat: -31.73050, lng: -60.52900 },
    year: 'Paseo',
    major: true,
    description: 'Paseo comercial peatonal adoquinado que conecta de norte a sur la Plaza 1° de Mayo con la Plaza Alvear.',
    curiosity: 'Concentra la mayor densidad de tiendas, heladerías, cafeterías y galerías comerciales de la capital provincial.'
  },
  {
    id: 'plaza_alvear',
    name: 'Plaza Alvear (Plaza San Miguel)',
    subtitle: 'Feria de artesanos y paseo cívico',
    category: 'paseos-y-compras',
    zone: 'San Martín y Laprida',
    coordinates: { lat: -31.72820, lng: -60.52780 },
    year: '1880',
    major: true,
    description: 'Plaza arbolada con añosas tipas frente a la Casa Gris. Frecuentada por sus puestos de artesanos y paseos familiares.',
    curiosity: 'Punto de encuentro clásico de los domingos por la tarde para adquirir artesanías en cuero, madera y cuchillería entrerriana.'
  },
  {
    id: 'mercado_la_paz',
    name: 'Mercado de la Paz (Feria Salta y Nogoyá)',
    subtitle: 'Sabores, verduras y productos regionales',
    category: 'paseos-y-compras',
    zone: 'Salta y Nogoyá',
    coordinates: { lat: -31.72950, lng: -60.53600 },
    year: 'Tradición',
    description: 'Histórico mercado vecinal techado donde se comercializan pescados de río frescos, quesos entrerrianos, verduras y panificados caseros.',
    curiosity: 'El lugar predilecto de cocineros y locales para conseguir dorado, surubí, boga fresca del Paraná y tortas fritas.'
  },
  {
    id: 'parque_gazzano',
    name: 'Parque José Gazzano',
    subtitle: 'Lago artificial y paseo familiar del sur',
    category: 'paseos-y-compras',
    zone: 'Zona Sur',
    coordinates: { lat: -31.76330, lng: -60.51520 },
    year: '1983',
    description: 'Parque recreativo del sur paranaense que rodea un lago poblado de patos y gansos, con puentes de madera y frondosos eucaliptos.',
    curiosity: 'Donado a la comunidad por la familia Gazzano, es el paseo dominical de mate predilecto de los barrios del sur.'
  },
  {
    id: 'puerto_sanchez',
    name: 'Puerto Sánchez',
    subtitle: 'Barrio ribereño de pescadores y empanadas',
    category: 'paseos-y-compras',
    zone: 'Costanera Este',
    coordinates: { lat: -31.71600, lng: -60.52100 },
    year: 'Ribera',
    description: 'Pintoresco barrio de pescadores junto al río, célebre por sus cantinas y puestos de empanadas de pescado y pescado frito.',
    curiosity: 'Inmortalizado en la famosa chamarrita entrerriana "Canción de Puerto Sánchez" del poeta Jorge Méndez.'
  }
];
