import React from 'react';

export type RarityType = 'N' | 'R' | 'SR' | 'SSR' | 'UR';

const RARITY_STYLES: Record<RarityType, string> = {
  N: 'bg-slate-200 text-slate-700 border-slate-300',
  R: 'bg-sky-100 text-sky-700 border-sky-300',
  SR: 'bg-purple-100 text-purple-700 border-purple-300 shadow-sm',
  SSR: 'bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200 text-amber-950 border-amber-400 font-bold shadow-sm',
  UR: 'bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 text-white border-white font-extrabold shadow-md',
};

export function RarityBadge({ rarity }: { rarity: RarityType }) {
  return (
    <span
      className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs border tracking-wider ${RARITY_STYLES[rarity]}`}
    >
      {rarity}
    </span>
  );
}