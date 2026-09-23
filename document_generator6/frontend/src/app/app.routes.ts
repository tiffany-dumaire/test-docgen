import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  // Publiques (sans authentification)
  { path: 'login', loadComponent: () => import('./features/auth/login').then((m) => m.Login) },
  { path: 'auth/callback', loadComponent: () => import('./features/auth/callback').then((m) => m.AuthCallback) },
  { path: 'f/:code', loadComponent: () => import('./features/forms/public-form').then((m) => m.PublicForm) },

  // Protégées (authentification requise)
  {
    path: '',
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard) },
      { path: 'company', loadComponent: () => import('./features/company/company-settings').then((m) => m.CompanySettings) },
      { path: 'projects', loadComponent: () => import('./features/projects/project-list').then((m) => m.ProjectList) },
      { path: 'projects/new', loadComponent: () => import('./features/projects/project-form').then((m) => m.ProjectForm) },
      { path: 'projects/:id', loadComponent: () => import('./features/projects/project-detail').then((m) => m.ProjectDetail) },
      { path: 'projects/:id/edit', loadComponent: () => import('./features/projects/project-form').then((m) => m.ProjectForm) },
      { path: 'documents', loadComponent: () => import('./features/documents/document-list').then((m) => m.DocumentList) },
      { path: 'documents/new', loadComponent: () => import('./features/documents/document-editor').then((m) => m.DocumentEditor) },
      { path: 'documents/:id', loadComponent: () => import('./features/documents/document-editor').then((m) => m.DocumentEditor) },
      { path: 'templates', loadComponent: () => import('./features/documents/template-list').then((m) => m.TemplateList) },
      { path: 'templates/new', loadComponent: () => import('./features/documents/template-builder').then((m) => m.TemplateBuilder) },
      { path: 'templates/:id', loadComponent: () => import('./features/documents/template-builder').then((m) => m.TemplateBuilder) },
      { path: 'forms', loadComponent: () => import('./features/forms/form-list').then((m) => m.FormList) },
      { path: 'forms/new', loadComponent: () => import('./features/forms/form-builder').then((m) => m.FormBuilder) },
      { path: 'forms/:id', loadComponent: () => import('./features/forms/form-builder').then((m) => m.FormBuilder) },
      { path: 'clients', loadComponent: () => import('./features/clients/client-list').then((m) => m.ClientList) },
      { path: 'teams', loadComponent: () => import('./features/teams/team-list').then((m) => m.TeamList) },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
