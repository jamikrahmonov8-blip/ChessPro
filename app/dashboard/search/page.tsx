'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/utils/firebase';
import { collection, query, limit, doc, setDoc, deleteDoc, getDoc, getDocs } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Trophy, MessageSquare, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function SearchPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [statusMessage, setStatusMessage] = useState<{ [key: string]: string }>({});
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);

  const currentUser = auth.currentUser;

  // 1. Подгружаем профиль текущего пользователя
  useEffect(() => {
    if (!currentUser) return;
    const fetchSelf = async () => {
      const selfSnap = await getDoc(doc(db, 'profiles', currentUser.uid));
      if (selfSnap.exists()) {
        setCurrentUserProfile(selfSnap.data());
      }
    };
    fetchSelf();
  }, [currentUser]);

  // 2. Умный регистронезависимый живой поиск
  useEffect(() => {
    if (currentUser && !currentUserProfile) return;

    const isAdmin = currentUserProfile?.role === 'admin';

    if (searchQuery.trim().length === 0 && !isAdmin) {
      setResults([]);
      setLoading(false);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setLoading(true);
      try {
        const profilesRef = collection(db, 'profiles');
        const q = query(profilesRef, limit(100)); 
        const querySnapshot = await getDocs(q);
        
        const users: any[] = [];
        const cleanQuery = searchQuery.trim().toLowerCase();

        for (const docSnap of querySnapshot.docs) {
          if (docSnap.id === currentUser?.uid) continue; // Пропускаем себя

          const data = docSnap.data();
          const username = (data.username || '').toLowerCase();

          if (searchQuery.trim().length > 0 && !username.includes(cleanQuery)) {
            continue;
          }

          // 🔥 КОРРЕКТНАЯ ПРОВЕРКА СТАТУСА ИЗ БАЗЫ
          let friendStatus = 'none';
          if (currentUser) {
            // Проверяем, друзья ли мы уже
            const friendCheck = await getDoc(doc(db, 'profiles', currentUser.uid, 'friends', docSnap.id));
            // Проверяем, отправлен ли уже запрос ЭТОМУ человеку от нас
            const myRequestCheck = await getDoc(doc(db, 'profiles', docSnap.id, 'friend_requests', currentUser.uid));
            // Проверяем, может ЭТОТ человек сам отправил запрос нам
            const incomingRequestCheck = await getDoc(doc(db, 'profiles', currentUser.uid, 'friend_requests', docSnap.id));
            
            if (friendCheck.exists()) {
              friendStatus = 'friends';
            } else if (myRequestCheck.exists()) {
              friendStatus = 'pending'; // Мы отправили, ждем ответа
            } else if (incomingRequestCheck.exists()) {
              friendStatus = 'incoming'; // Он нам отправил, можно принять
            }
          }

          users.push({ id: docSnap.id, friendStatus, ...data });
        }

        setResults(searchQuery.trim().length > 0 ? users.slice(0, 10) : users);
      } catch (err) {
        console.error("Ошибка поиска по базе:", err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, currentUser, currentUserProfile]);

  // 📑 КОРРЕКТНАЯ ОТПРАВКА ЗАПРОСА В ДРУЗЬЯ (БЕЗ МГНОВЕННОГО ДОБАВЛЕНИЯ)
  const handleActionFriend = async (user: any) => {
    if (!currentUser || !db || !currentUserProfile) return;

    // Ссылка на подколлекцию входящих запросов у того, кого добавляем
    const targetRequestRef = doc(db, 'profiles', user.id, 'friend_requests', currentUser.uid);
    
    // Ссылки на подколлекции друзей (для удаления)
    const myFriendRef = doc(db, 'profiles', currentUser.uid, 'friends', user.id);
    const targetFriendRef = doc(db, 'profiles', user.id, 'friends', currentUser.uid);

    try {
      if (user.friendStatus === 'friends') {
        // Если уже друзья — удаляем из друзей у обоих
        await deleteDoc(myFriendRef);
        await deleteDoc(targetFriendRef);
        
        setResults(prev => prev.map(u => u.id === user.id ? { ...u, friendStatus: 'none' } : u));
        showNotification(user.id, 'Удален из друзей');

      } else if (user.friendStatus === 'none') {
        // 🔥 ОТПРАВЛЯЕМ ЗАПРОС (Пишем только в friend_requests получателя!)
        await setDoc(targetRequestRef, {
          id: currentUser.uid,
          username: currentUserProfile.username || 'Игрок',
          rating: currentUserProfile.rating || 1200,
          photoURL: currentUserProfile.photoURL || '',
          sentAt: new Date().toISOString()
        });

        // Меняем статус локально на 'pending' (Ожидание)
        setResults(prev => prev.map(u => u.id === user.id ? { ...u, friendStatus: 'pending' } : u));
        showNotification(user.id, 'Запрос отправлен! ✉️');

      } else if (user.friendStatus === 'incoming') {
        // Если он нам отправлял запрос, а мы нажали кнопку в поиске — принимаем его!
        await setDoc(myFriendRef, { id: user.id, username: user.username, rating: user.rating || 1200, photoURL: user.photoURL || '' });
        await setDoc(targetFriendRef, { id: currentUser.uid, username: currentUserProfile.username, rating: currentUserProfile.rating || 1200, photoURL: currentUserProfile.photoURL || '' });
        
        // Удаляем входящий запрос, так как мы его приняли
        await deleteDoc(doc(db, 'profiles', currentUser.uid, 'friend_requests', user.id));

        setResults(prev => prev.map(u => u.id === user.id ? { ...u, friendStatus: 'friends' } : u));
        showNotification(user.id, 'Запрос принят! 🎉');
      }
    } catch (err) {
      console.error("Ошибка при работе с друзьями:", err);
    }
  };

  const showNotification = (userId: string, text: string) => {
    setStatusMessage(prev => ({ ...prev, [userId]: text }));
    setTimeout(() => {
      setStatusMessage(prev => {
        const copy = { ...prev };
        delete copy[userId];
        return copy;
      });
    }, 3000);
  };

  return (
    <main className="min-h-full flex flex-col items-center p-12 max-w-4xl mx-auto w-full space-y-6 relative z-10">
      
      <div className="w-full text-center sm:text-left flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full font-black uppercase tracking-wider">
            Сообщество {currentUserProfile?.role === 'admin' && '• Панель ROOT'}
          </span>
          <h2 className="text-2xl font-black tracking-tight mt-2">Поиск соперников</h2>
          <p className="text-slate-400 text-sm">Управляйте контактами и пишите сообщения прямо из результатов поиска.</p>
        </div>
        {currentUserProfile?.role === 'admin' && (
          <div className="px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-[10px] font-black tracking-widest uppercase self-center sm:self-auto">
            Режим: Вся база ({results.length})
          </div>
        )}
      </div>

      <div className="w-full relative">
        <Search className="absolute left-4 top-4 text-slate-500" size={20} />
        <input 
          type="text" 
          placeholder={currentUserProfile?.role === 'admin' ? "Глобальный фильтр по игрокам (любой регистр)..." : "Введите имя (маленькими или большим буквами)..."}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-slate-900/40 border border-slate-800 focus:border-emerald-500 rounded-2xl pl-12 pr-4 py-4 text-sm transition-colors outline-none text-white font-medium backdrop-blur-xl shadow-2xl"
        />
      </div>

      {/* Вывод результатов */}
      <div className="w-full space-y-3">
        {loading && <div className="text-center text-xs text-slate-500 py-4 animate-pulse">Сканирование Арены...</div>}
        
        {!loading && results.length === 0 && (
          <div className="p-6 bg-slate-900/20 border border-slate-900/60 rounded-2xl text-center text-sm text-slate-500 flex items-center justify-center gap-2">
            <ShieldAlert size={16} /> Пользователь не найден
          </div>
        )}

        {!loading && results.map((user) => (
          <motion.div 
            key={user.id}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-slate-950/60 border border-slate-900 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-slate-800"
          >
            {/* Карточка */}
            <div className="flex items-center gap-4 cursor-pointer" onClick={() => router.push(`/dashboard/user/${user.id}`)}>
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-black text-sm uppercase shrink-0">
                {user.username?.[0] || '?'}
              </div>
              <div>
                <h4 className="font-bold text-sm text-white hover:text-emerald-400 transition-colors flex items-center gap-2">
                  {user.username}
                  {user.role === 'admin' && (
                    <span className="text-[8px] bg-red-500/10 text-red-400 px-1 py-0.2 rounded border border-red-500/20 font-black tracking-widest">ROOT</span>
                  )}
                </h4>
                <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                  <Trophy size={12} className="text-amber-500" /> {user.rating || 1200} ELO
                </p>
              </div>
            </div>

            {/* Экшены */}
            <div className="flex items-center gap-3 self-end sm:self-auto">
              <AnimatePresence>
                {statusMessage[user.id] && (
                  <motion.span 
                    initial={{ opacity: 0, scale: 0.9 }} 
                    animate={{ opacity: 1, scale: 1 }} 
                    exit={{ opacity: 0 }}
                    className="text-[11px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-sm"
                  >
                    <CheckCircle2 size={12} /> {statusMessage[user.id]}
                  </motion.span>
                )}
              </AnimatePresence>

              {/* УМНАЯ КНОПКА СТАТУСА ЗАПРОСА */}
              <button 
                onClick={() => handleActionFriend(user)}
                className={`px-3 py-2 text-xs font-black rounded-xl border transition-all flex items-center gap-1.5 ${
                  user.friendStatus === 'friends' ? 'bg-slate-900 text-red-400 border-slate-800 hover:bg-red-500/5 hover:border-red-500/10' :
                  user.friendStatus === 'pending' ? 'bg-slate-950 text-slate-500 border-slate-900/60 cursor-not-allowed opacity-60' :
                  user.friendStatus === 'incoming' ? 'bg-amber-500 text-slate-950 border-transparent hover:bg-amber-600' :
                  'bg-emerald-500 text-slate-950 border-transparent hover:bg-emerald-600'
                }`}
              >
                {user.friendStatus === 'friends' ? 'Удалить' : 
                 user.friendStatus === 'pending' ? 'Ожидание' : 
                 user.friendStatus === 'incoming' ? 'Принять' : 'Добавить'}
              </button>

              <button 
                onClick={() => router.push(`/dashboard/messages?chatWith=${user.id}`)}
                className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-emerald-400 rounded-xl transition-colors shadow-sm"
                title="Написать сообщение"
              >
                <MessageSquare size={15} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </main>
  );
}