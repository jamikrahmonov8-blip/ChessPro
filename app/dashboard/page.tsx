'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/utils/firebase';
import { doc, onSnapshot, collection, setDoc, getDocs, query, where, limit, updateDoc, deleteDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { Chess } from 'chess.js';
import { 
  PlusSquare, History, Users, ChevronDown, 
  Settings, Trophy, BrainCircuit, ArrowUpRight, Wifi
} from 'lucide-react';

const BOARD_THEMES = {
  dark: 'bg-[#769656]',
  light: 'bg-[#eeeed2]'
};

export default function DashboardPage() {
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [dummyGame] = useState(() => new Chess()); // Движок для начальной позиции
  const [activeSubTab, setActiveSubTab] = useState<'new' | 'history' | 'players'>('new');
  const [selectedTime, setSelectedTime] = useState({ name: '10 мин. (Рапид)', secs: 600 });
  const [showDropdown, setShowDropdown] = useState(false);
  const [matchHistory, setMatchHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [ping, setPing] = useState<number>(14);

  const currentUser = auth.currentUser;

  useEffect(() => {
    const interval = setInterval(() => {
      setPing(Math.floor(Math.random() * 6) + 10);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!auth || !db) {
      router.push('/login');
      return;
    }

    if (currentUser) {
      const docRef = doc(db, 'profiles', currentUser.uid);
      const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) setUserProfile(docSnap.data());
      });
      return () => unsubscribe();
    }
  }, [router, currentUser]);

  useEffect(() => {
    if (activeSubTab !== 'history' || !currentUser) return;
    
    setHistoryLoading(true);
    const invitesRef = collection(db, 'invites');
    
    const qHost = query(invitesRef, where('fromUid', '==', currentUser.uid), limit(20));
    const qGuest = query(invitesRef, where('toUid', '==', currentUser.uid), limit(20));

    const fetchHistory = async () => {
      try {
        const [snapHost, snapGuest] = await Promise.all([getDocs(qHost), getDocs(qGuest)]);
        const allMatches: any[] = [];

        const processDoc = (d: any) => {
          const data = d.data();
          if (!data.winnerUid) return;

          const isHost = data.fromUid === currentUser.uid;
          const opponentName = isHost ? (data.toUsername || 'Бот (ИИ)') : data.fromUsername;
          const opponentId = isHost ? data.toUid : data.fromUid;
          
          let resultText = 'Ничья 🤝';
          let eloText = '0 Elo';
          let eloColor = 'text-slate-400';

          if (data.winnerUid !== 'draw') {
            if (data.winnerUid === currentUser.uid) {
              resultText = 'Победа 🏆';
              eloText = '+10 Elo';
              eloColor = 'text-emerald-400';
            } else {
              resultText = 'Поражение 💥';
              eloText = '-10 Elo';
              eloColor = 'text-red-400';
            }
          }

          allMatches.push({
            id: d.id,
            opponentName,
            opponentId,
            resultText,
            eloText,
            eloColor,
            reason: data.reason || 'Игра завершена',
            createdAt: data.createdAt ? new Date(data.createdAt).toLocaleDateString() : 'Недавно'
          });
        };

        snapHost.docs.forEach(processDoc);
        snapGuest.docs.forEach(processDoc);

        setMatchHistory(allMatches);
      } catch (err) {
        console.error("Ошибка загрузки истории:", err);
      } finally {
        setHistoryLoading(false);
      }
    };

    fetchHistory();
  }, [activeSubTab, currentUser]);

  const handleStartGame = async () => {
    if (!currentUser) return;

    try {
      const invitesRef = collection(db, 'invites');

      const myOldRooms = query(invitesRef, where('fromUid', '==', currentUser.uid), where('status', '==', 'pending'));
      const myOldSnap = await getDocs(myOldRooms);
      await Promise.all(myOldSnap.docs.map(d => deleteDoc(doc(db, 'invites', d.id))));

      const q = query(invitesRef, where('status', '==', 'pending'), where('toUid', '==', null), where('timeControl', '==', selectedTime.secs), limit(10));
      const querySnapshot = await getDocs(q);
      const foreignRoom = querySnapshot.docs.find((d) => d.data().fromUid !== currentUser.uid);

      if (foreignRoom) {
        await updateDoc(doc(db, 'invites', foreignRoom.id), {
          toUid: currentUser.uid,
          toUsername: userProfile?.username || 'Гость',
          status: 'accepted'
        });
        router.push(`/game?inviteId=${foreignRoom.id}`);
        return;
      }

      const newInviteRef = doc(collection(db, 'invites'));
      await setDoc(newInviteRef, {
        id: newInviteRef.id,
        fromUid: currentUser.uid,
        fromUsername: userProfile?.username || 'Игрок',
        toUid: null,
        status: 'pending',
        timeControl: selectedTime.secs,
        currentFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        createdAt: new Date().toISOString()
      });

      router.push(`/game?inviteId=${newInviteRef.id}`);
    } catch (error) {
      console.error('Ошибка матчмейкинга:', error);
    }
  };

  const timeOptions = [
    { name: '3 мин. (Блиц)', secs: 180 },
    { name: '5 мин. (Блиц)', secs: 300 },
    { name: '10 мин. (Рапид)', secs: 600 },
  ];

  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

  return (
    <main className="p-6 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10 items-center min-h-[calc(100vh-80px)] w-full font-sans select-none">
      
      {/* 🧩 ЛЕВАЯ СТОРОНА: Чистая CSS-доска-превью (Защищена от ошибок типов TypeScript) */}
      <div className="lg:col-span-7 flex flex-col items-center gap-2 w-full max-w-[490px] mx-auto">
        <div className="w-full flex items-center justify-between px-1 text-slate-400">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-slate-900 border border-slate-800 rounded flex items-center justify-center font-bold text-xs">🤖</div>
            <span className="text-xs font-black tracking-wide text-slate-300">Ожидание соперника...</span>
          </div>
          <div className="bg-slate-900/60 border border-slate-800/40 font-mono font-bold text-xs px-2.5 py-1 rounded text-slate-400">10:00</div>
        </div>

        {/* Сборка доски на чистых дивах без использования react-chessboard */}
        <div className="bg-slate-950 border border-slate-800/40 shadow-2xl rounded-2xl overflow-hidden w-full aspect-square grid grid-cols-8 grid-rows-8 p-1 gap-px">
          {Array.from({ length: 8 }, (_, r) => {
            const rowIndex = 7 - r;
            return Array.from({ length: 8 }, (_, f) => {
              const fileIndex = f;
              const piece = dummyGame.board()[7 - rowIndex][fileIndex];
              const isDark = (rowIndex + fileIndex) % 2 === 0;

              return (
                <div key={`${r}-${f}`} className={`w-full h-full flex items-center justify-center relative ${isDark ? BOARD_THEMES.dark : BOARD_THEMES.light}`}>
                  {piece && (
                    <img
                      src={`https://upload.wikimedia.org/wikipedia/commons/${piece.color === 'w' ? piece.type === 'p' ? '4/45/Chess_plt45.svg' : piece.type === 'r' ? '7/72/Chess_rlt45.svg' : piece.type === 'n' ? '7/70/Chess_nlt45.svg' : piece.type === 'b' ? 'b/b1/Chess_blt45.svg' : piece.type === 'q' ? '1/15/Chess_qlt45.svg' : '4/42/Chess_klt45.svg' : piece.type === 'p' ? 'c/c7/Chess_pdt45.svg' : piece.type === 'r' ? 'f/ff/Chess_rdt45.svg' : piece.type === 'n' ? 'e/ef/Chess_ndt45.svg' : piece.type === 'b' ? '9/98/Chess_bdt45.svg' : piece.type === 'q' ? '4/47/Chess_qdt45.svg' : 'f/f0/Chess_kdt45.svg'}`}
                      alt="" className="w-[85%] h-[85%] object-contain drop-shadow-md pointer-events-none"
                    />
                  )}
                </div>
              );
            });
          })}
        </div>

        <div className="w-full flex items-center justify-between px-1 text-slate-400">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded flex items-center justify-center font-black text-[10px] uppercase">{userProfile?.username?.[0] || 'U'}</div>
            <span className="text-xs font-black tracking-wide text-white truncate max-w-[120px]">{userProfile?.username || 'Гроссмейстер'}</span>
            <span className="text-[10px] font-bold text-amber-400">({userProfile?.rating || 1200})</span>
          </div>
          <div className="bg-slate-900/60 border border-slate-800/40 font-mono font-bold text-xs px-2.5 py-1 rounded text-white">10:00</div>
        </div>
      </div>

      {/* ⚡ ПРАВАЯ СТОРОНА: Консоль запуска режимов */}
      <div className="lg:col-span-5 bg-slate-900/20 border border-slate-900/60 rounded-3xl p-6 backdrop-blur-xl shadow-2xl h-[490px] flex flex-col justify-between w-full mx-auto overflow-hidden">
        <div className="space-y-6 h-full flex flex-col">
          
          <div className="grid grid-cols-3 border-b border-slate-900/80 text-center text-xs font-black uppercase tracking-wider pb-1 shrink-0">
            <button onClick={() => setActiveSubTab('new')} className={`pb-2.5 flex items-center justify-center gap-1 transition-all ${activeSubTab === 'new' ? 'text-white border-b-2 border-emerald-500' : 'text-slate-500 hover:text-slate-300'}`}><PlusSquare size={13} /> Режимы</button>
            <button onClick={() => setActiveSubTab('history')} className={`pb-2.5 flex items-center justify-center gap-1 transition-all ${activeSubTab === 'history' ? 'text-white border-b-2 border-emerald-500' : 'text-slate-500 hover:text-slate-300'}`}><History size={13} /> Истории</button>
            <button onClick={() => setActiveSubTab('players')} className={`pb-2.5 flex items-center justify-center gap-1 transition-all ${activeSubTab === 'players' ? 'text-white border-b-2 border-emerald-500' : 'text-slate-500 hover:text-slate-300'}`}><Users size={13} /> Игроки</button>
          </div>

          <div className="flex-1 overflow-y-auto pr-1">
            <AnimatePresence mode="wait">
              
              {activeSubTab === 'new' && (
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} className="space-y-4 pt-1">
                  <div className="relative">
                    <button 
                      onClick={() => setShowDropdown(!showDropdown)}
                      className="w-full bg-slate-950/60 border border-slate-800 hover:border-slate-700 p-4 rounded-2xl flex items-center justify-between text-xs font-black transition-all"
                    >
                      <span className="flex items-center gap-2 text-slate-200 uppercase tracking-wide">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        {selectedTime.name}
                      </span>
                      <ChevronDown size={14} className={`text-slate-500 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                    </button>

                    {showDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden z-50 p-1 space-y-0.5 shadow-2xl">
                        {timeOptions.map((option) => (
                          <button
                            key={option.secs}
                            onClick={() => { setSelectedTime(option); setShowDropdown(false); }}
                            className="w-full text-left px-4 py-2.5 text-xs font-bold rounded-lg text-slate-400 hover:text-white hover:bg-emerald-500/10 transition-colors uppercase tracking-wide"
                          >
                            {option.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={handleStartGame}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 uppercase tracking-wider active:scale-[0.99]"
                  >
                    <Users size={15} /> Играть по сети
                  </button>

                  <button 
                    onClick={() => router.push('/dashboard/training')}
                    className="w-full bg-slate-950 border border-slate-800 hover:border-amber-500/40 text-white text-xs font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 uppercase tracking-wider active:scale-[0.99]"
                  >
                    <BrainCircuit size={15} className="text-amber-400" /> Одиночная тренировка
                  </button>
                </motion.div>
              )}

              {activeSubTab === 'history' && (
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} className="space-y-2 pt-1">
                  {historyLoading && <div className="text-center text-xs text-slate-500 py-12 animate-pulse font-mono">Сканирование логов...</div>}
                  {!historyLoading && matchHistory.length === 0 && <p className="text-xs text-slate-500 text-center py-16 font-medium">Вы еще не сыграли ни одной парти.</p>}
                  {!historyLoading && matchHistory.map((match) => (
                    <div key={match.id} className="p-3 bg-slate-950/60 border border-slate-900 rounded-xl flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div onClick={() => match.opponentId && router.push(`/dashboard/user/${match.opponentId}`)} className={`w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-xs font-black uppercase text-slate-300 shrink-0 ${match.opponentId ? 'cursor-pointer hover:border-emerald-500/40' : ''}`}>{match.opponentName?.[0]}</div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h4 onClick={() => match.opponentId && router.push(`/dashboard/user/${match.opponentId}`)} className={`text-xs font-black text-white truncate ${match.opponentId ? 'cursor-pointer hover:text-emerald-400 transition-colors' : ''}`}>{match.opponentName}</h4>
                            {match.opponentId && <ArrowUpRight size={10} className="text-slate-600 shrink-0" />}
                          </div>
                          <p className="text-[9px] text-slate-500 font-bold mt-0.5 uppercase tracking-wide">{match.reason} • {match.createdAt}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-black uppercase block">{match.resultText.split(' ')[0]}</span>
                        <span className={`text-[10px] font-mono font-bold block mt-0.5 ${match.eloColor}`}>{match.eloText}</span>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}

              {activeSubTab === 'players' && (
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} className="p-8 bg-slate-950/30 border border-slate-900/60 rounded-2xl text-center space-y-3 pt-12">
                  <Users size={20} className="mx-auto text-slate-600" />
                  <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">Для поиска гроссмейстеров перейдите в левое боковое меню.</p>
                  <button onClick={() => router.push('/dashboard/search')} className="px-4 py-2 bg-slate-900 border border-slate-800 text-slate-300 font-black text-[10px] uppercase rounded-xl">Открыть поиск</button>
                </motion.div>
              )}

            </AnimatePresence>
          </div>

          <div className="flex items-center justify-between border-t border-slate-900/80 pt-4 text-[9px] text-slate-500 font-mono shrink-0">
            <span>CHESS.PRO SYSTEM ENGINE</span>
            <div className="flex items-center gap-1 text-emerald-400/80 font-bold"><Wifi size={10} /> {ping} ms SECURED</div>
          </div>
        </div>
      </div>

    </main>
  );
}