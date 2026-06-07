'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { auth, db } from '@/utils/firebase';
import { doc, getDoc, collection, addDoc, query, orderBy, onSnapshot, setDoc } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { Send, MessageSquare, Trophy, Users, Search, Sparkles } from 'lucide-react';

export default function MessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetUid = searchParams.get('chatWith'); 

  const [targetUser, setTargetUser] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [recentChats, setRecentChats] = useState<any[]>([]); 
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  
  const currentUser = auth.currentUser;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Набор крутых шахматных и геймерских смайликов
  const chessEmojis = ['👑', '⚔️', '🧠', '🔥', '♟️', '🐴', '🏰', '🏁', '🤝', '💥'];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 1. Стрим списка диалогов
  useEffect(() => {
    if (!currentUser) return;

    const myChatsRef = collection(db, 'profiles', currentUser.uid, 'user_chats');
    const qChats = query(myChatsRef, orderBy('updatedAt', 'desc'));

    const unsubscribeChats = onSnapshot(qChats, (snapshot) => {
      const chatsList: any[] = [];
      snapshot.forEach((docSnap) => {
        chatsList.push({ id: docSnap.id, ...docSnap.data() });
      });
      setRecentChats(chatsList);
      setLoading(false);
    }, () => setLoading(false));

    return () => unsubscribeChats();
  }, [currentUser]);

  // 2. Стрим сообщений
  useEffect(() => {
    if (!currentUser || !targetUid) return;

    const fetchTargetProfile = async () => {
      const userDoc = await getDoc(doc(db, 'profiles', targetUid));
      if (userDoc.exists()) setTargetUser(userDoc.data());
    };
    fetchTargetProfile();

    const chatId = currentUser.uid < targetUid ? `${currentUser.uid}_${targetUid}` : `${targetUid}_${currentUser.uid}`;
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const qMessages = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubscribeMessages = onSnapshot(qMessages, (snapshot) => {
      const msgs: any[] = [];
      snapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() });
      });
      setMessages(msgs);
    });

    return () => unsubscribeMessages();
  }, [targetUid, currentUser]);

  // 3. Отправка сообщения
  const handleSendMessage = async (textToSend?: string) => {
    const messageContent = textToSend || newMessage.trim();
    if (!messageContent || !currentUser || !targetUid || !targetUser) return;

    const nowISO = new Date().toISOString();
    
    const myProfileSnap = await getDoc(doc(db, 'profiles', currentUser.uid));
    const myUsername = myProfileSnap.exists() ? myProfileSnap.data().username : 'Игрок';
    const myRating = myProfileSnap.exists() ? myProfileSnap.data().rating || 1200 : 1200;

    const chatId = currentUser.uid < targetUid ? `${currentUser.uid}_${targetUid}` : `${targetUid}_${currentUser.uid}`;
    const messagesRef = collection(db, 'chats', chatId, 'messages');

    try {
      await addDoc(messagesRef, {
        senderId: currentUser.uid,
        text: messageContent,
        createdAt: nowISO
      });

      await setDoc(doc(db, 'profiles', currentUser.uid, 'user_chats', targetUid), {
        username: targetUser.username,
        rating: targetUser.rating || 1200,
        lastMessage: messageContent,
        updatedAt: nowISO
      }, { merge: true });

      await setDoc(doc(db, 'profiles', targetUid, 'user_chats', currentUser.uid), {
        username: myUsername,
        rating: myRating,
        lastMessage: messageContent,
        updatedAt: nowISO
      }, { merge: true });

      if (!textToSend) setNewMessage('');
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Загрузка...</div>;

  return (
    <main className="h-[calc(100vh-40px)] w-full flex p-6 gap-6 max-w-6xl mx-auto relative z-10">
      
      {/* ЛЕВАЯ КОЛОНКА (СПИСОК ЧАТОВ) */}
      <div className="w-80 bg-slate-900/40 border border-slate-900 rounded-3xl p-4 backdrop-blur-xl flex flex-col gap-4 shadow-2xl shrink-0">
        <div className="px-2 pt-2">
          <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
            <MessageSquare size={18} className="text-emerald-400" /> Диалоги
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Входящие сообщения</p>
        </div>

        <div className="relative">
          <Search size={14} className="absolute left-3 top-3 text-slate-500" />
          <input type="text" placeholder="Поиск по чатам..." className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 outline-none" />
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
          {recentChats.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-500 flex flex-col items-center gap-2 px-4">
              <Users size={24} className="text-slate-800" />
              <span>Нет активных диалогов.</span>
            </div>
          ) : (
            recentChats.map((chat) => {
              const isSelected = targetUid === chat.id;
              return (
                <div key={chat.id} onClick={() => router.push(`/dashboard/messages?chatWith=${chat.id}`)} className={`p-3 rounded-xl flex items-center gap-3 cursor-pointer transition-all border ${isSelected ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-slate-950/20 border-slate-900/40 hover:bg-slate-950/60 hover:text-white text-slate-300'}`}>
                  <div className="w-9 h-9 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center font-black text-xs uppercase text-emerald-400 shrink-0">{chat.username?.[0]}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-xs truncate">{chat.username}</h4>
                      <span className="text-[9px] text-amber-500 font-bold">★ {chat.rating}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5 font-medium">{chat.lastMessage}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ПРАВАЯ КОЛОНКА (ОКНО ЧАТА) */}
      <div className="flex-1 flex flex-col bg-slate-900/20 border border-slate-900/50 rounded-3xl overflow-hidden backdrop-blur-sm shadow-2xl relative">
        {targetUid ? (
          <>
            {/* Шапка чата */}
            <div className="p-4 bg-slate-900/40 border-b border-slate-900 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-black text-xs uppercase shadow-sm">{targetUser?.username?.[0]}</div>
                <div>
                  <h4 className="font-bold text-sm text-white">{targetUser?.username}</h4>
                  <p className="text-[10px] text-amber-500 font-bold flex items-center gap-1 mt-0.5"><Trophy size={10} /> {targetUser?.rating || 1200} ELO</p>
                </div>
              </div>
            </div>

            {/* Зона сообщений с крутым дизайном */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin bg-slate-950/10">
              {messages.map((msg) => {
                const isMe = msg.senderId === currentUser?.uid;
                return (
                  <div key={msg.id} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <motion.div 
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-xs font-medium shadow-xl relative overflow-hidden transition-all ${
                        isMe 
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 rounded-tr-none font-bold' 
                          : 'bg-slate-900/70 border border-slate-800 text-slate-100 rounded-tl-none backdrop-blur-md shadow-emerald-950/10'
                      }`}
                    >
                      {/* Элемент свечения для сообщений собеседника */}
                      {!isMe && <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/5 to-transparent pointer-events-none" />}
                      
                      <p className="break-words relative z-10 leading-relaxed">{msg.text}</p>
                      <span className={`text-[8px] mt-1.5 text-right block relative z-10 ${isMe ? 'text-slate-900/60 font-black' : 'text-slate-500 font-bold'}`}>
                        {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </motion.div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* НОВАЯ ФИШКА: Быстрая панель шахматных смайликов */}
            <div className="px-4 py-2 bg-slate-950/40 border-t border-slate-900/60 flex items-center gap-1.5 overflow-x-auto shrink-0 scrollbar-none">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1 mr-1 shrink-0">
                <Sparkles size={10} className="text-emerald-400" /> Блиц-эмодзи:
              </span>
              {chessEmojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleSendMessage(emoji)}
                  className="w-7 h-7 bg-slate-900/60 hover:bg-emerald-500/20 hover:scale-110 border border-slate-800/80 hover:border-emerald-500/30 rounded-lg text-sm flex items-center justify-center transition-all shrink-0 active:scale-95"
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Поле ввода сообщения */}
            <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="p-3 bg-slate-900/40 border-t border-slate-900 flex gap-2 shrink-0">
              <input 
                type="text"
                placeholder="Написать сообщение или отправить шахматный эмодзи..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 focus:border-emerald-500/40 rounded-xl px-4 py-2.5 text-xs transition-colors outline-none text-white font-medium shadow-inner"
              />
              <button type="submit" disabled={!newMessage.trim()} className="w-10 h-10 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 rounded-xl flex items-center justify-center text-slate-950 transition-all shrink-0 active:scale-95 shadow-lg shadow-emerald-500/10">
                <Send size={14} strokeWidth={2.5} />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-500 p-8">
            <MessageSquare size={44} className="text-slate-800 mb-3 animate-pulse" />
            <h4 className="text-sm font-bold text-slate-400">Выберите диалог</h4>
            <p className="text-xs max-w-xs mt-1">Здесь отображаются все ваши активные чаты. Отправьте сообщение любому игроку, чтобы начать диалог.</p>
          </div>
        )}
      </div>

    </main>
  );
}