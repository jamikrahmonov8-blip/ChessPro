'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Chess, Square } from 'chess.js';
import { auth, db } from '@/utils/firebase';
import { doc, getDoc, updateDoc, onSnapshot, increment } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Flag, Users, X, Trophy, Wifi, Check, AlertCircle, Settings, Palette } from 'lucide-react';

const BOARD_THEMES = {
  green: { dark: 'bg-[#769656]', light: 'bg-[#eeeed2]', textDark: 'text-[#eeeed2]', textLight: 'text-[#769656]' },
  wood:  { dark: 'bg-[#b58863]', light: 'bg-[#f0d9b5]', textDark: 'text-[#f0d9b5]', textLight: 'text-[#b58863]' },
  dark:  { dark: 'bg-[#4b7399]', light: 'bg-[#eae9d2]', textDark: 'text-[#eae9d2]', textLight: 'text-[#4b7399]' },
};

const PIECE_IMAGES: Record<string, Record<string, string>> = {
  w: {
    p: 'https://upload.wikimedia.org/wikipedia/commons/4/45/Chess_plt45.svg',
    r: 'https://upload.wikimedia.org/wikipedia/commons/7/72/Chess_rlt45.svg',
    n: 'https://upload.wikimedia.org/wikipedia/commons/7/70/Chess_nlt45.svg',
    b: 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Chess_blt45.svg',
    q: 'https://upload.wikimedia.org/wikipedia/commons/1/15/Chess_qlt45.svg',
    k: 'https://upload.wikimedia.org/wikipedia/commons/4/42/Chess_klt45.svg',
  },
  b: {
    p: 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Chess_pdt45.svg',
    r: 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Chess_rdt45.svg',
    n: 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Chess_ndt45.svg',
    b: 'https://upload.wikimedia.org/wikipedia/commons/9/98/Chess_bdt45.svg',
    q: 'https://upload.wikimedia.org/wikipedia/commons/4/47/Chess_qdt45.svg',
    k: 'https://upload.wikimedia.org/wikipedia/commons/f/f0/Chess_kdt45.svg',
  },
};

export default function GameContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const inviteId = searchParams.get('inviteId');

  const chessRef = useRef(new Chess());
  const [board, setBoard] = useState(chessRef.current.board());
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<string[]>([]);
  const [isShaking, setIsShaking] = useState(false);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);

  const [boardTheme, setBoardTheme] = useState<keyof typeof BOARD_THEMES>('green');
  const [showSettings, setShowSettings] = useState(false);

  const [loading, setLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(true);

  const [myProfile, setMyProfile] = useState<any>(null);
  const [opponentProfile, setOpponentProfile] = useState<any>(null);

  const [whiteTime, setWhiteTime] = useState(600);
  const [blackTime, setBlackTime] = useState(600);

  // ← КЛЮЧЕВОЕ: ref для цвета чтобы не было race condition
  const playerColorRef = useRef<'w' | 'b' | null>(null);
  const [playerColor, setPlayerColor] = useState<'w' | 'b' | null>(null);
  const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>('white');

  const [gameResult, setGameResult] = useState<{ winner: string; reason: string; ratingDiff: number } | null>(null);
  const [activeRequest, setActiveRequest] = useState<'draw_incoming' | 'draw_outgoing' | 'resign_confirm' | null>(null);

  const [ping, setPing] = useState<number>(14);

  const ratingUpdatedRef = useRef(false);
  const opponentLoadedRef = useRef(false);

  const isMyTurn = chessRef.current.turn() === playerColorRef.current;

  // Пинг
  useEffect(() => {
    const interval = setInterval(() => {
      const start = Date.now();
      if (auth.currentUser) {
        getDoc(doc(db, 'profiles', auth.currentUser.uid)).then(() => setPing(Date.now() - start));
      }
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Таймеры
  useEffect(() => {
    if (isSearching || chessRef.current.isGameOver() || gameResult) return;
    const timer = setInterval(() => {
      if (chessRef.current.turn() === 'w') {
        setWhiteTime(prev => (prev > 0 ? prev - 1 : 0));
      } else {
        setBlackTime(prev => (prev > 0 ? prev - 1 : 0));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [board, isSearching, gameResult]);

  // Firestore синхронизация
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) { router.push('/login'); return; }
    if (!inviteId) { router.push('/dashboard'); return; }

    const unsubMyProfile = onSnapshot(doc(db, 'profiles', user.uid), snap => {
      if (snap.exists()) setMyProfile(snap.data());
    });

    const unsubMatch = onSnapshot(doc(db, 'invites', inviteId), async snapshot => {
      if (!snapshot.exists()) { router.push('/dashboard'); return; }

      const data = snapshot.data();

      // Ждём пока оба игрока зашли
      if (!data.toUid) {
        setIsSearching(true);
        setLoading(false);
        return;
      }

      setIsSearching(false);

      // ← ФИКС: устанавливаем цвет ОДИН РАЗ через ref
      if (playerColorRef.current === null) {
        const color = user.uid === data.fromUid ? 'w' : 'b';
        playerColorRef.current = color;
        setPlayerColor(color);
        setBoardOrientation(color === 'w' ? 'white' : 'black');
      }

      // Загружаем профиль соперника один раз
      if (!opponentLoadedRef.current) {
        const opponentUid = user.uid === data.fromUid ? data.toUid : data.fromUid;
        if (opponentUid) {
          opponentLoadedRef.current = true;
          const oppSnap = await getDoc(doc(db, 'profiles', opponentUid));
          if (oppSnap.exists()) setOpponentProfile(oppSnap.data());
        }
      }

      // Входящее предложение ничьей
      if (data.drawRequestedBy && data.drawRequestedBy !== user.uid) {
        setActiveRequest('draw_incoming');
      } else if (!data.drawRequestedBy && activeRequest === 'draw_incoming') {
        setActiveRequest(null);
      }

      // Результат игры
      if (data.winnerUid && !gameResult && !ratingUpdatedRef.current) {
        ratingUpdatedRef.current = true;

        const isDraw = data.winnerUid === 'draw';
        const iWon = data.winnerUid === user.uid;
        const ratingDiff = isDraw ? 0 : iWon ? 10 : -10;

        await updateDoc(doc(db, 'profiles', user.uid), {
          rating: increment(ratingDiff),
        });

        setGameResult({
          winner: data.winnerUid,
          reason: data.reason || 'Партия завершена',
          ratingDiff,
        });
        setActiveRequest(null);
      }

      // Синхронизация позиции
      if (data.currentFen && data.currentFen !== chessRef.current.fen()) {
        chessRef.current.load(data.currentFen);
        setBoard(chessRef.current.board());

        if (chessRef.current.inCheck()) {
          setIsShaking(true);
          setTimeout(() => setIsShaking(false), 400);
        }

        // Мат — записываем победителя
        if (chessRef.current.isCheckmate() && !data.winnerUid) {
          const loserTurn = chessRef.current.turn(); // кто получил мат
          const winnerUid = loserTurn === 'b'
            ? data.fromUid  // белые победили = host
            : data.toUid;   // чёрные победили = guest
          await updateDoc(doc(db, 'invites', inviteId), {
            winnerUid,
            reason: 'Шах и мат',
          });
        }
      }

      setLoading(false);
    });

    return () => { unsubMyProfile(); unsubMatch(); };
  }, [inviteId, router]);

  const handleSquareClick = (squareName: string) => {
    if (!isMyTurn || gameResult || activeRequest) return;

    if (selectedSquare === null) {
      const piece = chessRef.current.get(squareName as Square);
      if (piece && piece.color === playerColorRef.current) {
        setSelectedSquare(squareName);
        const moves = chessRef.current.moves({ square: squareName as Square, verbose: true });
        setPossibleMoves(moves.map(m => m.to));
      }
    } else {
      if (squareName === selectedSquare) {
        setSelectedSquare(null);
        setPossibleMoves([]);
        return;
      }

      // Кликнули на свою другую фигуру
      const piece = chessRef.current.get(squareName as Square);
      if (piece && piece.color === playerColorRef.current) {
        setSelectedSquare(squareName);
        const moves = chessRef.current.moves({ square: squareName as Square, verbose: true });
        setPossibleMoves(moves.map(m => m.to));
        return;
      }

      try {
        const move = chessRef.current.move({
          from: selectedSquare,
          to: squareName,
          promotion: 'q',
        });

        if (move) {
          setLastMove({ from: selectedSquare, to: squareName });
          setBoard(chessRef.current.board());
          setSelectedSquare(null);
          setPossibleMoves([]);

          if (inviteId) {
            updateDoc(doc(db, 'invites', inviteId), {
              currentFen: chessRef.current.fen(),
              lastMoveBy: auth.currentUser?.uid || '',
            }).catch(console.error);
          }
        } else {
          triggerInvalidMove();
        }
      } catch {
        triggerInvalidMove();
      }
    }
  };

  const triggerInvalidMove = () => {
    setSelectedSquare(null);
    setPossibleMoves([]);
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 350);
  };

  const sendDrawRequest = async () => {
    if (!inviteId || !auth.currentUser || activeRequest) return;
    setActiveRequest('draw_outgoing');
    await updateDoc(doc(db, 'invites', inviteId), { drawRequestedBy: auth.currentUser.uid });
  };

  const handleDrawResponse = async (accept: boolean) => {
    if (!inviteId) return;
    if (accept) {
      await updateDoc(doc(db, 'invites', inviteId), { winnerUid: 'draw', reason: 'Ничья по соглашению' });
    } else {
      await updateDoc(doc(db, 'invites', inviteId), { drawRequestedBy: null });
      setActiveRequest(null);
    }
  };

  const confirmResign = async () => {
    if (!inviteId || !auth.currentUser) return;
    const user = auth.currentUser;
    const winnerColor = playerColorRef.current === 'w' ? 'b' : 'w';

    // Определяем UID победителя по цвету
    const invSnap = await getDoc(doc(db, 'invites', inviteId));
    if (!invSnap.exists()) return;
    const data = invSnap.data();
    const winnerUid = winnerColor === 'w' ? data.fromUid : data.toUid;

    await updateDoc(doc(db, 'invites', inviteId), {
      winnerUid,
      reason: 'Соперник сдался',
    });
    setActiveRequest(null);
  };

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  if (loading) return (
    <div className="fixed inset-0 bg-[#0e131a] flex flex-col items-center justify-center text-white gap-4 z-50">
      <Loader2 className="text-emerald-500 animate-spin" size={36} />
      <span className="text-xs font-black uppercase tracking-widest text-slate-500">Запуск Арены...</span>
    </div>
  );

  if (isSearching) return (
    <div className="fixed inset-0 bg-[#0e131a] z-50 flex flex-col items-center justify-center text-white p-6 select-none">
      <div className="bg-slate-900/40 border border-slate-800/40 backdrop-blur-xl p-8 rounded-3xl text-center max-w-sm w-full space-y-6 shadow-2xl">
        <Users size={28} className="animate-pulse mx-auto text-emerald-400" />
        <h3 className="text-sm font-black uppercase tracking-wider">Поиск соперника...</h3>
        <button onClick={() => router.push('/dashboard')} className="w-full py-3 bg-slate-950/60 text-xs font-black text-slate-400 border border-slate-800 rounded-xl hover:text-red-400 transition-all">
          <X size={12} className="inline mr-1" /> ОТМЕНА
        </button>
      </div>
    </div>
  );

  const theme = BOARD_THEMES[boardTheme];
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 overflow-hidden select-none font-sans bg-[#0f151d]">

      {/* Пинг */}
      <div className="absolute top-6 right-6 flex items-center gap-2 bg-slate-900/50 border border-slate-800/40 px-3 py-1.5 rounded-full text-xs font-bold text-slate-400 backdrop-blur-md z-10">
        <Wifi size={14} className={ping > 120 ? 'text-red-500' : 'text-emerald-400'} />
        <span>{ping} ms</span>
      </div>

      {/* Модалка результата */}
      <AnimatePresence>
        {gameResult && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }}
              className="bg-slate-900 border border-slate-800 p-8 rounded-3xl text-center max-w-sm w-full space-y-6 shadow-2xl">
              <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center text-amber-400 mx-auto">
                <Trophy size={28} />
              </div>
              <div>
                <h2 className="text-2xl font-black uppercase text-white tracking-wide">
                  {gameResult.winner === 'draw' ? 'Ничья 🤝' : gameResult.winner === auth.currentUser?.uid ? 'Победа! 🎉' : 'Поражение 💥'}
                </h2>
                <p className="text-xs text-slate-400 font-bold uppercase mt-1.5 tracking-wider">{gameResult.reason}</p>
              </div>
              <div className="bg-slate-950/60 border border-slate-900/40 p-4 rounded-xl font-mono text-xs font-bold text-slate-300">
                Рейтинг:{' '}
                <span className={gameResult.ratingDiff > 0 ? 'text-emerald-400' : gameResult.ratingDiff < 0 ? 'text-red-400' : 'text-slate-400'}>
                  {gameResult.ratingDiff > 0 ? `+${gameResult.ratingDiff}` : gameResult.ratingDiff} Elo
                </span>
              </div>
              <button onClick={() => router.push('/dashboard')}
                className="w-full py-3 bg-emerald-500 text-slate-950 text-xs font-black rounded-xl uppercase tracking-wider active:scale-95">
                Выйти в лобби
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-5xl flex flex-col lg:flex-row items-center justify-center gap-6 relative z-10">

        {/* Левая панель — таймеры */}
        <div className="flex lg:flex-col justify-between lg:h-[484px] w-full lg:w-48 shrink-0 gap-4">
          {/* Соперник */}
          <div className="flex lg:flex-col items-center lg:items-start justify-between w-full p-3 bg-slate-900/40 border border-slate-800/20 rounded-2xl backdrop-blur-md">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-slate-800 border border-slate-700 rounded-lg flex items-center justify-center text-xs font-black text-slate-300">
                {opponentProfile?.username?.[0] || '?'}
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-200 truncate max-w-[90px]">{opponentProfile?.username || 'Соперник'}</h4>
                <span className="text-[10px] text-slate-500">🎯 {opponentProfile?.rating || 1200}</span>
              </div>
            </div>
            <div className={`mt-2 py-1.5 px-3 font-mono font-black text-base rounded-lg border transition-colors ${
              !isMyTurn ? 'bg-white text-slate-950 border-white shadow-lg' : 'bg-slate-950/80 text-slate-400 border-slate-900/60'
            }`}>
              {formatTime(boardOrientation === 'white' ? blackTime : whiteTime)}
            </div>
          </div>

          {/* Я */}
          <div className="flex lg:flex-col items-center lg:items-start justify-between w-full p-3 bg-slate-900/40 border border-slate-800/20 rounded-2xl backdrop-blur-md">
            <div className={`py-1.5 px-3 font-mono font-black text-base rounded-lg border transition-colors ${
              isMyTurn ? 'bg-white text-slate-950 border-white shadow-lg' : 'bg-slate-950/80 text-slate-400 border-slate-900/60'
            }`}>
              {formatTime(boardOrientation === 'white' ? whiteTime : blackTime)}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <div className="w-8 h-8 bg-slate-800 border border-slate-700 rounded-lg flex items-center justify-center text-xs font-black text-emerald-400">
                {myProfile?.username?.[0]}
              </div>
              <div>
                <h4 className="text-xs font-black text-white truncate max-w-[90px]">{myProfile?.username}</h4>
                <span className="text-[10px] text-amber-400">🏆 {myProfile?.rating || 1200}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Доска */}
        <motion.div
          animate={isShaking ? { x: [-5, 5, -5, 5, -2, 2, 0] } : {}}
          transition={{ duration: 0.3 }}
          className="rounded-xl overflow-hidden shadow-2xl border border-slate-800/20 shrink-0"
          style={{ width: 484, height: 484 }}
        >
          <div className="grid grid-cols-8 grid-rows-8 w-full h-full">
            {Array.from({ length: 8 }, (_, r) => {
              const rowIndex = boardOrientation === 'white' ? 7 - r : r;
              return Array.from({ length: 8 }, (_, f) => {
                const fileIndex = boardOrientation === 'white' ? f : 7 - f;
                const squareName = `${files[fileIndex]}${rowIndex + 1}`;

                // ← ФИКС: правильный индекс для board
                const piece = board[7 - rowIndex][fileIndex];

                const isDark = (rowIndex + fileIndex) % 2 === 0;
                const isSelected = selectedSquare === squareName;
                const isPossible = possibleMoves.includes(squareName);
                const isLastMove = lastMove?.from === squareName || lastMove?.to === squareName;
                const isKingInCheck = piece?.type === 'k' && piece?.color === chessRef.current.turn() && chessRef.current.inCheck();

                return (
                  <div
                    key={squareName}
                    onClick={() => handleSquareClick(squareName)}
                    className={`relative flex items-center justify-center cursor-pointer transition-colors duration-150 ${
                      isKingInCheck
                        ? 'bg-red-500/70'
                        : isSelected
                        ? 'bg-amber-400/60'
                        : isLastMove
                        ? isDark ? 'bg-[#aaa23a]' : 'bg-[#cdd16f]'
                        : isDark ? theme.dark : theme.light
                    }`}
                  >
                    {/* Подсветка возможных ходов */}
                    {isPossible && (
                      <div className={`absolute z-20 pointer-events-none rounded-full ${
                        piece
                          ? 'inset-0 border-4 border-black/20'
                          : 'w-[30%] h-[30%] bg-black/20'
                      }`} />
                    )}

                    {/* Фигура */}
                    {piece && (
                      <img
                        src={PIECE_IMAGES[piece.color][piece.type]}
                        alt={`${piece.color}${piece.type}`}
                        className="w-[88%] h-[88%] object-contain z-10 pointer-events-none drop-shadow-md"
                        draggable={false}
                      />
                    )}

                    {/* Координаты */}
                    {fileIndex === (boardOrientation === 'white' ? 0 : 7) && (
                      <span className={`absolute top-0.5 left-0.5 text-[8px] font-black z-30 ${isDark ? theme.textDark : theme.textLight}`}>
                        {rowIndex + 1}
                      </span>
                    )}
                    {rowIndex === (boardOrientation === 'white' ? 0 : 7) && (
                      <span className={`absolute bottom-0.5 right-0.5 text-[8px] font-black z-30 ${isDark ? theme.textDark : theme.textLight}`}>
                        {files[fileIndex]}
                      </span>
                    )}
                  </div>
                );
              });
            })}
          </div>
        </motion.div>

        {/* Правая панель */}
        <div className="flex lg:flex-col gap-3 shrink-0 justify-center">
          <button onClick={sendDrawRequest} disabled={!!gameResult || !!activeRequest}
            className="w-11 h-11 bg-slate-900/50 border border-slate-800/40 text-slate-300 rounded-xl flex items-center justify-center font-bold text-sm hover:bg-slate-800 disabled:opacity-30 transition-all">
            ½
          </button>
          <button onClick={() => setActiveRequest('resign_confirm')} disabled={!!gameResult || !!activeRequest}
            className="w-11 h-11 bg-slate-900/50 border border-slate-800/40 text-slate-400 hover:text-red-400 rounded-xl flex items-center justify-center disabled:opacity-30 transition-all">
            <Flag size={16} />
          </button>
          <button onClick={() => setShowSettings(!showSettings)}
            className="w-11 h-11 bg-slate-900/50 border border-slate-800/40 text-slate-400 hover:text-emerald-400 rounded-xl flex items-center justify-center transition-all">
            <Settings size={16} />
          </button>
        </div>
      </div>

      {/* Настройки темы */}
      <AnimatePresence>
        {showSettings && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
            className="mt-4 bg-slate-900/90 border border-slate-800/40 p-4 rounded-2xl flex flex-col gap-3 max-w-xs w-full shadow-2xl backdrop-blur-md">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Palette size={13} /> Темы доски
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {(['green', 'wood', 'dark'] as const).map(t => (
                <button key={t} onClick={() => setBoardTheme(t)}
                  className={`py-1.5 text-[9px] font-bold rounded-lg border transition-all ${
                    boardTheme === t ? 'bg-emerald-500 text-slate-950 border-transparent' : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}>
                  {t === 'green' ? 'Зелёная' : t === 'wood' ? 'Дерево' : 'Синяя'}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Диалоги снизу */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-sm w-full px-4">
        <AnimatePresence>
          {activeRequest === 'draw_incoming' && (
            <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}
              className="bg-slate-900/90 border border-slate-800/40 p-4 rounded-2xl flex items-center justify-between shadow-2xl gap-4 backdrop-blur-md">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <AlertCircle size={14} className="text-emerald-400" /> Соперник предлагает ничью
              </span>
              <div className="flex gap-1.5">
                <button onClick={() => handleDrawResponse(true)} className="p-2 bg-emerald-500 text-slate-950 rounded-xl"><Check size={14} /></button>
                <button onClick={() => handleDrawResponse(false)} className="p-2 bg-slate-950 border border-slate-800 text-red-400 rounded-xl"><X size={14} /></button>
              </div>
            </motion.div>
          )}
          {activeRequest === 'draw_outgoing' && (
            <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}
              className="bg-slate-900/90 border border-slate-800/40 p-4 rounded-2xl flex items-center justify-between shadow-2xl backdrop-blur-md">
              <span className="text-xs font-bold text-slate-400 animate-pulse">Предложение ничьей отправлено...</span>
              <button onClick={() => handleDrawResponse(false)} className="text-[9px] font-black text-red-400 bg-red-500/10 px-2.5 py-1.5 rounded-xl border border-red-500/20">Отмена</button>
            </motion.div>
          )}
          {activeRequest === 'resign_confirm' && (
            <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}
              className="bg-slate-900/90 border border-slate-800/40 p-4 rounded-2xl flex flex-col gap-3 shadow-2xl backdrop-blur-md">
              <span className="text-xs font-bold text-slate-200 text-center">Вы действительно хотите сдаться?</span>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={confirmResign} className="py-2 bg-red-500 text-white text-xs font-black rounded-xl uppercase">Да, сдаться</button>
                <button onClick={() => setActiveRequest(null)} className="py-2 bg-slate-950 border border-slate-800 text-slate-400 text-xs font-black rounded-xl uppercase">Отмена</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}