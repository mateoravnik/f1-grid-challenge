import { DRIVERS, TEAM_NAME_TO_ID } from './drivers';

export interface DriverProfile {
  id: string;
  givenName: string;
  familyName: string;
  fullName: string;
  nationality: string;       // display label e.g. 'Spanish'
  nationalityCode: string;   // ISO 3166-1 alpha-2 e.g. 'es'
  constructors: string[];    // CONSTRUCTOR_POOL ids
  isChampion: boolean;
  isRaceWinner: boolean;
  racedIn90s: boolean;
  racedIn2000s: boolean;
  racedIn2010s: boolean;
  gpsOver100: boolean;
  isLatinAmerican: boolean;
  isEuropean: boolean;
  winsOver10: boolean;
}

export interface F1DataCache {
  drivers: Map<string, DriverProfile>;
  fetchedAt: number;
}

const API_BASE = 'https://api.jolpi.ca/ergast/f1';
const CACHE_TTL = 6 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 15000;

let cache: F1DataCache | null = null;

const EUROPEAN_NATIONALITY_CODES = new Set([
  'gb', 'de', 'fr', 'fi', 'es', 'it', 'mc', 'at', 'ch', 'be',
  'se', 'pl', 'dk', 'nl', 'ru', 'pt', 'hu', 'ie',
]);

export const CONSTRUCTOR_POOL = [
  { id: 'ferrari',      label: 'Ferrari',      shortLabel: 'FER', wikiSlug: 'Scuderia_Ferrari' },
  { id: 'mclaren',      label: 'McLaren',       shortLabel: 'MCL', wikiSlug: 'McLaren_F1_Team' },
  { id: 'red_bull',     label: 'Red Bull',      shortLabel: 'RBR', wikiSlug: 'Red_Bull_Racing' },
  { id: 'mercedes',     label: 'Mercedes',      shortLabel: 'MER', wikiSlug: 'Mercedes-Benz_in_Formula_One' },
  { id: 'williams',     label: 'Williams',      shortLabel: 'WIL', wikiSlug: 'Williams_Racing' },
  { id: 'renault',      label: 'Renault',       shortLabel: 'REN', wikiSlug: 'Renault_F1_Team' },
  { id: 'lotus_f1',     label: 'Lotus',         shortLabel: 'LOT', wikiSlug: 'Lotus_F1_Team' },
  { id: 'alpine',       label: 'Alpine',        shortLabel: 'ALP', wikiSlug: 'Alpine_F1_Team' },
  { id: 'brabham',      label: 'Brabham',       shortLabel: 'BRA', wikiSlug: 'Brabham' },
  { id: 'tyrrell',      label: 'Tyrrell',       shortLabel: 'TYR', wikiSlug: 'Tyrrell_Racing' },
  { id: 'benetton',     label: 'Benetton',      shortLabel: 'BEN', wikiSlug: 'Benetton_Formula' },
  { id: 'jordan',       label: 'Jordan',        shortLabel: 'JOR', wikiSlug: 'Jordan_Grand_Prix' },
  { id: 'bar',          label: 'BAR',           shortLabel: 'BAR', wikiSlug: 'British_American_Racing' },
  { id: 'bmw_sauber',   label: 'BMW Sauber',    shortLabel: 'BMW', wikiSlug: 'BMW_Sauber' },
  { id: 'force_india',  label: 'Force India',   shortLabel: 'FIN', wikiSlug: 'Force_India' },
  { id: 'toro_rosso',   label: 'Toro Rosso',    shortLabel: 'STR', wikiSlug: 'Scuderia_Toro_Rosso' },
  { id: 'haas',         label: 'Haas',          shortLabel: 'HAA', wikiSlug: 'Haas_F1_Team' },
  { id: 'alphatauri',   label: 'AlphaTauri',    shortLabel: 'APT', wikiSlug: 'Scuderia_AlphaTauri' },
  { id: 'aston_martin', label: 'Aston Martin',  shortLabel: 'AMR', wikiSlug: 'Aston_Martin_in_Formula_One' },
  { id: 'alfa_romeo',   label: 'Alfa Romeo',    shortLabel: 'ARO', wikiSlug: 'Alfa_Romeo_in_Formula_One' },
];

export const SPECIAL_CONDITIONS = [
  { id: 'champion',      label: 'Campeón del Mundo',       shortLabel: '🏆 Campeón' },
  { id: 'raceWinner',    label: 'Ganó al menos 1 GP',      shortLabel: '🏁 1+ victorias' },
  { id: 'noWin',         label: 'Nunca ganó una carrera',  shortLabel: '❌ Sin victoria' },
  { id: 'nineties',      label: 'Corrió en los 90s',       shortLabel: '📅 90s' },
  { id: 'zeroes',        label: 'Corrió en los 2000s',     shortLabel: '📅 2000s' },
  { id: 'tens',          label: 'Corrió en los 2010s',     shortLabel: '📅 2010s' },
  { id: 'centenary',     label: 'Corrió más de 100 GPs',   shortLabel: '💯 100+ GPs' },
  { id: 'winsOverTen',   label: 'Ganó más de 10 carreras', shortLabel: '🔟+ Victorias' },
  { id: 'latinAmerican', label: 'Piloto latinoamericano',  shortLabel: '🌎 LATAM' },
  { id: 'european',      label: 'Piloto europeo',          shortLabel: '🌍 Europa' },
];

// ---------------------------------------------------------------------------
// Build the static driver map from drivers.ts
// ---------------------------------------------------------------------------
function buildStaticDriverMap(): Map<string, DriverProfile> {
  const map = new Map<string, DriverProfile>();
  for (const d of DRIVERS) {
    const constructors = [...new Set(
      d.teams
        .map(t => TEAM_NAME_TO_ID[t])
        .filter((id): id is string => !!id)
    )];
    map.set(d.id, {
      id: d.id,
      givenName: d.givenName,
      familyName: d.familyName,
      fullName: d.fullName,
      nationality: d.nationality,
      nationalityCode: d.nationalityCode,
      constructors,
      isChampion: d.isChampion,
      isRaceWinner: d.winsAtLeastOne,
      racedIn90s: d.decades.includes('90s'),
      racedIn2000s: d.decades.includes('2000s'),
      racedIn2010s: d.decades.includes('2010s'),
      gpsOver100: d.totalGPs >= 100,
      isLatinAmerican: d.isLatam,
      isEuropean: EUROPEAN_NATIONALITY_CODES.has(d.nationalityCode),
      winsOver10: d.totalWins > 10,
    });
  }
  return map;
}

const STATIC_DRIVER_MAP = buildStaticDriverMap();

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
  try { return (await fetchJson(url)) as T; } catch { return fallback; }
}

// ---------------------------------------------------------------------------
// Per-resource fetchers (augment static data with live API)
// ---------------------------------------------------------------------------
type ConstructorDriversResp = { MRData: { DriverTable: { Drivers: Array<{ driverId: string }> } } };
type StandingsResp = { MRData: { StandingsTable: { StandingsLists: Array<{ DriverStandings: Array<{ Driver: { driverId: string } }> }> } } };
type ResultsResp = { MRData: { total: string; RaceTable: { Races: Array<{ Results: Array<{ Driver: { driverId: string } }> }> } } };
type SeasonDriversResp = { MRData: { DriverTable: { Drivers: Array<{ driverId: string }> } } };

async function fetchConstructorDriverIds(constructorId: string): Promise<string[]> {
  const empty: ConstructorDriversResp = { MRData: { DriverTable: { Drivers: [] } } };
  const data = await tryFetch<ConstructorDriversResp>(
    `${API_BASE}/constructors/${constructorId}/drivers.json?limit=1000`, empty
  );
  return data.MRData.DriverTable.Drivers.map(d => d.driverId);
}

async function fetchChampionIds(): Promise<Set<string>> {
  const empty: StandingsResp = { MRData: { StandingsTable: { StandingsLists: [] } } };
  const data = await tryFetch<StandingsResp>(`${API_BASE}/driverStandings/1.json?limit=200`, empty);
  const ids = new Set<string>();
  for (const sl of data.MRData.StandingsTable.StandingsLists)
    for (const s of sl.DriverStandings) ids.add(s.Driver.driverId);
  return ids;
}

async function fetchRaceWinnerIds(): Promise<Set<string>> {
  const ids = new Set<string>();
  let offset = 0;
  while (true) {
    const empty: ResultsResp = { MRData: { total: '0', RaceTable: { Races: [] } } };
    const data = await tryFetch<ResultsResp>(`${API_BASE}/results/1.json?limit=1000&offset=${offset}`, empty);
    for (const race of data.MRData.RaceTable.Races)
      if (race.Results[0]) ids.add(race.Results[0].Driver.driverId);
    const total = parseInt(data.MRData.total, 10);
    if (!total || offset + 1000 >= total) break;
    offset += 1000;
  }
  return ids;
}

async function fetch90sDriverIds(): Promise<Set<string>> {
  const ids = new Set<string>();
  await Promise.all(
    [1990,1991,1992,1993,1994,1995,1996,1997,1998,1999].map(async year => {
      const empty: SeasonDriversResp = { MRData: { DriverTable: { Drivers: [] } } };
      const data = await tryFetch<SeasonDriversResp>(`${API_BASE}/${year}/drivers.json?limit=1000`, empty);
      for (const d of data.MRData.DriverTable.Drivers) ids.add(d.driverId);
    })
  );
  return ids;
}

// ---------------------------------------------------------------------------
// Merge API data on top of the static map
// ---------------------------------------------------------------------------
function mergeApiData(
  constructorMap: Map<string, string[]>,
  champions: Set<string>,
  raceWinners: Set<string>,
  nineties: Set<string>,
): Map<string, DriverProfile> {
  const merged = new Map<string, DriverProfile>(STATIC_DRIVER_MAP);

  for (const [id, driver] of merged) {
    const apiConstructors = constructorMap.get(id);
    const staticData = STATIC_DRIVER_MAP.get(id);
    merged.set(id, {
      ...driver,
      // Merge API constructors with static ones — never discard static data
      // (Ergast uses different IDs like 'alfa' vs our 'alfa_romeo', so API calls
      //  for some constructors return empty; static data fills the gaps)
      constructors: apiConstructors && apiConstructors.length > 0
        ? [...new Set([...(staticData?.constructors ?? []), ...apiConstructors])]
        : driver.constructors,
      // OR with static so partial API failures don't erase known data
      isChampion: champions.has(id) || (staticData?.isChampion ?? false),
      isRaceWinner: raceWinners.has(id) || (staticData?.isRaceWinner ?? false),
      racedIn90s: nineties.has(id) || (staticData?.racedIn90s ?? false),
    });
  }

  return merged;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export async function getF1Data(): Promise<F1DataCache> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL) return cache;

  let drivers: Map<string, DriverProfile> = new Map(STATIC_DRIVER_MAP);

  try {
    const [champions, raceWinners, nineties] = await Promise.all([
      fetchChampionIds(),
      fetchRaceWinnerIds(),
      fetch90sDriverIds(),
    ]);

    const constructorLists = await Promise.all(
      CONSTRUCTOR_POOL.map(c =>
        fetchConstructorDriverIds(c.id).then(ids => ({ id: c.id, ids }))
      )
    );

    const constructorMap = new Map<string, string[]>();
    for (const { id: cid, ids } of constructorLists) {
      for (const driverId of ids) {
        const existing = constructorMap.get(driverId) ?? [];
        if (!existing.includes(cid)) existing.push(cid);
        constructorMap.set(driverId, existing);
      }
    }

    drivers = mergeApiData(constructorMap, champions, raceWinners, nineties);
  } catch {
    console.warn('Jolpica API unavailable, using static dataset');
  }

  cache = { drivers, fetchedAt: Date.now() };
  return cache;
}

export function driverMatchesCondition(
  driver: DriverProfile,
  condition: { type: string; id?: string }
): boolean {
  if (condition.type === 'constructor') return driver.constructors.includes(condition.id!);
  switch (condition.id) {
    case 'champion':      return driver.isChampion;
    case 'raceWinner':    return driver.isRaceWinner;
    case 'noWin':         return !driver.isRaceWinner;
    case 'nineties':      return driver.racedIn90s;
    case 'zeroes':        return driver.racedIn2000s;
    case 'tens':          return driver.racedIn2010s;
    case 'centenary':     return driver.gpsOver100;
    case 'winsOverTen':   return driver.winsOver10;
    case 'latinAmerican': return driver.isLatinAmerican;
    case 'european':      return driver.isEuropean;
    default:              return false;
  }
}

export function normalizeText(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function searchDrivers(query: string, drivers: Map<string, DriverProfile>): DriverProfile[] {
  const q = normalizeText(query.trim());
  if (q.length < 2) return [];
  const results: DriverProfile[] = [];
  for (const driver of drivers.values()) {
    const full = normalizeText(driver.fullName);
    const family = normalizeText(driver.familyName);
    const given = normalizeText(driver.givenName);
    if (full.includes(q) || family.startsWith(q) || given.startsWith(q) || family === q)
      results.push(driver);
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
