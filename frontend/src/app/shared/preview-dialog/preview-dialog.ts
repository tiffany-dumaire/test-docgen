import { Component, inject, Inject } from '@angular/core';
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
  templateUrl: './preview-dialog.html',
  styleUrl: './preview-dialog.scss',
})
export class PreviewDialog {
  public data = inject<PreviewData>(MAT_DIALOG_DATA);
  public ref = inject(MatDialogRef<PreviewDialog>);
  san = inject(DomSanitizer);
  blobSafe: SafeResourceUrl;
  constructor() {
    this.blobSafe = this.san.bypassSecurityTrustResourceUrl(this.data.blobUrl);
  }
}
