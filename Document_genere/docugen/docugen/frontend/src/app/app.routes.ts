import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard').then((m) => m.Dashboard),
  },
  {
    path: 'company',
    loadComponent: () =>
      import('./features/company/company-settings').then((m) => m.CompanySettings),
  },
  {
    path: 'projects',
    loadComponent: () =>
      import('./features/projects/project-list').then((m) => m.ProjectList),
  },
  {
    path: 'projects/new',
    loadComponent: () =>
      import('./features/projects/project-form').then((m) => m.ProjectForm),
  },
  {
    path: 'projects/:id',
    loadComponent: () =>
      import('./features/projects/project-detail').then((m) => m.ProjectDetail),
  },
  {
    path: 'projects/:id/edit',
    loadComponent: () =>
      import('./features/projects/project-form').then((m) => m.ProjectForm),
  },
  {
    path: 'documents',
    loadComponent: () =>
      import('./features/documents/document-list').then((m) => m.DocumentList),
  },
  {
    path: 'documents/new',
    loadComponent: () =>
      import('./features/documents/document-editor').then((m) => m.DocumentEditor),
  },
  {
    path: 'documents/:id',
    loadComponent: () =>
      import('./features/documents/document-editor').then((m) => m.DocumentEditor),
  },
  {
    path: 'templates',
    loadComponent: () =>
      import('./features/documents/template-list').then((m) => m.TemplateList),
  },
  {
    path: 'forms',
    loadComponent: () =>
      import('./features/forms/form-list').then((m) => m.FormList),
  },
  {
    path: 'forms/new',
    loadComponent: () =>
      import('./features/forms/form-builder').then((m) => m.FormBuilder),
  },
  {
    path: 'forms/:id',
    loadComponent: () =>
      import('./features/forms/form-builder').then((m) => m.FormBuilder),
  },
  {
    path: 'f/:code',
    loadComponent: () =>
      import('./features/forms/public-form').then((m) => m.PublicForm),
  },
  { path: '**', redirectTo: 'dashboard' },
];
