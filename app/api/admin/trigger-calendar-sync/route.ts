import { NextResponse } from 'next/server';
import { requirePrivilegedAccess } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST() {
  if (!(await requirePrivilegedAccess())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.alatainvestmentclub.com';
    const syncResponse = await fetch(
      `${baseUrl}/api/sync-notion-calendar`,
      {
        method: 'GET',
        cache: 'no-store',
        headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
      }
    );

    const result = await syncResponse.json();

    if (!syncResponse.ok || !result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Sync failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      synced: result.synced,
      skipped: result.skipped,
      deleted: result.deleted,
      total: result.total_in_notion,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
