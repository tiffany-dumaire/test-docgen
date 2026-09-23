import { Component, inject, signal, Input, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DocumentService } from '../../core/services/document.service';
import { ToastService } from '../../core/services/api.service';
import { Block, BlockType, Choice, DocumentTemplate } from '../../core/models';

@Component({
  selector: 'app-template-builder',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="row between">
      <h1>{{ isEdit() ? 'Modifier le modèle' : 'Nouveau modèle de document' }}</h1>
      <a class="btn btn-ghost" routerLink="/templates">Retour</a>
    </div>
    <p class="muted">
      Composez votre document en ajoutant des blocs : du <b>texte fixe</b>, des
      <b>champs à remplir</b>, des <b>tableaux</b> ou les <b>contacts</b> du projet.
      Dans le texte, écrivez <code>{{ '{{' }}client_name{{ '}}' }}</code> pour insérer une variable.
    </p>

    @if (model(); as m) {
      <div class="builder">
        <!-- Colonne principale : blocs -->
        <div class="stack">
          <div class="card stack">
            <div class="form-grid">
              <div class="field">
                <label>Nom du modèle *</label>
                <input [(ngModel)]="m.name" (ngModelChange)="onName($event, m)" />
              </div>
              <div class="field">
                <label>Format de sortie *</label>
                <select [(ngModel)]="m.doc_type" [disabled]="isEdit()">
                  @for (dt of docTypes(); track dt.value) { <option [value]="dt.value">{{ dt.label }}</option> }
                </select>
              </div>
            </div>
            <div class="field">
              <label>Description</label>
              <input [(ngModel)]="m.description" placeholder="À quoi sert ce modèle ?" />
            </div>
          </div>

          <div class="card">
            <h3>Contenu du document</h3>
            @for (block of blocks(); track block.id; let i = $index) {
              <div class="block">
                <div class="block-head">
                  <span class="block-type">{{ blockLabel(block.type) }}</span>
                  <span class="spacer"></span>
                  <button class="mini" (click)="move(i, -1)" [disabled]="i === 0" title="Monter">▲</button>
                  <button class="mini" (click)="move(i, 1)" [disabled]="i === blocks().length - 1" title="Descendre">▼</button>
                  <button class="mini del" (click)="removeBlock(i)" title="Supprimer">✕</button>
                </div>

                @switch (block.type) {
                  @case ('heading') {
                    <div class="row" style="gap:.5rem">
                      <select [(ngModel)]="block.level" style="width:110px">
                        <option [ngValue]="1">Titre 1</option>
                        <option [ngValue]="2">Titre 2</option>
                        <option [ngValue]="3">Titre 3</option>
                      </select>
                      <input [(ngModel)]="block.text" placeholder="Texte du titre (variables {{ '{{' }}…{{ '}}' }} autorisées)" />
                    </div>
                  }
                  @case ('paragraph') {
                    <textarea [(ngModel)]="block.text" rows="3" placeholder="Texte fixe. Variables {{ '{{' }}client_name{{ '}}' }} autorisées."></textarea>
                  }
                  @case ('field') {
                    <div class="form-grid">
                      <div class="field">
                        <label>Libellé du champ</label>
                        <input [(ngModel)]="block.label" (ngModelChange)="syncKey(block)" placeholder="ex : Budget estimé" />
                      </div>
                      <div class="field">
                        <label>Type de saisie</label>
                        <select [(ngModel)]="block.field_type">
                          <option value="text">Texte court</option>
                          <option value="textarea">Texte long</option>
                          <option value="number">Nombre</option>
                          <option value="date">Date</option>
                          <option value="select">Liste déroulante</option>
                        </select>
                      </div>
                    </div>
                    @if (block.field_type === 'select') {
                      <div class="field">
                        <label>Options (séparées par des virgules)</label>
                        <input [ngModel]="(block.options ?? []).join(', ')" (ngModelChange)="setOptions(block, $event)" />
                      </div>
                    }
                    <div class="row" style="gap:1.5rem">
                      <label class="chk"><input type="checkbox" [(ngModel)]="block.required" /> Obligatoire</label>
                      <label class="chk"><input type="checkbox" [(ngModel)]="block.show_label" /> Afficher le libellé dans le document</label>
                    </div>
                    <small class="muted">Variable : <code>{{ '{{' }}{{ block.key }}{{ '}}' }}</code></small>
                  }
                  @case ('table') {
                    <div class="field">
                      <label>Titre du tableau (facultatif)</label>
                      <input [(ngModel)]="block.label" placeholder="ex : Jalons" />
                    </div>
                    <label>Colonnes</label>
                    @for (col of block.columns ?? []; track $index) {
                      <div class="row" style="gap:.4rem; margin-bottom:.3rem">
                        <input [(ngModel)]="col.label" placeholder="Nom de la colonne" />
                        <button class="mini del" (click)="removeCol(block, $index)">✕</button>
                      </div>
                    }
                    <button class="btn btn-sm btn-ghost" (click)="addCol(block)">+ Colonne</button>
                    <label class="chk" style="margin-top:.6rem">
                      <input type="checkbox" [(ngModel)]="block.allow_edit_columns" />
                      Autoriser l'ajout / modification des colonnes lors du remplissage
                    </label>
                  }
                  @case ('contacts') {
                    <div class="form-grid">
                      <div class="field">
                        <label>Titre</label>
                        <input [(ngModel)]="block.label" placeholder="Contacts" />
                      </div>
                      <div class="field">
                        <label>Contacts à inclure</label>
                        <select [(ngModel)]="block.scope">
                          <option value="both">Client + interne</option>
                          <option value="client">Client uniquement</option>
                          <option value="internal">Interne uniquement</option>
                        </select>
                      </div>
                    </div>
                  }
                  @case ('spacer') {
                    <div class="muted">Espace vertical.</div>
                  }
                }
              </div>
            }
            @if (!blocks().length) {
              <div class="empty">Ajoutez votre premier bloc ci-dessous.</div>
            }

            <div class="add-bar">
              <span class="muted">Ajouter :</span>
              <button class="btn btn-sm btn-ghost" (click)="add('heading')">＋ Titre</button>
              <button class="btn btn-sm btn-ghost" (click)="add('paragraph')">＋ Paragraphe</button>
              <button class="btn btn-sm btn-ghost" (click)="add('field')">＋ Champ à remplir</button>
              <button class="btn btn-sm btn-ghost" (click)="add('table')">＋ Tableau</button>
              <button class="btn btn-sm btn-ghost" (click)="add('contacts')">＋ Contacts</button>
              <button class="btn btn-sm btn-ghost" (click)="add('spacer')">＋ Espace</button>
            </div>
          </div>

          <div class="row" style="gap:.5rem">
            <button class="btn btn-primary" (click)="save()" [disabled]="saving()">
              {{ isEdit() ? 'Enregistrer le modèle' : 'Créer le modèle' }}
            </button>
          </div>
        </div>

        <!-- Colonne latérale : variables + aperçu structure -->
        <div class="stack side">
          <div class="card">
            <h3>Variables disponibles</h3>
            <p class="muted" style="font-size:.8rem">Cliquez pour copier, à coller dans un titre ou un paragraphe.</p>
            @for (v of allVariables(); track v) {
              <button class="var" (click)="copyVar(v)">{{ '{{' }}{{ v }}{{ '}}' }}</button>
            }
          </div>
          <div class="card">
            <h3>Structure</h3>
            <ol class="struct">
              @for (b of blocks(); track b.id) {
                <li>{{ blockLabel(b.type) }}<span class="muted"> — {{ blockPreview(b) }}</span></li>
              }
            </ol>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .builder { display: grid; grid-template-columns: 1fr 300px; gap: 1rem; align-items: start; }
      @media (max-width: 1000px) { .builder { grid-template-columns: 1fr; } }
      .block { border: 1px solid var(--border); border-radius: 10px; padding: 0.8rem; margin-bottom: 0.7rem; background: #fff; }
      .block-head { display: flex; align-items: center; gap: 0.3rem; margin-bottom: 0.6rem; }
      .block-type { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; color: var(--primary); }
      .mini { border: 1px solid var(--border); background: #fff; border-radius: 6px; cursor: pointer; padding: 0.15rem 0.45rem; font-size: 0.75rem; color: var(--muted); }
      .mini:hover { background: var(--bg); }
      .mini:disabled { opacity: 0.35; cursor: not-allowed; }
      .mini.del:hover { background: #fee2e2; color: var(--danger); border-color: #fecaca; }
      .chk { display: flex; align-items: center; gap: 0.35rem; font-size: 0.85rem; font-weight: 500; }
      .chk input { width: auto; }
      .add-bar { display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: center; margin-top: 0.8rem; padding-top: 0.8rem; border-top: 1px dashed var(--border); }
      code { background: var(--bg); padding: 0.05rem 0.3rem; border-radius: 4px; font-size: 0.82rem; }
      .side .var { display: block; width: 100%; text-align: left; border: 1px solid var(--border); background: var(--bg); border-radius: 6px; padding: 0.35rem 0.5rem; margin-bottom: 0.3rem; cursor: pointer; font-family: ui-monospace, monospace; font-size: 0.78rem; }
      .side .var:hover { border-color: var(--primary); }
      .struct { margin: 0; padding-left: 1.1rem; font-size: 0.82rem; }
      .struct li { margin-bottom: 0.25rem; }
    `,
  ],
})
export class TemplateBuilder {
  private service = inject(DocumentService);
  private toast = inject(ToastService);
  private router = inject(Router);

  @Input() id?: string;

  model = signal<DocumentTemplate | null>(null);
  docTypes = signal<Choice[]>([]);
  saving = signal(false);
  private counter = 0;

  blocks = computed(() => (this.model()?.schema as Block[]) ?? []);

  allVariables = computed(() => {
    const builtins = [
      'project_name', 'client_name', 'project_reference', 'company_name',
      'today', 'document_title', 'version',
    ];
    const fieldKeys = this.blocks()
      .filter((b) => b.type === 'field' && b.key)
      .map((b) => b.key!);
    return [...builtins, ...fieldKeys];
  });

  constructor() {
    this.service.choices().subscribe((c) => this.docTypes.set(c.document_types));
    setTimeout(() => {
      if (this.id) {
        this.service.template(+this.id).subscribe((t) => {
          if (!t.is_block_based) {
            this.toast.error('Ce modèle n’est pas éditable visuellement.');
          }
          this.model.set(t);
        });
      } else {
        this.model.set({
          name: '',
          slug: '',
          description: '',
          doc_type: 'pdf',
          builder_key: 'custom',
          is_block_based: true,
          schema: [],
          is_active: true,
        });
      }
    });
  }

  isEdit() {
    return !!this.id;
  }

  onName(name: string, m: DocumentTemplate) {
    if (!this.isEdit()) {
      m.slug = this.slugify(name);
    }
  }

  blockLabel(type: BlockType): string {
    const labels: Record<BlockType, string> = {
      heading: 'Titre',
      paragraph: 'Paragraphe',
      field: 'Champ à remplir',
      table: 'Tableau',
      contacts: 'Contacts',
      spacer: 'Espace',
    };
    return labels[type];
  }

  blockPreview(b: Block): string {
    if (b.type === 'heading' || b.type === 'paragraph') return (b.text || '').slice(0, 30);
    if (b.type === 'field') return b.label || b.key || '';
    if (b.type === 'table') return b.label || `${(b.columns ?? []).length} colonne(s)`;
    if (b.type === 'contacts') return b.scope === 'client' ? 'client' : b.scope === 'internal' ? 'interne' : 'client + interne';
    return '';
  }

  add(type: BlockType) {
    const m = this.model();
    if (!m) return;
    const id = `b${Date.now()}_${this.counter++}`;
    const base: Block = { id, type };
    if (type === 'heading') {
      base.level = 2;
      base.text = '';
    } else if (type === 'paragraph') {
      base.text = '';
    } else if (type === 'field') {
      base.label = '';
      base.key = '';
      base.field_type = 'text';
      base.required = false;
      base.show_label = true;
    } else if (type === 'table') {
      base.label = '';
      base.columns = [{ label: 'Colonne 1' }, { label: 'Colonne 2' }];
      base.allow_edit_columns = false;
    } else if (type === 'contacts') {
      base.label = 'Contacts';
      base.scope = 'both';
    }
    (m.schema as Block[]).push(base);
    this.model.set({ ...m });
  }

  removeBlock(i: number) {
    const m = this.model();
    if (!m) return;
    (m.schema as Block[]).splice(i, 1);
    this.model.set({ ...m });
  }

  move(i: number, dir: number) {
    const m = this.model();
    if (!m) return;
    const arr = m.schema as Block[];
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    this.model.set({ ...m });
  }

  syncKey(b: Block) {
    b.key = this.slugify(b.label || '') || 'champ';
  }
  setOptions(b: Block, raw: string) {
    b.options = raw.split(',').map((s) => s.trim()).filter(Boolean);
  }
  addCol(b: Block) {
    b.columns = b.columns ?? [];
    b.columns.push({ label: `Colonne ${b.columns.length + 1}` });
  }
  removeCol(b: Block, i: number) {
    b.columns?.splice(i, 1);
  }

  copyVar(v: string) {
    navigator.clipboard?.writeText(`{{${v}}}`);
    this.toast.success(`{{${v}}} copié`);
  }

  private slugify(s: string): string {
    return s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  save() {
    const m = this.model();
    if (!m) return;
    if (!m.name) {
      this.toast.error('Le nom du modèle est obligatoire.');
      return;
    }
    // Génère les clés manquantes des champs
    (m.schema as Block[]).forEach((b) => {
      if (b.type === 'field' && !b.key) this.syncKey(b);
    });
    m.is_block_based = true;
    m.builder_key = 'custom';
    this.saving.set(true);
    const req = this.isEdit()
      ? this.service.updateTemplate(+this.id!, m)
      : this.service.createTemplate(m);
    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success('Modèle enregistré.');
        this.router.navigate(['/templates']);
      },
      error: () => {
        this.saving.set(false);
        this.toast.error("Erreur (l'identifiant est peut-être déjà utilisé).");
      },
    });
  }
}
