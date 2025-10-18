"use client";
import { useEffect, useMemo, useRef, useState } from 'react';
import { PanelLeftClose, PanelRightClose } from 'lucide-react';
import dynamic from 'next/dynamic';
import Sidebar from '@/components/Sidebar';
import ChatMessage from '@/components/ChatMessage';
import ChatInput from '@/components/ChatInput';
const UploadButton = dynamic(() => import('@/components/UploadButton'), { ssr: false });
const ModelSelector = dynamic(() => import('@/components/ModelSelector'), { ssr: false });
import SettingsModal, { type Settings } from '@/components/SettingsModal';
import api from '@/utils/api';
import { auth, googleProvider, firebaseEnabled } from '@/utils/firebase';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';

export default function HomePage() {
  const [user, setUser] = useState<any>(null);
  const [chats, setChats] = useState<Array<{ _id: string; title: string; createdAt: string }>>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant' | 'system'; content: string; timestamp?: string | Date }>>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [thinking, setThinking] = useState<boolean>(false);
  const [selectedModel, setSelectedModel] = useState<string>('gemini-2.5-flash');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const enableUpload = (process.env.NEXT_PUBLIC_ENABLE_UPLOAD || '').toLowerCase() === 'true';
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<Settings>({ showTimestamps: true, compactMode: false });
  const [showSidebar, setShowSidebar] = useState<boolean>(true);

  // Load settings from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('chat_settings');
      if (raw) setSettings(JSON.parse(raw));
    } catch {}
  }, []);
  // Persist settings
  useEffect(() => {
    try { localStorage.setItem('chat_settings', JSON.stringify(settings)); } catch {}
  }, [settings]);

  useEffect(() => {
    if (firebaseEnabled && auth) {
      const unsub = onAuthStateChanged(auth, (u) => setUser(u));
      return () => unsub();
    }
    // guest mode
    setUser(null);
    return () => {};
  }, []);

  useEffect(() => {
    if (!user) { setChats([]); return; }
    (async () => {
      try {
        setHistoryLoading(true);
        const { data } = await api.get('/api/chat/history');
        setChats(data.chats || []);
      } catch (e) { /* ignore */ }
      finally { setHistoryLoading(false); }
    })();
  }, [user]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  const loginGoogle = async () => {
    if (firebaseEnabled && auth && googleProvider) {
      await signInWithPopup(auth, googleProvider);
    }
  };
  const logout = async () => {
    if (firebaseEnabled && auth) {
      await signOut(auth);
    }
    setActiveChatId(null);
    setMessages([]);
  };

  const newChat = async () => {
    try {
      const { data } = await api.post('/api/chat/new', {});
      setActiveChatId(data.chatId);
      setMessages(data.chat?.messages || []);
      if (user) {
        const hist = await api.get('/api/chat/history');
        setChats(hist.data.chats || []);
      }
      setToast({ msg: 'New chat created', type: 'success' });
    } catch (e: any) {
      setToast({ msg: e?.response?.data?.error || 'Failed to create chat', type: 'error' });
    }
  };

  const openChat = async (id: string) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/api/chat/${id}`);
      setActiveChatId(id);
      setMessages(data.chat?.messages || []);
    } catch (e: any) {
      setToast({ msg: e?.response?.data?.error || 'Failed to open chat', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const deleteChat = async (id: string) => {
    if (!confirm('Delete this chat?')) return;
    try {
      await api.delete(`/api/chat/${id}/delete`);
      if (activeChatId === id) { setActiveChatId(null); setMessages([]); }
      if (user) {
        const hist = await api.get('/api/chat/history');
        setChats(hist.data.chats || []);
      }
      setToast({ msg: 'Chat deleted', type: 'success' });
    } catch (e: any) {
      setToast({ msg: e?.response?.data?.error || 'Failed to delete chat', type: 'error' });
    }
  };

  const sendMessage = async (text: string) => {
    const cid = activeChatId;
    try {
      setThinking(true);
      if (!cid) {
        // start a new chat with firstMessage
        const { data } = await api.post('/api/chat/new', { firstMessage: text });
        setActiveChatId(data.chatId);
        setMessages(data.chat?.messages || [{ role: 'user', content: text, timestamp: new Date() }]);
        if (user) {
          const hist = await api.get('/api/chat/history');
          setChats(hist.data.chats || []);
        }
        // get response for this new chat
        try {
          const resp = await api.post(`/api/chat/${data.chatId}`, { content: text, model: selectedModel });
          setMessages(resp.data.messages || []);
        } catch (err1) {
          // retry once
          const resp = await api.post(`/api/chat/${data.chatId}`, { content: text, model: selectedModel });
          setMessages(resp.data.messages || []);
        }
      } else {
        setMessages(prev => [...prev, { role: 'user', content: text, timestamp: new Date() }]);
        try {
          const resp = await api.post(`/api/chat/${cid}`, { content: text, model: selectedModel });
          setMessages(resp.data.messages || []);
        } catch (err1) {
          // retry once
          const resp = await api.post(`/api/chat/${cid}`, { content: text, model: selectedModel });
          setMessages(resp.data.messages || []);
        }
      }
    } catch (e: any) {
      setToast({ msg: e?.response?.data?.error || 'Failed to send message', type: 'error' });
    } finally {
      setThinking(false);
    }
  };

  return (
    <div className="h-screen w-full flex">
      {showSidebar && (
        <Sidebar
          chats={chats}
          onNewChat={newChat}
          onOpenChat={openChat}
          onDeleteChat={deleteChat}
          activeChatId={activeChatId}
          loading={historyLoading}
        />
      )}
      <main className="flex-1 flex flex-col">
        {toast && (
          <div className={`fixed top-4 right-4 z-50 rounded-md px-4 py-2 text-sm shadow ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`} onAnimationEnd={() => {}}>
            <div className="flex items-center gap-3">
              <span>{toast.msg}</span>
              <button className="opacity-80 hover:opacity-100" onClick={() => setToast(null)}>✕</button>
            </div>
          </div>
        )}
        <header className="flex items-center justify-between px-4 py-3 border-b bg-white dark:bg-slate-900 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSidebar(s => !s)}
              className="rounded-md border px-2 py-2 text-sm hover:bg-muted"
              title={showSidebar ? 'Close chat panel' : 'Open chat panel'}
            >
              {showSidebar ? <PanelLeftClose size={18} /> : <PanelRightClose size={18} />}
            </button>
            <div className="font-semibold">AI Chatbot</div>
            {enableUpload && <UploadButton chatId={activeChatId || undefined} />}
          </div>
          <div className="flex items-center gap-2">
            <ModelSelector value={selectedModel} onChange={setSelectedModel} />
            <button onClick={() => setSettingsOpen(true)} className="rounded-md border px-3 py-2 text-sm hover:bg-muted">Settings</button>
            {firebaseEnabled && user ? (
              <button onClick={logout} className="rounded-md border px-3 py-2 text-sm hover:bg-muted">Logout</button>
            ) : firebaseEnabled ? (
              <div className="flex items-center gap-2">
                <button onClick={loginGoogle} className="rounded-md border px-3 py-2 text-sm hover:bg-muted">Sign in with Google</button>
                <span className="text-xs text-slate-500">or continue as guest</span>
              </div>
            ) : (
              <div className="text-xs text-slate-500">Guest mode: Firebase login not configured</div>
            )}
          </div>
        </header>

        <section className="flex-1 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-950">
          {loading && <div className="text-sm text-slate-500">Loading chat...</div>}
          {(!loading && messages.length === 0) && (
            <div className="text-sm text-slate-500">Send a message to start the chat.</div>
          )}
          {messages.map((m, i) => {
            const prev = i > 0 ? messages[i-1] : null;
            const sameRole = prev && prev.role === m.role;
            return (
              <div key={i} className={sameRole ? 'mt-1' : 'mt-3'}>
                <ChatMessage role={m.role} content={m.content} timestamp={settings.showTimestamps ? m.timestamp : undefined} compact={settings.compactMode} />
              </div>
            );
          })}
          {thinking && (
            <div className="text-sm text-slate-500 animate-pulse">Thinking...</div>
          )}
          <div ref={messagesEndRef} />
        </section>

        <ChatInput
          onSend={sendMessage}
          disabled={thinking}
          enableUpload={enableUpload}
          onUpload={async (files) => {
            try {
              const form = new FormData();
              Array.from(files).forEach(f => form.append('files', f));
              if (activeChatId) form.append('chatId', activeChatId);
              await api.post('/api/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
              setToast({ msg: 'Uploaded and indexed. New knowledge is available to the chat.', type: 'success' });
            } catch (e: any) {
              setToast({ msg: e?.response?.data?.error || 'Upload failed', type: 'error' });
            }
          }}
        />
      </main>
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        value={settings}
        onChange={setSettings}
      />
    </div>
  );
}
