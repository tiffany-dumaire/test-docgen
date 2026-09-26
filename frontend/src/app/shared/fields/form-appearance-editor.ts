import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormService } from '@core/services/form.service';
import { ToastService } from '@core/services/api.service';
import { FormTheme } from '@core/models';

/** Éditeur d'apparence partagé (couleurs, disposition, couverture, progression). */
@Component({
  selector: 'app-form-appearance-editor',
  imports: [FormsModule],
  templateUrl: './form-appearance-editor.html',
  styleUrl: './form-appearance-editor.scss',
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
