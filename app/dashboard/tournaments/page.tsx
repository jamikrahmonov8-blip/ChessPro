'use client';

import { useEffect, useState } from 'react';
import { auth, db } from '@/utils/firebase';
import { collection, onSnapshot, doc, updateDoc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Trophy, Swords, Play, UserCheck } from 'lucide-react';

export default function TournamentsPage() {
  const router = useRouter();
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    if (!auth.currentUser) return;
    getDoc(doc(db, 'profiles', auth.currentUser.uid)).then(s => setCurrentUser({ id: s.id, ...s.data() }));

    return onSnapshot(collection(db, 'tournaments'), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach(d => list.push({ id: d.id, ...d.data() }));
      setTournaments(list);
    });
  }, []);

  const joinTournament = async (tId: string, currentPlayers: any[]) => {
    if (currentPlayers.some(p => p.id === currentUser.id)) return;
    const updated = [...currentPlayers, { id: currentUser.id, username: currentUser.username, points: currentUser.tournamentPoints || 0 }];
    await updateDoc(doc(db, 'tournaments', tId), { players: updated });
  };

  const startTournament = async (tId: string, players: any[]) => {
    // Алгоритм подбора: сортировка игроков по очкам турнира
    const sorted = [...players].sort((a, b) => b.points - a.points);
    const pairs: any[] = [];

    for (let i = 0; i < sorted.length; i += 2) {
      if (sorted[i + 1]) {
        pairs.push({ white: sorted[i], black: sorted[i + 1] });
      } else {
        // Если нечетное число игроков — последний получает случайного противника или бай
        pairs.push({ white: sorted[i], black: 'BYE' });
      }
    }

    await updateDoc(doc(db, 'tournaments', tId), { status: 'active', matches: pairs });
    alert('Турнирные пары сформированы по очкам и запущены!');
  };

  return (
    <div className="p-12 max-w-4xl mx-auto space-y-6 relative z-10">
      <h1 className="text-2xl font-black flex items-center gap-2"><Trophy className="text-amber-500" /> Текущие Арены</h1>
      
      <div className="grid grid-cols-1 gap-4">
        {tournaments.map((t) => (
          <div key={t.id} className="p-5 bg-slate-900/40 border border-slate-900 rounded-xl flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-white">{t.title}</h3>
              <p className="text-xs text-slate-400 mt-1">Статус: <span className="text-amber-400 uppercase font-bold">{t.status}</span> • Участников: {t.players?.length || 0}</p>
            </div>

            <div className="flex items-center gap-3">
              {t.status === 'pending' && (
                <button onClick={() => joinTournament(t.id, t.players || [])} className="px-4 py-2 bg-emerald-500 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1.5">
                  <UserCheck size={14} /> Участвовать
                </button>
              )}
              {currentUser?.role === 'admin' && t.status === 'pending' && (
                <button onClick={() => startTournament(t.id, t.players || [])} className="px-4 py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1.5">
                  <Play size={14} fill="currentColor" /> Запустить
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}