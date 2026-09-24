# DocuGen — Plateforme de génération de documents

DocuGen est une application web permettant de **générer et personnaliser des documents**
(PDF de suivi de projet, fichiers Excel génériques, rapports Word d'analyse) et de
**créer des formulaires en ligne partageables via un lien réduit**, le tout à partir de
projets et de variables paramétrables.

- **Backend** : Django 5 + Django REST Framework (API REST + génération de fichiers)
- **Frontend** : Angular 21 (interface d'administration)
- **Formats produits** : PDF (reportlab), Excel (openpyxl), Word (python-docx)

---

## Sommaire

1. [Fonctionnalités](#fonctionnalités)
2. [Architecture](#architecture)
3. [Prérequis](#prérequis)
4. [Lancement du backend](#1-lancement-du-backend-django)
5. [Lancement du frontend](#2-lancement-du-frontend-angular-21)
6. [Utilisation rapide](#utilisation-rapide)
7. [Structure du projet](#structure-du-projet)
8. [API REST](#api-rest-principaux-points-dentrée)
9. [Dépannage](#dépannage)

---

## Fonctionnalités

- **Profil entreprise** (émettrice des documents) : nom, logo, description, site web,
  lien vers les conditions générales, liens utiles, adresse, téléphone, email.
  Ces informations alimentent l'en-tête et le pied de page de tous les documents.
- **Projets** : nom du projet, nom + logo du client, description, référence, statut,
  avec des **contacts client** et **contacts internes** (nom, fonction, email, téléphone).
- **Documents** générés à partir de **modèles conçus en glisser-déposer** :
  - un **éditeur visuel par blocs** avec palette d'éléments que l'on **glisse**
    sur le document : image, logo (taille + position réglables), **titres 1 à 5**,
    liste à puces, liste numérotée, texte, **zone de texte enrichi (HTML)**,
    tableau, bloc de code et lien URL ;
  - dans les textes, les **variables** s'insèrent avec la syntaxe
    `{{client_name}}`, `{{project_name}}`, `{{today}}`, etc. ;
  - formats produits : **PDF**, **Excel** et **Word**.
- **Fidélité au modèle & PDF identique au Word** (`Modèle.docx`) : les documents
  **Word** sont générés à partir du modèle fourni (styles, polices
  Montserrat/Roboto, couleurs, logo, en-têtes/pieds, marges). Les **PDF** sont
  produits en **convertissant ce même document Word en PDF avec Microsoft Word**
  (bibliothèque `docx2pdf`, qui pilote Word) : le PDF est donc **exactement**
  celui exporté par Word — même charte, mêmes polices, même mise en page (page
  de garde, page de suivi, sommaire, contenu, tableaux).
  > **Prérequis PDF : Microsoft Word installé** sur le serveur (Windows ou macOS)
  > et `pip install docx2pdf` (plus `pywin32` sous Windows).
  > En l'absence de Word (ex. serveur Linux de développement), un repli interne
  > (reportlab) est utilisé automatiquement, avec un rendu approché.
- **Classeurs Excel personnalisables** : un modèle Excel peut contenir
  **plusieurs onglets** de trois types :
  - **Table** : colonnes **typées** (texte, entier, nombre à virgule, monnaie,
    pourcentage, date) avec **regroupements d'en-têtes** sur deux lignes
    (ex. ligne 1 « Entreprise » fusionnée au-dessus de ligne 2 « Nom / Adresse /
    Localité », puis les données) ; ligne de totaux et ajout de lignes/colonnes
    au remplissage en option ;
  - **Tableau croisé** : croisement calculé automatiquement à partir d'un onglet
    Table (champ en lignes × champ en colonnes, agrégation somme / nombre /
    moyenne / min / max, avec totaux) ;
  - **Informations fixes** : cellules typées (date, texte, monnaie, nombre
    entier / à virgule, pourcentage), variables `{{…}}` acceptées.
  - **Formules** : par colonne (ex. `={qte}*{pu}`), sur cellules libres, et
    ligne de totaux automatique.
  - **Mises en forme conditionnelles** : coloration selon la valeur
    (condition, échelle de couleurs, barres de données).
  - **Validations** : listes déroulantes et plages (entier / décimal / date).
- **Interface Angular Material 21** : thème **100 % personnalisé** avec **mode
  sombre / clair**, **menu latéral repliable**, barre d'outils, et
  **couleur d'entreprise / utilisateur** appliquée dynamiquement au thème.
- **Vues détail en onglets** (ex. fiche projet : Vue d'ensemble, Équipe & accès,
  Documents & formulaires, Liens & réunions, Journal).
- **Aperçu dans le navigateur** (modèles et documents) : prévisualisation PDF
  intégrée à l'application, sans téléchargement préalable.
- **Modèles « page libre » A3 / A4** : un modèle peut être une page entière à
  **positionnement libre** (textes, images, logo, formes, filets) au format
  **A3 ou A4**, portrait ou paysage — idéal pour affiches et synthèses. Rendu
  identique en Word et PDF.
- **Rendu des mises en page portable** : cartes de garde/suivi, page libre et
  diagrammes sont dessinés en interne (Pillow), sans dépendance système.
- **PowerPoint fidèle au thème** : le rendu suit le **thème et les dispositions**
  (Titre / Contenu) d'un modèle PowerPoint de référence ; la personnalisation se
  limite au **logo** de la page de titre et à la **couleur principale**.
- **Diagrammes SmartArt** rendus en natif (Pillow) — s'affichent dans les Word et
  PDF sur tous les environnements (aucune dépendance système).
- **Projets avancés** : plusieurs **clients** par projet, **arborescence**
  (projets / sous-projets), **statut**, **champs personnalisés** typés,
  **liens utiles** (SharePoint, instances, stacks…), **réunions** (avec documents
  liés) et **journal** de projet (commentaires catégorisés + niveau de
  confidentialité). Équipe projet composée de membres d'une ou plusieurs équipes
  avec des rôles propres au projet.
- **Personnalisation par utilisateur** : chaque utilisateur choisit sa
  **couleur d'accent** (menu Préférences) ; l'interface s'adapte en direct.
- **Adhésions projet** : rattachement d'**utilisateurs** à un projet avec des
  **rôles**, gérés depuis la fiche projet ; base des permissions (certaines
  actions, comme la suppression, réservées aux rôles admin/manager).
- **Authentification (OIDC / PKCE + JWT)** : connexion via un fournisseur
  d'identité (ex. Entra ID) avec **flux Authorization Code + PKCE**. Le jeton
  porte le **nom, prénom, email et rôles** ; un `AppUser` est créé/mis à jour à
  la volée. **Rôle applicatif** (base des permissions) et **rôles par projet**
  via des adhésions (`ProjectMembership`). Un **mode développement** (jetons
  locaux, sans IdP) permet de tester immédiatement. Configuration par variables
  d'environnement (voir `.env.example`) ; endpoints : `/api/auth/config`,
  `/api/auth/me`, `/api/auth/dev-token` (dev), `/api/auth/memberships`.
- **Diagrammes (type SmartArt)** : blocs de diagramme inspirés des SmartArt de
  Word — **processus** (flèches), **liste**, **cycle**, **hiérarchie**,
  **pyramide** — rendus par un moteur unique et insérés comme image ; ils
  apparaissent **à l'identique en Word et en PDF**, aux couleurs du modèle.
- **Aperçu avant génération** : bouton « Aperçu » qui produit le document (sans
  créer de version) et l'ouvre, pour vérifier le rendu avant de générer.
- **Design** : interface modernisée (barre latérale en dégradé, boutons et
  cartes retravaillés, tableaux et champs affinés).
- **Styles en cascade** : une charte typographique (titres, sous-titres, titres
  1–5, paragraphe) est héritée **Entreprise → Projet → Modèle**. Chaque niveau
  peut surcharger un élément (police, taille, couleur, gras/italique, alignement)
  ou le laisser hérité ; un modèle peut donc réutiliser la charte, la surcharger
  par élément, ou définir des styles **100 % personnalisés**. Édition dans
  « Mon entreprise » (global), le formulaire projet, et l'éditeur de modèles.
- **Portée des modèles** : un modèle peut être **ouvert à tous les projets** ou
  **spécifique** à certains projets (filtrage à la sélection du modèle).
- **Mise en page libre des pages de garde / suivi** : un éditeur visuel permet
  de **positionner librement** les éléments (titres, textes avec **variables**,
  **images redimensionnables**, logo, formes, filets) directement sur la page.
  Ces pages sont rendues à partir d'une **spec unique**, ce qui rend le **PDF
  identique au Word** (mêmes polices, mêmes positions, même thème).
- **Couleur principale des tableaux** paramétrable par modèle, appliquée aux
  en-têtes de tableaux en **Word, PDF et Excel**.
- **Dupliquer** un modèle ou un document en un clic.
- **Versions** : chaque génération est archivée ; on peut **enregistrer un
  brouillon** (sans générer), **télécharger** une version et **restaurer** une
  version antérieure (une nouvelle version est alors créée).
- **Dates** : début / fin de projet, date du document (variable `{{doc_date}}`),
  date limite de réponse d'un formulaire.
- **Clients** : fiche client dédiée (coordonnées, notes) rattachable à plusieurs
  projets (menu « Clients »).
- **Équipes** : gestion des équipes internes et de leurs membres (menu
  « Équipes »), et **affectation d'une équipe de développement par projet**
  (membre + rôle sur le projet), visible sur la fiche projet.
- **Saisie assistée** : formulaire clair et tableaux **type tableur**
  (ajout/suppression de lignes et de colonnes). Aucune manipulation de JSON.
- **Niveau de confidentialité** par document (public / interne / confidentiel /
  strictement confidentiel), avec badge et filigrane dans le PDF.
- **Historique des versions** : à chaque (re)génération, une nouvelle version est
  archivée avec son **fichier**, un **commentaire**, les **initiales et le nom de l'auteur**,
  et un instantané des données.
- **Formulaires en ligne** avec **lien réduit** (`/s/<code>`), page publique de
  remplissage, collecte et consultation des réponses.

---

## Architecture

```
Navigateur ──HTTP──> Angular 21 (port 4200) ──REST/JSON──> Django + DRF (port 8000)
                                                              │
                                                              ├── SQLite (base de données)
                                                              ├── Générateurs PDF / Excel / Word
                                                              └── /media (fichiers générés)
```

---

## Prérequis

| Outil    | Version recommandée |
|----------|---------------------|
| Python   | 3.11 ou supérieur   |
| Node.js  | **24 ou supérieur** (requis par Angular 21) |
| npm      | 10 ou supérieur     |

> ℹ️ Angular 21 exige Node.js 24+. Avec une version antérieure, `npm install` affichera
> un avertissement `EBADENGINE` ; privilégiez Node 24 pour `ng serve` / `ng build`.

---

## 1. Lancement du backend (Django)

```bash
cd backend

# a) Environnement virtuel
python -m venv .venv
source .venv/bin/activate         # Windows : .venv\Scripts\activate

# b) Dépendances
pip install -r requirements.txt

# c) Configuration
cp .env.example .env              # Windows : copy .env.example .env
# (ouvrez .env pour ajuster SECRET_KEY, les URLs, etc.)

# d) Base de données
python manage.py migrate

# e) Données initiales : modèles système + profil entreprise
python manage.py seed_data
#    ...ou avec un jeu de démonstration (projet + documents + formulaire) :
python manage.py seed_data --demo

# f) (facultatif) Compte administrateur pour /admin
python manage.py createsuperuser

# g) Démarrage
python manage.py runserver
```

Le backend écoute sur **http://localhost:8000**.

- API : `http://localhost:8000/api/`
- Admin Django : `http://localhost:8000/admin/`

## 2. Lancement du frontend (Angular 21)

Dans un **second terminal** :

```bash
cd frontend

# a) Dépendances
npm install

# b) Démarrage du serveur de développement
npm start
#   (équivaut à : npx ng serve)
```

L'interface est disponible sur **http://localhost:4200**.

Le fichier `src/environments/environment.development.ts` pointe déjà vers
`http://localhost:8000/api`. En production, adaptez `src/environments/environment.ts`.

### Build de production

```bash
cd frontend
npm run build          # génère dist/docugen-frontend/
```

Servez ensuite le contenu de `dist/docugen-frontend/browser/` derrière un serveur
web (Nginx, Apache…) ou via Django (en configurant les fichiers statiques).

---

## Utilisation rapide

1. **Configurez votre entreprise** : menu « Mon entreprise » → renseignez le nom,
   le logo, les coordonnées et les liens. Ces données apparaîtront sur les documents.
2. **Créez un projet** : menu « Projets » → « Nouveau projet ». Ajoutez les contacts
   client et internes.
3. **Concevez un modèle (glisser-déposer)** : menu « Modèles » → « Nouveau
   modèle ». Faites **glisser les éléments** de la palette (image, logo, titres
   1–5, listes, texte, texte enrichi, tableau, code, lien) sur le document,
   réorganisez-les, réglez la page de garde / suivi / sommaire, puis enregistrez.
   Des modèles prêts à l'emploi, conformes à `Modèle.docx`, sont déjà fournis.
4. **Créez un document** : menu « Documents » → « Nouveau document ». Choisissez
   le projet et un modèle, définissez le niveau de confidentialité, puis
   **remplissez le formulaire** : champs simples et **tableaux façon tableur**
   (boutons « + Ligne » / « + Colonne »). Un aperçu des textes avec variables
   s'affiche en direct. Enregistrez.
5. **Générez** : renseignez vos initiales et un commentaire, puis cliquez sur
   **Générer**. Le fichier est produit et ajouté à l'historique. Toute
   modification suivie d'une **régénération** crée une nouvelle version.
6. **Téléchargez** n'importe quelle version depuis l'historique.
7. **Formulaires** : menu « Formulaires » → construisez vos champs, enregistrez,
   puis partagez le **lien réduit**. Les réponses sont consultables dans la fiche.

Un guide illustré est fourni dans **`Documentation_DocuGen.pdf`** (à la racine du projet).

---

## Structure du projet

```
docugen/
├── README.md
├── Documentation_DocuGen.pdf        # Documentation d'utilisation (PDF)
├── backend/                         # API Django
│   ├── manage.py
│   ├── requirements.txt
│   ├── .env.example
│   ├── config/                      # settings, urls, wsgi/asgi
│   ├── company/                     # profil entreprise (singleton)
│   ├── projects/                    # projets + contacts
│   ├── documents/                   # modèles, documents, versions
│   │   ├── generators/              # pdf_gen, excel_gen, word_gen, registry
│   │   ├── services.py              # génération + versioning
│   │   └── management/commands/seed_data.py
│   └── onlineforms/                 # formulaires + liens réduits
└── frontend/                        # interface Angular 21
    ├── angular.json, package.json, tsconfig*.json
    └── src/
        ├── environments/
        └── app/
            ├── core/                # models + services API
            └── features/            # dashboard, company, projects,
                                     #  documents, forms
```

---

## API REST (principaux points d'entrée)

| Méthode | URL | Description |
|--------|-----|-------------|
| GET/PUT/PATCH | `/api/company/` | Profil entreprise (singleton) |
| CRUD | `/api/projects/` | Projets |
| CRUD | `/api/projects/contacts/` | Contacts |
| CRUD | `/api/documents/` | Documents |
| POST | `/api/documents/{id}/generate/` | Générer une nouvelle version |
| CRUD | `/api/documents/templates/` | Modèles de documents |
| GET | `/api/documents/versions/{id}/download/` | Télécharger un fichier |
| GET | `/api/documents/choices/` | Listes (confidentialité, types) |
| CRUD | `/api/forms/forms/` | Formulaires en ligne |
| GET | `/api/forms/public/{code}/` | Définition publique d'un formulaire |
| POST | `/api/forms/public/{code}/submit/` | Soumission d'une réponse |
| GET | `/s/{code}` | Résolution / redirection d'un lien réduit |

---

## Dépannage

- **Erreur CORS dans le navigateur** : vérifiez `CORS_ALLOWED_ORIGINS` dans `backend/.env`
  (par défaut `http://localhost:4200`).
- **`EBADENGINE` à `npm install`** : votre Node.js est antérieur à la v24. L'installation
  fonctionne mais Angular 21 recommande Node 24+.
- **Images/logos non affichés** : en développement, Django sert `/media` uniquement si
  `DEBUG=True`.
- **Réinitialiser la base** : supprimez `backend/db.sqlite3` puis relancez
  `python manage.py migrate` et `python manage.py seed_data`.
- **Les modèles système ont disparu** : relancez `python manage.py seed_data`
  (idempotent, il recrée/actualise les modèles PDF, Excel et Word).

