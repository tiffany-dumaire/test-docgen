/** Forme brute (API) d'un membre d'équipe. */
export interface TeamMemberInterface {
  id?: number;
  first_name: string;
  last_name: string;
  full_name?: string;
  initials?: string;
  role?: string;
  email?: string;
  phone?: string;
  team_ids?: number[];
  team_names?: string[];
}

/** Forme brute (API) d'une référence projet portée par une équipe. */
export interface TeamProjectRefInterface {
  id: number;
  name: string;
  status: string;
  client_name: string;
}

/** Forme brute (API) d'une équipe. */
export interface TeamInterface {
  id?: number;
  name: string;
  description?: string;
  color?: string;
  parent?: number | null;
  parent_name?: string | null;
  subteam_ids?: number[];
  related_teams?: number[];
  related_team_ids?: number[];
  members?: TeamMemberInterface[];
  member_ids?: number[];
  projects_detail?: TeamProjectRefInterface[];
  project_ids?: number[];
  member_count?: number;
  project_count?: number;
  created_at?: string;
}
