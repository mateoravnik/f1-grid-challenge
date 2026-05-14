'use client';

import React, { useState } from 'react';
import type { GameData, GameState } from './GameContainer';
import InputModal from './InputModal';

interface Props {
  gameData: GameData;
  gameState: GameState;
  streak: number;
  onAnswer: (row: number, col: number, driverId: string) => void;
  onShowResult: () => void;
}

export default function GameBoard({ gameData, gameState, streak, onAnswer, onShowResult }: Props) {
  const [activeCell, setActiveCell] = useState<{ row: number; col: number } | null>(null);

  const { grid, driverLookup, driverList } = gameData;
  const { cells, attemptsLeft } = gameState;

  const correctCount = cells.flat().filter((c) => c.status === 'correct').length;

  const handleCellClick = (row: number, col: number) => {
    if (cells[row][col].status === 'correct') return;
    if (attemptsLeft === 0) return;
    setActiveCell({ row, col });
  };

  const handleAnswer = (driverId: string) => {
    if (!activeCell) return;
    setActiveCell(null);
    onAnswer(activeCell.row, activeCell.col, driverId);
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="border-b border-[#2a2a2a] px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl sm:text-3xl font-black tracking-tight leading-none">
              <span className="text-[#e10600]">F1</span>{' '}
              <span className="text-white">GRID</span>{' '}
              <span className="text-gray-400">CHALLENGE</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {streak > 0 && (
              <div className="flex items-center gap-1.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-full px-3 py-1.5">
                <span className="text-orange-400">🔥</span>
                <span className="text-sm font-bold text-white">{streak}</span>
                <span className="text-xs text-gray-500 hidden sm:block">racha</span>
              </div>
            )}
            <button
              onClick={onShowResult}
              className="text-xs text-gray-500 hover:text-white transition-colors font-semibold uppercase tracking-wider"
            >
              Resultado
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-2 py-4 sm:py-8">
        <div className="w-full max-w-2xl">

          {/* Attempts & score bar */}
          <div className="flex items-center justify-between mb-4 px-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Intentos:</span>
              <div className="flex gap-1">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full transition-colors ${
                      i < attemptsLeft
                        ? 'bg-[#e10600]'
                        : 'bg-[#2a2a2a]'
                    }`}
                  />
                ))}
              </div>
            </div>
            <div className="text-sm font-bold text-gray-300">
              <span className="text-white">{correctCount}</span>
              <span className="text-gray-600">/9</span>
            </div>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-[auto_1fr_1fr_1fr] gap-1.5 sm:gap-2">
            {/* Top-left corner (empty) */}
            <div className="rounded-lg bg-transparent" />

            {/* Column headers */}
            {grid.cols.map((col, ci) => (
              <div
                key={ci}
                className="flex items-center justify-center rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] px-2 py-2 sm:py-3 min-h-[52px]"
              >
                <span className="text-[10px] sm:text-xs font-bold text-center leading-tight text-gray-200 uppercase tracking-wide">
                  {col.shortLabel}
                </span>
              </div>
            ))}

            {/* Rows */}
            {grid.rows.map((row, ri) => (
              <React.Fragment key={`row-${ri}`}>
                {/* Row header */}
                <div className="flex items-center justify-center rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] px-2 py-2 min-h-[80px] sm:min-h-[100px] min-w-[52px] sm:min-w-[64px]">
                  <span className="text-[10px] sm:text-xs font-bold text-center leading-tight text-gray-200 uppercase tracking-wide [writing-mode:vertical-rl] rotate-180 sm:[writing-mode:horizontal-tb] sm:rotate-0">
                    {row.shortLabel}
                  </span>
                </div>

                {/* Cells */}
                {grid.cols.map((_, ci) => {
                  const cell = cells[ri][ci];
                  const driver = cell.driverId ? driverLookup[cell.driverId] : null;
                  const isCorrect = cell.status === 'correct';
                  const isShaking = cell.shake;

                  return (
                    <button
                      key={`cell-${ri}-${ci}`}
                      onClick={() => handleCellClick(ri, ci)}
                      disabled={isCorrect || attemptsLeft === 0}
                      className={[
                        'relative flex flex-col items-center justify-center rounded-lg border transition-all duration-200 min-h-[80px] sm:min-h-[100px] p-2',
                        isCorrect
                          ? 'bg-green-800 border-green-600 cursor-default'
                          : attemptsLeft === 0
                          ? 'bg-[#1a1a1a] border-[#2a2a2a] cursor-not-allowed opacity-50'
                          : 'bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#e10600] hover:bg-[#221010] cursor-pointer active:scale-95',
                        isShaking ? 'animate-shake border-red-600' : '',
                      ].join(' ')}
                    >
                      {isCorrect && driver ? (
                        <>
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-green-700 border-2 border-green-400 flex items-center justify-center mb-1.5 text-sm sm:text-base font-black text-white">
                            {driver.initials}
                          </div>
                          <span className="text-[10px] sm:text-xs font-bold text-green-200 text-center leading-tight line-clamp-2">
                            {driver.fullName}
                          </span>
                        </>
                      ) : (
                        <div className="text-2xl text-[#2a2a2a] font-black">
                          {attemptsLeft === 0 ? '✗' : '+'}
                        </div>
                      )}
                    </button>
                  );
                })}
              </React.Fragment>
            ))}
          </div>

          {/* Date */}
          <div className="text-center mt-4 text-xs text-gray-600 font-semibold uppercase tracking-wider">
            {grid.dateKey}
          </div>
        </div>
      </div>

      {/* Input Modal */}
      {activeCell && (
        <InputModal
          rowLabel={grid.rows[activeCell.row].label}
          colLabel={grid.cols[activeCell.col].label}
          driverList={driverList}
          usedDriverIds={gameState.usedDriverIds}
          onSubmit={handleAnswer}
          onClose={() => setActiveCell(null)}
        />
      )}
    </div>
  );
}
