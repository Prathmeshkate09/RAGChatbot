"use client";
import { useEffect, useState } from "react";

export type Settings = {
  showTimestamps: boolean;
  compactMode: boolean;
};

export default function SettingsModal({
  open,
  onClose,
  value,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  value: Settings;
  onChange: (s: Settings) => void;
}) {
  const [local, setLocal] = useState<Settings>(value);

  useEffect(() => setLocal(value), [value, open]);

  const apply = () => {
    onChange(local);
    onClose();
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-lg border bg-white p-4 shadow dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-3 text-base font-semibold">Settings</div>
        <div className="space-y-3 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={local.showTimestamps}
              onChange={(e) => setLocal({ ...local, showTimestamps: e.target.checked })}
            />
            <span>Show message timestamps</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={local.compactMode}
              onChange={(e) => setLocal({ ...local, compactMode: e.target.checked })}
            />
            <span>Compact message spacing</span>
          </label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button className="rounded-md border px-3 py-2" onClick={onClose}>Cancel</button>
          <button className="rounded-md border px-3 py-2 bg-sky-600 text-white dark:bg-sky-500" onClick={apply}>Save</button>
        </div>
      </div>
    </div>
  );
}
