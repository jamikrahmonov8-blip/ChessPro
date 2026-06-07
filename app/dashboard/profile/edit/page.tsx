'use client';

import { useEffect, useState, useRef } from 'react';
import { auth, db } from '@/utils/firebase';
import { onAuthStateChanged } from 'firebase/auth'; // или из твоего стандартного пути
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, Save, User, Trophy, ArrowLeft, 
  CheckCircle2, Loader2, Mail, ShieldCheck 
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function EditProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [userUid, setUserUid] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  
  const [newUsername, setNewUsername] = useState('');
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserUid(user.uid);
        const docSnap = await getDoc(doc(db, 'profiles', user.uid));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setProfile(data);
          setNewUsername(data.username || '');
          setPreviewPhoto(data.photoURL || null);
        }
        setLoading(false);
      } else {
        router.push('/login');
      }
    });
    return () => unsubscribe();
  }, [router]);

  // 🔄 Конвертируем файл в строку Base64
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Ограничим размер картинки (~1 МБ), чтобы Firestore не ругался
      if (file.size > 1024 * 1024) {
        alert("Изображение слишком большое! Выберите фото поменьше (до 1МБ).");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewPhoto(reader.result as string); // Это готовая строка Base64
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!userUid) return;
    setSaving(true);
    setSuccess(false);

    try {
      // Сохраняем строку Base64 прямо в документ пользователя в Firestore
      await updateDoc(doc(db, 'profiles', userUid), {
        username: newUsername,
        photoURL: previewPhoto || '',
        lastUpdated: new Date().toISOString()
      });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error("Ошибка при сохранении:", error);
      alert("Не удалось обновить профиль.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="h-full flex items-center justify-center">
      <Loader2 className="text-emerald-500 animate-spin" size={32} />
    </div>
  );

  return (
    <main className="h-full max-h-screen w-full flex flex-col justify-center items-center p-6 relative z-10 overflow-hidden">
      <div className="w-full max-w-xl space-y-4">
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors font-bold text-xs uppercase tracking-widest"
        >
          <ArrowLeft size={14} /> Назад
        </button>

        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-slate-900/40 border border-slate-900 backdrop-blur-2xl rounded-3xl p-6 shadow-2xl space-y-6"
        >
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-black tracking-tight">Настройки личности</h1>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Измените то, как вас видят другие игроки</p>
          </div>

          <div className="flex flex-col items-center gap-2">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="relative group cursor-pointer"
            >
              <div className="w-24 h-24 rounded-2xl bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center text-slate-500 relative transition-all group-hover:border-emerald-500/50">
                {previewPhoto ? (
                  <img src={previewPhoto} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User size={36} />
                )}
                <div className="absolute inset-0 bg-emerald-500/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all backdrop-blur-sm">
                  <Camera className="text-white" size={20} />
                </div>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept="image/*"
              />
            </div>
            <span className="text-[9px] text-slate-600 font-bold uppercase tracking-tighter">Нажмите для изменения</span>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest ml-1">Никнейм на арене</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input 
                  type="text" 
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-3.5 pl-11 pr-4 text-xs font-bold focus:outline-none focus:border-emerald-500/50 transition-all"
                  placeholder="Ваше имя..."
                />
              </div>
            </div>

            <div className="space-y-1.5 opacity-50">
              <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest ml-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input 
                  type="text" 
                  disabled
                  value={profile?.email}
                  className="w-full bg-slate-950/20 border border-slate-900 rounded-xl py-3.5 pl-11 pr-4 text-xs font-bold cursor-not-allowed"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
               <div className="p-3 bg-slate-950/40 border border-slate-900 rounded-xl flex items-center justify-between">
                  <span className="text-[9px] font-black text-slate-500 uppercase">Рейтинг</span>
                  <span className="text-amber-500 font-black text-xs flex items-center gap-1"><Trophy size={12}/> {profile?.rating}</span>
               </div>
               <div className="p-3 bg-slate-950/40 border border-slate-900 rounded-xl flex items-center justify-between">
                  <span className="text-[9px] font-black text-slate-500 uppercase">Статус</span>
                  <span className="text-emerald-500 font-black text-[9px] uppercase flex items-center gap-1"><ShieldCheck size={12}/> {profile?.role || 'Игрок'}</span>
               </div>
            </div>
          </div>

          <div className="space-y-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-black py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-500/5 flex items-center justify-center gap-2 active:scale-[0.98] text-xs"
            >
              {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              {saving ? 'СИНХРОНИЗАЦИЯ...' : 'СОХРАНИТЬ ИЗМЕНЕНИЯ'}
            </button>

            <div className="h-4 flex items-center justify-center">
              <AnimatePresence>
                {success && (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center justify-center gap-1.5 text-emerald-400 font-bold text-[10px]"
                  >
                    <CheckCircle2 size={12} /> Изменения приняты!
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  );
}