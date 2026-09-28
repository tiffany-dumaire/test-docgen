/** Statuts possibles d'un projet (valeurs renvoyées par l'API). */
export enum ProjectStatus {
  Active = 'active',
  OnHold = 'on_hold',
  Archived = 'archived',
}

/** Libellés d'affichage FR par statut. */
export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  [ProjectStatus.Active]: 'Actif',
  [ProjectStatus.OnHold]: 'En pause',
  [ProjectStatus.Archived]: 'Archivé',
};
