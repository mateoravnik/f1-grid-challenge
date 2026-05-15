'use client';

interface Props {
  onSelectGame: (game: 'grid' | 'pyramid') => void;
}

export default function HomeScreen({ onSelectGame }: Props) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 gap-8">
      {/* Logo */}
      <div className="text-center">
        <div className="text-5xl font-black tracking-tight mb-2">
          <span className="text-[#e10600]">F1</span> <span className="text-white">GAMES</span>
        </div>
        <p className="text-gray-500 text-sm tracking-widest uppercase">Elegí tu desafío</p>
      </div>

      {/* Game cards */}
      <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Grid Challenge */}
        <button
          onClick={() => onSelectGame('grid')}
          className="group relative bg-[#111] border border-[#2a2a2a] rounded-2xl p-6 text-left hover:border-[#e10600] transition-all duration-200 hover:shadow-[0_0_24px_rgba(225,6,0,0.15)] active:scale-[0.98]"
        >
          <div className="text-4xl mb-4">🏁</div>
          <div className="text-xl font-black text-white mb-1 uppercase tracking-tight">
            Grid Challenge
          </div>
          <div className="text-xs text-gray-500 font-semibold uppercase tracking-widest mb-3">
            Ta-te-ti
          </div>
          <p className="text-gray-400 text-sm leading-relaxed">
            Completá una grilla 3×3 nombrando pilotos que cumplan las condiciones de fila y columna. Jugá solo o contra un amigo.
          </p>
          <div className="mt-4 flex items-center gap-1.5 text-[#e10600] text-xs font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
            Jugar <span className="text-base">→</span>
          </div>
        </button>

        {/* F1 Pyramid */}
        <button
          onClick={() => onSelectGame('pyramid')}
          className="group relative bg-[#111] border border-[#2a2a2a] rounded-2xl p-6 text-left hover:border-yellow-500 transition-all duration-200 hover:shadow-[0_0_24px_rgba(234,179,8,0.12)] active:scale-[0.98]"
        >
          <div className="text-4xl mb-4">🏆</div>
          <div className="text-xl font-black text-white mb-1 uppercase tracking-tight">
            F1 Pyramid
          </div>
          <div className="text-xs text-gray-500 font-semibold uppercase tracking-widest mb-3">
            Ranking
          </div>
          <p className="text-gray-400 text-sm leading-relaxed">
            Ordená 10 pilotos de mayor a menor según una estadística: victorias, podios, campeonatos y más.
          </p>
          <div className="mt-4 flex items-center gap-1.5 text-yellow-500 text-xs font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
            Jugar <span className="text-base">→</span>
          </div>
        </button>
      </div>
    </div>
  );
}
