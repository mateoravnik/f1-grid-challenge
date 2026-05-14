'use client';

import React from 'react';
import type { GameState, DriverLookup } from './GameContainer';
import type { DailyGrid } from '@/lib/gridGenerator';

interface Props {
  gameState: GameState;
  grid: DailyGrid;
  driverLookup: Record<string, DriverLookup>;
  streak: number;
  onClose: () => void;
}

function buildShareText(gameState: GameState, grid: DailyGrid): string {
  const { cells, attemptsLeft, dateKey } = gameState;
  const used = 9 - attemptsLeft;
  const correct = cells.flat().filter((c) => c.status === 'correct').length;

  const emoji = cells
    .map((row) => row.map((c) => (c.status === 'correct' ? '🟩' : '⬜')).join(''))
    .join('\n');

  return [
    `🏎️ F1 Grid Challenge — ${dateKey}`,
    `${correct}/9 celdas · ${used} intentos usados`,
    '',
    emoji,
    '',
    'https://f1gridchallenge.vercel.app',
  ].join('\n');
}

export default function ResultScreen({ gameState, grid, driverLookup, streak, onClose }: Props) {
  const { cells, attemptsLeft } = gameState;
  const correct = cells.flat().filter((c) => c.status === 'correct').length;
  const used = 9 - attemptsLeft;
  const perfect = correct === 9;

  const shareText = buildShareText(gameState, grid);

  const handleShare = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
    window.open(twitterUrl, '_blank', 'width=600,height=400');
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      alert('¡Copiado al portapapeles!');
    } catch {
      alert(shareText);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-md bg-[#111] border border-[#2a2a2a] rounded-2xl overflow-hidden shadow-2xl my-4 animate-popIn">
        {/* Header */}
        <div className="bg-[#1a1a1a] border-b border-[#2a2a2a] px-6 py-5 text-center">
          <div className="text-4xl mb-2">{perfect ? '🏆' : correct >= 6 ? '🥈' : correct >= 3 ? '🥉' : '💀'}</div>
          <div className="text-2xl font-black text-white">
            {perfect ? '¡PERFECTO!' : correct >= 6 ? '¡Muy bien!' : correct >= 3 ? 'Buen intento' : 'Sigue practicando'}
          </div>
          <div className="text-gray-400 text-sm mt-1">{gameState.dateKey}</div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 divide-x divide-[#2a2a2a] border-b border-[#2a2a2a]">
          {[
            { label: 'Correctas', value: `${correct}/9`, color: 'text-green-400' },
            { label: 'Intentos', value: `${used}/9`, color: 'text-white' },
            { label: 'Racha', value: `🔥${streak}`, color: 'text-orange-400' },
          ].map((s) => (
            <div key={s.label} className="py-4 text-center">
              <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
              <div className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Grid Result */}
        <div className="p-5">
          <div className="text-[11px] text-gray-500 uppercase tracking-widest font-semibold mb-3 text-center">Tu grilla</div>
          <div className="grid grid-cols-[auto_1fr_1fr_1fr] gap-1.5">
            {/* Corner */}
            <div />
            {grid.cols.map((col, ci) => (
              <div key={ci} className="text-[9px] text-center text-gray-500 font-bold uppercase leading-tight px-1 py-1">
                {col.shortLabel}
              </div>
            ))}
            {grid.rows.map((row, ri) => (
              <React.Fragment key={`row-${ri}`}>
                <div className="text-[9px] text-gray-500 font-bold uppercase leading-tight py-1 flex items-center">
                  <span className="[writing-mode:vertical-rl] rotate-180">{row.shortLabel}</span>
                </div>
                {grid.cols.map((_, ci) => {
                  const cell = cells[ri][ci];
                  const driver = cell.driverId ? driverLookup[cell.driverId] : null;
                  return (
                    <div
                      key={`r${ri}c${ci}`}
                      className={[
                        'rounded-lg min-h-[64px] flex flex-col items-center justify-center p-1.5',
                        cell.status === 'correct'
                          ? 'bg-green-800 border border-green-600'
                          : 'bg-[#1a1a1a] border border-[#2a2a2a]',
                      ].join(' ')}
                    >
                      {driver ? (
                        <>
                          <div className="w-8 h-8 rounded-full bg-green-700 border border-green-400 flex items-center justify-center text-xs font-black text-white mb-1">
                            {driver.initials}
                          </div>
                          <div className="text-[9px] text-green-200 text-center font-bold leading-tight line-clamp-2">
                            {driver.fullName}
                          </div>
                        </>
                      ) : (
                        <div className="text-[#2a2a2a] text-xl font-black">✗</div>
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Share buttons */}
        <div className="px-5 pb-5 flex flex-col gap-2">
          <button
            onClick={handleShare}
            className="w-full py-3 bg-black border border-[#333] rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 hover:bg-[#111] transition-colors"
          >
            <span className="text-base">𝕏</span>
            Compartir en X
          </button>
          <button
            onClick={handleCopy}
            className="w-full py-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl font-bold text-gray-300 text-sm hover:bg-[#222] transition-colors"
          >
            📋 Copiar resultado
          </button>
          <button
            onClick={onClose}
            className="w-full py-3 bg-[#e10600]/10 border border-[#e10600]/30 rounded-xl font-bold text-[#e10600] text-sm hover:bg-[#e10600]/20 transition-colors"
          >
            Ver grilla completa
          </button>
        </div>
      </div>
    </div>
  );
}
