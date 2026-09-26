import { DocumentVersion, ProjectDocument, ShortLink } from '../models/document.model';
import {
  DocumentVersionInterface, ProjectDocumentInterface, ShortLinkInterface,
} from '../interfaces/document.interface';
import { mapArray, pruneUndefined } from './serializer.util';

export class DocumentVersionSerializer {
  static fromApi(dto: DocumentVersionInterface): DocumentVersion {
    const m = new DocumentVersion();
    m.id = dto.id;
    m.versionNumber = dto.version_number;
    m.comment = dto.comment;
    m.authorInitials = dto.author_initials;
    m.authorName = dto.author_name;
    m.confidentiality = dto.confidentiality;
    m.confidentialityDisplay = dto.confidentiality_display;
    m.fileUrl = dto.file_url;
    m.createdAt = dto.created_at;
    return m;
  }
}

export class ShortLinkSerializer {
  static fromApi(dto: ShortLinkInterface): ShortLink {
    const m = new ShortLink();
    m.id = dto.id;
    m.code = dto.code;
    m.targetUrl = dto.target_url;
    m.clickCount = dto.click_count;
    m.shortUrl = dto.short_url;
    return m;
  }
}

export class ProjectDocumentSerializer {
  static fromApi(dto: ProjectDocumentInterface): ProjectDocument {
    const m = new ProjectDocument();
    m.id = dto.id;
    m.project = dto.project;
    m.projectName = dto.project_name;
    m.template = dto.template;
    m.templateName = dto.template_name;
    m.docType = dto.doc_type;
    m.title = dto.title;
    m.confidentiality = dto.confidentiality;
    m.confidentialityDisplay = dto.confidentiality_display;
    m.data = dto.data ?? {};
    m.docDate = dto.doc_date;
    m.currentVersion = dto.current_version;
    m.versions = mapArray(dto.versions, DocumentVersionSerializer.fromApi);
    m.createdAt = dto.created_at;
    m.updatedAt = dto.updated_at;
    return m;
  }

  static toApi(m: Partial<ProjectDocument>): Partial<ProjectDocumentInterface> {
    return pruneUndefined({
      id: m.id,
      project: m.project,
      template: m.template,
      title: m.title,
      confidentiality: m.confidentiality,
      data: m.data,
      doc_date: m.docDate,
    });
  }
}
