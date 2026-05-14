export interface DriverProfile {
  id: string;
  givenName: string;
  familyName: string;
  fullName: string;
  nationality: string;
  constructors: string[];
  isChampion: boolean;
  isRaceWinner: boolean;
  racedIn90s: boolean;
  gpsOver100: boolean;
  isLatinAmerican: boolean;
}

export interface F1DataCache {
  drivers: Map<string, DriverProfile>;
  fetchedAt: number;
}

const API_BASE = 'https://api.jolpi.ca/ergast/f1';
const CACHE_TTL = 6 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 15000;

let cache: F1DataCache | null = null;

const LATIN_AMERICAN_NATIONALITIES = new Set([
  'Brazilian', 'Mexican', 'Colombian', 'Argentine', 'Venezuelan',
  'Chilean', 'Peruvian', 'Uruguayan', 'Ecuadorian', 'Bolivian',
]);

export const CONSTRUCTOR_POOL = [
  { id: 'ferrari',   label: 'Ferrari',   shortLabel: 'FER' },
  { id: 'mclaren',   label: 'McLaren',   shortLabel: 'MCL' },
  { id: 'red_bull',  label: 'Red Bull',  shortLabel: 'RBR' },
  { id: 'mercedes',  label: 'Mercedes',  shortLabel: 'MER' },
  { id: 'williams',  label: 'Williams',  shortLabel: 'WIL' },
  { id: 'renault',   label: 'Renault',   shortLabel: 'REN' },
  { id: 'lotus_f1',  label: 'Lotus',     shortLabel: 'LOT' },
  { id: 'alpine',    label: 'Alpine',    shortLabel: 'ALP' },
  { id: 'brabham',   label: 'Brabham',   shortLabel: 'BRA' },
  { id: 'tyrrell',   label: 'Tyrrell',   shortLabel: 'TYR' },
];

export const SPECIAL_CONDITIONS = [
  { id: 'champion',      label: 'Campeón del Mundo',        shortLabel: '🏆 Campeón' },
  { id: 'raceWinner',    label: 'Ganó al menos 1 carrera',  shortLabel: '🏁 Ganador' },
  { id: 'nineties',      label: 'Corrió en los 90s',        shortLabel: '📅 90s' },
  { id: 'centenary',     label: 'Corrió más de 100 GPs',    shortLabel: '💯 100+ GPs' },
  { id: 'latinAmerican', label: 'Piloto latinoamericano',   shortLabel: '🌎 LATAM' },
];

// ---------------------------------------------------------------------------
// FALLBACK DATASET — used when Jolpica API is unavailable
// Each entry: [driverId, givenName, familyName, nationality, constructors[],
//              isChampion, isRaceWinner, racedIn90s, gpsOver100, isLatinAmerican]
// ---------------------------------------------------------------------------
type FallbackRow = [
  string, string, string, string, string[],
  boolean, boolean, boolean, boolean, boolean
];

const FALLBACK_DRIVERS: FallbackRow[] = [
  // id                  given          family          nat          teams                                       champ  win    90s    100+   latam
  ['hamilton',           'Lewis',        'Hamilton',      'British',   ['mclaren','mercedes'],                    true,  true,  false, true,  false],
  ['schumacher',         'Michael',      'Schumacher',    'German',    ['ferrari','mercedes'],                    true,  true,  true,  true,  false],
  ['vettel',             'Sebastian',    'Vettel',        'German',    ['red_bull','ferrari','alpine'],            true,  true,  false, true,  false],
  ['alonso',             'Fernando',     'Alonso',        'Spanish',   ['renault','mclaren','ferrari','alpine'],   true,  true,  false, true,  false],
  ['raikkonen',          'Kimi',         'Räikkönen',     'Finnish',   ['mclaren','ferrari','lotus_f1'],           true,  true,  false, true,  false],
  ['max_verstappen',     'Max',          'Verstappen',    'Dutch',     ['red_bull'],                              true,  true,  false, true,  false],
  ['senna',              'Ayrton',       'Senna',         'Brazilian', ['mclaren','williams'],                    true,  true,  true,  true,  true],
  ['prost',              'Alain',        'Prost',         'French',    ['mclaren','ferrari','williams','renault'], true,  true,  true,  true,  false],
  ['lauda',              'Niki',         'Lauda',         'Austrian',  ['ferrari','mclaren','brabham'],            true,  true,  true,  true,  false],
  ['mansell',            'Nigel',        'Mansell',       'British',   ['ferrari','williams'],                    true,  true,  true,  true,  false],
  ['hill',               'Damon',        'Hill',          'British',   ['williams','ferrari'],                    true,  true,  true,  true,  false],
  ['piquet',             'Nelson',       'Piquet',        'Brazilian', ['brabham','williams'],                    true,  true,  true,  true,  true],
  ['scheckter',          'Jody',         'Scheckter',     'South African', ['tyrrell','ferrari'],                  true,  true,  false, true,  false],
  ['button',             'Jenson',       'Button',        'British',   ['williams','mclaren','renault'],           true,  true,  false, true,  false],
  ['rosberg',            'Nico',         'Rosberg',       'German',    ['williams','mercedes'],                   true,  true,  false, true,  false],
  ['hakkinen',           'Mika',         'Häkkinen',      'Finnish',   ['mclaren'],                               true,  true,  true,  true,  false],
  ['coulthard',          'David',        'Coulthard',     'British',   ['mclaren','williams'],                    false, true,  true,  true,  false],
  ['webber',             'Mark',         'Webber',        'Australian',['red_bull','williams','renault'],          false, true,  false, true,  false],
  ['barrichello',        'Rubens',       'Barrichello',   'Brazilian', ['ferrari','williams'],                    false, true,  true,  true,  true],
  ['massa',              'Felipe',       'Massa',         'Brazilian', ['ferrari','williams'],                    false, true,  false, true,  true],
  ['montoya',            'Juan Pablo',   'Montoya',       'Colombian', ['williams','mclaren'],                    false, true,  false, false, true],
  ['ricciardo',          'Daniel',       'Ricciardo',     'Australian',['red_bull','renault','mclaren'],           false, true,  false, true,  false],
  ['hulkenberg',         'Nico',         'Hülkenberg',    'German',    ['williams','renault','alpine'],            false, false, false, true,  false],
  ['perez',              'Sergio',       'Pérez',         'Mexican',   ['mclaren','red_bull'],                    false, true,  false, true,  true],
  ['bottas',             'Valtteri',     'Bottas',        'Finnish',   ['williams','mercedes'],                   false, true,  false, true,  false],
  ['leclerc',            'Charles',      'Leclerc',       'Monegasque',['ferrari'],                               false, true,  false, true,  false],
  ['sainz',              'Carlos',       'Sainz',         'Spanish',   ['ferrari','williams','renault'],           false, true,  false, true,  false],
  ['norris',             'Lando',        'Norris',        'British',   ['mclaren'],                               false, true,  false, true,  false],
  ['russell',            'George',       'Russell',       'British',   ['williams','mercedes'],                   false, true,  false, true,  false],
  ['ocon',               'Esteban',      'Ocon',          'French',    ['renault','alpine','mercedes'],            false, true,  false, true,  false],
  ['gasly',              'Pierre',       'Gasly',         'French',    ['red_bull','alpine'],                     false, true,  false, true,  false],
  ['albon',              'Alexander',    'Albon',         'Thai',      ['red_bull','williams'],                   false, false, false, true,  false],
  ['stroll',             'Lance',        'Stroll',        'Canadian',  ['williams'],                              false, false, false, true,  false],
  ['giovinazzi',         'Antonio',      'Giovinazzi',    'Italian',   ['ferrari'],                               false, false, false, false, false],
  ['magnussen',          'Kevin',        'Magnussen',     'Danish',    ['mclaren','renault'],                     false, false, false, true,  false],
  ['grosjean',           'Romain',       'Grosjean',      'French',    ['renault','lotus_f1'],                    false, false, false, true,  false],
  ['maldonado',          'Pastor',       'Maldonado',     'Venezuelan',['williams','lotus_f1'],                   false, true,  false, false, true],
  ['kubica',             'Robert',       'Kubica',        'Polish',    ['renault','williams'],                    false, true,  false, true,  false],
  ['fisichella',         'Giancarlo',    'Fisichella',    'Italian',   ['renault','ferrari','williams'],           false, true,  true,  true,  false],
  ['trulli',             'Jarno',        'Trulli',        'Italian',   ['renault','williams'],                    false, true,  true,  true,  false],
  ['frentzen',           'Heinz-Harald', 'Frentzen',      'German',    ['williams'],                              false, true,  true,  true,  false],
  ['villeneuve',         'Jacques',      'Villeneuve',    'Canadian',  ['williams'],                              true,  true,  true,  true,  false],
  ['irvine',             'Eddie',        'Irvine',        'British',   ['ferrari'],                               false, true,  true,  true,  false],
  ['herbert',            'Johnny',       'Herbert',       'British',   ['lotus_f1','ferrari'],                    false, true,  true,  true,  false],
  ['panis',              'Olivier',      'Panis',         'French',    ['williams','mclaren'],                    false, true,  true,  true,  false],
  ['heidfeld',           'Nick',         'Heidfeld',      'German',    ['williams','mclaren'],                    false, false, false, true,  false],
  ['kovalainen',         'Heikki',       'Kovalainen',    'Finnish',   ['renault','mclaren'],                     false, false, false, true,  false],
  ['sutil',              'Adrian',       'Sutil',         'German',    ['mercedes'],                              false, false, false, true,  false],
  ['de_la_rosa',         'Pedro',        'de la Rosa',    'Spanish',   ['mclaren','ferrari'],                     false, false, false, true,  false],
  ['ralf_schumacher',    'Ralf',         'Schumacher',    'German',    ['williams'],                              false, true,  true,  true,  false],
  ['berger',             'Gerhard',      'Berger',        'Austrian',  ['ferrari','mclaren'],                     false, true,  true,  true,  false],
  ['alesi',              'Jean',         'Alesi',         'French',    ['ferrari','tyrrell'],                     false, true,  true,  true,  false],
  ['patrese',            'Riccardo',     'Patrese',       'Italian',   ['brabham','williams'],                    false, true,  true,  true,  false],
  ['boutsen',            'Thierry',      'Boutsen',       'Belgian',   ['williams'],                              false, true,  true,  true,  false],
  ['brundle',            'Martin',       'Brundle',       'British',   ['tyrrell','mclaren','brabham'],            false, false, true,  true,  false],
  ['warwick',            'Derek',        'Warwick',       'British',   ['renault','brabham'],                     false, false, true,  true,  false],
  ['blundell',           'Mark',         'Blundell',      'British',   ['tyrrell','mclaren','williams'],           false, false, true,  false, false],
  ['nannini',            'Alessandro',   'Nannini',       'Italian',   ['ferrari'],                               false, true,  true,  false, false],
  ['piquet_jr',          'Nelson',       'Piquet Jr.',    'Brazilian', ['renault','williams'],                    false, false, false, false, true],
  ['reutemann',          'Carlos',       'Reutemann',     'Argentine', ['brabham','ferrari','williams','tyrrell'], false, true,  false, true,  true],
  ['regazzoni',          'Clay',         'Regazzoni',     'Swiss',     ['ferrari','tyrrell','williams','brabham'], false, true,  false, true,  false],
  ['watson',             'John',         'Watson',        'British',   ['brabham','mclaren'],                     false, true,  false, true,  false],
  ['laffite',            'Jacques',      'Laffite',       'French',    ['tyrrell','williams','mclaren','brabham'], false, true,  false, true,  false],
  ['arnoux',             'René',         'Arnoux',        'French',    ['renault','ferrari'],                     false, true,  false, true,  false],
  ['tambay',             'Patrick',      'Tambay',        'French',    ['tyrrell','ferrari'],                     false, true,  false, false, false],
  ['de_angelis',         'Elio',         'de Angelis',    'Italian',   ['lotus_f1','tyrrell'],                    false, true,  false, false, false],
  ['rosberg_k',          'Keke',         'Rosberg',       'Finnish',   ['tyrrell','williams'],                    true,  true,  false, true,  false],
  ['fittipaldi',         'Emerson',      'Fittipaldi',    'Brazilian', ['lotus_f1','mclaren','brabham'],           true,  true,  false, true,  true],
  ['salo',               'Mika',         'Salo',          'Finnish',   ['ferrari','mclaren','tyrrell'],            false, false, true,  true,  false],
  ['pironi',             'Didier',       'Pironi',        'French',    ['tyrrell','ferrari','brabham'],            false, true,  false, false, false],
  // ─── Added for broader coverage ─────────────────────────────────────────────
  ['alboreto',           'Michele',      'Alboreto',      'Italian',   ['tyrrell','ferrari'],                     false, true,  true,  true,  false],
  ['de_cesaris',         'Andrea',       'de Cesaris',    'Italian',   ['tyrrell','brabham'],                     false, false, true,  true,  false],
  ['nakajima_s',         'Satoru',       'Nakajima',      'Japanese',  ['williams','tyrrell'],                    false, false, true,  false, false],
  ['katayama_u',         'Ukyo',         'Katayama',      'Japanese',  ['tyrrell'],                               false, false, true,  false, false],
  ['jos_verstappen',     'Jos',          'Verstappen',    'Dutch',     ['tyrrell'],                               false, false, true,  true,  false],
  ['andretti_m',         'Michael',      'Andretti',      'American',  ['mclaren'],                               false, false, true,  false, false],
  ['johansson',          'Stefan',       'Johansson',     'Swedish',   ['ferrari','mclaren','tyrrell'],            false, false, true,  false, false],
  ['capelli',            'Ivan',         'Capelli',       'Italian',   ['ferrari'],                               false, false, true,  false, false],
  ['larini',             'Nicola',       'Larini',        'Italian',   ['ferrari'],                               false, false, true,  false, false],
  ['badoer',             'Luca',         'Badoer',        'Italian',   ['ferrari'],                               false, false, true,  false, false],
  ['morbidelli_g',       'Gianni',       'Morbidelli',    'Italian',   ['ferrari'],                               false, false, true,  false, false],
  ['piastri',            'Oscar',        'Piastri',       'Australian',['mclaren'],                               false, true,  false, false, false],
  ['tsunoda',            'Yuki',         'Tsunoda',       'Japanese',  ['red_bull'],                              false, false, false, true,  false],
];

function buildFallbackDriverMap(): Map<string, DriverProfile> {
  const map = new Map<string, DriverProfile>();
  for (const row of FALLBACK_DRIVERS) {
    const [id, givenName, familyName, nationality, constructors,
      isChampion, isRaceWinner, racedIn90s, gpsOver100, isLatinAmerican] = row;
    // Deduplicate id collisions (mansell appears twice — keep last)
    map.set(id, {
      id, givenName, familyName,
      fullName: `${givenName} ${familyName}`,
      nationality, constructors,
      isChampion, isRaceWinner, racedIn90s, gpsOver100, isLatinAmerican,
    });
  }
  return map;
}

const FALLBACK_DRIVER_MAP = buildFallbackDriverMap();

// ---------------------------------------------------------------------------
// Known drivers with 100+ GP starts (Jolpica IDs)
// ---------------------------------------------------------------------------
const KNOWN_CENTENARIANS = new Set([
  'alonso','hamilton','raikkonen','schumacher','button','barrichello',
  'coulthard','webber','rosberg','fisichella','trulli','vettel',
  'hulkenberg','perez','bottas','max_verstappen','leclerc','sainz',
  'norris','ocon','stroll','russell','ricciardo','hill','mansell',
  'prost','senna','piquet','berger','alesi','patrese','de_cesaris',
  'warwick','boutsen','brundle','alboreto','herbert','panis',
  'hakkinen','irvine','frentzen','ralf_schumacher','heidfeld',
  'kovalainen','massa','kubica','sutil','grosjean','maldonado',
  'vergne','magnussen','ericsson','gasly','giovinazzi','latifi',
  'de_la_rosa','montoya','villeneuve','nakajima_k','piquet_jr',
  'bourdais','salo','diniz','andretti','scheckter','regazzoni',
  'reutemann','lauda','watson','laffite','pironi','rosberg_k',
  'piquet','arnoux','fittipaldi','blundell','zanardi','albon',
  'tsunoda','zhou','sargeant',
  'alboreto','de_cesaris','jos_verstappen',
]);

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------
async function fetchJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { cache: 'no-store', signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function tryFetch<T>(url: string, fallback: T): Promise<T> {
  try {
    return (await fetchJson(url)) as T;
  } catch {
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// Per-resource fetchers (each returns empty fallback on failure)
// ---------------------------------------------------------------------------
type DriversResp = { MRData: { DriverTable: { Drivers: Array<{ driverId: string; givenName: string; familyName: string; nationality: string }> } } };
type ConstructorDriversResp = { MRData: { DriverTable: { Drivers: Array<{ driverId: string }> } } };
type StandingsResp = { MRData: { StandingsTable: { StandingsLists: Array<{ DriverStandings: Array<{ Driver: { driverId: string } }> }> } } };
type ResultsResp = { MRData: { total: string; RaceTable: { Races: Array<{ Results: Array<{ Driver: { driverId: string } }> }> } } };

async function fetchAllDrivers(): Promise<Map<string, DriverProfile>> {
  const empty: DriversResp = { MRData: { DriverTable: { Drivers: [] } } };
  const data = await tryFetch<DriversResp>(`${API_BASE}/drivers.json?limit=1000`, empty);
  const map = new Map<string, DriverProfile>();
  for (const d of data.MRData.DriverTable.Drivers) {
    map.set(d.driverId, {
      id: d.driverId,
      givenName: d.givenName,
      familyName: d.familyName,
      fullName: `${d.givenName} ${d.familyName}`,
      nationality: d.nationality,
      constructors: [],
      isChampion: false,
      isRaceWinner: false,
      racedIn90s: false,
      gpsOver100: KNOWN_CENTENARIANS.has(d.driverId),
      isLatinAmerican: LATIN_AMERICAN_NATIONALITIES.has(d.nationality),
    });
  }
  return map;
}

async function fetchConstructorDriverIds(constructorId: string): Promise<string[]> {
  const empty: ConstructorDriversResp = { MRData: { DriverTable: { Drivers: [] } } };
  const data = await tryFetch<ConstructorDriversResp>(
    `${API_BASE}/constructors/${constructorId}/drivers.json?limit=1000`, empty
  );
  return data.MRData.DriverTable.Drivers.map((d) => d.driverId);
}

async function fetchChampionIds(): Promise<Set<string>> {
  const empty: StandingsResp = { MRData: { StandingsTable: { StandingsLists: [] } } };
  const data = await tryFetch<StandingsResp>(`${API_BASE}/driverStandings/1.json?limit=200`, empty);
  const ids = new Set<string>();
  for (const sl of data.MRData.StandingsTable.StandingsLists) {
    for (const s of sl.DriverStandings) ids.add(s.Driver.driverId);
  }
  return ids;
}

async function fetchRaceWinnerIds(): Promise<Set<string>> {
  const ids = new Set<string>();
  let offset = 0;
  const limit = 1000;
  while (true) {
    const empty: ResultsResp = { MRData: { total: '0', RaceTable: { Races: [] } } };
    const data = await tryFetch<ResultsResp>(
      `${API_BASE}/results/1.json?limit=${limit}&offset=${offset}`, empty
    );
    for (const race of data.MRData.RaceTable.Races) {
      if (race.Results[0]) ids.add(race.Results[0].Driver.driverId);
    }
    const total = parseInt(data.MRData.total, 10);
    if (!total || offset + limit >= total) break;
    offset += limit;
  }
  return ids;
}

async function fetch90sDriverIds(): Promise<Set<string>> {
  const ids = new Set<string>();
  const years = [1990, 1991, 1992, 1993, 1994, 1995, 1996, 1997, 1998, 1999];
  await Promise.all(years.map(async (year) => {
    const empty: ConstructorDriversResp = { MRData: { DriverTable: { Drivers: [] } } };
    const data = await tryFetch<ConstructorDriversResp>(
      `${API_BASE}/${year}/drivers.json?limit=1000`, empty
    );
    for (const d of data.MRData.DriverTable.Drivers) ids.add(d.driverId);
  }));
  return ids;
}

// ---------------------------------------------------------------------------
// Merge API data on top of the fallback map
// ---------------------------------------------------------------------------
function mergeApiData(
  apiDrivers: Map<string, DriverProfile>,
  constructorMap: Map<string, string[]>,
  champions: Set<string>,
  raceWinners: Set<string>,
  nineties: Set<string>,
): Map<string, DriverProfile> {
  // Start with fallback, then overlay API entries
  const merged = new Map<string, DriverProfile>(FALLBACK_DRIVER_MAP);

  for (const [id, driver] of apiDrivers) {
    const apiConstructors = constructorMap.get(id) ?? [];
    // Preserve fallback constructors when API gives us none (e.g. timed-out constructor fetches)
    const fallbackConstructors = FALLBACK_DRIVER_MAP.get(id)?.constructors ?? [];
    const constructors = apiConstructors.length > 0 ? apiConstructors
      : fallbackConstructors.length > 0 ? fallbackConstructors
      : driver.constructors;
    merged.set(id, {
      ...driver,
      constructors,
      isChampion: champions.has(id),
      isRaceWinner: raceWinners.has(id),
      racedIn90s: nineties.has(id),
      gpsOver100: KNOWN_CENTENARIANS.has(id),
    });
  }

  // Also apply API flags to fallback-only drivers
  for (const [id, driver] of merged) {
    if (!apiDrivers.has(id)) {
      // Keep fallback data but apply any API-derived constructor lists
      const apiConstructors = constructorMap.get(id);
      if (apiConstructors && apiConstructors.length > 0) {
        driver.constructors = apiConstructors;
      }
    }
  }

  return merged;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export async function getF1Data(): Promise<F1DataCache> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL) return cache;

  // Always start with fallback so the game is playable even if API is down
  let drivers: Map<string, DriverProfile> = new Map(FALLBACK_DRIVER_MAP);

  try {
    const [apiDrivers, champions, raceWinners, nineties] = await Promise.all([
      fetchAllDrivers(),
      fetchChampionIds(),
      fetchRaceWinnerIds(),
      fetch90sDriverIds(),
    ]);

    const constructorLists = await Promise.all(
      CONSTRUCTOR_POOL.map((c) =>
        fetchConstructorDriverIds(c.id).then((ids) => ({ id: c.id, ids }))
      )
    );

    // Build driverId → constructor IDs map
    const constructorMap = new Map<string, string[]>();
    for (const { id: constructorId, ids } of constructorLists) {
      for (const driverId of ids) {
        const existing = constructorMap.get(driverId) ?? [];
        if (!existing.includes(constructorId)) existing.push(constructorId);
        constructorMap.set(driverId, existing);
      }
    }

    if (apiDrivers.size > 0) {
      drivers = mergeApiData(apiDrivers, constructorMap, champions, raceWinners, nineties);
    }
  } catch {
    console.warn('Jolpica API unavailable, using hardcoded fallback dataset');
  }

  cache = { drivers, fetchedAt: Date.now() };
  return cache;
}

export function driverMatchesCondition(
  driver: DriverProfile,
  condition: { type: string; id?: string }
): boolean {
  if (condition.type === 'constructor') {
    return driver.constructors.includes(condition.id!);
  }
  switch (condition.id) {
    case 'champion':      return driver.isChampion;
    case 'raceWinner':    return driver.isRaceWinner;
    case 'nineties':      return driver.racedIn90s;
    case 'centenary':     return driver.gpsOver100;
    case 'latinAmerican': return driver.isLatinAmerican;
    default:              return false;
  }
}

// Strip accents + lowercase so "Raikkonen" matches "Räikkönen", "Perez" matches "Pérez", etc.
export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

export function searchDrivers(query: string, drivers: Map<string, DriverProfile>): DriverProfile[] {
  const q = normalizeText(query.trim());
  if (q.length < 2) return [];
  const results: DriverProfile[] = [];
  for (const driver of drivers.values()) {
    const full = normalizeText(driver.fullName);
    const family = normalizeText(driver.familyName);
    const given = normalizeText(driver.givenName);
    if (full.includes(q) || family.startsWith(q) || given.startsWith(q) || family === q) {
      results.push(driver);
    }
  }
  return results
    .sort((a, b) => {
      const aExact = normalizeText(a.familyName) === q;
      const bExact = normalizeText(b.familyName) === q;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      return a.familyName.localeCompare(b.familyName);
    })
    .slice(0, 6);
}
