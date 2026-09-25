import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/api.service';
import { ThemeService, Proposition, ThemeMode } from '../../core/services/theme.service';

@Component({
  selector: 'app-preferences',
  imports: [FormsModule],
  template: `
    <h1>Préférences</h1>
    <p class="muted">Personnalisez l'apparence de l'application pour votre compte.</p>

    <div class="card stack" style="max-width:620px">
      <h3>Thème</h3>
      <p class="muted" style="margin:0">Trois propositions inspirées des vents. Le choix s'applique immédiatement et suit votre compte.</p>
      <div class="props">
        @for (p of theme.propositions; track p.id) {
          <button class="prop" [class.active]="proposition() === p.id" (click)="pickProp(p.id)">
            <span class="dot" [style.background]="p.primary"></span>
            <span class="pn">{{ p.name }}</span>
            <span class="ps">{{ p.sub }}</span>
          </button>
        }
      </div>
      <div class="row" style="gap:.5rem;align-items:center;margin-top:.3rem">
        <label style="margin:0">Luminosité</label>
        <div class="seg">
          @for (m of modes; track m.v) {
            <button class="segb" [class.active]="mode() === m.v" (click)="pickMode(m.v)">{{ m.l }}</button>
          }
        </div>
      </div>
    </div>

    <div class="card stack" style="max-width:620px">
      <h3>Couleur d'accent</h3>
      <div class="swatches">
        @for (c of presets; track c) {
          <button class="sw" [style.background]="c" [class.active]="accent() === c" (click)="pick(c)" [title]="c"></button>
        }
      </div>
      <div class="row" style="gap:.8rem;align-items:center;margin-top:.6rem">
        <label style="margin:0">Personnalisée</label>
        <input type="color" [ngModel]="accent() || '#4f46e5'" (ngModelChange)="pick($event)" style="width:56px;height:38px;padding:2px" />
        <button class="btn btn-ghost btn-sm" (click)="reset()">Réinitialiser</button>
      </div>
      <div class="preview">
        <span class="btn btn-primary">Bouton principal</span>
        <span class="badge badge-internal">Badge</span>
        <a href="javascript:void(0)">Lien accentué</a>
      </div>
      <div class="row" style="justify-content:flex-end">
        <button class="btn btn-primary" (click)="save()" [disabled]="saving()">Enregistrer</button>
      </div>
    </div>
  `,
  styles: [`
    .swatches { display:flex; flex-wrap:wrap; gap:.5rem; }
    .sw { width:38px; height:38px; border-radius:50%; border:2px solid #fff; cursor:pointer;
      box-shadow: 0 0 0 1px var(--border); }
    .sw.active { box-shadow: 0 0 0 3px var(--primary); }
    .preview { display:flex; align-items:center; gap:1rem; padding:1rem; border:1px dashed var(--border); border-radius:12px; margin:.4rem 0; }
    .props { display:grid; grid-template-columns:repeat(3,1fr); gap:.6rem; }
    @media(max-width:560px){ .props { grid-template-columns:1fr; } }
    .prop { display:flex; flex-direction:column; align-items:flex-start; gap:.15rem; border:1px solid var(--border);
      border-radius:12px; padding:.7rem .8rem; cursor:pointer; background:var(--surface,#fff); text-align:left; }
    .prop:hover { border-color:var(--primary); }
    .prop.active { border-color:var(--primary); box-shadow:0 0 0 2px var(--primary); }
    .prop .dot { width:26px; height:26px; border-radius:50%; box-shadow:0 0 0 1px var(--border); margin-bottom:.25rem; }
    .prop .pn { font-weight:700; font-size:.9rem; }
    .prop .ps { font-size:.76rem; color:var(--muted); }
    .seg { display:inline-flex; border:1px solid var(--border); border-radius:9px; overflow:hidden; }
    .segb { border:0; background:transparent; padding:.4rem .8rem; cursor:pointer; font-weight:600; font-size:.84rem; color:var(--fg,inherit); }
    .segb.active { background:var(--primary); color:#fff; }
  `],
})
export class Preferences {
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  theme = inject(ThemeService);
  presets = ['#4f46e5', '#2563eb', '#0ea5e9', '#0d9488', '#16a34a', '#d97706', '#dc2626', '#db2777', '#7c3aed', '#0f172a'];
  accent = signal<string>((this.auth.user()?.ui_prefs?.['accent'] as string) || '');
  saving = signal(false);

  proposition = this.theme.proposition;
  mode = this.theme.mode;
  modes: { v: ThemeMode; l: string }[] = [
    { v: 'light', l: 'Clair' }, { v: 'dark', l: 'Sombre' }, { v: 'auto', l: 'Auto' },
  ];

  pickProp(p: Proposition) {
    this.theme.setProposition(p);
    this.auth.updatePrefs({ theme_proposition: p }).catch(() => { /* silencieux : appliqué localement */ });
  }
  pickMode(m: ThemeMode) {
    this.theme.setMode(m);
    this.auth.updatePrefs({ theme_mode: m }).catch(() => { /* silencieux */ });
  }

  pick(c: string) {
    this.accent.set(c);
    // aperçu live
    document.documentElement.style.setProperty('--primary', c);
  }
  reset() { this.accent.set(''); document.documentElement.style.removeProperty('--primary'); }

  async save() {
    this.saving.set(true);
    try {
      await this.auth.updatePrefs({ accent: this.accent() || null });
      this.toast.success('Préférences enregistrées.');
    } catch { this.toast.error('Enregistrement impossible.'); }
    finally { this.saving.set(false); }
  }
}
