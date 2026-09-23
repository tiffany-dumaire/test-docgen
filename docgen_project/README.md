# DocGen — Plateforme de génération de documents

DocGen est une application **Django** avec une interface **Vuetify** permettant de
générer et de personnaliser des documents (PDF de suivi de projet, fichiers Excel,
documents Word d'analyse) ainsi que des **formulaires en ligne** partageables via un
**lien réduit** et un **QR code**, à partir des données d'un projet et de variables
personnalisées.

## Fonctionnalités

- **Projets** : logo, client, description, contact client et contact interne.
- **Profil entreprise** : nom, logo, description, coordonnées, site web, lien vers les
  conditions générales et autres liens utiles (utilisés dans les en-têtes/pieds de page
  des documents et des formulaires).
- **Génération de documents** en trois formats :
  - **PDF** de suivi de projet (reportlab) ;
  - **Excel** générique (openpyxl) ;
  - **Word** d'analyse (python-docx).
- **Éditeur de variables** dynamique : texte, nombre, liste à puces, tableau.
- **Niveau de confidentialité** par document (Public / Interne / Confidentiel / Secret),
  affiché en bandeau dans les documents.
- **Historique des versions** : chaque régénération crée une nouvelle version horodatée
  avec le **commentaire** et les **initiales** de son auteur, et conserve le fichier.
- **Formulaires en ligne** : constructeur de champs (texte, e-mail, nombre, date, liste,
  case à cocher…), **lien réduit** public `/f/<code>/`, **QR code**, et consultation des
  réponses.
- **Modèles de documents** pour pré-remplir les variables.
- Interface d'**administration** Django complète.

## Prérequis

- **Python 3.10+** (testé avec 3.12)
- Une **connexion internet** au premier chargement des pages : Vue 3, Vuetify 3 et les
  icônes Material Design sont chargés depuis un CDN (jsdelivr). Voir la section
  « Fonctionnement hors-ligne » pour héberger ces fichiers localement.

## Installation

```bash
# 1. Se placer dans le dossier du projet
cd docgen_project

# 2. Créer et activer un environnement virtuel
python -m venv venv
source venv/bin/activate        # Windows : venv\Scripts\activate

# 3. Installer les dépendances
pip install -r requirements.txt

# 4. Appliquer les migrations (crée la base SQLite)
python manage.py migrate

# 5. (Optionnel mais recommandé) Charger des données de démonstration
python manage.py seed_demo

# 6. Créer un compte administrateur
python manage.py createsuperuser

# 7. Lancer le serveur de développement
python manage.py runserver
```

L'application est alors accessible sur **http://127.0.0.1:8000/**.

> Si vous avez utilisé `seed_demo`, un compte de démonstration peut être créé via
> `createsuperuser` (par ex. `admin` / mot de passe de votre choix). Les données de
> démonstration comprennent une entreprise, un projet, des contacts, deux modèles, un
> document PDF d'exemple et un formulaire de satisfaction.

## Utilisation rapide

1. **Entreprise** : renseignez le profil de votre entreprise (logo, coordonnées, liens).
2. **Projets** : créez un projet (client, description) et ses contacts.
3. **Documents** : dans l'atelier, choisissez un projet, un type de document, ajoutez des
   variables, indiquez vos initiales et un commentaire, puis générez. Le fichier est
   téléchargé automatiquement.
4. **Versions** : depuis la page d'un document, cliquez sur « Modifier & régénérer » pour
   produire une nouvelle version (initiales + commentaire obligatoires).
5. **Formulaires** : construisez un formulaire, partagez le lien réduit ou le QR code, et
   consultez les réponses.

Consultez le guide détaillé : **`documentation_utilisation.pdf`**.

## Structure du projet

```
docgen_project/
├── config/            # Configuration Django (settings, urls)
├── core/              # Profil entreprise, tableau de bord, commande seed_demo
├── projects/          # Projets et contacts
├── documents/         # Documents, modèles, versions, générateurs (PDF/Excel/Word)
├── forms_app/         # Formulaires en ligne, liens réduits, QR codes
├── templates/         # Templates Django + interface Vuetify
├── requirements.txt
└── manage.py
```

## Fonctionnement hors-ligne (optionnel)

Les bibliothèques front-end sont chargées via CDN dans `templates/base.html`. Pour un
fonctionnement 100 % hors-ligne, téléchargez les fichiers de Vue 3, Vuetify 3 et des
icônes MDI, placez-les dans le dossier `static/`, puis remplacez les balises
`<script>`/`<link>` du CDN par les chemins `{% static %}` correspondants.

## Notes techniques

- Base de données : **SQLite** par défaut (aucune configuration nécessaire).
- L'interface utilise Vue 3 + Vuetify 3 en mode « CDN » (pas d'étape de build npm).
  Les délimiteurs Vue sont configurés en `[[ ]]` pour éviter tout conflit avec la
  syntaxe `{{ }}` des templates Django.
- Les fichiers générés et téléversés sont stockés dans `media/`.
- `DEBUG = True` par défaut : pensez à le désactiver et à configurer `ALLOWED_HOSTS`,
  `SECRET_KEY` et un serveur de fichiers statiques/médias avant toute mise en production.
