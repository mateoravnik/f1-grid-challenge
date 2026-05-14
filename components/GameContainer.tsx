'use client';

import { useEffect, useState, useCallback } from 'react';
import GameBoard from './GameBoard';
import ResultScreen from './ResultScreen';
import type { DailyGrid } from '@/lib/gridGenerator';

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
}

export type CellState = {
  status: 'empty' | 'correct' | 'wrong';
  driverId?: string;
  shake?: boolean;
};

export interface GameState {
  cells: CellState[][];
  attemptsLeft: number;
  usedDriverIds: Set<string>;
  finished: boolean;
  dateKey: string;
}

const MAX_ATTEMPTS = 9;

function initCells(): CellState[][] {
  return Array.from({ length: 3 }, () =>
    Array.from({ length: 3 }, () => ({ status: 'empty' as const }))
  );
}

function loadGameState(dateKey: string): GameState | null {
  try {
    const raw = localStorage.getItem(`f1gc-${dateKey}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      ...parsed,
      usedDriverIds: new Set(parsed.usedDriverIds ?? []),
    };
  } catch { return null; }
}

function saveGameState(state: GameState) {
  try {
    const toSave = {
      ...state,
      usedDriverIds: Array.from(state.usedDriverIds),
    };
    localStorage.setItem(`f1gc-${state.dateKey}`, JSON.stringify(toSave));
  } catch { /* ignore */ }
}

function loadStreak(): number {
  try {
    const raw = localStorage.getItem('f1gc-streak');
    if (!raw) return 0;
    const { streak, lastDate } = JSON.parse(raw);
    const today = new Date();
    const todayKey = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}-${String(today.getUTCDate()).padStart(2, '0')}`;
    const yesterday = new Date(today);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const yKey = `${yesterday.getUTCFullYear()}-${String(yesterday.getUTCMonth() + 1).padStart(2, '0')}-${String(yesterday.getUTCDate()).padStart(2, '0')}`;
    if (lastDate === todayKey || lastDate === yKey) return streak;
    return 0;
  } catch { return 0; }
}

function saveStreak(streak: number, dateKey: string) {
  try {
    localStorage.setItem('f1gc-streak', JSON.stringify({ streak, lastDate: dateKey }));
  } catch { /* ignore */ }
}

export default function GameContainer() {
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [streak, setStreak] = useState(0);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    setStreak(loadStreak());
    fetch('/api/f1-data')
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setGameData(data as GameData);
        const dateKey = (data as GameData).grid.dateKey;
        const saved = loadGameState(dateKey);
        const initialState: GameState = saved ?? {
          cells: initCells(),
          attemptsLeft: MAX_ATTEMPTS,
          usedDriverIds: new Set(),
          finished: false,
          dateKey,
        };
        setGameState(initialState);
        if (saved?.finished) setShowResult(true);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleAnswer = useCallback((row: number, col: number, driverId: string) => {
    if (!gameData || !gameState) return;
    const cell = gameData.grid.cells[row][col];
    const isValid = cell.validDriverIds.includes(driverId);
    const alreadyUsed = gameState.usedDriverIds.has(driverId);
    const alreadyFilled = gameState.cells[row][col].status === 'correct';

    if (alreadyFilled) return;

    if (isValid && !alreadyUsed) {
      // Correct answer
      const newCells = gameState.cells.map((r, ri) =>
        r.map((c, ci) =>
          ri === row && ci === col
            ? { status: 'correct' as const, driverId }
            : c
        )
      );
      const newUsed = new Set(gameState.usedDriverIds);
      newUsed.add(driverId);
      const newAttempts = gameState.attemptsLeft - 1;
      const correctCount = newCells.flat().filter((c) => c.status === 'correct').length;
      const finished = correctCount === 9 || newAttempts === 0;

      const newState: GameState = {
        ...gameState,
        cells: newCells,
        attemptsLeft: newAttempts,
        usedDriverIds: newUsed,
        finished,
      };
      setGameState(newState);
      saveGameState(newState);

      if (finished) {
        const newStreak = correctCount === 9 ? streak + 1 : streak;
        setStreak(newStreak);
        saveStreak(newStreak, gameState.dateKey);
        setTimeout(() => setShowResult(true), 600);
      }
    } else {
      // Wrong answer — shake and decrement
      const newAttempts = gameState.attemptsLeft - 1;
      const shakeCells = gameState.cells.map((r, ri) =>
        r.map((c, ci) => ri === row && ci === col ? { ...c, shake: true } : c)
      );
      setGameState((prev) => prev ? { ...prev, cells: shakeCells, attemptsLeft: newAttempts } : prev);
      setTimeout(() => {
        setGameState((prev) => {
          if (!prev) return prev;
          const cleared = prev.cells.map((r) => r.map((c) => ({ ...c, shake: false })));
          const finished = newAttempts === 0;
          const next = { ...prev, cells: cleared, attemptsLeft: newAttempts, finished };
          saveGameState(next);
          if (finished) setTimeout(() => setShowResult(true), 300);
          return next;
        });
      }, 450);
    }
  }, [gameData, gameState, streak]);

  if (loading) {
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

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="text-4xl">⚠️</div>
        <div className="text-xl font-bold text-[#e10600]">Error al cargar datos</div>
        <div className="text-gray-400 max-w-sm">{error}</div>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 px-6 py-3 bg-[#e10600] text-white font-bold rounded-lg hover:bg-red-700 transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!gameData || !gameState) return null;

  return (
    <>
      {showResult ? (
        <ResultScreen
          gameState={gameState}
          grid={gameData.grid}
          driverLookup={gameData.driverLookup}
          streak={streak}
          onClose={() => setShowResult(false)}
        />
      ) : (
        <GameBoard
          gameData={gameData}
          gameState={gameState}
          streak={streak}
          onAnswer={handleAnswer}
          onShowResult={() => setShowResult(true)}
        />
      )}
    </>
  );
}
