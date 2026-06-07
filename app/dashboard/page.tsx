'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/utils/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { Clock, Cpu, ShieldCheck, Award, Zap, Users, Medal } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    // Используем текущего авторизованного пользователя из контекста Firebase
    if (!auth || !db) {
      router.push('/login');
      return;
    }

    const user = auth.currentUser;
    if (user) {
      const docRef = doc(db, 'profiles', user.uid);
      const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) setUserProfile(docSnap.data());
      });
      return () => unsubscribe();
    }
  }, [router]);

  const selectTimeControlAndPlay = (seconds: number) => {
    router.push(`/game?time=${seconds}`);
  };

  return (
    <main className="min-h-full flex flex-col md:flex-row items-center justify-center p-12 gap-10 max-w-6xl mx-auto w-full relative z-10">
      
      {/* 1. ЦЕНТРАЛЬНАЯ ЗОНА: ВЫБОР РЕЖИМОВ ИГРЫ */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="flex-1 w-full bg-slate-900/40 border border-slate-900 backdrop-blur-xl p-8 rounded-3xl space-y-6 shadow-2xl max-w-xl"
      >
        <div>
          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full font-black uppercase tracking-wider">Играть в шахматы</span>
          <h2 className="text-2xl font-black tracking-tight mt-2.5">Доступные арены</h2>
        </div>

        <div className="grid grid-cols-1 gap-3.5">
          {/* Режим: Робот/ИИ */}
          <div className="p-4 bg-slate-950/60 border border-slate-900 rounded-2xl space-y-3 shadow-inner">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400 border border-emerald-500/10">
                <Cpu size={20} />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">Одиночные Боты (ИИ)</h4>
                <p className="text-xs text-slate-400 mt-0.5">Выберите время блица или рапида и начните матч.</p>
              </div>
            </div>

            {/* Сетка быстрых таймингов */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              {[
                { name: 'Блиц 3 мин', secs: 180 },
                { name: 'Блиц 5 мин', secs: 300 },
                { name: 'Рапид 10 мин', secs: 600 },
                { name: 'Рапид 30 мин', secs: 1800 },
              ].map((timeOption) => (
                <button 
                  key={timeOption.secs} 
                  onClick={() => selectTimeControlAndPlay(timeOption.secs)} 
                  className="py-2.5 bg-slate-950 border border-slate-800/60 hover:border-emerald-500/30 rounded-xl font-bold text-xs text-center transition-all text-slate-300 hover:text-white hover:bg-emerald-500/5 active:scale-[0.99]"
                >
                  {timeOption.name}
                </button>
              ))}
            </div>
          </div>

          {/* Заблокированные мультиплеерные режимы */}
          {[
            { title: 'Играть по сети', desc: 'Рейтинговый подбор соперников по всему миру.', icon: Zap },
            { title: 'Играть с другом', desc: 'Пригласить друга в приватную игровую комнату.', icon: Users },
            { title: 'Турниры арены', desc: 'Глобальные киберспортивные швейцарские сетки.', icon: Medal },
          ].map((mode, idx) => (
            <div key={idx} className="p-4 bg-slate-950/20 border border-slate-900/60 rounded-2xl flex items-center justify-between opacity-35">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-slate-500">
                  <motion.div>
                    <mode.icon size={20} />
                  </motion.div>
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-400">{mode.title}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{mode.desc}</p>
                </div>
              </div>
              <span className="text-[9px] bg-slate-900 text-slate-600 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Скоро</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* 2. ПРАВАЯ ЗОНА: ЖИВАЯ СТАТИСТИКА И РАНГ */}
      <div className="w-full md:w-80 bg-slate-900/40 border border-slate-900 rounded-3xl p-6 backdrop-blur-xl flex flex-col justify-between h-[490px] shadow-2xl">
        <div className="space-y-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Clock className="text-emerald-400" size={16} /> Профиль Live
          </h3>

          {/* Карточки матчей из Firebase */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 bg-slate-950/50 border border-slate-800/40 rounded-2xl text-center shadow-sm">
              <div className="text-3xl font-black text-white tracking-tight">{userProfile?.gamesPlayed || 0}</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase mt-1">Всего партий</div>
            </div>
            <div className="p-4 bg-slate-950/50 border border-slate-800/40 rounded-2xl text-center shadow-sm">
              <div className="text-3xl font-black text-emerald-400 tracking-tight">{userProfile?.gamesWon || 0}</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase mt-1">Всего побед</div>
            </div>
          </div>

          {/* Текущий класс/ранг аккаунта */}
          <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl flex items-center gap-3 shadow-inner">
            <Award className="text-amber-500" size={22} />
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase">Ваш класс</div>
              <div className="text-sm font-black text-amber-400 capitalize mt-0.5">
                {userProfile?.chessLevel === 'beginner' && 'Начинающий'}
                {userProfile?.chessLevel === 'intermediate' && 'Средний'}
                {userProfile?.chessLevel === 'advanced' && 'Продвинутый'}
                {userProfile?.chessLevel === 'master' && 'Мастер'}
              </div>
            </div>
          </div>
        </div>

        <div className="p-3.5 bg-slate-950/40 border border-slate-900 rounded-xl text-center text-[11px] text-slate-500 font-mono">
          CHESS.PRO v1.0.0 • Бэкенд подключен
        </div>
      </div>

    </main>
  );
}