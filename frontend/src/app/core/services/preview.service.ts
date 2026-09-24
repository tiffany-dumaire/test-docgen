import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PreviewDialog } from '../../shared/preview-dialog';

@Injectable({ providedIn: 'root' })
export class PreviewService {
  private dialog = inject(MatDialog);
  open(res: { url: string; kind: string; ext: string }, title = 'Aperçu') {
    this.dialog.open(PreviewDialog, {
      data: { ...res, title }, maxWidth: '96vw', panelClass: 'pv-panel',
    });
  }
}
