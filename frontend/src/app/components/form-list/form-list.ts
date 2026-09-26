import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { FormService } from '@core/services/form.service';
import { ToastService } from '@core/services/api.service';
import { OnlineForm } from '@core/models';

@Component({
  selector: 'app-form-list',
  imports: [RouterLink, TranslocoModule],
  templateUrl: './form-list.html',
  styleUrl: './form-list.scss',
})
export class FormList {
  private service = inject(FormService);
  private toast = inject(ToastService);
  private t = inject(TranslocoService);

  forms = signal<OnlineForm[]>([]);

  constructor() {
    this.service.list().subscribe((r) => this.forms.set(r.results));
  }

  copy(url: string) {
    navigator.clipboard?.writeText(url);
    this.toast.success(this.t.translate('forms.copied'));
  }
}
