from django.core.management.base import BaseCommand

from core.models import Company, Contact, Project
from documents.models import Document, DocumentTemplate
from onlineforms.models import OnlineForm


class Command(BaseCommand):
    help = "Crée un jeu de données de démonstration (idempotent)."

    def handle(self, *args, **options):
        company = Company.get_solo()
        if company.name in ("", "Ma société"):
            company.name = "Atelier Documentaire"
            company.description = "Génération de documents pour vos projets."
            company.website_url = "https://exemple.fr"
            company.terms_url = "https://exemple.fr/cgv"
            company.other_links = [
                {"label": "Confidentialité", "url": "https://exemple.fr/rgpd"},
            ]
            company.address = "10 rue des Modèles\n34000 Montpellier"
            company.phone = "+33 4 00 00 00 00"
            company.email = "contact@exemple.fr"
            company.save()

        client_contact, _ = Contact.objects.get_or_create(
            kind=Contact.KIND_CLIENT, first_name="Marie", last_name="Durand",
            defaults={"role": "Directrice", "email": "marie@client.fr"})
        internal_contact, _ = Contact.objects.get_or_create(
            kind=Contact.KIND_INTERNAL, first_name="Paul", last_name="Martin",
            defaults={"role": "Chef de projet", "email": "paul@exemple.fr"})

        project, _ = Project.objects.get_or_create(
            name="Refonte site web", client_name="Client Démo SARL",
            defaults={
                "description": "Projet de démonstration.",
                "client_contact": client_contact,
                "internal_contact": internal_contact,
            })

        # --- PDF template with positioned fields ---
        pdf_tpl, created = DocumentTemplate.objects.get_or_create(
            name="Devis positionné", kind=DocumentTemplate.KIND_PDF,
            defaults={"description": "Exemple de PDF avec champs positionnés."})
        if created:
            pdf_tpl.config = {
                "page_width": 595, "page_height": 842,
                "fields": [
                    {"type": "image", "x": 40, "y": 40, "w": 120, "h": 50,
                     "source": "company_logo"},
                    {"type": "text", "x": 40, "y": 130, "size": 22,
                     "value": "DEVIS"},
                    {"type": "variable", "x": 40, "y": 170, "size": 12,
                     "variable": "client.name"},
                    {"type": "variable", "x": 40, "y": 190, "size": 11,
                     "variable": "project.name"},
                    {"type": "text", "x": 40, "y": 240, "size": 11,
                     "value": "Montant total :"},
                    {"type": "variable", "x": 160, "y": 240, "size": 11,
                     "variable": "total"},
                    {"type": "text", "x": 40, "y": 320, "size": 10,
                     "value": "Bon pour accord :"},
                    {"type": "form_field", "x": 160, "y": 316, "w": 220, "h": 18,
                     "name": "signature"},
                    {"type": "checkbox", "x": 40, "y": 360, "name": "accept"},
                    {"type": "text", "x": 62, "y": 360, "size": 10,
                     "value": "J'accepte les conditions générales"},
                ],
            }
            pdf_tpl.save()

        # --- Excel template with grouped columns + pivot ---
        xls_tpl, created = DocumentTemplate.objects.get_or_create(
            name="Ventes par région", kind=DocumentTemplate.KIND_EXCEL,
            defaults={"description": "Colonnes groupées + tableau croisé."})
        if created:
            xls_tpl.config = {
                "sheet_name": "Ventes",
                "columns": [
                    {"key": "region", "label": "Région", "group": "Localisation"},
                    {"key": "city", "label": "Ville", "group": "Localisation"},
                    {"key": "product", "label": "Produit", "group": "Vente"},
                    {"key": "qty", "label": "Quantité", "group": "Vente", "type": "number"},
                    {"key": "amount", "label": "Montant", "group": "Vente", "type": "number"},
                ],
                "pivot": {"rows": ["region"], "cols": "product",
                          "value": "amount", "agg": "sum"},
            }
            xls_tpl.save()

        # --- Word analysis template ---
        doc_tpl, created = DocumentTemplate.objects.get_or_create(
            name="Note d'analyse", kind=DocumentTemplate.KIND_WORD,
            defaults={"description": "Document Word d'analyse."})
        if created:
            doc_tpl.config = {
                "title": "Analyse — {{project.name}}",
                "subtitle": "Client : {{client.name}}",
                "sections": [
                    {"heading": "Contexte",
                     "body": "Cette note concerne le projet {{project.name}} "
                             "réalisé pour {{client.name}}."},
                    {"heading": "Synthèse", "body": "Montant total : {{total}}."},
                ],
                "table": {"columns": [
                    {"key": "product", "label": "Produit"},
                    {"key": "amount", "label": "Montant"},
                ]},
            }
            doc_tpl.save()

        # --- A generated document with sample data ---
        if not Document.objects.filter(title="Devis démo").exists():
            Document.objects.create(
                template=pdf_tpl, project=project, title="Devis démo",
                confidentiality="confidential",
                data={"params": {"total": "12 000 €"}})

        # --- An online form ---
        OnlineForm.objects.get_or_create(
            title="Brief client",
            defaults={
                "project": project,
                "description": "Merci de préciser votre besoin.",
                "schema": [
                    {"name": "email", "label": "E-mail", "type": "email", "required": True},
                    {"name": "budget", "label": "Budget estimé", "type": "number"},
                    {"name": "message", "label": "Votre besoin", "type": "textarea"},
                ],
            })

        self.stdout.write(self.style.SUCCESS("Données de démonstration prêtes."))
