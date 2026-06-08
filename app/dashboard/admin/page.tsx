'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/utils/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, onSnapshot, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { Shield, Users, Play, Trash2, Ban, MessageSquareOff, ExternalLink } from 'lucide-react';

export default function AdminDashboard() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Проверка прав суперпользователя (ROOT ACCESS)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, 'profiles', user.uid));
        if (userDoc.exists() && userDoc.data().role === 'admin') {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
          router.push('/dashboard');
        }
      } else {
        router.push('/login');
      }
    });
    return () => unsubscribe();
  }, [router]);

  // 2. Реалтайм стрим всей базы пользователей Арены
  useEffect(() => {
    if (isAdmin !== true) return;
    
    return onSnapshot(collection(db, 'profiles'), (snapshot) => {
      const userList: any[] = [];
      snapshot.forEach((docSnap) => {
        userList.push({ id: docSnap.id, ...docSnap.data() });
      });
      setUsers(userList);
      setLoading(false);
    });
  }, [isAdmin]);

  // 🔥 МГНОВЕННЫЙ БАН (С жесткой проверкой дефолтного значения)
  const handleToggleBan = async (userId: string, currentBanStatus: any) => {
    try {
      // Если значения нет в базе (undefined), берем за основу false
      const isCurrentlyBanned = currentBanStatus === true; 
      
      await updateDoc(doc(db, 'profiles', userId), { 
        isBanned: !isCurrentlyBanned 
      });
    } catch (err) {
      console.error("Ошибка при изменении статуса бана:", err);
    }
  };

  // 🤫 МГНОВЕННЫЙ МУТ ЧАТА (С жесткой проверкой дефолтного значения)
  const handleToggleMute = async (userId: string, currentMuteStatus: any) => {
    try {
      // Если значения нет в базе (undefined), берем за основу false
      const isCurrentlyMuted = currentMuteStatus === true;

      await updateDoc(doc(db, 'profiles', userId), { 
        isMuted: !isCurrentlyMuted 
      });
    } catch (err) {
      console.error("Ошибка при изменении статуса мута:", err);
    }
  };

  // ❌ ПОЛНОЕ УДАЛЕНИЕ ПРОФИЛЯ
  const handleDeleteUser = async (userId: string) => {
    if (confirm('Внимание! Вы уверены, что хотите полностью удалить этого игрока из базы данных сервера?')) {
      try {
        await deleteDoc(doc(db, 'profiles', userId));
      } catch (err) {
        console.error("Ошибка при удалении пользователя:", err);
      }
    }
  };

  // 🏆 СОЗДАНИЕ ТУРНИРА
  const handleCreateTournament = async () => {
    try {
      await addDoc(collection(db, 'tournaments'), {
        status: 'pending',
        title: 'Очковый турнир CHESS.PRO 🏆',
        createdAt: new Date().toISOString(),
        players: []
      });
      alert('Киберспортивный турнир успешно инициализирован в базе!');
    } catch (err) {
      console.error("Ошибка создания турнира:", err);
    }
  };

  if (isAdmin === null || loading) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white gap-3 font-mono">
      <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
      <p className="text-xs font-black uppercase tracking-widest text-slate-500">Авторизация в командном центре...</p>
    </div>
  );

  return (
    <div className="p-12 max-w-6xl mx-auto space-y-8 relative z-10 font-sans select-none">
      
      {/* Шапка управления */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-6">
        <div>
          <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-1 rounded-full font-black uppercase tracking-wider flex items-center gap-1 w-fit">
            <Shield size={10} /> ROOT ACCESS SECURED
          </span>
          <h1 className="text-3xl font-black tracking-tight mt-2 text-white uppercase">Командный центр</h1>
        </div>
        <button 
          onClick={handleCreateTournament} 
          className="px-5 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-orange-500/10 transition-all active:scale-95 uppercase tracking-wider"
        >
          <Play size={14} fill="currentColor" /> Создать новый tournament
        </button>
      </div>

      {/* Основная таблица модерации */}
      <div className="bg-slate-900/10 border border-slate-900 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl">
        <div className="p-5 bg-slate-900/30 border-b border-slate-900 text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <Users size={14} className="text-red-400" /> Управление учетными записями арены ({users.length})
        </div>
        
        <div className="divide-y divide-slate-900/60">
          {users.map((user) => (
            <div key={user.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-900/5 transition-colors">
              
              {/* Левая сторона: Инфо об игроке */}
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center font-black text-slate-300 text-sm uppercase relative shrink-0">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="" className="w-full h-full object-cover rounded-2xl" />
                  ) : (
                    user.username?.[0]
                  )}
                  <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-3 border-slate-950 ${user.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
                </div>
                
                <div className="min-w-0 space-y-0.5">
                  <div className="font-black text-sm text-white flex flex-wrap items-center gap-2">
                    <span className="truncate">{user.username}</span>
                    {user.role === 'admin' && <span className="text-[8px] bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.2 rounded font-black tracking-widest">ROOT</span>}
                    {user.isBanned === true && <span className="text-[8px] bg-red-600/20 text-red-400 border border-red-500/30 px-1.5 py-0.2 rounded font-black tracking-wider uppercase">ЗАБАНЕН</span>}
                    {user.isMuted === true && <span className="text-[8px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.2 rounded font-black tracking-wider uppercase">МУТ ЧАТА</span>}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono truncate max-w-[280px]">UID: {user.id}</div>
                  <div className="text-[11px] font-bold text-amber-500 flex items-center gap-1">🏆 <span className="text-slate-300">Очки: {user.tournamentPoints || 0}</span> • <span className="text-slate-400">Рейтинг: {user.rating || 1200}</span></div>
                </div>
              </div>

              {/* Правая сторона: Кнопки точечных наказаний */}
              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                
                <button 
                  onClick={() => router.push(`/dashboard/search`)} 
                  className="p-2.5 bg-slate-950/60 border border-slate-800 hover:border-slate-700 rounded-xl hover:text-emerald-400 text-slate-400 transition-all active:scale-95"
                  title="Найти в поиске"
                >
                  <ExternalLink size={14} />
                </button>
                
                {/* 🤫 ПЕРЕКЛЮЧАТЕЛЬ МУТА ЧАТА (Строгая дебаг-проверка на true) */}
                <button 
                  onClick={() => handleToggleMute(user.id, user.isMuted)} 
                  disabled={user.role === 'admin'}
                  className={`p-2.5 rounded-xl border transition-all active:scale-95 disabled:opacity-20 disabled:cursor-not-allowed ${
                    user.isMuted === true 
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 font-black' 
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-amber-500'
                  }`}
                  title={user.isMuted === true ? "Снять мут чата" : "Выдать мут чата"}
                >
                  <MessageSquareOff size={14} />
                </button>
                
                {/* 🚫 ПЕРЕКЛЮЧАТЕЛЬ ПОЛНОГО БАНА (Строгая дебаг-проверка на true) */}
                <button 
                  onClick={() => handleToggleBan(user.id, user.isBanned)} 
                  disabled={user.role === 'admin'}
                  className={`p-2.5 rounded-xl border transition-all active:scale-95 disabled:opacity-20 disabled:cursor-not-allowed ${
                    user.isBanned === true 
                      ? 'bg-red-500/10 border-red-500/30 text-red-500 font-black' 
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-red-500'
                  }`}
                  title={user.isBanned === true ? "Разбанить аккаунт" : "Забанить аккаунт"}
                >
                  <Ban size={14} />
                </button>
                
                <button 
                  onClick={() => handleDeleteUser(user.id)} 
                  disabled={user.role === 'admin'}
                  className="p-2.5 bg-slate-950/60 border border-slate-800 hover:border-red-500/20 text-slate-400 hover:text-red-500 rounded-xl transition-all active:scale-95 disabled:opacity-20 disabled:cursor-not-allowed"
                  title="Удалить из системы"
                >
                  <Trash2 size={14} />
                </button>
              </div>

            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

function Loader2({ className, size = 16 }: { className?: string; size?: number }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width={size} height={size}>

      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );
}