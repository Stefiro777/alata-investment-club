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
    <div className="border border-[#1a4a3a] p-6 bg-white">
      <h3 className="text-xl font-serif text-[#1a4a3a] mb-2">Notion Calendar Sync</h3>
      <p className="text-sm text-gray-600 mb-4">
        Sync events from the Notion master calendar. Runs automatically twice a day (08:00 and 20:00 CET).
      </p>
      <button
        onClick={handleSync}
        disabled={loading}
        className="px-6 py-2 bg-[#1a4a3a] text-white hover:bg-[#143428] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Syncing...' : 'Sync Now'}
      </button>
      {result && (
        <p className={`mt-4 text-sm ${isError ? 'text-red-600' : 'text-green-700'}`}>
          {result}
        </p>
      )}
    </div>
  );
}
