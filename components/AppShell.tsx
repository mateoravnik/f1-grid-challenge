'use client';

import { useState } from 'react';
import { Suspense } from 'react';
import HomeScreen from './HomeScreen';
import GameContainer from './GameContainer';
import PyramidGame from './PyramidGame';
import ErrorBoundary from './ErrorBoundary';

type AppRoute = 'home' | 'grid' | 'pyramid';

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

export default function AppShell() {
  const [route, setRoute] = useState<AppRoute>('home');

  if (route === 'home') {
    return (
      <div className="flex-1 flex flex-col">
        <HomeScreen onSelectGame={setRoute} />
      </div>
    );
  }

  if (route === 'pyramid') {
    return (
      <div className="flex-1 flex flex-col">
        <ErrorBoundary>
          <PyramidGame onHome={() => setRoute('home')} />
        </ErrorBoundary>
      </div>
    );
  }

  // grid
  return (
    <div className="flex-1 flex flex-col">
      <ErrorBoundary>
        <Suspense fallback={<LoadingScreen />}>
          <GameContainer onHome={() => setRoute('home')} />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
