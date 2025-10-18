"use client";
import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import api from '@/utils/api';

type ChatListItem = { _id: string; title: string; createdAt: string };

export default function Sidebar({
  chats,
  onNewChat,
  onOpenChat,
  onDeleteChat,
  activeChatId,
  loading,
}: {
  chats: ChatListItem[];
  onNewChat: () => void;
  onOpenChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
  activeChatId?: string | null;
  loading?: boolean;
}) {
  return (
    <aside className="h-full w-72 border-r bg-white dark:bg-slate-900 dark:border-slate-800 flex flex-col">
      <div className="p-3 flex items-center justify-between">
        <button onClick={onNewChat} className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted">
          <Plus size={16} />
          New Chat
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
        {loading && (
          <div className="space-y-1 px-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-8 rounded-md bg-slate-200 dark:bg-slate-800 animate-pulse" />
            ))}
          </div>
        )}
        {!loading && chats.length === 0 && (
          <div className="text-sm text-slate-500 px-2">No chats yet. Start a new conversation.</div>
        )}
        {chats.map(c => (
          <div key={c._id} className={`group flex items-center justify-between gap-2 rounded-md px-2 py-2 hover:bg-muted cursor-pointer ${activeChatId === c._id ? 'bg-muted' : ''}`}>
            <div onClick={() => onOpenChat(c._id)} className="truncate text-sm">
              {c.title || 'Untitled'}
            </div>
            <button onClick={() => onDeleteChat(c._id)} className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-600">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </aside>
  );
}

