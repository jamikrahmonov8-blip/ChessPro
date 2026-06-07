'use client';

import { useEffect, useState } from 'react';
import { auth, db } from '@/utils/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';
import { Trophy, Users, History, MessageSquare, Mail, Settings, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function MyProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [friends, setFriends] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const uid = user.uid;

        // 1. Стрим данных профиля в реальном времени
        const unsubscribeProfile = onSnapshot(doc(db, 'profiles', uid), (snap) => {
          if (snap.exists()) {
            setProfile(snap.data());
          }
          setLoading(false);
        });

        // 2. Получение друзей 
        const friendsQuery = query(collection(db, 'profiles'), where('friends', 'array-contains', uid));
        getDocs(friendsQuery).then((snapshot) => {
          const friendsList: any[] = [];
          snapshot.forEach((docSnap) => {
            friendsList.push({ id: docSnap.id, ...docSnap.data() });
          });
          setFriends(friendsList);
        }).catch(err => console.error("Ошибка загрузки друзей:", err));

        // 3. Получение истории матчей
        const historyQuery = query(collection(db, 'matches'), where('players', 'array-contains', uid));
        getDocs(historyQuery).then((snapshot) => {
          const historyList: any[] = [];
          snapshot.forEach((docSnap) => {
            historyList.push(docSnap.data());
          });
          setHistory(historyList);
        }).catch(err => console.error("Ошибка загрузки истории:", err));

        return () => {
          unsubscribeProfile();
        };
      }
    });

    return () => unsubscribeAuth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white gap-4">
        <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
        <p className="text-slate-400 font-medium text-sm">Загрузка профиля...</p>
      </div>
    );
  }

  return (
    <div className="p-12 max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
      
      {/* ЛЕВАЯ ЧАСТЬ: Главная карточка игрока */}
      <div className="md:col-span-1 bg-slate-900/30 border border-slate-900/60 p-6 rounded-3xl flex flex-col items-center text-center backdrop-blur-xl shadow-2xl relative overflow-hidden group">
        
        {/* Аватарка, поддерживающая кастомное фото или первую букву */}
        <div className="w-24 h-24 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400 font-black text-4xl uppercase relative shadow-inner overflow-hidden shrink-0">
          {profile?.photoURL ? (
            <img src={profile.photoURL} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            profile?.username?.[0]
          )}
          {/* Пульсирующий индикатор онлайна (Червячок) */}
          <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-3 border-slate-950 z-10 ${profile?.isOnline ? 'bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/50' : 'bg-slate-600'}`} />
        </div>

        {/* Имя пользователя и бейдж роли */}
        <h2 className="text-xl font-black mt-5 flex items-center justify-center gap-2 tracking-tight text-white w-full px-2 truncate">
          {profile?.username}
          {profile?.role === 'admin' && (
            <span className="text-[9px] bg-red-500/10 text-red-400 px-2 py-0.5 font-black rounded border border-red-500/20 uppercase tracking-widest shrink-0">ROOT</span>
          )}
        </h2>

        {/* ELO Рейтинг */}
        <div className="text-xs text-amber-400 font-bold flex items-center gap-1.5 mt-2 bg-amber-500/5 border border-amber-500/10 px-3 py-1 rounded-full">
          <Trophy size={13} /> {profile?.rating || 1200} ELO
        </div>

        {/* ⚙️ КНОПКА EDIT (РЕДАКТИРОВАТЬ ПРОФИЛЬ) */}
        <Link 
          href="/dashboard/profile/edit"
          className="w-full mt-5 py-3 bg-slate-950/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 text-slate-200 active:scale-[0.98]"
        >
          <Settings size={14} className="text-emerald-400 animate-spin-slow" /> 
          РЕДАКТИРОВАТЬ ПРОФИЛЬ
        </Link>

        {/* Дополнительная инфа */}
        <div className="w-full mt-5 pt-5 border-t border-slate-900 space-y-2.5 text-left text-xs text-slate-400">
          <div className="flex items-center gap-2 text-slate-400 truncate">
            <Mail size={14} className="text-slate-500 shrink-0" />
            <span className="truncate">{profile?.email || 'Почта не привязана'}</span>
          </div>
          <div className="flex items-center gap-2 text-emerald-400 font-bold">
            <Trophy size={14} className="text-emerald-500 shrink-0" />
            <span>Турнирные очки: <span className="font-mono text-sm text-white ml-0.5">{profile?.tournamentPoints || 0}</span></span>
          </div>
        </div>
      </div>

      {/* ПРАВАЯ ЧАСТЬ: Списки друзей и истории */}
      <div className="md:col-span-2 space-y-6">
        
        {/* БЛОК ДРУЗЕЙ */}
        <div className="bg-slate-900/20 border border-slate-900/60 rounded-3xl p-6 backdrop-blur-xl shadow-xl">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-2 mb-4">
            <Users size={15} className="text-emerald-400" /> Друзья арены
          </h3>
          
          {friends.length === 0 ? (
            <p className="text-xs text-slate-500 py-2">Список друзей пока пуст.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {friends.map((friend) => (
                <div key={friend.id} className="p-3 bg-slate-950/40 border border-slate-900 rounded-xl flex items-center justify-between transition-all hover:border-slate-800">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${friend.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`} />
                    <span className="text-xs font-bold text-slate-200 truncate">{friend.username}</span>
                  </div>
                  
                  <Link 
                    href="/dashboard/messages" 
                    className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-emerald-400 hover:border-emerald-500/20 transition-all active:scale-95"
                  >
                    <MessageSquare size={13} />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* БЛОК ИСТОРИИ МАТЧЕЙ */}
        <div className="bg-slate-900/20 border border-slate-900/60 rounded-3xl p-6 backdrop-blur-xl shadow-xl">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-2 mb-4">
            <History size={15} className="text-emerald-400" /> История сражений
          </h3>
          
          {history.length === 0 ? (
            <p className="text-xs text-slate-500 py-2">Вы еще не сыграли ни одного матча.</p>
          ) : (
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {history.map((match, idx) => (
                <div key={idx} className="p-3.5 bg-slate-950/30 border border-slate-900 rounded-xl flex items-center justify-between text-xs transition-colors hover:bg-slate-950/50">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-slate-800" />
                    <span className="font-bold text-slate-300">Противник: {match.opponentName || 'Игрок Арены'}</span>
                  </div>
                  <span className={`font-black uppercase tracking-wider text-[10px] px-2 py-0.5 rounded ${
                    match.result === 'win' 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10' 
                      : 'bg-red-500/10 text-red-400 border border-red-500/10'
                  }`}>
                    {match.result === 'win' ? 'Победа' : 'Поражение'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}