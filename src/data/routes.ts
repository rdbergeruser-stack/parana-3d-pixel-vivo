/**
 * src/data/routes.ts
 * 5 Thematic Tourist Routes of Paraná, Entre Ríos, Argentina
 * Strict TypeScript typing linking to place IDs
 */

export interface TourRoute {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  color: string;
  duration: string;
  distance: string;
  places: string[]; // references PLACES id
}

export const ROUTES: TourRoute[] = [
  {
    id: 'circuito-costanera',
    name: 'Costanera, Barrancas y Río',
    subtitle: 'La postal natural de Paraná',
    description: 'Paseo panorámico por el filo de las altas barrancas y la ribera del Río Paraná, visitando las famosas letras corpóreas, el Patito Sirirí y los rosedales.',
    color: '#3f8f4a',
    duration: '1h 45m',
    distance: '3.8 km',
    places: [
      'letras_parana',
      'patito_siriri',
      'anfiteatro_santangelo',
      'parque_urquiza',
      'monumento_al_mate',
      'balneario_municipal',
      'club_nautico'
    ]
  },
  {
    id: 'casco-historico',
    name: 'Ruta de la Confederación',
    subtitle: 'Historia grande y cuna de la Nación',
    description: 'Recorrido a pie por los palacios, templos y plazas donde funcionó la Capital de la Confederación Argentina y nació el magisterio nacional.',
    color: '#913e23',
    duration: '1h 15m',
    distance: '2.1 km',
    places: [
      'plaza_mayo',
      'catedral_metropolitana',
      'palacio_municipal',
      'escuela_normal',
      'peatonal_san_martin',
      'casa_de_gobierno',
      'plaza_alvear'
    ]
  },
  {
    id: 'ferroviario-y-artes',
    name: 'Camino del Riel y las Artes',
    subtitle: 'Bulevar Racedo, trenes y teatros',
    description: 'Itinerario por el patrimonio industrial ferroviario del sur urbano, los talleres de Juan L. Ortiz y las joyas líricas y literarias de la ciudad.',
    color: '#7a4fc0',
    duration: '1h 30m',
    distance: '2.9 km',
    places: [
      'estacion_ferrocarril',
      'centro_cultural_juanele',
      'teatro_3_febrero',
      'biblioteca_popular',
      'museo_bellas_artes'
    ]
  },
  {
    id: 'rio-y-sabores',
    name: 'Puerto, Pescadores y Túnel',
    subtitle: 'Sabores del río y proezas de ingeniería',
    description: 'Desde las grúas y galpones del Puerto Nuevo hasta el histórico barrio de pescadores de Puerto Sánchez y la entrada al colosal Túnel Subfluvial.',
    color: '#c9821b',
    duration: '2h 10m',
    distance: '7.5 km',
    places: [
      'sala_mayo',
      'puerto_sanchez',
      'balneario_thompson',
      'tunel_subfluvial',
      'toma_vieja'
    ]
  },
  {
    id: 'deporte-del-litoral',
    name: 'Pasión Deportiva y Náutica',
    subtitle: 'Clubes centenarios y fútbol grande',
    description: 'El circuito deportivo de Paraná: vela ligera y remo en el río, rugby y tenis en las barrancas, básquet de liga y el mítico estadio de Patronato.',
    color: '#2f6fb3',
    duration: '2h 00m',
    distance: '6.2 km',
    places: [
      'club_nautico',
      'parana_rowing',
      'club_estudiantes',
      'club_echague',
      'estadio_patronato'
    ]
  }
];
