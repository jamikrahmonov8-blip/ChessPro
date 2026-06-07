'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/utils/firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Trophy, Swords, MessageSquare, X, Clock, Cpu, UserCheck, UserX, UserPlus } from 'lucide-react';

export default function FriendsPage() {
  const router = useRouter();
  
  // Вкладка: 'list' — список друзей, 'requests' — входящие запросы
  const [activeTab, setActiveTab] = useState<'list' | 'requests'>('list');
  
  const [friends, setFriends] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Состояния для модалки вызова на шахматный матч
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<any>(null);

  const currentUser = auth?.currentUser;

  useEffect(() => {
    if (!currentUser || !db) return;

    // 1. Стрим списка подтвержденных друзей
    const friendsRef = collection(db, 'profiles', currentUser.uid, 'friends');
    const unsubscribeFriends = onSnapshot(friendsRef, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setFriends(list);
    });

    // 2. Стрим входящих запросов в друзья
    const requestsRef = collection(db, 'profiles', currentUser.uid, 'friend_requests');
    const unsubscribeRequests = onSnapshot(requestsRef, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setRequests(list);
      setLoading(false);
    });

    return () => {
      unsubscribeFriends();
      unsubscribeRequests();
    };
  }, [currentUser]);

  // 👍 ОДОБРЕНИЕ ЗАПРОСА В ДРУЗЬЯ
  const acceptFriendRequest = async (request: any) => {
    if (!currentUser || !db) return;

    try {
      // Получаем профиль текущего юзера, чтобы записать его данные собеседнику
      const myProfileSnap = await getDoc(doc(db, 'profiles', currentUser.uid));
      const myData = myProfileSnap.exists() ? myProfileSnap.data() : {};

      // Шаг А: Добавляем собеседника в свой список друзей
      await setDoc(doc(db, 'profiles', currentUser.uid, 'friends', request.id), {
        username: request.username,
        rating: request.rating || 1200,
        acceptedAt: new Date().toISOString()
      });

      // Шаг Б: Добавляем себя в список друзей собеседника (Взаимность!)
      await setDoc(doc(db, 'profiles', request.id, 'friends', currentUser.uid), {
        username: myData.username || 'Игрок',
        rating: myData.rating || 1200,
        acceptedAt: new Date().toISOString()
      });

      // Шаг В: Удаляем запрос из входящих, так как он выполнен
      await deleteDoc(doc(db, 'profiles', currentUser.uid, 'friend_requests', request.id));

    } catch (err) {
      console.error("Ошибка при принятии в друзья:", err);
    }
  };

  // 👎 ОТКЛОНЕНИЕ ЗАПРОСА В ДРУЗЬЯ
  const declineFriendRequest = async (requestId: string) => {
    if (!currentUser || !db) return;
    await deleteDoc(doc(db, 'profiles', currentUser.uid, 'friend_requests', requestId));
  };

  // Вызов на дуэль
  const sendGameInvite = async (seconds: number) => {
    if (!currentUser || !selectedFriend || !db) return;

    const inviteId = `invite_${currentUser.uid}_${Date.now()}`;
    await setDoc(doc(db, 'invites', inviteId), {
      id: inviteId,
      fromUid: currentUser.uid,
      fromUsername: currentUser.email?.split('@')[0] || 'Игрок',
      toUid: selectedFriend.id,
      timeControl: seconds,
      status: 'pending',
      createdAt: new Date().toISOString()
    });

    setIsModalOpen(false);
    router.push(`/game?time=${seconds}&role=host&inviteId=${inviteId}`);
  };

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Синхронизация списков...</div>;

  return (
    <main className="min-h-full flex flex-col items-center p-12 max-w-4xl mx-auto w-full space-y-6 relative z-10">
      
      {/* Шапка страницы */}
      <div className="w-full text-center sm:text-left flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full font-black uppercase tracking-wider">Сообщество</span>
          <h2 className="text-2xl font-black tracking-tight mt-2">Управление контактами</h2>
        </div>
        
        {/* ТАБЫ ПЕРЕКЛЮЧЕНИЯ (Chess.com Style) */}
        <div className="flex bg-slate-900/60 p-1 rounded-xl border border-slate-800 shrink-0">
          <button 
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2 text-xs font-black rounded-lg transition-all flex items-center gap-1.5 ${activeTab === 'list' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
          >
            <Users size={14} /> Мои друзья ({friends.length})
          </button>
          <button 
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2 text-xs font-black rounded-lg transition-all flex items-center gap-1.5 relative ${activeTab === 'requests' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
          >
            <UserPlus size={14} /> Запросы
            {requests.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white font-mono font-black text-[9px] rounded-full flex items-center justify-center animate-pulse">
                {requests.length}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="w-full h-px bg-slate-900" />

      {/* ОТОБРАЖЕНИЕ СТРАНИЦЫ В ЗАВИСИМОСТИ ОТ ТАБА */}
      <div className="w-full space-y-2.5">
        
        {/* ВКЛАДКА 1: СПИСОК УЖЕ ПОДТВЕРЖДЕННЫХ ДРУЗЕЙ */}
        {activeTab === 'list' && (
          <>
            {friends.length === 0 && (
              <div className="p-8 bg-slate-900/20 border border-slate-900/60 rounded-2xl text-center text-sm text-slate-500">
                Ваш список друзей пока пуст. Найдите соперников через «Поиск игроков».
              </div>
            )}
            {friends.map((friend) => (
              <motion.div key={friend.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 bg-slate-950/60 border border-slate-900 rounded-2xl flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-black text-sm uppercase">{friend.username?.[0]}</div>
                  <div>
                    <h4 className="font-bold text-sm text-white">{friend.username}</h4>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5"><Trophy size={12} className="text-amber-500" /> {friend.rating || 1200} ELO</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => router.push(`/dashboard/messages?chatWith=${friend.id}`)} className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-300 transition-colors"><MessageSquare size={16} /></button>
                  <button onClick={() => { setSelectedFriend(friend); setIsModalOpen(true); }} className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-md"><Swords size={14} /> ВЫЗВАТЬ</button>
                </div>
              </motion.div>
            ))}
          </>
        )}

        {/* ВКЛАДКА 2: ВХОДЯЩИЕ ЗАПРОСЫ (ТО, О ЧЕМ ТЫ ПРОСИЛ!) */}
        {activeTab === 'requests' && (
          <>
            {requests.length === 0 && (
              <div className="p-8 bg-slate-900/20 border border-slate-900/60 rounded-2xl text-center text-sm text-slate-500">
                Нет новых входящих запросов в друзья.
              </div>
            )}
            {requests.map((req) => (
              <motion.div key={req.id} initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="p-4 bg-slate-900/40 border-2 border-emerald-500/20 rounded-2xl flex items-center justify-between shadow-lg backdrop-blur-md">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 font-black text-sm uppercase">{req.username?.[0]}</div>
                  <div>
                    <span className="text-[9px] text-amber-400 font-bold uppercase tracking-wider">Хочет в друзья</span>
                    <h4 className="font-bold text-sm text-white mt-0.5">{req.username}</h4>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5"><Trophy size={11} className="text-amber-500" /> {req.rating || 1200} ELO</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => acceptFriendRequest(req)}
                    className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs rounded-xl transition-all flex items-center gap-1 shadow-md shadow-emerald-500/10"
                  >
                    <UserCheck size={14} strokeWidth={2.5} /> ПРИНЯТЬ
                  </button>
                  <button 
                    onClick={() => declineFriendRequest(req.id)}
                    className="p-2 bg-slate-950 hover:bg-red-500/10 hover:text-red-400 text-slate-500 border border-slate-800 rounded-xl transition-colors"
                  >
                    <UserX size={14} />
                  </button>
                </div>
              </motion.div>
            ))}
          </>
        )}
      </div>

      {/* Модалка вызова на дуэль */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-md bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6 shadow-2xl relative">
              <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"><X size={18} /></button>
              <div>
                <h3 className="text-lg font-black tracking-tight flex items-center gap-2"><Clock className="text-emerald-400" size={20} /> Контроль времени дуэли</h3>
                <p className="text-xs text-slate-400 mt-1">Выберите время на партию для вызова игрока {selectedFriend?.username}.</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[{ name: 'Пуля 1 мин', secs: 60 }, { name: 'Блиц 3 мин', secs: 180 }, { name: 'Блиц 5 мин', secs: 300 }, { name: 'Рапид 10 мин', secs: 600 }].map((time) => (
                  <button key={time.secs} onClick={() => sendGameInvite(time.secs)} className="p-3.5 bg-slate-950 border border-slate-800 hover:border-emerald-500/40 rounded-xl font-bold text-xs text-center transition-all flex items-center justify-center gap-1.5 text-slate-200"><Cpu size={14} className="text-slate-500" />{time.name}</button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}