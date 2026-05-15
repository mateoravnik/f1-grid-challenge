'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { GameData, TicTacToeState, Player } from './GameContainer';
import InputModal from './InputModal';

interface Props {
  gameData: GameData;
  tttState: TicTacToeState;
  onAnswer: (row: number, col: number, driverId: string) => void;
  onReveal: (row: number, col: number) => void;
  onNewGame: () => void;
  onHome: () => void;
}

// Direct Wikimedia Commons URLs for team logos (stable SVG→PNG renders)
const TEAM_LOGOS: Record<string, string> = {
  ferrari:      'https://upload.wikimedia.org/wikipedia/en/thumb/d/d6/Scuderia_Ferrari_Logo.svg/200px-Scuderia_Ferrari_Logo.svg.png',
  mercedes:     'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/Mercedes_AMG_Petronas_F1_Logo.svg/200px-Mercedes_AMG_Petronas_F1_Logo.svg.png',
  red_bull:     'https://upload.wikimedia.org/wikipedia/en/thumb/8/8a/Red_Bull_Racing_logo.svg/200px-Red_Bull_Racing_logo.svg.png',
  mclaren:      'https://upload.wikimedia.org/wikipedia/en/thumb/6/66/McLaren_Racing_logo.svg/200px-McLaren_Racing_logo.svg.png',
  williams:     'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Williams_Racing_logo.svg/200px-Williams_Racing_logo.svg.png',
  alpine:       'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Alpine_F1_Team_Logo.svg/200px-Alpine_F1_Team_Logo.svg.png',
  aston_martin: 'https://upload.wikimedia.org/wikipedia/en/thumb/b/b4/Aston_Martin_Cognizant_Formula_One_Team_logo.svg/200px-Aston_Martin_Cognizant_Formula_One_Team_logo.svg.png',
};

// Fallback color badges for teams without logos
const TEAM_BADGE: Record<string, { bg: string; color: string }> = {
  ferrari:       { bg: '#DC0000', color: '#fff' },
  mclaren:       { bg: '#FF8000', color: '#fff' },
  red_bull:      { bg: '#3671C6', color: '#fff' },
  mercedes:      { bg: '#00D2BE', color: '#000' },
  williams:      { bg: '#005AFF', color: '#fff' },
  renault:       { bg: '#FFF500', color: '#000' },
  lotus_f1:      { bg: '#FFB800', color: '#000' },
  alpine:        { bg: '#FF87BC', color: '#fff' },
  brabham:       { bg: '#1A3C8F', color: '#fff' },
  tyrrell:       { bg: '#002B5E', color: '#fff' },
  benetton:      { bg: '#00A651', color: '#fff' },
  jordan:        { bg: '#F5A800', color: '#000' },
  bar:           { bg: '#C8102E', color: '#fff' },
  bmw_sauber:    { bg: '#0066B2', color: '#fff' },
  force_india:   { bg: '#FF80C7', color: '#000' },
  toro_rosso:    { bg: '#C81326', color: '#fff' },
  haas:          { bg: '#B6BABD', color: '#000' },
  alphatauri:    { bg: '#2B4562', color: '#fff' },
  aston_martin:  { bg: '#358C75', color: '#fff' },
  alfa_romeo:    { bg: '#B12335', color: '#fff' },
};

const WIKIPEDIA_SLUG_OVERRIDES: Record<string, string> = {
  'alonso':  'Fernando_Alonso_(racing_driver)',
  'sainz':   'Carlos_Sainz_Jr.',
  'russell': 'George_Russell_(racing_driver)',
  'webber':  'Mark_Webber_(racing_driver)',
  'watson':  'John_Watson_(racing_driver)',
};

const PLAYER_COLORS: Record<Player, { bg: string; border: string; text: string; label: string }> = {
  X: { bg: 'bg-red-900/70', border: 'border-red-600', text: 'text-[#e10600]', label: 'Jugador X' },
  O: { bg: 'bg-blue-900/70', border: 'border-blue-500', text: 'text-blue-400', label: 'Jugador O' },
};

function TeamHeader({ id, label, shortLabel, vertical = false }: { id: string; label: string; shortLabel: string; vertical?: boolean }) {
  const [logoError, setLogoError] = useState(false);
  const logoUrl = TEAM_LOGOS[id];
  const badge = TEAM_BADGE[id] ?? { bg: '#2a2a2a', color: '#9ca3af' };
  const showLogo = !!logoUrl && !logoError;

  return (
    <>
      {showLogo ? (
        <div className="bg-white rounded-md flex items-center justify-center flex-shrink-0" style={{ width: 48, height: 48, padding: 4 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl}
            alt={label}
            style={{ maxWidth: 40, maxHeight: 40, objectFit: 'contain' }}
            onError={() => setLogoError(true)}
          />
        </div>
      ) : (
        <div
          className="rounded-md flex items-center justify-center text-[10px] font-black text-center px-1 flex-shrink-0"
          style={{ width: 48, height: 48, backgroundColor: badge.bg, color: badge.color }}
        >
          {shortLabel ?? ''}
        </div>
      )}
      <span className={`text-[10px] sm:text-[11px] font-bold text-center leading-tight text-gray-300 uppercase tracking-wide${vertical ? ' [writing-mode:vertical-rl] rotate-180 sm:[writing-mode:horizontal-tb] sm:rotate-0' : ''}`}>
        {label}
      </span>
    </>
  );
}

export default function GameBoard({ gameData, tttState, onAnswer, onReveal, onNewGame, onHome }: Props) {
  const [activeCell, setActiveCell] = useState<[number, number] | null>(null);
  const [driverPhotos, setDriverPhotos] = useState<Record<string, string | null>>({});
  const fetchedIds = useRef<Set<string>>(new Set());
  const { grid, driverLookup, driverList } = gameData;
  const { board, currentPlayer, winner, winLine, aiThinking, shakeCell, mode, wrongStreak } = tttState;

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
        const slug = WIKIPEDIA_SLUG_OVERRIDES[driverId] ?? info.fullName.trim().replace(/\s+/g, '_');
        fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(slug)}`)
          .then(r => r.ok ? r.json() : null)
          .then((data: { thumbnail?: { source?: string } } | null) => {
            setDriverPhotos(prev => ({ ...prev, [driverId]: data?.thumbnail?.source ?? null }));
          })
          .catch(() => setDriverPhotos(prev => ({ ...prev, [driverId]: null })));
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

  const handleRevealModal = () => {
    if (!activeCell) return;
    const [row, col] = activeCell;
    setActiveCell(null);
    onReveal(row, col);
  };

  // Show reveal hint if the active cell has 4+ consecutive wrong answers
  const showRevealHint = !!(
    activeCell &&
    wrongStreak &&
    wrongStreak.count >= 4 &&
    wrongStreak.cell[0] === activeCell[0] &&
    wrongStreak.cell[1] === activeCell[1]
  );

  return (
    <div className="flex flex-col min-h-screen relative">
      {/* Header */}
      <header className="border-b border-[#2a2a2a] px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button
            onClick={onHome}
            className="text-xs text-gray-500 hover:text-white transition-colors font-semibold uppercase tracking-widest flex items-center gap-1"
          >
            ← Inicio
          </button>
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
            <div />

            {/* Column headers */}
            {grid.cols.map((col, ci) => (
              <div key={ci} className="flex flex-col items-center justify-center rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] px-1 py-2 sm:py-3 min-h-[72px] gap-1.5">
                <TeamHeader id={col.id} label={col.label} shortLabel={col.shortLabel ?? ''} />
              </div>
            ))}

            {/* Rows */}
            {grid.rows.map((row, ri) => (
              <React.Fragment key={`row-${ri}`}>
                {/* Row header */}
                <div className="flex flex-col items-center justify-center gap-1.5 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] px-1 py-2 min-h-[90px] sm:min-h-[110px] min-w-[60px] sm:min-w-[72px]">
                  <TeamHeader id={row.id} label={row.label} shortLabel={row.shortLabel ?? ''} vertical />
                </div>

                {/* Cells */}
                {grid.cols.map((_, ci) => {
                  const entry = board[ri]?.[ci] ?? null;
                  const isWinCell = winSet.has(`${ri},${ci}`);
                  const isShaking = shakeCell?.[0] === ri && shakeCell?.[1] === ci;
                  const p = entry?.player;
                  const isRevealed = (entry?.revealed ?? false) && !entry?.noSolution;
                  const isNoSolution = entry?.noSolution ?? false;
                  const driverInfo = entry?.driverId ? driverLookup[entry.driverId] : null;
                  const blocked = gameOver || (isAiTurn && !entry);

                  // Cell background/border classes
                  let cellClass = 'relative flex flex-col items-center justify-center rounded-xl border-2 transition-all duration-200 min-h-[90px] sm:min-h-[110px] p-2 select-none ';
                  if (isNoSolution) {
                    cellClass += 'bg-[#1a1a1a] border-[#2a2a2a]';
                  } else if (isRevealed) {
                    cellClass += 'bg-[#1e1e1e] border-[#3a3a3a]';
                  } else if (isWinCell) {
                    cellClass += `${p ? PLAYER_COLORS[p].bg : ''} ${p ? PLAYER_COLORS[p].border : ''} scale-105 shadow-lg`;
                  } else if (entry) {
                    cellClass += `${p ? PLAYER_COLORS[p].bg : 'bg-[#1a1a1a]'} ${p ? PLAYER_COLORS[p].border : 'border-[#2a2a2a]'}`;
                  } else if (isShaking) {
                    cellClass += 'bg-red-950 border-red-700 animate-shake';
                  } else if (blocked) {
                    cellClass += 'bg-[#111] border-[#222] opacity-60 cursor-not-allowed';
                  } else {
                    cellClass += `bg-[#1a1a1a] border-[#2a2a2a] hover:border-${currentPlayer === 'X' ? '[#e10600]' : 'blue-500'} hover:bg-[#1f1f1f] cursor-pointer active:scale-95`;
                  }

                  return (
                    <button
                      key={`${ri}-${ci}`}
                      onClick={() => handleCellClick(ri, ci)}
                      disabled={!!entry || blocked}
                      className={cellClass}
                    >
                      {isNoSolution ? (
                        // No valid drivers left — cell blocked
                        <>
                          <div className="text-2xl leading-none">🚫</div>
                          <div className="text-[9px] font-bold text-gray-600 mt-1 uppercase tracking-wider">Sin opciones</div>
                        </>
                      ) : isRevealed && driverInfo ? (
                        // Revealed: neutral gray, no player symbol
                        <>
                          <div className="text-[9px] font-bold text-gray-600 mb-1 uppercase tracking-wider">Revelado</div>
                          {driverPhotos[entry!.driverId] ? (
                            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full border-2 border-gray-600 overflow-hidden flex-shrink-0 opacity-60">
                              <img
                                src={driverPhotos[entry!.driverId]!}
                                alt={driverInfo.fullName}
                                className="w-full h-full object-cover object-top"
                              />
                            </div>
                          ) : (
                            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full border-2 border-gray-600 flex items-center justify-center text-xs font-black text-gray-500 bg-[#2a2a2a]">
                              {driverInfo.initials}
                            </div>
                          )}
                          <div className="mt-1 text-[9px] sm:text-[10px] font-bold text-center leading-tight flex items-center justify-center gap-0.5 text-gray-500">
                            {driverInfo.nationalityCode && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={`https://flagcdn.com/24x18/${driverInfo.nationalityCode}.png`} alt="" width={12} height={9} className="inline-block flex-shrink-0 opacity-60" />
                            )}
                            {driverInfo.fullName.split(' ').pop()}
                          </div>
                        </>
                      ) : entry && driverInfo ? (
                        // Filled by a player
                        <>
                          <div className={`text-xl sm:text-2xl font-black mb-1 ${p ? PLAYER_COLORS[p].text : ''}`}>{p}</div>
                          {driverPhotos[entry.driverId] ? (
                            <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full border-2 overflow-hidden flex-shrink-0 ${p ? PLAYER_COLORS[p].border : ''}`}>
                              <img src={driverPhotos[entry.driverId]!} alt={driverInfo.fullName} className="w-full h-full object-cover object-top" />
                            </div>
                          ) : (
                            <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full border-2 flex items-center justify-center text-xs sm:text-sm font-black text-white ${p ? PLAYER_COLORS[p].bg : ''} ${p ? PLAYER_COLORS[p].border : ''}`}>
                              {driverInfo.initials}
                            </div>
                          )}
                          <div className={`mt-1 text-[9px] sm:text-[10px] font-bold text-center leading-tight line-clamp-2 flex items-center justify-center gap-0.5 ${p ? PLAYER_COLORS[p].text : 'text-gray-300'}`}>
                            {driverInfo.nationalityCode && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={`https://flagcdn.com/24x18/${driverInfo.nationalityCode}.png`} alt={driverInfo.nationality} width={12} height={9} className="inline-block flex-shrink-0" />
                            )}
                            {driverInfo.fullName.split(' ').pop()}
                          </div>
                        </>
                      ) : isShaking ? (
                        <div className="text-red-500 text-2xl font-black">✗</div>
                      ) : (
                        <div className="text-[#333] text-2xl font-black">{isAiTurn ? '…' : '+'}</div>
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
              {winner === 'draw' ? '¡Empate!'
                : mode === 'ai' && winner === 'X' ? '¡Ganaste!'
                : mode === 'ai' && winner === 'O' ? '¡La IA ganó!'
                : `¡${PLAYER_COLORS[winner].label} ganó!`}
            </div>
            {winner !== 'draw' && (
              <div className={`text-sm font-semibold mb-4 ${PLAYER_COLORS[winner].text}`}>{winner} hizo 3 en línea</div>
            )}
            {winner === 'draw' && (
              <div className="text-sm text-gray-400 mb-4">La grilla quedó completa sin ganador</div>
            )}
            <button onClick={onNewGame} className="w-full py-3 bg-[#e10600] hover:bg-red-700 text-white font-black rounded-xl transition-colors text-sm tracking-wide uppercase">
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
          showRevealHint={showRevealHint}
          onSubmit={handleSubmit}
          onReveal={handleRevealModal}
          onClose={() => setActiveCell(null)}
        />
      )}
    </div>
  );
}
