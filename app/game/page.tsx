'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth, db } from '@/utils/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import ChessGame from '@/components/chess/ChessGame';
import { Clock, ChevronLeft, ShieldCheck, Play, CheckCircle2, XCircle } from 'lucide-react';

export default function GamePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Берем время из квери-параметра, по умолчанию 10 минут (600 сек)
  const timeParam = searchParams.get('time');
  const initialTime = timeParam ? parseInt(timeParam, 10) : 600;

  const [userProfile, setUserProfile] = useState<any>(null);
  const [userUid, setUserUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [playerTime, setPlayerTime] = useState<number>(initialTime);
  const [aiTime, setAiTime] = useState<number>(initialTime);
  const [activeTurn, setActiveTurn] = useState<'w' | 'b'>('w');
  const [gameStatus, setGameStatus] = useState<string>('Ваш ход');
  const [isGameOver, setIsGameOver] = useState(false);

  const timerRef = useRef<any>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserUid(user.uid);
        onSnapshot(doc(db, 'profiles', user.uid), (snap) => {
          if (snap.exists()) setUserProfile(snap.data());
          setLoading(false);
        });
      } else {
        router.push('/login');
      }
    });
    return () => unsubscribeAuth();
  }, [router]);

  useEffect(() => {
    if (loading || isGameOver) return;

    timerRef.current = setInterval(() => {
      if (activeTurn === 'w') {
        setPlayerTime((prev) => {
          if (prev <= 1) { handleTimeOut(false); return 0; }
          return prev - 1;
        });
      } else {
        setAiTime((prev) => {
          if (prev <= 1) { handleTimeOut(true); return 0; }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [loading, isGameOver, activeTurn]);

  const pushResultsToProfile = async (playerWon: boolean, isDrawResult: boolean) => {
    if (!userUid || !userProfile) return;
    const docRef = doc(db, 'profiles', userUid);
    const ratingChange = isDrawResult ? 0 : (playerWon ? 16 : -12);

    await updateDoc(docRef, {
      rating: Math.max(100, (userProfile.rating || 1200) + ratingChange),
      gamesPlayed: (userProfile.gamesPlayed || 0) + 1,
      gamesWon: playerWon && !isDrawResult ? (userProfile.gamesWon || 0) + 1 : (userProfile.gamesWon || 0)
    });
  };

  const handleTimeOut = async (playerWon: boolean) => {
    setIsGameOver(true);
    clearInterval(timerRef.current);
    setGameStatus(playerWon ? 'Победа! У ИИ вышло время.' : 'Поражение! Время вышло.');
    await pushResultsToProfile(playerWon, false);
  };

  const onMoveMade = async (nextTurn: 'w' | 'b', latestFen: string, statusText: string, isOver: boolean, playerWon?: boolean) => {
    setActiveTurn(nextTurn);
    setGameStatus(statusText);

    if (isOver) {
      setIsGameOver(true);
      clearInterval(timerRef.current);
      if (playerWon !== undefined) {
        await pushResultsToProfile(playerWon, false);
      }
    }
  };

  const formatTime = (timeInSecs: number) => {
    const mins = Math.floor(timeInSecs / 60);
    const secs = timeInSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Запуск игры...</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-12 relative font-sans">
      <button onClick={() => router.push('/dashboard')} className="absolute top-10 left-10 flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors">
        <ChevronLeft size={14} /> Сдаться и выйти
      </button>

      <div className="flex items-center justify-center gap-12 w-full max-w-6xl">
        <div className="w-full max-w-[540px] flex flex-col gap-3">
          {/* БОТ */}
          <div className="flex items-center justify-between px-4 py-2 bg-slate-900/40 border border-slate-800/40 rounded-xl backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-red-500/10 border border-red-500/20 text-red-400 rounded-md flex items-center justify-center text-xs font-bold">AI</div>
              <span className="text-sm font-bold text-slate-300">Вражеский ИИ-Бот</span>
            </div>
            <div className={`px-3 py-1 font-mono font-bold text-sm rounded-lg flex items-center gap-1.5 ${activeTurn === 'b' ? 'bg-amber-500 text-slate-950 animate-pulse' : 'bg-slate-950 text-slate-400'}`}>
              <Clock size={12} /> {formatTime(aiTime)}
            </div>
          </div>

          {/* КОМПОНЕНТ ДОСКИ (Вручную передаем заглушку вместо ID) */}
          <ChessGame 
            gameId="local_singleplayer" 
            activeTurn={activeTurn} 
            onMoveMade={onMoveMade} 
            boardTheme={userProfile?.boardTheme || 'classic'} 
          />

          {/* ИГРОК */}
          <div className="flex items-center justify-between px-4 py-2 bg-slate-900/40 border border-slate-800/40 rounded-xl backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-md flex items-center justify-center text-xs font-bold uppercase">{userProfile?.username?.[0]}</div>
              <span className="text-sm font-bold text-slate-100">{userProfile?.username} <span className="text-[11px] text-amber-500">({userProfile?.rating})</span></span>
            </div>
            <div className={`px-3 py-1 font-mono font-bold text-sm rounded-lg flex items-center gap-1.5 ${activeTurn === 'w' ? 'bg-emerald-500 text-slate-950 font-black' : 'bg-slate-950 text-slate-400'}`}>
              <Clock size={12} /> {formatTime(playerTime)}
            </div>
          </div>
        </div>

        {/* Правая плашка статуса */}
        <div className="w-80 bg-slate-900/40 border border-slate-800 rounded-3xl p-6 backdrop-blur-2xl flex flex-col justify-between h-[540px]">
          <div className="space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2"><ShieldCheck className="text-emerald-400" size={18} /> ТРЕНИРОВКА</h3>

            <div className={`p-4 rounded-2xl border flex items-center gap-3 transition-colors ${
              isGameOver ? gameStatus.includes('Победа') || gameStatus.includes('победили') ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-slate-950/40 border-slate-800/60 text-slate-300'
            }`}>
              {isGameOver ? (gameStatus.includes('Победа') || gameStatus.includes('победили') ? <CheckCircle2 size={20} /> : <XCircle size={20} />) : <Play size={18} className="text-emerald-400 animate-pulse" />}
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Статус</div>
                <div className="text-sm font-bold mt-0.5">{gameStatus}</div>
              </div>
            </div>
          </div>

          <button onClick={() => router.push('/dashboard')} className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 rounded-xl transition-all border border-slate-700">
            ВЕРНУТЬСЯ В ХАБ
          </button>
        </div>
      </div>
    </div>
  );
}