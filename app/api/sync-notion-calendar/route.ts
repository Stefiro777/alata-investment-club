import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@notionhq/client';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const notion = new Client({ auth: process.env.NOTION_TOKEN });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface NotionEvent {
  notion_page_id: string;
  title: string;
  event_date: string;
  description: string | null;
  division: string | null;
  team: string | null;
  notion_url: string;
  last_edited_at: string;
}

function extractTitle(titleProp: any): string {
  if (!titleProp?.title || titleProp.title.length === 0) return '';
  return titleProp.title.map((t: any) => t.plain_text).join('').trim();
}

function extractRichText(rtProp: any): string | null {
  if (!rtProp?.rich_text || rtProp.rich_text.length === 0) return null;
  const text = rtProp.rich_text.map((t: any) => t.plain_text).join('').trim();
  return text || null;
}

function extractSelect(selectProp: any): string | null {
  return selectProp?.select?.name || null;
}

function extractDate(dateProp: any): string | null {
  return dateProp?.date?.start || null;
}

async function fetchAllNotionEvents() {
  const events: any[] = [];
  let cursor: string | undefined = undefined;
  let hasMore = true;

  while (hasMore) {
    const response: any = await notion.dataSources.query({
      data_source_id: process.env.NOTION_CALENDAR_DATABASE_ID!,
      start_cursor: cursor,
      page_size: 100,
    });

    events.push(...response.results);
    hasMore = response.has_more;
    cursor = response.next_cursor || undefined;
  }

  return events;
}

export async function GET(request: NextRequest) {
  // Secret accepted only via Authorization header — querystrings end up in logs.
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const notionPages = await fetchAllNotionEvents();

    const events: NotionEvent[] = [];
    const skipped: string[] = [];

    for (const page of notionPages) {
      const props = page.properties;

      const title = extractTitle(props['Event']);
      const eventDate = extractDate(props['Date']);

      if (!title || !eventDate) {
        skipped.push(page.id);
        continue;
      }

      events.push({
        notion_page_id: page.id,
        title,
        event_date: eventDate,
        description: extractRichText(props['Description']),
        division: extractSelect(props['Division (Lab)']),
        team: extractSelect(props['Team']),
        notion_url: page.url,
        last_edited_at: page.last_edited_time,
      });
    }

    let upsertedCount = 0;
    let upsertError: any = null;

    if (events.length > 0) {
      const { error, count } = await supabase
        .from('calendar_events')
        .upsert(events, {
          onConflict: 'notion_page_id',
          count: 'exact',
        });

      if (error) {
        upsertError = error;
      } else {
        upsertedCount = count || events.length;
      }
    }

    const { data: currentNotionIds } = { data: events.map((e) => e.notion_page_id) };
    let deletedCount = 0;

    if (currentNotionIds.length > 0) {
      const { error: deleteError, count: delCount } = await supabase
        .from('calendar_events')
        .delete({ count: 'exact' })
        .not('notion_page_id', 'in', `(${currentNotionIds.map((id) => `"${id}"`).join(',')})`);

      if (!deleteError) {
        deletedCount = delCount || 0;
      }
    }

    return NextResponse.json({
      success: true,
      synced: upsertedCount,
      skipped: skipped.length,
      deleted: deletedCount,
      total_in_notion: notionPages.length,
      error: upsertError,
    });
  } catch (error: any) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
