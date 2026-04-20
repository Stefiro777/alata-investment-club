'use client';

import { useState } from 'react';

export default function SyncCalendarButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const handleSync = async () => {
    setLoading(true);
    setResult(null);
    setIsError(false);

    try {
      const res = await fetch('/api/admin/trigger-calendar-sync', {
        method: 'POST',
      });
      const data = await res.json();

      if (data.success) {
        setResult(`Synced ${data.synced} events (${data.skipped} skipped, ${data.deleted} deleted). Total in Notion: ${data.total}`);
        setIsError(false);
      } else {
        setResult(`Error: ${data.error}`);
        setIsError(true);
      }
    } catch (err: any) {
      setResult(`Error: ${err.message}`);
      setIsError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-black/10 p-8">
      <div className="flex items-center justify-between gap-6">
        <div>
          <p className="text-sm font-medium text-[#0a0a0a]">Notion Calendar Sync</p>
          <p className="text-xs text-[#6b7280] mt-0.5">
            Sync events from the Notion master calendar. Runs automatically once a day at 08:00 CET.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {result && !isError && (
            <span className="text-xs text-[#1a4a3a] font-medium">Done</span>
          )}
          <button
            onClick={handleSync}
            disabled={loading}
            className="bg-[#1a4a3a] hover:bg-[#123a2d] text-white text-xs font-medium tracking-wide px-6 py-2.5 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {loading ? 'Syncing…' : 'Sync Now'}
          </button>
        </div>
      </div>
      {result && (
        <p className={`text-xs border-l-2 pl-3 py-1 mt-4 ${isError ? 'text-red-600 border-red-400' : 'text-[#1a4a3a] border-[#1a4a3a]'}`}>
          {result}
        </p>
      )}
    </div>
  );
}
