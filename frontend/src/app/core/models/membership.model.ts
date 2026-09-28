/** Rattachement utilisateur ↔ projet (modèle applicatif, attributs camelCase). */
export class Membership {
  id?: number;
  user!: number;
  userName?: string;
  userEmail?: string;
  project!: number;
  roles: string[] = [];
}
