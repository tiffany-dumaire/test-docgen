import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormService } from '@core/services/form.service';
import { ToastService } from '@core/services/api.service';
import { FormTheme } from '@core/models';

/** Éditeur d'apparence partagé (couleurs, disposition, couverture, progression). */
@Component({
  selector: 'app-form-appearance-editor',
  imports: [FormsModule],
  template: `
    <div class="card stack">
      <h3>🎨 Apparence du formulaire</h3>
      <label class="chk"><input type="checkbox" [ngModel]="showProgress" (ngModelChange)="showProgressChange.emit($event)" /> Afficher la progression au répondant</label>
      <div class="form-grid">
        <div class="field">
          <label>Disposition</label>
          <select [ngModel]="theme.layout || 'card'" (ngModelChange)="set('layout', $event)">
            <option value="card">Carte centrée</option>
            <option value="cover">Bannière de couverture</option>
            <option value="plain">Épuré</option>
          </select>
        </div>
        <div class="field">
          <label>Libellé du bouton d'envoi</label>
          <input [ngModel]="theme.button_label || ''" (ngModelChange)="set('button_label', $event)" placeholder="Envoyer" />
        </div>
        <div class="field">
          <label>Couleur d'accent</label>
          <input type="color" [ngModel]="theme.accent || '#ec6608'" (ngModelChange)="set('accent', $event)" />
        </div>
        <div class="field">
          <label>Couleur de fond</label>
          <input type="color" [ngModel]="theme.background || '#f4f5f7'" (ngModelChange)="set('background', $event)" />
        </div>
      </div>
      <div class="field">
        <label>Image de couverture (bannière)</label>
        <div class="upload-row">
          @if (theme.cover_image) { <img class="thumb" [src]="theme.cover_image" alt="cover" /> }
          <input type="file" accept="image/*" (change)="uploadCover($event)" />
          @if (theme.cover_image) { <button class="btn btn-sm btn-ghost" (click)="set('cover_image', '')">Retirer</button> }
        </div>
      </div>
      <p class="muted" style="font-size:.8rem">Le logo de l'entreprise s'affiche automatiquement en tête du formulaire public.</p>
    </div>
  `,
  styles: [`
    .chk { display:flex; align-items:center; gap:.4rem; font-weight:600; }
    .chk input { width:auto; }
    .upload-row { display:flex; align-items:center; gap:.5rem; flex-wrap:wrap; }
    .upload-row input[type=file] { width:auto; }
    .thumb { height:40px; border-radius:6px; border:1px solid var(--border); }
  `],
})
export class FormAppearanceEditor {
  private service = inject(FormService);
  private toast = inject(ToastService);

  @Input() theme!: FormTheme;
  @Input() showProgress = true;
  @Output() showProgressChange = new EventEmitter<boolean>();
  @Output() changed = new EventEmitter<void>();

  set(key: keyof FormTheme, val: any) { (this.theme as any)[key] = val; this.changed.emit(); }

  uploadCover(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files && input.files.length ? input.files[0] : null;
    if (!file) return;
    this.service.uploadAsset(file).subscribe({
      next: (r) => this.set('cover_image', r.url),
      error: () => this.toast.error('Téléversement impossible.'),
    });
  }
}
