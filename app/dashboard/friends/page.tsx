'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/utils/firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, getDoc, updateDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Trophy, Swords, MessageSquare, X, Clock, Cpu, UserCheck, UserX, UserPlus, Loader2 } from 'lucide-react';

export default function FriendsPage() {
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<'list' | 'requests'>('list');
  const [friends, setFriends] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Контроль вызова на дуэль
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<any>(null);
  const [outgoingInviteId, setOutgoingInviteId] = useState<string | null>(null);

  const currentUser = auth?.currentUser;
  const unsubInviteRef = useRef<(() => void) | null>(null);

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
      if (unsubInviteRef.current) unsubInviteRef.current();
    };
  }, [currentUser]);

  // 👍 ОДОБРЕНИЕ ЗАПРОСА В ДРУЗЬЯ
  const acceptFriendRequest = async (request: any) => {
    if (!currentUser || !db) return;

    try {
      const myProfileSnap = await getDoc(doc(db, 'profiles', currentUser.uid));
      const myData = myProfileSnap.exists() ? myProfileSnap.data() : {};

      await setDoc(doc(db, 'profiles', currentUser.uid, 'friends', request.id), {
        username: request.username,
        rating: request.rating || 1200,
        photoURL: request.photoURL || '',
        acceptedAt: new Date().toISOString()
      });

      await setDoc(doc(db, 'profiles', request.id, 'friends', currentUser.uid), {
        username: myData.username || 'Игрок',
        rating: myData.rating || 1200,
        photoURL: myData.photoURL || '',
        acceptedAt: new Date().toISOString()
      });

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

  // ⚔️ ОТПРАВКА ВЫЗОВА НА ДУЭЛЬ (ПРАВИЛЬНЫЙ АЛГОРИТМ CHESS.COM)
  const sendGameInvite = async (seconds: number) => {
    if (!currentUser || !selectedFriend || !db) return;

    const inviteId = `duel_${currentUser.uid}_${Date.now()}`;
    setOutgoingInviteId(inviteId);
    setIsModalOpen(false);

    try {
      const myProfileSnap = await getDoc(doc(db, 'profiles', currentUser.uid));
      const myUsername = myProfileSnap.exists() ? myProfileSnap.data().username : 'Игрок';

      // Создаем документ вызова со статусом pending
      await setDoc(doc(db, 'invites', inviteId), {
        id: inviteId,
        fromUid: currentUser.uid,
        fromUsername: myUsername,
        toUid: selectedFriend.id,
        toUsername: selectedFriend.username,
        timeControl: seconds,
        status: 'pending',
        currentFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        createdAt: new Date().toISOString()
      });

      // Вешаем слушатель: если друг примет вызов (статус станет accepted), летим в игру
      unsubInviteRef.current = onSnapshot(doc(db, 'invites', inviteId), (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.status === 'accepted') {
            if (unsubInviteRef.current) unsubInviteRef.current();
            router.push(`/game?inviteId=${inviteId}`);
          }
        }
      });

    } catch (err) {
      console.error("Ошибка отправки дуэли:", err);
      setOutgoingInviteId(null);
    }
  };

  // ❌ ОТМЕНА ВЫЗОВА, ЕСЛИ ДРУГ ДОЛГО НЕ ПРИНИМАЕТ
  const cancelGameInvite = async () => {
    if (!outgoingInviteId || !db) return;
    if (unsubInviteRef.current) unsubInviteRef.current();
    await deleteDoc(doc(db, 'invites', outgoingInviteId));
    setOutgoingInviteId(null);
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white gap-3 font-mono">
      <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
      <span className="text-xs text-slate-500 uppercase tracking-widest">Синхронизация Арены...</span>
    </div>
  );

  return (
    <main className="min-h-full flex flex-col items-center p-12 max-w-4xl mx-auto w-full space-y-6 relative z-10 select-none">
      
      {/* ⏳ ЭКРАН ОЖИДАНИЯ ПРИНЯТИЯ ДУЭЛИ СОПЕРНИКОМ */}
      <AnimatePresence>
        {outgoingInviteId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-slate-900 border border-slate-800 p-8 rounded-3xl text-center max-w-sm w-full space-y-6 shadow-2xl">
              <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400 mx-auto relative">
                <Swords size={28} className="animate-pulse" />
                <Loader2 size={16} className="text-emerald-400 animate-spin absolute -top-1 -right-1" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black uppercase text-white tracking-wide">Вызов отправлен</h3>
                <p className="text-xs text-slate-400 font-medium leading-relaxed">Ожидаем, пока друг примет ваше приглашение на шахматную дуэль...</p>
              </div>
              <button onClick={cancelGameInvite} className="w-full py-3 bg-slate-950/60 border border-slate-800 text-xs font-black text-slate-400 hover:text-red-400 rounded-xl transition-all uppercase tracking-wider">Отмена вызова</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Шапка страницы */}
      <div className="w-full text-center sm:text-left flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full font-black uppercase tracking-wider">Сообщество</span>
          <h2 className="text-2xl font-black tracking-tight mt-2">Управление контактами</h2>
        </div>
        
        {/* Табы */}
        <div className="flex bg-slate-900/60 p-1 rounded-xl border border-slate-800 shrink-0 self-center sm:self-auto">
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

      {/* Вывод списков */}
      <div className="w-full space-y-2.5">
        
        {/* ВКЛАДКА 1: ДРУЗЬЯ */}
        {activeTab === 'list' && (
          <>
            {friends.length === 0 && (
              <div className="p-8 bg-slate-900/20 border border-slate-900/60 rounded-2xl text-center text-sm text-slate-500">
                Ваш список друзей пока пуст. Найдите соперников через «Поиск игроков».
              </div>
            )}
            {friends.map((friend) => (
              <motion.div key={friend.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-slate-950/60 border border-slate-900 hover:border-slate-800 rounded-2xl flex items-center justify-between shadow-sm transition-all">
                
                {/* Клик по карточке ведет прямо в профиль игрока */}
                <div className="flex items-center gap-4 cursor-pointer min-w-0" onClick={() => router.push(`/dashboard/user/${friend.id}`)}>
                  <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-black text-sm uppercase overflow-hidden shrink-0">
                    {friend.photoURL ? (
                      <img src={friend.photoURL} alt="" className="w-full h-full object-cover" />
                    ) : (
                      friend.username?.[0]
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm text-white hover:text-emerald-400 transition-colors truncate">{friend.username}</h4>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5"><Trophy size={12} className="text-amber-500" /> {friend.rating || 1200} ELO</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => router.push(`/dashboard/messages?chatWith=${friend.id}`)} className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-300 transition-colors" title="Написать сообщение"><MessageSquare size={16} /></button>
                  <button onClick={() => { setSelectedFriend(friend); setIsModalOpen(true); }} className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-md"><Swords size={14} /> ВЫЗВАТЬ</button>
                </div>
              </motion.div>
            ))}
          </>
        )}

        {/* ВКЛАДКА 2: ВХОДЯЩИЕ ЗАПРОСЫ */}
        {activeTab === 'requests' && (
          <>
            {requests.length === 0 && (
              <div className="p-8 bg-slate-900/20 border border-slate-900/60 rounded-2xl text-center text-sm text-slate-500">
                Нет новых входящих запросов в друзья.
              </div>
            )}
            {requests.map((req) => (
              <motion.div key={req.id} initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="p-4 bg-slate-900/40 border border-slate-900 hover:border-slate-800 rounded-2xl flex items-center justify-between shadow-lg backdrop-blur-md transition-all">
                
                <div className="flex items-center gap-4 cursor-pointer min-w-0" onClick={() => router.push(`/dashboard/user/${req.id}`)}>
                  <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 font-black text-sm uppercase overflow-hidden shrink-0">
                    {req.photoURL ? (
                      <img src={req.photoURL} alt="" className="w-full h-full object-cover" />
                    ) : (
                      req.username?.[0]
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[9px] text-amber-400 font-bold uppercase tracking-wider">Хочет в друзья</span>
                    <h4 className="font-bold text-sm text-white mt-0.5 hover:text-emerald-400 transition-colors truncate">{req.username}</h4>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5"><Trophy size={11} className="text-amber-500" /> {req.rating || 1200} ELO</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
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

      {/* Выбор времени матча */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-md bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6 shadow-2xl relative">
              <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"><X size={18} /></button>
              <div>
                <h3 className="text-lg font-black tracking-tight flex items-center gap-2"><Clock className="text-emerald-400" size={20} /> Контроль времени дуэли</h3>
                <p className="text-xs text-slate-400 mt-1">Выберите регламент партии для вызова игрока <span className="text-white font-bold">{selectedFriend?.username}</span>.</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[{ name: 'Пуля 1 мин', secs: 60 }, { name: 'Блиц 3 мин', secs: 180 }, { name: 'Блиц 5 мин', secs: 300 }, { name: 'Рапид 10 мин', secs: 600 }].map((time) => (
                  <button key={time.secs} onClick={() => sendGameInvite(time.secs)} className="p-3.5 bg-slate-950 border border-slate-800 hover:border-emerald-500/40 rounded-xl font-bold text-xs text-center transition-all flex items-center justify-center gap-1.5 text-slate-200 hover:text-white"><Cpu size={14} className="text-slate-500" />{time.name}</button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}