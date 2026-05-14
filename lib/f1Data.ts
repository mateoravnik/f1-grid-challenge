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

// Jolpica is the community mirror of the retired Ergast API
const API_BASE = 'https://api.jolpi.ca/ergast/f1';
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

let cache: F1DataCache | null = null;

const LATIN_AMERICAN_NATIONALITIES = new Set([
  'Brazilian', 'Mexican', 'Colombian', 'Argentine', 'Venezuelan',
  'Chilean', 'Peruvian', 'Uruguayan', 'Ecuadorian', 'Bolivian',
]);

// Constructor IDs as used in Ergast/Jolpica API
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

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.json();
}

async function getConstructorDrivers(constructorId: string): Promise<string[]> {
  try {
    const data = await fetchJson(`${API_BASE}/constructors/${constructorId}/drivers.json?limit=1000`) as {
      MRData: { DriverTable: { Drivers: Array<{ driverId: string }> } }
    };
    return data.MRData.DriverTable.Drivers.map((d) => d.driverId);
  } catch {
    return [];
  }
}

async function getAllDrivers(): Promise<Map<string, DriverProfile>> {
  const data = await fetchJson(`${API_BASE}/drivers.json?limit=1000`) as {
    MRData: { DriverTable: { Drivers: Array<{ driverId: string; givenName: string; familyName: string; nationality: string }> } }
  };
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
      gpsOver100: false,
      isLatinAmerican: LATIN_AMERICAN_NATIONALITIES.has(d.nationality),
    });
  }
  return map;
}

async function getChampionDriverIds(): Promise<Set<string>> {
  const data = await fetchJson(`${API_BASE}/driverStandings/1.json?limit=200`) as {
    MRData: { StandingsTable: { StandingsLists: Array<{ DriverStandings: Array<{ Driver: { driverId: string } }> }> } }
  };
  const ids = new Set<string>();
  for (const sl of data.MRData.StandingsTable.StandingsLists) {
    for (const s of sl.DriverStandings) {
      ids.add(s.Driver.driverId);
    }
  }
  return ids;
}

async function getRaceWinnerIds(): Promise<Set<string>> {
  const ids = new Set<string>();
  let offset = 0;
  const limit = 1000;
  while (true) {
    const data = await fetchJson(`${API_BASE}/results/1.json?limit=${limit}&offset=${offset}`) as {
      MRData: { total: string; RaceTable: { Races: Array<{ Results: Array<{ Driver: { driverId: string } }> }> } }
    };
    for (const race of data.MRData.RaceTable.Races) {
      if (race.Results[0]) ids.add(race.Results[0].Driver.driverId);
    }
    const total = parseInt(data.MRData.total, 10);
    offset += limit;
    if (offset >= total) break;
  }
  return ids;
}

async function get90sDriverIds(): Promise<Set<string>> {
  const ids = new Set<string>();
  const years = [1990,1991,1992,1993,1994,1995,1996,1997,1998,1999];
  await Promise.all(years.map(async (year) => {
    try {
      const data = await fetchJson(`${API_BASE}/${year}/drivers.json?limit=1000`) as {
        MRData: { DriverTable: { Drivers: Array<{ driverId: string }> } }
      };
      for (const d of data.MRData.DriverTable.Drivers) ids.add(d.driverId);
    } catch { /* ignore */ }
  }));
  return ids;
}

// Known drivers with 100+ GP starts (Ergast IDs)
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
  'de_la_rosa','montoya','villeneuve','nakajima_k','nakajima',
  'piquet_jr','bourdais','salo','diniz','mazzacane','burti',
  'zhou','zhou_guanyu','sargeant','albon','tsunoda','lawson',
  'hadjar','bearman','doohan','bortoleto',
  'andretti','scheckter','regazzoni','reutemann','lauda','watson',
  'laffite','pironi','tambay','de_angelis','cheever','dumfries',
  'jones','rosberg_k','piquet','arnoux','jarier','mass',
  'depailler','jabouille','leclere','pironi','tambay',
  'surer','winkelhock','guerrero','nannini','caffi','larini',
  'martini','moreno','dalmas','lehto','wendlinger','fittipaldi_c',
  'fittipaldi','blundell','comas','suzuki','zanardi','lavaggi',
  'badoer','gene','marques','mazzacane','verstappen','van_de_poele',
]);

export async function getF1Data(): Promise<F1DataCache> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL) return cache;

  const [drivers, champions, raceWinners, ninetiesDrivers] = await Promise.all([
    getAllDrivers(),
    getChampionDriverIds(),
    getRaceWinnerIds(),
    get90sDriverIds(),
  ]);

  // Fetch constructor driver lists in parallel
  const constructorDriverLists = await Promise.all(
    CONSTRUCTOR_POOL.map(async (c) => ({ id: c.id, driverIds: await getConstructorDrivers(c.id) }))
  );

  // Build constructor → drivers map and enrich driver profiles
  for (const { id, driverIds } of constructorDriverLists) {
    for (const driverId of driverIds) {
      const driver = drivers.get(driverId);
      if (driver) driver.constructors.push(id);
    }
  }

  // Apply special condition flags
  for (const [id, driver] of drivers) {
    driver.isChampion = champions.has(id);
    driver.isRaceWinner = raceWinners.has(id);
    driver.racedIn90s = ninetiesDrivers.has(id);
    driver.gpsOver100 = KNOWN_CENTENARIANS.has(id);
  }

  cache = { drivers, fetchedAt: Date.now() };
  return cache;
}

export function findDriversByCondition(
  drivers: Map<string, DriverProfile>,
  condition: { type: string; id?: string }
): string[] {
  const result: string[] = [];
  for (const [id, driver] of drivers) {
    if (driverMatchesCondition(driver, condition)) result.push(id);
  }
  return result;
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

export function fuzzyMatch(query: string, driver: DriverProfile): boolean {
  const q = query.toLowerCase().trim();
  if (!q) return false;
  const full = driver.fullName.toLowerCase();
  const family = driver.familyName.toLowerCase();
  const given = driver.givenName.toLowerCase();
  return full.includes(q) || family.startsWith(q) || given.startsWith(q) ||
    family === q || full === q;
}

export function searchDrivers(query: string, drivers: Map<string, DriverProfile>): DriverProfile[] {
  const q = query.toLowerCase().trim();
  if (q.length < 2) return [];
  const results: DriverProfile[] = [];
  for (const driver of drivers.values()) {
    if (fuzzyMatch(q, driver)) results.push(driver);
  }
  return results.sort((a, b) => {
    const aExact = a.familyName.toLowerCase() === q;
    const bExact = b.familyName.toLowerCase() === q;
    if (aExact && !bExact) return -1;
    if (!aExact && bExact) return 1;
    return a.familyName.localeCompare(b.familyName);
  }).slice(0, 6);
}
