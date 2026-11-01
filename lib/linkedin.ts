// LinkedIn posts imported by the Make automation into `contenuti` (tipo
// 'report'). The raw text carries mention markup, URNs and hashtags.

export function cleanLinkedInLine(line: string): string {
  return line
    .replace(/\r/g, '')
    .replace(/@\[([^\]]+)\]\(urn:[^)]*\)/g, '$1')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/urn:li:\S*/g, '')
    .replace(/#\S+/g, '')
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    .replace(/[^\x20-\x7E\xA0-ž]/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim()
}

/** First non-empty line of the post: its headline. */
export function linkedInTitle(text: string): string {
  for (const line of text.split(/\r?\n/)) {
    const cleaned = cleanLinkedInLine(line)
    if (cleaned.length > 0) return cleaned
  }
  return ''
}

/** "urn:li:activity:…" → public post URL; full URLs are returned unchanged. */
export function linkedInUrl(link: string): string {
  if (link.startsWith('urn:')) return `https://www.linkedin.com/feed/update/${link}/`
  return link
}

export const CLUB_LINKEDIN_POSTS = 'https://www.linkedin.com/company/alatainvestmentclub/posts/'
