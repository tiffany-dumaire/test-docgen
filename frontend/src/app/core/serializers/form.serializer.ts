import { FormTemplate, OnlineForm, FormSubmission } from '../models/form.model';
import {
  FormTemplateInterface, OnlineFormInterface, FormSubmissionInterface,
} from '../interfaces/form.interface';
import { ShortLinkSerializer } from './document.serializer';
import { pruneUndefined } from './serializer.util';

export class FormTemplateSerializer {
  static fromApi(dto: FormTemplateInterface): FormTemplate {
    const m = new FormTemplate();
    m.id = dto.id;
    m.name = dto.name;
    m.description = dto.description;
    m.schema = dto.schema;
    m.diagrams = dto.diagrams;
    m.reportTemplate = dto.report_template;
    m.language = dto.language;
    m.confidentiality = dto.confidentiality;
    m.confidentialityDisplay = dto.confidentiality_display;
    m.successMessage = dto.success_message;
    m.showProgress = dto.show_progress;
    m.theme = dto.theme;
    m.isActive = dto.is_active;
    m.scope = dto.scope;
    m.projects = dto.projects;
    m.formCount = dto.form_count;
    m.createdAt = dto.created_at;
    m.updatedAt = dto.updated_at;
    return m;
  }

  static toApi(m: Partial<FormTemplate>): Partial<FormTemplateInterface> {
    return pruneUndefined({
      id: m.id,
      name: m.name,
      description: m.description,
      schema: m.schema,
      diagrams: m.diagrams,
      report_template: m.reportTemplate,
      language: m.language,
      confidentiality: m.confidentiality,
      success_message: m.successMessage,
      show_progress: m.showProgress,
      theme: m.theme,
      is_active: m.isActive,
      scope: m.scope,
      projects: m.projects,
    });
  }
}

export class OnlineFormSerializer {
  static fromApi(dto: OnlineFormInterface): OnlineForm {
    const m = new OnlineForm();
    m.id = dto.id;
    m.title = dto.title;
    m.description = dto.description;
    m.project = dto.project;
    m.projectName = dto.project_name;
    m.template = dto.template;
    m.templateName = dto.template_name;
    m.schema = dto.schema;
    m.diagrams = dto.diagrams;
    m.reportTemplate = dto.report_template;
    m.confidentiality = dto.confidentiality;
    m.confidentialityDisplay = dto.confidentiality_display;
    m.isOpen = dto.is_open;
    m.deadline = dto.deadline;
    m.successMessage = dto.success_message;
    m.showProgress = dto.show_progress;
    m.theme = dto.theme;
    m.shortLink = dto.short_link ? ShortLinkSerializer.fromApi(dto.short_link) : dto.short_link;
    m.shortUrl = dto.short_url;
    m.submissionCount = dto.submission_count;
    m.logoUrl = dto.logo_url;
    m.companyName = dto.company_name;
    return m;
  }

  static toApi(m: Partial<OnlineForm>): Partial<OnlineFormInterface> {
    return pruneUndefined({
      id: m.id,
      title: m.title,
      description: m.description,
      project: m.project,
      template: m.template,
      schema: m.schema,
      diagrams: m.diagrams,
      report_template: m.reportTemplate,
      confidentiality: m.confidentiality,
      is_open: m.isOpen,
      deadline: m.deadline,
      success_message: m.successMessage,
      show_progress: m.showProgress,
      theme: m.theme,
    });
  }
}

export class FormSubmissionSerializer {
  static fromApi(dto: FormSubmissionInterface): FormSubmission {
    const m = new FormSubmission();
    m.id = dto.id;
    m.form = dto.form;
    m.data = dto.data ?? {};
    m.submittedAt = dto.submitted_at;
    return m;
  }
}
