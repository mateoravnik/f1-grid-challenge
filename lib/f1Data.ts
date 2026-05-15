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

const LATIN_AMERICAN_NATIONALITIES = new Set([
  'Brazilian', 'Mexican', 'Colombian', 'Argentine', 'Venezuelan',
  'Chilean', 'Peruvian', 'Uruguayan', 'Ecuadorian', 'Bolivian',
]);

const EUROPEAN_NATIONALITIES = new Set([
  'British', 'German', 'French', 'Finnish', 'Spanish', 'Italian',
  'Monegasque', 'Austrian', 'Swiss', 'Belgian', 'Swedish', 'Polish',
  'Danish', 'Dutch', 'Russian', 'Portuguese', 'Hungarian',
]);

// Drivers with more than 10 F1 race wins (Jolpica IDs)
const WINS_OVER_TEN_DRIVERS = new Set([
  'hamilton', 'schumacher', 'senna', 'prost', 'vettel', 'alonso',
  'mansell', 'hill', 'piquet', 'lauda', 'hakkinen', 'coulthard',
  'barrichello', 'rosberg', 'reutemann', 'fittipaldi', 'max_verstappen',
  'villeneuve', 'button', 'massa',
]);

export const CONSTRUCTOR_POOL = [
  { id: 'ferrari',     label: 'Ferrari',       shortLabel: 'FER', wikiSlug: 'Scuderia_Ferrari' },
  { id: 'mclaren',     label: 'McLaren',        shortLabel: 'MCL', wikiSlug: 'McLaren_F1_Team' },
  { id: 'red_bull',    label: 'Red Bull',       shortLabel: 'RBR', wikiSlug: 'Red_Bull_Racing' },
  { id: 'mercedes',    label: 'Mercedes',       shortLabel: 'MER', wikiSlug: 'Mercedes-Benz_in_Formula_One' },
  { id: 'williams',    label: 'Williams',       shortLabel: 'WIL', wikiSlug: 'Williams_Racing' },
  { id: 'renault',     label: 'Renault',        shortLabel: 'REN', wikiSlug: 'Renault_F1_Team' },
  { id: 'lotus_f1',    label: 'Lotus',          shortLabel: 'LOT', wikiSlug: 'Lotus_F1_Team' },
  { id: 'alpine',      label: 'Alpine',         shortLabel: 'ALP', wikiSlug: 'Alpine_F1_Team' },
  { id: 'brabham',     label: 'Brabham',        shortLabel: 'BRA', wikiSlug: 'Brabham' },
  { id: 'tyrrell',     label: 'Tyrrell',        shortLabel: 'TYR', wikiSlug: 'Tyrrell_Racing' },
  { id: 'benetton',    label: 'Benetton',       shortLabel: 'BEN', wikiSlug: 'Benetton_Formula' },
  { id: 'jordan',      label: 'Jordan',         shortLabel: 'JOR', wikiSlug: 'Jordan_Grand_Prix' },
  { id: 'bar',         label: 'BAR',            shortLabel: 'BAR', wikiSlug: 'British_American_Racing' },
  { id: 'bmw_sauber',  label: 'BMW Sauber',     shortLabel: 'BMW', wikiSlug: 'BMW_Sauber' },
  { id: 'force_india', label: 'Force India',    shortLabel: 'FIN', wikiSlug: 'Force_India' },
  { id: 'toro_rosso',  label: 'Toro Rosso',     shortLabel: 'STR', wikiSlug: 'Scuderia_Toro_Rosso' },
  { id: 'haas',        label: 'Haas',           shortLabel: 'HAA', wikiSlug: 'Haas_F1_Team' },
  { id: 'alphatauri',  label: 'AlphaTauri',     shortLabel: 'APT', wikiSlug: 'Scuderia_AlphaTauri' },
  { id: 'aston_martin',label: 'Aston Martin',   shortLabel: 'AMR', wikiSlug: 'Aston_Martin_in_Formula_One' },
  { id: 'alfa_romeo',  label: 'Alfa Romeo',     shortLabel: 'ARO', wikiSlug: 'Alfa_Romeo_in_Formula_One' },
];

export const SPECIAL_CONDITIONS = [
  { id: 'champion',    label: 'Campeón del Mundo',        shortLabel: '🏆 Campeón' },
  { id: 'raceWinner',  label: 'Ganó al menos 1 carrera',  shortLabel: '🏁 Ganador' },
  { id: 'noWin',       label: 'Nunca ganó una carrera',   shortLabel: '❌ Sin victoria' },
  { id: 'nineties',    label: 'Corrió en los 90s',        shortLabel: '📅 90s' },
  { id: 'zeroes',      label: 'Corrió en los 2000s',      shortLabel: '📅 2000s' },
  { id: 'tens',        label: 'Corrió en los 2010s',      shortLabel: '📅 2010s' },
  { id: 'centenary',   label: 'Corrió más de 100 GPs',    shortLabel: '💯 100+ GPs' },
  { id: 'winsOverTen', label: 'Ganó más de 10 carreras',  shortLabel: '🔟+ Victorias' },
  { id: 'latinAmerican', label: 'Piloto latinoamericano', shortLabel: '🌎 LATAM' },
  { id: 'european',    label: 'Piloto europeo',           shortLabel: '🇪🇺 Europa' },
];

// ---------------------------------------------------------------------------
// FALLBACK DATASET
// [id, givenName, familyName, nationality, constructors[],
//  isChampion, isRaceWinner, racedIn90s, racedIn2000s, racedIn2010s, gpsOver100, isLatinAmerican]
// isEuropean and winsOver10 are computed from Sets
// ---------------------------------------------------------------------------
type FallbackRow = [
  string, string, string, string, string[],
  boolean, boolean, boolean, boolean, boolean, boolean, boolean
];

const FALLBACK_DRIVERS: FallbackRow[] = [
  // id                   given           family          nat              constructors                                              champ  win    90s    00s    10s    100+   latam
  ['hamilton',            'Lewis',         'Hamilton',      'British',       ['mclaren','mercedes'],                                  true,  true,  false, true,  true,  true,  false],
  ['schumacher',          'Michael',       'Schumacher',    'German',        ['benetton','ferrari','mercedes'],                       true,  true,  true,  true,  true,  true,  false],
  ['vettel',              'Sebastian',     'Vettel',        'German',        ['toro_rosso','red_bull','ferrari','aston_martin'],       true,  true,  false, true,  true,  true,  false],
  ['alonso',              'Fernando',      'Alonso',        'Spanish',       ['renault','mclaren','ferrari','alpine','aston_martin'],  true,  true,  false, true,  true,  true,  false],
  ['raikkonen',           'Kimi',          'Räikkönen',     'Finnish',       ['mclaren','ferrari','lotus_f1','alfa_romeo'],           true,  true,  false, true,  true,  true,  false],
  ['max_verstappen',      'Max',           'Verstappen',    'Dutch',         ['toro_rosso','red_bull'],                              true,  true,  false, false, true,  true,  false],
  ['senna',               'Ayrton',        'Senna',         'Brazilian',     ['mclaren','williams'],                                 true,  true,  true,  false, false, true,  true],
  ['prost',               'Alain',         'Prost',         'French',        ['mclaren','ferrari','williams','renault'],             true,  true,  true,  false, false, true,  false],
  ['lauda',               'Niki',          'Lauda',         'Austrian',      ['ferrari','mclaren','brabham'],                        true,  true,  false, false, false, true,  false],
  ['mansell',             'Nigel',         'Mansell',       'British',       ['ferrari','williams'],                                 true,  true,  true,  false, false, true,  false],
  ['hill',                'Damon',         'Hill',          'British',       ['williams','jordan'],                                  true,  true,  true,  false, false, true,  false],
  ['piquet',              'Nelson',        'Piquet',        'Brazilian',     ['brabham','williams'],                                 true,  true,  true,  false, false, true,  true],
  ['scheckter',           'Jody',          'Scheckter',     'South African', ['tyrrell','ferrari'],                                  true,  true,  false, false, false, true,  false],
  ['button',              'Jenson',        'Button',        'British',       ['williams','benetton','bar','renault','mclaren'],       true,  true,  false, true,  true,  true,  false],
  ['rosberg',             'Nico',          'Rosberg',       'German',        ['williams','mercedes'],                                true,  true,  false, true,  true,  true,  false],
  ['hakkinen',            'Mika',          'Häkkinen',      'Finnish',       ['mclaren'],                                            true,  true,  true,  true,  false, true,  false],
  ['coulthard',           'David',         'Coulthard',     'British',       ['williams','mclaren'],                                 false, true,  true,  true,  false, true,  false],
  ['webber',              'Mark',          'Webber',        'Australian',    ['williams','red_bull'],                                false, true,  false, true,  true,  true,  false],
  ['barrichello',         'Rubens',        'Barrichello',   'Brazilian',     ['jordan','ferrari','williams'],                        false, true,  true,  true,  true,  true,  true],
  ['massa',               'Felipe',        'Massa',         'Brazilian',     ['ferrari','williams'],                                 false, true,  false, true,  true,  true,  true],
  ['montoya',             'Juan Pablo',    'Montoya',       'Colombian',     ['williams','mclaren'],                                 false, true,  false, true,  false, false, true],
  ['ricciardo',           'Daniel',        'Ricciardo',     'Australian',    ['toro_rosso','red_bull','renault','mclaren'],          false, true,  false, false, true,  true,  false],
  ['hulkenberg',          'Nico',          'Hülkenberg',    'German',        ['williams','force_india','renault','haas'],            false, false, false, false, true,  true,  false],
  ['perez',               'Sergio',        'Pérez',         'Mexican',       ['force_india','mclaren','red_bull'],                   false, true,  false, false, true,  true,  true],
  ['bottas',              'Valtteri',      'Bottas',        'Finnish',       ['williams','mercedes','alfa_romeo'],                   false, true,  false, false, true,  true,  false],
  ['leclerc',             'Charles',       'Leclerc',       'Monegasque',    ['ferrari'],                                            false, true,  false, false, true,  true,  false],
  ['sainz',               'Carlos',        'Sainz',         'Spanish',       ['toro_rosso','renault','mclaren','ferrari','williams'], false, true,  false, false, true,  true,  false],
  ['norris',              'Lando',         'Norris',        'British',       ['mclaren'],                                            false, true,  false, false, true,  true,  false],
  ['russell',             'George',        'Russell',       'British',       ['williams','mercedes'],                                false, true,  false, false, true,  true,  false],
  ['ocon',                'Esteban',       'Ocon',          'French',        ['force_india','renault','alpine'],                     false, true,  false, false, true,  true,  false],
  ['gasly',               'Pierre',        'Gasly',         'French',        ['toro_rosso','red_bull','alphatauri','alpine'],        false, true,  false, false, true,  true,  false],
  ['albon',               'Alexander',     'Albon',         'Thai',          ['red_bull','williams'],                                false, false, false, false, true,  true,  false],
  ['stroll',              'Lance',         'Stroll',        'Canadian',      ['williams','aston_martin'],                            false, false, false, false, true,  true,  false],
  ['giovinazzi',          'Antonio',       'Giovinazzi',    'Italian',       ['alfa_romeo'],                                         false, false, false, false, true,  false, false],
  ['magnussen',           'Kevin',         'Magnussen',     'Danish',        ['mclaren','renault','haas'],                           false, false, false, false, true,  true,  false],
  ['grosjean',            'Romain',        'Grosjean',      'French',        ['renault','lotus_f1','haas'],                          false, false, false, true,  true,  true,  false],
  ['maldonado',           'Pastor',        'Maldonado',     'Venezuelan',    ['williams','lotus_f1'],                                false, true,  false, false, true,  false, true],
  ['kubica',              'Robert',        'Kubica',        'Polish',        ['bmw_sauber','renault','williams'],                    false, true,  false, true,  true,  true,  false],
  ['fisichella',          'Giancarlo',     'Fisichella',    'Italian',       ['benetton','jordan','renault','force_india','ferrari'],false, true,  true,  true,  false, true,  false],
  ['trulli',              'Jarno',         'Trulli',        'Italian',       ['jordan','renault'],                                   false, true,  true,  true,  true,  true,  false],
  ['frentzen',            'Heinz-Harald',  'Frentzen',      'German',        ['williams','jordan'],                                  false, true,  true,  true,  false, true,  false],
  ['villeneuve',          'Jacques',       'Villeneuve',    'Canadian',      ['williams','bar','bmw_sauber'],                        true,  true,  true,  true,  false, true,  false],
  ['irvine',              'Eddie',         'Irvine',        'British',       ['ferrari'],                                            false, true,  true,  true,  false, true,  false],
  ['herbert',             'Johnny',        'Herbert',       'British',       ['benetton','ferrari'],                                 false, true,  true,  true,  false, true,  false],
  ['panis',               'Olivier',       'Panis',         'French',        ['bar','mclaren'],                                      false, true,  true,  true,  false, true,  false],
  ['heidfeld',            'Nick',          'Heidfeld',      'German',        ['williams','bmw_sauber'],                             false, false, false, true,  true,  true,  false],
  ['kovalainen',          'Heikki',        'Kovalainen',    'Finnish',       ['renault','mclaren'],                                  false, true,  false, true,  true,  true,  false],
  ['sutil',               'Adrian',        'Sutil',         'German',        ['force_india'],                                        false, false, false, true,  true,  true,  false],
  ['de_la_rosa',          'Pedro',         'de la Rosa',    'Spanish',       ['mclaren'],                                            false, false, false, true,  true,  true,  false],
  ['ralf_schumacher',     'Ralf',          'Schumacher',    'German',        ['jordan','williams'],                                  false, true,  true,  true,  false, true,  false],
  ['berger',              'Gerhard',       'Berger',        'Austrian',      ['ferrari','mclaren','benetton'],                       false, true,  true,  false, false, true,  false],
  ['alesi',               'Jean',          'Alesi',         'French',        ['tyrrell','ferrari','benetton'],                       false, true,  true,  true,  false, true,  false],
  ['patrese',             'Riccardo',      'Patrese',       'Italian',       ['brabham','williams'],                                 false, true,  true,  false, false, true,  false],
  ['boutsen',             'Thierry',       'Boutsen',       'Belgian',       ['williams'],                                           false, true,  true,  false, false, true,  false],
  ['brundle',             'Martin',        'Brundle',       'British',       ['tyrrell','mclaren','brabham'],                        false, false, true,  false, false, true,  false],
  ['warwick',             'Derek',         'Warwick',       'British',       ['renault','brabham'],                                  false, false, true,  false, false, true,  false],
  ['blundell',            'Mark',          'Blundell',      'British',       ['tyrrell','mclaren','williams'],                       false, false, true,  false, false, false, false],
  ['nannini',             'Alessandro',    'Nannini',       'Italian',       ['benetton'],                                           false, true,  false, false, false, false, false],
  ['piquet_jr',           'Nelson',        'Piquet Jr.',    'Brazilian',     ['renault','williams'],                                 false, false, false, true,  false, false, true],
  ['reutemann',           'Carlos',        'Reutemann',     'Argentine',     ['brabham','ferrari','williams','tyrrell'],             false, true,  false, false, false, true,  true],
  ['regazzoni',           'Clay',          'Regazzoni',     'Swiss',         ['ferrari','tyrrell','williams','brabham'],             false, true,  false, false, false, true,  false],
  ['watson',              'John',          'Watson',        'British',       ['brabham','mclaren'],                                  false, true,  false, false, false, true,  false],
  ['laffite',             'Jacques',       'Laffite',       'French',        ['tyrrell','williams','mclaren','brabham'],             false, true,  false, false, false, true,  false],
  ['arnoux',              'René',          'Arnoux',        'French',        ['renault','ferrari'],                                  false, true,  false, false, false, true,  false],
  ['tambay',              'Patrick',       'Tambay',        'French',        ['tyrrell','ferrari'],                                  false, true,  false, false, false, false, false],
  ['de_angelis',          'Elio',          'de Angelis',    'Italian',       ['lotus_f1'],                                           false, true,  false, false, false, false, false],
  ['rosberg_k',           'Keke',          'Rosberg',       'Finnish',       ['tyrrell','williams'],                                 true,  true,  false, false, false, true,  false],
  ['fittipaldi',          'Emerson',       'Fittipaldi',    'Brazilian',     ['lotus_f1','mclaren','brabham'],                       true,  true,  false, false, false, true,  true],
  ['salo',                'Mika',          'Salo',          'Finnish',       ['ferrari','mclaren','tyrrell'],                        false, false, true,  true,  false, true,  false],
  ['pironi',              'Didier',        'Pironi',        'French',        ['tyrrell','ferrari'],                                  false, true,  false, false, false, false, false],
  ['alboreto',            'Michele',       'Alboreto',      'Italian',       ['tyrrell','ferrari'],                                  false, true,  true,  false, false, true,  false],
  ['de_cesaris',          'Andrea',        'de Cesaris',    'Italian',       ['tyrrell','brabham'],                                  false, false, true,  false, false, true,  false],
  ['nakajima_s',          'Satoru',        'Nakajima',      'Japanese',      ['williams','tyrrell'],                                 false, false, true,  false, false, false, false],
  ['katayama_u',          'Ukyo',          'Katayama',      'Japanese',      ['tyrrell'],                                            false, false, true,  false, false, false, false],
  ['jos_verstappen',      'Jos',           'Verstappen',    'Dutch',         ['benetton','tyrrell'],                                 false, false, true,  true,  false, true,  false],
  ['andretti_m',          'Michael',       'Andretti',      'American',      ['mclaren'],                                            false, false, true,  false, false, false, false],
  ['johansson',           'Stefan',        'Johansson',     'Swedish',       ['ferrari','mclaren','tyrrell'],                        false, false, true,  false, false, false, false],
  ['capelli',             'Ivan',          'Capelli',       'Italian',       ['ferrari'],                                            false, false, true,  false, false, false, false],
  ['larini',              'Nicola',        'Larini',        'Italian',       ['ferrari'],                                            false, false, true,  false, false, false, false],
  ['badoer',              'Luca',          'Badoer',        'Italian',       ['ferrari'],                                            false, false, true,  true,  false, true,  false],
  ['morbidelli_g',        'Gianni',        'Morbidelli',    'Italian',       ['ferrari'],                                            false, false, true,  false, false, false, false],
  ['piastri',             'Oscar',         'Piastri',       'Australian',    ['mclaren'],                                            false, true,  false, false, false, false, false],
  ['tsunoda',             'Yuki',          'Tsunoda',       'Japanese',      ['alphatauri'],                                         false, false, false, false, false, true,  false],
  // New drivers for expanded team coverage
  ['kvyat',               'Daniil',        'Kvyat',         'Russian',       ['toro_rosso','red_bull','alphatauri'],                 false, false, false, false, true,  true,  false],
  ['de_vries',            'Nyck',          'de Vries',      'Dutch',         ['alphatauri'],                                         false, false, false, false, false, false, false],
  ['schumacher_m',        'Mick',          'Schumacher',    'German',        ['haas'],                                               false, false, false, false, false, false, false],
  ['gutierrez_e',         'Esteban',       'Gutiérrez',     'Mexican',       ['haas'],                                               false, false, false, false, true,  false, true],
  ['sato_t',              'Takuma',        'Sato',          'Japanese',      ['bar','jordan'],                                        false, false, false, true,  false, true,  false],
];

function buildFallbackDriverMap(): Map<string, DriverProfile> {
  const map = new Map<string, DriverProfile>();
  for (const row of FALLBACK_DRIVERS) {
    const [id, givenName, familyName, nationality, constructors,
      isChampion, isRaceWinner, racedIn90s, racedIn2000s, racedIn2010s, gpsOver100, isLatinAmerican] = row;
    map.set(id, {
      id, givenName, familyName,
      fullName: `${givenName} ${familyName}`,
      nationality, constructors,
      isChampion, isRaceWinner, racedIn90s, racedIn2000s, racedIn2010s, gpsOver100, isLatinAmerican,
      isEuropean: EUROPEAN_NATIONALITIES.has(nationality),
      winsOver10: WINS_OVER_TEN_DRIVERS.has(id),
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
  'bourdais','salo','diniz','scheckter','regazzoni',
  'reutemann','lauda','watson','laffite','pironi','rosberg_k',
  'arnoux','fittipaldi','blundell','zanardi','albon',
  'tsunoda','zhou','kvyat','sato_t',
  'alboreto','de_cesaris','jos_verstappen',
]);

// Known drivers who raced in 2000-2009 (Jolpica IDs)
const KNOWN_2000s_DRIVERS = new Set([
  'hamilton','schumacher','vettel','alonso','raikkonen','button','rosberg',
  'hakkinen','coulthard','webber','barrichello','massa','montoya','ricciardo',
  'fisichella','trulli','frentzen','villeneuve','irvine','herbert','panis',
  'heidfeld','kovalainen','sutil','de_la_rosa','ralf_schumacher','alesi',
  'piquet_jr','kubica','grosjean','badoer','salo','jos_verstappen','sato_t',
  'vergne','liuzzi','speed','glock','nakajima_k','bourdais','davidson',
]);

// Known drivers who raced in 2010-2019 (Jolpica IDs)
const KNOWN_2010s_DRIVERS = new Set([
  'hamilton','schumacher','vettel','alonso','raikkonen','max_verstappen',
  'webber','barrichello','massa','ricciardo','hulkenberg','perez','bottas',
  'leclerc','sainz','norris','russell','ocon','gasly','albon','stroll',
  'giovinazzi','magnussen','grosjean','maldonado','kubica','trulli','heidfeld',
  'kovalainen','sutil','de_la_rosa','button','rosberg','kvyat','gutierrez_e',
  'vergne','bianchi','chilton','ericsson','nasr','vandoorne','hartley',
  'sirotkin','wehrlein','palmer','jolyon_palmer','pic','resta','gutierrez',
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
// Per-resource fetchers
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
      racedIn2000s: KNOWN_2000s_DRIVERS.has(d.driverId),
      racedIn2010s: KNOWN_2010s_DRIVERS.has(d.driverId),
      gpsOver100: KNOWN_CENTENARIANS.has(d.driverId),
      isLatinAmerican: LATIN_AMERICAN_NATIONALITIES.has(d.nationality),
      isEuropean: EUROPEAN_NATIONALITIES.has(d.nationality),
      winsOver10: WINS_OVER_TEN_DRIVERS.has(d.driverId),
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
  const merged = new Map<string, DriverProfile>(FALLBACK_DRIVER_MAP);

  for (const [id, driver] of apiDrivers) {
    const apiConstructors = constructorMap.get(id) ?? [];
    const fallbackConstructors = FALLBACK_DRIVER_MAP.get(id)?.constructors ?? [];
    const constructors = apiConstructors.length > 0 ? apiConstructors
      : fallbackConstructors.length > 0 ? fallbackConstructors
      : driver.constructors;
    const fallback = FALLBACK_DRIVER_MAP.get(id);
    merged.set(id, {
      ...driver,
      constructors,
      isChampion: champions.has(id),
      isRaceWinner: raceWinners.has(id),
      racedIn90s: nineties.has(id),
      racedIn2000s: KNOWN_2000s_DRIVERS.has(id) || (fallback?.racedIn2000s ?? false),
      racedIn2010s: KNOWN_2010s_DRIVERS.has(id) || (fallback?.racedIn2010s ?? false),
      gpsOver100: KNOWN_CENTENARIANS.has(id),
      isLatinAmerican: LATIN_AMERICAN_NATIONALITIES.has(driver.nationality),
      isEuropean: EUROPEAN_NATIONALITIES.has(driver.nationality),
      winsOver10: WINS_OVER_TEN_DRIVERS.has(id),
    });
  }

  // Apply API constructor lists to fallback-only drivers
  for (const [id, driver] of merged) {
    if (!apiDrivers.has(id)) {
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
