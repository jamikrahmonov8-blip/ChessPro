'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';

const GameContent = dynamic(() => import('@/components/chess/GameContent'), {
  loading: () => <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Запуск игры...</div>,
  ssr: false
});

export default function GamePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Запуск игры...</div>}>
      <GameContent />
    </Suspense>
  );
}