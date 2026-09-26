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
  templateUrl: './project-tracking.html',
  styleUrl: './project-tracking.scss',
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
