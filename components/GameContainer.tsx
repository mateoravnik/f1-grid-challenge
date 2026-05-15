'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import ModeSelect from './ModeSelect';
import GameBoard from './GameBoard';
import { generateDailyGrid } from '@/lib/gridGenerator';
import type { DailyGrid, GridDifficulty } from '@/lib/gridGenerator';
import type { DriverProfile } from '@/lib/f1Data';

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------
export type Player = 'X' | 'O';
export type GameMode = 'friend' | 'ai';
export type AiDifficulty = 'easy' | 'medium' | 'hard';
export type { GridDifficulty };

export interface CellEntry {
  player: Player;
  driverId: string;
  revealed?: boolean;    // neutral reveal — counts for neither player
  noSolution?: boolean;  // no valid drivers left — turn passes, cell shown as blocked
}

export interface TicTacToeState {
  mode: GameMode;
  aiDifficulty: AiDifficulty;
  gridDifficulty: GridDifficulty;
  board: (CellEntry | null)[][];
  currentPlayer: Player;
  usedDriverIds: Set<string>;
  winner: Player | 'draw' | null;
  winLine: [number, number][] | null;
  aiThinking: boolean;
  shakeCell: [number, number] | null;
  wrongStreak: { cell: [number, number]; count: number } | null;
}

export interface DriverLookup {
  fullName: string;
  initials: string;
  nationality: string;
  nationalityCode: string;
}

export interface DriverListItem {
  id: string;
  fullName: string;
  givenName: string;
  familyName: string;
  nationality: string;
}

export interface GameData {
  grid: DailyGrid;
  driverLookup: Record<string, DriverLookup>;
  driverList: DriverListItem[];
  driverProfiles: DriverProfile[];
}

// ---------------------------------------------------------------------------
// Win detection — revealed cells are neutral, never count toward a win
// ---------------------------------------------------------------------------
const WIN_LINES: [number, number][][] = [
  [[0,0],[0,1],[0,2]], [[1,0],[1,1],[1,2]], [[2,0],[2,1],[2,2]],
  [[0,0],[1,0],[2,0]], [[0,1],[1,1],[2,1]], [[0,2],[1,2],[2,2]],
  [[0,0],[1,1],[2,2]], [[0,2],[1,1],[2,0]],
];

function checkWinner(board: (CellEntry | null)[][]): { winner: Player; line: [number, number][] } | null {
  for (const line of WIN_LINES) {
    const [a, b, c] = line as [[number,number],[number,number],[number,number]];
    const ca = board[a[0]][a[1]]; const cb = board[b[0]][b[1]]; const cc = board[c[0]][c[1]];
    const pa = ca?.revealed ? undefined : ca?.player;
    const pb = cb?.revealed ? undefined : cb?.player;
    const pc = cc?.revealed ? undefined : cc?.player;
    if (pa && pa === pb && pa === pc) return { winner: pa, line: [a, b, c] };
  }
  return null;
}

function boardFull(board: (CellEntry | null)[][]): boolean {
  return board.every(row => row.every(cell => cell !== null));
}

function emptyBoard(): (CellEntry | null)[][] {
  return Array.from({ length: 3 }, () => Array(3).fill(null));
}

// ---------------------------------------------------------------------------
// AI logic
// ---------------------------------------------------------------------------
interface AiMove { row: number; col: number; driverId: string }

function findAiMove(state: TicTacToeState, grid: DailyGrid): AiMove | null {
  type CandidateCell = { row: number; col: number; drivers: string[] };
  const candidates: CandidateCell[] = [];

  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (state.board[r][c]) continue;
      const valid = (grid.cells[r]?.[c]?.validDriverIds ?? []).filter(
        id => !state.usedDriverIds.has(id)
      );
      if (valid.length > 0) candidates.push({ row: r, col: c, drivers: valid });
    }
  }

  if (candidates.length === 0) return null;

  // Easy: first available cell, first available driver
  if (state.aiDifficulty === 'easy') {
    const cell = candidates[0];
    return { row: cell.row, col: cell.col, driverId: cell.drivers[0] };
  }

  const pickRandom = (cell: CandidateCell): AiMove => ({
    row: cell.row,
    col: cell.col,
    driverId: cell.drivers[Math.floor(Math.random() * cell.drivers.length)],
  });

  // Medium: random cell, random driver
  if (state.aiDifficulty === 'medium') {
    return pickRandom(candidates[Math.floor(Math.random() * candidates.length)]);
  }

  // ---------------------------------------------------------------------------
  // Hard: proper minimax-style strategy
  // ---------------------------------------------------------------------------
  const simBoard = (
    board: (CellEntry | null)[][],
    row: number, col: number,
    player: Player
  ): (CellEntry | null)[][] =>
    board.map((r, ri) => r.map((c, ci) =>
      ri === row && ci === col ? { player, driverId: '' } : c
    ));

  // 1. Win: can O complete a line this turn?
  const winning = candidates.find(({ row, col }) =>
    checkWinner(simBoard(state.board, row, col, 'O'))?.winner === 'O'
  );
  if (winning) return pickRandom(winning);

  // 2. Block: check ALL empty cells (not just candidate cells) for immediate X wins
  const xThreats: [number, number][] = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (state.board[r][c]) continue;
      if (checkWinner(simBoard(state.board, r, c, 'X'))?.winner === 'X')
        xThreats.push([r, c]);
    }
  }
  if (xThreats.length > 0) {
    const blocking = candidates.find(({ row, col }) =>
      xThreats.some(([tr, tc]) => tr === row && tc === col)
    );
    if (blocking) return pickRandom(blocking);
    // Can't block (no valid driver for threat cell) — fall through to best move
  }

  // 3. Score candidates: penalise moves that gift X an immediate win next turn;
  //    reward position (center > corners > edges) and building O's own threats
  const cellPositionScore = (r: number, c: number): number => {
    if (r === 1 && c === 1) return 10;                              // center
    if ((r === 0 || r === 2) && (c === 0 || c === 2)) return 6;    // corners
    return 3;                                                        // edges
  };

  const scored = candidates.map(cell => {
    let score = cellPositionScore(cell.row, cell.col);

    // After O plays here, does any empty cell immediately give X the win?
    const afterO = simBoard(state.board, cell.row, cell.col, 'O');
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (afterO[r][c]) continue;
        const xCanPlay = (grid.cells[r]?.[c]?.validDriverIds ?? [])
          .some(id => !state.usedDriverIds.has(id));
        if (xCanPlay && checkWinner(simBoard(afterO, r, c, 'X'))?.winner === 'X') {
          score -= 20;
          break;
        }
      }
    }

    // Build O's threats (lines with O pieces and no X pieces)
    for (const line of WIN_LINES) {
      const inLine = line.some(([r, c]) => r === cell.row && c === cell.col);
      if (!inLine) continue;
      const oCount = line.filter(([r, c]) =>
        !state.board[r][c]?.revealed && state.board[r][c]?.player === 'O'
      ).length;
      const xBlocks = line.some(([r, c]) =>
        !state.board[r][c]?.revealed && state.board[r][c]?.player === 'X'
      );
      if (!xBlocks && oCount > 0) score += oCount * 2;
    }

    return { cell, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return pickRandom(scored[0].cell);
}

// ---------------------------------------------------------------------------
// Apply a confirmed correct move
// ---------------------------------------------------------------------------
function applyMove(state: TicTacToeState, row: number, col: number, driverId: string): TicTacToeState {
  const newBoard = state.board.map((r, ri) =>
    r.map((c, ci) =>
      ri === row && ci === col ? { player: state.currentPlayer, driverId } : c
    )
  );
  const newUsed = new Set(state.usedDriverIds);
  newUsed.add(driverId);
  const winResult = checkWinner(newBoard as (CellEntry | null)[][]);
  const full = boardFull(newBoard as (CellEntry | null)[][]);

  return {
    ...state,
    board: newBoard as (CellEntry | null)[][],
    usedDriverIds: newUsed,
    currentPlayer: state.currentPlayer === 'X' ? 'O' : 'X',
    winner: winResult ? winResult.winner : full ? 'draw' : null,
    winLine: winResult ? winResult.line : null,
    aiThinking: false,
    shakeCell: null,
    wrongStreak: null,
  };
}

// ---------------------------------------------------------------------------
// Apply a no-solution mark (no valid drivers left — neutral, turn passes)
// ---------------------------------------------------------------------------
function applyNoSolution(state: TicTacToeState, row: number, col: number): TicTacToeState {
  const newBoard = state.board.map((r, ri) =>
    r.map((c, ci) =>
      ri === row && ci === col
        ? { player: state.currentPlayer, driverId: '', revealed: true, noSolution: true }
        : c
    )
  );
  const winResult = checkWinner(newBoard as (CellEntry | null)[][]);
  const full = boardFull(newBoard as (CellEntry | null)[][]);
  return {
    ...state,
    board: newBoard as (CellEntry | null)[][],
    currentPlayer: state.currentPlayer === 'X' ? 'O' : 'X',
    winner: winResult ? winResult.winner : full ? 'draw' : null,
    winLine: winResult ? winResult.line : null,
    aiThinking: false,
    shakeCell: null,
    wrongStreak: null,
  };
}

// ---------------------------------------------------------------------------
// Apply a reveal (neutral — neither player scores the cell)
// ---------------------------------------------------------------------------
function applyReveal(state: TicTacToeState, row: number, col: number, driverId: string): TicTacToeState {
  const newBoard = state.board.map((r, ri) =>
    r.map((c, ci) =>
      ri === row && ci === col
        ? { player: state.currentPlayer, driverId, revealed: true }
        : c
    )
  );
  const newUsed = new Set(state.usedDriverIds);
  newUsed.add(driverId);
  const winResult = checkWinner(newBoard as (CellEntry | null)[][]);
  const full = boardFull(newBoard as (CellEntry | null)[][]);

  return {
    ...state,
    board: newBoard as (CellEntry | null)[][],
    usedDriverIds: newUsed,
    currentPlayer: state.currentPlayer === 'X' ? 'O' : 'X',
    winner: winResult ? winResult.winner : full ? 'draw' : null,
    winLine: winResult ? winResult.line : null,
    aiThinking: false,
    shakeCell: null,
    wrongStreak: null,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
type AppPhase = 'loading' | 'error' | 'mode-select' | 'playing';

interface GameContainerProps {
  onHome?: () => void;
}

export default function GameContainer({ onHome }: GameContainerProps = {}) {
  const [phase, setPhase] = useState<AppPhase>('loading');
  const [error, setError] = useState<string | null>(null);
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [tttState, setTttState] = useState<TicTacToeState | null>(null);
  const shakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gameDataRef = useRef<GameData | null>(null);
  const tttStateRef = useRef<TicTacToeState | null>(null);
  gameDataRef.current = gameData;
  tttStateRef.current = tttState;

  // Fetch grid data on mount
  useEffect(() => {
    fetch('/api/f1-data')
      .then(r => r.json())
      .then((data: unknown) => {
        const d = data as { error?: string } & GameData;
        if (d.error) throw new Error(d.error);
        setGameData(d);
        setPhase('mode-select');
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Error al cargar datos');
        setPhase('error');
      });

    return () => {
      if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    };
  }, []);

  // AI turn effect
  useEffect(() => {
    if (!tttState || !gameData) return;
    if (tttState.winner !== null) return;
    if (tttState.mode !== 'ai') return;
    if (tttState.currentPlayer !== 'O') return;
    if (tttState.aiThinking) return;

    const snap = tttState;
    const grid = gameData.grid;
    setTttState(prev => prev ? { ...prev, aiThinking: true } : prev);

    aiTimerRef.current = setTimeout(() => {
      try {
        const move = findAiMove(snap, grid);
        setTttState(prev => {
          if (!prev) return prev;
          if (prev.winner !== null) return { ...prev, aiThinking: false };
          if (!move) return { ...prev, aiThinking: false, currentPlayer: 'X' };
          return applyMove(prev, move.row, move.col, move.driverId);
        });
      } catch (err) {
        console.error('[F1] AI move error:', err);
        setTttState(prev => prev ? { ...prev, aiThinking: false, currentPlayer: 'X' } : prev);
      }
    }, 1200);

    return () => { if (aiTimerRef.current) clearTimeout(aiTimerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tttState?.currentPlayer, tttState?.winner, tttState?.mode]);

  const startGame = useCallback((
    mode: GameMode,
    aiDifficulty: AiDifficulty = 'medium',
    gridDifficulty: GridDifficulty = 'medium'
  ) => {
    if (!gameData) return;
    if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);

    const driversMap = new Map<string, DriverProfile>(
      gameData.driverProfiles.map(p => [p.id, p])
    );

    let newGrid = gameData.grid;
    try {
      newGrid = generateDailyGrid(driversMap, undefined, gridDifficulty);
    } catch (err) {
      console.warn('[F1] Grid generation failed, using previous grid:', err);
    }
    setGameData(prev => prev ? { ...prev, grid: newGrid } : prev);
    setTttState({
      mode, aiDifficulty, gridDifficulty,
      board: emptyBoard(),
      currentPlayer: 'X',
      usedDriverIds: new Set(),
      winner: null,
      winLine: null,
      aiThinking: false,
      shakeCell: null,
      wrongStreak: null,
    });
    setPhase('playing');
  }, [gameData]);

  const handleAnswer = useCallback((row: number, col: number, driverId: string) => {
    const gameData = gameDataRef.current;
    const tttState = tttStateRef.current;
    if (!gameData || !tttState) return;
    if (tttState.winner !== null) return;
    if (tttState.board[row]?.[col]) return;

    const cellValidIds = gameData.grid.cells[row]?.[col]?.validDriverIds ?? [];
    const isValid = cellValidIds.includes(driverId) && !tttState.usedDriverIds.has(driverId);

    if (isValid) {
      setTttState(prev => {
        if (!prev || prev.winner !== null || prev.board[row]?.[col]) return prev;
        return applyMove(prev, row, col, driverId);
      });
    } else {
      const prevStreak = tttState.wrongStreak;
      const sameCell = prevStreak?.cell[0] === row && prevStreak?.cell[1] === col;
      const newStreak = { cell: [row, col] as [number, number], count: sameCell ? prevStreak!.count + 1 : 1 };

      if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
      setTttState(prev => prev ? { ...prev, shakeCell: [row, col], wrongStreak: newStreak } : prev);
      shakeTimerRef.current = setTimeout(() => {
        setTttState(prev => {
          if (!prev) return prev;
          return { ...prev, shakeCell: null, currentPlayer: prev.currentPlayer === 'X' ? 'O' : 'X' };
        });
      }, 650);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReveal = useCallback((row: number, col: number) => {
    const gameData = gameDataRef.current;
    const tttState = tttStateRef.current;
    if (!gameData || !tttState) return;
    if (tttState.winner !== null) return;
    if (tttState.board[row]?.[col]) return;

    const validIds = gameData.grid.cells[row]?.[col]?.validDriverIds ?? [];
    const unusedValid = validIds.filter(id => !tttState.usedDriverIds.has(id));

    if (unusedValid.length === 0) {
      // No valid drivers left — mark cell as no-solution and pass the turn
      setTttState(prev => {
        if (!prev || prev.winner !== null || prev.board[row]?.[col]) return prev;
        return applyNoSolution(prev, row, col);
      });
      return;
    }

    const driverId = unusedValid[0];
    setTttState(prev => {
      if (!prev || prev.winner !== null || prev.board[row]?.[col]) return prev;
      return applyReveal(prev, row, col, driverId);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNewGame = useCallback(() => {
    if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    setTttState(null);
    setPhase('mode-select');
  }, []);

  // ---- Render ----
  if (phase === 'loading') return <LoadingScreen />;

  if (phase === 'error') return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="text-4xl">⚠️</div>
      <div className="text-xl font-bold text-[#e10600]">Error al cargar datos</div>
      <div className="text-gray-400 max-w-sm text-sm">{error}</div>
      <button
        onClick={() => window.location.reload()}
        className="mt-2 px-6 py-3 bg-[#e10600] text-white font-bold rounded-lg hover:bg-red-700 transition-colors"
      >
        Reintentar
      </button>
    </div>
  );

  if (phase === 'mode-select') return (
    <ModeSelect onSelect={(mode, aiDiff, gridDiff) => startGame(mode, aiDiff, gridDiff)} />
  );

  if (!gameData || !tttState) return null;

  return (
    <GameBoard
      gameData={gameData}
      tttState={tttState}
      onAnswer={handleAnswer}
      onReveal={handleReveal}
      onNewGame={handleNewGame}
      onHome={onHome ?? (() => {})}
    />
  );
}

function LoadingScreen() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6">
      <div className="text-4xl font-black tracking-tight">
        <span className="text-[#e10600]">F1</span> GRID CHALLENGE
      </div>
      <div className="flex items-center gap-3 text-gray-400">
        <div className="w-5 h-5 border-2 border-[#e10600] border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-semibold tracking-widest uppercase">Cargando datos F1...</span>
      </div>
    </div>
  );
}
