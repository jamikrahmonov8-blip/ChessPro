'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/utils/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Swords, User, Mail, Lock, Sparkles } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [chessLevel, setChessLevel] = useState('beginner');
  const [boardTheme, setBoardTheme] = useState('classic');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!auth || !db) {
        throw new Error('Firebase не инициализирован. Проверьте переменные окружения.');
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Записываем ВСЕ глобальные данные в Firestore
      await setDoc(doc(db, 'profiles', user.uid), {
        username,
        email,
        chessLevel,
        boardTheme,
        rating: 1200,       // Глобальный рейтинг
        gamesPlayed: 0,     // Глобальное кол-во партий
        gamesWon: 0,        // Глобальное кол-во побед
        createdAt: new Date().toISOString()
      });

      router.push('/login?message=Профиль создан глобально! Войдите.');
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('Этот Email уже занят.');
      } else {
        setError(err.message || 'Ошибка регистрации.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen w-full flex items-center justify-center p-6 bg-slate-950 text-white overflow-hidden">
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <video autoPlay loop muted playsInline className="w-full h-full object-cover opacity-25 filter brightness-50">
          <source src="/videos/bg-chess.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-slate-950/80" />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-xl bg-slate-900/60 border border-slate-800 p-8 rounded-3xl backdrop-blur-xl shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2 font-black text-3xl tracking-tighter text-white">
            <Swords className="text-emerald-400" size={28} />
            CHESS<span className="text-emerald-500">.PRO</span>
          </Link>
          <h2 className="text-xl font-bold tracking-tight">Создание профиля игрока</h2>
        </div>

        {error && <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm text-center">{error}</div>}

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-semibold">Имя пользователя</label>
              <div className="relative">
                <User className="absolute left-4 top-3.5 text-slate-500" size={16} />
                <input type="text" placeholder="Jamik" required value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl pl-11 pr-4 py-3 text-sm transition-colors outline-none text-white font-medium" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-semibold">Email адрес</label>
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 text-slate-500" size={16} />
                <input type="email" placeholder="your@email.com" required value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl pl-11 pr-4 py-3 text-sm transition-colors outline-none text-white font-medium" />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-400 font-semibold">Пароль</label>
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 text-slate-500" size={16} />
              <input type="password" placeholder="••••••••" required value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl pl-11 pr-4 py-3 text-sm transition-colors outline-none text-white font-medium" />
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <label className="text-xs text-slate-400 font-semibold flex items-center gap-1.5"><Sparkles size={12} className="text-emerald-400" /> Уровень игры</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {['beginner', 'intermediate', 'advanced', 'master'].map(lvl => (
                <button key={lvl} type="button" onClick={() => setChessLevel(lvl)} className={`p-3 rounded-xl border text-center font-bold text-xs transition-all ${chessLevel === lvl ? 'bg-emerald-500 text-slate-950 border-emerald-500' : 'bg-slate-950 border-slate-800 text-slate-400'}`}>
                  {lvl === 'beginner' ? 'Новичок' : lvl === 'intermediate' ? 'Средний' : lvl === 'advanced' ? 'Про' : 'Мастер'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-slate-400 font-semibold">Тема доски</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {['classic', 'ocean', 'forest', 'midnight'].map(th => (
                <button key={th} type="button" onClick={() => setBoardTheme(th)} className={`p-2.5 rounded-xl border text-xs font-semibold transition-all ${boardTheme === th ? 'border-emerald-500 bg-slate-950 text-white' : 'bg-slate-950 border-slate-800 text-slate-400'}`}>
                  {th}
                </button>
              ))}
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-3.5 rounded-xl transition-all shadow-lg mt-4 disabled:opacity-50">
            {loading ? 'Создание...' : 'Зарегистрироваться'}
          </button>
        </form>
        <div className="text-center text-sm text-slate-500">
          Есть аккаунт? <Link href="/login" className="text-emerald-400 hover:underline">Войти</Link>
        </div>
      </motion.div>
    </main>
  );
}