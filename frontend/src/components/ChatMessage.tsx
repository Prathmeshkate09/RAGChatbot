"use client";
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '../utils/cn';

export default function ChatMessage({ role, content, timestamp, compact }: { role: 'user' | 'assistant' | 'system'; content: string; timestamp?: string | Date; compact?: boolean }) {
  const isUser = role === 'user';
  const ts = timestamp ? new Date(timestamp) : null;
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  };
  return (
    <div className={cn("w-full", isUser ? "justify-end" : "justify-start", "flex")}
    >
      <div className={cn(
        "max-w-3xl whitespace-pre-wrap rounded-lg text-sm",
        compact ? 'px-3 py-2' : 'px-4 py-3',
        isUser ? "bg-sky-100 dark:bg-sky-900/40" : "bg-slate-100 dark:bg-slate-800"
      )}
      >
        {!isUser && (
          <div className="flex justify-end">
            <button
              onClick={handleCopy}
              className="-mt-1 -mr-1 mb-1 rounded px-2 py-1 text-[10px] bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600"
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        )}
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content || ''}</ReactMarkdown>
        {ts && (
          <div className="mt-1 text-[10px] text-slate-500">
            {ts.toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );
}
