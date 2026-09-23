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
- **Fidélité au modèle** (`Modèle.docx`) : les documents **Word** sont générés
  à partir du modèle fourni (styles, polices Montserrat/Roboto, couleurs,
  en-têtes/pieds, marges) ; les **PDF** reproduisent la même charte (polices
  embarquées) et la même **structure** : page de garde (titre / sous-titre),
  **page de suivi** (identification + révisions), **table des matières générée
  automatiquement**, puis le contenu.
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

