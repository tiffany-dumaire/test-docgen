import { Meeting, JournalEntry, ProjectLink } from '../models/extras.model';
import {
  MeetingInterface, JournalEntryInterface, ProjectLinkInterface,
} from '../interfaces/extras.interface';
import { pruneUndefined } from './serializer.util';

export class MeetingSerializer {
  static fromApi(dto: MeetingInterface): Meeting {
    const m = new Meeting();
    m.id = dto.id;
    m.project = dto.project;
    m.title = dto.title;
    m.date = dto.date;
    m.location = dto.location;
    m.notes = dto.notes;
    m.documents = dto.documents;
    m.cancelled = dto.cancelled;
    return m;
  }

  static toApi(m: Partial<Meeting>): Partial<MeetingInterface> {
    return pruneUndefined({
      id: m.id,
      project: m.project,
      title: m.title,
      date: m.date,
      location: m.location,
      notes: m.notes,
      documents: m.documents,
      cancelled: m.cancelled,
    });
  }
}

export class JournalEntrySerializer {
  static fromApi(dto: JournalEntryInterface): JournalEntry {
    const m = new JournalEntry();
    m.id = dto.id;
    m.project = dto.project;
    m.projectName = dto.project_name;
    m.client = dto.client;
    m.meeting = dto.meeting;
    m.documentVersion = dto.document_version;
    m.category = dto.category;
    m.categoryLabel = dto.category_label;
    m.confidentiality = dto.confidentiality;
    m.body = dto.body;
    m.bodyHtml = dto.body_html;
    m.isAutomatic = dto.is_automatic;
    m.event = dto.event;
    m.author = dto.author;
    m.createdAt = dto.created_at;
    return m;
  }

  static toApi(m: Partial<JournalEntry>): Partial<JournalEntryInterface> {
    return pruneUndefined({
      id: m.id,
      project: m.project,
      client: m.client,
      meeting: m.meeting,
      category: m.category,
      confidentiality: m.confidentiality,
      body: m.body,
      body_html: m.bodyHtml,
    });
  }
}

export class ProjectLinkSerializer {
  static fromApi(dto: ProjectLinkInterface): ProjectLink {
    const m = new ProjectLink();
    m.id = dto.id;
    m.project = dto.project;
    m.category = dto.category;
    m.name = dto.name;
    m.url = dto.url;
    m.comment = dto.comment;
    m.order = dto.order;
    return m;
  }

  static toApi(m: Partial<ProjectLink>): Partial<ProjectLinkInterface> {
    return pruneUndefined({
      id: m.id,
      project: m.project,
      category: m.category,
      name: m.name,
      url: m.url,
      comment: m.comment,
      order: m.order,
    });
  }
}
