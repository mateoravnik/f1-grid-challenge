'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { GameData, TicTacToeState, Player } from './GameContainer';
import InputModal from './InputModal';

interface Props {
  gameData: GameData;
  tttState: TicTacToeState;
  onAnswer: (row: number, col: number, driverId: string) => void;
  onNewGame: () => void;
}

const PLAYER_COLORS: Record<Player, { bg: string; border: string; text: string; ring: string; label: string }> = {
  X: {
    bg: 'bg-red-900/70',
    border: 'border-red-600',
    text: 'text-[#e10600]',
    ring: 'ring-2 ring-[#e10600]',
    label: 'Jugador X',
  },
  O: {
    bg: 'bg-blue-900/70',
    border: 'border-blue-500',
    text: 'text-blue-400',
    ring: 'ring-2 ring-blue-500',
    label: 'Jugador O',
  },
};

export default function GameBoard({ gameData, tttState, onAnswer, onNewGame }: Props) {
  const [activeCell, setActiveCell] = useState<[number, number] | null>(null);
  const [driverPhotos, setDriverPhotos] = useState<Record<string, string | null>>({});
  const fetchedIds = useRef<Set<string>>(new Set());
  const { grid, driverLookup, driverList } = gameData;
  const { board, currentPlayer, winner, winLine, aiThinking, shakeCell, mode } = tttState;

  // Fetch Wikipedia photos for drivers as they fill cells
  useEffect(() => {
    for (const row of board) {
      for (const cell of row) {
        if (!cell) continue;
        const { driverId } = cell;
        if (fetchedIds.current.has(driverId)) continue;
        fetchedIds.current.add(driverId);
        const info = driverLookup[driverId];
        if (!info) continue;
        const slug = info.fullName.trim().replace(/\s+/g, '_');
        fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(slug)}`)
          .then(r => r.ok ? r.json() : null)
          .then((data: { thumbnail?: { source?: string } } | null) => {
            setDriverPhotos(prev => ({ ...prev, [driverId]: data?.thumbnail?.source ?? null }));
          })
          .catch(() => {
            setDriverPhotos(prev => ({ ...prev, [driverId]: null }));
          });
      }
    }
  }, [board, driverLookup]);

  const isAiTurn = mode === 'ai' && currentPlayer === 'O';
  const gameOver = winner !== null;
  const colors = PLAYER_COLORS[currentPlayer];

  const winSet = new Set((winLine ?? []).map(([r, c]) => `${r},${c}`));

  const handleCellClick = (row: number, col: number) => {
    if (gameOver || isAiTurn || aiThinking) return;
    if (board[row][col]) return;
    setActiveCell([row, col]);
  };

  const handleSubmit = (driverId: string) => {
    if (!activeCell) return;
    const [row, col] = activeCell;
    setActiveCell(null);
    onAnswer(row, col, driverId);
  };

  return (
    <div className="flex flex-col min-h-screen relative">
      {/* Header */}
      <header className="border-b border-[#2a2a2a] px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="text-xl sm:text-2xl font-black tracking-tight">
            <span className="text-[#e10600]">F1</span>{' '}
            <span className="text-white">GRID</span>{' '}
            <span className="text-gray-500 text-lg">CHALLENGE</span>
          </div>
          <button
            onClick={onNewGame}
            className="text-xs text-gray-500 hover:text-white transition-colors font-semibold uppercase tracking-wider px-3 py-1.5 rounded-lg border border-[#2a2a2a] hover:border-[#444]"
          >
            Nueva partida
          </button>
        </div>
      </header>

      {/* Turn indicator */}
      <div className="border-b border-[#2a2a2a]">
        <div className="max-w-2xl mx-auto px-4 py-2.5 flex items-center justify-between">
          {gameOver ? (
            <div className="flex items-center gap-2">
              {winner === 'draw' ? (
                <span className="text-sm font-bold text-yellow-400">🤝 ¡Empate!</span>
              ) : (
                <span className={`text-sm font-bold ${PLAYER_COLORS[winner].text}`}>
                  🏆 {mode === 'ai' && winner === 'O' ? '¡La IA ganó!' : mode === 'ai' && winner === 'X' ? '¡Ganaste!' : `¡${PLAYER_COLORS[winner].label} ganó!`}
                </span>
              )}
            </div>
          ) : isAiTurn || aiThinking ? (
            <div className="flex items-center gap-2 text-blue-400">
              <div className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-bold">🤖 IA pensando...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${colors.bg} ${colors.text} border ${colors.border}`}>
                {currentPlayer}
              </div>
              <span className={`text-sm font-bold ${colors.text}`}>
                {mode === 'ai' ? 'Tu turno' : `Turno de ${colors.label}`}
              </span>
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center gap-3">
            {(['X', 'O'] as Player[]).map(p => (
              <div key={p} className="flex items-center gap-1">
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center text-[9px] font-black ${PLAYER_COLORS[p].bg} ${PLAYER_COLORS[p].text} ${PLAYER_COLORS[p].border}`}>
                  {p}
                </div>
                <span className="text-[10px] text-gray-500">
                  {mode === 'ai' ? (p === 'X' ? 'Vos' : 'IA') : PLAYER_COLORS[p].label.replace('Jugador ', 'J')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 flex items-center justify-center px-2 py-4 sm:py-8">
        <div className="w-full max-w-2xl">
          <div className="grid grid-cols-[auto_1fr_1fr_1fr] gap-1.5 sm:gap-2">
            {/* Top-left corner */}
            <div />

            {/* Column headers */}
            {grid.cols.map((col, ci) => (
              <div
                key={ci}
                className="flex items-center justify-center rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] px-1 py-2 sm:py-3 min-h-[48px]"
              >
                <span className="text-[10px] sm:text-xs font-bold text-center leading-tight text-gray-300 uppercase tracking-wide">
                  {col.shortLabel}
                </span>
              </div>
            ))}

            {/* Rows */}
            {grid.rows.map((row, ri) => (
              <React.Fragment key={`row-${ri}`}>
                {/* Row header */}
                <div className="flex items-center justify-center rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] px-1 py-2 min-h-[90px] sm:min-h-[110px] min-w-[48px] sm:min-w-[60px]">
                  <span className="text-[10px] sm:text-xs font-bold text-center leading-tight text-gray-300 uppercase tracking-wide [writing-mode:vertical-rl] rotate-180 sm:[writing-mode:horizontal-tb] sm:rotate-0">
                    {row.shortLabel}
                  </span>
                </div>

                {/* Cells */}
                {grid.cols.map((_, ci) => {
                  const entry = board[ri][ci];
                  const isWinCell = winSet.has(`${ri},${ci}`);
                  const isShaking = shakeCell?.[0] === ri && shakeCell?.[1] === ci;
                  const p = entry?.player;
                  const driverInfo = entry?.driverId ? driverLookup[entry.driverId] : null;
                  const blocked = gameOver || (isAiTurn && !entry);

                  return (
                    <button
                      key={`${ri}-${ci}`}
                      onClick={() => handleCellClick(ri, ci)}
                      disabled={!!entry || blocked}
                      className={[
                        'relative flex flex-col items-center justify-center rounded-xl border-2 transition-all duration-200 min-h-[90px] sm:min-h-[110px] p-2 select-none',
                        isWinCell
                          ? `${p ? PLAYER_COLORS[p].bg : ''} ${p ? PLAYER_COLORS[p].border : ''} scale-105 shadow-lg`
                          : entry
                          ? `${p ? PLAYER_COLORS[p].bg : 'bg-[#1a1a1a]'} ${p ? PLAYER_COLORS[p].border : 'border-[#2a2a2a]'}`
                          : isShaking
                          ? 'bg-red-950 border-red-700 animate-shake'
                          : blocked
                          ? 'bg-[#111] border-[#222] opacity-60 cursor-not-allowed'
                          : `bg-[#1a1a1a] border-[#2a2a2a] hover:border-${currentPlayer === 'X' ? '[#e10600]' : 'blue-500'} hover:bg-[#1f1f1f] cursor-pointer active:scale-95`,
                      ].join(' ')}
                    >
                      {entry && driverInfo ? (
                        <>
                          {/* Player symbol */}
                          <div className={`text-xl sm:text-2xl font-black mb-1 ${p ? PLAYER_COLORS[p].text : ''}`}>
                            {p}
                          </div>
                          {/* Photo or initials circle */}
                          {driverPhotos[entry.driverId] ? (
                            <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full border-2 overflow-hidden flex-shrink-0 ${p ? PLAYER_COLORS[p].border : ''}`}>
                              <img
                                src={driverPhotos[entry.driverId]!}
                                alt={driverInfo.fullName}
                                className="w-full h-full object-cover object-top"
                              />
                            </div>
                          ) : (
                            <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full border-2 flex items-center justify-center text-xs sm:text-sm font-black text-white ${p ? PLAYER_COLORS[p].bg : ''} ${p ? PLAYER_COLORS[p].border : ''}`}>
                              {driverInfo.initials}
                            </div>
                          )}
                          {/* Driver name */}
                          <div className={`mt-1 text-[9px] sm:text-[10px] font-bold text-center leading-tight line-clamp-2 ${p ? PLAYER_COLORS[p].text : 'text-gray-300'}`}>
                            {driverInfo.fullName.split(' ').pop()}
                          </div>
                        </>
                      ) : isShaking ? (
                        <div className="text-red-500 text-2xl font-black">✗</div>
                      ) : (
                        <div className="text-[#333] text-2xl font-black">
                          {isAiTurn ? '…' : '+'}
                        </div>
                      )}
                    </button>
                  );
                })}
              </React.Fragment>
            ))}
          </div>

          <div className="text-center mt-3 text-xs text-gray-700 font-semibold uppercase tracking-wider">
            {grid.dateKey} · {mode === 'ai' ? 'vs IA' : 'vs Amigo'}
          </div>
        </div>
      </div>

      {/* Result overlay */}
      {gameOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-40 animate-fadeIn">
          <div className="bg-[#111] border border-[#2a2a2a] rounded-2xl p-8 mx-4 text-center max-w-sm w-full shadow-2xl animate-popIn">
            <div className="text-5xl mb-3">
              {winner === 'draw' ? '🤝' : winner === 'X' ? '🏆' : mode === 'ai' ? '🤖' : '🏆'}
            </div>
            <div className="text-2xl font-black mb-1">
              {winner === 'draw'
                ? '¡Empate!'
                : mode === 'ai' && winner === 'X'
                ? '¡Ganaste!'
                : mode === 'ai' && winner === 'O'
                ? '¡La IA ganó!'
                : `¡${PLAYER_COLORS[winner].label} ganó!`}
            </div>
            {winner !== 'draw' && (
              <div className={`text-sm font-semibold mb-4 ${PLAYER_COLORS[winner].text}`}>
                {winner} hizo 3 en línea
              </div>
            )}
            {winner === 'draw' && (
              <div className="text-sm text-gray-400 mb-4">
                La grilla quedó completa sin ganador
              </div>
            )}
            <button
              onClick={onNewGame}
              className="w-full py-3 bg-[#e10600] hover:bg-red-700 text-white font-black rounded-xl transition-colors text-sm tracking-wide uppercase"
            >
              Nueva partida
            </button>
          </div>
        </div>
      )}

      {/* Input modal */}
      {activeCell && !gameOver && (
        <InputModal
          rowLabel={grid.rows[activeCell[0]].label}
          colLabel={grid.cols[activeCell[1]].label}
          driverList={driverList}
          usedDriverIds={tttState.usedDriverIds}
          currentPlayer={currentPlayer}
          onSubmit={handleSubmit}
          onClose={() => setActiveCell(null)}
        />
      )}
    </div>
  );
}
