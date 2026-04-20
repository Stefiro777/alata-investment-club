import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('email')
    .eq('email', user.email)
    .single();

  if (!adminUser) {
    return NextResponse.json({ error: 'Forbidden - not admin' }, { status: 403 });
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.alatainvestmentclub.com';
    const syncResponse = await fetch(
      `${baseUrl}/api/sync-notion-calendar?secret=${process.env.CRON_SECRET}`,
      { method: 'GET', cache: 'no-store' }
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
