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
- **Refonte Angular Material 21** : thème M3 entièrement personnalisé
  (mode sombre / clair, couleur d'entreprise appliquée au thème), menu latéral
  repliable, barre d'outils, police d'icônes auto-hébergée (hors-ligne).
- **Modèles Markdown (.md)** : nouveau format de document, généré depuis le
  schéma par blocs ; aperçu HTML rendu directement dans l'application.
- **Réunions dans un calendrier** : la fiche projet (et le détail client)
  affichent les réunions dans un **calendrier mensuel** navigable. Les sections
  **Liens utiles** et **Réunions** sont désormais dans des onglets séparés.
- **Détail client** (nouvelle vue en onglets) : Informations · Projets (détail
  par sous-onglet) · Contacts (tous projets) · **Réunions** (calendrier tous
  projets confondus, filtrable par projet et par plage de dates).
- **Listes en `mat-table`** (projets, documents, clients) : tri par colonne,
  pagination, recherche Material et actions en icônes. Formulaires en
  `mat-form-field` (ex. fiche client).
- **Vues détail en onglets** : fiche projet, éditeur de document, éditeur de
  modèle et écran entreprise.
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
| GET | `/api/forms/forms/{id}/diagrams_data/` | Données calculées des diagrammes |
| GET | `/api/forms/forms/{id}/diagram/?id=&fmt=png\|svg` | Export d'un diagramme (PNG / SVG) |
| CRUD | `/api/forms/form-templates/` | Modèles de formulaire (questions + diagrammes) |
| POST | `/api/forms/form-templates/{id}/instantiate/` | Générer un formulaire depuis un modèle |
| GET | `/api/forms/public/{code}/` | Définition publique d'un formulaire |
| POST | `/api/forms/public/{code}/submit/` | Soumission d'une réponse |
| GET | `/s/{code}` | Résolution / redirection d'un lien réduit |

---

## Thèmes « Trois vents » (commutables)

L'application propose trois thèmes complets, chacun avec sa palette, sa
typographie et sa forme, déclinés en clair / sombre :

- **Bise · Givre** (défaut) — bleu glacier, *Bricolage Grotesque* / *Figtree*, coins arrondis.
- **Bise Noire · Acier** — bleu acier, *Red Hat Display* / *Red Hat Text*, coins nets.
- **Joran · Nuit polaire** — indigo, *Young Serif* / *Onest*, coins généreux.

Le changement se fait depuis la barre supérieure (icône palette) : choix de
l'ambiance + luminosité **Clair / Sombre / Auto** (suit le système). La
préférence est mémorisée (localStorage). Techniquement, tout repose sur les
jetons `--mat-sys-*` (identiques à Angular Material 21) + des extensions
`--pd-*` (polices, rayons, densité), pilotés par les attributs `data-p`
(proposition) et `data-theme` (clair/sombre) sur `<html>` — voir
`core/services/theme.service.ts`. Les polices sont auto-hébergées via
`@fontsource` (aucune dépendance à Google Fonts). La couleur d'entreprise reste
une surcharge possible du primaire, quel que soit le thème.

---

## Outils d'analyse A3 · Export SVG · Multi-langue

**8 outils d'analyse au format Template A3** (planches à positionnement libre,
facilement modifiables), avec en-tête commun **logo · nom de l'outil · date ·
projet** : Business Model Canvas, Value Proposition Canvas, Empathy Map, Persona,
Customer Journey Map (paysage), Problem Statement (portrait, plusieurs par page),
PESTEL (paysage) et Onion Diagram. Générés par `python manage.py seed_a3_tools`
(également appelé par `seed_data --demo`).

**Export PDF / PNG / SVG** pour les Template A3 : boutons d'export direct sur
chaque modèle A3, et choix du format par défaut (PDF toutes pages / PNG / SVG
vectoriel) dans l'éditeur. Nouvel élément **ellipse** dans l'éditeur de mise en
page (cercles, diagrammes en oignon, cartes d'empathie…).

**Modèles multi-langues (FR / EN / DE / IT).** Les modèles de documents et de
formulaires portent une **langue** (sélecteur à la création), affichée en badge
et **filtrable** dans la liste des modèles — on enregistre ainsi le même outil
dans plusieurs langues et on le sélectionne par langue.

---

## Aperçu in-app · Suivi de projet · Nouveaux types · Rapports de formulaire

**Aperçu fiable, sans téléchargement.** L'aperçu des modèles et documents est
désormais rendu **inline** dans l'application (HTML/PNG/PDF en base64, affiché via
`srcdoc`/data-URI). Plus de dépendance à Word/LibreOffice ni de requête vers un
hôte média : fini les erreurs « localhost n'autorise pas la connexion » et
« aperçu PDF non disponible ».

**Diagrammes de suivi de projet** (onglet *Suivi de projet* pour saisir les
données, onglet *Documents de suivi* pour les diagrammes exportables en SVG) :
Gantt, planning prévu/réalisé, courbe d'avancement, tableau de bord, diagramme de
charge, roadmap, dépendances, burndown, burnup, suivi des risques, suivi des
jalons. Rendu SVG portable, sans dépendance système.

**Nouveaux types de modèles** : Brochure, Lettre, Mail (en plus de Word, PDF,
Excel, Template A3, Markdown, PowerPoint), plus un **modèle de CV au format
suisse** (Word) prêt à l'emploi (état civil, permis, expérience, formation,
langues).

**Rapport statistiques lié à un formulaire.** Un modèle de formulaire peut être
lié à un **modèle de document Word ou PDF**. Le bloc « Diagramme de formulaire »
(clés `d1`, `d2`…) insère les diagrammes des questions comme **variables** dans le
document. Depuis un formulaire : *Générer le rapport* produit le document rempli.

**Mon entreprise** : en-tête avec logo (modifiable) et nom ; onglets *Général*
(description + organigramme), *Informations de contact*, *Liens utiles* (par
catégories : Conditions générales, Site web, Support, Autre + personnalisée),
*Collaborateurs*, *Équipes*, *Styles par type*. Les liens de projet reprennent ces
catégories en ajoutant Sharepoint, Gitlab, Teamwork.

> Placement dynamique : les pages à positionnement libre (A3 multi-pages,
> pages de garde/suivi Word/PDF) permettent déjà de placer librement les
> éléments ; l'extension à des pages PDF arbitraires et à chaque diapositive
> PowerPoint est prévue comme évolution.

---

## Thème hivernal · Organisation (entreprise, équipes, collaborateurs) · Suivi général

**Thème hivernal.** L'interface adopte une charte « hiver » colorée et originale :
dégradés aurore (turquoise → bleu → violet → rose), fonds givrés, navigation
minuit et accents glacier. Le mode sombre et la couleur d'entreprise restent
personnalisables.

**Styles par défaut, par type de modèle.** Dans *Mon entreprise → Styles par type*,
chaque type de document (Word, PDF, Excel, Template A3, Markdown, PowerPoint)
possède ses propres styles par défaut, en plus d'une « base commune ». L'héritage
devient : **Base commune → Type → Projet → Modèle**.

**Mon entreprise réorganisée en onglets :**
- *Informations* : description de l'entreprise **+ organigramme** reconstruit
  automatiquement à partir des équipes et de leurs liens hiérarchiques.
- *Collaborateurs* : l'ensemble des collaborateurs de l'entreprise.
- *Équipes* : créez autant d'équipes que voulu, avec couleur et **équipe parente**
  (sous-équipes). La page « Équipes » est désormais un onglet de *Mon entreprise*.

**Collaborateurs ↔ équipes (plusieurs équipes).** Un collaborateur appartient à
l'entreprise et peut être associé à **une ou plusieurs équipes**. La sélection se
fait depuis le détail d'une équipe (*Mon entreprise → Équipes → Gérer*).

**Détail d'une équipe** (`/teams/:id`) : onglets *Vue d'ensemble*, *Collaborateurs*,
**Projets** (projets gérés par l'équipe) et *Hiérarchie & liens* (sous-équipes et
liens transverses entre équipes).

**Suivi général** (`/suivi`) : tous les documents générés et formulaires de
**l'ensemble des projets** regroupés dans un même écran (deux onglets), avec
recherche et colonnes projet — pour un suivi transversal.

---

## Configuration des modèles par type · Modèles de formulaire · Diagrammes

**Configuration séparée par onglet selon le type.** La page *Modèles* regroupe désormais
les modèles par type dans des onglets distincts : **Word, PDF, Excel, Template A3
(PNG / PDF), Markdown, PowerPoint** et **Formulaires**. À la création / modification, la
configuration proposée s'adapte au type choisi :

- **Word** : contenu par blocs + structure (garde/suivi, mise en page libre, styles).
- **PDF** : identique à Word (le PDF est le Word exporté) ; option *PDF depuis Word*.
- **Excel** : constructeur de classeur (onglets, colonnes typées, croisés, règles).
- **Template A3 (PNG / PDF)** : pages A3/A4 à positionnement libre, multi-pages, avec
  choix du format d'export **PNG** (1ʳᵉ page) ou **PDF** (toutes les pages).
- **Markdown** : contenu par blocs, export `.md`.
- **PowerPoint** : contenu par blocs (un titre = une diapo) + thème (couleur, logo).

**Modèles de formulaire.** Un *modèle de formulaire* (`FormTemplate`) regroupe des
questions réutilisables et des diagrammes. On génère un formulaire en ligne à partir d'un
modèle depuis la page *Modèles → Formulaires* **ou directement depuis un projet** (onglet
*Documents & formulaires → Formulaires liés → Générer depuis un modèle*).

**Diagrammes de formulaire (PNG / SVG).** Chaque modèle/formulaire peut définir des
diagrammes **calculés à partir des réponses** et exportables en **PNG** ou **SVG** :

- *Répartition* : comptage des réponses à une question (barres, camembert, anneau…).
- *Croisement* : regroupement par une question + agrégation (`count` / `sum` / `avg`)
  d'une question numérique.

Types de graphiques : barres verticales/horizontales, camembert, anneau, courbe. Le rendu
est portable (Pillow pour le PNG, SVG généré à la main), sans dépendance système.

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

