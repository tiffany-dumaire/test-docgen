import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { DocumentService } from '@core/services/document.service';
import { FormService } from '@core/services/form.service';
import { ToastService } from '@core/services/api.service';
import { PreviewService } from '@core/services/preview.service';
import { OnlineForm, ProjectDocument } from '@core/models';

@Component({
  selector: 'app-tracking',
  imports: [FormsModule, RouterLink, DatePipe, MatTabsModule],
  templateUrl: './tracking.html',
  styleUrl: './tracking.scss',
})
export class Tracking {
  private docSvc = inject(DocumentService);
  private formSvc = inject(FormService);
  private toast = inject(ToastService);
  private previewSvc = inject(PreviewService);

  documents = signal<ProjectDocument[]>([]);
  forms = signal<OnlineForm[]>([]);
  docSearch = '';
  formSearch = '';

  constructor() {
    this.docSvc.list().subscribe((r) => this.documents.set(r.results));
    this.formSvc.list().subscribe((r) => this.forms.set(r.results));
  }

  totalSubmissions = computed(() =>
    this.forms().reduce((s, f) => s + (f.submissionCount || 0), 0));

  filteredDocs() {
    const q = this.docSearch.toLowerCase().trim();
    if (!q) return this.documents();
    return this.documents().filter((d) =>
      (d.title + ' ' + (d.projectName || '')).toLowerCase().includes(q));
  }
  filteredForms() {
    const q = this.formSearch.toLowerCase().trim();
    if (!q) return this.forms();
    return this.forms().filter((f) =>
      (f.title + ' ' + (f.templateName || '')).toLowerCase().includes(q));
  }
  projectName(f: OnlineForm): string {
    return f.projectName || '—';
  }

  previewDoc(d: ProjectDocument) {
    this.docSvc.preview(d.id!).subscribe({
      next: (r) => this.previewSvc.open(r, d.title),
      error: () => this.toast.error('Aperçu impossible.'),
    });
  }
}
