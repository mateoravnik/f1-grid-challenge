'use client';

import { useState } from 'react';
import type { AiDifficulty } from './GameContainer';

type GameMode = 'friend' | 'ai';

interface Props {
  onSelect: (mode: GameMode, difficulty?: AiDifficulty) => void;
}

const DIFFICULTIES: { id: AiDifficulty; emoji: string; label: string; desc: string; color: string }[] = [
  { id: 'easy',   emoji: '🟢', label: 'Fácil',  desc: 'La IA elige al azar',          color: 'hover:border-green-500 hover:bg-[#081808]' },
  { id: 'medium', emoji: '🟡', label: 'Medio',  desc: 'Bloquea y ataca cuando puede', color: 'hover:border-yellow-500 hover:bg-[#181400]' },
  { id: 'hard',   emoji: '🔴', label: 'Difícil', desc: 'Juega estratégicamente',       color: 'hover:border-[#e10600] hover:bg-[#180808]' },
];

export default function ModeSelect({ onSelect }: Props) {
  const [aiSelected, setAiSelected] = useState(false);

  if (aiSelected) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 gap-8">
        <div className="text-center">
          <div className="text-3xl font-black text-white mb-1">VS IA 🤖</div>
          <p className="text-gray-500 text-sm">Elegí la dificultad</p>
        </div>

        <div className="flex flex-col gap-3 w-full max-w-xs">
          {DIFFICULTIES.map(({ id, emoji, label, desc, color }) => (
            <button
              key={id}
              onClick={() => onSelect('ai', id)}
              className={`group flex items-center gap-4 px-5 py-4 rounded-2xl border border-[#2a2a2a] bg-[#111] transition-all duration-200 active:scale-95 ${color}`}
            >
              <span className="text-2xl">{emoji}</span>
              <div className="text-left">
                <div className="text-base font-black text-white group-hover:text-white transition-colors">
                  {label}
                </div>
                <div className="text-xs text-gray-500">{desc}</div>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={() => setAiSelected(false)}
          className="text-xs text-gray-600 hover:text-gray-400 transition-colors font-semibold uppercase tracking-wider"
        >
          ← Volver
        </button>
      </div>
    );
  }

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
          onClick={() => onSelect('friend')}
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
          onClick={() => setAiSelected(true)}
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
