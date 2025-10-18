"use client";
import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import api from '@/utils/api';

export default function UploadButton({ chatId }: { chatId?: string }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleClick = () => inputRef.current?.click();

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const form = new FormData();
    Array.from(files).forEach(f => form.append('files', f));
    if (chatId) form.append('chatId', chatId);
    setUploading(true);
    try {
      await api.post('/api/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      alert('Uploaded and indexed. New knowledge is available to the chat.');
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div>
      <input ref={inputRef} type="file" multiple accept=".pdf,.txt,.md" className="hidden" onChange={e => handleFiles(e.target.files)} />
      <button
        onClick={handleClick}
        disabled={uploading}
        className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
      >
        <Upload size={16} />
        {uploading ? 'Uploading...' : 'Upload Docs'}
      </button>
    </div>
  );
}
