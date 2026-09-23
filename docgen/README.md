# DocGen — Générateur de documents (Django + PostgreSQL + Bruno)

Plateforme de génération de documents (PDF positionnés, Excel avec colonnes
groupées et tableaux croisés, notes Word, formulaires en ligne à lien réduit)
pilotée depuis une interface Django, avec historique de versions et niveaux de
confidentialité. Le tout se lance avec Docker Compose et expose une API externe
consommée par un container **Bruno**.

---

## 1. Lancement

```bash
cp .env.example .env        # ajustez les valeurs si besoin
docker compose up --build
```

Trois services démarrent :

| Service | Rôle | Accès |
|---------|------|-------|
| `db`    | PostgreSQL 16 | port `5432` |
| `web`   | Application Django + interface | http://localhost:8000 |
| `bruno` | CLI Bruno (collection API) | via `docker compose exec` |

Au premier démarrage, `web` applique les migrations, crée le super-utilisateur
et injecte un jeu de données de démonstration (`seed_demo`).

- Interface : **http://localhost:8000**
- Admin Django : **http://localhost:8000/admin/**
- Identifiants par défaut : **admin / admin** (modifiables dans `.env`)

---

## 2. Fonctionnalités

### Projets, contacts et entreprise
- **Projets** : logo, nom du client, nom du projet, description, contact client
  et contact interne.
- **Contacts** : client ou interne (nom, rôle, e-mail, téléphone) ; les
  initiales sont dérivées automatiquement.
- **Entreprise émettrice** (fiche unique, page « Paramètres ») : nom, logo,
  description, lien conditions générales, autres liens utiles, site web,
  adresse, téléphone, e-mail. Ces infos sont disponibles comme variables dans
  tous les documents.

### Documents
- **Modèles** (`DocumentTemplate`) génériques et réutilisables, de type PDF,
  Excel ou Word, décrits par un JSON de configuration.
- **Niveau de confidentialité** par document : `public`, `internal`,
  `confidential`, `secret` (filigrane appliqué sur le PDF).
- **Historique des versions** : chaque régénération crée une version immuable
  avec numéro, commentaire, initiales de l'auteur, fichier archivé et
  instantané des données utilisées.

#### PDF — positionnement visuel
Éditeur glisser-déposer (`/documents/…/pdf/editor`) : on place directement sur
la page les éléments, dont les coordonnées sont enregistrées dans le modèle.
Types de champs :

- `text` — texte fixe,
- `variable` — variable résolue (`client.name`, `project.name`, `total`, …),
- `image` — image (ex. `company_logo`),
- `form_field` — champ de formulaire AcroForm (saisissable dans le PDF),
- `checkbox` — case à cocher.

Une image ou un PDF de fond peut être fusionné sous les champs. Le repère de
l'éditeur (origine en haut à gauche) est converti automatiquement vers le
repère PDF (origine en bas à gauche).

#### Excel — colonnes groupées + tableau croisé
Configuration : liste de `columns` (`key`, `label`, `group` facultatif,
`type: number` pour les totaux) et un bloc `pivot` optionnel
(`rows`, `cols`, `value`, `agg` = `sum` | `count` | `avg`). Les colonnes
partageant un même `group` sont regroupées sous un en-tête commun ; une feuille
« Pivot » est ajoutée si `pivot` est défini. Les données proviennent de
`document.data["rows"]`.

#### Word — note d'analyse
Configuration : `title`, `subtitle`, `sections` (`heading` + `body`, avec
variables `{{ … }}`) et un `table` optionnel construit à partir des `rows`.
Logo, bandeau de confidentialité et pied de page de l'entreprise sont ajoutés.

### Formulaires en ligne
- Schéma de champs configurable, **lien réduit** public (`/f/<code>/`) et
  **QR code** téléchargeable.
- Les réponses sont enregistrées et consultables dans l'interface. Un
  formulaire peut être ouvert/fermé.

---

## 3. Données passées à un document

Le champ `data` (JSON) d'un document alimente la génération :

```json
{
  "params": { "total": "12 000 € HT" },
  "rows": [
    { "region": "Nord", "product": "Audit", "amount": 1200 },
    { "region": "Sud",  "product": "Audit", "amount": 900 }
  ]
}
```

- `params` : variables simples, disponibles via `{{ total }}` (ou par leur nom).
- `rows` : lignes pour les tableaux Excel / Word et le tableau croisé.

Variables toujours disponibles : `company.*`, `project.*`, `client.*`
(contact client), `internal.*` (contact interne), `document.*`.

---

## 4. API externe (container Bruno)

Base : `/documents/api/`. Authentification par en-tête **`X-API-Key`**
(valeur = variable `API_KEY`, `dev-api-key` par défaut).

| Méthode | Chemin | Rôle |
|---------|--------|------|
| GET  | `/documents/api/templates/` | liste des modèles |
| GET  | `/documents/api/projects/`  | liste des projets |
| POST | `/documents/api/generate/`  | crée + génère un document |
| GET  | `/documents/api/documents/<id>/download/` | télécharge le fichier |

Exemple de corps pour `generate` :

```json
{
  "template": 1,
  "project": 1,
  "title": "Devis via API",
  "confidentiality": "confidential",
  "comment": "Généré via API",
  "initials": "API",
  "data": { "params": { "total": "4 200 € HT" }, "rows": [] }
}
```

### Collection Bruno

La collection se trouve dans le **dossier spécifique** `bruno/collection`
(monté en direct dans le container). Elle contient les 4 requêtes ci-dessus et
un environnement `Local` dont `baseUrl` et `apiKey` proviennent des variables
du container (`API_BASE_URL`, `API_KEY`).

Exécution headless :

```bash
docker compose exec bruno bru run --env Local
```

La requête « 03 - Generer un document » mémorise l'`document_id` renvoyé pour
que « 04 - Telecharger un document » l'utilise automatiquement. Le dossier peut
aussi être ouvert tel quel dans l'application de bureau Bruno.

---

## 5. Configuration (`.env`)

| Variable | Défaut | Rôle |
|----------|--------|------|
| `POSTGRES_DB` / `_USER` / `_PASSWORD` | `docgen` | base PostgreSQL |
| `DJANGO_SECRET_KEY` | `change-me-in-production` | clé Django |
| `DJANGO_DEBUG` | `1` | mode debug |
| `WEB_PORT` | `8000` | port exposé de l'app |
| `PUBLIC_BASE_URL` | `http://localhost:8000` | base des liens réduits / QR |
| `API_KEY` | `dev-api-key` | clé de l'API externe (web + Bruno) |
| `DJANGO_SUPERUSER_*` | `admin` | compte créé au 1er démarrage |

---

## 6. Structure

```
docgen/
├─ docker-compose.yml
├─ .env.example
├─ django/                 # application + interface Django
│  ├─ config/              # settings, urls, wsgi/asgi
│  ├─ core/                # entreprise, projets, contacts (+ seed_demo)
│  ├─ documents/           # modèles, générateurs PDF/Excel/Word, API, éditeur PDF
│  ├─ onlineforms/         # formulaires en ligne, liens réduits, QR
│  ├─ templates/ static/   # interface (thème « console de dessin »)
│  └─ Dockerfile requirements.txt entrypoint.sh
└─ bruno/
   ├─ Dockerfile
   └─ collection/          # dossier API spécifique (usage externe)
```
