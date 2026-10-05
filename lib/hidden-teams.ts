// Teams that are no longer exposed in the member dashboard (navigation,
// team pages, calendar/members filters). Nothing is deleted: tasks, goals,
// calendar rows and club_members.teams values for these slugs stay in the DB,
// and requireTeamAccess('alumni') keeps gating the public-alumni admin APIs.
export const HIDDEN_TEAM_SLUGS: readonly string[] = ['education', 'academy', 'syrto', 'alumni']

export function isHiddenTeam(slug: string): boolean {
  return HIDDEN_TEAM_SLUGS.includes(slug)
}
