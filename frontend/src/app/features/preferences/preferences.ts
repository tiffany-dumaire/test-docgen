import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/api.service';

@Component({
  selector: 'app-preferences',
  imports: [FormsModule],
  template: `
    <h1>Préférences</h1>
    <p class="muted">Personnalisez l'apparence de l'application pour votre compte.</p>

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
  `],
})
export class Preferences {
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  presets = ['#4f46e5', '#2563eb', '#0ea5e9', '#0d9488', '#16a34a', '#d97706', '#dc2626', '#db2777', '#7c3aed', '#0f172a'];
  accent = signal<string>((this.auth.user()?.ui_prefs?.['accent'] as string) || '');
  saving = signal(false);

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
