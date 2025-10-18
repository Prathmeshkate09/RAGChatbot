"use client";
import type React from 'react';
import type { DragEvent as ReactDragEvent, ClipboardEvent as ReactClipboardEvent } from 'react';
import { useCallback, useRef, useState } from 'react';
import { Send, Paperclip } from 'lucide-react';

export default function ChatInput({ onSend, disabled, enableUpload, onUpload }: { onSend: (text: string) => void; disabled?: boolean; enableUpload?: boolean; onUpload?: (files: FileList) => Promise<void> | void }) {
  const [text, setText] = useState('');
  const fileRef = useRef<HTMLInputElement | null>(null);

  const submit = () => {
    const t = text.trim();
    if (!t || disabled) return;
    onSend(t);
    setText('');
  };

  const handlePaste = useCallback(async (e: ReactClipboardEvent<HTMLTextAreaElement>) => {
    if (!enableUpload || !onUpload) return;
    const items = e.clipboardData?.items || [];
    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.kind === 'file') {
        const f = it.getAsFile();
        if (f) files.push(f);
      }
    }
    if (files.length > 0) {
      const list = {
        length: files.length,
        item: (idx: number) => files[idx] || null,
        ...files,
      } as unknown as FileList;
      await onUpload(list);
    }
  }, [enableUpload, onUpload]);

  const handleDrop = useCallback(async (e: ReactDragEvent<HTMLDivElement>) => {
    if (!enableUpload || !onUpload) return;
    e.preventDefault();
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      await onUpload(files);
    }
  }, [enableUpload, onUpload]);

  return (
    <div
      className="flex items-center gap-2 border-t p-3 bg-white dark:bg-slate-900 dark:border-slate-800"
      onDragOver={(e: ReactDragEvent<HTMLDivElement>) => { if (enableUpload) { e.preventDefault(); } }}
      onDrop={handleDrop}
    >
      {enableUpload && (
        <>
          <input
            type="file"
            multiple
            ref={fileRef}
            className="hidden"
            accept=".pdf,.txt,.md,image/*"
            onChange={async (e) => {
              if (!onUpload) return;
              const files = e.target.files;
              if (files && files.length > 0) {
                await onUpload(files);
              }
              if (fileRef.current) fileRef.current.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-md border px-2 py-2 text-sm hover:bg-muted"
            title="Attach files"
          >
            <Paperclip size={16} />
          </button>
        </>
      )}
      <textarea
        className="flex-1 resize-none rounded-md border px-3 py-2 text-sm h-12 focus:outline-none focus:ring-1 focus:ring-sky-400 bg-white dark:bg-slate-900"
        placeholder="Type your message..."
        value={text}
        onChange={e => setText(e.target.value)}
        onPaste={handlePaste}
        onKeyDown={e => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
      />
      <button
        onClick={submit}
        disabled={disabled}
        className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
      >
        <Send size={16} />
        Send
      </button>
    </div>
  );
}

