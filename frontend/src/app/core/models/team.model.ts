/** Membre d'équipe (modèle applicatif, attributs camelCase). */
export class TeamMember {
  id?: number;
  firstName = '';
  lastName = '';
  fullName?: string;
  initials?: string;
  role?: string;
  email?: string;
  phone?: string;
  teamIds?: number[];
  teamNames?: string[];
}

/** Référence projet portée par une équipe. */
export class TeamProjectRef {
  id!: number;
  name = '';
  status = '';
  clientName = '';
}

/** Équipe (modèle applicatif, attributs camelCase). */
export class Team {
  id?: number;
  name = '';
  description?: string;
  color?: string;
  parent?: number | null;
  parentName?: string | null;
  subteamIds?: number[];
  relatedTeams?: number[];
  relatedTeamIds?: number[];
  members?: TeamMember[];
  memberIds?: number[];
  projectsDetail?: TeamProjectRef[];
  projectIds?: number[];
  memberCount?: number;
  projectCount?: number;
  createdAt?: string;
}
