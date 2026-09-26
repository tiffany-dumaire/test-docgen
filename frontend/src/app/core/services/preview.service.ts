import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PreviewDialog } from '@shared/preview-dialog';
import { PreviewResult } from './document.service';

@Injectable({ providedIn: 'root' })
export class PreviewService {
  private dialog = inject(MatDialog);

  /**
   * Affiche l'aperçu directement dans l'application à partir du contenu inline
   * (base64) : aucun téléchargement, aucune requête vers un hôte média externe,
   * donc plus d'erreur « localhost n'autorise pas la connexion ».
   */
  open(res: PreviewResult, title = 'Aperçu') {
    const bin = atob(res.b64 || '');
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: res.mime || 'application/octet-stream' });
    const blobUrl = URL.createObjectURL(blob);

    let srcdoc: string | undefined;
    if (res.kind === 'html') {
      srcdoc = new TextDecoder('utf-8').decode(bytes);
    }
    this.dialog.open(PreviewDialog, {
      data: { kind: res.kind, srcdoc, blobUrl, mime: res.mime, title },
      maxWidth: '96vw', panelClass: 'pv-panel',
    });
  }
}
