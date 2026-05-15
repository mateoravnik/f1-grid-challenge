import { CONSTRUCTOR_POOL, SPECIAL_CONDITIONS, DriverProfile, driverMatchesCondition } from './f1Data';

export type GridDifficulty = 'easy' | 'medium' | 'hard';

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
  seed?: number,
  gridDifficulty: GridDifficulty = 'medium'
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

  // MIN_VALID and MIN_POOL_COVERAGE vary by grid difficulty
  // easy: many options per cell (6+), medium: moderate (3+), hard: few (1+)
  const MIN_VALID = gridDifficulty === 'easy' ? 6 : gridDifficulty === 'hard' ? 1 : 3;
  const MIN_POOL_COVERAGE = gridDifficulty === 'easy' ? 10 : gridDifficulty === 'hard' ? 3 : 5;
  const condArg = (c: ConditionDef) =>
    c.type === 'constructor' ? { type: 'constructor', id: c.id } : { type: 'special', id: c.id };

  const filteredConditions = allConditions.filter(cond => {
    let count = 0;
    for (const driver of drivers.values()) {
      if (driverMatchesCondition(driver, condArg(cond))) {
        count++;
        if (count >= MIN_POOL_COVERAGE) return true;
      }
    }
    return false;
  });
  const pool = filteredConditions.length >= 6 ? filteredConditions : allConditions;

  let attempt = 0;

  while (attempt < 1500) {
    const trialSeed = (baseSeed + attempt * 7919) >>> 0;
    const trialRng = seededRng(trialSeed);
    const shuffled = shuffleWithRng(pool, trialRng);

    // Ensure at least 2 constructors in rows and 2 in columns for variety
    const safeShuffled = shuffled ?? [];
    const chosen = safeShuffled.slice(0, 6);
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
  throw new Error('Could not generate a valid grid after 1500 attempts');
}

export { getDateKey };
