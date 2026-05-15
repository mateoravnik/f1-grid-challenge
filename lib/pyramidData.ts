export interface PyramidPilot {
  id: string;
  name: string;
  givenName: string;
  familyName: string;
  nationalityCode: string;
  wins: number;
  poles: number;
  podiums: number;
  championships: number;
  gps: number;
  bestSeasonPoints: number;
  seasons: number;
  wikiName: string;
}

export interface PyramidCategory {
  id: string;
  label: string;
  shortLabel: string;
  getValue: (p: PyramidPilot) => number;
  unit: string;
}

export const PYRAMID_CATEGORIES: PyramidCategory[] = [
  {
    id: 'wins',
    label: 'Victorias totales en F1',
    shortLabel: 'Victorias',
    getValue: p => p.wins,
    unit: 'victorias',
  },
  {
    id: 'poles',
    label: 'Poles totales en F1',
    shortLabel: 'Poles',
    getValue: p => p.poles,
    unit: 'poles',
  },
  {
    id: 'podiums',
    label: 'Podios totales en F1',
    shortLabel: 'Podios',
    getValue: p => p.podiums,
    unit: 'podios',
  },
  {
    id: 'championships',
    label: 'Campeonatos del mundo ganados',
    shortLabel: 'Campeonatos',
    getValue: p => p.championships,
    unit: 'campeonatos',
  },
  {
    id: 'gps',
    label: 'Total de GPs corridos',
    shortLabel: 'GPs corridos',
    getValue: p => p.gps,
    unit: 'GPs',
  },
  {
    id: 'bestSeasonPoints',
    label: 'Puntos en su mejor temporada',
    shortLabel: 'Mejor temporada',
    getValue: p => p.bestSeasonPoints,
    unit: 'puntos',
  },
  {
    id: 'seasons',
    label: 'Temporadas disputadas en F1',
    shortLabel: 'Temporadas',
    getValue: p => p.seasons,
    unit: 'temporadas',
  },
];

export const ALL_PYRAMID_PILOTS: PyramidPilot[] = [
  { id: 'hamilton',    name: 'Lewis Hamilton',       givenName: 'Lewis',       familyName: 'Hamilton',    nationalityCode: 'gb', wins: 103, poles: 104, podiums: 197, championships: 7, gps: 332, bestSeasonPoints: 413, seasons: 18, wikiName: 'Lewis_Hamilton' },
  { id: 'schumacher',  name: 'Michael Schumacher',   givenName: 'Michael',     familyName: 'Schumacher',  nationalityCode: 'de', wins: 91,  poles: 68,  podiums: 155, championships: 7, gps: 306, bestSeasonPoints: 148, seasons: 19, wikiName: 'Michael_Schumacher' },
  { id: 'verstappen',  name: 'Max Verstappen',        givenName: 'Max',         familyName: 'Verstappen',  nationalityCode: 'nl', wins: 62,  poles: 40,  podiums: 110, championships: 4, gps: 212, bestSeasonPoints: 575, seasons: 10, wikiName: 'Max_Verstappen' },
  { id: 'vettel',      name: 'Sebastian Vettel',      givenName: 'Sebastian',   familyName: 'Vettel',      nationalityCode: 'de', wins: 53,  poles: 57,  podiums: 122, championships: 4, gps: 299, bestSeasonPoints: 392, seasons: 17, wikiName: 'Sebastian_Vettel' },
  { id: 'prost',       name: 'Alain Prost',           givenName: 'Alain',       familyName: 'Prost',       nationalityCode: 'fr', wins: 51,  poles: 33,  podiums: 106, championships: 4, gps: 199, bestSeasonPoints: 105, seasons: 13, wikiName: 'Alain_Prost' },
  { id: 'senna',       name: 'Ayrton Senna',          givenName: 'Ayrton',      familyName: 'Senna',       nationalityCode: 'br', wins: 41,  poles: 65,  podiums: 80,  championships: 3, gps: 161, bestSeasonPoints: 94,  seasons: 10, wikiName: 'Ayrton_Senna' },
  { id: 'alonso',      name: 'Fernando Alonso',       givenName: 'Fernando',    familyName: 'Alonso',      nationalityCode: 'es', wins: 32,  poles: 22,  podiums: 106, championships: 2, gps: 371, bestSeasonPoints: 133, seasons: 22, wikiName: 'Fernando_Alonso_(racing_driver)' },
  { id: 'mansell',     name: 'Nigel Mansell',         givenName: 'Nigel',       familyName: 'Mansell',     nationalityCode: 'gb', wins: 31,  poles: 32,  podiums: 59,  championships: 1, gps: 187, bestSeasonPoints: 108, seasons: 15, wikiName: 'Nigel_Mansell' },
  { id: 'lauda',       name: 'Niki Lauda',            givenName: 'Niki',        familyName: 'Lauda',       nationalityCode: 'at', wins: 25,  poles: 24,  podiums: 54,  championships: 3, gps: 171, bestSeasonPoints: 68,  seasons: 14, wikiName: 'Niki_Lauda' },
  { id: 'piquet',      name: 'Nelson Piquet',         givenName: 'Nelson',      familyName: 'Piquet',      nationalityCode: 'br', wins: 23,  poles: 24,  podiums: 60,  championships: 3, gps: 204, bestSeasonPoints: 69,  seasons: 14, wikiName: 'Nelson_Piquet' },
  { id: 'stewart',     name: 'Jackie Stewart',        givenName: 'Jackie',      familyName: 'Stewart',     nationalityCode: 'gb', wins: 27,  poles: 17,  podiums: 43,  championships: 3, gps: 99,  bestSeasonPoints: 36,  seasons: 9,  wikiName: 'Jackie_Stewart' },
  { id: 'clark',       name: 'Jim Clark',             givenName: 'Jim',         familyName: 'Clark',       nationalityCode: 'gb', wins: 25,  poles: 33,  podiums: 32,  championships: 2, gps: 72,  bestSeasonPoints: 54,  seasons: 8,  wikiName: 'Jim_Clark' },
  { id: 'fangio',      name: 'Juan Manuel Fangio',    givenName: 'Juan Manuel', familyName: 'Fangio',      nationalityCode: 'ar', wins: 24,  poles: 29,  podiums: 35,  championships: 5, gps: 51,  bestSeasonPoints: 57,  seasons: 8,  wikiName: 'Juan_Manuel_Fangio' },
  { id: 'rosberg',     name: 'Nico Rosberg',          givenName: 'Nico',        familyName: 'Rosberg',     nationalityCode: 'de', wins: 23,  poles: 30,  podiums: 57,  championships: 1, gps: 206, bestSeasonPoints: 385, seasons: 11, wikiName: 'Nico_Rosberg' },
  { id: 'hill',        name: 'Damon Hill',            givenName: 'Damon',       familyName: 'Hill',        nationalityCode: 'gb', wins: 22,  poles: 20,  podiums: 42,  championships: 1, gps: 122, bestSeasonPoints: 97,  seasons: 8,  wikiName: 'Damon_Hill' },
  { id: 'hakkinen',    name: 'Mika Häkkinen',         givenName: 'Mika',        familyName: 'Häkkinen',    nationalityCode: 'fi', wins: 20,  poles: 26,  podiums: 51,  championships: 2, gps: 161, bestSeasonPoints: 100, seasons: 10, wikiName: 'Mika_Häkkinen' },
  { id: 'raikkonen',   name: 'Kimi Räikkönen',        givenName: 'Kimi',        familyName: 'Räikkönen',   nationalityCode: 'fi', wins: 21,  poles: 18,  podiums: 103, championships: 1, gps: 349, bestSeasonPoints: 110, seasons: 19, wikiName: 'Kimi_Räikkönen' },
  { id: 'barrichello', name: 'Rubens Barrichello',    givenName: 'Rubens',      familyName: 'Barrichello', nationalityCode: 'br', wins: 11,  poles: 14,  podiums: 68,  championships: 0, gps: 326, bestSeasonPoints: 114, seasons: 19, wikiName: 'Rubens_Barrichello' },
  { id: 'coulthard',   name: 'David Coulthard',       givenName: 'David',       familyName: 'Coulthard',   nationalityCode: 'gb', wins: 13,  poles: 12,  podiums: 62,  championships: 0, gps: 246, bestSeasonPoints: 73,  seasons: 15, wikiName: 'David_Coulthard' },
  { id: 'bottas',      name: 'Valtteri Bottas',       givenName: 'Valtteri',    familyName: 'Bottas',      nationalityCode: 'fi', wins: 10,  poles: 20,  podiums: 67,  championships: 0, gps: 257, bestSeasonPoints: 317, seasons: 12, wikiName: 'Valtteri_Bottas' },
  { id: 'button',      name: 'Jenson Button',         givenName: 'Jenson',      familyName: 'Button',      nationalityCode: 'gb', wins: 15,  poles: 8,   podiums: 50,  championships: 1, gps: 306, bestSeasonPoints: 95,  seasons: 17, wikiName: 'Jenson_Button' },
  { id: 'webber',      name: 'Mark Webber',           givenName: 'Mark',        familyName: 'Webber',      nationalityCode: 'au', wins: 9,   poles: 13,  podiums: 42,  championships: 0, gps: 215, bestSeasonPoints: 258, seasons: 12, wikiName: 'Mark_Webber_(racing_driver)' },
  { id: 'ricciardo',   name: 'Daniel Ricciardo',      givenName: 'Daniel',      familyName: 'Ricciardo',   nationalityCode: 'au', wins: 8,   poles: 3,   podiums: 32,  championships: 0, gps: 260, bestSeasonPoints: 322, seasons: 13, wikiName: 'Daniel_Ricciardo' },
  { id: 'massa',       name: 'Felipe Massa',          givenName: 'Felipe',      familyName: 'Massa',       nationalityCode: 'br', wins: 11,  poles: 16,  podiums: 41,  championships: 0, gps: 269, bestSeasonPoints: 94,  seasons: 16, wikiName: 'Felipe_Massa' },
  { id: 'villeneuve',  name: 'Jacques Villeneuve',    givenName: 'Jacques',     familyName: 'Villeneuve',  nationalityCode: 'ca', wins: 11,  poles: 13,  podiums: 23,  championships: 1, gps: 163, bestSeasonPoints: 81,  seasons: 7,  wikiName: 'Jacques_Villeneuve' },
  { id: 'reutemann',   name: 'Carlos Reutemann',      givenName: 'Carlos',      familyName: 'Reutemann',   nationalityCode: 'ar', wins: 12,  poles: 6,   podiums: 45,  championships: 0, gps: 146, bestSeasonPoints: 42,  seasons: 12, wikiName: 'Carlos_Reutemann' },
  { id: 'leclerc',     name: 'Charles Leclerc',       givenName: 'Charles',     familyName: 'Leclerc',     nationalityCode: 'mc', wins: 8,   poles: 28,  podiums: 45,  championships: 0, gps: 147, bestSeasonPoints: 308, seasons: 7,  wikiName: 'Charles_Leclerc' },
  { id: 'norris',      name: 'Lando Norris',          givenName: 'Lando',       familyName: 'Norris',      nationalityCode: 'gb', wins: 6,   poles: 10,  podiums: 45,  championships: 0, gps: 130, bestSeasonPoints: 374, seasons: 6,  wikiName: 'Lando_Norris' },
  { id: 'perez',       name: 'Sergio Pérez',          givenName: 'Sergio',      familyName: 'Pérez',       nationalityCode: 'mx', wins: 6,   poles: 3,   podiums: 42,  championships: 0, gps: 281, bestSeasonPoints: 285, seasons: 14, wikiName: 'Sergio_Pérez' },
  { id: 'sainz',       name: 'Carlos Sainz',          givenName: 'Carlos',      familyName: 'Sainz',       nationalityCode: 'es', wins: 3,   poles: 6,   podiums: 28,  championships: 0, gps: 204, bestSeasonPoints: 240, seasons: 11, wikiName: 'Carlos_Sainz_Jr.' },
  { id: 'colapinto',   name: 'Franco Colapinto',      givenName: 'Franco',      familyName: 'Colapinto',   nationalityCode: 'ar', wins: 0,   poles: 0,   podiums: 0,   championships: 0, gps: 23,  bestSeasonPoints: 5,   seasons: 2,  wikiName: 'Franco_Colapinto' },
];

// Select 10 pilots with good value spread for the given category
export function selectPilots(category: PyramidCategory, seed: number): PyramidPilot[] {
  const sorted = [...ALL_PYRAMID_PILOTS].sort((a, b) => category.getValue(b) - category.getValue(a));
  const bucketSize = Math.ceil(sorted.length / 5);
  const selected: PyramidPilot[] = [];

  // Simple LCG for reproducible randomness
  let s = seed >>> 0;
  const rng = () => { s = Math.imul(1664525, s) + 1013904223 >>> 0; return s / 0x100000000; };

  for (let bucket = 0; bucket < 5; bucket++) {
    const start = bucket * bucketSize;
    const end = Math.min(start + bucketSize, sorted.length);
    const inBucket = sorted.slice(start, end);
    const count = bucket < 4 ? 2 : 10 - selected.length; // 2 from each of 5 buckets
    const shuffled = [...inBucket].sort(() => rng() - 0.5);
    selected.push(...shuffled.slice(0, count));
  }

  // Shuffle display order
  return selected.sort(() => rng() - 0.5);
}
