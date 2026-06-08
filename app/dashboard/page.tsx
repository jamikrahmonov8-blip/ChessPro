'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/utils/firebase';
import { doc, onSnapshot, collection, setDoc, getDocs, query, where, limit, updateDoc, deleteDoc } from 'firebase/firestore';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { 
  PlusSquare, History, Users, ChevronDown, 
  Settings, MessageSquare, Trophy 
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [dummyGame] = useState(new Chess()); // Доска для превью на главном экране
  const [activeSubTab, setActiveSubTab] = useState<'new' | 'history' | 'players'>('new');
  const [selectedTime, setSelectedTime] = useState({ name: '10 мин. (Рапид)', secs: 600 });
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
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

  // ⚡ УМНЫЙ МАТЧМЕЙКИНГ ДЛЯ СЛУЧАЙНОГО ПОИСКА
  const handleStartGame = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const invitesRef = collection(db, 'invites');

      // 1. Очищаем свои старые pending-комнаты, чтобы не засорять базу данных
      const myOldRooms = query(
        invitesRef,
        where('fromUid', '==', user.uid),
        where('status', '==', 'pending')
      );
      const myOldSnap = await getDocs(myOldRooms);
      await Promise.all(myOldSnap.docs.map(d => deleteDoc(doc(db, 'invites', d.id))));

      // 2. Ищем чужую свободную комнату С ТЕМ ЖЕ КОНТРОЛЕМ ВРЕМЕНИ
      const q = query(
        invitesRef,
        where('status', '==', 'pending'),
        where('toUid', '==', null),
        where('timeControl', '==', selectedTime.secs), // Игроки должны совпадать по таймингу
        limit(10)
      );
      const querySnapshot = await getDocs(q);
      const foreignRoom = querySnapshot.docs.find(
        (d) => d.data().fromUid !== user.uid
      );

      if (foreignRoom) {
        // Заходим как гость (черные) — сразу обновляем Firestore
        await updateDoc(doc(db, 'invites', foreignRoom.id), {
          toUid: user.uid,
          toUsername: userProfile?.username || 'Гость',
          status: 'accepted'
        });
        
        // Перенаправляем в игру. GameContent сам перевернет доску на основе UID!
        router.push(`/game?inviteId=${foreignRoom.id}`);
        return;
      }

      // 3. Если свободных комнат с таким временем нет — создаём свою
      const newInviteRef = doc(collection(db, 'invites'));
      const inviteId = newInviteRef.id;

      await setDoc(newInviteRef, {
        id: inviteId,
        fromUid: user.uid,
        fromUsername: userProfile?.username || 'Игрок',
        toUid: null,
        status: 'pending',
        timeControl: selectedTime.secs,
        currentFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        createdAt: new Date().toISOString()
      });

      router.push(`/game?inviteId=${inviteId}`);

    } catch (error) {
      console.error('Ошибка матчмейкинга:', error);
    }
  };

  const timeOptions = [
    { name: '3 мин. (Блиц)', secs: 180 },
    { name: '5 мин. (Блиц)', secs: 300 },
    { name: '10 мин. (Рапид)', secs: 600 },
    { name: '30 мин. (Рапид)', secs: 1800 },
  ];

  return (
    <main className="p-6 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10 items-center min-h-[calc(100vh-80px)]">
      
      {/* 🧩 ЛЕВАЯ СТОРОНА: Шахматное поле и Профили (Chess.com Стиль) */}
      <div className="lg:col-span-7 flex flex-col items-center gap-2 w-full max-w-[530px] mx-auto">
        {/* Противник сверху */}
        <div className="w-full flex items-center justify-between px-2 text-slate-400">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-slate-900 rounded border border-slate-800 flex items-center justify-center font-bold text-xs">🤖</div>
            <span className="text-xs font-black tracking-wide text-slate-200">Ожидание соперника</span>
          </div>
          <div className="bg-slate-900/60 border border-slate-800/80 font-mono font-bold text-sm px-3 py-1 rounded text-slate-300">10:00</div>
        </div>

        {/* Доска */}
        <div className="p-2.5 bg-slate-900/20 rounded-3xl border border-slate-900 shadow-2xl backdrop-blur-sm overflow-hidden w-full aspect-square">
          <Chessboard
            position={dummyGame.fen()}
            arePiecesDraggable={false}
            animationDuration={150}
            customDarkSquareStyle={{ backgroundColor: '#b58863' }}
            customLightSquareStyle={{ backgroundColor: '#f0d9b5' }}
            boardWidth={504}
          />
        </div>

        {/* Текущий игрок снизу */}
        <div className="w-full flex items-center justify-between px-2 text-slate-400">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-emerald-500/10 rounded border border-emerald-500/20 overflow-hidden flex items-center justify-center text-[10px] font-black text-emerald-400 uppercase shrink-0">
              {userProfile?.photoURL ? (
                <img src={userProfile.photoURL} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                userProfile?.username?.[0]
              )}
            </div>
            <span className="text-xs font-black tracking-wide text-white truncate max-w-[140px]">{userProfile?.username || 'Игрок'}</span>
            <span className="text-[10px] font-bold text-amber-400">({userProfile?.rating || 1200})</span>
            {userProfile?.role === 'admin' && (
              <span className="text-[8px] bg-red-500/10 text-red-400 border border-red-500/20 px-1 rounded font-black">ROOT</span>
            )}
          </div>
          <div className="bg-slate-900/60 border border-slate-800/80 font-mono font-bold text-sm px-3 py-1 rounded text-white">10:00</div>
        </div>
      </div>

      {/* ⚡ ПРАВАЯ СТОРОНА: Меню запуска партий */}
      <div className="lg:col-span-5 bg-slate-900/30 border border-slate-900/60 rounded-3xl p-6 backdrop-blur-xl shadow-2xl h-[530px] flex flex-col justify-between max-w-md w-full mx-auto">
        <div className="space-y-6 relative">
          
          {/* Навигация подвкладок */}
          <div className="grid grid-cols-3 border-b border-slate-900/80 text-center text-xs font-black uppercase tracking-wider pb-1">
            <button onClick={() => setActiveSubTab('new')} className={`pb-2.5 flex flex-col items-center gap-1.5 transition-all ${activeSubTab === 'new' ? 'text-white border-b-2 border-emerald-500' : 'text-slate-500 hover:text-slate-300'}`}><PlusSquare size={16} /> Новая партия</button>
            <button onClick={() => setActiveSubTab('history')} className={`pb-2.5 flex flex-col items-center gap-1.5 transition-all ${activeSubTab === 'history' ? 'text-white border-b-2 border-emerald-500' : 'text-slate-500 hover:text-slate-300'}`}><History size={16} /> Партии</button>
            <button onClick={() => setActiveSubTab('players')} className={`pb-2.5 flex flex-col items-center gap-1.5 transition-all ${activeSubTab === 'players' ? 'text-white border-b-2 border-emerald-500' : 'text-slate-500 hover:text-slate-300'}`}><Users size={16} /> Шахматисты</button>
          </div>

          {activeSubTab === 'new' && (
            <div className="space-y-3 pt-2">
              
              {/* Селектор контроля времени */}
              <div className="relative">
                <button 
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="w-full bg-slate-950/60 border border-slate-800 hover:border-slate-700 p-4 rounded-2xl flex items-center justify-between text-sm font-black transition-all"
                >
                  <span className="flex items-center gap-2.5 text-slate-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    {selectedTime.name}
                  </span>
                  <ChevronDown size={16} className={`text-slate-500 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden z-50 shadow-2xl p-1.5 space-y-1">
                    {timeOptions.map((option) => (
                      <button
                        key={option.secs}
                        onClick={() => {
                          setSelectedTime(option);
                          setShowDropdown(false);
                        }}
                        className="w-full text-left px-4 py-3 text-xs font-bold rounded-xl text-slate-400 hover:text-white hover:bg-emerald-500/10 transition-colors"
                      >
                        {option.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 🟢 КНОПКА ЗАПУСКА МАТЧА */}
              <button 
                onClick={handleStartGame}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-base font-black py-4 rounded-2xl transition-all shadow-xl shadow-emerald-500/10 active:scale-[0.98] tracking-wide uppercase"
              >
                Начать партию
              </button>

              <div className="p-3.5 bg-slate-950/40 border border-slate-900 rounded-xl flex items-center gap-3 opacity-50 cursor-not-allowed">
                <Settings size={16} className="text-slate-400" />
                <span className="text-xs font-bold text-slate-400">Нестандартные условия</span>
              </div>

              <div className="p-3.5 bg-slate-950/40 border border-slate-900 rounded-xl flex items-center gap-3 opacity-50 cursor-not-allowed">
                <MessageSquare size={16} className="text-emerald-400" />
                <span className="text-xs font-bold text-slate-400">Играть с другом (Вызов из профиля друга)</span>
              </div>

              <div className="p-3.5 bg-slate-950/40 border border-slate-900 rounded-xl flex items-center gap-3 opacity-50 cursor-not-allowed">
                <Trophy size={16} className="text-amber-500" />
                <span className="text-xs font-bold text-slate-400">Турниры Арены</span>
              </div>

            </div>
          )}

          {activeSubTab === 'history' && (
            <p className="text-xs text-slate-500 text-center py-12">Перейдите в раздел профиля для просмотра истории партий.</p>
          )}
          {activeSubTab === 'players' && (
            <p className="text-xs text-slate-500 text-center py-12">Используйте вкладку «Поиск игроков» в левом боковом меню.</p>
          )}

        </div>

        <div className="flex items-center justify-between border-t border-slate-900/80 pt-4 text-[10px] text-slate-500 font-mono">
          <span>CHESS.PRO ENGINE</span>
          <span className="text-emerald-400/80 font-bold">172 819 НА АРЕНЕ</span>
        </div>
      </div>

    </main>
  );
}