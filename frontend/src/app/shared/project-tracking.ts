import { Component, inject, signal, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ProjectService } from '@core/services/project.service';
import { ToastService } from '@core/services/api.service';
import {
  ProjectTracking as TrackingData, TrackTask,
} from '@core/models';

const TYPES: { key: string; label: string }[] = [
  { key: 'gantt', label: 'Diagramme de Gantt' },
  { key: 'planned_actual', label: 'Planning prévu vs réalisé' },
  { key: 'progress_curve', label: "Courbe d'avancement" },
  { key: 'dashboard', label: 'Tableau de bord projet' },
  { key: 'workload', label: 'Diagramme de charge' },
  { key: 'roadmap', label: 'Roadmap' },
  { key: 'dependencies', label: 'Diagramme des dépendances' },
  { key: 'burndown', label: 'Burndown chart' },
  { key: 'burnup', label: 'Burnup chart' },
  { key: 'risks', label: 'Suivi des risques' },
  { key: 'milestones', label: 'Suivi des jalons' },
];

@Component({
  selector: 'app-project-tracking',
  imports: [FormsModule],
  template: `
    @if (mode === 'diagrams') {
      <div class="card stack">
        <div class="row between">
          <h3>Documents de suivi de projet</h3>
          <button class="btn btn-sm btn-ghost" (click)="loadDiagrams()">↻ Actualiser</button>
        </div>
        <p class="muted" style="margin:0">Diagrammes générés à partir des données de suivi. Exportez chacun en SVG.</p>
        <div class="diag-grid">
          @for (t of types; track t.key) {
            <div class="diag">
              <div class="row between">
                <b>{{ t.label }}</b>
                <button class="btn btn-sm btn-ghost" (click)="download(t.key, t.label)">⬇ SVG</button>
              </div>
              <div class="svgbox" [innerHTML]="svgs()[t.key] || loading"></div>
            </div>
          }
        </div>
      </div>
    } @else {
      <!-- DONNÉES DE SUIVI -->
      <div class="card stack">
        <div class="row between"><h3>Tâches</h3><button class="btn btn-sm btn-primary" (click)="addTask()">+ Tâche</button></div>
        <table><thead><tr><th>Nom</th><th>Début</th><th>Fin</th><th>Fin prévue</th><th>Avanc. %</th><th>Équipe</th><th>Statut</th><th>Dépend. (ids)</th><th></th></tr></thead>
          <tbody>
            @for (t of tk().tasks!; track $index) {
              <tr>
                <td><input [(ngModel)]="t.name" /></td>
                <td><input type="date" [(ngModel)]="t.start" /></td>
                <td><input type="date" [(ngModel)]="t.end" /></td>
                <td><input type="date" [(ngModel)]="t.planned_end" /></td>
                <td><input type="number" min="0" max="100" [(ngModel)]="t.progress" style="width:70px" /></td>
                <td><input [(ngModel)]="t.team" style="width:110px" /></td>
                <td><select [(ngModel)]="t.status"><option value="planned">Planifié</option><option value="in_progress">En cours</option><option value="done">Terminé</option><option value="late">En retard</option></select></td>
                <td><input [ngModel]="(t.deps||[]).join(',')" (ngModelChange)="t.deps=splitIds($event)" style="width:90px" placeholder="t1,t2" /><div class="tag">id: {{ t.id }}</div></td>
                <td><button class="btn btn-sm btn-danger" (click)="tk().tasks!.splice($index,1)">✕</button></td>
              </tr>
            }
          </tbody></table>
        @if (!tk().tasks!.length) { <div class="muted">Aucune tâche.</div> }
      </div>

      <div class="card stack">
        <div class="row between"><h3>Jalons</h3><button class="btn btn-sm btn-primary" (click)="tk().milestones!.push({name:'',planned:'',actual:''})">+ Jalon</button></div>
        <table><thead><tr><th>Nom</th><th>Date prévue</th><th>Date réelle</th><th></th></tr></thead>
          <tbody>@for (m of tk().milestones!; track $index) {
            <tr><td><input [(ngModel)]="m.name" /></td><td><input type="date" [(ngModel)]="m.planned" /></td><td><input type="date" [(ngModel)]="m.actual" /></td>
              <td><button class="btn btn-sm btn-danger" (click)="tk().milestones!.splice($index,1)">✕</button></td></tr>
          }</tbody></table>
      </div>

      <div class="card stack">
        <div class="row between"><h3>Risques</h3><button class="btn btn-sm btn-primary" (click)="tk().risks!.push({name:'',probability:3,impact:3,status:'open',action:''})">+ Risque</button></div>
        <table><thead><tr><th>Risque</th><th>Probabilité (1-5)</th><th>Impact (1-5)</th><th>Statut</th><th>Action</th><th></th></tr></thead>
          <tbody>@for (r of tk().risks!; track $index) {
            <tr><td><input [(ngModel)]="r.name" /></td><td><input type="number" min="1" max="5" [(ngModel)]="r.probability" style="width:70px" /></td>
              <td><input type="number" min="1" max="5" [(ngModel)]="r.impact" style="width:70px" /></td>
              <td><select [(ngModel)]="r.status"><option value="open">Ouvert</option><option value="mitigated">Maîtrisé</option><option value="closed">Clôturé</option></select></td>
              <td><input [(ngModel)]="r.action" /></td>
              <td><button class="btn btn-sm btn-danger" (click)="tk().risks!.splice($index,1)">✕</button></td></tr>
          }</tbody></table>
      </div>

      <div class="card stack">
        <div class="row between"><h3>Avancement (relevés)</h3><button class="btn btn-sm btn-primary" (click)="tk().snapshots!.push({date:'',planned:0,actual:0})">+ Relevé</button></div>
        <table><thead><tr><th>Date</th><th>Prévu %</th><th>Réalisé %</th><th></th></tr></thead>
          <tbody>@for (s of tk().snapshots!; track $index) {
            <tr><td><input type="date" [(ngModel)]="s.date" /></td><td><input type="number" [(ngModel)]="s.planned" style="width:80px" /></td>
              <td><input type="number" [(ngModel)]="s.actual" style="width:80px" /></td>
              <td><button class="btn btn-sm btn-danger" (click)="tk().snapshots!.splice($index,1)">✕</button></td></tr>
          }</tbody></table>
      </div>

      <div class="card stack">
        <div class="row between"><h3>Roadmap</h3><button class="btn btn-sm btn-primary" (click)="tk().roadmap!.push({title:'',date:''})">+ Étape</button></div>
        <table><thead><tr><th>Grande étape / livrable</th><th>Période</th><th></th></tr></thead>
          <tbody>@for (r of tk().roadmap!; track $index) {
            <tr><td><input [(ngModel)]="r.title" /></td><td><input [(ngModel)]="r.date" placeholder="2026-05" /></td>
              <td><button class="btn btn-sm btn-danger" (click)="tk().roadmap!.splice($index,1)">✕</button></td></tr>
          }</tbody></table>
      </div>

      <div class="row"><button class="btn btn-primary" (click)="save()" [disabled]="saving()">Enregistrer le suivi</button></div>
    }
  `,
  styles: [`
    :host { display:block; }
    .stack > * + * { margin-top: 1rem; }
    .diag-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(360px,1fr)); gap:1rem; }
    .diag { border:1px solid var(--border); border-radius:12px; padding:.7rem; background:var(--surface); }
    .svgbox { margin-top:.5rem; overflow:auto; }
    .svgbox ::ng-deep svg { width:100%; height:auto; }
    table input, table select { padding:.3rem .4rem; }
  `],
})
export class ProjectTracking {
  private http = inject(HttpClient);
  private san = inject(DomSanitizer);
  private svc = inject(ProjectService);
  private toast = inject(ToastService);

  @Input({ required: true }) id!: number;
  @Input() mode: 'data' | 'diagrams' = 'data';

  types = TYPES;
  loading: SafeHtml = this.san.bypassSecurityTrustHtml('<div style="padding:2rem;text-align:center;color:#94a3b8">…</div>');
  svgs = signal<Record<string, SafeHtml>>({});
  saving = signal(false);
  private _tk = signal<TrackingData>({ tasks: [], milestones: [], risks: [], snapshots: [], roadmap: [] });
  tk = this._tk.asReadonly();

  private counter = 1;

  ngOnInit() {
    this.svc.get(this.id).subscribe((p) => {
      const t = p.tracking || {};
      this._tk.set({
        tasks: t.tasks || [], milestones: t.milestones || [],
        risks: t.risks || [], snapshots: t.snapshots || [], roadmap: t.roadmap || [],
      });
      this.counter = (t.tasks || []).length + 1;
      if (this.mode === 'diagrams') this.loadDiagrams();
    });
  }

  splitIds(raw: string): string[] {
    return raw.split(',').map((s) => s.trim()).filter(Boolean);
  }
  addTask() {
    const id = 't' + (this.counter++);
    this.tk().tasks!.push({ id, name: '', start: '', end: '', progress: 0, planned_end: '', team: '', status: 'planned', deps: [] } as TrackTask);
  }

  /** Couleur principale du thème actif (résolue via une sonde), au format #rrggbb. */
  private themePrimary(): string {
    try {
      const probe = document.createElement('span');
      probe.style.color = 'var(--primary)';
      probe.style.display = 'none';
      document.body.appendChild(probe);
      const rgb = getComputedStyle(probe).color;
      probe.remove();
      const m = rgb.match(/\d+/g);
      if (!m || m.length < 3) return '';
      return '#' + m.slice(0, 3).map((n) => (+n).toString(16).padStart(2, '0')).join('');
    } catch { return ''; }
  }

  loadDiagrams() {
    const primary = this.themePrimary();
    for (const t of TYPES) {
      const url = this.svc.trackingDiagramUrl(this.id, t.key, primary);
      this.http.get(url, { responseType: 'text' }).subscribe({
        next: (svg) => this.svgs.update((cur) => ({ ...cur, [t.key]: this.san.bypassSecurityTrustHtml(svg) })),
        error: () => {},
      });
    }
  }

  download(type: string, label: string) {
    const url = this.svc.trackingDiagramUrl(this.id, type, this.themePrimary());
    this.http.get(url, { responseType: 'blob' }).subscribe((blob) => {
      const u = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = u; a.download = label.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.svg';
      a.click(); URL.revokeObjectURL(u);
    });
  }

  save() {
    this.saving.set(true);
    this.svc.patch(this.id, { tracking: this._tk() }).subscribe({
      next: () => { this.saving.set(false); this.toast.success('Suivi enregistré.'); },
      error: () => { this.saving.set(false); this.toast.error('Enregistrement impossible.'); },
    });
  }
}
