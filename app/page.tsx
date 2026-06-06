'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { 
  Play, BookOpen, Award, Sparkles, BrainCircuit, 
  BarChart3, Users, ShieldAlert, Zap, Trophy, HelpCircle,
  Menu, LogIn, Swords
} from 'lucide-react';

const debuts = [
  { 
    id: 'ruy_lopez', 
    name: 'Испанская партия', 
    description: 'Один из самых популярных и глубоких дебютов в истории. Белые развивают слона на b5, оказывая давление на коня c6 и центр.',
    moves: '1. e4 e5 2. Nf3 Nc6 3. Bb5',
    fen: 'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3'
  },
  { 
    id: 'sicilian', 
    name: 'Сицилианская защита', 
    description: 'Острый, агрессивный ответ черных на 1.e4. Черные борются за центр асимметричным ходом c5, создавая дисбаланс с первых секунд.',
    moves: '1. e4 c5',
    fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c5 0 2'
  },
  { 
    id: 'queens_gambit', 
    name: 'Ферзевый гамбит', 
    description: 'Классическое позиционное начало. Белые временно жертвуют пешку c4, чтобы захватить полный контроль над центром доски.',
    moves: '1. d4 d5 2. c4',
    fen: 'rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq c3 0 2'
  },
];

const stats = [
  { label: 'Игр против Gemini сегодня', value: '42,891', icon: BrainCircuit, color: 'text-emerald-400' },
  { label: 'Активных турниров', value: '14', icon: Trophy, color: 'text-amber-400' },
  { label: 'Игроков онлайн', value: '5,102', icon: Users, color: 'text-blue-400' },
];

export default function HomePage() {
  const [selectedDebut, setSelectedDebut] = useState(debuts[0]);
  const [gamePreview, setGamePreview] = useState<Chess | null>(null);

  useEffect(() => {
    setGamePreview(new Chess(selectedDebut.fen));
  }, [selectedDebut]);

  return (
    <main className="relative min-h-screen w-full flex flex-col overflow-x-hidden bg-slate-950 text-white font-sans">
      
      {/* 🎥 НОВЫЙ СИНЕМАТИЧЕСКИЙ СГЕНЕРИРОВАННЫЙ ВИДЕО-ФОН */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <video 
          autoPlay 
          loop 
          muted 
          playsInline 
          className="w-full h-full object-cover opacity-30 scale-105 filter brightness-75 contrast-125"
        >
          {/* Интеграция сгенерированного видео-фона */}
          <source src="../video/AI.mp4" type="video/mp4" />
        </video>
        {/* Затемняющий премиальный градиент поверх видео */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/60 to-slate-950" />
        <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-slate-950 to-transparent" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full filter blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full filter blur-[120px]" />
      </div>

      <div className="relative z-10 w-full flex flex-col">
        
        {/* ================= 🔥 КИБЕРСПОРТИВНЫЙ HEADER ================= */}
        <header className="fixed top-0 inset-x-0 z-50 bg-slate-950/60 border-b border-slate-900/80 backdrop-blur-xl px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            
            {/* Логотип */}
            <Link href="/" className="flex items-center gap-2 font-black text-2xl tracking-tighter hover:opacity-90 transition-opacity">
              <Swords className="text-emerald-400" size={24} />
              CHESS<span className="text-emerald-500">.PRO</span>
            </Link>

            {/* Навигация */}
            <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-400">
              <Link href="/game/new" className="hover:text-white transition-colors">Играть</Link>
              <Link href="/learn" className="hover:text-white transition-colors">Академия</Link>
              <Link href="/tournaments" className="hover:text-white transition-colors">Турниры</Link>
              <Link href="/leaderboard" className="hover:text-white transition-colors">Лидеры</Link>
            </nav>

            {/* Кнопка входа */}
            <div className="flex items-center gap-4">
              <Link href="/login" className="flex items-center gap-2 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:scale-[1.02]">
                <LogIn size={16} className="text-emerald-400" />
                Войти
              </Link>
              <button className="md:hidden p-2 text-slate-400 hover:text-white">
                <Menu size={20} />
              </button>
            </div>

          </div>
        </header>

        {/* ================= СЕКЦИЯ 1: HERO БЛОК ================= */}
        <section className="min-h-screen flex flex-col items-center justify-center text-center px-6 max-w-5xl mx-auto space-y-8 pt-20">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-4"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider backdrop-blur-md">
              <Zap size={12} className="text-emerald-400 animate-pulse" /> Киберспортивная экосистема нового поколения
            </div>
            <h1 className="text-6xl sm:text-7xl md:text-9xl font-black tracking-tight leading-none bg-clip-text text-transparent bg-gradient-to-b from-white via-slate-200 to-slate-500">
              CHESS<span className="text-emerald-500 select-none">.PRO</span>
            </h1>
            <p className="text-lg md:text-2xl text-slate-400 max-w-3xl mx-auto font-normal leading-relaxed">
              Профессиональная игровая арена. Сражайся с нейросетью Gemini, анализируй свои ошибки в реальном времени и оттачивай мастерство.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 w-full max-w-lg justify-center pt-4"
          >
            <Link href="/game/new" className="group flex items-center justify-center gap-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-lg px-8 py-4.5 rounded-2xl shadow-xl shadow-emerald-500/10 transition-all duration-200 hover:translate-y-[-2px]">
              <Play fill="currentColor" size={18} /> Играть против ИИ
            </Link>
            <Link href="/learn" className="flex items-center justify-center gap-3 bg-slate-900/50 hover:bg-slate-800/80 border border-slate-800 text-white font-bold text-lg px-8 py-4.5 rounded-2xl backdrop-blur-md transition-all duration-200 hover:translate-y-[-2px]">
              <BookOpen size={18} /> Академия дебютов
            </Link>
          </motion.div>

          {/* Статистика */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-4xl pt-16"
          >
            {stats.map((stat, i) => (
              <div key={i} className="bg-slate-900/40 border border-slate-900/60 rounded-2xl p-5 flex items-center gap-4 backdrop-blur-sm">
                <div className={`p-3 bg-slate-950/80 rounded-xl ${stat.color}`}>
                  <stat.icon size={20} />
                </div>
                <div className="text-left">
                  <div className="text-2xl font-black tracking-tight">{stat.value}</div>
                  <div className="text-xs text-slate-500 font-medium">{stat.label}</div>
                </div>
              </div>
            ))}
          </motion.div>
        </section>

        {/* ================= СЕКЦИЯ 2: РАЗБОР ДЕБЮТОВ ================= */}
        <section className="w-full bg-slate-900/20 border-y border-slate-900/80 backdrop-blur-md py-24">
          <div className="w-full max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-[1.2fr,1fr] gap-16 items-center">
            
            <div className="space-y-8">
              <div className="space-y-3">
                <h2 className="text-4xl md:text-5xl font-black tracking-tight">Интерактивный разбор дебютов</h2>
                <p className="text-slate-400 text-lg leading-relaxed">
                  Не нужно заучивать сухие нотации. Выбери любой дебют из списка — интерактивная доска мгновенно перестроится в нужную позицию.
                </p>
              </div>
              
              <div className="space-y-4">
                {debuts.map(debut => (
                  <div 
                    key={debut.id}
                    onClick={() => setSelectedDebut(debut)}
                    className={`p-5 rounded-2xl border cursor-pointer transition-all duration-200 ${selectedDebut.id === debut.id ? 'bg-emerald-500/5 border-emerald-500/40 text-white' : 'bg-slate-950/40 border-slate-900/60 text-slate-400 hover:border-slate-800'}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-extrabold text-lg text-white">{debut.name}</div>
                      <div className="text-xs font-mono px-2.5 py-1 rounded-md bg-slate-900 text-emerald-400 border border-slate-800">{debut.moves}</div>
                    </div>
                    <AnimatePresence mode="wait">
                      {selectedDebut.id === debut.id && (
                        <motion.p 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="text-sm text-slate-400 leading-relaxed mt-2 pt-2 border-t border-slate-900"
                        >
                          {debut.description}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </div>

            {/* Настоящая рабочая доска */}
            <div className="flex flex-col items-center justify-center">
              <div className="w-full max-w-[440px] aspect-square bg-slate-950 border-4 border-slate-900 rounded-3xl p-3 shadow-2xl shadow-black/80 relative">
                {gamePreview && (
                  <Chessboard 
                    position={gamePreview.fen()} 
                    arePiecesDraggable={false}
                    boardOrientation="white"
                    customDarkSquareStyle={{ backgroundColor: '#1e293b' }}
                    customLightSquareStyle={{ backgroundColor: '#334155' }}
                  />
                )}
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs font-mono text-slate-500">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Позиция синхронизирована с движком
              </div>
            </div>

          </div>
        </section>

        {/* ================= СЕКЦИЯ 3: ОСОБЕННОСТИ ================= */}
        <section className="w-full max-w-7xl mx-auto px-6 py-28 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-8 rounded-2xl bg-gradient-to-b from-slate-900/40 to-slate-950/10 border border-slate-900/80 flex flex-col justify-between group hover:border-slate-800 transition-all backdrop-blur-sm">
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6">
                <BrainCircuit size={22} />
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">Модель Gemini Core</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                В отличие от стандартных математических скриптов, Gemini анализирует доску на уровне контекста и человеческих паттернов, имитируя игру реального гроссмейстера.
              </p>
            </div>
            <span className="text-xs font-mono text-slate-600 mt-8">🤖 Нейросетевой стек</span>
          </div>

          <div className="p-8 rounded-2xl bg-gradient-to-b from-slate-900/40 to-slate-950/10 border border-slate-900/80 flex flex-col justify-between group hover:border-slate-800 transition-all backdrop-blur-sm">
            <div>
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-6">
                <BarChart3 size={22} />
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">Тепловые карты ошибок</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                После завершения партии система подсвечивает клетки, на которых вы приняли неверные тактические решения, наглядно показывая упущенные возможности.
              </p>
            </div>
            <span className="text-xs font-mono text-slate-600 mt-8">📊 Глубокая аналитика</span>
          </div>

          <div className="p-8 rounded-2xl bg-gradient-to-b from-slate-900/40 to-slate-950/10 border border-slate-900/80 flex flex-col justify-between group hover:border-slate-800 transition-all backdrop-blur-sm">
            <div>
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-6">
                <ShieldAlert size={22} />
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">Абсолютный Anti-Cheat</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Все ходы принудительно валидируются на изолированном сервере Next.js с помощью защищенных ключей администратора Supabase. Перехватить или подделать состояние доски невозможно.
              </p>
            </div>
            <span className="text-xs font-mono text-slate-600 mt-8">🔒 Защита данных</span>
          </div>
        </section>

        {/* ================= СЕКЦИЯ 4: FAQ ================= */}
        <section className="w-full max-w-4xl mx-auto px-6 py-20 border-t border-slate-900/80 space-y-8">
          <h2 className="text-3xl font-black text-center tracking-tight">Полезно знать перед стартом</h2>
          
          <div className="space-y-4">
            <div className="p-6 bg-slate-900/20 border border-slate-900/80 rounded-2xl backdrop-blur-sm">
              <h4 className="text-base font-bold mb-2 flex items-center gap-2"><HelpCircle size={16} className="text-emerald-400" /> Как работает расчет рейтинга?</h4>
              <p className="text-sm text-slate-400 leading-relaxed">Мы используем классическую формулу Elo. Вы стартуете с 1200 очками. Побеждая ИИ или реальных игроков, ваш рейтинг растет, открывая доступ к более сложным уровням сложности системных ботов.</p>
            </div>

            <div className="p-6 bg-slate-900/20 border border-slate-900/80 rounded-2xl backdrop-blur-sm">
              <h4 className="text-base font-bold mb-2 flex items-center gap-2"><HelpCircle size={16} className="text-emerald-400" /> Нужна ли регистрация для тренировок?</h4>
              <p className="text-sm text-slate-400 leading-relaxed">Вы можете играть пробные матчи без авторизации. Однако для сохранения истории ходов, детального анализа партий от Gemini и фиксации рейтинга вам потребуется войти через систему Supabase Auth в один клик.</p>
            </div>
          </div>
        </section>

        {/* ФУТЕР */}
        <footer className="w-full border-t border-slate-900 bg-slate-950 py-12 mt-auto">
          <div className="w-full max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6 text-sm text-slate-500 font-medium">
            <div>© 2026 CHESS.PRO. Все права защищены.</div>
            <div className="flex gap-6">
              <a href="#" className="hover:text-slate-300 transition-colors">Правила платформы</a>
              <a href="#" className="hover:text-slate-300 transition-colors">API Лицензия</a>
            </div>
          </div>
        </footer>

      </div>
    </main>
  );
}