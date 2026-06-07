'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/utils/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, onSnapshot, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { Shield, Users, Radio, Play, Trash2, Ban, MessageSquareOff, Trophy, ExternalLink } from 'lucide-react';

export default function AdminDashboard() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, 'profiles', user.uid));
        if (userDoc.exists() && userDoc.data().role === 'admin') {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
          router.push('/dashboard');
        }
      } else {
        router.push('/login');
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (isAdmin !== true) return;
    return onSnapshot(collection(db, 'profiles'), (snapshot) => {
      const userList: any[] = [];
      snapshot.forEach((docSnap) => {
        userList.push({ id: docSnap.id, ...docSnap.data() });
      });
      setUsers(userList);
      setLoading(false);
    });
  }, [isAdmin]);

  // Административные действия
  const handleToggleBan = async (userId: string, currentBanStatus: boolean) => {
    await updateDoc(doc(db, 'profiles', userId), { isBanned: !currentBanStatus });
  };

  const handleToggleMute = async (userId: string, currentMuteStatus: boolean) => {
    await updateDoc(doc(db, 'profiles', userId), { isMuted: !currentMuteStatus });
  };

  const handleDeleteUser = async (userId: string) => {
    if (confirm('Вы уверены, что хотите удалить этого пользователя из базы данных?')) {
      await deleteDoc(doc(db, 'profiles', userId));
    }
  };

  const handleCreateTournament = async () => {
    await addDoc(collection(db, 'tournaments'), {
      status: 'pending',
      title: 'Очковый турнир CHESS.PRO 🏆',
      createdAt: new Date().toISOString(),
      players: []
    });
    alert('Турнир создан в режиме ожидания игроков!');
  };

  if (isAdmin === null || loading) return <div className="p-12 text-slate-400 font-bold text-center">Загрузка панели...</div>;

  return (
    <div className="p-12 max-w-6xl mx-auto space-y-8 relative z-10">
      <div className="flex items-center justify-between border-b border-slate-900 pb-6">
        <div>
          <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-1 rounded-full font-black uppercase tracking-wider flex items-center gap-1 w-fit">
            <Shield size={10} /> Root Access
          </span>
          <h1 className="text-3xl font-black tracking-tight mt-2">Командный центр</h1>
        </div>
        <button onClick={handleCreateTournament} className="px-5 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-xs rounded-xl flex items-center gap-2">
          <Play size={14} fill="currentColor" /> СОЗДАТЬ НОВЫЙ ТУРНИР
        </button>
      </div>

      {/* Таблица игроков */}
      <div className="bg-slate-900/20 border border-slate-900 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 bg-slate-900/40 border-b border-slate-900 text-xs font-bold text-slate-400 uppercase">
          Управление учетными записями
        </div>
        <div className="divide-y divide-slate-900">
          {users.map((user) => (
            <div key={user.id} className="p-4 flex items-center justify-between hover:bg-slate-900/10 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-xs relative">
                  {user.username?.[0]?.toUpperCase()}
                  <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-950 ${user.isOnline ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                </div>
                <div>
                  <div className="font-bold text-sm flex items-center gap-2">
                    {user.username}
                    {user.isBanned && <span className="text-[9px] bg-red-500/10 text-red-500 px-1.5 rounded font-bold">БАН</span>}
                    {user.isMuted && <span className="text-[9px] bg-amber-500/10 text-amber-500 px-1.5 rounded font-bold">MUTED</span>}
                  </div>
                  <div className="text-xs text-slate-500">Турнирные очки: {user.tournamentPoints || 0}</div>
                </div>
              </div>

              {/* Кнопки модерации */}
              <div className="flex items-center gap-2">
                <button onClick={() => router.push(`/dashboard/search?user=${user.id}`)} className="p-2 bg-slate-950 border border-slate-800 rounded-lg hover:text-emerald-400 text-slate-400 transition-colors">
                  <ExternalLink size={14} />
                </button>
                <button onClick={() => handleToggleMute(user.id, user.isMuted)} className={`p-2 rounded-lg border transition-colors ${user.isMuted ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-amber-500'}`}>
                  <MessageSquareOff size={14} />
                </button>
                <button onClick={() => handleToggleBan(user.id, user.isBanned)} className={`p-2 rounded-lg border transition-colors ${user.isBanned ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-red-500'}`}>
                  <Ban size={14} />
                </button>
                <button onClick={() => handleDeleteUser(user.id)} className="p-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-400 hover:text-red-500 hover:border-red-500/20 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}