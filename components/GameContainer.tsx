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
}

export interface DriverLookup {
  fullName: string;
  initials: string;
  nationality: string;
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
// Win detection
// ---------------------------------------------------------------------------
const WIN_LINES: [number, number][][] = [
  [[0,0],[0,1],[0,2]],
  [[1,0],[1,1],[1,2]],
  [[2,0],[2,1],[2,2]],
  [[0,0],[1,0],[2,0]],
  [[0,1],[1,1],[2,1]],
  [[0,2],[1,2],[2,2]],
  [[0,0],[1,1],[2,2]],
  [[0,2],[1,1],[2,0]],
];

function checkWinner(board: (CellEntry | null)[][]): { winner: Player; line: [number, number][] } | null {
  for (const line of WIN_LINES) {
    const [a, b, c] = line as [[number,number],[number,number],[number,number]];
    const pa = board[a[0]][a[1]]?.player;
    const pb = board[b[0]][b[1]]?.player;
    const pc = board[c[0]][c[1]]?.player;
    if (pa && pa === pb && pa === pc) {
      return { winner: pa, line: [a, b, c] };
    }
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

  // Easy: first available cell, first available driver (deterministic, no strategy)
  if (state.aiDifficulty === 'easy') {
    const cell = candidates[0];
    return { row: cell.row, col: cell.col, driverId: cell.drivers[0] };
  }

  const pickRandom = (cell: CandidateCell): AiMove => ({
    row: cell.row,
    col: cell.col,
    driverId: cell.drivers[Math.floor(Math.random() * cell.drivers.length)],
  });

  // Medium: random cell, random driver (no strategy)
  if (state.aiDifficulty === 'medium') {
    return pickRandom(candidates[Math.floor(Math.random() * candidates.length)]);
  }

  // Hard: win if possible, then block, then pick cell that covers most X-threatening lines
  const simWins = (player: Player): CandidateCell | undefined =>
    candidates.find(({ row, col }) => {
      const sim = state.board.map(r => [...r]);
      sim[row][col] = { player, driverId: '' };
      return checkWinner(sim as (CellEntry | null)[][])?.winner === player;
    });

  const winning = simWins('O');
  if (winning) return pickRandom(winning);

  const blocking = simWins('X');
  if (blocking) return pickRandom(blocking);

  const scored = candidates.map(cell => {
    let threat = 0;
    for (const line of WIN_LINES) {
      const inLine = line.some(([r, c]) => r === cell.row && c === cell.col);
      if (!inLine) continue;
      const xCount = line.filter(([r, c]) => state.board[r][c]?.player === 'X').length;
      const emptyCount = line.filter(([r, c]) => !state.board[r][c]).length;
      if (xCount > 0 && xCount + emptyCount === 3) threat++;
    }
    return { cell, threat };
  });
  scored.sort((a, b) => b.threat - a.threat);
  const best = scored[0];
  if (best.threat > 0) return pickRandom(best.cell);

  const center = candidates.find(m => m.row === 1 && m.col === 1);
  if (center) return pickRandom(center);

  const corners = candidates.filter(m => (m.row === 0 || m.row === 2) && (m.col === 0 || m.col === 2));
  if (corners.length > 0) return pickRandom(corners[Math.floor(Math.random() * corners.length)]);

  return pickRandom(candidates[Math.floor(Math.random() * candidates.length)]);
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
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
type AppPhase = 'loading' | 'error' | 'mode-select' | 'playing';

export default function GameContainer() {
  const [phase, setPhase] = useState<AppPhase>('loading');
  const [error, setError] = useState<string | null>(null);
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [tttState, setTttState] = useState<TicTacToeState | null>(null);
  const shakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    // Snapshot for the closure
    const snap = tttState;
    const grid = gameData.grid;

    setTttState(prev => prev ? { ...prev, aiThinking: true } : prev);

    aiTimerRef.current = setTimeout(() => {
      const move = findAiMove(snap, grid);
      setTttState(prev => {
        if (!prev) return prev;
        if (!move) {
          // No valid cell for AI — pass turn back to player
          return { ...prev, aiThinking: false, currentPlayer: 'X' };
        }
        return applyMove(prev, move.row, move.col, move.driverId);
      });
    }, 1200);

    return () => {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    };
  // aiThinking intentionally omitted: including it would cancel the timeout it sets
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tttState?.currentPlayer, tttState?.winner, tttState?.mode]);

  const startGame = useCallback((
    mode: GameMode,
    aiDifficulty: AiDifficulty = 'medium',
    gridDifficulty: GridDifficulty = 'medium'
  ) => {
    if (!gameData) return;
    // Cancel any pending timers from previous game
    if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);

    const driversMap = new Map<string, DriverProfile>(
      gameData.driverProfiles.map(p => [p.id, p])
    );

    // Debug: log Alonso's profile to verify constructor + raceWinner data
    const alonso = gameData.driverProfiles.find(p => p.id === 'alonso');
    if (alonso) console.log('[F1] Alonso profile:', JSON.stringify(alonso));

    let newGrid = gameData.grid;
    try {
      newGrid = generateDailyGrid(driversMap, undefined, gridDifficulty);
    } catch (err) {
      console.warn('[F1] Grid generation failed, using previous grid:', err);
    }
    setGameData(prev => prev ? { ...prev, grid: newGrid } : prev);
    setTttState({
      mode,
      aiDifficulty,
      gridDifficulty,
      board: emptyBoard(),
      currentPlayer: 'X',
      usedDriverIds: new Set(),
      winner: null,
      winLine: null,
      aiThinking: false,
      shakeCell: null,
    });
    setPhase('playing');
  }, [gameData]);

  const handleAnswer = useCallback((row: number, col: number, driverId: string) => {
    if (!gameData || !tttState) return;
    if (tttState.winner !== null) return;
    if (tttState.board[row][col]) return;

    const cellValidIds = gameData.grid.cells[row]?.[col]?.validDriverIds ?? [];
    const isValid = cellValidIds.includes(driverId) && !tttState.usedDriverIds.has(driverId);

    if (isValid) {
      setTttState(prev => prev ? applyMove(prev, row, col, driverId) : prev);
    } else {
      // Wrong answer — shake cell, lose turn
      setTttState(prev => prev ? { ...prev, shakeCell: [row, col] } : prev);
      shakeTimerRef.current = setTimeout(() => {
        setTttState(prev => {
          if (!prev) return prev;
          return { ...prev, shakeCell: null, currentPlayer: prev.currentPlayer === 'X' ? 'O' : 'X' };
        });
      }, 650);
    }
  }, [gameData, tttState]);

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
      onNewGame={handleNewGame}
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
