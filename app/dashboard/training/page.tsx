'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Chess, Square } from 'chess.js';
import { auth, db } from '@/utils/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Flag, Trophy, Wifi, Settings, Palette, Brain, ChevronRight } from 'lucide-react';

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

const BOT_LEVELS = [
  { id: 1, name: 'Новичок 🍏', depth: 1, desc: 'Бот делает случайные ходы и часто подставляет фигуры.' },
  { id: 2, name: 'Любитель 🪵', depth: 2, desc: 'Защищает свои фигуры и атакует незащищенные слабые клетки.' },
  { id: 3, name: 'Мастер 🔥', depth: 3, desc: 'Просчитывает комбинации на 3 хода вперед. Ошибок не прощает.' }
];

export default function TrainingPage() {
  const router = useRouter();

  const chessRef = useRef(new Chess());
  const [board, setBoard] = useState(chessRef.current.board());
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<string[]>([]);
  const [isShaking, setIsShaking] = useState(false);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);

  const [boardTheme, setBoardTheme] = useState<keyof typeof BOARD_THEMES>('green');
  const [showSettings, setShowSettings] = useState(false);

  const [loading, setLoading] = useState(true);
  const [isChoosingLevel, setIsChoosingLevel] = useState(true);
  const [selectedLevel, setSelectedLevel] = useState(BOT_LEVELS[1]);

  const [myProfile, setMyProfile] = useState<any>(null);
  const [whiteTime, setWhiteTime] = useState(600);
  const [blackTime, setBlackTime] = useState(600);

  const playerColor = 'w';
  const boardOrientation = 'white';

  const [gameResult, setGameResult] = useState<{ winner: string; reason: string; ratingDiff: number } | null>(null);
  const [activeRequest, setActiveRequest] = useState<'resign_confirm' | null>(null);
  const [ping, setPing] = useState<number>(5);

  const isMyTurn = chessRef.current.turn() === playerColor;

  // Функция форматирования шахматных часов (Фикс рантайм-ошибки)
  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setPing(Math.floor(Math.random() * 5) + 3);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isChoosingLevel || chessRef.current.isGameOver() || gameResult) return;
    const timer = setInterval(() => {
      if (chessRef.current.turn() === 'w') {
        setWhiteTime(prev => (prev > 0 ? prev - 1 : 0));
      } else {
        setBlackTime(prev => (prev > 0 ? prev - 1 : 0));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [board, isChoosingLevel, gameResult]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) { router.push('/login'); return; }

    const unsubMyProfile = onSnapshot(doc(db, 'profiles', user.uid), snap => {
      if (snap.exists()) setMyProfile(snap.data());
      setLoading(false);
    });

    return () => unsubMyProfile();
  }, [router]);

  useEffect(() => {
    if (whiteTime === 0 && !gameResult) {
      setGameResult({ winner: 'b', reason: 'У вас закончилось время', ratingDiff: 0 });
    } else if (blackTime === 0 && !gameResult) {
      setGameResult({ winner: 'w', reason: 'У бота закончилось время', ratingDiff: 0 });
    }
  }, [whiteTime, blackTime, gameResult]);

  const evaluateBoard = (currentBoard: any[][]) => {
    const pieceValues: Record<string, number> = { p: 10, n: 30, b: 30, r: 50, q: 90, k: 9000 };
    let totalEvaluation = 0;
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const square = currentBoard[r][f];
        if (square) {
          const value = pieceValues[square.type];
          totalEvaluation += square.color === 'w' ? value : -value;
        }
      }
    }
    return totalEvaluation;
  };

  const minimax = (chess: Chess, depth: number, alpha: number, beta: number, isMaximizing: boolean): number => {
    if (depth === 0 || chess.isGameOver()) return evaluateBoard(chess.board());
    const moves = chess.moves();

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const move of moves) {
        chess.move(move);
        const evaluation = minimax(chess, depth - 1, alpha, beta, false);
        chess.undo();
        maxEval = Math.max(maxEval, evaluation);
        alpha = Math.max(alpha, evaluation);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const move of moves) {
        chess.move(move);
        const evaluation = minimax(chess, depth - 1, alpha, beta, true);
        chess.undo();
        minEval = Math.min(minEval, evaluation);
        beta = Math.min(beta, evaluation);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  };

  const makeBotMove = () => {
    if (chessRef.current.isGameOver() || gameResult) return;
    const moves = chessRef.current.moves({ verbose: true });
    if (moves.length === 0) return;

    let bestMove = moves[Math.floor(Math.random() * moves.length)];
    let bestValue = Infinity;
    moves.sort((a, b) => (b.captured ? 1 : 0) - (a.captured ? 1 : 0));

    for (const move of moves) {
      chessRef.current.move(move.san);
      const boardValue = minimax(chessRef.current, selectedLevel.depth - 1, -Infinity, Infinity, true);
      chessRef.current.undo();
      if (boardValue < bestValue) {
        bestValue = boardValue;
        bestMove = move;
      }
    }

    chessRef.current.move(bestMove.san);
    setLastMove({ from: bestMove.from, to: bestMove.to });
    setBoard(chessRef.current.board());

    if (chessRef.current.inCheck()) {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 400);
    }
    checkGameEnd();
  };

  const checkGameEnd = () => {
    if (chessRef.current.isCheckmate()) {
      const winnerColor = chessRef.current.turn() === 'w' ? 'b' : 'w';
      setGameResult({
        winner: winnerColor,
        reason: winnerColor === 'w' ? 'Вы поставили мат боту! 🎉' : 'Бот поставил вам мат 💥',
        ratingDiff: 0
      });
    } else if (chessRef.current.isDraw() || chessRef.current.isStalemate()) {
      setGameResult({ winner: 'draw', reason: 'Ничья или пат на доске 🤝', ratingDiff: 0 });
    }
  };

  const handleSquareClick = (squareName: string) => {
    if (!isMyTurn || gameResult || activeRequest) return;

    if (selectedSquare === null) {
      const piece = chessRef.current.get(squareName as Square);
      if (piece && piece.color === playerColor) {
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
      const piece = chessRef.current.get(squareName as Square);
      if (piece && piece.color === playerColor) {
        setSelectedSquare(squareName);
        const moves = chessRef.current.moves({ square: squareName as Square, verbose: true });
        setPossibleMoves(moves.map(m => m.to));
        return;
      }

      try {
        const move = chessRef.current.move({ from: selectedSquare, to: squareName, promotion: 'q' });
        if (move) {
          setLastMove({ from: selectedSquare, to: squareName });
          setBoard(chessRef.current.board());
          setSelectedSquare(null);
          setPossibleMoves([]);
          checkGameEnd();

          if (!chessRef.current.isGameOver()) {
            setTimeout(makeBotMove, 450);
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

  const startTrainingGame = () => {
    chessRef.current = new Chess();
    setBoard(chessRef.current.board());
    setWhiteTime(600);
    setBlackTime(600);
    setLastMove(null);
    setGameResult(null);
    setIsChoosingLevel(false);
  };

  if (loading) return (
    <div className="fixed inset-0 bg-[#0e131a] flex flex-col items-center justify-center text-white gap-4 z-50">
      <Loader2 className="text-emerald-500 animate-spin" size={36} />
      <span className="text-xs font-black uppercase tracking-widest text-slate-500">Подготовка процессора...</span>
    </div>
  );

  if (isChoosingLevel) return (
    <div className="fixed inset-0 bg-[#0e131a] z-50 flex flex-col items-center justify-center text-white p-6 select-none">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-slate-900 border border-slate-800 p-8 rounded-3xl text-center max-w-md w-full space-y-6 shadow-2xl">
        <Brain size={28} className="animate-pulse mx-auto text-emerald-400" />
        <div>
          <h3 className="text-lg font-black uppercase tracking-wider">Одиночный ИИ-режим</h3>
          <p className="text-xs text-slate-400">Выберите уровень сложности для тренировки</p>
        </div>
        <div className="space-y-2 text-left">
          {BOT_LEVELS.map((level) => (
            <button key={level.id} onClick={() => setSelectedLevel(level)}
              className={`w-full p-4 rounded-xl border transition-all text-left flex items-start gap-3 ${
                selectedLevel.id === level.id ? 'bg-emerald-500/10 border-emerald-500 text-white' : 'bg-slate-950 border-slate-800/80 text-slate-400'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${selectedLevel.id === level.id ? 'border-emerald-400' : 'border-slate-600'}`}>
                  {selectedLevel.id === level.id && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                </div>
              </div>
              <div>
                <div className="text-xs font-black uppercase tracking-wide text-slate-200">{level.name}</div>
                <div className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{level.desc}</div>
              </div>
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 pt-2">
          <button onClick={() => router.push('/dashboard')} className="py-3 bg-slate-950 border border-slate-800 text-xs font-black text-slate-400 rounded-xl uppercase">Назад</button>
          <button onClick={startTrainingGame} className="py-3 bg-emerald-500 text-slate-950 text-xs font-black rounded-xl flex items-center justify-center gap-1 uppercase tracking-wider">Играть <ChevronRight size={14} /></button>
        </div>
      </motion.div>
    </div>
  );

  const theme = BOARD_THEMES[boardTheme];
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 overflow-hidden select-none font-sans bg-[#0f151d]">
      <div className="absolute top-6 right-6 flex items-center gap-2 bg-slate-900/50 border border-slate-800/40 px-3 py-1.5 rounded-full text-xs font-bold text-slate-400 backdrop-blur-md">
        <Wifi size={14} className="text-emerald-400" />
        <span>{ping} ms</span>
      </div>

      <AnimatePresence>
        {gameResult && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl text-center max-w-sm w-full space-y-6">
              <Trophy size={28} className="mx-auto text-amber-400" />
              <div>
                <h2 className="text-2xl font-black uppercase text-white">{gameResult.winner === 'draw' ? 'Ничья 🤝' : gameResult.winner === 'w' ? 'Победа! 🎉' : 'Поражение 💥'}</h2>
                <p className="text-xs text-slate-400 font-bold uppercase mt-1">{gameResult.reason}</p>
              </div>
              <div className="bg-slate-950/60 border border-slate-900/40 p-4 rounded-xl font-mono text-xs font-bold text-slate-400 uppercase tracking-wider">
                Режим тренировки • Без изменения рейтинга
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setIsChoosingLevel(true)} className="py-3 bg-slate-950 border border-slate-800 text-slate-400 text-xs font-black rounded-xl uppercase">Выбрать уровень</button>
                <button onClick={startTrainingGame} className="py-3 bg-emerald-500 text-slate-950 text-xs font-black rounded-xl uppercase">Ещё раз</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-5xl flex flex-col lg:flex-row items-center justify-center gap-6 relative">
        <div className="flex lg:flex-col justify-between lg:h-[484px] w-full lg:w-48 shrink-0 gap-4">
          <div className="p-3 bg-slate-900/40 border border-slate-800/20 rounded-2xl w-full">
            <div className="flex items-center gap-2">
              <span className="text-sm">🤖</span>
              <h4 className="text-xs font-black text-slate-200">Engine (ИИ)</h4>
            </div>
            <div className={`mt-2 py-1.5 px-3 font-mono font-black text-base rounded-lg border ${!isMyTurn ? 'bg-white text-slate-950' : 'bg-slate-950 text-slate-400'}`}>{formatTime(blackTime)}</div>
          </div>

          <div className="p-3 bg-slate-900/40 border border-slate-800/20 rounded-2xl w-full">
            <div className={`py-1.5 px-3 font-mono font-black text-base rounded-lg border ${isMyTurn ? 'bg-white text-slate-950' : 'bg-slate-950 text-slate-400'}`}>{formatTime(whiteTime)}</div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs font-black text-emerald-400 uppercase">{myProfile?.username?.[0] || 'U'}</span>
              <h4 className="text-xs font-black text-white truncate">{myProfile?.username || 'Вы'}</h4>
            </div>
          </div>
        </div>

        <motion.div animate={isShaking ? { x: [-5, 5, -5, 5, -2, 2, 0] } : {}} transition={{ duration: 0.3 }} className="bg-slate-950 border border-slate-800/20 shadow-2xl rounded-2xl overflow-hidden w-[484px] h-[484px] grid grid-cols-8 grid-rows-8 p-1 gap-px">
          {Array.from({ length: 8 }, (_, r) => {
            const rowIndex = 7 - r;
            return Array.from({ length: 8 }, (_, f) => {
              const fileIndex = f;
              const squareName = `${files[fileIndex]}${rowIndex + 1}`;
              const piece = board[7 - rowIndex][fileIndex];
              const isDark = (rowIndex + fileIndex) % 2 === 0;
              const isSelected = selectedSquare === squareName;
              const isPossible = possibleMoves.includes(squareName);
              const isLastMove = lastMove?.from === squareName || lastMove?.to === squareName;
              const isKingInCheck = piece?.type === 'k' && piece?.color === chessRef.current.turn() && chessRef.current.inCheck();

              return (
                <div key={squareName} onClick={() => handleSquareClick(squareName)}
                  className={`relative flex items-center justify-center cursor-pointer transition-colors duration-150 ${
                    isKingInCheck ? 'bg-red-500/70 animate-pulse' : isSelected ? 'bg-amber-400/60' : isLastMove ? (isDark ? 'bg-[#aaa23a]' : 'bg-[#cdd16f]') : isDark ? theme.dark : theme.light
                  }`}
                >
                  {isPossible && <div className={`absolute z-20 rounded-full ${piece ? 'inset-0 border-4 border-black/20' : 'w-[30%] h-[30%] bg-black/20'}`} />}
                  {piece && <img src={PIECE_IMAGES[piece.color][piece.type]} alt="" className="w-[88%] h-[88%] object-contain z-10 pointer-events-none drop-shadow-md" />}
                  {fileIndex === 0 && <span className={`absolute top-0.5 left-0.5 text-[8px] font-black z-30 ${isDark ? theme.textDark : theme.textLight}`}>{rowIndex + 1}</span>}
                  {rowIndex === 0 && <span className={`absolute bottom-0.5 right-0.5 text-[8px] font-black z-30 ${isDark ? theme.textDark : theme.textLight}`}>{files[fileIndex]}</span>}
                </div>
              );
            });
          })}
        </motion.div>

        <div className="flex lg:flex-col gap-3 shrink-0 justify-center">
          <button onClick={() => setGameResult({ winner: 'b', reason: 'Вы сдались компьютеру', ratingDiff: 0 })} disabled={!!gameResult} className="w-11 h-11 bg-slate-900/50 border border-slate-800/40 text-slate-400 hover:text-red-400 rounded-xl flex items-center justify-center disabled:opacity-30"><Flag size={16} /></button>
          <button onClick={() => setShowSettings(!showSettings)} className="w-11 h-11 bg-slate-900/50 border border-slate-800/40 text-slate-400 hover:text-emerald-400 rounded-xl flex items-center justify-center"><Settings size={16} /></button>
        </div>
      </div>

      <AnimatePresence>
        {showSettings && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="mt-4 bg-slate-900/90 border border-slate-800/40 p-4 rounded-2xl flex flex-col gap-3 max-w-xs w-full shadow-2xl backdrop-blur-md">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><Palette size={13} /> Темы доски</div>
            <div className="grid grid-cols-3 gap-1.5">
              {(['green', 'wood', 'dark'] as const).map(t => (
                <button key={t} onClick={() => setBoardTheme(t)} className={`py-1.5 text-[9px] font-bold rounded-lg border transition-all ${boardTheme === t ? 'bg-emerald-500 text-slate-950 border-transparent' : 'bg-slate-950 border-slate-800 text-slate-400'}`}>{t === 'green' ? 'Зелёная' : t === 'wood' ? 'Дерево' : 'Синяя'}</button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-sm w-full px-4">
        <AnimatePresence>
          {activeRequest === 'resign_confirm' && (
            <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}
              className="bg-slate-900/90 border border-slate-800/40 p-4 rounded-2xl flex flex-col gap-3 shadow-2xl backdrop-blur-md">
              <span className="text-xs font-bold text-slate-200 text-center">Вы действительно хотите завершить тренировку и сдаться?</span>
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