import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { TranslocoModule } from '@jsverse/transloco';
import { ProjectService } from '@core/services/project.service';
import { DocumentService } from '@core/services/document.service';
import { FormService } from '@core/services/form.service';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, MatIconModule, MatButtonModule, TranslocoModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  private projects = inject(ProjectService);
  private documents = inject(DocumentService);
  private forms = inject(FormService);

  projectCount = signal(0);
  documentCount = signal(0);
  formCount = signal(0);
  templateCount = signal(0);

  constructor() {
    this.projects.list().subscribe((r) => this.projectCount.set(r.count));
    this.documents.list().subscribe((r) => this.documentCount.set(r.count));
    this.forms.list().subscribe((r) => this.formCount.set(r.count));
    this.documents.templates().subscribe((r) => this.templateCount.set(r.count));
  }
}
