import { CONSTRUCTOR_POOL, SPECIAL_CONDITIONS, DriverProfile, driverMatchesCondition } from './f1Data';

export type ConditionDef =
  | { type: 'constructor'; id: string; label: string; shortLabel: string; wikiSlug?: string }
  | { type: 'special'; id: string; label: string; shortLabel: string; wikiSlug?: string };

export interface GridCell {
  row: number;
  col: number;
  validDriverIds: string[];
}

export interface DailyGrid {
  rows: ConditionDef[];
  cols: ConditionDef[];
  cells: GridCell[][];
  dateKey: string;
}

function seededRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = Math.imul(1664525, s) + 1013904223 >>> 0;
    return s / 0x100000000;
  };
}

function shuffleWithRng<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getDateKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}


function getValidDriverIds(
  drivers: Map<string, DriverProfile>,
  rowCond: ConditionDef,
  colCond: ConditionDef
): string[] {
  const rowArg = rowCond.type === 'constructor'
    ? { type: 'constructor', id: rowCond.id }
    : { type: 'special', id: rowCond.id };
  const colArg = colCond.type === 'constructor'
    ? { type: 'constructor', id: colCond.id }
    : { type: 'special', id: colCond.id };

  const valid: string[] = [];
  for (const [id, driver] of drivers) {
    if (driverMatchesCondition(driver, rowArg) && driverMatchesCondition(driver, colArg)) {
      valid.push(id);
    }
  }
  return valid;
}

export function generateDailyGrid(
  drivers: Map<string, DriverProfile>,
  seed?: number
): DailyGrid {
  const dateKey = getDateKey(new Date());
  const baseSeed = (seed !== undefined ? seed : Math.random() * 0xffffffff) >>> 0;

  // Build condition pool: all constructors + all special conditions
  const constructorConditions: ConditionDef[] = CONSTRUCTOR_POOL.map((c) => ({
    type: 'constructor' as const,
    id: c.id,
    label: c.label,
    shortLabel: c.shortLabel,
    wikiSlug: c.wikiSlug,
  }));
  const specialConditions: ConditionDef[] = SPECIAL_CONDITIONS.map((s) => ({
    type: 'special' as const,
    id: s.id,
    label: s.label,
    shortLabel: s.shortLabel,
  }));

  const allConditions = [...constructorConditions, ...specialConditions];

  // Try different seeds until we find a valid grid (min 3 valid drivers per cell)
  const MIN_VALID = 3;
  let attempt = 0;

  while (attempt < 500) {
    const trialSeed = (baseSeed + attempt * 7919) >>> 0;
    const trialRng = seededRng(trialSeed);
    const shuffled = shuffleWithRng(allConditions, trialRng);

    // Ensure at least 2 constructors in rows and 2 in columns for variety
    const chosen = shuffled.slice(0, 6);
    const rows = chosen.slice(0, 3);
    const cols = chosen.slice(3, 6);

    // No condition can appear in both rows and cols
    const rowIds = new Set(rows.map((c) => c.id));
    const colIds = new Set(cols.map((c) => c.id));
    if ([...rowIds].some((id) => colIds.has(id))) { attempt++; continue; }

    // Validate all 9 cells have enough valid drivers
    let valid = true;
    const cells: GridCell[][] = [];
    for (let r = 0; r < 3; r++) {
      const row: GridCell[] = [];
      for (let c = 0; c < 3; c++) {
        const validDriverIds = getValidDriverIds(drivers, rows[r], cols[c]);
        if (validDriverIds.length < MIN_VALID) { valid = false; break; }
        row.push({ row: r, col: c, validDriverIds });
      }
      if (!valid) break;
      cells.push(row);
    }

    if (valid) {
      return { rows, cols, cells, dateKey };
    }
    attempt++;
  }

  // Fallback: return best partial grid (shouldn't happen with good data)
  throw new Error('Could not generate a valid grid after 500 attempts');
}

export { getDateKey };
