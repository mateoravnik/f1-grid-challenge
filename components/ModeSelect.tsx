'use client';

import { useState } from 'react';
import type { AiDifficulty, GameMode, GridDifficulty } from './GameContainer';

interface Props {
  onSelect: (mode: GameMode, aiDifficulty?: AiDifficulty, gridDifficulty?: GridDifficulty) => void;
}

const AI_DIFFICULTIES: { id: AiDifficulty; emoji: string; label: string; desc: string }[] = [
  { id: 'easy',   emoji: '🟢', label: 'Fácil',   desc: 'Elige la primera opción disponible' },
  { id: 'medium', emoji: '🟡', label: 'Medio',   desc: 'Elige al azar entre las opciones' },
  { id: 'hard',   emoji: '🔴', label: 'Difícil', desc: 'Bloquea y juega estratégicamente' },
];

const GRID_DIFFICULTIES: { id: GridDifficulty; emoji: string; label: string; desc: string }[] = [
  { id: 'easy',   emoji: '🟢', label: 'Fácil',   desc: '6+ pilotos válidos por celda' },
  { id: 'medium', emoji: '🟡', label: 'Medio',   desc: '3–5 pilotos válidos por celda' },
  { id: 'hard',   emoji: '🔴', label: 'Difícil', desc: '1–2 pilotos válidos por celda' },
];

export default function ModeSelect({ onSelect }: Props) {
  const [mode, setMode] = useState<GameMode | null>(null);
  const [aiDiff, setAiDiff] = useState<AiDifficulty>('medium');
  const [gridDiff, setGridDiff] = useState<GridDifficulty>('medium');

  const handleStart = () => {
    if (!mode) return;
    onSelect(mode, aiDiff, gridDiff);
  };

  // ---- Config screen ----
  if (mode !== null) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-10 gap-6 max-w-sm mx-auto w-full">
        <div className="text-center">
          <div className="text-2xl font-black text-white mb-1">
            {mode === 'ai' ? 'VS IA 🤖' : 'VS AMIGO 👥'}
          </div>
          <p className="text-gray-500 text-sm">Configurá la partida</p>
        </div>

        {/* AI difficulty — only for vs AI */}
        {mode === 'ai' && (
          <div className="w-full">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Nivel de IA
            </div>
            <div className="flex flex-col gap-2">
              {AI_DIFFICULTIES.map(({ id, emoji, label, desc }) => (
                <button
                  key={id}
                  onClick={() => setAiDiff(id)}
                  className={[
                    'flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all duration-150 text-left',
                    aiDiff === id
                      ? 'border-[#e10600] bg-[#180808]'
                      : 'border-[#2a2a2a] bg-[#111] hover:border-[#444]',
                  ].join(' ')}
                >
                  <span className="text-lg">{emoji}</span>
                  <div>
                    <div className="text-sm font-black text-white">{label}</div>
                    <div className="text-xs text-gray-500">{desc}</div>
                  </div>
                  {aiDiff === id && (
                    <span className="ml-auto text-[#e10600] text-sm font-black">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Grid difficulty */}
        <div className="w-full">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
            Dificultad de grilla
          </div>
          <div className="flex flex-col gap-2">
            {GRID_DIFFICULTIES.map(({ id, emoji, label, desc }) => (
              <button
                key={id}
                onClick={() => setGridDiff(id)}
                className={[
                  'flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all duration-150 text-left',
                  gridDiff === id
                    ? 'border-blue-500 bg-[#080c18]'
                    : 'border-[#2a2a2a] bg-[#111] hover:border-[#444]',
                ].join(' ')}
              >
                <span className="text-lg">{emoji}</span>
                <div>
                  <div className="text-sm font-black text-white">{label}</div>
                  <div className="text-xs text-gray-500">{desc}</div>
                </div>
                {gridDiff === id && (
                  <span className="ml-auto text-blue-400 text-sm font-black">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={handleStart}
            className="w-full py-4 bg-[#e10600] hover:bg-red-700 text-white font-black rounded-xl transition-colors text-base tracking-wide uppercase active:scale-95"
          >
            ¡Comenzar!
          </button>
          <button
            onClick={() => setMode(null)}
            className="text-xs text-gray-600 hover:text-gray-400 transition-colors font-semibold uppercase tracking-wider"
          >
            ← Volver
          </button>
        </div>
      </div>
    );
  }

  // ---- Mode selection screen ----
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 gap-10">
      {/* Title */}
      <div className="text-center">
        <div className="text-5xl sm:text-6xl font-black tracking-tight mb-2">
          <span className="text-[#e10600]">F1</span>{' '}
          <span className="text-white">GRID</span>
        </div>
        <div className="text-2xl sm:text-3xl font-black tracking-tight text-gray-400 mb-4">
          CHALLENGE
        </div>
        <p className="text-gray-500 text-sm max-w-xs mx-auto leading-relaxed">
          Ta-te-ti de Fórmula 1. Nombrá un piloto que cumpla ambas condiciones para marcar la celda.
          Primero en hacer 3 en línea, gana.
        </p>
      </div>

      {/* Mode buttons */}
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
        <button
          onClick={() => setMode('friend')}
          className="flex-1 group flex flex-col items-center gap-3 px-6 py-8 rounded-2xl border border-[#2a2a2a] bg-[#111] hover:border-[#e10600] hover:bg-[#180808] transition-all duration-200 active:scale-95"
        >
          <div className="text-4xl">👥</div>
          <div>
            <div className="text-lg font-black text-white group-hover:text-[#e10600] transition-colors">
              VS AMIGO
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Dos jugadores, misma pantalla
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-6 h-6 rounded-full bg-[#e10600]/20 border border-[#e10600]/50 flex items-center justify-center text-[#e10600] text-xs font-black">X</div>
            <span className="text-gray-600 text-xs">vs</span>
            <div className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/50 flex items-center justify-center text-blue-400 text-xs font-black">O</div>
          </div>
        </button>

        <button
          onClick={() => setMode('ai')}
          className="flex-1 group flex flex-col items-center gap-3 px-6 py-8 rounded-2xl border border-[#2a2a2a] bg-[#111] hover:border-blue-500 hover:bg-[#080c18] transition-all duration-200 active:scale-95"
        >
          <div className="text-4xl">🤖</div>
          <div>
            <div className="text-lg font-black text-white group-hover:text-blue-400 transition-colors">
              VS IA
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Jugás contra la computadora
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-6 h-6 rounded-full bg-[#e10600]/20 border border-[#e10600]/50 flex items-center justify-center text-[#e10600] text-xs font-black">X</div>
            <span className="text-gray-600 text-xs">vs</span>
            <div className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/50 flex items-center justify-center text-blue-400 text-xs font-black">🤖</div>
          </div>
        </button>
      </div>

      <p className="text-xs text-gray-700 text-center max-w-xs">
        Cada piloto se puede usar una sola vez en toda la partida.
        Un error = turno perdido.
      </p>
    </div>
  );
}
