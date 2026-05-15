'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { PYRAMID_CATEGORIES, selectPilots } from '@/lib/pyramidData';
import type { PyramidPilot, PyramidCategory } from '@/lib/pyramidData';

interface Props {
  onHome: () => void;
}

// Pyramid layout: 1 slot at top (rank 1), then 2, 3, 4 at bottom (rank 2-4 = best 4)
// Wait — user spec: 1-2-3-4 pyramid where top=best.
// Slots: row 0 = 1 slot (rank 1), row 1 = 2 slots (ranks 2-3), row 2 = 3 slots (ranks 4-6), row 3 = 4 slots (ranks 7-10)
const PYRAMID_ROWS = [1, 2, 3, 4]; // slots per row

type Phase = 'placing' | 'arranging' | 'result';

interface SlotPosition {
  rowIdx: number;
  colIdx: number;
  slotIdx: number; // 0-based global index (top to bottom, left to right)
}

function allSlots(): SlotPosition[] {
  const slots: SlotPosition[] = [];
  let idx = 0;
  PYRAMID_ROWS.forEach((count, rowIdx) => {
    for (let colIdx = 0; colIdx < count; colIdx++) {
      slots.push({ rowIdx, colIdx, slotIdx: idx++ });
    }
  });
  return slots;
}

const TOTAL_SLOTS = PYRAMID_ROWS.reduce((a, b) => a + b, 0); // 10

function getSlotLabel(slotIdx: number): string {
  return `#${slotIdx + 1}`;
}

// Returns the correct slot index for a pilot given sorted order (0 = best)
function correctSlotOf(pilotId: string, pilots: PyramidPilot[], category: PyramidCategory): number {
  const sorted = [...pilots].sort((a, b) => category.getValue(b) - category.getValue(a));
  const idx = sorted.findIndex(p => p.id === pilotId);
  return idx;
}

// Check if placed pilot is in correct position
function isCorrectSlot(slotIdx: number, pilotId: string, pilots: PyramidPilot[], category: PyramidCategory): boolean {
  const sorted = [...pilots].sort((a, b) => category.getValue(b) - category.getValue(a));
  const pilot = pilots.find(p => p.id === pilotId);
  if (!pilot) return false;
  const correctPilot = sorted[slotIdx];
  if (!correctPilot) return false;
  // Correct if value matches (handles ties)
  return category.getValue(pilot) === category.getValue(correctPilot);
}

function getPilotPhoto(wikiName: string): string {
  return `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiName)}`;
}

function FlagImg({ code }: { code: string }) {
  return (
    <img
      src={`https://flagcdn.com/16x12/${code.toLowerCase()}.png`}
      width={16}
      height={12}
      alt={code}
      className="rounded-[2px] flex-shrink-0"
      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
    />
  );
}

function PilotAvatar({ pilot, size = 'md' }: { pilot: PyramidPilot; size?: 'sm' | 'md' | 'lg' }) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const wikiName = pilot.wikiName;

  useEffect(() => {
    let cancelled = false;
    fetch(getPilotPhoto(wikiName))
      .then(r => r.json())
      .then((data: { thumbnail?: { source?: string } }) => {
        if (!cancelled && data.thumbnail?.source) setPhotoUrl(data.thumbnail.source);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [wikiName]);

  const dim = size === 'sm' ? 'w-8 h-8 text-[10px]' : size === 'lg' ? 'w-14 h-14 text-sm' : 'w-10 h-10 text-xs';

  if (photoUrl) {
    return (
      <div className={`${dim} rounded-full overflow-hidden flex-shrink-0 bg-[#2a2a2a]`}>
        <img src={photoUrl} alt={pilot.name} className="w-full h-full object-cover object-top" />
      </div>
    );
  }

  return (
    <div className={`${dim} rounded-full bg-[#2a2a2a] flex items-center justify-center font-black text-gray-300 flex-shrink-0`}>
      {pilot.givenName[0]}{pilot.familyName[0]}
    </div>
  );
}

// -------------------------------------------------------------------------
// Placing Phase — show pilots one at a time, user clicks a slot
// -------------------------------------------------------------------------
function PlacingPhase({
  pilots,
  category,
  placed,
  currentPilotIdx,
  onPlace,
}: {
  pilots: PyramidPilot[];
  category: PyramidCategory;
  placed: (string | null)[];
  currentPilotIdx: number;
  onPlace: (slotIdx: number) => void;
}) {
  const pilot = pilots[currentPilotIdx];
  const slots = allSlots();

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-lg mx-auto">
      {/* Progress */}
      <div className="text-xs text-gray-500 uppercase tracking-widest font-semibold">
        Piloto {currentPilotIdx + 1} de {TOTAL_SLOTS}
      </div>

      {/* Current pilot card */}
      <div className="bg-[#111] border border-[#2a2a2a] rounded-2xl p-5 flex items-center gap-4 w-full">
        <PilotAvatar pilot={pilot} size="lg" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <FlagImg code={pilot.nationalityCode} />
            <span className="text-white font-black text-lg truncate">{pilot.name}</span>
          </div>
          <div className="text-gray-500 text-xs font-semibold uppercase tracking-wider">
            ¿En qué posición va?
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-[10px] text-gray-600 uppercase tracking-widest">{category.shortLabel}</div>
          <div className="text-gray-600 text-xs">Oculto</div>
        </div>
      </div>

      {/* Pyramid grid to click */}
      <div className="flex flex-col items-center gap-2 w-full">
        {PYRAMID_ROWS.map((count, rowIdx) => {
          const rowSlots = slots.filter(s => s.rowIdx === rowIdx);
          return (
            <div key={rowIdx} className="flex gap-2 justify-center">
              {rowSlots.map(({ slotIdx }) => {
                const occupiedId = placed[slotIdx];
                const occupiedPilot = occupiedId ? pilots.find(p => p.id === occupiedId) : null;
                const isEmpty = !occupiedId;
                return (
                  <button
                    key={slotIdx}
                    onClick={() => isEmpty && onPlace(slotIdx)}
                    disabled={!isEmpty}
                    className={[
                      'w-24 h-20 rounded-xl border text-xs font-semibold transition-all duration-150 flex flex-col items-center justify-center gap-1',
                      isEmpty
                        ? 'border-dashed border-[#3a3a3a] bg-[#111] hover:border-yellow-500 hover:bg-yellow-950/20 cursor-pointer active:scale-95'
                        : 'border-[#2a2a2a] bg-[#1a1a1a] cursor-not-allowed',
                    ].join(' ')}
                  >
                    <span className="text-[10px] text-gray-600 font-bold">{getSlotLabel(slotIdx)}</span>
                    {occupiedPilot ? (
                      <>
                        <PilotAvatar pilot={occupiedPilot} size="sm" />
                        <span className="text-[9px] text-gray-400 truncate w-full text-center px-1">{occupiedPilot.familyName}</span>
                      </>
                    ) : (
                      <span className="text-gray-700 text-lg">+</span>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="text-[10px] text-gray-600 text-center">
        #{1} = el mejor · #{TOTAL_SLOTS} = el peor
      </div>
    </div>
  );
}

// -------------------------------------------------------------------------
// Arranging Phase — drag-and-drop reorder
// -------------------------------------------------------------------------
function ArrangingPhase({
  pilots,
  category,
  placed,
  onSwap,
  onCheck,
  onReveal,
  checkResult,
  checkUsed,
}: {
  pilots: PyramidPilot[];
  category: PyramidCategory;
  placed: string[];
  onSwap: (a: number, b: number) => void;
  onCheck: () => void;
  onReveal: () => void;
  checkResult: ('correct' | 'wrong' | null)[] | null;
  checkUsed: boolean;
}) {
  const dragSrc = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [touchSrc, setTouchSrc] = useState<number | null>(null);

  const slots = allSlots();

  const handleDragStart = (slotIdx: number) => { dragSrc.current = slotIdx; };
  const handleDragOver = (e: React.DragEvent, slotIdx: number) => {
    e.preventDefault();
    setDragOver(slotIdx);
  };
  const handleDrop = (slotIdx: number) => {
    if (dragSrc.current !== null && dragSrc.current !== slotIdx) {
      onSwap(dragSrc.current, slotIdx);
    }
    dragSrc.current = null;
    setDragOver(null);
  };
  const handleDragEnd = () => { dragSrc.current = null; setDragOver(null); };

  // Click-to-swap on mobile
  const handleTap = (slotIdx: number) => {
    if (touchSrc === null) {
      setTouchSrc(slotIdx);
    } else if (touchSrc !== slotIdx) {
      onSwap(touchSrc, slotIdx);
      setTouchSrc(null);
    } else {
      setTouchSrc(null);
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-lg mx-auto">
      <div className="text-center">
        <div className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-1">Ordená los pilotos</div>
        <div className="text-gray-400 text-sm">{category.label}</div>
      </div>

      <div className="flex flex-col items-center gap-2 w-full">
        {PYRAMID_ROWS.map((count, rowIdx) => {
          const rowSlots = slots.filter(s => s.rowIdx === rowIdx);
          return (
            <div key={rowIdx} className="flex gap-2 justify-center">
              {rowSlots.map(({ slotIdx }) => {
                const pilotId = placed[slotIdx];
                const pilot = pilots.find(p => p.id === pilotId);
                if (!pilot) return null;
                const result = checkResult?.[slotIdx] ?? null;
                const isDragTarget = dragOver === slotIdx;
                const isTouchSelected = touchSrc === slotIdx;
                const borderColor = result === 'correct' ? 'border-green-500'
                  : result === 'wrong' ? 'border-red-600'
                  : isTouchSelected ? 'border-yellow-400'
                  : isDragTarget ? 'border-yellow-500'
                  : 'border-[#2a2a2a]';
                const bg = result === 'correct' ? 'bg-green-950/30'
                  : result === 'wrong' ? 'bg-red-950/30'
                  : isTouchSelected ? 'bg-yellow-950/20'
                  : isDragTarget ? 'bg-yellow-950/20'
                  : 'bg-[#111]';

                return (
                  <div
                    key={slotIdx}
                    draggable
                    onDragStart={() => handleDragStart(slotIdx)}
                    onDragOver={e => handleDragOver(e, slotIdx)}
                    onDrop={() => handleDrop(slotIdx)}
                    onDragEnd={handleDragEnd}
                    onClick={() => handleTap(slotIdx)}
                    className={[
                      'w-24 h-20 rounded-xl border transition-all duration-150 flex flex-col items-center justify-center gap-1 cursor-grab active:cursor-grabbing select-none',
                      borderColor, bg,
                    ].join(' ')}
                  >
                    <span className="text-[10px] text-gray-600 font-bold">{getSlotLabel(slotIdx)}</span>
                    <PilotAvatar pilot={pilot} size="sm" />
                    <span className="text-[9px] text-gray-400 truncate w-full text-center px-1">{pilot.familyName}</span>
                    {result === 'correct' && <span className="text-[8px] text-green-400">✓</span>}
                    {result === 'wrong' && <span className="text-[8px] text-red-400">✗</span>}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="text-[10px] text-gray-600 text-center">
        Arrastrá para reordenar · Toca dos pilotos para intercambiarlos
      </div>

      <div className="flex gap-3 w-full">
        <button
          onClick={!checkUsed ? onCheck : undefined}
          disabled={checkUsed}
          className={[
            'flex-1 py-3 rounded-xl border text-sm font-bold uppercase tracking-wider transition-colors',
            checkUsed
              ? 'bg-[#1a1a1a] border-[#2a2a2a] text-gray-600 cursor-not-allowed'
              : 'bg-[#1a1a1a] border-[#3a3a3a] text-gray-300 hover:text-white hover:border-[#555]',
          ].join(' ')}
        >
          {checkUsed ? 'Ya usaste tu ayuda' : '¿Cómo voy?'}
        </button>
        <button
          onClick={onReveal}
          className="flex-1 py-3 rounded-xl bg-yellow-600 hover:bg-yellow-500 text-black font-black text-sm uppercase tracking-wider transition-colors"
        >
          Revelar resultado
        </button>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------------
// Result Phase
// -------------------------------------------------------------------------
function ResultPhase({
  pilots,
  category,
  placed,
  onPlayAgain,
  onHome,
}: {
  pilots: PyramidPilot[];
  category: PyramidCategory;
  placed: string[];
  onPlayAgain: () => void;
  onHome: () => void;
}) {
  const sorted = [...pilots].sort((a, b) => category.getValue(b) - category.getValue(a));

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-lg mx-auto">
      <div className="text-center">
        <div className="text-2xl font-black text-white mb-1">Resultado</div>
        <div className="text-gray-400 text-sm">{category.label}</div>
      </div>

      <div className="flex flex-col items-center gap-2 w-full">
        {PYRAMID_ROWS.map((count, rowIdx) => {
          const startIdx = PYRAMID_ROWS.slice(0, rowIdx).reduce((a, b) => a + b, 0);
          const rowPilots = sorted.slice(startIdx, startIdx + count);
          return (
            <div key={rowIdx} className="flex gap-2 justify-center">
              {rowPilots.map((correctPilot, colIdx) => {
                const globalSlotIdx = startIdx + colIdx;
                const userPilotId = placed[globalSlotIdx];
                const userPilot = pilots.find(p => p.id === userPilotId);
                const isCorrect = isCorrectSlot(globalSlotIdx, userPilotId, pilots, category);

                return (
                  <div
                    key={correctPilot.id}
                    className={[
                      'w-24 rounded-xl border p-2 flex flex-col items-center gap-1',
                      isCorrect ? 'border-green-500 bg-green-950/30' : 'border-red-600 bg-red-950/30',
                    ].join(' ')}
                    style={{ animation: `fadeSlideIn ${0.1 + globalSlotIdx * 0.07}s ease both` }}
                  >
                    <span className="text-[10px] text-gray-500 font-bold">{getSlotLabel(globalSlotIdx)}</span>
                    <PilotAvatar pilot={correctPilot} size="sm" />
                    <span className="text-[9px] font-bold text-white truncate w-full text-center">{correctPilot.familyName}</span>
                    <span className="text-[10px] font-black text-yellow-400">
                      {category.getValue(correctPilot)} <span className="font-normal text-gray-500">{category.unit}</span>
                    </span>
                    {!isCorrect && userPilot && (
                      <span className="text-[8px] text-red-400 truncate w-full text-center">
                        Pusiste: {userPilot.familyName}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="flex gap-3 w-full">
        <button
          onClick={onHome}
          className="flex-1 py-3 rounded-xl bg-[#1a1a1a] border border-[#3a3a3a] text-gray-300 hover:text-white hover:border-[#555] transition-colors text-sm font-bold uppercase tracking-wider"
        >
          Inicio
        </button>
        <button
          onClick={onPlayAgain}
          className="flex-1 py-3 rounded-xl bg-yellow-600 hover:bg-yellow-500 text-black font-black text-sm uppercase tracking-wider transition-colors"
        >
          Jugar de nuevo
        </button>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------------
// Main PyramidGame component
// -------------------------------------------------------------------------
function randomCategory(exclude?: PyramidCategory): PyramidCategory {
  const pool = exclude
    ? PYRAMID_CATEGORIES.filter(c => c.id !== exclude.id)
    : PYRAMID_CATEGORIES;
  return pool[Math.floor(Math.random() * pool.length)];
}

export default function PyramidGame({ onHome }: Props) {
  const [category, setCategory] = useState<PyramidCategory>(() => randomCategory());
  const [pilots, setPilots] = useState<PyramidPilot[]>(() => []);
  const [placed, setPlaced] = useState<(string | null)[]>(Array(TOTAL_SLOTS).fill(null));
  const [currentPilotIdx, setCurrentPilotIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('placing');
  const [checkResult, setCheckResult] = useState<('correct' | 'wrong' | null)[] | null>(null);
  const [checkUsed, setCheckUsed] = useState(false);

  // Start first game on mount
  useEffect(() => {
    const seed = Date.now();
    setPilots(selectPilots(category, seed));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startGame = useCallback((cat: PyramidCategory) => {
    const seed = Date.now();
    setCategory(cat);
    setPilots(selectPilots(cat, seed));
    setPlaced(Array(TOTAL_SLOTS).fill(null));
    setCurrentPilotIdx(0);
    setPhase('placing');
    setCheckResult(null);
    setCheckUsed(false);
  }, []);

  const handlePlace = useCallback((slotIdx: number) => {
    if (!pilots.length || currentPilotIdx >= pilots.length) return;
    const pilot = pilots[currentPilotIdx];
    setPlaced(prev => {
      const next = [...prev];
      next[slotIdx] = pilot.id;
      return next;
    });
    const nextIdx = currentPilotIdx + 1;
    setCurrentPilotIdx(nextIdx);
    if (nextIdx >= TOTAL_SLOTS) {
      setPhase('arranging');
    }
  }, [pilots, currentPilotIdx]);

  const handleSwap = useCallback((a: number, b: number) => {
    setPlaced(prev => {
      const next = [...prev];
      [next[a], next[b]] = [next[b], next[a]];
      return next;
    });
    setCheckResult(null);
  }, []);

  const handleCheck = useCallback(() => {
    const results = placed.map((id, slotIdx) => {
      if (!id) return null;
      return isCorrectSlot(slotIdx, id, pilots, category) ? 'correct' : 'wrong';
    }) as ('correct' | 'wrong' | null)[];
    setCheckResult(results);
    setCheckUsed(true);
  }, [placed, pilots, category]);

  const handleReveal = useCallback(() => {
    setPhase('result');
  }, []);

  const handlePlayAgain = useCallback(() => {
    startGame(randomCategory(category));
  }, [category, startGame]);

  if (phase === 'result') {
    return (
      <div className="flex-1 flex flex-col">
        <header className="bg-[#0a0a0a] border-b border-[#1a1a1a] px-4 py-3 flex items-center gap-3">
          <button
            onClick={onHome}
            className="text-gray-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest flex items-center gap-1.5"
          >
            ← Inicio
          </button>
          <div className="flex-1 flex justify-center">
            <span className="text-sm font-black tracking-tight">
              <span className="text-yellow-400">F1</span>{' '}
              <span className="text-white">PYRAMID</span>
            </span>
          </div>
          <div className="w-16" />
        </header>
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            <ResultPhase
              pilots={pilots}
              category={category}
              placed={placed as string[]}
              onPlayAgain={handlePlayAgain}
              onHome={onHome}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <header className="bg-[#0a0a0a] border-b border-[#1a1a1a] px-4 py-3 flex items-center gap-3">
        <button
          onClick={onHome}
          className="text-gray-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest flex items-center gap-1.5"
        >
          ← Inicio
        </button>
        <div className="flex-1 flex flex-col items-center">
          <span className="text-sm font-black tracking-tight">
            <span className="text-yellow-400">F1</span>{' '}
            <span className="text-white">PYRAMID</span>
          </span>
          <span className="text-[10px] text-gray-500 font-semibold">Categoría: {category.label}</span>
        </div>
        <div className="w-16" />
      </header>

      {/* Progress bar */}
      {phase === 'placing' && (
        <div className="h-1 bg-[#1a1a1a]">
          <div
            className="h-1 bg-yellow-500 transition-all duration-300"
            style={{ width: `${(currentPilotIdx / TOTAL_SLOTS) * 100}%` }}
          />
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          {phase === 'placing' && (
            <PlacingPhase
              pilots={pilots}
              category={category}
              placed={placed}
              currentPilotIdx={currentPilotIdx}
              onPlace={handlePlace}
            />
          )}
          {phase === 'arranging' && (
            <ArrangingPhase
              pilots={pilots}
              category={category}
              placed={placed as string[]}
              onSwap={handleSwap}
              onCheck={handleCheck}
              onReveal={handleReveal}
              checkResult={checkResult}
              checkUsed={checkUsed}
            />
          )}
        </div>
      </div>
    </div>
  );
}
