'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { auth, db } from '@/utils/firebase';
import { doc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { Loader2, Flag, Users, X, Trophy, RotateCcw, Play, Wifi, Check, AlertCircle } from 'lucide-react';

export default function GameContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const inviteId = searchParams.get('inviteId');

  const [game] = useState(() => new Chess());
  const [fen, setFen] = useState(game.fen());
  const [loading, setLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(true);
  
  const [myProfile, setMyProfile] = useState<any>(null);
  const [opponentProfile, setOpponentProfile] = useState<any>(null);

  // Контроль времени
  const [whiteTime, setWhiteTime] = useState(600);
  const [blackTime, setBlackTime] = useState(600);

  // Стороны
  const [playerColor, setPlayerColor] = useState<'w' | 'b' | null>(null);
  const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>('white');

  // Модалки финала
  const [showEndModal, setShowEndModal] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalReason, setModalReason] = useState('');

  // 🤝 СИСТЕМА ДИАЛОГОВ (Ничья / Сдача / Подтверждения)
  const [activeRequest, setActiveRequest] = useState<'draw_incoming' | 'draw_outgoing' | 'draw_declined' | 'resign_confirm' | null>(null);

  // 📶 МОНИТОРИНГ ПИНГА (Network Latency)
  const [ping, setPing] = useState<number>(25);
  const isJoinedRef = useRef(false); // Защита от циклической перезаписи гостя

  const isMyTurn = game.turn() === playerColor;

  // Имитация и замер сетевой задержки (Пинг)
  useEffect(() => {
    const interval = setInterval(() => {
      const start = Date.now();
      // Легкий запрос к профилю для замера задержки чтения
      if (auth.currentUser) {
        getDoc(doc(db, 'profiles', auth.currentUser.uid)).then(() => {
          setPing(Date.now() - start);
        });
      }
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // ТАЙМЕРЫ МАТЧА
  useEffect(() => {
    if (isSearching || game.isGameOver() || showEndModal) return;

    const timer = setInterval(() => {
      if (game.turn() === 'w') {
        setWhiteTime((prev) => (prev > 0 ? prev - 1 : 0));
      } else {
        setBlackTime((prev) => (prev > 0 ? prev - 1 : 0));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [fen, isSearching, showEndModal, game]);

  // СЕТЕВАЯ СИНХРОНИЗАЦИЯ (FIRESTORE)
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      router.push('/login');
      return;
    }

    const unsubMyProfile = onSnapshot(doc(db, 'profiles', user.uid), (snap) => {
      if (snap.exists()) setMyProfile(snap.data());
    });

    if (!inviteId) {
      router.push('/dashboard');
      return;
    }

    const unsubMatch = onSnapshot(doc(db, 'invites', inviteId), async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        
        // ОДНОКРАТНОЕ ПОДКЛЮЧЕНИЕ ГОСТЯ (Защита от бага бесконечных белых фигур)
        if (data.fromUid !== user.uid && !data.toUid && data.status === 'pending' && !isJoinedRef.current) {
          isJoinedRef.current = true;
          await updateDoc(doc(db, 'invites', inviteId), {
            toUid: user.uid,
            status: 'accepted'
          });
          return;
        }

        if (!data.toUid || data.status !== 'accepted') {
          setIsSearching(true);
          setLoading(false);
          return;
        }

        // Вычисление и фиксация цветов сторон по UID
        if (user.uid === data.fromUid) {
          setPlayerColor('w');
          setBoardOrientation('white');
        } else if (user.uid === data.toUid) {
          setPlayerColor('b');
          setBoardOrientation('black');
        }

        setIsSearching(false);

        // Отслеживание запросов на ничью от оппонента
        if (data.drawRequestedBy && data.drawRequestedBy !== user.uid) {
          setActiveRequest('draw_incoming');
        } else if (!data.drawRequestedBy && (activeRequest === 'draw_incoming' || activeRequest === 'draw_outgoing')) {
          // Противник отклонил нашу ничью
          setActiveRequest('draw_declined');
          setTimeout(() => {
            setActiveRequest(null);
          }, 3000);
        }

        // Обработка финала (победа/ничья/сдача)
        if (data.winnerUid) {
          if (data.winnerUid === 'draw') {
            setModalTitle('Ничья 🤝');
            setModalReason(data.reason || 'Игроки согласились на ничью');
          } else if (data.winnerUid === user.uid) {
            setModalTitle('Победа! 🏆');
            setModalReason(data.reason || 'Соперник сдался');
          } else {
            setModalTitle('Поражение 💥');
            setModalReason(data.reason || 'Вы признали поражение');
          }
          setActiveRequest(null);
          setShowEndModal(true);
        }

        // Обновление положения фигур
        if (data.currentFen && data.currentFen !== game.fen()) {
          game.load(data.currentFen);
          setFen(data.currentFen);
          
          if (game.isCheckmate()) {
            const loser = game.turn();
            const iWon = (loser === 'b' && user.uid === data.fromUid) || (loser === 'w' && user.uid === data.toUid);
            setModalTitle(iWon ? 'Победа! 🏆' : 'Поражение 💥');
            setModalReason('Шах и мат');
            setShowEndModal(true);
          }
        }

        const opponentUid = user.uid === data.fromUid ? data.toUid : data.fromUid;
        if (opponentUid && !opponentProfile) {
          const oppSnap = await getDoc(doc(db, 'profiles', opponentUid));
          if (oppSnap.exists()) setOpponentProfile(oppSnap.data());
        }
      } else {
        router.push('/dashboard');
      }
      setLoading(false);
    });

    return () => {
      unsubMyProfile();
      unsubMatch();
    };
  }, [inviteId, opponentProfile, game, router, activeRequest]);

  // ВАЛИДАЦИЯ И ХОД ФИГУРЫ
  const onPieceDrop = (sourceSquare: string, targetSquare: string) => {
    if (game.isGameOver() || game.turn() !== playerColor || isSearching || showEndModal) return false;

    try {
      const move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q'
      });

      if (move === null) return false;

      setFen(game.fen());

      if (inviteId) {
        updateDoc(doc(db, 'invites', inviteId), {
          currentFen: game.fen(),
          lastMoveBy: auth.currentUser?.uid || ''
        }).catch(err => console.error(err));
      }

      return true;
    } catch (error) {
      return false;
    }
  };

  // ПРЕДЛОЖЕНИЕ НИЧЬЕЙ (ОТПРАВКА)
  const sendDrawRequest = async () => {
    if (!inviteId || !auth.currentUser) return;
    setActiveRequest('draw_outgoing');
    await updateDoc(doc(db, 'invites', inviteId), {
      drawRequestedBy: auth.currentUser.uid
    });
  };

  // ОТВЕТ НА НИЧЬЮ
  const handleDrawResponse = async (accept: boolean) => {
    if (!inviteId) return;
    if (accept) {
      await updateDoc(doc(db, 'invites', inviteId), {
        winnerUid: 'draw',
        reason: 'Ничья по соглашению сторон'
      });
    } else {
      await updateDoc(doc(db, 'invites', inviteId), {
        drawRequestedBy: null
      });
      setActiveRequest('draw_declined');
      // Показать сообщение об отклонении на 3 секунды
      setTimeout(() => {
        setActiveRequest(null);
      }, 3000);
    }
  };

  // СДАЧА И ЕЕ ПОДТВЕРЖДЕНИЕ
  const confirmResign = async () => {
    if (!inviteId || !opponentProfile || !auth.currentUser) return;
    await updateDoc(doc(db, 'invites', inviteId), {
      winnerUid: opponentProfile.id || opponentProfile.uid || 'opponent',
      reason: 'Соперник сдался'
    });
    setActiveRequest(null);
  };

  const formatTime = (timeInSeconds: number) => {
    const mins = Math.floor(timeInSeconds / 60);
    const secs = timeInSeconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (loading) return (
    <div className="fixed inset-0 bg-[#161f2c] flex flex-col items-center justify-center text-white gap-4 z-50">
      <Loader2 className="text-emerald-500 animate-spin" size={36} />
      <span className="text-xs font-black uppercase tracking-widest text-slate-500">Синхронизация Арены...</span>
    </div>
  );

  if (isSearching) return (
    <div className="fixed inset-0 bg-[#161f2c] z-50 flex flex-col items-center justify-center text-white font-sans p-6 select-none">
      <div className="bg-slate-900/40 border border-slate-900 backdrop-blur-xl p-8 rounded-3xl text-center max-w-sm w-full space-y-6 shadow-2xl transition-all duration-300">
        <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400 mx-auto relative">
          <Users size={28} className="animate-pulse" />
          <Loader2 size={16} className="text-emerald-400 animate-spin absolute -top-1 -right-1" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-black tracking-tight uppercase">Поиск соперника</h3>
          <p className="text-xs text-slate-400 font-medium leading-relaxed">Ожидаем подключения второго игрока...</p>
        </div>
        <button onClick={() => router.push('/dashboard')} className="w-full py-3 bg-slate-950/60 text-xs font-black text-slate-400 border border-slate-800 rounded-xl hover:text-red-400 transition-all active:scale-95"><X size={14} className="inline mr-1"/> ОТМЕНА</button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-[#161f2c] z-50 flex items-center justify-center font-sans select-none overflow-hidden p-4 transition-all duration-500">
      
      {/* 📶 МОНИТОР СВЯЗИ (ПИНГ) ВЕРХНИЙ ПРАВЫЙ УГОЛ */}
      <div className="absolute top-6 right-6 flex items-center gap-2 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-full text-xs font-bold transition-all backdrop-blur-md">
        <Wifi size={14} className={ping > 150 ? 'text-red-500 animate-pulse' : ping > 75 ? 'text-amber-500' : 'text-emerald-400'} />
        <span className={ping > 150 ? 'text-red-400' : ping > 75 ? 'text-amber-400' : 'text-slate-300'}>{ping} ms</span>
      </div>

      {/* 🏆 МОДАЛЬНОЕ ОКНО ФИНАЛА */}
      {showEndModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl text-center max-w-sm w-full space-y-6 shadow-2xl transition-all scale-100">
            <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center text-amber-400 mx-auto"><Trophy size={32} /></div>
            <div className="space-y-1">
              <h2 className="text-2xl font-black tracking-tight uppercase text-white">{modalTitle}</h2>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{modalReason}</p>
            </div>
            <div className="h-px bg-slate-800" />
            <div className="space-y-2">
              <button onClick={() => router.push('/dashboard')} className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2 uppercase tracking-wider active:scale-95"><RotateCcw size={14} /> В главное меню</button>
            </div>
          </div>
        </div>
      )}

      {/* ✉️ ДИНАМИЧЕСКИЕ СЕТЕВЫЕ ЗАПРОСЫ (НИЧЬЯ / СДАЧА) */}
      {activeRequest && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl text-center max-w-xs w-full space-y-4 shadow-xl">
            <AlertCircle size={24} className="mx-auto text-emerald-400" />
            
            {activeRequest === 'draw_incoming' && (
              <>
                <p className="text-xs font-bold text-slate-200">Противник предлагает завершить партию вничью. Принять?</p>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => handleDrawResponse(true)} className="py-2 bg-emerald-500 text-slate-950 rounded-lg text-xs font-black uppercase"><Check size={12} className="inline mr-1"/> Да</button>
                  <button onClick={() => handleDrawResponse(false)} className="py-2 bg-slate-950 border border-slate-800 text-slate-400 rounded-lg text-xs font-black uppercase"><X size={12} className="inline mr-1"/> Нет</button>
                </div>
              </>
            )}

            {activeRequest === 'draw_outgoing' && (
              <>
                <p className="text-xs font-bold text-slate-400 animate-pulse">Запрос на ничью отправлен противнику. Ожидание ответа...</p>
                <button onClick={() => handleDrawResponse(false)} className="w-full py-2 bg-slate-950 border border-slate-800 text-red-400 rounded-lg text-xs font-black uppercase">Отменить запрос</button>
              </>
            )}

            {activeRequest === 'draw_declined' && (
              <>
                <AlertCircle size={20} className="mx-auto text-red-400" />
                <p className="text-xs font-bold text-slate-200">Противник отклонил предложение ничьи</p>
                <p className="text-[11px] text-slate-500">Продолжайте игру или предложите ничью позже</p>
              </>
            )}

            {activeRequest === 'resign_confirm' && (
              <>
                <p className="text-xs font-bold text-slate-200">Вы действительно хотите сдаться и признать поражение?</p>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={confirmResign} className="py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-black uppercase">Да, сдаться</button>
                  <button onClick={() => setActiveRequest(null)} className="py-2 bg-slate-950 border border-slate-800 text-slate-400 rounded-lg text-xs font-black uppercase">Отмена</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ИГРОВАЯ ОБЛАСТЬ */}
      <div className="w-full max-w-6xl flex items-center justify-center gap-6 relative transition-all duration-300">
        
        {/* ЛЕВАЯ ПАНЕЛЬ */}
        <div className="flex flex-col justify-between h-[520px] w-48 shrink-0 py-2">
          
          {/* СОПЕРНИК */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-slate-800 rounded-lg flex items-center justify-center border border-slate-700 overflow-hidden text-base font-black">
                {opponentProfile?.photoURL ? <img src={opponentProfile.photoURL} alt="Opponent" className="w-full h-full object-cover" /> : opponentProfile?.username?.[0] || '?'}
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-200 truncate max-w-[120px]">{opponentProfile?.username || 'Противник'}</h4>
                <span className="text-[10px] bg-slate-900 px-1 rounded text-slate-400 font-bold">🎯 {opponentProfile?.rating || 1200}</span>
              </div>
            </div>
            <div className={`w-28 py-2 px-4 rounded-lg font-mono font-black text-xl border transition-all duration-300 ${
              !isMyTurn ? 'bg-white text-slate-950 border-white shadow-xl scale-105' : 'bg-slate-900/60 text-slate-400 border-slate-800'
            }`}>
              {formatTime(boardOrientation === 'white' ? blackTime : whiteTime)}
            </div>
          </div>

          {/* ТЫ */}
          <div className="space-y-3">
            <div className="relative">
              <div className={`w-28 py-2 px-4 rounded-lg font-mono font-black text-xl border transition-all duration-300 relative z-10 ${
                isMyTurn ? 'bg-white text-slate-950 border-white shadow-2xl scale-105' : 'bg-slate-900/60 text-slate-400 border-slate-800'
              }`}>
                {formatTime(boardOrientation === 'white' ? whiteTime : blackTime)}
              </div>
              {isMyTurn && <div className="absolute -bottom-1 left-0 right-0 h-1 bg-emerald-500 rounded-full mx-3 z-20 animate-pulse" />}
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-slate-800 rounded-lg flex items-center justify-center border border-slate-700 overflow-hidden text-base font-black text-emerald-400">
                {myProfile?.photoURL ? <img src={myProfile.photoURL} alt="Me" className="w-full h-full object-cover" /> : myProfile?.username?.[0]}
              </div>
              <div>
                <h4 className="text-xs font-black text-white truncate max-w-[120px]">{myProfile?.username}</h4>
                <span className="text-[10px] bg-slate-900 px-1 rounded text-amber-400 font-bold">🏆 {myProfile?.rating || 1200}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ШАХМАТНОЕ ПОЛЕ */}
        <div className="p-1 bg-[#121922]/40 rounded-xl shadow-2xl border border-slate-900/40 overflow-hidden w-[520px] h-[520px] shrink-0 transition-transform duration-300">
          <Chessboard
            position={fen}
            onPieceDrop={onPieceDrop}
            boardOrientation={boardOrientation}
            animationDuration={180} // Сверхплавное движение фигур
            customDarkSquareStyle={{ backgroundColor: '#769656' }}
            customLightSquareStyle={{ backgroundColor: '#eeeed2' }}
            boardWidth={512}
            arePiecesDraggable={isMyTurn && !game.isGameOver() && !showEndModal && !activeRequest}
            {...({} as any)}
          />
        </div>

        {/* ПРАВАЯ ПАНЕЛЬ ИГРОВОГО УПРАВЛЕНИЯ */}
        <div className="flex flex-col gap-3 shrink-0 justify-center h-[520px]">
          {/* Предложить ничью */}
          <button 
            onClick={sendDrawRequest}
            disabled={isSearching || showEndModal || activeRequest === 'draw_outgoing' || activeRequest === 'draw_incoming'}
            className="w-12 h-12 bg-slate-900/60 border border-slate-800 hover:border-slate-700 rounded-xl flex items-center justify-center font-mono font-black text-sm text-slate-300 transition-all hover:bg-slate-800 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
            title="Предложить ничью"
          >
            ½
          </button>
          
          {/* Сдаться */}
          <button 
            onClick={() => setActiveRequest('resign_confirm')}
            disabled={isSearching || showEndModal || activeRequest === 'resign_confirm'}
            className="w-12 h-12 bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-red-400 hover:border-red-500/20 rounded-xl flex items-center justify-center transition-all hover:bg-slate-800 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
            title="Сдаться"
          >
            <Flag size={18} />
          </button>
        </div>

      </div>
    </div>
  );
}