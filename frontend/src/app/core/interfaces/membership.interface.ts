/** Forme brute (API) d'un rattachement utilisateur ↔ projet. */
export interface MembershipInterface {
  id?: number;
  user: number;
  user_name?: string;
  user_email?: string;
  project: number;
  roles: string[];
}
