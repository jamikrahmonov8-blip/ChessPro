'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { auth, db } from '@/utils/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot, collection, query, where, updateDoc } from 'firebase/firestore';
import { 
  Swords, Trophy, LogOut, User, Shield, 
  Settings as SettingsIcon, MessageSquare, Users, Bell, Check, X
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Состояние роли админа
  const [userRole, setUserRole] = useState<string>('user');

  // Состояния Realtime Уведомлений
  const [activeInvite, setActiveInvite] = useState<any>(null);

  // 📺 Видео-фон
  const videoPlaylist = ['/video/hour.mp4', '/video/laida.mp4', '/video/slon.mp4'];
  const [currentVideoIdx, setCurrentVideoIdx] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleVideoEnded = () => {
    setCurrentVideoIdx((prevIdx) => (prevIdx + 1) % videoPlaylist.length);
  };

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load();
      videoRef.current.play().catch(() => {});
    }
  }, [currentVideoIdx]);

  useEffect(() => {
    if (!auth || !db) {
      router.push('/login');
      return;
    }

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Подписка на профиль + вытягивание роли
        const unsubscribeProfile = onSnapshot(doc(db, 'profiles', user.uid), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserProfile(data);
            setUserRole(data.role || 'user');
          }
          setLoading(false);
        });

        // 🟢 Мягко ставим статус "В сети" в базе данных
        updateDoc(doc(db, 'profiles', user.uid), { isOnline: true }).catch(() => {});

        // 🔔 СЛУШАТЕЛЬ ВХОДЯЩИХ ИНВАЙТОВ НА ИГРУ
        const invitesQuery = query(
          collection(db, 'invites'),
          where('toUid', '==', user.uid),
          where('status', '==', 'pending')
        );

        const unsubscribeInvites = onSnapshot(invitesQuery, (snapshot) => {
          snapshot.forEach((change) => {
            setActiveInvite(change.data());
          });
          if (snapshot.empty) setActiveInvite(null);
        });

        return () => {
          unsubscribeProfile();
          unsubscribeInvites();
        };
      } else {
        router.push('/login');
      }
    });
    return () => unsubscribeAuth();
  }, [router]);

  // Принятие инвайта дуэли
  const acceptDuel = async () => {
    if (!activeInvite) return;
    await updateDoc(doc(db, 'invites', activeInvite.id), { status: 'accepted' });
    router.push(`/game?time=${activeInvite.timeControl}&role=guest&inviteId=${activeInvite.id}`);
    setActiveInvite(null);
  };

  // Отклонение инвайта дуэли
  const declineDuel = async () => {
    if (!activeInvite) return;
    await updateDoc(doc(db, 'invites', activeInvite.id), { status: 'declined' });
    setActiveInvite(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white gap-4">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 font-medium text-sm">Синхронизация интерфейса...</p>
      </div>
    );
  }

  const navigationItems = [
    { name: 'Играть', icon: Swords, href: '/dashboard' },
    { name: 'Поиск игроков', icon: User, href: '/dashboard/search' },
    { name: 'Друзья', icon: Users, href: '/dashboard/friends' },
    { name: 'Сообщения', icon: MessageSquare, href: '/dashboard/messages' },
    { name: 'Тренировка', icon: SettingsIcon, href: '/dashboard/settings' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white flex overflow-hidden relative font-sans select-none">
      
      {/* 🎥 Видео-фон */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <video ref={videoRef} autoPlay muted playsInline onEnded={handleVideoEnded} className="w-full h-full object-cover opacity-30 filter brightness-90 contrast-110">
          <source src={videoPlaylist[currentVideoIdx]} type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(15,23,42,0.1)_0%,rgba(2,6,17,0.85)_100%)]" />
      </div>

      {/* 🧭 САЙДБАР */}
      <aside className="w-64 bg-slate-900/20 border-r border-slate-900/60 backdrop-blur-2xl p-5 flex flex-col justify-between relative z-50 shrink-0">
        <div className="space-y-7">
          <Link href="/dashboard" className="flex items-center gap-2 font-black text-2xl tracking-tighter px-2">
            <Swords className="text-emerald-400" size={24} />CHESS<span className="text-emerald-500">.PRO</span>
          </Link>
          <nav className="space-y-1">
            {navigationItems.map((item, idx) => {
              const isActive = pathname === item.href;
              return (
                <Link key={idx} href={item.href} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all border ${isActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-lg shadow-emerald-500/5' : 'text-slate-400 border-transparent hover:bg-slate-900/50 hover:text-white'}`}>
                  <item.icon size={18} /> {item.name}
                </Link>
              );
            })}

            {/* ⚡ СКРЫТЫЙ ИНТЕРФЕЙС АДМИНИСТРАТОРА (Стиль сохранен целиком) */}
            {userRole === 'admin' && (
              <>
                <div className="h-px bg-slate-800/40 my-4 mx-2" />
                <Link 
                  href="/dashboard/admin" 
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all border relative overflow-hidden group ${
                    pathname === '/dashboard/admin' 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-lg shadow-emerald-500/5' 
                      : 'border-slate-800/40 bg-slate-950/20 text-slate-400 hover:border-emerald-500/20 hover:text-emerald-400 hover:bg-emerald-500/[0.01]'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 transition-colors ${
                    pathname === '/dashboard/admin' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600 group-hover:bg-emerald-400'
                  }`} />
                  <Shield size={15} /> 
                  <span className="tracking-wide uppercase text-[10px] font-black">Панель управления</span>
                </Link>
              </>
            )}
            
          </nav>
        </div>

        {/* Профиль внизу */}
        <div className="pt-4 border-t border-slate-900/60 flex items-center justify-between px-2">
  <Link 
    href="/dashboard/profile" 
    className="flex items-center gap-3 group cursor-pointer min-w-0 flex-1 mr-2"
  >
    {/* Аватарка, которая подтягивает фото, если оно загружено */}
    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 group-hover:border-emerald-500/50 flex items-center justify-center text-emerald-400 font-black uppercase text-sm shrink-0 overflow-hidden transition-all">
      {userProfile?.photoURL ? (
        <img src={userProfile.photoURL} alt="Avatar" className="w-full h-full object-cover" />
      ) : (
        userProfile?.username?.[0]
      )}
    </div>
    
    <div className="overflow-hidden w-28">
      <h4 className="font-bold text-sm text-slate-200 truncate group-hover:text-emerald-400 transition-colors">
        {userProfile?.username}
      </h4>
      <p className="text-[11px] text-amber-400 font-bold flex items-center gap-1 mt-0.5">
        <Trophy size={10} /> {userProfile?.rating || 1200} ELO
      </p>
    </div>
  </Link>
  
  {/* Кнопка Логаута */}
  <button 
    onClick={() => signOut(auth)} 
    className="p-2 text-slate-500 hover:text-red-400 transition-colors shrink-0"
  >
    <LogOut size={16} />
  </button>
</div>
      </aside>

      {/* Контент */}
      <div className="flex-1 overflow-y-auto relative z-10">
        {children}
      </div>

      {/* 🚨 ВСПЛЫВАЮЩЕЕ REALTIME УВЕДОМЛЕНИЕ О ВЫЗОВЕ НА МАТЧ (CHESS.COM STYLE) */}
      <AnimatePresence>
        {activeInvite && (
          <motion.div 
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-50 w-80 bg-slate-900 border-2 border-emerald-500/30 backdrop-blur-2xl p-4 rounded-2xl shadow-2xl space-y-3.5"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400 animate-bounce">
                <Bell size={16} />
              </div>
              <div>
                <span className="text-[9px] text-emerald-400 font-black uppercase tracking-wider">Входящий Вызов</span>
                <h4 className="text-sm font-bold text-white">Матч от {activeInvite.fromUsername}</h4>
              </div>
            </div>
            <p className="text-xs text-slate-400">Вам бросили перчатку! Контроль времени: <span className="text-emerald-400 font-bold">{activeInvite.timeControl / 60} мин</span>.</p>
            
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button onClick={acceptDuel} className="py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs rounded-xl transition-colors flex items-center justify-center gap-1">
                <Check size={14} strokeWidth={3} /> ПРИНЯТЬ
              </button>
              <button onClick={declineDuel} className="py-2 bg-slate-950 border border-slate-800 hover:bg-red-500/10 hover:text-red-400 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1">
                <X size={14} /> ОТКЛОНИТЬ
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}