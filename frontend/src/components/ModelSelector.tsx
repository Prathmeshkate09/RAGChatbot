"use client";
import { useState } from 'react';

const MODELS = [
  { id: 'gemini-2.0-flash-exp', label: 'gemini-2.0-flash-exp' },
  { id: 'gemini-2.0-flash-lite', label: 'gemini-2.0-flash-lite' },
  { id: 'gemini-2.0-flash-preview-image-generation', label: 'gemini-2.0-flash-preview-image-generation' },
  { id: 'gemini-2.0-flash', label: 'gemini-2.0-flash' },
  { id: 'gemini-2.5-flash-lite', label: 'gemini-2.5-flash-lite' },
  { id: 'gemini-2.5-flash', label: 'gemini-2.5-flash' },
  { id: 'gemini-2.5-pro', label: 'gemini-2.5-pro' },
  { id: 'gemini-robotics-er-1.5-preview', label: 'gemini-robotics-er-1.5-preview' },
  { id: 'gemma-3-2b', label: 'gemma-3-2b' },
  { id: 'learnlm-2.0-flash-experimental', label: 'learnlm-2.0-flash-experimental' },
  { id: 'imagen-3.0-generate', label: 'imagen-3.0-generate' },
  { id: 'veo-2.0-generate-001', label: 'veo-2.0-generate-001' },
];

export default function ModelSelector({ value, onChange }: { value?: string; onChange: (m: string) => void }) {
  const current = value || 'gemini-2.5-flash';
  return (
    <div className="relative">
      <select
        className="max-w-[280px] w-[280px] overflow-y-auto rounded-md border px-3 py-2 text-sm bg-white dark:bg-slate-900"
        value={current}
        onChange={(e) => onChange(e.target.value)}
        size={1}
        style={{ maxHeight: 200 }}
      >
        {MODELS.map(m => (
          <option key={m.id} value={m.id}>{m.label}</option>
        ))}
      </select>
    </div>
  );
}
