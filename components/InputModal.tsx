'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { DriverListItem, Player } from './GameContainer';
import { normalizeText } from '@/lib/f1Data';

interface Props {
  rowLabel: string;
  colLabel: string;
  driverList: DriverListItem[];
  usedDriverIds: Set<string>;
  currentPlayer: Player;
  showRevealHint: boolean;
  onSubmit: (driverId: string) => void;
  onReveal: () => void;
  onClose: () => void;
}

const PLAYER_ACCENT: Record<Player, string> = {
  X: 'border-[#e10600] text-[#e10600]',
  O: 'border-blue-500 text-blue-400',
};

const PLAYER_FOCUS: Record<Player, string> = {
  X: 'focus:border-[#e10600]',
  O: 'focus:border-blue-500',
};

const PLAYER_SELECTED_BG: Record<Player, string> = {
  X: 'bg-[#e10600]',
  O: 'bg-blue-600',
};

function fuzzySearch(query: string, drivers: DriverListItem[]): DriverListItem[] {
  const q = normalizeText(query.trim());
  if (q.length < 2) return [];
  const scored = drivers
    .map(d => {
      const full = normalizeText(d.fullName);
      const family = normalizeText(d.familyName);
      const given = normalizeText(d.givenName);
      if (full === q || family === q) return { d, score: 100 };
      if (family.startsWith(q) || full.startsWith(q)) return { d, score: 80 };
      if (full.includes(q) || family.includes(q) || given.includes(q)) return { d, score: 50 };
      return null;
    })
    .filter((x): x is { d: DriverListItem; score: number } => x !== null);
  return scored
    .sort((a, b) => b.score - a.score || a.d.familyName.localeCompare(b.d.familyName))
    .map(x => x.d)
    .slice(0, 6);
}

export default function InputModal({
  rowLabel, colLabel, driverList, usedDriverIds, currentPlayer,
  showRevealHint, onSubmit, onReveal, onClose,
}: Props) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<DriverListItem[]>([]);
  const [selected, setSelected] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    setSuggestions(fuzzySearch(query, driverList));
    setSelected(-1);
  }, [query, driverList]);

  const handleSubmit = useCallback((driver: DriverListItem) => {
    onSubmit(driver.id);
  }, [onSubmit]);

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, suggestions.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, -1)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      const target = selected >= 0 ? suggestions[selected] : undefined;
      const only = suggestions.length === 1 ? suggestions[0] : undefined;
      const chosen = target ?? only;
      if (chosen) handleSubmit(chosen);
    }
  };

  const accent = PLAYER_ACCENT[currentPlayer];
  const focusCls = PLAYER_FOCUS[currentPlayer];
  const selectedBg = PLAYER_SELECTED_BG[currentPlayer];

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="w-full max-w-md bg-[#111] border border-[#2a2a2a] rounded-2xl overflow-hidden shadow-2xl animate-popIn">
        {/* Header */}
        <div className="bg-[#1a1a1a] border-b border-[#2a2a2a] px-5 py-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-black ${accent}`}>
                  {currentPlayer}
                </div>
                <span className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">
                  Piloto que corrió en:
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={`px-2 py-1 bg-[#1f1f1f] border rounded text-xs font-bold uppercase tracking-wide ${accent}`}>
                  {rowLabel}
                </span>
                <span className="text-gray-600 text-xs">+</span>
                <span className={`px-2 py-1 bg-[#1f1f1f] border rounded text-xs font-bold uppercase tracking-wide ${accent}`}>
                  {colLabel}
                </span>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-600 hover:text-white transition-colors text-xl leading-none flex-shrink-0 mt-0.5">×</button>
          </div>
        </div>

        {/* Input */}
        <div className="p-4">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Nombre del piloto..."
            className={`w-full bg-[#222] border border-[#333] rounded-xl px-4 py-3 text-white placeholder-gray-600 font-semibold text-sm focus:outline-none transition-colors ${focusCls}`}
          />

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="mt-2 space-y-1">
              {suggestions.map((driver, i) => {
                const used = usedDriverIds.has(driver.id);
                return (
                  <button
                    key={driver.id}
                    onClick={() => !used && handleSubmit(driver)}
                    disabled={used}
                    className={[
                      'w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-left transition-colors text-sm font-semibold',
                      used ? 'bg-[#1a1a1a] text-gray-600 cursor-not-allowed'
                        : selected === i ? `${selectedBg} text-white`
                        : 'bg-[#1a1a1a] text-gray-200 hover:bg-[#242424] hover:text-white',
                    ].join(' ')}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 ${
                      used ? 'bg-[#2a2a2a] text-gray-600' : selected === i ? 'bg-white/20 text-white' : 'bg-[#2a2a2a] text-gray-300'
                    }`}>
                      {driver.givenName[0]}{driver.familyName[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate">{driver.fullName}</div>
                      {used && <div className="text-[10px] font-normal text-gray-600">Ya usado en esta partida</div>}
                    </div>
                    <div className="ml-auto text-[10px] text-gray-500 flex-shrink-0">
                      {driver.nationality.slice(0, 3).toUpperCase()}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {query.length >= 2 && suggestions.length === 0 && (
            <div className="mt-3 text-center text-sm text-gray-600 py-4">
              No se encontró ningún piloto con ese nombre
            </div>
          )}

          {/* Reveal hint (auto-shown after 4 consecutive wrong answers) */}
          {showRevealHint && (
            <div className="mt-3 flex items-start gap-2 bg-yellow-950/40 border border-yellow-800/50 rounded-xl px-3 py-2.5">
              <span className="text-lg leading-none flex-shrink-0">💡</span>
              <span className="text-xs text-yellow-400 font-semibold leading-snug">
                ¿Quedaste sin ideas? Podés revelar la respuesta y pasar el turno.
              </span>
            </div>
          )}

          {/* Reveal button — always visible */}
          <button
            onClick={onReveal}
            className="mt-3 w-full py-2.5 rounded-xl border border-[#3a3a3a] bg-[#1a1a1a] text-gray-500 hover:text-gray-300 hover:border-[#555] transition-colors text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5"
          >
            <span>👁</span> Revelar respuesta y pasar turno
          </button>

          <div className="mt-3 text-[10px] text-gray-600 text-center">
            ↑↓ navegar · Enter seleccionar · Esc cerrar
          </div>
        </div>
      </div>
    </div>
  );
}
