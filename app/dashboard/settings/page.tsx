'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/utils/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { Chessboard } from 'react-chessboard';
import { Settings, Palette, Check, Save } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const [userUid, setUserUid] = useState<string | null>(null);
  const [currentTheme, setCurrentTheme] = useState<string>('classic');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // 1. Подгружаем текущую тему игрока из базы данных
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserUid(user.uid);
        const docRef = doc(db, 'profiles', user.uid);
        return onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            setCurrentTheme(docSnap.data().boardTheme || 'classic');
          }
        });
      } else {
        router.push('/login');
      }
    });
    return () => unsubscribe();
  }, [router]);

  // Список тем, их цвета и названия для генерации плиток (как на твоем скрине)
  const themes = [
    { id: 'classic', name: 'Классическая', dark: '#b58863', light: '#f0d9b5' },
    { id: 'ocean', name: 'Океан', dark: '#4b7399', light: '#eae9d2' },
    { id: 'forest', name: 'Лес', dark: '#769656', light: '#eeeed2' },
    { id: 'midnight', name: 'Полночь', dark: '#2e2b42', light: '#5c5470' },
  ];

  const activeStyle = themes.find(t => t.id === currentTheme) || themes[0];

  // 2. Сохранение изменений в глобальный профиль Firebase
  const handleSaveSettings = async () => {
    if (!userUid) return;
    setSaving(true);
    setSuccess(false);

    try {
      const docRef = doc(db, 'profiles', userUid);
      await updateDoc(docRef, {
        boardTheme: currentTheme
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000); // Скрыть плашку успеха через 3 сек
    } catch (error) {
      console.error("Ошибка при сохранении темы доски:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-full flex items-center justify-center p-12 gap-12 max-w-6xl mx-auto w-full">
      
      {/* ЛЕВАЯ ЧАСТЬ: ИНТЕРФЕЙС НАСТРОЕК (Chess.com Style) */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex-1 bg-slate-900/40 border border-slate-900 backdrop-blur-xl p-8 rounded-3xl space-y-6 shadow-2xl max-w-xl"
      >
        <div className="flex items-center gap-2.5">
          <Settings className="text-emerald-400 animate-spin-slow" size={22} />
          <h2 className="text-2xl font-black tracking-tight">Настройки оформления</h2>
        </div>

        <div className="h-px bg-slate-800/60" />

        <div className="space-y-4">
          <h4 className="text-sm font-bold text-slate-400 flex items-center gap-2">
            <Palette size={16} className="text-emerald-500" /> Выберите текстуру доски
          </h4>

          {/* Сетка переключателей стилей доски */}
          <div className="grid grid-cols-2 gap-3">
            {themes.map((theme) => {
              const isSelected = currentTheme === theme.id;
              return (
                <button
                  key={theme.id}
                  onClick={() => setCurrentTheme(theme.id)}
                  className={`p-4 bg-slate-950/60 border rounded-2xl flex items-center justify-between text-left transition-all ${
                    isSelected 
                      ? 'border-emerald-500 bg-emerald-500/5' 
                      : 'border-slate-800/80 hover:border-slate-700/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Миниатюрная иконка шахматного поля */}
                    <div className="w-8 h-8 rounded-lg overflow-hidden grid grid-cols-2 border border-slate-800 shrink-0">
                      <div style={{ backgroundColor: theme.light }} />
                      <div style={{ backgroundColor: theme.dark }} />
                      <div style={{ backgroundColor: theme.dark }} />
                      <div style={{ backgroundColor: theme.light }} />
                    </div>
                    <span className="text-xs font-bold text-slate-200">{theme.name}</span>
                  </div>
                  
                  {isSelected && (
                    <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center text-slate-950">
                      <Check size={12} strokeWidth={3} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="pt-4 flex flex-col gap-3">
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-black py-4 rounded-xl transition-all shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2 active:scale-[0.99]"
          >
            <Save size={18} />
            {saving ? 'Сохранение...' : 'СОХРАНИТЬ ИЗМЕНЕНИЯ'}
          </button>

          {success && (
            <motion.div 
              initial={{ opacity: 0, y: 5 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold text-center"
            >
              Новый стиль успешно синхронизирован с сервером Google!
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* ПРАВАЯ ЧАСТЬ: ИНТЕРАКТИВНОЕ ПРЕВЬЮ (Один в один как мини-доска на твоем скрине) */}
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-full max-w-[340px] flex flex-col gap-3 shrink-0"
      >
        <div className="text-center">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Живое превью</span>
        </div>
        
        <div className="p-2 bg-slate-900/20 rounded-2xl border border-slate-800 shadow-2xl backdrop-blur-sm">
          <Chessboard 
            position="r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 1 3" // Рюи Лопес (Испанская партия) на превью
            arePiecesDraggable={false} // На превью двигать нельзя
            customDarkSquareStyle={{ backgroundColor: activeStyle.dark }}
            customLightSquareStyle={{ backgroundColor: activeStyle.light }}
            boardWidth={320}
          />
        </div>
      </motion.div>

    </main>
  );
}