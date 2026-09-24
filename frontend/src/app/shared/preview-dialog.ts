import { Component, Inject } from '@angular/core';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

export interface PreviewData { url: string; kind: string; ext: string; title: string; }

@Component({
  selector: 'app-preview-dialog',
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="pv-head">
      <mat-icon>visibility</mat-icon>
      <b>{{ data.title }}</b>
      <span class="grow"></span>
      <a mat-button [href]="data.url" target="_blank"><mat-icon>open_in_new</mat-icon> Ouvrir</a>
      <button mat-icon-button (click)="ref.close()"><mat-icon>close</mat-icon></button>
    </div>
    <div class="pv-body">
      @if (data.kind === 'pdf') {
        <iframe [src]="safe" title="Aperçu"></iframe>
      } @else {
        <div class="pv-native">
          <mat-icon>description</mat-icon>
          <p>L'aperçu PDF n'est pas disponible pour ce format dans cet environnement.</p>
          <a mat-flat-button [href]="data.url" target="_blank">Ouvrir le fichier</a>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display:block; width:min(92vw,1000px); }
    .pv-head { display:flex; align-items:center; gap:.5rem; padding:.6rem 1rem; border-bottom:1px solid var(--mat-sys-outline-variant); }
    .grow { flex:1; }
    .pv-body { height:78vh; background:#525659; }
    iframe { width:100%; height:100%; border:0; }
    .pv-native { height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:.8rem; color:#fff; }
    .pv-native mat-icon { font-size:48px; width:48px; height:48px; }
  `],
})
export class PreviewDialog {
  safe: SafeResourceUrl;
  constructor(@Inject(MAT_DIALOG_DATA) public data: PreviewData,
              public ref: MatDialogRef<PreviewDialog>, san: DomSanitizer) {
    this.safe = san.bypassSecurityTrustResourceUrl(data.url);
  }
}
