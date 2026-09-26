import { Team, TeamMember, TeamProjectRef } from '../models/team.model';
import {
  TeamInterface, TeamMemberInterface, TeamProjectRefInterface,
} from '../interfaces/team.interface';
import { mapArray, pruneUndefined } from './serializer.util';

export class TeamMemberSerializer {
  static fromApi(dto: TeamMemberInterface): TeamMember {
    const m = new TeamMember();
    m.id = dto.id;
    m.firstName = dto.first_name;
    m.lastName = dto.last_name;
    m.fullName = dto.full_name;
    m.initials = dto.initials;
    m.role = dto.role;
    m.email = dto.email;
    m.phone = dto.phone;
    m.teamIds = dto.team_ids;
    m.teamNames = dto.team_names;
    return m;
  }

  static toApi(m: Partial<TeamMember>): Partial<TeamMemberInterface> {
    return pruneUndefined({
      id: m.id,
      first_name: m.firstName,
      last_name: m.lastName,
      role: m.role,
      email: m.email,
      phone: m.phone,
      team_ids: m.teamIds,
    });
  }
}

export class TeamProjectRefSerializer {
  static fromApi(dto: TeamProjectRefInterface): TeamProjectRef {
    const m = new TeamProjectRef();
    m.id = dto.id;
    m.name = dto.name;
    m.status = dto.status;
    m.clientName = dto.client_name;
    return m;
  }
}

export class TeamSerializer {
  static fromApi(dto: TeamInterface): Team {
    const m = new Team();
    m.id = dto.id;
    m.name = dto.name;
    m.description = dto.description;
    m.color = dto.color;
    m.parent = dto.parent;
    m.parentName = dto.parent_name;
    m.subteamIds = dto.subteam_ids;
    m.relatedTeams = dto.related_teams;
    m.relatedTeamIds = dto.related_team_ids;
    m.members = mapArray(dto.members, TeamMemberSerializer.fromApi);
    m.memberIds = dto.member_ids;
    m.projectsDetail = mapArray(dto.projects_detail, TeamProjectRefSerializer.fromApi);
    m.projectIds = dto.project_ids;
    m.memberCount = dto.member_count;
    m.projectCount = dto.project_count;
    m.createdAt = dto.created_at;
    return m;
  }

  static toApi(m: Partial<Team>): Partial<TeamInterface> {
    return pruneUndefined({
      id: m.id,
      name: m.name,
      description: m.description,
      color: m.color,
      parent: m.parent,
      related_team_ids: m.relatedTeamIds,
      member_ids: m.memberIds,
      project_ids: m.projectIds,
    });
  }
}
