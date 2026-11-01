// Line icons of the member area and Board panel (boards area/*, board/*).

const base = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }

export const Icons = {
  home: () => <svg {...base}><path d="M3 11l9-7 9 7v9H3z" /></svg>,
  jobs: () => <svg {...base}><rect x="3" y="7" width="18" height="13" /><path d="M9 7V4h6v3" /></svg>,
  calendar: () => <svg {...base}><rect x="3" y="5" width="18" height="16" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>,
  people: () => <svg {...base}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-4 3-6 6.5-6s6.5 2 6.5 6M16 5a3.5 3.5 0 010 7M18 14c2.2.5 3.5 2.5 3.5 6" /></svg>,
  profile: () => <svg {...base}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.5 3.5-7 8-7s8 2.5 8 7" /></svg>,
  events: () => <svg {...base}><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" /></svg>,
  media: () => <svg {...base}><rect x="3" y="4" width="18" height="16" /><circle cx="9" cy="10" r="2" /><path d="M3 17l5-4 4 3 3-2 6 4" /></svg>,
  career: () => <svg {...base}><path d="M3 20l5-9 4 5 3-6 6 10z" /></svg>,
  site: () => <svg {...base}><rect x="3" y="4" width="18" height="16" /><path d="M3 9h18" /></svg>,
  finance: () => <svg {...base}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>,
  crm: () => <svg {...base}><rect x="3" y="4" width="18" height="16" /><circle cx="9" cy="11" r="2.5" /><path d="M5 17c.7-2 2.2-3 4-3s3.3 1 4 3M15 9h4M15 13h4" /></svg>,
  analytics: () => <svg {...base}><path d="M3 17l5-5 4 4 8-9" /><path d="M15 7h5v5" /></svg>,
  tools: () => <svg {...base}><path d="M14 6l4 4M4 20l8.5-8.5M15.5 3.5a3.5 3.5 0 004.9 4.9L18 11l-5-5z" /></svg>,
}

export type IconName = keyof typeof Icons
