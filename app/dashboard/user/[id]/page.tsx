'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { auth, db } from '@/utils/firebase';
import { doc, getDoc, setDoc, deleteDoc, collection, onSnapshot, getDocs, query, where } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, ChevronLeft, UserPlus, UserMinus, MessageSquare, 
  Award, CheckCircle2, Zap, Flame, Clock, Target, Calendar, Users, History, Loader2 
} from 'lucide-react';

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const targetUid = params.id as string;

  const [targetUser, setTargetUser] = useState<any>(null);
  const [isFriend, setIsFriend] = useState<any>('none'); // 'none', 'friends'
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'matches' | 'friends'>('overview');
  const [uiFeedback, setUiFeedback] = useState<string | null>(null);
  
  // Состояния данных для вкладок
  const [userFriends, setUserFriends] = useState<any[]>([]);
  const [matchHistory, setMatchHistory] = useState<any[]>([]);

  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!targetUid || !currentUser) return;

    let unsubscribeTargetUser: () => void;

    const fetchFullProfileData = async () => {
      try {
        // 1. Реалтайм-стрим профиля целевого игрока (для отслеживания статуса онлайн/офлайн)
        unsubscribeTargetUser = onSnapshot(doc(db, 'profiles', targetUid), (docSnap) => {
          if (docSnap.exists()) setTargetUser(docSnap.data());
        });

        // 2. Проверка статуса дружбы в подколлекции 'friends'
        const friendDoc = await getDoc(doc(db, 'profiles', currentUser.uid, 'friends', targetUid));
        if (friendDoc.exists()) {
          setIsFriend('friends');
        } else {
          setIsFriend('none');
        }

        // 3. Подгрузка списка друзей из подколлекции 'friends' целевого юзера
        const friendsCollectionRef = collection(db, 'profiles', targetUid, 'friends');
        const friendsSnap = await getDocs(friendsCollectionRef);
        const fList: any[] = [];

        for (const friendDoc of friendsSnap.docs) {
          const fProfileSnap = await getDoc(doc(db, 'profiles', friendDoc.id));
          if (fProfileSnap.exists()) {
            fList.push({ id: fProfileSnap.id, ...fProfileSnap.data() });
          }
        }
        setUserFriends(fList);

        // 4. Подгрузка истории сыгранных матчей
        const matchesQuery = query(collection(db, 'matches'), where('players', 'array-contains', targetUid));
        const matchesSnap = await getDocs(matchesQuery);
        const mList: any[] = [];
        matchesSnap.forEach(d => mList.push(d.data()));
        setMatchHistory(mList);

      } catch (err) {
        console.error("Ошибка при получении данных профиля:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchFullProfileData();

    return () => {
      if (unsubscribeTargetUser) unsubscribeTargetUser();
    };
  }, [targetUid, currentUser]);

  // 👥 МГНОВЕННОЕ ДОБАВЛЕНИЕ / УДАЛЕНИЕ ИЗ ДРУЗЕЙ (МГНОВЕННЫЙ ЗАПРОС)
  const handleFriendshipToggle = async () => {
    if (!currentUser || !targetUid || !targetUser || !db) return;

    const myFriendRef = doc(db, 'profiles', currentUser.uid, 'friends', targetUid);
    const targetFriendRef = doc(db, 'profiles', targetUid, 'friends', currentUser.uid);

    try {
      if (isFriend === 'friends') {
        // Удаляем из друзей у обоих игроков
        await deleteDoc(myFriendRef);
        await deleteDoc(targetFriendRef);
        
        setIsFriend('none');
        triggerFeedback('Удален из списка друзей.');
        
        // Локально убираем из массива, чтобы вкладка перерисовывалась мгновенно
        setUserFriends(prev => prev.filter(f => f.id !== targetUid));
      } else {
        // Добавляем друг друга в подколлекции напрямую (Взаимная подписка)
        const myProfileSnap = await getDoc(doc(db, 'profiles', currentUser.uid));
        const myData = myProfileSnap.exists() ? myProfileSnap.data() : {};

        // Пишем целевого игрока к нам в друзья
        await setDoc(myFriendRef, {
          id: targetUid,
          username: targetUser.username,
          rating: targetUser.rating || 1200,
          photoURL: targetUser.photoURL || '',
          addedAt: new Date().toISOString()
        });

        // Пишем нас к целевому игроку в друзья
        await setDoc(targetFriendRef, {
          id: currentUser.uid,
          username: myData.username || 'Игрок',
          rating: myData.rating || 1200,
          photoURL: myData.photoURL || '',
          addedAt: new Date().toISOString()
        });

        setIsFriend('friends');
        triggerFeedback('Добавлен в список друзей! 🎉');

        // Локально добавляем в массив для живого апдейта вкладки
        setUserFriends(prev => [...prev, { id: targetUid, ...targetUser }]);
      }
    } catch (error) {
      console.error(error);
      triggerFeedback('Ошибка обновления статуса.');
    }
  };

  const triggerFeedback = (msg: string) => {
    setUiFeedback(msg);
    setTimeout(() => setUiFeedback(null), 3500);
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white gap-4">
      <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
      <p className="text-xs font-black uppercase tracking-widest text-slate-500">Синхронизация профиля...</p>
    </div>
  );
  
  if (!targetUser) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-red-400 font-bold">Игрок не найден на сервере.</div>;

  return (
    <main className="min-h-screen text-white relative font-sans">
      
      {/* 🌌 КИБЕРСПОРТИВНЫЙ ЗАДНИК */}
      <div className="absolute top-0 left-0 right-0 h-80 bg-gradient-to-br pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-80 bg-gradient-to-b from-transparent pointer-events-none" />

      <div className="max-w-5xl mx-auto px-6 pt-12 pb-24 relative z-10 space-y-8">
        
        {/* Назад к поиску */}
        <button 
          onClick={() => router.push('/dashboard/search')}
          className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-400 hover:text-emerald-400 transition-colors"
        >
          <ChevronLeft size={14} /> Назад к поиску
        </button>

        {/* 👤 КАРТОЧКА СУПЕР-ПРОФИЛЯ */}
        <div className="flex flex-col md:flex-row items-center md:items-end justify-between gap-6 bg-slate-900/20 border border-slate-900 p-8 rounded-3xl backdrop-blur-2xl shadow-2xl">
          <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
            
            {/* Аватарка (Base64) + Живой "Червячок" статуса */}
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-slate-700/50 flex items-center justify-center text-slate-200 font-black text-4xl uppercase relative shadow-xl overflow-hidden shrink-0">
              {targetUser.photoURL ? (
                <img src={targetUser.photoURL} alt={targetUser.username} className="w-full h-full object-cover" />
              ) : (
                targetUser.username?.[0]
              )}
              <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-3 border-slate-950 z-10 ${targetUser.isOnline ? 'bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/50' : 'bg-slate-600'}`} />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-center md:justify-start gap-2.5">
                <h2 className="text-3xl font-black tracking-tight">{targetUser.username}</h2>
                {targetUser.role === 'admin' && (
                  <span className="text-[9px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded font-black tracking-widest uppercase">ROOT</span>
                )}
              </div>
              
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-1 text-xs text-slate-400 font-bold">
                <span className="flex items-center gap-1"><Calendar size={13} className="text-slate-500" /> Регистрация: 2025 г.</span>
                <span className="flex items-center gap-1"><Users size={13} className="text-slate-500" /> Друзья: {userFriends.length}</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${targetUser.isOnline ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                  {targetUser.isOnline ? 'Сейчас на арене' : 'Офлайн'}
                </span>
              </div>
            </div>
          </div>

          {/* Панель главного управления под аватаркой */}
          {currentUser?.uid !== targetUid && (
            <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
              <button 
                onClick={handleFriendshipToggle}
                className={`flex-1 md:flex-none px-5 py-3 rounded-xl text-xs font-black tracking-wide transition-all border flex items-center justify-center gap-2 ${
                  isFriend === 'friends' 
                    ? 'bg-slate-950/60 border-slate-800 text-red-400 hover:bg-red-500/5' 
                    : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 border-transparent shadow-lg shadow-emerald-500/10'
                }`}
              >
                {isFriend === 'friends' ? <UserMinus size={14} /> : <UserPlus size={14} />}
                {isFriend === 'friends' ? 'УДАЛИТЬ' : 'В ДРУЗЬЯ'}
              </button>

              <button 
                onClick={() => router.push(`/dashboard/messages?chatWith=${targetUid}`)}
                className="flex items-center justify-center gap-2 px-5 py-3 bg-slate-950/60 hover:bg-slate-900 border border-slate-800 rounded-xl text-xs font-black transition-all text-slate-200"
              >
                <MessageSquare size={14} className="text-emerald-400" /> ЧАТ
              </button>
            </div>
          )}
        </div>

        {/* Кастомное всплывающее уведомление */}
        <AnimatePresence>
          {uiFeedback && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold flex items-center justify-center gap-2 max-w-sm mx-auto shadow-xl shadow-emerald-950/10"
            >
              <CheckCircle2 size={14} /> {uiFeedback}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 🗂 СИСТЕМА ВКЛАДОК */}
        <div className="flex border-b border-slate-900/60 gap-6 text-sm font-black uppercase tracking-wider px-2">
          <button onClick={() => setActiveTab('overview')} className={`pb-3 transition-all border-b-2 ${activeTab === 'overview' ? 'text-white border-emerald-500' : 'text-slate-500 border-transparent hover:text-slate-300'}`}>Обзор</button>
          <button onClick={() => setActiveTab('matches')} className={`pb-3 transition-all border-b-2 ${activeTab === 'matches' ? 'text-white border-emerald-500' : 'text-slate-500 border-transparent hover:text-slate-300'}`}>Партии ({matchHistory.length})</button>
          <button onClick={() => setActiveTab('friends')} className={`pb-3 transition-all border-b-2 ${activeTab === 'friends' ? 'text-white border-emerald-500' : 'text-slate-500 border-transparent hover:text-slate-300'}`}>Друзья ({userFriends.length})</button>
        </div>

        {/* 📑 ДИНАМИЧЕСКИЙ КОНТЕНТ ВКЛАДОК */}
        <div className="w-full">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Сетка игровых модов */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-5 bg-slate-900/20 border border-slate-900 rounded-2xl flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-[10px] text-slate-500 font-black uppercase tracking-wider flex items-center gap-1"><Zap size={11} className="text-amber-500" /> Блиц</div>
                    <div className="text-2xl font-mono font-black text-white">{targetUser.rating || 1200}</div>
                  </div>
                  <div className="text-right text-[10px] font-bold text-emerald-400 bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10 flex items-center gap-0.5">▲ 24</div>
                </div>
                <div className="p-5 bg-slate-900/20 border border-slate-900 rounded-2xl flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-[10px] text-slate-500 font-black uppercase tracking-wider flex items-center gap-1"><Flame size={11} className="text-orange-500" /> Пуля</div>
                    <div className="text-2xl font-mono font-black text-white">{targetUser.bulletRating || 1200}</div>
                  </div>
                  <div className="text-right text-[10px] font-bold text-red-400 bg-red-500/5 px-2 py-0.5 rounded border border-red-500/10 flex items-center gap-0.5">▼ 12</div>
                </div>
                <div className="p-5 bg-slate-900/20 border border-slate-900 rounded-2xl flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-[10px] text-slate-500 font-black uppercase tracking-wider flex items-center gap-1"><Clock size={11} className="text-emerald-500" /> Рапид</div>
                    <div className="text-2xl font-mono font-black text-white">{targetUser.rapidRating || 1200}</div>
                  </div>
                  <div className="text-right text-[10px] font-bold text-slate-400 bg-slate-800/40 px-2 py-0.5 rounded">0</div>
                </div>
                <div className="p-5 bg-slate-900/20 border border-slate-900 rounded-2xl flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-[10px] text-slate-500 font-black uppercase tracking-wider flex items-center gap-1"><Target size={11} className="text-blue-500" /> Задачи</div>
                    <div className="text-2xl font-mono font-black text-white">{targetUser.puzzlesSolved || 0}</div>
                  </div>
                  <div className="text-right text-[10px] font-bold text-emerald-400 bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10 flex items-center gap-0.5">▲ 115</div>
                </div>
              </div>

              {/* Общие винрейты */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1 p-6 bg-slate-900/10 border border-slate-900 rounded-2xl space-y-4">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><Award size={14} className="text-amber-500" /> Достижения лиги</h4>
                  <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl text-center">
                    <span className="text-xs font-black uppercase text-amber-400 tracking-wider block">{targetUser.chessLevel || 'Стажер арены'}</span>
                  </div>
                  <div className="text-center text-xs text-slate-500">Турнирные очки: <span className="text-white font-mono font-bold">{targetUser.tournamentPoints || 0}</span></div>
                </div>

                <div className="md:col-span-2 p-6 bg-slate-900/10 border border-slate-900 rounded-2xl flex flex-col justify-between">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">Общий винрейт аккаунта</h4>
                  <div className="grid grid-cols-3 gap-4 text-center mt-4">
                    <div className="p-4 bg-slate-950/40 border border-slate-900 rounded-xl">
                      <div className="text-xl font-mono font-black text-white">{targetUser.gamesPlayed || 0}</div>
                      <div className="text-[9px] font-bold text-slate-500 uppercase mt-1">Всего партий</div>
                    </div>
                    <div className="p-4 bg-slate-950/40 border border-slate-900 rounded-xl">
                      <div className="text-xl font-mono font-black text-emerald-400">{targetUser.gamesWon || 0}</div>
                      <div className="text-[9px] font-bold text-slate-500 uppercase mt-1">Победы</div>
                    </div>
                    <div className="p-4 bg-slate-950/40 border border-slate-900 rounded-xl">
                      <div className="text-xl font-mono font-black text-red-400">{(targetUser.gamesPlayed || 0) - (targetUser.gamesWon || 0)}</div>
                      <div className="text-[9px] font-bold text-slate-500 uppercase mt-1">Поражения</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'matches' && (
            <div className="bg-slate-900/10 border border-slate-900 rounded-2xl p-6 space-y-3">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><History size={14} /> Хроника сыгранных матчей</h4>
              {matchHistory.length === 0 ? (
                <p className="text-xs text-slate-500 py-4">У этого игрока еще нет архивных партий.</p>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                  {matchHistory.map((m, i) => (
                    <div key={i} className="p-4 bg-slate-950/40 border border-slate-900 rounded-xl flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-300">Соперник: {m.opponentName || 'Игрок Арены'}</span>
                      <span className={`font-black uppercase tracking-wider px-2 py-0.5 rounded ${m.result === 'win' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                        {m.result === 'win' ? 'Победа' : 'Поражение'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 👥 СВЕРХТЕХНОЛОГИЧНЫЙ СПИСОК ДРУЗЕЙ С ПЕРЕХОДОМ В ЧАТ */}
          {activeTab === 'friends' && (
            <div className="bg-slate-900/10 border border-slate-900 rounded-2xl p-6">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-4"><Users size={14} /> Контакты и друзья пользователя</h4>
              {userFriends.length === 0 ? (
                <p className="text-xs text-slate-500 py-2">У данного игрока пока нет связей.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {userFriends.map((friend) => {
                    const isOwnProfile = currentUser?.uid === friend.id;
                    return (
                      <div key={friend.id} className="p-3.5 bg-slate-950/40 border border-slate-900 rounded-xl flex items-center justify-between transition-all hover:border-slate-800/80">
                        <div className="flex items-center gap-3 min-w-0">
                          
                          {/* Фото друга (Base64) + Червячок */}
                          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center text-slate-300 font-black uppercase text-sm relative shrink-0">
                            {friend.photoURL ? (
                              <img src={friend.photoURL} alt={friend.username} className="w-full h-full object-cover" />
                            ) : (
                              friend.username?.[0]
                            )}
                            <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-950 ${friend.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
                          </div>

                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-200 truncate flex items-center gap-1.5">
                              {friend.username}
                              {friend.role === 'admin' && (
                                <span className="text-[8px] bg-red-500/10 text-red-400 px-1 rounded font-black border border-red-500/10">ROOT</span>
                              )}
                            </div>
                            <div className="text-[10px] text-amber-500 font-bold mt-0.5">🏆 {friend.rating || 1200} ELO</div>
                          </div>
                        </div>

                        {/* КНОПКИ ВНУТРИ СПИСКА ДРУЗЕЙ */}
                        <div className="flex items-center gap-2 shrink-0">
                          {!isOwnProfile && (
                            <button 
                              onClick={() => router.push(`/dashboard/user/${friend.id}`)} 
                              className="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-emerald-500/20 text-slate-300 hover:text-emerald-400 font-black text-[10px] uppercase tracking-wider rounded-lg transition-all active:scale-95"
                            >
                              Профиль
                            </button>
                          )}
                          
                          {/* ✉️ КНОПКА ПЕРЕХОДА В ЛИЧНЫЙ ЧАТ С ДРУГОМ */}
                          {!isOwnProfile && friend.id !== currentUser?.uid && (
                            <button 
                              onClick={() => router.push(`/dashboard/messages?chatWith=${friend.id}`)} 
                              className="p-2 bg-slate-900 border border-slate-800 text-slate-400 hover:text-emerald-400 hover:border-emerald-500/20 rounded-lg transition-all active:scale-95"
                              title="Открыть чат"
                            >
                              <MessageSquare size={13} />
                            </button>
                          )}
                          
                          {isOwnProfile && (
                            <span className="text-[9px] text-slate-600 font-black uppercase tracking-wider px-2 py-1 bg-slate-900/50 rounded-lg">Вы</span>
                          )}
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </main>
  );
}