// Teams that are no longer exposed in the member dashboard (navigation,
// team pages, calendar/members filters). Nothing is deleted: tasks, goals,
// calendar rows and club_members.teams values for these slugs stay in the DB.
export const HIDDEN_TEAM_SLUGS: readonly string[] = ['academy']

export function isHiddenTeam(slug: string): boolean {
  return HIDDEN_TEAM_SLUGS.includes(slug)
}
