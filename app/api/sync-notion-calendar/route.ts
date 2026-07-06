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

// Minimal shapes for the Notion property payloads we read.
type RichTextFragment = { plain_text: string }
type TitleProp    = { title?: RichTextFragment[] } | undefined
type RichTextProp = { rich_text?: RichTextFragment[] } | undefined
type SelectProp   = { select?: { name?: string } | null } | undefined
type DateProp     = { date?: { start?: string } | null } | undefined

type NotionPage = {
  id: string
  url: string
  last_edited_time: string
  properties: Record<string, unknown>
}

function extractTitle(titleProp: TitleProp): string {
  if (!titleProp?.title || titleProp.title.length === 0) return '';
  return titleProp.title.map(t => t.plain_text).join('').trim();
}

function extractRichText(rtProp: RichTextProp): string | null {
  if (!rtProp?.rich_text || rtProp.rich_text.length === 0) return null;
  const text = rtProp.rich_text.map(t => t.plain_text).join('').trim();
  return text || null;
}

function extractSelect(selectProp: SelectProp): string | null {
  return selectProp?.select?.name || null;
}

function extractDate(dateProp: DateProp): string | null {
  return dateProp?.date?.start || null;
}

async function fetchAllNotionEvents(): Promise<NotionPage[]> {
  const events: NotionPage[] = [];
  let cursor: string | undefined = undefined;
  let hasMore = true;

  while (hasMore) {
    const response = await notion.dataSources.query({
      data_source_id: process.env.NOTION_CALENDAR_DATABASE_ID!,
      start_cursor: cursor,
      page_size: 100,
    }) as unknown as { results: NotionPage[]; has_more: boolean; next_cursor: string | null };

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

      const title = extractTitle(props['Event'] as TitleProp);
      const eventDate = extractDate(props['Date'] as DateProp);

      if (!title || !eventDate) {
        skipped.push(page.id);
        continue;
      }

      events.push({
        notion_page_id: page.id,
        title,
        event_date: eventDate,
        description: extractRichText(props['Description'] as RichTextProp),
        division: extractSelect(props['Division (Lab)'] as SelectProp),
        team: extractSelect(props['Team'] as SelectProp),
        notion_url: page.url,
        last_edited_at: page.last_edited_time,
      });
    }

    let upsertedCount = 0;
    let upsertError: { message: string } | null = null;

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
  } catch (error: unknown) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
