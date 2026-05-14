import { Suspense } from 'react';
import GameContainer from '@/components/GameContainer';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] flex flex-col">
      <Suspense fallback={<LoadingScreen />}>
        <GameContainer />
      </Suspense>
    </main>
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
