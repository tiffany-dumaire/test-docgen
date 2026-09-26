import { Routes } from '@angular/router';
import { authGuard } from '@core/guards/auth.guard';

export const routes: Routes = [
  // Publiques (sans authentification)
  { path: 'login', loadComponent: () => import('@components/login').then((m) => m.Login) },
  { path: 'auth/callback', loadComponent: () => import('@components/callback').then((m) => m.AuthCallback) },
  { path: 'f/:code', loadComponent: () => import('@components/public-form').then((m) => m.PublicForm) },

  // Protégées (authentification requise)
  {
    path: '',
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', loadComponent: () => import('@components/dashboard').then((m) => m.Dashboard) },
      { path: 'company', loadComponent: () => import('@components/company-settings').then((m) => m.CompanySettings) },
      { path: 'projects', loadComponent: () => import('@components/project-list').then((m) => m.ProjectList) },
      { path: 'projects/new', loadComponent: () => import('@components/project-form').then((m) => m.ProjectForm) },
      { path: 'projects/:id', loadComponent: () => import('@components/project-detail').then((m) => m.ProjectDetail) },
      { path: 'projects/:id/edit', loadComponent: () => import('@components/project-form').then((m) => m.ProjectForm) },
      { path: 'documents', loadComponent: () => import('@components/document-list').then((m) => m.DocumentList) },
      { path: 'documents/new', loadComponent: () => import('@components/document-editor').then((m) => m.DocumentEditor) },
      { path: 'documents/:id', loadComponent: () => import('@components/document-editor').then((m) => m.DocumentEditor) },
      { path: 'templates', loadComponent: () => import('@components/template-list').then((m) => m.TemplateList) },
      { path: 'templates/new', loadComponent: () => import('@components/template-builder').then((m) => m.TemplateBuilder) },
      { path: 'templates/:id', loadComponent: () => import('@components/template-builder').then((m) => m.TemplateBuilder) },
      { path: 'forms', loadComponent: () => import('@components/form-list').then((m) => m.FormList) },
      { path: 'forms/new', loadComponent: () => import('@components/form-builder').then((m) => m.FormBuilder) },
      { path: 'forms/:id', loadComponent: () => import('@components/form-builder').then((m) => m.FormBuilder) },
      { path: 'form-templates/new', loadComponent: () => import('@components/form-template-builder').then((m) => m.FormTemplateBuilder) },
      { path: 'form-templates/:id', loadComponent: () => import('@components/form-template-builder').then((m) => m.FormTemplateBuilder) },
      { path: 'suivi', loadComponent: () => import('@components/tracking').then((m) => m.Tracking) },
      { path: 'clients', loadComponent: () => import('@components/client-list').then((m) => m.ClientList) },
      { path: 'clients/new', loadComponent: () => import('@components/client-detail').then((m) => m.ClientDetail) },
      { path: 'clients/:id', loadComponent: () => import('@components/client-detail').then((m) => m.ClientDetail) },
      { path: 'teams', pathMatch: 'full', redirectTo: 'company' },
      { path: 'teams/:id', loadComponent: () => import('@components/team-detail').then((m) => m.TeamDetail) },
      { path: 'preferences', loadComponent: () => import('@components/preferences').then((m) => m.Preferences) },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
