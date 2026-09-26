import { Confidentiality } from '../enums/confidentiality.enum';
import { DocType } from '../interfaces/document-template.interface';

/** Version de document (modèle applicatif, attributs camelCase). */
export class DocumentVersion {
  id!: number;
  versionNumber!: number;
  comment = '';
  authorInitials = '';
  authorName = '';
  confidentiality: Confidentiality = Confidentiality.Internal;
  confidentialityDisplay?: string;
  fileUrl?: string;
  createdAt!: string;
}

/** Document projet (modèle applicatif, attributs camelCase). */
export class ProjectDocument {
  id?: number;
  project!: number;
  projectName?: string;
  template!: number;
  templateName?: string;
  docType?: DocType;
  title = '';
  confidentiality: Confidentiality = Confidentiality.Internal;
  confidentialityDisplay?: string;
  /** Blob de données du document (clés dynamiques), transmis tel quel. */
  data: Record<string, unknown> = {};
  docDate?: string | null;
  currentVersion?: number;
  versions?: DocumentVersion[];
  createdAt?: string;
  updatedAt?: string;
}

/** Lien court (modèle applicatif, attributs camelCase). */
export class ShortLink {
  id!: number;
  code = '';
  targetUrl = '';
  clickCount = 0;
  shortUrl = '';
}
