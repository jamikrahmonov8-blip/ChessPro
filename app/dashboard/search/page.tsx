'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/utils/firebase';
import { collection, query, where, getDocs, limit, doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Trophy, UserPlus, UserMinus, MessageSquare, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function SearchPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Состояния для кастомного статуса (дизайнерская замена alert)
  const [statusMessage, setStatusMessage] = useState<{ [key: string]: string }>({});

  const currentUser = auth.currentUser;

  // Живой поиск
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setResults([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, 'profiles'),
          where('username', '>=', searchQuery),
          where('username', '<=', searchQuery + '\uf8ff'),
          limit(5)
        );
        const querySnapshot = await getDocs(q);
        const users: any[] = [];
        
        for (const docSnap of querySnapshot.docs) {
          if (docSnap.id === currentUser?.uid) continue; // Пропускаем себя

          // Проверяем, являемся ли мы уже друзьями
          let friendStatus = 'none';
          if (currentUser) {
            const friendCheck = await getDoc(doc(db, 'profiles', currentUser.uid, 'friends', docSnap.id));
            const requestCheck = await getDoc(doc(db, 'profiles', docSnap.id, 'friend_requests', currentUser.uid));
            
            if (friendCheck.exists()) friendStatus = 'friends';
            else if (requestCheck.exists()) friendStatus = 'pending';
          }

          users.push({ id: docSnap.id, friendStatus, ...docSnap.data() });
        }
        setResults(users);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, currentUser]);

  // Быстрое добавление в друзья прямо из поиска
  const handleActionFriend = async (user: any) => {
    if (!currentUser || !db) return;

    const requestRef = doc(db, 'profiles', user.id, 'friend_requests', currentUser.uid);
    const friendRef = doc(db, 'profiles', currentUser.uid, 'friends', user.id);

    try {
      if (user.friendStatus === 'friends') {
        // Удаление из друзей
        await deleteDoc(friendRef);
        await deleteDoc(doc(db, 'profiles', user.id, 'friends', currentUser.uid));
        
        setResults(prev => prev.map(u => u.id === user.id ? { ...u, friendStatus: 'none' } : u));
        showNotification(user.id, 'Удален из друзей');
      } else if (user.friendStatus === 'none') {
        // Отправка запроса
        const myProfileSnap = await getDoc(doc(db, 'profiles', currentUser.uid));
        const myUsername = myProfileSnap.exists() ? myProfileSnap.data().username : 'Игрок';
        const myRating = myProfileSnap.exists() ? myProfileSnap.data().rating || 1200 : 1200;

        await setDoc(requestRef, {
          id: currentUser.uid,
          username: myUsername,
          rating: myRating,
          sentAt: new Date().toISOString()
        });

        setResults(prev => prev.map(u => u.id === user.id ? { ...u, friendStatus: 'pending' } : u));
        showNotification(user.id, 'Запрос отправлен!');
      }
    } catch (err) {
      console.error(err);
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
      <div className="w-full text-center sm:text-left">
        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full font-black uppercase tracking-wider">Сообщество</span>
        <h2 className="text-2xl font-black tracking-tight mt-2">Поиск соперников</h2>
        <p className="text-slate-400 text-sm">Управляйте контактами и пишите сообщения прямо из результатов поиска.</p>
      </div>

      <div className="w-full relative">
        <Search className="absolute left-4 top-4 text-slate-500" size={20} />
        <input 
          type="text" 
          placeholder="Введите имя пользователя для быстрого взаимодействия..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-slate-900/40 border border-slate-800 focus:border-emerald-500 rounded-2xl pl-12 pr-4 py-4 text-sm transition-colors outline-none text-white font-medium backdrop-blur-xl shadow-2xl"
        />
      </div>

      {/* Вывод результатов */}
      <div className="w-full space-y-3">
        {loading && <div className="text-center text-xs text-slate-500 py-4 animate-pulse">Сканирование базы...</div>}
        
        {!loading && searchQuery.trim().length >= 2 && results.length === 0 && (
          <div className="p-6 bg-slate-900/20 border border-slate-900/60 rounded-2xl text-center text-sm text-slate-500 flex items-center justify-center gap-2">
            <ShieldAlert size={16} /> Пользователь не найден
          </div>
        )}

        {results.map((user) => (
          <motion.div 
            key={user.id}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-slate-950/60 border border-slate-900 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
          >
            {/* Левая сторона карточки (Инфо) */}
            <div className="flex items-center gap-4 cursor-pointer" onClick={() => router.push(`/dashboard/user/${user.id}`)}>
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-black text-sm uppercase shrink-0">
                {user.username?.[0]}
              </div>
              <div>
                <h4 className="font-bold text-sm text-white hover:text-emerald-400 transition-colors">{user.username}</h4>
                <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                  <Trophy size={12} className="text-amber-500" /> {user.rating || 1200} ELO
                </p>
              </div>
            </div>

            {/* Правая сторона карточки (Экшены + Кастомная статусная плашка) */}
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

              <button 
                onClick={() => handleActionFriend(user)}
                disabled={user.friendStatus === 'pending'}
                className={`px-3 py-2 text-xs font-black rounded-xl border transition-all flex items-center gap-1.5 ${
                  user.friendStatus === 'friends' ? 'bg-slate-900 text-red-400 border-slate-800 hover:bg-red-500/5 hover:border-red-500/10' :
                  user.friendStatus === 'pending' ? 'bg-slate-950 text-slate-500 border-slate-900 cursor-not-allowed' :
                  'bg-emerald-500 text-slate-950 border-transparent hover:bg-emerald-600'
                }`}
              >
                {user.friendStatus === 'friends' ? 'Удалить' : user.friendStatus === 'pending' ? 'Ожидание' : 'Добавить'}
              </button>

              <button 
                onClick={() => router.push(`/dashboard/messages?chatWith=${user.id}`)}
                className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-emerald-400 rounded-xl transition-colors shadow-sm"
                title="Написать"
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