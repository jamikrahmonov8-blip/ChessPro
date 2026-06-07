'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { auth, db } from '@/utils/firebase';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, ChevronLeft, UserPlus, UserMinus, MessageSquare, Award, CheckCircle2 } from 'lucide-react';

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const targetUid = params.id as string;

  const [targetUser, setTargetUser] = useState<any>(null);
  const [isFriend, setIsFriend] = useState<any>('none'); // 'none', 'pending', 'friends'
  const [loading, setLoading] = useState(true);
  
  // Переменная состояния для кастомного уведомления (дизайнерский UI)
  const [uiFeedback, setUiFeedback] = useState<string | null>(null);

  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!targetUid || !currentUser) return;

    const fetchProfileAndFriendship = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'profiles', targetUid));
        if (userDoc.exists()) setTargetUser(userDoc.data());

        const friendDoc = await getDoc(doc(db, 'profiles', currentUser.uid, 'friends', targetUid));
        const requestDoc = await getDoc(doc(db, 'profiles', targetUid, 'friend_requests', currentUser.uid));

        if (friendDoc.exists()) setIsFriend('friends');
        else if (requestDoc.exists()) setIsFriend('pending');
        else setIsFriend('none');

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileAndFriendship();
  }, [targetUid, currentUser]);

  const handleFriendshipToggle = async () => {
    if (!currentUser || !targetUid || !targetUser) return;

    const requestRef = doc(db, 'profiles', targetUid, 'friend_requests', currentUser.uid);
    const friendRef = doc(db, 'profiles', currentUser.uid, 'friends', targetUid);

    if (isFriend === 'friends') {
      await deleteDoc(friendRef);
      await deleteDoc(doc(db, 'profiles', targetUid, 'friends', currentUser.uid));
      setIsFriend('none');
      triggerFeedback('Связь разорвана. Удален из друзей.');
    } else if (isFriend === 'none') {
      const myProfileSnap = await getDoc(doc(db, 'profiles', currentUser.uid));
      const myUsername = myProfileSnap.exists() ? myProfileSnap.data().username : 'Игрок';
      const myRating = myProfileSnap.exists() ? myProfileSnap.data().rating || 1200 : 1200;

      await setDoc(requestRef, {
        id: currentUser.uid,
        username: myUsername,
        rating: myRating,
        sentAt: new Date().toISOString()
      });
      
      setIsFriend('pending');
      triggerFeedback('Запрос в друзья отправлен адресату!');
    }
  };

  const triggerFeedback = (msg: string) => {
    setUiFeedback(msg);
    setTimeout(() => setUiFeedback(null), 3500);
  };

  if (loading) return <div className="min-h-full flex items-center justify-center text-white">Загрузка профиля...</div>;
  if (!targetUser) return <div className="min-h-full flex items-center justify-center text-red-400">Игрок не найден.</div>;

  return (
    <main className="min-h-full flex flex-col items-center p-12 max-w-2xl mx-auto w-full relative z-10">
      <button 
        onClick={() => router.push('/dashboard/search')}
        className="absolute top-12 left-0 flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors"
      >
        <ChevronLeft size={14} /> К результатам поиска
      </button>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full bg-slate-900/40 border border-slate-900 backdrop-blur-xl p-8 rounded-3xl space-y-6 shadow-2xl mt-8 text-center relative"
      >
        <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/20 flex items-center justify-center text-emerald-400 font-black text-3xl uppercase mx-auto shadow-lg">
          {targetUser.username?.[0]}
        </div>

        <div>
          <h3 className="text-2xl font-black tracking-tight text-white">{targetUser.username}</h3>
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mt-1 flex items-center justify-center gap-1">
            <Trophy size={12} className="text-amber-500" /> {targetUser.rating || 1200} ELO
          </p>
        </div>

        {/* Экшен-кнопки */}
        {currentUser?.uid !== targetUid && (
          <div className="space-y-4 max-w-md mx-auto pt-2">
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={handleFriendshipToggle}
                disabled={isFriend === 'pending'}
                className={`py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 border ${
                  isFriend === 'friends' ? 'bg-slate-950/60 border-slate-800 text-red-400 hover:bg-red-500/5' :
                  isFriend === 'pending' ? 'bg-slate-950 text-slate-500 border-slate-900 cursor-not-allowed' :
                  'bg-emerald-500 hover:bg-emerald-600 text-slate-950 border-transparent shadow-lg shadow-emerald-500/5'
                }`}
              >
                {isFriend === 'friends' ? <UserMinus size={16} /> : <UserPlus size={16} />}
                {isFriend === 'friends' ? 'УДАЛИТЬ' : isFriend === 'pending' ? 'В ОЖИДАНИИ' : 'ДОБАВИТЬ В ДРУЗЬЯ'}
              </button>

              <button 
                onClick={() => router.push(`/dashboard/messages?chatWith=${targetUid}`)}
                className="py-3 bg-slate-950/60 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 text-slate-200"
              >
                <MessageSquare size={16} className="text-emerald-400" /> НАПИСАТЬ СООБЩЕНИЕ
              </button>
            </div>

            {/* ⚡️ КАСТОМНАЯ ПЛАШКА: Заменяет alert() на высшем уровне */}
            <AnimatePresence>
              {uiFeedback && (
                <motion.div 
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm shadow-emerald-950/20"
                >
                  <CheckCircle2 size={14} /> {uiFeedback}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        <div className="h-px bg-slate-800/60 my-6" />

        <div className="grid grid-cols-3 gap-3">
          <div className="p-4 bg-slate-950/40 border border-slate-900/60 rounded-xl">
            <div className="text-xl font-black text-white">{targetUser.gamesPlayed || 0}</div>
            <div className="text-[9px] text-slate-400 font-bold uppercase mt-1">Всего игр</div>
          </div>
          <div className="p-4 bg-slate-950/40 border border-slate-800/60 rounded-xl">
            <div className="text-xl font-black text-emerald-400">{targetUser.gamesWon || 0}</div>
            <div className="text-[9px] text-slate-400 font-bold uppercase mt-1">Побед</div>
          </div>
          <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl flex flex-col justify-center items-center">
            <Award className="text-amber-500" size={16} />
            <div className="text-[10px] text-amber-400 font-black capitalize mt-1 truncate max-w-full">{targetUser.chessLevel || 'beginner'}</div>
          </div>
        </div>
      </motion.div>
    </main>
  );
}   