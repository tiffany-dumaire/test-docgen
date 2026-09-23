from django.core.management.base import BaseCommand

from core.models import CompanyProfile, UsefulLink
from projects.models import Contact, Project
from documents.models import DocumentTemplate, DocType, Document, Confidentiality
from documents.services import regenerate_document
from forms_app.models import OnlineForm


class Command(BaseCommand):
    help = "Crée un jeu de données de démonstration."

    def handle(self, *args, **options):
        # --- Entreprise ---
        company = CompanyProfile.get_solo()
        company.name = "Acme Consulting"
        company.description = "Cabinet de conseil en transformation digitale."
        company.website = "https://www.acme-consulting.example"
        company.terms_url = "https://www.acme-consulting.example/cgv"
        company.address = "12 rue de l'Innovation\n34000 Montpellier\nFrance"
        company.phone = "+33 4 67 00 00 00"
        company.email = "contact@acme-consulting.example"
        company.save()
        company.useful_links.all().delete()
        UsefulLink.objects.create(company=company, label="Portail client", url="https://portail.acme.example", order=0)
        UsefulLink.objects.create(company=company, label="Politique de confidentialité", url="https://acme.example/privacy", order=1)

        # --- Contacts ---
        client_contact, _ = Contact.objects.get_or_create(
            first_name="Marie", last_name="Dupont", contact_type=Contact.CLIENT,
            defaults={"role": "Directrice de projet", "email": "m.dupont@client.example", "phone": "+33 6 12 34 56 78"},
        )
        internal_contact, _ = Contact.objects.get_or_create(
            first_name="Julien", last_name="Bernard", contact_type=Contact.INTERNAL,
            defaults={"role": "Consultant senior", "email": "j.bernard@acme.example", "phone": "+33 6 98 76 54 32"},
        )

        # --- Projet ---
        project, _ = Project.objects.get_or_create(
            name="Refonte du SI RH", client_name="Global Industries",
            defaults={
                "description": "Projet de refonte du système d'information des ressources humaines.",
                "client_contact": client_contact, "internal_contact": internal_contact,
            },
        )

        # --- Modèles de documents ---
        DocumentTemplate.objects.get_or_create(
            name="Suivi de projet standard", doc_type=DocType.PDF_TRACKING,
            defaults={
                "description": "Modèle de suivi hebdomadaire.",
                "variables_schema": [
                    {"key": "avancement", "label": "Avancement (%)", "type": "number"},
                    {"key": "points_cles", "label": "Points clés", "type": "list"},
                    {"key": "planning", "label": "Planning", "type": "table"},
                ],
            },
        )
        DocumentTemplate.objects.get_or_create(
            name="Analyse des risques", doc_type=DocType.WORD_ANALYSIS,
            defaults={
                "description": "Document d'analyse des risques.",
                "variables_schema": [
                    {"key": "synthese", "label": "Synthèse", "type": "text"},
                    {"key": "risques", "label": "Risques identifiés", "type": "table"},
                ],
            },
        )

        # --- Document exemple généré ---
        if not Document.objects.filter(title="Suivi hebdomadaire S12").exists():
            doc = Document.objects.create(
                project=project, title="Suivi hebdomadaire S12",
                doc_type=DocType.PDF_TRACKING, confidentiality=Confidentiality.CONFIDENTIAL,
                data={
                    "avancement": 65,
                    "points_cles": ["Cadrage validé", "Recette en cours", "Formation planifiée"],
                    "planning": [
                        {"Tâche": "Cadrage", "Responsable": "JB", "Échéance": "01/03", "Statut": "Terminé"},
                        {"Tâche": "Développement", "Responsable": "Équipe", "Échéance": "15/04", "Statut": "En cours"},
                        {"Tâche": "Recette", "Responsable": "MD", "Échéance": "30/04", "Statut": "À venir"},
                    ],
                },
            )
            regenerate_document(doc, author_initials="JB", comment="Création du suivi S12")

        # --- Formulaire exemple ---
        if not OnlineForm.objects.filter(title="Satisfaction client").exists():
            OnlineForm.objects.create(
                project=project, title="Satisfaction client",
                description="Merci de nous donner votre avis sur l'avancement du projet.",
                confidentiality=Confidentiality.INTERNAL,
                fields_schema=[
                    {"key": "nom", "label": "Votre nom", "type": "text", "required": True},
                    {"key": "email", "label": "E-mail", "type": "email", "required": False},
                    {"key": "satisfaction", "label": "Satisfaction globale", "type": "select",
                     "required": True, "options": ["Très satisfait", "Satisfait", "Peu satisfait"]},
                    {"key": "commentaire", "label": "Commentaire libre", "type": "textarea", "required": False},
                ],
            )

        self.stdout.write(self.style.SUCCESS("Données de démonstration créées ✓"))
        self.stdout.write("Formulaire de démo : /f/<code>/ (voir l'admin ou la page Formulaires)")
