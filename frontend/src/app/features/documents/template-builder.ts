import { Component, inject, signal, Input, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgTemplateOutlet } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { DocumentService } from '../../core/services/document.service';
import { ToastService } from '../../core/services/api.service';
import { RichTextEditor } from '../../shared/rich-text-editor';
import { ExcelBuilder } from './excel-builder';
import { LayoutEditor } from './layout-editor';
import { MatTabsModule } from '@angular/material/tabs';
import { StyleEditor } from './style-editor';
import { ProjectService } from '../../core/services/project.service';
import {
  A3Page,
  Block,
  BlockType,
  Choice,
  DocType,
  DocumentTemplate,
  ExcelSheet,
  LANGUAGES,
  Overlay,
  Project,
  StyleMap,
  TemplateLanguage,
  TemplateSettings,
} from '../../core/models';

interface PaletteItem {
  type: BlockType;
  label: string;
  icon: string;
}

/** Métadonnées d'affichage par type de modèle (onglets séparés par type). */
const TYPE_META: Record<string, { label: string; icon: string; hint: string }> = {
  docx: { label: 'Word', icon: '📝', hint: 'Document Word par blocs : titres, textes, tableaux, images, diagrammes.' },
  pdf: { label: 'PDF', icon: '📄', hint: 'Le PDF est un document Word exporté à l’identique (mêmes blocs et mise en page).' },
  xlsx: { label: 'Excel', icon: '📊', hint: 'Classeur Excel : onglets, colonnes typées, tableaux croisés, règles.' },
  a3: { label: 'Template A3 (PNG / PDF)', icon: '🖼️', hint: 'Affiche / planche A3 ou A4 à positionnement libre, exportée en PNG ou PDF.' },
  md: { label: 'Markdown', icon: 'M↓', hint: 'Document Markdown par blocs, exporté en .md.' },
  pptx: { label: 'PowerPoint', icon: '📽️', hint: 'Présentation PowerPoint : chaque titre démarre une diapositive.' },
  brochure: { label: 'Brochure', icon: '📕', hint: 'Brochure par blocs, exportée en Word (.docx).' },
  lettre: { label: 'Lettre', icon: '✉️', hint: 'Lettre par blocs, exportée en Word (.docx).' },
  mail: { label: 'Mail', icon: '📧', hint: 'E-mail par blocs, exporté en Markdown (.md).' },
};

@Component({
  selector: 'app-template-builder',
  imports: [FormsModule, RouterLink, RichTextEditor, NgTemplateOutlet, ExcelBuilder, LayoutEditor, StyleEditor, MatTabsModule],
  template: `
    <div class="row between">
      <h1>{{ isEdit() ? 'Modifier le modèle' : 'Nouveau modèle' }}</h1>
      <a class="btn btn-ghost" routerLink="/templates">Retour</a>
    </div>

    @if (model(); as m) {
      <div class="type-banner">
        <span class="tb-icon">{{ typeMeta().icon }}</span>
        <div>
          <strong>Modèle {{ typeMeta().label }}</strong>
          <div class="muted">{{ typeMeta().hint }}</div>
        </div>
      </div>

      @if (isBlocks() && availableLangs(m).length > 1) {
        <div class="content-lang">
          <span class="tag">Contenu édité en :</span>
          @for (l of availableLangs(m); track l) {
            <button class="lang-pill" [class.active]="contentLang() === l" (click)="switchContentLang(l)">
              {{ flagOf(l) }} {{ labelOf(l) }}@if (l === (m.language || 'fr')) { <em> (base)</em> }
            </button>
          }
          <span class="muted" style="font-size:.78rem">Chaque langue peut avoir son propre contenu (blocs), pas seulement les textes.</span>
        </div>
      }

      <mat-tab-group class="detail-tabs" animationDuration="200ms" mat-stretch-tabs="false">
        <!-- ===================== GÉNÉRAL ===================== -->
        <mat-tab label="Général">
          <div class="tabpad">
            <div class="card stack">
              <div class="form-grid">
                <div class="field">
                  <label>Nom du modèle *</label>
                  <input [(ngModel)]="m.name" (ngModelChange)="onName($event, m)" />
                </div>
                <div class="field">
                  <label>Type de modèle *</label>
                  <select [(ngModel)]="m.doc_type" (ngModelChange)="onFormatChange(m)" [disabled]="isEdit()">
                    @for (dt of typeOptions(); track dt.value) { <option [value]="dt.value">{{ dt.label }}</option> }
                  </select>
                  @if (!isEdit()) { <small class="muted">Le type détermine les onglets de configuration.</small> }
                </div>
              </div>
              <div class="form-grid">
                <div class="field">
                  <label>Description</label>
                  <input [(ngModel)]="m.description" placeholder="À quoi sert ce modèle ?" />
                </div>
                <div class="field">
                  <label>Langue principale</label>
                  <select [(ngModel)]="m.language">
                    @for (l of availableLangs(m); track l) {
                      <option [value]="l">{{ flagOf(l) }} {{ labelOf(l) }}</option>
                    }
                  </select>
                  <small class="muted">Repli si une langue demandée n'est pas disponible.</small>
                </div>
              </div>

              <div class="field">
                <label>Langues disponibles</label>
                <div class="row" style="gap:.8rem; flex-wrap:wrap">
                  @for (l of languages; track l.value) {
                    <label class="chk">
                      <input type="checkbox" [checked]="hasLang(m, l.value)"
                             (change)="toggleLang(m, l.value)" /> {{ l.flag }} {{ l.label }}
                    </label>
                  }
                </div>
                <small class="muted">Un modèle peut proposer une ou plusieurs langues.</small>
              </div>

              <div class="field">
                <label>Nom du modèle par langue</label>
                @for (l of availableLangs(m); track l) {
                  <div class="row" style="gap:.6rem; align-items:center; margin-bottom:.35rem">
                    <span style="width:2.2rem">{{ flagOf(l) }}</span>
                    <input style="flex:1" [ngModel]="nameFor(m, l)"
                           (ngModelChange)="setName(m, l, $event)"
                           [placeholder]="labelOf(l)" />
                  </div>
                }
                <small class="muted">Laissez vide pour utiliser le nom principal ci-dessus.</small>
              </div>

              @if (hasTableColor()) {
                <div class="field">
                  <label>Couleur principale des tableaux</label>
                  <div class="row" style="gap:.6rem; align-items:center">
                    <input type="color" [ngModel]="'#' + (settings().table_color || '1F497D')" (ngModelChange)="settings().table_color = $event.slice(1)" style="width:52px; height:36px; padding:2px" />
                    <span class="muted">Appliquée aux en-têtes de tableaux (Word, PDF et Excel).</span>
                  </div>
                </div>
              }

              @if (isPdf()) {
                <div class="field">
                  <label class="chk"><input type="checkbox" [(ngModel)]="settings().pdf_from_docx" /> PDF généré depuis Word (rendu identique)</label>
                  <small class="muted">Recommandé : le PDF est produit par export du document Word (Microsoft Word). Décochez pour un rendu PDF natif de secours.</small>
                </div>
              }

              <div class="field">
                <label>Portée du modèle</label>
                <select [(ngModel)]="m.scope">
                  <option value="global">Ouvert à tous les projets</option>
                  <option value="projects">Spécifique à certains projets</option>
                </select>
              </div>
              @if (m.scope === 'projects') {
                <div class="field">
                  <label>Projets autorisés</label>
                  <div class="proj-pick">
                    @for (pr of allProjects(); track pr.id) {
                      <label class="chip-check">
                        <input type="checkbox" [checked]="isProjSel(m, pr.id!)" (change)="toggleProj(m, pr.id!)" />
                        {{ pr.name }}
                      </label>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        </mat-tab>

        <!-- ===================== CONTENU (Word / PDF / Markdown / PowerPoint) ===================== -->
        @if (isBlocks()) {
          <mat-tab label="Contenu">
            <div class="tabpad content-grid">
              <div class="palette card">
                <h3>Éléments</h3>
                @for (item of palette(); track item.type) {
                  <div class="palette-item" draggable="true" (dragstart)="onPaletteDrag(item.type)" (click)="add(item.type)">
                    <span class="pi-icon">{{ item.icon }}</span> {{ item.label }}
                  </div>
                }
              </div>

              <div class="canvas card" (dragover)="$event.preventDefault()" (drop)="onCanvasDrop()">
                <h3>{{ isPptx() ? 'Diapositives (un titre = une diapo)' : 'Contenu du document' }}</h3>
                @for (block of blocks(); track block.id; let i = $index) {
                  <div class="block" draggable="true" (dragstart)="onBlockDrag(i)" (dragover)="$event.preventDefault()" (drop)="onDropAt(i); $event.stopPropagation()">
                    <div class="block-head">
                      <span class="drag">⠿</span>
                      <span class="block-type">{{ blockLabel(block.type) }}</span>
                      <span class="spacer"></span>
                      <button class="mini" (click)="move(i, -1)" [disabled]="i === 0">▲</button>
                      <button class="mini" (click)="move(i, 1)" [disabled]="i === blocks().length - 1">▼</button>
                      <button class="mini del" (click)="removeBlock(i)">✕</button>
                    </div>

                    @switch (block.type) {
                      @case ('heading') {
                        <div class="row" style="gap:.5rem">
                          <select [(ngModel)]="block.level" style="width:110px">
                            @for (l of [1,2,3,4,5]; track l) { <option [ngValue]="l">Titre {{ l }}</option> }
                          </select>
                          <input [(ngModel)]="block.text" placeholder="Texte du titre" />
                        </div>
                      }
                      @case ('text') {
                        <textarea [(ngModel)]="block.text" rows="3" placeholder="Texte. Variables {{ '{{' }}…{{ '}}' }} autorisées."></textarea>
                      }
                      @case ('richtext') {
                        <app-rich-text-editor [value]="block.text || ''" (valueChange)="block.text = $event" />
                      }
                      @case ('bullet_list') { <ng-container *ngTemplateOutlet="listEditor; context:{ $implicit: block }" /> }
                      @case ('numbered_list') { <ng-container *ngTemplateOutlet="listEditor; context:{ $implicit: block }" /> }
                      @case ('image') {
                        <div class="stack">
                          @if (block.asset_url) { <img [src]="block.asset_url" class="preview-img" [style.width.%]="block.width_pct" /> }
                          <input type="file" accept="image/*" (change)="uploadImage($event, block)" />
                          <ng-container *ngTemplateOutlet="sizePos; context:{ $implicit: block }" />
                        </div>
                      }
                      @case ('logo') {
                        <div class="stack">
                          <div class="muted">Le logo de l'entreprise sera inséré ici.</div>
                          <ng-container *ngTemplateOutlet="sizePos; context:{ $implicit: block }" />
                        </div>
                      }
                      @case ('table') {
                        <div class="field">
                          <label>Titre du tableau (facultatif)</label>
                          <input [(ngModel)]="block.label" />
                        </div>
                        <label>Colonnes</label>
                        @for (col of block.columns ?? []; track $index) {
                          <div class="row" style="gap:.4rem; margin-bottom:.3rem">
                            <input [(ngModel)]="col.label" placeholder="Nom de colonne" />
                            <button class="mini del" (click)="removeCol(block, $index)">✕</button>
                          </div>
                        }
                        <button class="btn btn-sm btn-ghost" (click)="addCol(block)">+ Colonne</button>
                        <label class="chk" style="margin-top:.5rem"><input type="checkbox" [(ngModel)]="block.allow_edit_columns" /> Colonnes modifiables au remplissage</label>
                      }
                      @case ('field') {
                        <div class="form-grid">
                          <div class="field"><label>Libellé</label><input [(ngModel)]="block.label" (ngModelChange)="syncKey(block)" /></div>
                          <div class="field"><label>Type</label>
                            <select [(ngModel)]="block.field_type">
                              <option value="text">Texte court</option><option value="textarea">Texte long</option>
                              <option value="number">Nombre</option><option value="date">Date</option><option value="select">Liste</option>
                            </select>
                          </div>
                        </div>
                        @if (block.field_type === 'select') {
                          <div class="field"><label>Options (virgules)</label><input [ngModel]="(block.options ?? []).join(', ')" (ngModelChange)="setOptions(block, $event)" /></div>
                        }
                        <div class="row" style="gap:1.2rem">
                          <label class="chk"><input type="checkbox" [(ngModel)]="block.required" /> Obligatoire</label>
                          <label class="chk"><input type="checkbox" [(ngModel)]="block.show_label" /> Afficher le libellé</label>
                        </div>
                      }
                      @case ('code') {
                        <textarea class="mono" [(ngModel)]="block.text" rows="3" placeholder="Bloc de code"></textarea>
                      }
                      @case ('link') {
                        <div class="form-grid">
                          <div class="field"><label>Texte du lien</label><input [(ngModel)]="block.label" placeholder="Voir le site" /></div>
                          <div class="field"><label>URL</label><input [(ngModel)]="block.url" placeholder="https://…" /></div>
                        </div>
                      }
                      @case ('diagram') {
                        <div class="form-grid">
                          <div class="field"><label>Type de diagramme</label>
                            <select [(ngModel)]="block.variant">
                              <option value="process">Processus (flèches)</option>
                              <option value="list">Liste</option>
                              <option value="cycle">Cycle</option>
                              <option value="hierarchy">Hiérarchie</option>
                              <option value="pyramid">Pyramide</option>
                            </select>
                          </div>
                          <div class="field"><label>Largeur : {{ block.width_pct || 100 }}%</label>
                            <input type="range" min="40" max="100" [ngModel]="block.width_pct || 100" (ngModelChange)="block.width_pct = +$event" />
                          </div>
                        </div>
                        <label>Éléments</label>
                        @for (it of block.diagram_items ?? []; track $index) {
                          <div class="row" style="gap:.4rem; margin-bottom:.3rem">
                            <input [(ngModel)]="it.title" placeholder="Titre" style="flex:1" />
                            <input [(ngModel)]="it.text" placeholder="Description (facultatif)" style="flex:2" />
                            <button class="mini del" (click)="block.diagram_items!.splice($index, 1)">✕</button>
                          </div>
                        }
                        <button class="btn btn-sm btn-ghost" (click)="addDiagramItem(block)">+ Élément</button>
                      }
                      @case ('contacts') {
                        <div class="form-grid">
                          <div class="field"><label>Titre</label><input [(ngModel)]="block.label" /></div>
                          <div class="field"><label>Portée</label>
                            <select [(ngModel)]="block.scope">
                              <option value="both">Client + interne</option><option value="client">Client</option><option value="internal">Interne</option>
                            </select>
                          </div>
                        </div>
                      }
                      @case ('form_diagram') {
                        <div class="form-grid">
                          <div class="field"><label>Identifiant du diagramme (formulaire)</label>
                            <input [(ngModel)]="block.diagram_key" placeholder="ex : d1" />
                          </div>
                          <div class="field"><label>Largeur : {{ block.width_pct || 90 }}%</label>
                            <input type="range" min="40" max="100" [ngModel]="block.width_pct || 90" (ngModelChange)="block.width_pct = +$event" />
                          </div>
                        </div>
                        <p class="muted" style="font-size:.78rem;margin:0">Insère, lors de la génération d'un rapport lié à un formulaire, le diagramme correspondant (calculé sur les réponses).</p>
                      }
                      @case ('spacer') { <div class="muted">Espace vertical.</div> }
                    }
                  </div>
                }
                @if (!blocks().length) {
                  <div class="empty drop-hint">Glissez des éléments ici depuis la palette →</div>
                }
              </div>

              <div class="side card">
                <h3>Variables</h3>
                <p class="muted" style="font-size:.78rem">Cliquez pour copier.</p>
                @for (v of allVariables(); track v) {
                  <button class="var" (click)="copyVar(v)">{{ '{{' }}{{ v }}{{ '}}' }}</button>
                }
              </div>
            </div>
          </mat-tab>
        }

        <!-- ===================== EN-TÊTE & PIED (Word / PDF / Lettre) ===================== -->
        @if (hasHeaderFooter()) {
          <mat-tab label="En-tête & pied">
            <div class="tabpad">
              <div class="card stack">
                <h3>En-tête</h3>
                <label class="chk"><input type="checkbox" [ngModel]="hfConfigured('header')" (ngModelChange)="toggleHf('header', $event)" /> Personnaliser l'en-tête du modèle</label>
                @if (hfConfigured('header')) {
                  <label class="chk"><input type="checkbox" [ngModel]="hfVal('header','enabled')" (ngModelChange)="setHf('header','enabled',$event)" /> En-tête actif</label>
                  @if (hfVal('header','enabled')) {
                    <label class="chk"><input type="checkbox" [ngModel]="hfVal('header','show_logo')" (ngModelChange)="setHf('header','show_logo',$event)" /> Afficher le logo de l'entreprise</label>
                    <div class="field"><label>Contenu de l'en-tête (texte enrichi : couleur, gras, listes… — variables {{ '{{' }}…{{ '}}' }})</label>
                      <app-rich-text-editor [value]="$any(hfVal('header','html'))" (valueChange)="setHf('header','html',$event)" /></div>
                    <div class="field" style="max-width:220px"><label>Alignement</label>
                      <select [ngModel]="hfVal('header','align')" (ngModelChange)="setHf('header','align',$event)">
                        <option value="left">Gauche</option><option value="center">Centre</option><option value="right">Droite</option>
                      </select></div>
                  } @else { <p class="muted" style="margin:0">L'en-tête sera vide (aucun en-tête sur le document).</p> }
                } @else { <p class="muted" style="margin:0">L'en-tête du modèle de base est utilisé.</p> }
              </div>

              <div class="card stack">
                <h3>Pied de page</h3>
                <label class="chk"><input type="checkbox" [ngModel]="hfConfigured('footer')" (ngModelChange)="toggleHf('footer', $event)" /> Personnaliser le pied de page du modèle</label>
                @if (hfConfigured('footer')) {
                  <label class="chk"><input type="checkbox" [ngModel]="hfVal('footer','enabled')" (ngModelChange)="setHf('footer','enabled',$event)" /> Pied de page actif</label>
                  @if (hfVal('footer','enabled')) {
                    <div class="field"><label>Contenu du pied de page (texte enrichi : couleur, gras, listes… — variables {{ '{{' }}…{{ '}}' }})</label>
                      <app-rich-text-editor [value]="$any(hfVal('footer','html'))" (valueChange)="setHf('footer','html',$event)" /></div>
                    <div class="field" style="max-width:220px"><label>Alignement</label>
                      <select [ngModel]="hfVal('footer','align')" (ngModelChange)="setHf('footer','align',$event)">
                        <option value="left">Gauche</option><option value="center">Centre</option><option value="right">Droite</option>
                      </select></div>
                  } @else { <p class="muted" style="margin:0">Le pied de page sera vide (aucun pied sur le document).</p> }
                } @else { <p class="muted" style="margin:0">Le pied de page du modèle de base est utilisé.</p> }
              </div>
            </div>
          </mat-tab>
        }

        <!-- ===================== STRUCTURE & STYLES (Word / PDF) ===================== -->
        @if (hasStructure()) {
          <mat-tab label="Structure & styles">
            <div class="tabpad">
              <div class="card stack">
                <h3>Structure du document</h3>
                <div class="form-grid">
                  <label class="chk"><input type="checkbox" [(ngModel)]="settings().include_cover" /> Page de garde</label>
                  <label class="chk"><input type="checkbox" [(ngModel)]="settings().include_suivi" /> Page de suivi (identification + révisions)</label>
                  <label class="chk"><input type="checkbox" [(ngModel)]="settings().include_toc" /> Table des matières auto</label>
                </div>
                @if (settings().include_cover) {
                  <div class="form-grid">
                    <div class="field">
                      <label>Titre de couverture</label>
                      <input [(ngModel)]="settings().cover_title" placeholder="{{ '{{' }}document_title{{ '}}' }}" />
                    </div>
                    <div class="field">
                      <label>Sous-titre</label>
                      <input [(ngModel)]="settings().cover_subtitle" />
                    </div>
                  </div>
                }
              </div>
              <div class="card stack">
                <h3>Mise en page libre des pages de garde / suivi</h3>
                <p class="muted" style="margin:0 0 .4rem">Positionnez librement titres, images (redimensionnables), logo, formes et variables. Le PDF sera identique au Word.</p>
                <app-layout-editor [settings]="settings()" />
              </div>
              <div class="card stack">
                <h3>Styles du modèle</h3>
                <p class="muted" style="margin:0 0 .2rem">Héritage : <b>Entreprise → Projet → Modèle</b>. Ce modèle peut ré-utiliser les styles hérités, les surcharger par élément, ou définir des styles 100 % personnalisés.</p>
                <app-style-editor [styles]="templateStyles()" />
              </div>
            </div>
          </mat-tab>
        }

        <!-- ===================== POWERPOINT ===================== -->
        @if (isPptx()) {
          <mat-tab label="PowerPoint">
            <div class="tabpad">
              <div class="card stack">
                <h3>Thème de la présentation</h3>
                <p class="muted" style="margin:0 0 .4rem">Rendu fidèle au thème fourni. Personnalisation : logo de la diapositive de titre et couleur principale.</p>
                <div class="field">
                  <label>Couleur principale</label>
                  <div class="row" style="gap:.6rem; align-items:center">
                    <input type="color" [ngModel]="pptx().main_color || '#1F497D'" (ngModelChange)="pptx().main_color = $event" style="width:52px; height:36px; padding:2px" />
                    <span class="muted">Titres et accents des diapositives.</span>
                  </div>
                </div>
                <label class="chk"><input type="checkbox" [(ngModel)]="pptx().include_logo" /> Insérer le logo sur la diapositive de titre</label>
              </div>
            </div>
          </mat-tab>
        }

        <!-- ===================== ÉLÉMENTS DYNAMIQUES (calques PDF / PPTX) ===================== -->
        @if (hasOverlays()) {
          <mat-tab label="Éléments dynamiques">
            <div class="tabpad">
              <div class="card stack">
                <h3>Calques dynamiques</h3>
                <p class="muted" style="margin:0">
                  Placez librement des éléments (texte, image, logo, formes) estampillés
                  @if (isPptx()) { sur les diapositives choisies, en conservant le template titre / contenu. }
                  @else { sur les pages choisies du document PDF (page de garde comprise). }
                  Chaque calque cible un ensemble de {{ overlayNoun() }}.
                </p>
              </div>

              <div class="card stack">
                <div class="row between">
                  <h3>Calques</h3>
                  <button class="btn btn-sm btn-primary" (click)="addOverlay()">+ Calque</button>
                </div>
                <div class="a3-tabs">
                  @for (ov of overlays(); track ov.id) {
                    <button class="a3-tab" [class.active]="activeOverlay() === ov.id" (click)="activeOverlay.set(ov.id)">
                      {{ ov.name }}
                      <span class="x" (click)="removeOverlay(ov.id); $event.stopPropagation()">✕</span>
                    </button>
                  }
                  @if (!overlays().length) { <span class="muted">Aucun calque. Ajoutez-en un.</span> }
                </div>

                @for (ov of overlays(); track ov.id) {
                  @if (activeOverlay() === ov.id) {
                    <div class="form-grid">
                      <div class="field">
                        <label>Nom du calque</label>
                        <input [(ngModel)]="ov.name" />
                      </div>
                      <div class="field">
                        <label>{{ isPptx() ? 'Diapositives ciblées' : 'Pages ciblées' }}</label>
                        <select [ngModel]="pagePreset(ov)" (ngModelChange)="setPagePreset(ov, $event)">
                          <option value="all">Toutes</option>
                          <option value="first">{{ isPptx() ? 'Première diapo' : 'Première page' }}</option>
                          <option value="last">{{ isPptx() ? 'Dernière diapo' : 'Dernière page' }}</option>
                          <option value="odd">{{ isPptx() ? 'Diapos impaires' : 'Pages impaires' }}</option>
                          <option value="even">{{ isPptx() ? 'Diapos paires' : 'Pages paires' }}</option>
                          <option value="custom">Personnalisé…</option>
                        </select>
                      </div>
                    </div>
                    @if (pagePreset(ov) === 'custom') {
                      <div class="field" style="max-width:360px">
                        <label>{{ isPptx() ? 'N° de diapositives' : 'N° de pages' }} (ex : 1,3-5)</label>
                        <input [(ngModel)]="ov.target.pages" placeholder="1,3-5" />
                        <small class="muted">Numéros séparés par des virgules ; plages avec un tiret. Mots-clés : first, last.</small>
                      </div>
                    }
                    <label class="chk"><input type="checkbox" [ngModel]="ov.enabled !== false" (ngModelChange)="ov.enabled = $event" /> Calque actif</label>
                    <app-layout-editor [single]="ov.layout" [sizeMode]="isPptx() ? 'slide' : 'page'" />
                  }
                }
              </div>
            </div>
          </mat-tab>
        }

        <!-- ===================== PAGES A3 / A4 ===================== -->
        @if (isA3()) {
          <mat-tab label="Pages (A3 / A4)">
            <div class="tabpad">
              <div class="card stack">
                <div class="row between">
                  <h3>Format d'export</h3>
                </div>
                <div class="row" style="gap:1.5rem; align-items:center">
                  <label class="chk"><input type="radio" name="a3exp" value="pdf" [(ngModel)]="settings().a3_export" /> PDF (toutes les pages)</label>
                  <label class="chk"><input type="radio" name="a3exp" value="png" [(ngModel)]="settings().a3_export" /> PNG (image de la 1ʳᵉ page)</label>
                  <label class="chk"><input type="radio" name="a3exp" value="svg" [(ngModel)]="settings().a3_export" /> SVG (vectoriel, 1ʳᵉ page)</label>
                </div>
              </div>

              <div class="card stack">
                <h3>Générer un rendu par langue</h3>
                <p class="muted" style="margin:0">Chaque langue disponible du modèle produit sa propre planche. Enregistrez le modèle avant de générer.</p>
                @for (l of availableLangs(m); track l) {
                  <div class="row" style="gap:.6rem; align-items:center; flex-wrap:wrap">
                    <span style="min-width:9rem">{{ flagOf(l) }} {{ labelOf(l) }}</span>
                    <button class="btn btn-sm btn-ghost" [disabled]="!isEdit()" (click)="exportA3Lang('pdf', l)">⬇ PDF</button>
                    <button class="btn btn-sm btn-ghost" [disabled]="!isEdit()" (click)="exportA3Lang('png', l)">⬇ PNG</button>
                    <button class="btn btn-sm btn-ghost" [disabled]="!isEdit()" (click)="exportA3Lang('svg', l)">⬇ SVG</button>
                  </div>
                }
              </div>

              <div class="card stack">
                <div class="row between">
                  <h3>Pages du modèle</h3>
                  <button class="btn btn-sm btn-primary" (click)="addA3Page()">+ Page</button>
                </div>
                <div class="a3-tabs">
                  @for (pg of a3Pages(); track pg.id) {
                    <button class="a3-tab" [class.active]="activeA3() === pg.id" (click)="activeA3.set(pg.id)">
                      {{ pg.name }}
                      <span class="x" (click)="removeA3Page(pg.id); $event.stopPropagation()">✕</span>
                    </button>
                  }
                  @if (!a3Pages().length) { <span class="muted">Aucune page. Ajoutez-en une.</span> }
                </div>

                @for (pg of a3Pages(); track pg.id) {
                  @if (activeA3() === pg.id) {
                    <div class="field" style="max-width:320px">
                      <label>Nom de la page</label>
                      <input [(ngModel)]="pg.name" />
                    </div>
                    <app-layout-editor [single]="pg.layout" />
                  }
                }
              </div>
            </div>
          </mat-tab>
        }

        <!-- ===================== CLASSEUR EXCEL ===================== -->
        @if (isExcel()) {
          <mat-tab label="Classeur Excel">
            <div class="tabpad">
              <div class="card stack">
                <h3>Onglets du classeur Excel</h3>
                <p class="muted" style="margin:0 0 .4rem">Ajoutez des onglets : tableaux à colonnes typées et regroupées, tableaux croisés, informations fixes.</p>
                <app-excel-builder [sheets]="excelSheets()" />
              </div>
            </div>
          </mat-tab>
        }
      </mat-tab-group>

      <div class="row" style="margin-top:1rem">
        <button class="btn btn-primary" (click)="save()" [disabled]="saving()">
          {{ isEdit() ? 'Enregistrer le modèle' : 'Créer le modèle' }}
        </button>
      </div>
    }

    <ng-template #listEditor let-block>
      @for (it of block.items ?? []; track $index) {
        <div class="row" style="gap:.4rem; margin-bottom:.3rem">
          <input [ngModel]="block.items[$index]" (ngModelChange)="block.items[$index] = $event" placeholder="Élément" />
          <button class="mini del" (click)="block.items.splice($index, 1)">✕</button>
        </div>
      }
      <button class="btn btn-sm btn-ghost" (click)="addItem(block)">+ Élément</button>
    </ng-template>

    <ng-template #sizePos let-block>
      <div class="row" style="gap:1rem; align-items:center">
        <label style="flex:1">Largeur : {{ block.width_pct || 40 }}%
          <input type="range" min="10" max="100" [ngModel]="block.width_pct || 40" (ngModelChange)="block.width_pct = +$event" />
        </label>
        <div class="field" style="margin:0">
          <label>Position</label>
          <select [(ngModel)]="block.align">
            <option value="left">Gauche</option><option value="center">Centré</option><option value="right">Droite</option>
          </select>
        </div>
      </div>
    </ng-template>
  `,
  styles: [
    `
      .detail-tabs { margin-top: .5rem; }
      .type-banner { display:flex; gap:.8rem; align-items:center; border:1px solid var(--border); border-radius:12px; padding:.7rem .9rem; margin:.6rem 0; background:var(--primary-light); }
      .type-banner .tb-icon { font-size:1.6rem; }
      .type-banner .muted { font-size:.82rem; }
      .content-lang { display:flex; align-items:center; gap:.4rem; flex-wrap:wrap; margin:.2rem 0 .6rem; }
      .content-lang .lang-pill { border:1px solid var(--border-strong); background:var(--surface); border-radius:999px; padding:.2rem .7rem; cursor:pointer; font-size:.8rem; font-weight:600; }
      .content-lang .lang-pill.active { background:var(--primary); color:#fff; border-color:var(--primary); }
      .content-lang .lang-pill em { font-style:normal; opacity:.7; font-weight:400; }
      .tabpad { padding-top: 1.2rem; display: flex; flex-direction: column; gap: 1rem; }
      .content-grid { display: grid; grid-template-columns: 190px 1fr 230px; gap: 1rem; align-items: start; }
      @media (max-width: 1100px) { .content-grid { grid-template-columns: 1fr; } }
      .proj-pick { display:flex; flex-wrap:wrap; gap:.5rem; }
      .chip-check { display:flex; align-items:center; gap:.35rem; border:1px solid var(--border); border-radius:999px; padding:.2rem .6rem; font-size:.82rem; }
      .chip-check input { width:auto; }
      .a3-tabs { display:flex; flex-wrap:wrap; gap:.4rem; margin-bottom:.6rem; }
      .a3-tab { border:1px solid var(--border); background:#fff; border-radius:8px; padding:.35rem .7rem; cursor:pointer; font-weight:600; font-size:.82rem; display:flex; align-items:center; gap:.4rem; }
      .a3-tab.active { background:var(--primary); color:#fff; border-color:var(--primary); }
      .a3-tab .x { opacity:.7; font-size:.72rem; } .a3-tab .x:hover { opacity:1; }
      .palette { position: sticky; top: 1rem; }
      .palette-item { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.6rem; border: 1px solid var(--border); border-radius: 8px; margin-bottom: 0.4rem; cursor: grab; font-size: 0.85rem; background: #fff; }
      .palette-item:hover { border-color: var(--primary); background: var(--primary-light); }
      .pi-icon { font-size: 1rem; }
      .canvas { min-height: 200px; }
      .drop-hint { border: 2px dashed var(--border); border-radius: 10px; }
      .block { border: 1px solid var(--border); border-radius: 10px; padding: 0.7rem; margin-bottom: 0.6rem; background: #fff; }
      .block-head { display: flex; align-items: center; gap: 0.35rem; margin-bottom: 0.5rem; }
      .block-type { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; color: var(--primary); }
      .drag { cursor: grab; color: var(--muted); }
      .mini { border: 1px solid var(--border); background: #fff; border-radius: 6px; cursor: pointer; padding: 0.1rem 0.4rem; font-size: 0.72rem; color: var(--muted); }
      .mini:hover { background: var(--bg); } .mini:disabled { opacity: 0.35; }
      .mini.del:hover { background: #fee2e2; color: var(--danger); }
      .chk { display: flex; align-items: center; gap: 0.35rem; font-size: 0.85rem; font-weight: 500; }
      .chk input { width: auto; }
      .mono { font-family: ui-monospace, monospace; font-size: 0.82rem; }
      .preview-img { max-width: 100%; border: 1px solid var(--border); border-radius: 6px; }
      code { background: var(--bg); padding: 0.05rem 0.3rem; border-radius: 4px; font-size: 0.8rem; }
      .side { position: sticky; top: 1rem; }
      .side .var { display: block; width: 100%; text-align: left; border: 1px solid var(--border); background: var(--bg); border-radius: 6px; padding: 0.3rem 0.5rem; margin-bottom: 0.25rem; cursor: pointer; font-family: ui-monospace, monospace; font-size: 0.75rem; }
      .side .var:hover { border-color: var(--primary); }
    `,
  ],
})
export class TemplateBuilder {
  private service = inject(DocumentService);
  private projectService = inject(ProjectService);
  private toast = inject(ToastService);
  // Contenu par langue : langue de contenu en cours d'édition + base (principale).
  contentLang = signal<string>('');
  private baseSchema: unknown = null;
  private loadedLang = '';
  private router = inject(Router);
  allProjects = signal<Project[]>([]);

  @Input() id?: string;

  model = signal<DocumentTemplate | null>(null);
  docTypes = signal<Choice[]>([]);
  languages = LANGUAGES;
  saving = signal(false);
  activeA3 = signal<string>('');
  activeOverlay = signal<string>('');
  private counter = 0;
  private dragType: BlockType | null = null;
  private dragIndex: number | null = null;

  private fullPalette: PaletteItem[] = [
    { type: 'heading', label: 'Titre 1–5', icon: 'H' },
    { type: 'text', label: 'Texte', icon: '¶' },
    { type: 'richtext', label: 'Texte enrichi', icon: '✎' },
    { type: 'bullet_list', label: 'Liste à puces', icon: '•' },
    { type: 'numbered_list', label: 'Liste numérotée', icon: '1.' },
    { type: 'image', label: 'Image', icon: '🖼️' },
    { type: 'logo', label: 'Logo', icon: '🏢' },
    { type: 'table', label: 'Tableau', icon: '▦' },
    { type: 'field', label: 'Champ à remplir', icon: '⌨' },
    { type: 'code', label: 'Bloc de code', icon: '</>' },
    { type: 'link', label: 'Lien URL', icon: '🔗' },
    { type: 'contacts', label: 'Contacts', icon: '📇' },
    { type: 'diagram', label: 'Diagramme (SmartArt)', icon: '⬗' },
    { type: 'form_diagram', label: 'Diagramme de formulaire', icon: '📊' },
    { type: 'spacer', label: 'Espace', icon: '␣' },
  ];

  blocks = computed(() => (this.model()?.schema as Block[]) ?? []);
  settings = computed<TemplateSettings>(() => this.model()?.settings ?? {});

  // --- Drapeaux de type ---
  isExcel = computed(() => this.model()?.doc_type === 'xlsx');
  isA3 = computed(() => this.model()?.doc_type === 'a3');
  isMarkdown = computed(() => this.model()?.doc_type === 'md');
  isPptx = computed(() => this.model()?.doc_type === 'pptx');
  isPdf = computed(() => this.model()?.doc_type === 'pdf');
  isWord = computed(() => this.model()?.doc_type === 'docx');
  /** Types rendus à partir de blocs (contenu). */
  isBlocks = computed(() => ['docx', 'pdf', 'md', 'pptx', 'brochure', 'lettre', 'mail', 'offre'].includes(this.model()?.doc_type ?? ''));
  /** Onglet Structure & styles (mise en page libre + styles). */
  hasStructure = computed(() => this.isWord() || this.isPdf());
  hasTableColor = computed(() => this.isWord() || this.isPdf() || this.isExcel());
  /** En-tête / pied de page configurables : Word, PDF et Lettre. */
  hasHeaderFooter = computed(() => this.isWord() || this.isPdf()
    || this.model()?.doc_type === 'lettre' || this.model()?.doc_type === 'offre');
  /** Onglet « Éléments dynamiques » : calques libres PDF / PPTX. */
  hasOverlays = computed(() => this.isPdf() || this.isPptx());
  overlayNoun = computed(() => (this.isPptx() ? 'diapositives' : 'pages'));

  typeMeta = computed(() => TYPE_META[this.model()?.doc_type ?? 'docx'] ?? TYPE_META['docx']);

  /** Palette adaptée au type (Markdown/PPTX sans logo de mise en page libre). */
  palette = computed<PaletteItem[]>(() => {
    if (this.isMarkdown()) {
      const drop = new Set<BlockType>(['contacts']);
      return this.fullPalette.filter((p) => !drop.has(p.type));
    }
    return this.fullPalette;
  });

  /** Options du sélecteur de type : types de document + « Formulaire ». */
  typeOptions = computed<Choice[]>(() => {
    const order = ['docx', 'pdf', 'xlsx', 'a3', 'md', 'pptx', 'brochure', 'lettre', 'mail'];
    const base = this.docTypes()
      .filter((d) => order.includes(d.value))
      .sort((a, b) => order.indexOf(a.value) - order.indexOf(b.value));
    return [...base, { value: 'form', label: 'Formulaire (avec diagrammes)' }];
  });

  pptx = () => {
    const st = this.model()?.settings;
    if (st && !st.pptx) st.pptx = {};
    return (st?.pptx ?? {}) as { main_color?: string; include_logo?: boolean };
  };

  templateStyles = (): StyleMap => {
    const st = this.model()?.settings;
    if (st && !st.styles) st.styles = {};
    return (st?.styles ?? {}) as StyleMap;
  };
  isProjSel(m: DocumentTemplate, id: number) { return (m.projects ?? []).includes(id); }
  toggleProj(m: DocumentTemplate, id: number) {
    m.projects = m.projects ?? [];
    const i = m.projects.indexOf(id);
    if (i >= 0) m.projects.splice(i, 1); else m.projects.push(id);
  }

  // --- Multilingue (point 5) : langues disponibles + nom par langue ---
  flagOf(code: string) { return this.languages.find((l) => l.value === code)?.flag ?? ''; }
  labelOf(code: string) { return this.languages.find((l) => l.value === code)?.label ?? code; }
  /** Langues du modèle (principale incluse, ordre des langues connues). */
  availableLangs(m: DocumentTemplate): TemplateLanguage[] {
    const set = new Set<TemplateLanguage>(m.languages ?? []);
    if (m.language) set.add(m.language);
    if (set.size === 0) set.add((m.language ?? 'fr') as TemplateLanguage);
    return this.languages.map((l) => l.value).filter((v) => set.has(v));
  }
  hasLang(m: DocumentTemplate, code: TemplateLanguage) { return (m.languages ?? []).includes(code); }
  toggleLang(m: DocumentTemplate, code: TemplateLanguage) {
    const list = [...(m.languages ?? [])];
    const i = list.indexOf(code);
    if (i >= 0) {
      if (code === m.language) return;          // la langue principale reste active
      list.splice(i, 1);
      if (m.names) delete m.names[code];
    } else {
      list.push(code);
    }
    m.languages = list;
  }
  // --- En-tête / pied de page configurables (Word, PDF, Lettre) ---
  hfConfigured(kind: 'header' | 'footer'): boolean {
    return !!(this.settings() as TemplateSettings)[kind];
  }
  toggleHf(kind: 'header' | 'footer', on: boolean) {
    const m = this.model(); if (!m) return;
    if (!m.settings) m.settings = {};
    if (on) {
      m.settings[kind] = { enabled: true, text: '', align: kind === 'footer' ? 'center' : 'left',
        show_logo: kind === 'header' };
    } else {
      delete m.settings[kind];
    }
  }
  hfVal(kind: 'header' | 'footer', key: 'enabled' | 'text' | 'html' | 'align' | 'show_logo') {
    const o = (this.settings() as TemplateSettings)[kind] as Record<string, unknown> | undefined;
    if (!o) return key === 'enabled' ? true : (key === 'align' ? (kind === 'footer' ? 'center' : 'left') : '');
    return key === 'enabled' ? o['enabled'] !== false : (o[key] ?? '');
  }
  setHf(kind: 'header' | 'footer', key: string, val: unknown) {
    const m = this.model(); if (!m) return;
    if (!m.settings) m.settings = {};
    if (!m.settings[kind]) m.settings[kind] = { enabled: true };
    (m.settings[kind] as Record<string, unknown>)[key] = val;
  }

  nameFor(m: DocumentTemplate, code: string) { return (m.names ?? {})[code] ?? ''; }
  setName(m: DocumentTemplate, code: string, value: string) {
    m.names = { ...(m.names ?? {}) };
    if (value) m.names[code] = value; else delete m.names[code];
  }

  // --- Contenu par langue (blocs) : édition d'un contenu spécifique par langue ---
  private i18nBucket(m: DocumentTemplate): Record<string, { schema?: unknown }> {
    m.settings = m.settings || {};
    const s = m.settings as unknown as { content_i18n?: Record<string, { schema?: unknown }> };
    s.content_i18n = s.content_i18n || {};
    return s.content_i18n;
  }
  switchContentLang(to: string) {
    const m = this.model(); if (!m) return;
    const primary = m.language || 'fr';
    const from = this.loadedLang;
    if (to === from) return;
    // Range le contenu en cours dans sa langue.
    if (from === primary) { this.baseSchema = m.schema; }
    else { this.i18nBucket(m)[from] = { schema: m.schema }; }
    // Charge le contenu de la langue cible (copie du contenu de base si absent).
    if (to === primary) {
      m.schema = (this.baseSchema as Block[]) ?? m.schema;
    } else {
      const bucket = this.i18nBucket(m)[to];
      const src = bucket?.schema ?? this.baseSchema ?? m.schema;
      m.schema = JSON.parse(JSON.stringify(src));
    }
    this.loadedLang = to;
    this.contentLang.set(to);
    this.model.set({ ...m });
  }
  /** Avant sauvegarde : renvoie le contenu de base dans schema, les langues dans content_i18n. */
  private syncContentForSave() {
    const m = this.model(); if (!m) return;
    const primary = m.language || 'fr';
    if (this.loadedLang !== primary) {
      this.i18nBucket(m)[this.loadedLang] = { schema: m.schema };
      m.schema = (this.baseSchema as Block[]) ?? [];
      this.loadedLang = primary;
      this.contentLang.set(primary);
    } else {
      this.baseSchema = m.schema;
    }
  }

  /** Génère et télécharge la planche A3 dans la langue demandée. */
  exportA3Lang(fmt: 'pdf' | 'png' | 'svg', lang: string) {
    const m = this.model();
    if (!m?.id) { this.toast.error('Enregistrez le modèle avant de générer un rendu.'); return; }
    this.service.exportA3(m.id, fmt, lang).subscribe({
      next: (blob) => {
        const u = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = u; a.download = `${m.slug || 'template'}-${lang}.${fmt}`;
        a.click(); URL.revokeObjectURL(u);
      },
      error: () => this.toast.error('Export impossible.'),
    });
  }
  excelSheets = computed<ExcelSheet[]>(() => {
    const s = this.model()?.settings;
    if (s && !s.excel) s.excel = { sheets: [] };
    return s?.excel?.sheets ?? [];
  });

  a3Pages = computed<A3Page[]>(() => {
    const s = this.model()?.settings;
    if (s && !s.a3_pages) s.a3_pages = [];
    return s?.a3_pages ?? [];
  });

  overlays = computed<Overlay[]>(() => {
    const s = this.model()?.settings;
    if (s && !s.overlays) s.overlays = [];
    return s?.overlays ?? [];
  });

  private readonly pagePresets = new Set(['all', 'first', 'last', 'odd', 'even']);
  pagePreset(ov: Overlay): string {
    const p = (ov.target?.pages || 'all').trim();
    return this.pagePresets.has(p) ? p : 'custom';
  }
  setPagePreset(ov: Overlay, v: string) {
    ov.target = ov.target ?? { pages: 'all' };
    ov.target.pages = v === 'custom' ? (this.pagePresets.has(ov.target.pages) ? '' : ov.target.pages) : v;
  }

  addOverlay() {
    const m = this.model(); if (!m) return;
    m.settings = m.settings ?? {};
    m.settings.overlays = m.settings.overlays ?? [];
    const isPptx = m.doc_type === 'pptx';
    const ov: Overlay = {
      id: `ov_${Date.now()}_${this.counter++}`,
      name: `Calque ${m.settings.overlays.length + 1}`,
      enabled: true,
      doc_type: isPptx ? 'pptx' : 'pdf',
      target: { pages: 'all' },
      layout: {
        page_size: isPptx ? 'slide' : 'a4',
        orientation: 'portrait',
        background: undefined,
        elements: [],
      },
    };
    m.settings.overlays.push(ov);
    this.activeOverlay.set(ov.id);
    this.model.set({ ...m });
  }
  removeOverlay(id: string) {
    const m = this.model(); if (!m) return;
    const list = m.settings?.overlays ?? [];
    m.settings!.overlays = list.filter((o) => o.id !== id);
    if (this.activeOverlay() === id) {
      this.activeOverlay.set(m.settings!.overlays[0]?.id ?? '');
    }
    this.model.set({ ...m });
  }

  allVariables = computed(() => {
    const builtins = ['project_name', 'client_name', 'project_reference',
      'company_name', 'document_title', 'today', 'version'];
    const keys = this.blocks().filter((b) => b.type === 'field' && b.key).map((b) => b.key!);
    return [...builtins, ...keys];
  });

  constructor() {
    this.service.choices().subscribe((c) => this.docTypes.set(c.document_types));
    this.projectService.list().subscribe((r) => this.allProjects.set(r.results));
    setTimeout(() => {
      if (this.id) {
        this.service.template(+this.id).subscribe((t) => {
          if (!t.settings) t.settings = this.defaultSettings();
          this.model.set(t);
          this.baseSchema = t.schema; this.loadedLang = t.language || 'fr';
          this.contentLang.set(this.loadedLang);
          if (t.doc_type === 'a3') this.ensureA3(t);
          if (t.settings?.overlays?.length) this.activeOverlay.set(t.settings.overlays[0].id);
        });
      } else {
        this.model.set({
          name: '', slug: '', description: '', doc_type: 'docx', language: 'fr',
          builder_key: 'custom', is_block_based: true, schema: [],
          settings: this.defaultSettings(), is_active: true,
          scope: 'global', projects: [],
        });
        this.baseSchema = []; this.loadedLang = 'fr'; this.contentLang.set('fr');
      }
    });
  }

  private defaultSettings(): TemplateSettings {
    return {
      cover_title: '{{document_title}}',
      cover_subtitle: '{{client_name}} — {{project_name}}',
      include_cover: true, include_suivi: true, include_toc: true,
      pdf_from_docx: true,
    };
  }

  isEdit() { return !!this.id; }

  onFormatChange(m: DocumentTemplate) {
    // « Formulaire » = modèle de formulaire (autre éditeur).
    if ((m.doc_type as string) === 'form') {
      this.router.navigate(['/form-templates/new']);
      return;
    }
    m.settings = m.settings ?? {};
    if (m.doc_type === 'xlsx' && !m.settings.excel) {
      m.settings.excel = {
        sheets: [{
          id: `sh${Date.now()}`, name: 'Onglet 1', type: 'table',
          groups: [], show_totals: false, allow_add_rows: true,
          allow_add_columns: false,
          columns: [
            { key: 'col1', label: 'Colonne 1', type: 'text' },
            { key: 'col2', label: 'Colonne 2', type: 'text' },
          ],
        }],
      };
    }
    if (m.doc_type === 'a3') {
      m.settings.a3_export = m.settings.a3_export ?? 'pdf';
      this.ensureA3(m);
    }
    this.model.set({ ...m });
  }

  private ensureA3(m: DocumentTemplate) {
    m.settings = m.settings ?? {};
    if (!m.settings.a3_pages || !m.settings.a3_pages.length) {
      m.settings.a3_pages = [this.newA3Page(1)];
    }
    this.activeA3.set(m.settings.a3_pages[0].id);
  }

  private newA3Page(n: number): A3Page {
    return {
      id: `a3_${Date.now()}_${this.counter++}`,
      name: `Page ${n}`,
      layout: { page_size: 'a3', orientation: 'portrait', background: '#ffffff', elements: [] },
    };
  }

  addA3Page() {
    const m = this.model(); if (!m) return;
    m.settings = m.settings ?? {};
    m.settings.a3_pages = m.settings.a3_pages ?? [];
    const pg = this.newA3Page(m.settings.a3_pages.length + 1);
    m.settings.a3_pages.push(pg);
    this.activeA3.set(pg.id);
    this.model.set({ ...m });
  }
  removeA3Page(id: string) {
    const m = this.model(); if (!m) return;
    const pages = m.settings?.a3_pages ?? [];
    if (pages.length <= 1) { this.toast.error('Au moins une page est nécessaire.'); return; }
    m.settings!.a3_pages = pages.filter((p) => p.id !== id);
    if (this.activeA3() === id) this.activeA3.set(m.settings!.a3_pages[0].id);
    this.model.set({ ...m });
  }

  onName(name: string, m: DocumentTemplate) {
    if (!this.isEdit()) m.slug = this.slugify(name);
  }

  blockLabel(type: BlockType): string {
    return this.fullPalette.find((p) => p.type === type)?.label ?? type;
  }

  // --- Drag & drop ---
  onPaletteDrag(type: BlockType) { this.dragType = type; this.dragIndex = null; }
  onBlockDrag(i: number) { this.dragIndex = i; this.dragType = null; }
  onCanvasDrop() {
    if (this.dragType) this.add(this.dragType);
    this.dragType = null; this.dragIndex = null;
  }
  onDropAt(index: number) {
    const m = this.model(); if (!m) return;
    const arr = m.schema as Block[];
    if (this.dragType) {
      arr.splice(index, 0, this.newBlock(this.dragType));
    } else if (this.dragIndex !== null && this.dragIndex !== index) {
      const [moved] = arr.splice(this.dragIndex, 1);
      arr.splice(index, 0, moved);
    }
    this.dragType = null; this.dragIndex = null;
    this.model.set({ ...m });
  }

  private newBlock(type: BlockType): Block {
    const id = `b${Date.now()}_${this.counter++}`;
    const b: Block = { id, type };
    if (type === 'heading') { b.level = 2; b.text = ''; }
    else if (type === 'text' || type === 'code') b.text = '';
    else if (type === 'richtext') b.text = '';
    else if (type === 'bullet_list' || type === 'numbered_list') b.items = ['', ''];
    else if (type === 'image') { b.width_pct = 40; b.align = 'left'; b.asset_url = ''; }
    else if (type === 'logo') { b.width_pct = 30; b.align = 'left'; }
    else if (type === 'table') { b.label = ''; b.columns = [{ label: 'Colonne 1' }, { label: 'Colonne 2' }]; b.allow_edit_columns = false; }
    else if (type === 'field') { b.label = ''; b.key = ''; b.field_type = 'text'; b.required = false; b.show_label = true; }
    else if (type === 'link') { b.label = ''; b.url = ''; }
    else if (type === 'contacts') { b.label = 'Contacts'; b.scope = 'both'; }
    else if (type === 'diagram') {
      b.variant = 'process'; b.width_pct = 100; b.align = 'center';
      b.diagram_items = [{ title: 'Étape 1', text: '' }, { title: 'Étape 2', text: '' }, { title: 'Étape 3', text: '' }];
    }
    else if (type === 'form_diagram') { b.diagram_key = 'd1'; b.width_pct = 90; b.align = 'center'; }
    return b;
  }

  add(type: BlockType) {
    const m = this.model(); if (!m) return;
    (m.schema as Block[]).push(this.newBlock(type));
    this.model.set({ ...m });
  }
  removeBlock(i: number) {
    const m = this.model(); if (!m) return;
    (m.schema as Block[]).splice(i, 1); this.model.set({ ...m });
  }
  move(i: number, dir: number) {
    const m = this.model(); if (!m) return;
    const arr = m.schema as Block[]; const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]]; this.model.set({ ...m });
  }

  addItem(b: Block) { b.items = b.items ?? []; b.items.push(''); }
  addDiagramItem(b: Block) { b.diagram_items = b.diagram_items ?? []; b.diagram_items.push({ title: '', text: '' }); }
  addCol(b: Block) { b.columns = b.columns ?? []; b.columns.push({ label: `Colonne ${b.columns.length + 1}` }); }
  removeCol(b: Block, i: number) { b.columns?.splice(i, 1); }
  syncKey(b: Block) { b.key = this.slugify(b.label || '') || 'champ'; }
  setOptions(b: Block, raw: string) { b.options = raw.split(',').map((s) => s.trim()).filter(Boolean); }

  uploadImage(event: Event, block: Block) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.service.uploadAsset(file).subscribe({
      next: (r) => { block.asset_url = r.url; this.toast.success('Image ajoutée.'); },
      error: () => this.toast.error("Échec de l'upload."),
    });
  }

  copyVar(v: string) {
    navigator.clipboard?.writeText(`{{${v}}}`);
    this.toast.success(`{{${v}}} copié`);
  }

  private slugify(s: string): string {
    return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  save() {
    this.syncContentForSave();
    const m = this.model(); if (!m) return;
    if (!m.name) { this.toast.error('Le nom est obligatoire.'); return; }

    if (this.isExcel()) {
      m.is_block_based = false;
      m.builder_key = 'excel_workbook';
      m.schema = [];
      if (!m.settings?.excel?.sheets?.length) {
        this.toast.error('Ajoutez au moins un onglet au classeur.'); return;
      }
      m.settings.excel.sheets.forEach((sh) =>
        (sh.columns ?? []).forEach((c, i) => { if (!c.key) c.key = `col${i + 1}`; }));
      this.persist(m);
      return;
    }

    if (this.isA3()) {
      m.is_block_based = false;
      m.builder_key = 'a3';
      m.schema = [];
      if (!m.settings?.a3_pages?.length) {
        this.toast.error('Ajoutez au moins une page.'); return;
      }
      this.persist(m);
      return;
    }

    // Types par blocs (Word / PDF / Markdown / PowerPoint)
    (m.schema as Block[]).forEach((b) => { if (b.type === 'field' && !b.key) this.syncKey(b); });
    (m.schema as Block[]).forEach((b) => {
      if (b.items) b.items = b.items.filter((x) => x.trim() !== '');
    });
    m.is_block_based = true; m.builder_key = 'custom';
    this.persist(m);
  }

  private persist(m: DocumentTemplate) {
    this.saving.set(true);
    const req = this.isEdit() ? this.service.updateTemplate(+this.id!, m) : this.service.createTemplate(m);
    req.subscribe({
      next: () => { this.saving.set(false); this.toast.success('Modèle enregistré.'); this.router.navigate(['/templates']); },
      error: () => { this.saving.set(false); this.toast.error('Erreur (identifiant déjà utilisé ?).'); },
    });
  }
}
