/**
 * Barrel historique `core/models`.
 *
 * L'ancien fichier monolithique a été éclaté :
 *  - `core/interfaces/` : formes brutes renvoyées par l'API (snake_case) ;
 *  - `core/models/`     : modèles applicatifs (classes, attributs camelCase) ;
 *  - `core/serializers/`: conversion interface ⇄ modèle ;
 *  - `core/enums/`      : énumérations (statuts, confidentialité, etc.).
 *
 * Ce barrel ré-exporte l'ensemble pour préserver les imports existants
 * (`import { … } from '.../core/models'`).
 */
export * from './enums/index';
export * from './interfaces/index';
export * from './models/index';
export * from './serializers/index';
