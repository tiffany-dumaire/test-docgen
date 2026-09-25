import { Component, Inject } from '@angular/core';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

export interface PreviewData {
  kind: string;
  srcdoc?: string;
  blobUrl: string;
  mime: string;
  title: string;
}

@Component({
  selector: 'app-preview-dialog',
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="pv-head">
      <mat-icon>visibility</mat-icon>
      <b>{{ data.title }}</b>
      <span class="grow"></span>
      <a mat-button [href]="blobSafe" target="_blank"><mat-icon>open_in_new</mat-icon> Ouvrir</a>
      <button mat-icon-button (click)="ref.close()"><mat-icon>close</mat-icon></button>
    </div>
    <div class="pv-body">
      @if (data.kind === 'html') {
        <iframe [srcdoc]="data.srcdoc" title="Aperçu" sandbox="allow-same-origin"></iframe>
      } @else if (data.kind === 'pdf') {
        <iframe [src]="blobSafe" title="Aperçu"></iframe>
      } @else if (data.kind === 'image') {
        <div class="pv-image"><img [src]="data.blobUrl" alt="Aperçu" /></div>
      } @else {
        <div class="pv-native">
          <mat-icon>description</mat-icon>
          <p>Aperçu indisponible pour ce format.</p>
          <a mat-flat-button [href]="blobSafe" target="_blank">Ouvrir le fichier</a>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display:block; width:min(94vw,1040px); }
    .pv-head { display:flex; align-items:center; gap:.5rem; padding:.6rem 1rem; border-bottom:1px solid var(--mat-sys-outline-variant); }
    .grow { flex:1; }
    .pv-body { height:80vh; background:#eef2f9; }
    iframe { width:100%; height:100%; border:0; background:#eef2f9; }
    .pv-native { height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:.8rem; color:#334155; }
    .pv-native mat-icon { font-size:48px; width:48px; height:48px; }
    .pv-image { height:100%; overflow:auto; display:flex; align-items:flex-start; justify-content:center; padding:1rem; }
    .pv-image img { max-width:100%; height:auto; box-shadow:0 4px 24px rgba(0,0,0,.25); background:#fff; }
  `],
})
export class PreviewDialog {
  blobSafe: SafeResourceUrl;
  constructor(@Inject(MAT_DIALOG_DATA) public data: PreviewData,
              public ref: MatDialogRef<PreviewDialog>, san: DomSanitizer) {
    this.blobSafe = san.bypassSecurityTrustResourceUrl(data.blobUrl);
  }
}
